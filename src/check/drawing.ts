// The drawing as discrete facts (DESIGN.md D37): for each box its row, its place in the
// row, its size and its lines on each side; for each line the sides it leaves and enters,
// its bends, its length, the lines it crosses and the rows it passes without connecting;
// and totals. The coding agent judges the drawing from them; grafical judges nothing.

import { bendsOf, crossingsOf } from "../layout/index.ts";
import { endRows } from "../model/ends.ts";
import type { Diagram } from "../model/index.ts";
import { record } from "../records.ts";
import type { Point, Rect, Scene } from "../scene.ts";

export type Side = "top" | "bottom" | "left" | "right";
const SIDES: Side[] = ["top", "bottom", "left", "right"];

export interface DrawnBox {
  id: string;
  row: string;
  /** Its place in its row, left to right, from 1, and how many boxes the row holds. */
  place: number;
  of: number;
  width: number;
  height: number;
  /** Lines that meet the box, by side; a side no line meets is left out. */
  sides: Partial<Record<Side, number>>;
}

export interface DrawnLine {
  id: string;
  from: string;
  to: string;
  leaves: Side;
  enters: Side;
  bends: number;
  length: number;
  /** The lines it crosses, in id order. */
  crosses: string[];
  /** Rows between its ends that it runs through, among their boxes, without meeting a box of. */
  passes: string[];
}

export interface DrawnGroup {
  id: string;
  members: number;
  width: number;
  height: number;
}

export interface Counts {
  nodes: number;
  lines: number;
  /** Every point where two lines cross. */
  crossings: number;
  bends: number;
  width: number;
  height: number;
  /** The row with the most boxes, and the box with the most lines; ties go to the first. */
  fullest: { id: string; nodes: number } | null;
  busiest: { id: string; lines: number } | null;
  /** Lines that pass at least one row. */
  passing: number;
}

export interface Drawing {
  counts: Counts;
  boxes: DrawnBox[];
  lines: DrawnLine[];
  groups: DrawnGroup[];
}

/** The side of a box a line's end point lies on: the nearest one. */
function sideOf(p: Point, r: Rect): Side {
  const gaps: Record<Side, number> = {
    top: Math.abs(p.y - r.y),
    bottom: Math.abs(p.y - (r.y + r.h)),
    left: Math.abs(p.x - r.x),
    right: Math.abs(p.x - (r.x + r.w)),
  };
  return SIDES.reduce((best, s) => (gaps[s] < gaps[best] ? s : best), "top" as Side);
}

