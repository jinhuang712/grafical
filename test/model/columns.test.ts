// Columns (DESIGN.md, "Columns beside rows"): a guide that boxes follow beside their rows.

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
import { createStubMeasurer } from "../../src/text/stub.ts";
import { e, n } from "../fixtures/build.ts";

const m = createStubMeasurer();

function ok(d: Diagram, ops: Op[]) {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops, m);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}
const row = (d: Diagram, id: string) => d.layers.find((l) => l.id === id)?.nodes.map((x) => x.id);

/** Two rows: web, api and a worker on top; a cache, the db and a queue below. */
const base: Diagram = {
  grafical: 1,
  title: "T",
  density: "normal",
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

describe('columns (DESIGN.md, "Columns beside rows")', () => {
  it("are kept in the file, read back, and shown", () => {
    const r = ok(base, [
      { op: "column.add", id: "requests", nodes: ["web", "api", "cache"] },
      { op: "column.add", id: "jobs", nodes: ["worker", "queue"] },
    ]);
    expect(r.diagram.columns).toEqual([{ id: "requests" }, { id: "jobs" }]);
    const text = writeDiagram(r.diagram);
    expect(text).toContain("columns:");
    expect(text).toContain("column: requests");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    const shown = showDiagram(r.diagram);
    expect(shown).toContain("column requests: web, api, cache");
    expect(shown).toContain('api "API" service size=m column=requests');
  });

  it("keep every row in column order; a box in no column stays beside its left neighbour", () => {
    // The worker joins the left column and moves first; api and the db, in no column, stay
    // right after web and the cache, the boxes left of them.
    const d = ok(base, [
      { op: "column.add", id: "left", nodes: ["worker", "queue"] },
      { op: "column.add", id: "right", nodes: ["web", "cache"] },
    ]).diagram;
    expect(row(d, "top")).toEqual(["worker", "web", "api"]);
    expect(row(d, "low")).toEqual(["queue", "cache", "db"]);
  });

  it("go where they are put, and refuse an unknown column or a taken id", () => {
    const d = ok(base, [
      { op: "column.add", id: "b" },
      { op: "column.add", id: "a", before: "b" },
      { op: "column.add", id: "c", after: "a" },
    ]).diagram;
    expect(d.columns?.map((c) => c.id)).toEqual(["a", "c", "b"]);
    expect(fail(d, [{ op: "column.add", id: "x", after: "zz" }])[0]).toMatchObject({
      code: "unknown-column",
    });
    expect(fail(d, [{ op: "column.join", column: "bb", members: ["web"] }])[0]).toMatchObject({
      code: "unknown-column",
      facts: { near: expect.arrayContaining(["b"]) },
    });
    expect(fail(d, [{ op: "column.add", id: "web" }])[0]).toMatchObject({ code: "duplicate-id" });
  });

  it("leave and remove keep the boxes where they are", () => {
    const d = ok(base, [{ op: "column.add", id: "jobs", nodes: ["worker", "queue"] }]).diagram;
    const left = ok(d, [{ op: "column.leave", members: ["queue"] }]).diagram;
    expect(left.layers[1]?.nodes.find((x) => x.id === "queue")?.column).toBeUndefined();
    const gone = ok(d, [{ op: "column.remove", id: "jobs" }]).diagram;
    expect(gone.columns).toBeUndefined();
    expect(gone.layers.flatMap((l) => l.nodes).some((x) => x.column !== undefined)).toBe(false);
    expect(row(gone, "top")).toEqual(row(d, "top"));
  });

  it("refuse an order another fact contradicts, and lanes that run as columns", () => {
    // A group of api and db: the cache, left of the db, must stay left of the group's
    // block, so it cannot follow a column right of api's.
    const grouped = ok(base, [
      { op: "group.add", id: "g", label: "G", nodes: ["api", "db"] },
    ]).diagram;
    expect(
      fail(grouped, [
        { op: "column.add", id: "first", nodes: ["api"] },
        { op: "column.add", id: "second", nodes: ["cache"] },
      ])[0],
    ).toMatchObject({ code: "column-order", facts: { nodes: ["api", "cache"] } });
    const laned = ok(base, [{ op: "lane.add", id: "l", label: "L", members: ["web"] }]).diagram;
    expect(fail(laned, [{ op: "column.add", id: "c" }])[0]).toMatchObject({ code: "column-lanes" });
  });

  it("diff gives back the operations", () => {
    const d = ok(base, [{ op: "column.add", id: "jobs", nodes: ["worker", "queue"] }]).diagram;
    const ops = diffDiagrams(base, d);
    expect(writeDiagram(ok(base, ops).diagram)).toBe(writeDiagram(d));
    const changed = ok(d, [
      { op: "column.add", id: "requests", before: "jobs", nodes: ["web"] },
      { op: "column.leave", members: ["queue"] },
    ]).diagram;
    expect(writeDiagram(ok(d, diffDiagrams(d, changed)).diagram)).toBe(writeDiagram(changed));
  });
});
