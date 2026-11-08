// What the picture is measured by: the bend limit and the count of crossings. Pure.
// The file keeps its name because `pnpm bench diff` loads it from older engines.

import type { SceneEdge } from "../scene.ts";
import { EPS, type Segment, segmentsOf } from "./geometry.ts";

/** An edge with more bends is a warning (specs/decisions, "A bent edge is reported and never refused"). */
export const MAX_BENDS = 2;

const isH = (s: Segment): boolean => Math.abs(s.a.y - s.b.y) < EPS;
const isV = (s: Segment): boolean => Math.abs(s.a.x - s.b.x) < EPS;

/** Drops points that sit in the middle of a straight run, so that bends count corners only. */
function segmentsMerged(e: SceneEdge): Segment[] {
  const out: Segment[] = [];
  for (const s of segmentsOf(e.points)) {
    const last = out[out.length - 1];
    if (last && ((isH(last) && isH(s)) || (isV(last) && isV(s)))) last.b = s.b;
    else out.push({ a: s.a, b: s.b });
  }
  return out;
}

const between = (v: number, a: number, b: number): boolean =>
  v > Math.min(a, b) + EPS && v < Math.max(a, b) - EPS;

/** True when a horizontal and a vertical segment cross in the interior of both. */
function cross(h: Segment, v: Segment): boolean {
  return between(v.a.x, h.a.x, h.b.x) && between(h.a.y, v.a.y, v.b.y);
}

function edgesCross(a: Segment[], b: Segment[]): boolean {
  for (const s of a) {
    for (const t of b) {
      if (isH(s) && isV(t) && cross(s, t)) return true;
      if (isV(s) && isH(t) && cross(t, s)) return true;
    }
  }
  return false;
}

/** Edge pairs with at least one proper crossing. T-junctions and shared trunks are not crossings. */
export function countCrossings(edges: SceneEdge[]): number {
  const segs = edges.map(segmentsMerged);
  let n = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (edgesCross(segs[i] as Segment[], segs[j] as Segment[])) n++;
    }
  }
  return n;
}
