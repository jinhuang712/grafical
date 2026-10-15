// How the lines sit against each other and against the boxes, as three separate counts (DESIGN.md, "Composition
// counts"). Each is a count of places, never a score: grafical adds nothing up and judges nothing.

import type { Point, Rect, Scene, SceneEdge } from "../scene.ts";
import { EPS, type Segment, segmentCrossesRect, segmentsOf } from "./geometry.ts";

/** Two runs of different lines closer than this, for longer than TIGHT_OVER, are tight: a track is 12 px. */
export const TRACK = 12;
const TIGHT_OVER = 100;
/** A label with less room than this on two or more sides is crowded. */
export const ROOM = 8;

export interface Tight {
  a: string;
  b: string;
  /** Where the two runs lie: the cross-axis position of the first, and the stretch they share along the axis. */
  at: number;
  lo: number;
  hi: number;
  vertical: boolean;
}

export interface Composition {
  /** The lines that cross the box of a group that holds neither of their ends, in id order. */
  across: string[];
  tight: Tight[];
  /** The lines whose label is crowded, with the label's box. */
  crowded: { id: string; rect: Rect }[];
}

const horizontal = (s: Segment) => Math.abs(s.a.y - s.b.y) < EPS;

function edgesOf(r: Rect): Segment[] {
  const { x, y, w, h } = r;
  const p = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  return p.map((a, i) => ({ a, b: p[(i + 1) % 4] as { x: number; y: number } }));
}

/** The lines that cross a group's box without either end in it. */
function acrossOf(scene: Scene): string[] {
  const rects = new Map<string, Rect>();
  for (const n of scene.nodes) rects.set(n.id, n.rect);
  for (const g of scene.groups ?? []) rects.set(g.id, g.rect);
  for (const b of scene.bands ?? []) rects.set(b.id, b.rect);
  for (const l of scene.lanes ?? []) rects.set(l.id, l.rect);
  const holds = (g: { id: string; rect: Rect; members: string[] }, end: string): boolean => {
    if (end === g.id || g.members.includes(end)) return true;
    const r = rects.get(end);
    return (
      r !== undefined &&
      r.x >= g.rect.x - EPS &&
      r.y >= g.rect.y - EPS &&
      r.x + r.w <= g.rect.x + g.rect.w + EPS &&
      r.y + r.h <= g.rect.y + g.rect.h + EPS
    );
  };
  const out: string[] = [];
  for (const e of scene.edges) {
    const segs = segmentsOf(e.points);
    const through = (scene.groups ?? []).some(
      (g) =>
        !holds(g, e.from) && !holds(g, e.to) && segs.some((s) => segmentCrossesRect(s, g.rect)),
    );
    if (through) out.push(e.id);
  }
  return out.sort();
}

/** Runs of two different lines, not of one bus, that lie side by side closer than a track for more than 100 px. */
function tightOf(edges: SceneEdge[], sameBus: (a: string, b: string) => boolean): Tight[] {
  const runs = edges.flatMap((e) => segmentsOf(e.points).map((s) => ({ id: e.id, s })));
  const out: Tight[] = [];
  for (let i = 0; i < runs.length; i++) {
    const p = runs[i] as (typeof runs)[number];
    for (let j = i + 1; j < runs.length; j++) {
      const q = runs[j] as (typeof runs)[number];
      if (p.id === q.id || sameBus(p.id, q.id)) continue;
      const h = horizontal(p.s);
      if (h !== horizontal(q.s)) continue;
      const [pa, pb] = h ? [p.s.a.x, p.s.b.x] : [p.s.a.y, p.s.b.y];
      const [qa, qb] = h ? [q.s.a.x, q.s.b.x] : [q.s.a.y, q.s.b.y];
      const lo = Math.max(Math.min(pa, pb), Math.min(qa, qb));
      const hi = Math.min(Math.max(pa, pb), Math.max(qa, qb));
      const at = h ? p.s.a.y : p.s.a.x;
      const gap = Math.abs(at - (h ? q.s.a.y : q.s.a.x));
      if (hi - lo <= TIGHT_OVER || gap >= TRACK) continue;
      out.push(
        p.id < q.id
          ? { a: p.id, b: q.id, at, lo, hi, vertical: !h }
          : { a: q.id, b: p.id, at, lo, hi, vertical: !h },
      );
    }
  }
  return out;
}