export function drawing(d: Diagram, scene: Scene): Drawing {
  // Every element a line can end at, with the box it is drawn in.
  const rects = new Map<string, Rect>();
  for (const n of scene.nodes) rects.set(n.id, n.rect);
  for (const g of scene.groups ?? []) rects.set(g.id, g.rect);
  for (const b of scene.bands ?? []) rects.set(b.id, b.rect);
  for (const l of scene.lanes ?? []) rects.set(l.id, l.rect);

  // The span of each row's boxes, for the lines that pass it.
  const spans = new Map<string, { y0: number; y1: number; x0: number; x1: number }>();
  for (const n of scene.nodes) {
    const s = spans.get(n.layer);
    const r = n.rect;
    if (s === undefined) spans.set(n.layer, { y0: r.y, y1: r.y + r.h, x0: r.x, x1: r.x + r.w });
    else {
      s.y0 = Math.min(s.y0, r.y);
      s.y1 = Math.max(s.y1, r.y + r.h);
      s.x0 = Math.min(s.x0, r.x);
      s.x1 = Math.max(s.x1, r.x + r.w);
    }
  }

  const { points, pairs } = crossingsOf(scene.edges);
  const crosses = new Map<string, string[]>();
  for (const [a, b] of pairs) {
    crosses.set(a, [...(crosses.get(a) ?? []), b]);
    crosses.set(b, [...(crosses.get(b) ?? []), a]);
  }

  const atBox = new Map<string, Partial<Record<Side, number>>>();
  const meet = (id: string, side: Side) => {
    const at = atBox.get(id) ?? {};
    at[side] = (at[side] ?? 0) + 1;
    atBox.set(id, at);
  };
  const lines: DrawnLine[] = [];
  for (const e of scene.edges) {
    const first = e.points[0] as Point;
    const last = e.points[e.points.length - 1] as Point;
    const fromRect = rects.get(e.from);
    const toRect = rects.get(e.to);
    const leaves = fromRect === undefined ? "top" : sideOf(first, fromRect);
    const enters = toRect === undefined ? "top" : sideOf(last, toRect);
    meet(e.from, leaves);
    meet(e.to, enters);
    let length = 0;
    for (let i = 1; i < e.points.length; i++) {
      const a = e.points[i - 1] as Point;
      const b = e.points[i] as Point;
      length += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    const passes: string[] = [];
    const a = endRows(d, e.from);
    const b = endRows(d, e.to);
    if (a !== undefined && b !== undefined) {
      const lo = Math.min(a[1], b[1]);
      const hi = Math.max(a[0], b[0]);
      for (const layer of d.layers.slice(lo + 1, Math.max(lo + 1, hi))) {
        const s = spans.get(layer.id);
        if (s === undefined) continue;
        const through = e.points.some((p, k) => {
          const q = e.points[k + 1];
          if (q === undefined || p.x !== q.x) return false;
          return Math.min(p.y, q.y) < s.y1 && Math.max(p.y, q.y) > s.y0 && p.x > s.x0 && p.x < s.x1;
        });
        if (through) passes.push(layer.id);
      }
    }
    lines.push({
      id: e.id,
      from: e.from,
      to: e.to,
      leaves,
      enters,
      bends: bendsOf(e.points),
      length: Math.round(length),
      crosses: (crosses.get(e.id) ?? []).sort(),
      passes,
    });
  }

  const boxes: DrawnBox[] = [];
  for (const layer of d.layers) {
    const row = scene.nodes.filter((n) => n.layer === layer.id).sort((p, q) => p.rect.x - q.rect.x);
    row.forEach((n, i) => {
      const at = atBox.get(n.id) ?? {};
      const sides: Partial<Record<Side, number>> = {};
      for (const s of SIDES) if (at[s] !== undefined) sides[s] = at[s];
      boxes.push({
        id: n.id,
        row: layer.id,
        place: i + 1,
        of: row.length,
        width: Math.round(n.rect.w),
        height: Math.round(n.rect.h),
        sides,
      });
    });
  }

  const groups: DrawnGroup[] = (scene.groups ?? []).map((g) => ({
    id: g.id,
    members: g.members.length,
    width: Math.round(g.rect.w),
    height: Math.round(g.rect.h),
  }));

  let fullest: Counts["fullest"] = null;
  for (const layer of d.layers) {
    if (fullest === null || layer.nodes.length > fullest.nodes)
      fullest = { id: layer.id, nodes: layer.nodes.length };
  }
  let busiest: Counts["busiest"] = null;
  for (const box of boxes) {
    const n = Object.values(box.sides).reduce((s, x) => s + (x ?? 0), 0);
    if (n > 0 && (busiest === null || n > busiest.lines)) busiest = { id: box.id, lines: n };
  }
  return {
    counts: {
      nodes: scene.nodes.length,
      lines: scene.edges.length,
      crossings: points,
      bends: lines.reduce((s, l) => s + l.bends, 0),
      width: Math.round(scene.width),
      height: Math.round(scene.height),
      fullest,
      busiest,
      passing: lines.filter((l) => l.passes.length > 0).length,
    },
    boxes,
    lines,
    groups,
  };
}

/** The counts as one record, named by what they count: counts, before or after. */
export function countsText(c: Counts, name = "counts"): string {
  return record(name, { ...c });
}

/** The whole drawing as records: the counts, then each box, group and line. */
export function drawingText(dr: Drawing): string {
  const out = [countsText(dr.counts)];
  for (const b of dr.boxes) out.push(record("box", { ...b }));
  for (const g of dr.groups) out.push(record("group", { ...g }));
  for (const l of dr.lines) out.push(record("line", { ...l }));
  return `${out.join("\n")}\n`;
}
