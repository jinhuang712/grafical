// Copying a group (FEATURES.md, "Copying a group"; specs/decisions, "A group copy holds its inside").

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import { applyOps, type Diagram, type Op, parseOp, writeDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function run(d: Diagram | null, ops: Op[]) {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
const ok = (d: Diagram | null, ops: Op[]) => run(d, ops).diagram;
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}
const order = (d: Diagram, layer: string) =>
  d.layers.find((l) => l.id === layer)?.nodes.map((n) => n.id);
const node = (d: Diagram, id: string) =>
  [...d.layers.flatMap((l) => l.nodes), ...(d.nodes ?? [])].find((n) => n.id === id);
const edgeList = (d: Diagram) => d.edges.map((e) => `${e.id} ${e.from}>${e.to} ${e.kind}`);

// A region with one zone: a web server in the zone, and a worker and its store in a subnet inside it.
const zone = ok(null, [
  { op: "diagram.set", title: "Zones" },
  { op: "layer.set", ids: ["row-edge"], label: "Edge" },
  { op: "layer.set", ids: ["row-app"], label: "App" },
  { op: "layer.set", ids: ["row-data"], label: "Data" },
  { op: "node.set", ids: ["lb"], layer: "row-edge", label: "Load balancer" },
  { op: "node.set", ids: ["web"], layer: "row-app", label: "Web" },
  { op: "node.set", ids: ["worker"], layer: "row-app", label: "Worker", last: true },
  { op: "node.set", ids: ["db"], layer: "row-data", label: "DB", type: "store" },
  { op: "node.set", ids: ["audit"], layer: "row-data", label: "Audit", type: "store", last: true },
  { op: "group.set", ids: ["region"], label: "Region" },
  { op: "group.set", ids: ["zone"], label: "Zone A", sublabel: "1a", in: "region" },
  { op: "node.set", ids: ["web"], group: "zone" },
  { op: "group.set", ids: ["subnet"], label: "Subnet", in: "zone" },
  { op: "node.set", ids: ["worker", "db"], group: "subnet" },
  { op: "node.set", ids: ["db"], align: "worker" },
  { op: "edge.set", ids: ["lb-web"], from: "lb", to: "web" },
  { op: "edge.set", ids: ["jobs"], from: "web", to: "worker", type: "async" },
  { op: "edge.set", ids: ["worker-db"], from: "worker", to: "db", label: "writes" },
  { op: "edge.set", ids: ["stores"], from: "worker", to: "db", type: "data" },
  { op: "edge.set", ids: ["db-audit"], from: "db", to: "audit" },
]);

type CopyOp = Extract<Op, { op: "group.copy" }>;
const copy = (extra: Partial<CopyOp> = {}, place: Partial<CopyOp> = { after: "zone" }): Op => ({
  op: "group.copy",
  id: "zone",
  into: "zone-b",
  label: "Zone B",
  suffix: "-b",
  ...place,
  ...extra,
});

describe("group copy", () => {
  it("copies the nodes, inner groups and the edges between them, each id with the suffix", () => {
    const { diagram: d, changed } = run(zone, [copy()]);
    expect(changed).toEqual([
      "zone-b",
      "subnet-b",
      "web-b",
      "worker-b",
      "db-b",
      "jobs-b",
      "worker-db-b",
      "stores-b",
    ]);
    expect(d.groups).toContainEqual({
      id: "zone-b",
      label: "Zone B",
      sublabel: "1a",
      in: "region",
    });
    expect(d.groups).toContainEqual({ id: "subnet-b", label: "Subnet", in: "zone-b" });
    expect(node(d, "web-b")).toEqual({
      id: "web-b",
      label: "Web",
      kind: "service",
      group: "zone-b",
    });
    // An alignment inside the group points to the copy.
    expect(node(d, "db-b")).toMatchObject({ kind: "store", group: "subnet-b", align: "worker-b" });
    // Edges to nodes outside the group stay with the original.
    expect(edgeList(d).slice(zone.edges.length)).toEqual([
      "jobs-b web-b>worker-b async",
      "worker-db-b worker-b>db-b call",
      "stores-b worker-b>db-b data",
    ]);
    expect(d.edges.find((e) => e.id === "worker-db-b")?.label).toBe("writes");
    expect(check(d, layout(d, m), m)).toEqual([]);
  });

  it("puts each copied node in its original's layer, after or before the group named", () => {
    const after = ok(zone, [copy()]);
    expect(order(after, "row-app")).toEqual(["web", "worker", "web-b", "worker-b"]);
    expect(order(after, "row-data")).toEqual(["db", "db-b", "audit"]);
    expect(order(after, "row-edge")).toEqual(["lb"]);
    const before = ok(zone, [copy({}, { before: "zone" })]);
    expect(order(before, "row-app")).toEqual(["web-b", "worker-b", "web", "worker"]);
    expect(order(before, "row-data")).toEqual(["db-b", "db", "audit"]);
  });

  it("copies the edges to everything outside the group only with outside", () => {
    const d = ok(zone, [copy({ outside: true })]);
    expect(edgeList(d).slice(zone.edges.length)).toEqual([
      "lb-web-b lb>web-b call",
      "jobs-b web-b>worker-b async",
      "worker-db-b worker-b>db-b call",
      "stores-b worker-b>db-b data",
      "db-audit-b db-b>audit call",
    ]);
    // An edge to the group itself goes to the copy.
    const toGroup = ok(zone, [
      { op: "edge.set", ids: ["lb-zone"], from: "lb", to: "zone" },
      copy({ outside: true }),
    ]);
    expect(edgeList(toGroup)).toContain("lb-zone-b lb>zone-b call");
  });

  it("steps a node placed by steps from the copy of the node it steps from", () => {
    const d = ok(zone, [
      { op: "node.set", ids: ["cache"], from: "db", down: "1", label: "Cache" },
      { op: "node.set", ids: ["cache"], group: "subnet" },
      copy(),
    ]);
    expect(node(d, "cache-b")).toMatchObject({ from: "db-b", down: 1, group: "subnet-b" });
  });

  it("is shown by diff as the operations that build it", () => {
    const d = ok(zone, [copy({ outside: true })]);
    const ops = diffDiagrams(zone, d);
    expect(ops).toContainEqual({
      op: "group.set",
      ids: ["zone-b"],
      label: "Zone B",
      sublabel: "1a",
    });
    expect(ops).toContainEqual({ op: "group.set", ids: ["zone-b"], in: "region" });
    const made = (o: Op) => "label" in o || "from" in o;
    expect(
      ops
        .filter((o) => o.op === "node.set" && made(o))
        .flatMap((o) => (o as { ids: string[] }).ids),
    ).toEqual(["web-b", "worker-b", "db-b"]);
    expect(ops.filter((o) => o.op === "edge.set" && "from" in o)).toHaveLength(5);
    const replayed = run(zone, ops).diagram;
    expect(writeDiagram(replayed)).toBe(writeDiagram(d));
  });
});

describe("group copy refusals", () => {
  it("names an unknown group and a missing or doubled place", () => {
    expect(fail(zone, [copy({ id: "zon" })])[0]).toMatchObject({
      code: "unknown-group",
      field: "id",
      facts: { near: ["zone", "region", "subnet"] },
    });
    expect(fail(zone, [copy({ after: "zoen" })])[0]).toMatchObject({
      code: "unknown-group",
      field: "after",
    });
    // The groups with a node in every layer of the copy, but the ones inside it.
    expect(fail(zone, [copy({}, {})])[0]).toMatchObject({
      code: "missing-field",
      field: "place",
      facts: { allowed: ["region", "zone"] },
    });
    expect(fail(zone, [copy({ before: "zone" })])[0]?.code).toBe("conflicting-position");
  });

  it("refuses an id the copy would make that is taken", () => {
    expect(fail(zone, [copy({ into: "lb" })])[0]).toMatchObject({
      code: "duplicate-id",
      field: "into",
      found: "lb",
      facts: { is: "node" },
    });
    const taken = ok(zone, [
      { op: "node.set", ids: ["web-b"], layer: "row-edge", label: "Old", last: true },
    ]);
    expect(fail(taken, [copy()])).toEqual([
      {
        code: "duplicate-id",
        index: 0,
        field: "suffix",
        found: "web-b",
        facts: { is: "node" },
      },
    ]);
  });

  it("refuses a group named for the place that misses a layer of the copy", () => {
    const d = ok(zone, [
      { op: "group.set", ids: ["front"], label: "Front" },
      { op: "node.set", ids: ["lb", "audit"], group: "front" },
    ]);
    expect(fail(d, [copy({ after: "front" })])[0]).toMatchObject({
      code: "no-shared-layer",
      field: "after",
      found: "front",
      facts: { allowed: ["region", "zone"], layer: "row-app", group: "zone" },
    });
  });

  it("refuses an alignment or a step to a node outside the group, naming the node", () => {
    const aligned = ok(zone, [{ op: "node.set", ids: ["web"], align: "lb" }]);
    expect(fail(aligned, [copy()])).toEqual([
      {
        code: "copy-conflict",
        index: 0,
        field: "align",
        found: "lb",
        facts: { node: "web" },
      },
    ]);
    // A node under a, placed by steps from x beside it.
    const stepped = ok(null, [
      { op: "diagram.set", title: "Steps" },
      { op: "layer.set", ids: ["r1"], label: "R1" },
      { op: "node.set", ids: ["x"], layer: "r1", label: "X" },
      { op: "node.set", ids: ["a"], layer: "r1", label: "A", last: true },
      { op: "node.set", ids: ["s"], from: "x", right: "1", down: "1", label: "S" },
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["a", "s"], group: "g" },
    ]);
    const op: Op = { op: "group.copy", id: "g", into: "h", label: "H", suffix: "-2", after: "g" };
    expect(fail(stepped, [op])).toEqual([
      {
        code: "copy-conflict",
        index: 0,
        field: "from",
        found: "x",
        facts: { node: "s" },
      },
    ]);
  });

  it("refuses a place that the column order would move", () => {
    const d = ok(zone, [
      { op: "column.set", ids: ["c1"] },
      { op: "node.set", ids: ["web"], column: "c1" },
      { op: "column.set", ids: ["c2"] },
      { op: "node.set", ids: ["worker"], column: "c2" },
    ]);
    expect(fail(d, [copy()])).toEqual([
      { code: "copy-conflict", index: 0, field: "column", found: "c1", facts: { node: "web" } },
    ]);
    // In one column, the copy sits beside its original and keeps the column.
    const one = ok(zone, [
      { op: "column.set", ids: ["c1"] },
      { op: "node.set", ids: ["web", "worker", "db"], column: "c1" },
    ]);
    expect(node(ok(one, [copy()]), "worker-b")?.column).toBe("c1");
  });

  it("keeps the lane of each node, and refuses a place that the lane order would move", () => {
    const d = ok(zone, [
      { op: "node.set", ids: ["t1"], layer: "row-app", label: "T1", last: true },
      { op: "node.set", ids: ["t2"], layer: "row-data", label: "T2", last: true },
      { op: "group.set", ids: ["tail"], label: "Tail" },
      { op: "node.set", ids: ["t1", "t2"], group: "tail" },
      { op: "lane.set", ids: ["ops"], label: "Ops" },
      { op: "node.set", ids: ["web", "worker", "db"], lane: "ops" },
      { op: "lane.set", ids: ["team"], label: "Team" },
      { op: "node.set", ids: ["t1", "t2", "audit"], lane: "team" },
    ]);
    const copied = ok(d, [copy()]);
    expect(order(copied, "row-app")).toEqual(["web", "worker", "web-b", "worker-b", "t1"]);
    expect(node(copied, "db-b")?.lane).toBe("ops");
    expect(fail(d, [copy({ after: "tail" })])).toEqual([
      { code: "copy-conflict", index: 0, field: "lane", found: "ops", facts: { node: "web" } },
    ]);
  });

  it("refuses a suffix that is no part of an id", () => {
    const r = parseOp(
      { op: "group.copy", id: "zone", into: "zone-b", label: "B", suffix: "-B", after: "zone" },
      0,
    ) as OpError[];
    expect(r[0]).toMatchObject({ code: "bad-id", field: "suffix", facts: { likely: ["-b"] } });
  });
});
