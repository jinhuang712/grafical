// The drawing as discrete facts (DESIGN.md, "Records over prose"): for each box its row, its place in the
// row, its size, its lines on each side and their length; for each line the sides it
// leaves and enters, its bends, its length against the shortest it could be, the rows
// between its ends, the lines it crosses and the rows it passes without connecting; the
// legend's entries; and totals. The coding agent judges the drawing from them; grafical
// judges nothing.

import { bendsOf, crossingsOf, legendEntries } from "../layout/index.ts";
import { addedRow, placeSteps } from "../layout/steps.ts";
import { endRows } from "../model/ends.ts";
import type { Diagram } from "../model/index.ts";
import { markName } from "../model/types.ts";
import { record } from "../records.ts";
import type { Point, Rect, Scene } from "../scene.ts";
import { themeOf } from "../theme/themes.ts";
import { type Composition, composition } from "./composition.ts";
import { segmentCrossesRect, segmentsOf } from "./geometry.ts";

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
  /** Line ends at the box: a line from the box to itself counts twice. */
  lines: number;
  /** Lines that meet the box, by side; a side no line meets is left out. */
  sides: Partial<Record<Side, number>>;
  /** The length of its lines together, each counted once. */
  reach: number;
}

export interface DrawnLine {
  id: string;
  from: string;
  to: string;
  leaves: Side;
  enters: Side;
  bends: number;
  length: number;
  /** The shortest any line between its two ends could be: the gap between them across and down. */
  direct: number;
  /** Its length over direct, to two decimals; null when the ends touch. */
  detour: number | null;
  /** Rows between the rows of its ends: 0 for one row or two neighbouring rows. */
  skip: number;
  /** The lines it crosses, in id order. */
  crosses: string[];
  /** Rows between its ends that it runs through, among their boxes, without meeting a box of. */
  passes: string[];
  /** The lines it leaves or arrives with through one port, drawn as one bundle there (DESIGN.md, "Fan-outs of three bundle"), in id order. */
  bundle: string[];
}

export interface DrawnGroup {
  id: string;
  members: number;
  width: number;
  height: number;
}

/**
 * A line style or a line width the picture draws, or a mark the diagram names, in the legend's
 * order (DESIGN.md, "A legend for widths and marks", "The legend says only what the agent named").
 */
export interface DrawnLegend {
  /** The line style of a line's sample; null for a mark. */
  style: string | null;
  /** A line width's weight, as diagram legend names it; null for a thin line or a mark. */
  weight: string | null;
  /** A line width's sample width in pixels; null for a thin line or a mark. */
  width: number | null;
  /** A mark's name: its emoji, text or file; null for a line. */
  mark: string | null;
  /** The agent's words; null for a style or width it has not named, which the legend leaves out. */
  text: string | null;
}

/** A wall (DESIGN.md, "Walls as space"): which way it runs, how long and how thick it is, and the lines through it. */
export interface DrawnWall {
  id: string;
  run: string;
  length: number;
  space: number;
  /** The lines that cross it, in id order. */
  lines: string[];
}

/** A note (DESIGN.md, "Notes as callouts or footnotes"): what it is about, and how it is drawn: a callout, or a footnote and its number. */
export interface DrawnNote {
  on: string;
  as: string;
  number: number | null;
  lines: number;
}

export interface Counts {
  nodes: number;
  lines: number;
  /** Every point where two lines cross. */
  crossings: number;
  bends: number;
  /** The length of every line together. */
  length: number;
  width: number;
  height: number;
  /** The row with the most boxes, the box with the most lines and the longest line; ties go to the first. */
  fullest: { id: string; nodes: number } | null;
  busiest: { id: string; lines: number } | null;
  longest: { id: string; length: number } | null;
  /** Lines that pass at least one row. */
  passing: number;
  /** Lines that cross a group's box holding neither of their ends. */
  across: number;
  /** Pairs of runs of two lines, not one bus, closer than 12 px side by side for over 100 px. */
  tight: number;
  /** Line labels with under 8 px of room on two or more sides (DESIGN.md, "Composition counts"). */
  crowded: number;
}

