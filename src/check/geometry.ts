// Small geometry helpers for the checker, and for the layout where it keeps to the same rule. Pure.

import type { Point, Rect } from "../scene.ts";

export interface Segment {
  a: Point;
  b: Point;
}

export const EPS = 1e-6;

export function inset(r: Rect, d: number, dy: number = d): Rect {
  return { x: r.x + d, y: r.y + dy, w: r.w - 2 * d, h: r.h - 2 * dy };
}

/** True when the two rects share an area, not just an edge. */
export function rectsOverlap(p: Rect, q: Rect): boolean {
  return (
    p.x < q.x + q.w - EPS && q.x < p.x + p.w - EPS && p.y < q.y + q.h - EPS && q.y < p.y + p.h - EPS
  );
}

/** True when `inner` lies inside `outer`, edges included. */
export function rectInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.w <= outer.x + outer.w + EPS &&
    inner.y + inner.h <= outer.y + outer.h + EPS
  );
}

/** True when the segment passes through the open interior of the rect (Liang-Barsky). */
export function segmentCrossesRect(s: Segment, r: Rect): boolean {
  if (r.w <= 0 || r.h <= 0) return false;
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  let t0 = 0;
  let t1 = 1;
  const clips: [number, number][] = [
    [-dx, s.a.x - r.x],
    [dx, r.x + r.w - s.a.x],
    [-dy, s.a.y - r.y],
    [dy, r.y + r.h - s.a.y],
  ];
  for (const [p, q] of clips) {
    if (Math.abs(p) < EPS) {
      if (q <= EPS) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 >= t1 - EPS) return false;
    }
  }
  return t1 - t0 > EPS;
}

export function segmentsOf(points: Point[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    if (Math.abs(a.x - b.x) > EPS || Math.abs(a.y - b.y) > EPS) out.push({ a, b });
  }
  return out;
}

/** The shared stretch of two collinear axis-aligned segments, or undefined. */
export function collinearOverlap(s: Segment, t: Segment): Segment | undefined {
  const sh = Math.abs(s.a.y - s.b.y) < EPS;
  const th = Math.abs(t.a.y - t.b.y) < EPS;
  const sv = Math.abs(s.a.x - s.b.x) < EPS;
  const tv = Math.abs(t.a.x - t.b.x) < EPS;
  if (sh && th && Math.abs(s.a.y - t.a.y) < EPS) {
    const lo = Math.max(Math.min(s.a.x, s.b.x), Math.min(t.a.x, t.b.x));
    const hi = Math.min(Math.max(s.a.x, s.b.x), Math.max(t.a.x, t.b.x));
    if (hi - lo > EPS) return { a: { x: lo, y: s.a.y }, b: { x: hi, y: s.a.y } };
  }
  if (sv && tv && Math.abs(s.a.x - t.a.x) < EPS) {
    const lo = Math.max(Math.min(s.a.y, s.b.y), Math.min(t.a.y, t.b.y));
    const hi = Math.min(Math.max(s.a.y, s.b.y), Math.max(t.a.y, t.b.y));
    if (hi - lo > EPS) return { a: { x: s.a.x, y: lo }, b: { x: s.a.x, y: hi } };
  }
  return undefined;
}

export function length(s: Segment): number {
  return Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
}

/** True when the point lies within d of the rect (inside counts). */
export function pointNearRect(p: Point, r: Rect, d: number): boolean {
  return p.x >= r.x - d && p.x <= r.x + r.w + d && p.y >= r.y - d && p.y <= r.y + r.h + d;
}

/** The distance from p to the nearest point of r; 0 inside it. */
export function toRect(p: Point, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** The distance from p to the nearest side of r, inside it or out. */
export function toBorder(p: Point, r: Rect): number {
  const inside = p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  if (!inside) return toRect(p, r);
  return Math.min(p.x - r.x, r.x + r.w - p.x, p.y - r.y, r.y + r.h - p.y);
}

/** The distance from p to an axis-parallel segment. */
export function toSegment(p: Point, s: Segment): number {
  return toRect(p, {
    x: Math.min(s.a.x, s.b.x),
    y: Math.min(s.a.y, s.b.y),
    w: Math.abs(s.a.x - s.b.x),
    h: Math.abs(s.a.y - s.b.y),
  });
}
