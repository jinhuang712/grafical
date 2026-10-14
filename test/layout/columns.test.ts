// Columns in the picture (DESIGN.md, "Columns beside rows"): every box of a column left of every box of
// the next, in every row, with nothing drawn.

import { beforeAll, describe, expect, it } from "vitest";
import { drawing } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe('columns in the picture (DESIGN.md, "Columns beside rows")', () => {
  it("photo sharing: requests left, processing right, narrower and with a bend less", () => {
    const r = applyOps(edgeLooks, [
      { op: "column.add", id: "requests", nodes: ["web", "api", "cache"] },
      { op: "column.add", id: "processing", nodes: ["uploads", "thumbs"] },
    ]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    const d: Diagram = r.diagram;
    const before = drawing(edgeLooks, layout(edgeLooks, m)).counts;
    const scene = layout(d, m);
    const after = drawing(d, scene).counts;
    expect(after.width).toBeLessThan(before.width);
    expect(after.bends).toBeLessThan(before.bends);
    expect(after.crossings).toBe(0);
    // Every box of requests lies left of every box of processing, whatever their rows.
    const x = (id: string) =>
      scene.nodes.find((nd) => nd.id === id)?.rect as { x: number; w: number };
    for (const a of ["web", "api", "cache"]) {
      for (const b of ["uploads", "thumbs"]) expect(x(a).x + x(a).w).toBeLessThan(x(b).x);
    }
    expect(check(d, scene, m)).toEqual([]);
    expect(scene.walls).toBeUndefined();
  });
});