export interface Drawing {
  counts: Counts;
  /** The places behind the three composition counts. */
  composition: Composition;
  boxes: DrawnBox[];
  lines: DrawnLine[];
  groups: DrawnGroup[];
  walls: DrawnWall[];
  notes: DrawnNote[];
  legend: DrawnLegend[];
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

/** The gap between two boxes across, plus the gap down: the shortest a line between them can be. */
function gapOf(a: Rect, b: Rect): number {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return dx + dy;
}

export function drawing(facts: Diagram, scene: Scene): Drawing {
  // Boxes placed by steps count in the rows they are drawn in (DESIGN.md, "Steps from another box").
  const d = placeSteps(facts).d;
  /** A row's name in the output: a row the engine added is "-". */
  const rowName = (id: string) => (addedRow(id) ? "-" : id);
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

  // Every line meets its box at a port of its own, except the lines of a bundle (DESIGN.md, "Lines meet any side", "Fan-outs of three bundle").
  const bundles = new Map<string, Set<string>>();
  const ends = (e: (typeof scene.edges)[number]) => [
    `${e.from}@${e.points[0]?.x},${e.points[0]?.y}`,
    `${e.to}@${e.points.at(-1)?.x},${e.points.at(-1)?.y}`,
  ];
  const atPort = new Map<string, string[]>();
  for (const e of scene.edges) {
    for (const k of ends(e)) atPort.set(k, [...(atPort.get(k) ?? []), e.id]);
  }
  for (const ids of atPort.values()) {
    for (const id of ids) {
      const set = bundles.get(id) ?? new Set();
      for (const o of ids) if (o !== id) set.add(o);
      bundles.set(id, set);
    }
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
    let skip = 0;
    if (a !== undefined && b !== undefined) {
      skip = Math.max(0, Math.max(a[0], b[0]) - Math.min(a[1], b[1]) - 1);
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
        if (through) passes.push(rowName(layer.id));
      }
    }
    const direct =
      fromRect === undefined || toRect === undefined ? 0 : Math.round(gapOf(fromRect, toRect));
    lines.push({
      id: e.id,
      from: e.from,
      to: e.to,
      leaves,
      enters,
      bends: bendsOf(e.points),
      length: Math.round(length),
      direct,
      detour: direct > 0 ? Math.round((length / direct) * 100) / 100 : null,
      skip,
      crosses: (crosses.get(e.id) ?? []).sort(),
      passes,
      bundle: [...(bundles.get(e.id) ?? [])].sort(),
    });
  }

  const reach = new Map<string, number>();
  for (const l of lines) {
    for (const id of new Set([l.from, l.to])) reach.set(id, (reach.get(id) ?? 0) + l.length);
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
        row: rowName(layer.id),
        place: i + 1,
        of: row.length,
        width: Math.round(n.rect.w),
        height: Math.round(n.rect.h),
        lines: Object.values(sides).reduce((s, x) => s + (x ?? 0), 0),
        sides,
        reach: reach.get(n.id) ?? 0,
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
      fullest = { id: rowName(layer.id), nodes: layer.nodes.length };
  }
  let busiest: Counts["busiest"] = null;
  for (const box of boxes) {
    if (box.lines > 0 && (busiest === null || box.lines > busiest.lines))
      busiest = { id: box.id, lines: box.lines };
  }
  let longest: Counts["longest"] = null;
  for (const l of lines) {
    if (longest === null || l.length > longest.length) longest = { id: l.id, length: l.length };
  }
  const comp = composition(scene, (a, b) => bundles.get(a)?.has(b) === true);
  return {
    composition: comp,
    counts: {
      nodes: scene.nodes.length,
      lines: scene.edges.length,
      crossings: points,
      bends: lines.reduce((s, l) => s + l.bends, 0),
      length: lines.reduce((s, l) => s + l.length, 0),
      width: Math.round(scene.width),
      height: Math.round(scene.height),
      fullest,
      busiest,
      longest,
      passing: lines.filter((l) => l.passes.length > 0).length,
      across: comp.across.length,
      tight: comp.tight.length,
      crowded: comp.crowded.length,
    },
    boxes,
    lines,
    groups,
    walls: (scene.walls ?? []).map((w) => {
      const across = w.run === "across";
      return {
        id: w.id,
        run: w.run,
        length: Math.round(across ? w.rect.w : w.rect.h),
        space: Math.round(across ? w.rect.h : w.rect.w),
        lines: scene.edges
          .filter((e) => segmentsOf(e.points).some((s) => segmentCrossesRect(s, w.rect)))
          .map((e) => e.id)
          .sort(),
      };
    }),
    notes: (scene.notes ?? []).map((x) => ({
      on: x.on,
      as: x.as,
      number: x.number ?? null,
      lines: new Set(x.text.runs.map((r) => r.y)).size,
    })),
    legend: legendEntries(facts, themeOf(facts).paint).map((it) => ({
      style: it.mark === undefined ? (it.style ?? null) : null,
      weight: it.weight ?? null,
      width: it.width ?? null,
      mark: it.mark === undefined ? null : markName(it.mark),
      text: it.text ?? null,
    })),
  };
}

/** The counts as one record, named by what they count: counts, before or after. */
export function countsText(c: Counts, name = "counts"): string {
  return record(name, { ...c });
}

/** What a change does to the counts: after less before, for each number among them. */
export function delta(before: Counts, after: Counts): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(after)) {
    const was = before[k as keyof Counts];
    if (typeof v === "number" && typeof was === "number") out[k] = v - was;
  }
  return out;
}

/** The delta as one record, a rise signed with +. */
export function deltaText(d: Record<string, number>): string {
  return record(
    "delta",
    Object.fromEntries(Object.entries(d).map(([k, n]) => [k, n > 0 ? `+${n}` : String(n)])),
  );
}

/** The whole drawing as records: the counts, then each box, group and line, then the legend. */
export function drawingText(dr: Drawing): string {
  const out = [countsText(dr.counts)];
  for (const b of dr.boxes) out.push(record("box", { ...b }));
  for (const g of dr.groups) out.push(record("group", { ...g }));
  for (const w of dr.walls) out.push(record("wall", { ...w }));
  for (const x of dr.notes) out.push(record("note", { ...x }));
  for (const l of dr.lines) out.push(record("line", { ...l }));
  for (const x of dr.legend) out.push(record("legend", { ...x }));
  return `${out.join("\n")}\n`;
}
