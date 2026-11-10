// Columns (specs/decisions, "Columns beside layers"): a guide that nodes follow beside their layers.

import { describe, expect, it } from "vitest";
import { showDiagram } from "../../src/cli/show.ts";
import type { OpError } from "../../src/errors.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { e, n } from "../fixtures/build.ts";

function ok(d: Diagram, ops: Op[]) {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}
const layerOf = (d: Diagram, id: string) =>
  d.layers.find((l) => l.id === id)?.nodes.map((x) => x.id);

/** Two layers: web, api and a worker on top; a cache, the db and a queue below. */
const base: Diagram = {
  grafical: 1,
  title: "T",
  layers: [
    {
      id: "top",
      label: "Top",
      nodes: [
        n("web", "Web", "service", "m"),
        n("api", "API", "service", "m"),
        n("worker", "Worker", "service", "m"),
      ],
    },
    {
      id: "low",
      label: "Low",
      nodes: [
        n("cache", "Cache", "store", "m"),
        n("db", "DB", "store", "m"),
        n("queue", "Queue", "queue", "m"),
      ],
    },
  ],
  edges: [
    e("api", "cache", "call"),
    e("api", "db", "call"),
    e("worker", "db", "call"),
    e("worker", "queue", "call"),
  ],
};

describe('columns (specs/decisions, "Columns beside layers")', () => {
  it("are kept in the file, read back, and shown", () => {
    const r = ok(base, [
      { op: "column.set", ids: ["requests"] },
      { op: "node.set", ids: ["web", "api", "cache"], column: "requests" },
      { op: "column.set", ids: ["jobs"] },
      { op: "node.set", ids: ["worker", "queue"], column: "jobs" },
    ]);
    expect(r.diagram.columns).toEqual([{ id: "requests" }, { id: "jobs" }]);
    const text = writeDiagram(r.diagram);
    expect(text).toContain("<column> requests {");
    expect(text).toContain("column: @requests");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    const shown = showDiagram(r.diagram);
    expect(shown).toContain("column requests: web, api, cache");
    expect(shown).toContain('api "API" service size=m column=requests');
  });

  it("keep every layer in column order; a node in no column stays beside its left neighbour", () => {
    // The worker joins the left column and moves first; api and the db, in no column, stay
    // right after web and the cache, the nodes left of them.
    const d = ok(base, [
      { op: "column.set", ids: ["left"] },
      { op: "node.set", ids: ["worker", "queue"], column: "left" },
      { op: "column.set", ids: ["right"] },
      { op: "node.set", ids: ["web", "cache"], column: "right" },
    ]).diagram;
    expect(layerOf(d, "top")).toEqual(["worker", "web", "api"]);
    expect(layerOf(d, "low")).toEqual(["queue", "cache", "db"]);
  });

  it("go where they are put, and refuse an unknown column or a taken id", () => {
    const d = ok(base, [
      { op: "column.set", ids: ["b"] },
      { op: "column.set", ids: ["a"], before: "b" },
      { op: "column.set", ids: ["c"], after: "a" },
    ]).diagram;
    expect(d.columns?.map((c) => c.id)).toEqual(["a", "c", "b"]);
    expect(fail(d, [{ op: "column.set", ids: ["x"], after: "zz" }])[0]).toMatchObject({
      code: "unknown-column",
    });
    expect(fail(d, [{ op: "node.set", ids: ["web"], column: "bb" }])[0]).toMatchObject({
      code: "unknown-column",
      facts: { near: expect.arrayContaining(["b"]) },
    });
    expect(fail(d, [{ op: "column.set", ids: ["web"] }])[0]).toMatchObject({
      code: "duplicate-id",
    });
  });

  it("leave and remove keep the nodes where they are", () => {
    const d = ok(base, [
      { op: "column.set", ids: ["jobs"] },
      { op: "node.set", ids: ["worker", "queue"], column: "jobs" },
    ]).diagram;
    const left = ok(d, [{ op: "node.set", ids: ["queue"], column: "-" }]).diagram;
    expect(left.layers[1]?.nodes.find((x) => x.id === "queue")?.column).toBeUndefined();
    const gone = ok(d, [{ op: "column.remove", ids: ["jobs"] }]).diagram;
    expect(gone.columns).toBeUndefined();
    expect(gone.layers.flatMap((l) => l.nodes).some((x) => x.column !== undefined)).toBe(false);
    expect(layerOf(gone, "top")).toEqual(layerOf(d, "top"));
  });

  it("refuse an order another fact contradicts, and lanes that run as columns", () => {
    // A group of api and db: the cache, left of the db, must stay left of the group's
    // block, so it cannot follow a column right of api's.
    const grouped = ok(base, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["api", "db"], group: "g" },
    ]).diagram;
    expect(
      fail(grouped, [
        { op: "column.set", ids: ["first"] },
        { op: "node.set", ids: ["api"], column: "first" },
        { op: "column.set", ids: ["second"] },
        { op: "node.set", ids: ["cache"], column: "second" },
      ])[0],
    ).toMatchObject({ code: "column-order", facts: { nodes: ["api", "cache"] } });
    const laned = ok(base, [
      { op: "lane.set", ids: ["l"], label: "L" },
      { op: "node.set", ids: ["web"], lane: "l" },
    ]).diagram;
    expect(fail(laned, [{ op: "column.set", ids: ["c"] }])[0]).toMatchObject({
      code: "column-lanes",
    });
  });

  it("diff gives back the operations", () => {
    const d = ok(base, [
      { op: "column.set", ids: ["jobs"] },
      { op: "node.set", ids: ["worker", "queue"], column: "jobs" },
    ]).diagram;
    const ops = diffDiagrams(base, d);
    expect(writeDiagram(ok(base, ops).diagram)).toBe(writeDiagram(d));
    const changed = ok(d, [
      { op: "column.set", ids: ["requests"], before: "jobs" },
      { op: "node.set", ids: ["web"], column: "requests" },
      { op: "node.set", ids: ["queue"], column: "-" },
    ]).diagram;
    expect(writeDiagram(ok(d, diffDiagrams(d, changed)).diagram)).toBe(writeDiagram(changed));
  });
});
