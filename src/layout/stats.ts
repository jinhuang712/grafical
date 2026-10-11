// Route measures: crossings, bends and length. The slot choice (D24) minimises
// crossings with them, and tests report them.

import type { Point } from "../scene.ts";

export interface RouteStats {
  crossings: number;
  bends: number;
  length: number;
}

interface Seg {
  id: number;
  vertical: boolean;
  /** The fixed coordinate: x of a vertical segment, y of a horizontal one. */
  at: number;
  lo: number;
  hi: number;
}

/** Proper crossings between segments of different routes: each pair of lines that cross. */
export function routeStats(routes: Point[][]): RouteStats {
  const hs: Seg[] = [];
  const vs: Seg[] = [];
  let bends = 0;
  let length = 0;
  routes.forEach((pts, id) => {
    bends += Math.max(0, pts.length - 2);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (a === undefined || b === undefined) continue;
      length += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      if (a.x === b.x)
        vs.push({ id, vertical: true, at: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) });
      else if (a.y === b.y)
        hs.push({ id, vertical: false, at: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) });
    }
  });
  let crossings = 0;
  for (const h of hs) {
    for (const v of vs) {
      if (h.id === v.id) continue;
      if (v.at > h.lo && v.at < h.hi && h.at > v.lo && h.at < v.hi) crossings++;
    }
  }
  return { crossings, bends, length: Math.round(length * 100) / 100 };
}