/** The room on each side of a label: the distance to the nearest facing line, box, group or band border, or label. */
function roomsOf(label: Rect, own: string, scene: Scene): number[] {
  const obstacles: Segment[] = [];
  for (const n of scene.nodes) obstacles.push(...edgesOf(n.rect));
  for (const g of scene.groups ?? []) obstacles.push(...edgesOf(g.rect));
  for (const b of scene.bands ?? []) obstacles.push(...edgesOf(b.rect));
  for (const e of scene.edges) {
    if (e.id !== own) obstacles.push(...segmentsOf(e.points));
    if (e.id !== own && e.label !== undefined) obstacles.push(...edgesOf(e.label.bbox));
  }
  let top = Number.POSITIVE_INFINITY;
  let bottom = top;
  let left = top;
  let right = top;
  const bx = label.x + label.w;
  const by = label.y + label.h;
  for (const s of obstacles) {
    if (horizontal(s)) {
      const x0 = Math.min(s.a.x, s.b.x);
      const x1 = Math.max(s.a.x, s.b.x);
      if (x1 <= label.x + EPS || x0 >= bx - EPS) continue;
      const y = s.a.y;
      if (y <= label.y + EPS) top = Math.min(top, label.y - y);
      else if (y >= by - EPS) bottom = Math.min(bottom, y - by);
      else {
        top = 0;
        bottom = 0;
      }
    } else {
      const y0 = Math.min(s.a.y, s.b.y);
      const y1 = Math.max(s.a.y, s.b.y);
      if (y1 <= label.y + EPS || y0 >= by - EPS) continue;
      const x = s.a.x;
      if (x <= label.x + EPS) left = Math.min(left, label.x - x);
      else if (x >= bx - EPS) right = Math.min(right, x - bx);
      else {
        left = 0;
        right = 0;
      }
    }
  }
  return [top, bottom, left, right];
}

export interface Gutter {
  above: string;
  below: string;
  /** Lines that run in the gutter, even only through it. */
  lines: number;
  crossings: number;
  tight: number;
  crowded: number;
}

/**
 * What lies between two neighbouring rows, from the bottom of the boxes above to the top of the boxes below
 * (DESIGN.md, "Composition counts"): the lines with a run in it, the crossings, the tight pairs and the crowded
 * labels. A line's run that only passes through counts.
 */
export function gutterOf(
  [y0, y1]: [number, number],
  scene: Scene,
  comp: Composition,
  crossings: Point[],
): Omit<Gutter, "above" | "below"> {
  const inside = (lo: number, hi: number) => hi > y0 + EPS && lo < y1 - EPS;
  const lines = scene.edges.filter((e) =>
    segmentsOf(e.points).some((s) => inside(Math.min(s.a.y, s.b.y), Math.max(s.a.y, s.b.y))),
  ).length;
  return {
    lines,
    crossings: crossings.filter((p) => p.y > y0 + EPS && p.y < y1 - EPS).length,
    tight: comp.tight.filter((t) => (t.vertical ? inside(t.lo, t.hi) : inside(t.at, t.at))).length,
    crowded: comp.crowded.filter(
      (c) => c.rect.y + c.rect.h / 2 > y0 && c.rect.y + c.rect.h / 2 < y1,
    ).length,
  };
}

export function composition(scene: Scene, sameBus: (a: string, b: string) => boolean): Composition {
  const crowded: Composition["crowded"] = [];
  for (const e of scene.edges) {
    if (e.label === undefined) continue;
    const rect = e.label.bbox;
    if (roomsOf(rect, e.id, scene).filter((r) => r < ROOM).length >= 2)
      crowded.push({ id: e.id, rect });
  }
  return { across: acrossOf(scene), tight: tightOf(scene.edges, sameBus), crowded };
}
