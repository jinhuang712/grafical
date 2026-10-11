// Lists the edge pairs that cross, and the edges with more than two bends, for a
// fixture, with the gutter each crossing lies in. Run:
//   node test/debug/crossings.ts [catalog-sync|dense|catalog-sync-grouped]

import { layout } from "../../src/layout/index.ts";
import type { Diagram } from "../../src/model/types.ts";
import type { Point } from "../../src/scene.ts";
import { createStubMeasurer } from "../../src/text/stub.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { dense } from "../fixtures/dense.ts";

const fixtures: Record<string, Diagram> = {
  "catalog-sync": catalogSync,
  "catalog-sync-grouped": catalogSyncGrouped,
  dense,
};
const d = fixtures[process.argv[2] ?? "catalog-sync"] ?? catalogSync;
const s = layout(d, createStubMeasurer());
const rowOf = (y: number) => {
  for (const l of s.layers) if (y < l.band.y) return `above ${l.id}`;
  return "below all";
};
type Seg = [Point, Point];
const segs = (pts: Point[]): Seg[] => pts.slice(1).map((p, i) => [pts[i] as Point, p]);
const between = (x: number, a: number, b: number) => x > Math.min(a, b) && x < Math.max(a, b);
const where = new Map<string, number>();
for (let i = 0; i < s.edges.length; i++) {
  for (let j = i + 1; j < s.edges.length; j++) {
    const a = s.edges[i];
    const b = s.edges[j];
    if (a === undefined || b === undefined) continue;
    for (const [p, q] of segs(a.points)) {
      for (const [r, t] of segs(b.points)) {
        const ah = p.y === q.y;
        const bh = r.y === t.y;
        if (ah === bh) continue;
        const [h0, h1, v0, v1] = ah ? [p, q, r, t] : [r, t, p, q];
        if (between(v0.x, h0.x, h1.x) && between(h0.y, v0.y, v1.y)) {
          const k = rowOf(h0.y);
          where.set(k, (where.get(k) ?? 0) + 1);
          console.log(`${a.id} x ${b.id} at ${v0.x},${h0.y} (${k})`);
        }
      }
    }
  }
}
console.log(Object.fromEntries(where));
for (const e of s.edges)
  if (e.points.length > 4) console.log(`${e.id}: ${e.points.length - 2} bends`);
