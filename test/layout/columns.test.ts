// Columns in the picture (specs/decisions, "Columns beside layers"): every node of a column left of every node of
// the next, in every layer, with nothing drawn.

import { beforeAll, describe, expect, it } from "vitest";
import { drawing } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { THEMES } from "../../src/theme/themes.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe('columns in the picture (specs/decisions, "Columns beside layers")', () => {
  it("photo sharing: requests left, processing right, narrower and with a bend less", () => {
    const r = applyOps(edgeLooks, [
      { op: "column.set", ids: ["requests"] },
      { op: "node.set", ids: ["web", "api", "cache"], column: "requests" },
      { op: "column.set", ids: ["processing"] },
      { op: "node.set", ids: ["uploads", "thumbs"], column: "processing" },
    ]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    const d: Diagram = r.diagram;
    const before = drawing(edgeLooks, layout(edgeLooks, m)).counts;
    const scene = layout(d, m);
    const after = drawing(d, scene).counts;
    expect(after.width).toBeLessThan(before.width);
    expect(after.bends).toBeLessThan(before.bends);
    expect(after.crossings).toBe(0);
    // Every node of requests lies left of every node of processing, whatever their layers.
    const x = (id: string) =>
      scene.nodes.find((nd) => nd.id === id)?.rect as { x: number; w: number };
    for (const a of ["web", "api", "cache"]) {
      for (const b of ["uploads", "thumbs"]) expect(x(a).x + x(a).w).toBeLessThan(x(b).x);
    }
    expect(check(d, scene, m)).toEqual([]);
    expect(scene.walls).toBeUndefined();
  });

  it('hold across layers that share no node (specs/decisions, "Columns hold across layers")', () => {
    const d: Diagram = {
      grafical: 1,
      title: "T",
      layers: [
        { id: "r1", label: "R1", nodes: [{ id: "a", label: "A", kind: "service", column: "c1" }] },
        { id: "r2", label: "R2", nodes: [{ id: "b", label: "B", kind: "service", column: "c2" }] },
      ],
      columns: [{ id: "c1" }, { id: "c2" }],
      edges: [],
    };
    const scene = layout(d, m);
    const x = (id: string) =>
      scene.nodes.find((nd) => nd.id === id)?.rect as { x: number; w: number };
    // A layer's gap between them, as if they stood side by side in one layer.
    expect(x("b").x - (x("a").x + x("a").w)).toBe(THEMES.default?.space.columnGap);
    expect(check(d, scene, m)).toEqual([]);
  });
});
