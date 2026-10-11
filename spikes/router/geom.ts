import type { Rect } from "./place.js";

export interface Point {
  x: number;
  y: number;
}

/** A route per edge ID, as a polyline of axis-parallel segments. */
export type Routes = Map<string, Point[]>;

export interface Segment {
  a: Point;
  b: Point;
}

export function segments(points: Point[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a !== undefined && b !== undefined) out.push({ a, b });
  }
  return out;
}

export function round(n: number): number {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r;
}

/** Drop repeated points and middle points of straight runs. */
export function simplify(points: Point[]): Point[] {
  const pts: Point[] = [];
  for (const p of points) {
    const q = { x: round(p.x), y: round(p.y) };
    const last = pts[pts.length - 1];
    if (last !== undefined && last.x === q.x && last.y === q.y) continue;
    pts.push(q);
  }
  const out: Point[] = [];
  for (const p of pts) {
    const a = out[out.length - 2];
    const b = out[out.length - 1];
    if (a !== undefined && b !== undefined) {
      const straight = (a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y);
      if (straight) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

export function isOrthogonal(points: Point[]): boolean {
  return segments(points).every((s) => s.a.x === s.b.x || s.a.y === s.b.y);
}

export function inflate(r: Rect, d: number): Rect {
  return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Does an axis-parallel (or any) segment pass through the open interior of a rectangle? */
export function segmentHitsRect(s: Segment, r: Rect): boolean {
  // Liang-Barsky clip against the open rectangle.
  const x0 = s.a.x;
  const y0 = s.a.y;
  const dx = s.b.x - x0;
  const dy = s.b.y - y0;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, x0 - r.x],
    [dx, r.x + r.w - x0],
    [-dy, y0 - r.y],
    [dy, r.y + r.h - y0],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q <= 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  if (t1 - t0 <= 1e-9) return false;
  // Only the open interior counts: the clipped part must not lie on the border.
  const mx = x0 + dx * ((t0 + t1) / 2);
  const my = y0 + dy * ((t0 + t1) / 2);
  return mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h;
}

export function length(points: Point[]): number {
  return segments(points).reduce(
    (n, s) => n + Math.abs(s.b.x - s.a.x) + Math.abs(s.b.y - s.a.y),
    0,
  );
}
