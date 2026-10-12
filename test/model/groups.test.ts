import { describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import {
  applyOps,
  budgetWarnings,
  type Diagram,
  type Op,
  parseOp,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { createMeasurer, createStubMeasurer } from "../../src/text/index.ts";

const m = createStubMeasurer();
const empty: Diagram = { grafical: 1, title: "T", density: "normal", layers: [], edges: [] };

function ok(d: Diagram | null, ops: Op[]) {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
function fail(d: Diagram | null, ops: Op[]): OpError[] {
  const r = applyOps(d, ops, m);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}

const base: Diagram = ok(empty, [
  { op: "layer.add", id: "r1", label: "R1" },
  { op: "layer.add", id: "r2", label: "R2" },
  { op: "layer.add", id: "r3", label: "R3" },
  { op: "node.add", id: "a", layer: "r1", label: "A" },
  { op: "node.add", id: "b", layer: "r2", label: "B" },
  { op: "node.add", id: "c", layer: "r3", label: "C" },
]).diagram;

const groupOf = (d: Diagram, id: string) =>
  d.layers.flatMap((l) => l.nodes).find((n) => n.id === id)?.group;

describe("file format", () => {
  it("round-trips subtitle, note, groups and node group in a fixed key order", () => {
    const d = ok(base, [
      { op: "diagram.subtitle", text: "One sentence." },
      { op: "diagram.note", text: "Not shown: x." },
      { op: "group.add", id: "g", label: "G", nodes: ["a", "b"] },
    ]).diagram;
    const text = writeDiagram(d);
    expect(text.indexOf("subtitle:")).toBeGreaterThan(text.indexOf("title:"));
    expect(text.indexOf("note:")).toBeGreaterThan(text.indexOf("subtitle:"));
    expect(text.indexOf("note:")).toBeLessThan(text.indexOf("density:"));
    expect(text.indexOf("groups:")).toBeGreaterThan(text.indexOf("layers:"));
    expect(text.indexOf("groups:")).toBeLessThan(text.indexOf("edges:"));
    expect(text).toMatch(/- id: a\n {8}label: A\n {8}kind: service\n {8}group: g\n/);
    const back = readDiagram(text);
    expect(back).toEqual(d);
    expect(writeDiagram(back as Diagram)).toBe(text);
  });

  it("omits absent fields, so an old file stays byte-identical", () => {
    const text = writeDiagram(base);
    expect(text).not.toMatch(/subtitle|note|groups|group:/);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });

  it("rejects a file whose node names a missing group", () => {
    const bad = structuredClone(base);
    const first = bad.layers[0]?.nodes[0];
    if (first) first.group = "nope";
    const r = readDiagram(writeDiagram(bad)) as OpError[];
    expect(r[0]?.code).toBe("unknown-group");
    expect(r[0]?.code).toBe("unknown-group");
  });

  it("rejects a group id that another element uses", () => {
    const text = `${writeDiagram(base).replace("edges: []", "groups:\n  - id: a\n    label: X\nedges: []")}`;
    const r = readDiagram(text) as OpError[];
    expect(r.map((e) => e.code)).toContain("duplicate-id");
  });
});

describe("group operations", () => {
  it("group.add with nodes, and without", () => {
    const r = ok(base, [
      { op: "group.add", id: "g", label: "G", nodes: ["a", "b"] },
      { op: "group.add", id: "empty", label: "Empty" },
    ]);
    expect(r.diagram.groups).toEqual([
      { id: "g", label: "G" },
      { id: "empty", label: "Empty" },
    ]);
    expect(groupOf(r.diagram, "a")).toBe("g");
    expect(r.changed).toEqual(["g", "a", "b", "empty"]);
    expect(base.groups).toBeUndefined();
  });

  it("group.add refuses a taken id and an unknown node", () => {
    expect(fail(base, [{ op: "group.add", id: "a", label: "G" }])[0]?.code).toBe("duplicate-id");
    const e = fail(base, [{ op: "group.add", id: "g", label: "G", nodes: ["zz"] }]);
    expect(e[0]).toMatchObject({ code: "unknown-node", field: "nodes" });
  });

  it("group.join moves a node between groups, group.leave frees it", () => {
    const d1 = ok(base, [
      { op: "group.add", id: "g", label: "G", nodes: ["a"] },
      { op: "group.add", id: "h", label: "H" },
    ]).diagram;
    const d2 = ok(d1, [{ op: "group.join", group: "h", nodes: ["a", "b"] }]).diagram;
    expect(groupOf(d2, "a")).toBe("h");
    expect(groupOf(d2, "b")).toBe("h");
    const d3 = ok(d2, [{ op: "group.leave", nodes: ["a", "c"] }]);
    expect(groupOf(d3.diagram, "a")).toBeUndefined();
    expect(d3.changed).toEqual(["a"]);
    expect(fail(d1, [{ op: "group.join", group: "x", nodes: ["a"] }])[0]).toMatchObject({
      code: "unknown-group",
      field: "group",
    });
    expect(fail(d1, [{ op: "group.leave", nodes: ["zz"] }])[0]?.code).toBe("unknown-node");
  });

  it("group.rename and group.remove keep the members", () => {
    const d1 = ok(base, [{ op: "group.add", id: "g", label: "G", nodes: ["a", "b"] }]).diagram;
    const d2 = ok(d1, [{ op: "group.rename", id: "g", label: "New" }]).diagram;
    expect(d2.groups?.[0]?.label).toBe("New");
    const d3 = ok(d2, [{ op: "group.remove", id: "g" }]);
    expect(d3.diagram.groups).toBeUndefined();
    expect(groupOf(d3.diagram, "a")).toBeUndefined();
    expect(d3.changed).toEqual(["g", "a", "b"]);
    expect(fail(d1, [{ op: "group.remove", id: "zz" }])[0]?.code).toBe("unknown-group");
    expect(fail(d1, [{ op: "group.rename", id: "zz", label: "x" }])[0]?.code).toBe("unknown-group");
  });

  it("a group's box spans a row it has no member in, and that row's nodes sit beside it (D7)", async () => {
    const d = ok(base, [{ op: "group.add", id: "g", label: "G", nodes: ["a", "c"] }]).diagram;
    const real = await createMeasurer();
    const s = layout(d, real);
    const box = s.groups?.find((x) => x.id === "g")?.rect;
    const b = s.nodes.find((n) => n.id === "b")?.rect;
    if (box === undefined || b === undefined) throw new Error("missing box");
    // b's row lies within the box's height, and b outside its width.
    expect(b.y).toBeGreaterThan(box.y);
    expect(b.y + b.h).toBeLessThan(box.y + box.h);
    expect(b.x >= box.x + box.w || b.x + b.w <= box.x).toBe(true);
    expect(check(d, s, real)).toEqual([]);
    // A member may leave the middle row too.
    const d2 = ok(d, [{ op: "group.join", group: "g", nodes: ["b"] }]).diagram;
    expect(groupOf(ok(d2, [{ op: "group.leave", nodes: ["b"] }]).diagram, "b")).toBeUndefined();
  });

  it("group-split: a non-member between members in one row is refused by the layout (D7)", () => {
    const row = ok(empty, [
      { op: "layer.add", id: "r", label: "R" },
      { op: "node.add", id: "x", layer: "r", label: "X", last: true },
      { op: "node.add", id: "y", layer: "r", label: "Y", last: true },
      { op: "node.add", id: "z", layer: "r", label: "Z", last: true },
    ]).diagram;
    const e = fail(row, [{ op: "group.add", id: "g", label: "G", nodes: ["x", "z"] }]);
    expect(e[0]).toMatchObject({ code: "group-split", field: "group" });
    expect(e[0]?.suggestion).toContain("y");
    // Joining the node in between, or grouping neighbours, is fine.
    ok(row, [{ op: "group.add", id: "g", label: "G", nodes: ["x", "y", "z"] }]);
    ok(row, [{ op: "group.add", id: "g", label: "G", nodes: ["x", "y"] }]);
  });

  it("node.remove keeps the group, even empty", () => {
    const d1 = ok(base, [{ op: "group.add", id: "g", label: "G", nodes: ["a"] }]).diagram;
    const d2 = ok(d1, [{ op: "node.remove", id: "a" }]).diagram;
    expect(d2.groups).toEqual([{ id: "g", label: "G" }]);
  });

  it("parses batch items, and reports an empty node list", () => {
    expect(parseOp({ op: "group.join", group: "g", nodes: ["a"] }, 0)).toEqual({
      op: "group.join",
      group: "g",
      nodes: ["a"],
    });
    expect((parseOp({ op: "group.leave", nodes: [] }, 0) as OpError[])[0]?.code).toBe(
      "empty-value",
    );
    expect(
      (parseOp({ op: "group.add", id: "g", label: "x", lable: "x" }, 0) as OpError[])[0]?.code,
    ).toBe("unknown-field");
  });
});

describe("diagram.subtitle and diagram.note", () => {
  it("set, replace and clear", () => {
    const d1 = ok(base, [{ op: "diagram.subtitle", text: "Hello." }]).diagram;
    expect(d1.subtitle).toBe("Hello.");
    const d2 = ok(d1, [{ op: "diagram.note", text: "Not shown: x." }]).diagram;
    expect(d2.note).toBe("Not shown: x.");
    const d3 = ok(d2, [{ op: "diagram.subtitle" }, { op: "diagram.note" }]).diagram;
    expect(d3.subtitle).toBeUndefined();
    expect(d3.note).toBeUndefined();
    expect(writeDiagram(d3)).toBe(writeDiagram(base));
  });

  it("diagram.new takes them", () => {
    const d = ok(null, [{ op: "diagram.new", title: "T", subtitle: "S", note: "N" }]).diagram;
    expect(d).toMatchObject({ subtitle: "S", note: "N" });
  });
});

describe("budget warnings (D26)", () => {
  function wide(n: number, extra: Op[] = []): Diagram {
    const ops: Op[] = [{ op: "layer.add", id: "row", label: "Row" }];
    for (let i = 0; i < n; i++)
      ops.push({ op: "node.add", id: `n${i}`, layer: "row", label: `N${i}` });
    return ok(empty, [...ops, ...extra]).diagram;
  }

  it("is silent up to 16 nodes and warns above", () => {
    expect(budgetWarnings(wide(16))).toEqual([]);
    const w = budgetWarnings(wide(17));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ code: "too-many-nodes", found: "17 nodes" });
  });

  it("names nodes in one group with identical edges", () => {
    const d = wide(17, [
      { op: "node.add", id: "src", layer: "row", label: "Src" },
      { op: "group.add", id: "g", label: "G", nodes: ["n1", "n2", "n3"] },
      { op: "edge.add", from: "src", to: "n1" },
      { op: "edge.add", from: "src", to: "n2" },
      { op: "edge.add", from: "src", to: "n3" },
    ]);
    const w = budgetWarnings(d);
    expect(w[0]?.suggestion).toContain("n1, n2, n3 (same group, same edges)");
  });

  it("names several queues in one row", () => {
    const d = wide(17, [
      { op: "node.add", id: "q1", layer: "row", label: "Q1", kind: "queue" },
      { op: "node.add", id: "q2", layer: "row", label: "Q2", kind: "queue" },
    ]);
    expect(budgetWarnings(d)[0]?.suggestion).toContain("q1, q2 (queues in layer row)");
  });
});
