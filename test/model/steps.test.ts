// Boxes placed by steps from another box, in no row (DESIGN.md, "Steps from another box").

import { describe, expect, it } from "vitest";
import { drawing } from "../../src/check/drawing.ts";
import { showDiagram } from "../../src/cli/show.ts";
import type { OpError } from "../../src/errors.ts";
import { buildGrid } from "../../src/layout/grid.ts";
import { layout, placeSteps } from "../../src/layout/index.ts";
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

function ok(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops, m);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}
const codes = (errors: OpError[]) => errors.map((x) => [x.code, x.field]);
/** Each node's column in the grid the layout uses. */
const cols = (d: Diagram) => buildGrid(placeSteps(d).d).col;

/** An API over a worker, a cache and a database. */
const base: Diagram = {
  grafical: 1,
  title: "T",
  density: "normal",
  layers: [
    {
      id: "top",
      label: "Top",
      nodes: [n("web", "Web", "service", "m"), n("api", "API", "service", "m")],
    },
    {
      id: "low",
      label: "Low",
      nodes: [n("worker", "Worker", "service", "m"), n("db", "DB", "store", "m")],
    },
  ],
  edges: [e("web", "api", "call"), e("api", "worker", "call"), e("api", "db", "call")],
};

describe('boxes placed by steps (DESIGN.md, "Steps from another box")', () => {
  it("are kept in the file, read back, and shown", () => {
    const d = ok(base, [
      {
        op: "node.add",
        id: "cache",
        label: "Cache",
        kind: "store",
        from: "api",
        down: 1,
        right: 1,
      },
    ]);
    expect(d.nodes?.map((x) => [x.id, x.from, x.down, x.right])).toEqual([["cache", "api", 1, 1]]);
    const text = writeDiagram(d);
    expect(text).toContain("nodes:\n  - id: cache");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    // A box in no row has no alignment, lane or column, and steps from a node that exists.
    for (const extra of ["    align: web\n", "    lane: x\n", "    column: x\n"]) {
      const bad = readDiagram(text.replace("    from: api\n", `    from: api\n${extra}`));
      expect(Array.isArray(bad), extra).toBe(true);
    }
    const lost = readDiagram(text.replace("    from: api\n", "    from: nope\n")) as OpError[];
    expect(lost.map((x) => [x.code, x.field])).toEqual([["unknown-node", "nodes[0].from"]]);
    expect(showDiagram(d)).toContain('node cache "Cache" store from=api down=1 right=1');
  });

  it("sit their steps from the box they step from, which they move with", () => {
    const d = ok(base, [
      { op: "node.add", id: "cache", label: "Cache", from: "api", down: 1, right: 1 },
    ]);
    let c = cols(d);
    expect((c.get("cache") ?? 0) - (c.get("api") ?? 0)).toBe(1);
    // The row it lands in keeps its order, its boxes standing aside.
    const low = placeSteps(d).d.layers[1]?.nodes.map((x) => x.id);
    expect(low?.indexOf("cache")).toBeGreaterThan(low?.indexOf("worker") ?? 99);
    const moved = ok(d, [{ op: "node.move", id: "api", first: true }]);
    c = cols(moved);
    expect((c.get("cache") ?? 0) - (c.get("api") ?? 0)).toBe(1);
    const left = ok(d, [{ op: "node.move", id: "cache", left: 2 }]);
    c = cols(left);
    expect((c.get("api") ?? 0) - (c.get("cache") ?? 0)).toBe(2);
  });

  it("land past the last row in a row the engine adds, the rows passed empty", () => {
    const d = ok(base, [
      { op: "node.add", id: "audit", label: "Audit", from: "db", down: 2 },
      { op: "edge.add", from: "db", to: "audit" },
    ]);
    const placed = placeSteps(d).d;
    expect(placed.layers.map((l) => l.nodes.map((x) => x.id))).toEqual([
      ["web", "api"],
      ["worker", "db"],
      [],
      ["audit"],
    ]);
    const drawn = drawing(d, layout(d, m));
    expect(drawn.boxes.find((b) => b.id === "audit")).toMatchObject({ row: "-", place: 1 });
    // Two steps across keep two columns, though no other box is in the one between.
    const two = ok(base, [{ op: "node.add", id: "far", label: "Far", from: "db", right: 2 }]);
    const c = cols(two);
    expect((c.get("far") ?? 0) - (c.get("db") ?? 0)).toBe(2);
  });

  it("go back to a row with --layer, and take the place of a row box with steps", () => {
    const d = ok(base, [{ op: "node.move", id: "db", from: "api", down: 1, right: 1 }]);
    expect(d.layers[1]?.nodes.map((x) => x.id)).toEqual(["worker"]);
    expect(d.nodes?.map((x) => x.id)).toEqual(["db"]);
    const back = ok(d, [{ op: "node.move", id: "db", layer: "low", last: true }]);
    expect(back.nodes).toBeUndefined();
    expect(back.layers[1]?.nodes.map((x) => x.id)).toEqual(["worker", "db"]);
    expect(back.layers[1]?.nodes[1]?.from).toBeUndefined();
    expect(back.layers[1]?.nodes[1]?.down).toBeUndefined();
  });

  it("refuse what steps cannot say", () => {
    const one = ok(base, [{ op: "node.add", id: "c", label: "C", from: "api", down: 1 }]);
    expect(
      codes(fail(base, [{ op: "node.add", id: "c", label: "C", from: "nope", down: 1 }])),
    ).toEqual([["unknown-node", "from"]]);
    expect(codes(fail(base, [{ op: "node.add", id: "c", label: "C", from: "api" }]))).toEqual([
      ["missing-field", "down,up,left,right"],
    ]);
    expect(codes(fail(base, [{ op: "node.add", id: "c", label: "C" }]))).toEqual([
      ["missing-field", "layer,from"],
    ]);
    expect(
      codes(fail(base, [{ op: "node.add", id: "c", label: "C", from: "api", up: 1, down: 1 }])),
    ).toEqual([["conflicting-position", "down,up"]]);
    expect(
      codes(
        fail(base, [{ op: "node.add", id: "c", label: "C", layer: "low", from: "api", down: 1 }]),
      ),
    ).toEqual([["conflicting-position", "from,layer"]]);
    // A box never steps from itself, through others or not.
    const two = ok(one, [{ op: "node.add", id: "d2", label: "D2", from: "c", down: 1 }]);
    const cycle = fail(two, [{ op: "node.move", id: "c", from: "d2", down: 1 }]);
    expect(cycle[0]).toMatchObject({ code: "step-cycle", facts: { chain: ["c", "d2", "c"] } });
    // A box others step from stays while they do.
    expect(fail(two, [{ op: "node.remove", id: "c" }])[0]).toMatchObject({
      code: "step-anchor",
      facts: { nodes: ["d2"] },
    });
    // Two boxes kept in one cell.
    const blocked = fail(one, [{ op: "node.add", id: "x", label: "X", from: "api", down: 1 }]);
    expect(blocked[0]).toMatchObject({ code: "step-blocked", found: "x", facts: { node: "c" } });
    // A box placed by steps has no row: no alignment, column, lane or swap.
    expect(fail(one, [{ op: "node.align", id: "c", to: "web" }])[0]?.code).toBe(
      "conflicting-position",
    );
    expect(fail(one, [{ op: "node.swap", a: "c", b: "db" }])[0]?.code).toBe("conflicting-position");
  });

  it("refuse a step that the rows' order cannot keep", () => {
    // x two steps right of web holds api in the column between; y one step right needs it.
    const d = ok(base, [{ op: "node.add", id: "x", label: "X", from: "web", right: 2 }]);
    expect(placeSteps(d).d.layers[0]?.nodes.map((v) => v.id)).toEqual(["web", "api", "x"]);
    const r = fail(d, [{ op: "node.add", id: "y", label: "Y", from: "web", right: 1 }]);
    expect(r[0]).toMatchObject({ code: "step-blocked", field: "from", facts: { node: "api" } });
  });

  it("replay through diff, file for file", () => {
    const a = ok(base, [
      { op: "node.add", id: "c", label: "C", from: "api", down: 1, right: 1 },
      { op: "node.add", id: "d2", label: "D2", from: "c", down: 1 },
      { op: "edge.add", from: "api", to: "c" },
    ]);
    const cases: Op[][] = [
      [{ op: "node.move", id: "c", from: "web", down: 2 }],
      [{ op: "node.move", id: "c", layer: "low", last: true }],
      // The list's order changes, and c then steps from a box that stepped from it.
      [
        { op: "node.move", id: "d2", from: "worker", down: 1 },
        { op: "node.move", id: "c", layer: "low", last: true },
        { op: "node.move", id: "c", from: "d2", right: 1 },
      ],
      [
        { op: "node.remove", id: "d2" },
        { op: "node.remove", id: "c" },
      ],
      [{ op: "node.move", id: "worker", from: "d2", down: 1 }],
    ];
    for (const ops of cases) {
      const b = ok(a, ops);
      for (const [x, y] of [
        [a, b],
        [b, a],
      ] as const) {
        const r = applyOps(x, diffDiagrams(x, y), m);
        if ("errors" in r) throw new Error(JSON.stringify(r.errors.slice(0, 3)));
        expect(writeDiagram(r.diagram)).toBe(writeDiagram(y));
      }
    }
    const fresh = applyOps(null, diffDiagrams(null, a), m);
    if ("errors" in fresh) throw new Error(JSON.stringify(fresh.errors));
    expect(writeDiagram(fresh.diagram)).toBe(writeDiagram(a));
  });
});
