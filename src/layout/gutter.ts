// One gutter channel (DESIGN.md D11): orders the horizontal runs inside a gutter,
// gives each a row, and places the labels the gutter carries. It sees only the
// visits inside this gutter.
//
// The rows are built so that no two lines and no label touch (D14):
// 1. Two lines that would run on top of each other fix an order: the one that
//    enters from the top ends above the one that enters from the bottom.
// 2. Each label takes the best slot along its run that no line crosses from top to
//    bottom, and that slot fixes an order too: a line that reaches it from above
//    ends above the label, one that reaches it from below starts below it. A label
//    with no such slot tries again wrapped onto two or three lines.
// 3. The runs are ordered for few crossings, within the fixed order.
// 4. Each run, in that order, takes the first row from its earliest one where it
//    and its label touch nothing placed so far. The gutter grows rather than
//    squeezes (D10): the fixed order guarantees such a row further down.
// A label with no free slot at all is returned, so that it can move to another
// gutter of its path. When it has none left, its line takes a detour around the
// crowd (placeDetours), which is always clear.
//
// The runs of one fan-out or fan-in carry the same `bus`: their stubs at one x are
// the shared trunk, one line, and never count against each other.
//
// Vertical positions here are in "row px": row t lies at t * pitch. Assembly turns
// them into absolute y once the gutter's height step is known.

import { ROUTE } from "../theme/geometry.ts";
import type { LabelForm, Visit, VisitLabel } from "./route.ts";

const EPS = 1e-6;
/** Two vertical lines closer than this would read as one. */
const NEAR = 8;
const HARD = 1000;
const LABEL_HIT = 4;
/** Each line inside a label's slot costs the slot as much as this many px of sliding. */
const SLOT_LINE = 8;
/** Each crossing a label's slot forces, by the order it fixes, costs this many px of sliding. */
const SLOT_CROSS = 64;
/** A line on another line weighs more than a line through a label: a free row always avoids it. */
const LINE = 100;
/** Rows a run may go below every run placed so far, besides the height of two labels. */
const SEARCH = 4;

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function inside(x: number, a: number, b: number): boolean {
  return x > a + EPS && x < b - EPS;
}

/** The box a label takes when its run lies on row `row`. */
export function labelBox(
  lab: VisitLabel,
  mode: VisitLabel["mode"],
  x0: number,
  row: number,
  pitch: number,
): Box {
  const y = row * pitch;
  const gap = ROUTE.labelGap;
  const y0 = mode === "above" ? y - gap - lab.h : mode === "below" ? y + gap : y - lab.h / 2;
  return { x0, x1: x0 + lab.w, y0, y1: y0 + lab.h };
}

interface Candidate {
  mode: VisitLabel["mode"];
  x0: number;
  score: number;
}

/**
 * The label slots of a run, best first, from the run alone: centred above it, then
 * slid along it in 4 px steps, then the same below it. A straight vertical line
 * has a slot on each side.
 */
function candidates(v: Visit, lab: VisitLabel): Candidate[] {
  const side = ROUTE.labelGap + 2;
  if (v.hi - v.lo <= EPS) {
    return [
      { mode: "beside", x0: v.lo + side, score: 0 },
      { mode: "beside", x0: v.lo - side - lab.w, score: 1 },
    ];
  }
  const len = v.hi - v.lo;
  const c = (v.lo + v.hi) / 2;
  // Beside the run's ends, level with it: the slots of a run shorter than its label.
  const out: Candidate[] = [
    { mode: "beside", x0: v.hi + side, score: len < lab.w ? -2 : 1000 },
    { mode: "beside", x0: v.lo - side - lab.w, score: len < lab.w ? -1 : 1001 },
  ];
  const touch = Math.min(16, len);
  const reach = Math.max(0, (len + lab.w) / 2 - touch);
  for (const [mode, penalty] of [
    ["above", 0],
    ["below", 24],
  ] as const) {
    for (let d = 0; d <= reach + EPS; d += 4) {
      out.push({ mode, x0: c - lab.w / 2 + d, score: d + penalty });
      if (d > 0) out.push({ mode, x0: c - lab.w / 2 - d, score: d + penalty });
    }
  }
  return out.sort((a, b) => a.score - b.score);
}

/** A label slot, whether a line crosses it, and the order it fixes: [above, below] pairs. */
interface Slot {
  c: Candidate;
  crossed: boolean;
  pairs: [number, number][];
  cost: number;
}

function setForm(lab: VisitLabel, form: LabelForm): void {
  lab.w = form.w;
  lab.h = form.h;
  lab.lines = form.lines;
  lab.maxWidth = form.maxWidth;
}

/** Vertical extent of a stub in row px: a top stub runs from the gutter's top to its row. */
function spanAt(top: boolean, row: number, pitch: number): [number, number] {
  if (row < 0) return [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
  const y = row * pitch;
  return top ? [Number.NEGATIVE_INFINITY, y] : [y, Number.POSITIVE_INFINITY];
}

/** Exact conflicts between lines and labels in one gutter. */
function geometry(pitch: number) {
  const clr = ROUTE.labelClear;
  const sep = ROUTE.runSeparation;
  const space = ROUTE.labelSpace;
  const boxOf = (u: Visit, row: number): Box | undefined => {
    const lab = u.label;
    if (lab === undefined || row < 0) return undefined;
    return labelBox(lab, lab.mode, lab.x0, row, pitch);
  };
  /** Lines of u, on row ru, that touch the box. */
  const hits = (b: Box, u: Visit, ru: number): number => {
    let c = 0;
    for (const s of u.stubs) {
      if (!inside(s.x, b.x0 - clr, b.x1 + clr)) continue;
      const [y0, y1] = spanAt(s.top, ru, pitch);
      if (y0 < b.y1 + clr && b.y0 - clr < y1) c++;
    }
    if (ru >= 0 && u.hi - u.lo > EPS) {
      const y = ru * pitch;
      if (y > b.y0 - clr && y < b.y1 + clr && u.lo < b.x1 + clr && b.x0 - clr < u.hi) c++;
    }
    return c;
  };
  const clash = (p: Box, q: Box) =>
    p.x0 < q.x1 + space && q.x0 < p.x1 + space && p.y0 < q.y1 + clr && q.y0 < p.y1 + clr;
  /** Conflicts between v on row rv with label box bv, and u on row ru with box bu. */
  const pair = (
    v: Visit,
    rv: number,
    bv: Box | undefined,
    u: Visit,
    ru: number,
    bu: Box | undefined,
  ): number => {
    let c = 0;
    if (rv >= 0 && rv === ru && v.hi - v.lo > EPS && u.hi - u.lo > EPS) {
      if (v.lo - sep < u.hi && u.lo < v.hi + sep) c += LINE;
    }
    const oneBus = v.bus !== undefined && v.bus === u.bus;
    for (const s of v.stubs) {
      for (const t of u.stubs) {
        const d = Math.abs(s.x - t.x);
        if (d >= NEAR) continue;
        // The runs of one fan-out or fan-in share their trunk's stub: one line.
        if (oneBus && d < 0.5) continue;
        // Lines that enter from one boundary, or that need no row, are kept apart
        // across by the ports and tracks; only a true overlap counts between them.
        const opposite = s.top !== t.top && rv >= 0 && ru >= 0;
        if (!opposite && d >= 0.5) continue;
        const [p0, p1] = spanAt(s.top, rv, pitch);
        const [q0, q1] = spanAt(t.top, ru, pitch);
        if (Math.min(p1, q1) - Math.max(p0, q0) > EPS) c += LINE;
      }
    }
    if (bu !== undefined) c += hits(bu, v, rv);
    if (bv !== undefined) {
      c += hits(bv, u, ru);
      if (bu !== undefined && clash(bv, bu)) c++;
    }
    return c;
  };
  /** A label that leaves the gutter's top, or crosses its own line. */
  const own = (v: Visit, rv: number, bv: Box): number => {
    let c = bv.y0 < -pitch + 2 - EPS ? 1 : 0;
    for (const s of v.stubs) {
      if (!inside(s.x, bv.x0 - clr, bv.x1 + clr)) continue;
      const [y0, y1] = spanAt(s.top, rv, pitch);
      if (y0 < bv.y1 + clr && bv.y0 - clr < y1) c++;
    }
    return c;
  };
  return { boxOf, pair, own };
}

export interface GutterResult {
  /** Rows the gutter needs, labels included. */
  rows: number;
  /** Edges whose label found no clear slot here, on any number of lines. */
  stranded: string[];
}

/**
 * Orders the runs, gives each a row and places every label. The labels of the
 * edges in `away` take a detour instead (placeDetours).
 */
export function routeGutter(
  all: Visit[],
  pitch: number,
  away: ReadonlySet<string> = new Set(),
): GutterResult {
  const clr = ROUTE.labelClear;
  for (const v of all) {
    v.row = -1;
    delete v.detour;
  }
  const detoured = all
    .filter((v) => v.label !== undefined && away.has(v.label.edgeId) && canDetour(v))
    .sort((a, b) => cmp(a.id, b.id));
  const visits = all.filter((v) => !detoured.includes(v));
  const ranked = visits
    .filter((v) => v.hi - v.lo > EPS || v.label !== undefined)
    .sort((a, b) => cmp(a.id, b.id));
  // Straight lines without a label need no row: they cross the whole gutter.
  const fixed = visits.filter((v) => !ranked.includes(v));
  const n = ranked.length;
  if (n === 0 && detoured.length === 0) return { rows: 0, stranded: [] };
  const index = new Map(ranked.map((v, i) => [v, i]));

  // The fixed order: below[i] holds the runs that must lie below run i.
  const below: Set<number>[] = ranked.map(() => new Set<number>());
  const reaches = (from: number, to: number): boolean => {
    const seen = new Set<number>([from]);
    const stack = [from];
    while (stack.length > 0) {
      const k = stack.pop() as number;
      if (k === to) return true;
      for (const j of below[k] ?? []) {
        if (!seen.has(j)) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
    return false;
  };
  /** Adds every pair (above, below), or none if that would close a cycle. */
  const fix = (pairs: [number, number][]): boolean => {
    const added: [number, number][] = [];
    for (const [a, b] of pairs) {
      if (a === b || below[a]?.has(b)) continue;
      if (reaches(b, a)) {
        for (const [x, y] of added) below[x]?.delete(y);
        return false;
      }
      below[a]?.add(b);
      added.push([a, b]);
    }
    return true;
  };

  // A line entering from the top that meets one entering from the bottom at the
  // same x must end above it. Lines that meet exactly come first, then near ones,
  // so that a cycle of near ones never stops two exact ones from being ordered.
  for (const reach of [0.5, 4, NEAR]) {
    ranked.forEach((a, i) => {
      ranked.forEach((b, j) => {
        if (i === j) return;
        const meet = a.stubs.some(
          (s) => s.top && b.stubs.some((t) => !t.top && Math.abs(s.x - t.x) < reach),
        );
        if (meet) fix([[i, j]]);
      });
    });
  }

  // Label slots. A slot is open if no line crosses it from top to bottom; it then
  // fixes who lies above and below the run. The labels with the fewest open slots
  // choose first, each its best open slot whose order fits the order fixed so far.
  // A label with none tries again wrapped onto more lines, which is narrower.
  const slotsOf = (v: Visit, lab: VisitLabel): Slot[] => {
    const i = index.get(v) ?? 0;
    return candidates(v, lab).map((c) => {
      const x0 = c.x0 - clr;
      const x1 = c.x0 + lab.w + clr;
      const pairs: [number, number][] = [];
      let crossed = false;
      if (c.mode !== "beside") {
        for (const s of v.stubs) {
          if (s.top === (c.mode === "above") && inside(s.x, x0, x1)) crossed = true;
        }
      }
      for (const u of visits) {
        if (u === v || crossed) continue;
        const k = index.get(u);
        const t = u.stubs.some((s) => (s.top || k === undefined) && inside(s.x, x0, x1));
        const b = u.stubs.some((s) => (!s.top || k === undefined) && inside(s.x, x0, x1));
        if ((t && b) || (k === undefined && (t || b))) crossed = true;
        else if (k !== undefined && t) pairs.push([k, i]);
        else if (k !== undefined && b) pairs.push([i, k]);
      }
      // An order the slot fixes against the runs' own preference forces crossings.
      let forced = 0;
      for (const [a, b] of pairs) {
        const above = ranked[a];
        const under = ranked[b];
        if (above === undefined || under === undefined) continue;
        forced += Math.max(0, pairCost(above, under) - pairCost(under, above));
      }
      return { c, crossed, pairs, cost: c.score + SLOT_LINE * pairs.length + SLOT_CROSS * forced };
    });
  };
  const openSlots = (v: Visit, lab: VisitLabel) =>
    slotsOf(v, lab)
      .filter((o) => !o.crossed)
      .sort((a, b) => a.cost - b.cost || a.c.score - b.c.score);
  const labelled = ranked
    .filter((v) => v.label !== undefined)
    .map((v) => ({ v, open: v.label === undefined ? 0 : openSlots(v, v.label).length }))
    .sort((a, b) => a.open - b.open || cmp(a.v.id, b.v.id));
  const stranded = new Set<Visit>();
  for (const { v } of labelled) {
    const lab = v.label;
    if (lab === undefined) continue;
    const one: LabelForm = { w: lab.w, h: lab.h, lines: 1, maxWidth: lab.maxWidth };
    let chosen: Candidate | undefined;
    for (const form of [one, ...(lab.narrower?.() ?? [])]) {
      setForm(lab, form);
      chosen = openSlots(v, lab).find((o) => fix(o.pairs))?.c;
      if (chosen !== undefined) break;
    }
    if (chosen === undefined) {
      setForm(lab, one);
      stranded.add(v);
      chosen = candidates(v, lab)[0];
    }
    if (chosen !== undefined) {
      lab.mode = chosen.mode;
      lab.x0 = chosen.x0;
    }
  }

  // An order with few crossings, within the fixed order.
  const cost: number[][] = ranked.map((a) => ranked.map((b) => (a === b ? 0 : pairCost(a, b))));
  const preferred = orderRuns(cost);
  const rank = new Map(preferred.map((k, p) => [k, p]));
  const incoming = ranked.map(() => 0);
  for (const set of below) for (const j of set) incoming[j] = (incoming[j] ?? 0) + 1;
  const order: number[] = [];
  const ready = new Set<number>();
  incoming.forEach((c, k) => {
    if (c === 0) ready.add(k);
  });
  while (ready.size > 0) {
    let next = -1;
    for (const k of ready) if (next < 0 || (rank.get(k) ?? 0) < (rank.get(next) ?? 0)) next = k;
    ready.delete(next);
    order.push(next);
    for (const j of below[next] ?? []) {
      incoming[j] = (incoming[j] ?? 0) - 1;
      if (incoming[j] === 0) ready.add(j);
    }
  }

  // Rows, in that order: the first clear one from the earliest allowed. Below the
  // deepest run and two of the tallest labels, every row is clear.
  const geo = geometry(pitch);
  const placed: Visit[] = [...fixed];
  let deepest = -1;
  const tallest = Math.max(0, ...ranked.map((v) => v.label?.h ?? 0));
  const search = SEARCH + 2 * Math.ceil((tallest + ROUTE.labelGap + clr) / pitch);
  order.forEach((i, pos) => {
    const v = ranked[i];
    if (v === undefined) return;
    // A self-loop runs two rows deeper, so that its arrowhead has room to turn back: rows
    // count from the row's bottom, which a box reaches since every box takes its row's
    // height (D38).
    let t0 = v.members.some((m) => m.plan.u === m.plan.v) ? 2 : 0;
    for (const k of order.slice(0, pos)) {
      const u = ranked[k];
      if (u === undefined) continue;
      const forced = below[k]?.has(i) === true;
      if (forced || (cost[k]?.[i] ?? 0) !== (cost[i]?.[k] ?? 0)) t0 = Math.max(t0, u.row + 1);
    }
    const lab = v.label;
    const slots: (Candidate | undefined)[] =
      lab !== undefined && stranded.has(v)
        ? candidates(v, lab)
        : [lab === undefined ? undefined : { mode: lab.mode, x0: lab.x0, score: 0 }];
    let best: { t: number; c: number; slot: Candidate | undefined } | undefined;
    for (let t = t0; t <= Math.max(t0, deepest) + search; t++) {
      for (const slot of slots) {
        if (lab !== undefined && slot !== undefined) {
          lab.mode = slot.mode;
          lab.x0 = slot.x0;
        }
        const bv = geo.boxOf(v, t);
        let c = bv === undefined ? 0 : geo.own(v, t, bv);
        for (const u of placed) {
          if (best !== undefined && c >= best.c) break;
          c += geo.pair(v, t, bv, u, u.row, geo.boxOf(u, u.row));
        }
        if (best === undefined || c < best.c) best = { t, c, slot };
        if (c === 0) break;
      }
      if (best?.c === 0) break;
    }
    if (best === undefined) return;
    if (lab !== undefined && best.slot !== undefined) {
      lab.mode = best.slot.mode;
      lab.x0 = best.slot.x0;
    }
    v.row = best.t;
    deepest = Math.max(deepest, best.t);
    placed.push(v);
  });

  placeDetours(detoured, visits, pitch);

  let rows = 0;
  for (const v of [...ranked, ...detoured]) {
    rows = Math.max(rows, v.row + 1, ...(v.detour?.rows ?? []).map((r) => r + 1));
    const lab = v.label;
    if (lab === undefined || v.row < 0) continue;
    const box = labelBox(lab, lab.mode, lab.x0, v.row, pitch);
    rows = Math.max(rows, Math.ceil((box.y1 + 2) / pitch - EPS));
  }
  const strandedIds = [...stranded].flatMap((v) => (v.label === undefined ? [] : [v.label.edgeId]));
  return { rows, stranded: strandedIds };
}

/** A detour serves a run between the two boundaries, a straight line, or a u-turn. */
function canDetour(v: Visit): boolean {
  const tops = v.stubs.filter((s) => s.top).length;
  return v.stubs.length === 2 && (tops === 1 || tops === 2);
}

/**
 * The last resort for a label no slot can hold: its line leaves the crowd. New rows
 * open at the top of the gutter, and everything else moves down. A run between
 * the two boundaries takes the top row from its upper stub and a new bottom row to
 * its lower stub, and the two rows meet in a vertical line outside every other
 * line of the gutter, on the nearer side. A u-turn takes two top rows instead.
 * The label sits beside the far end of the lower row, where nothing else is. Each
 * detour lies outside the ones before it, so they nest without touching.
 */
function placeDetours(detoured: Visit[], visits: Visit[], pitch: number): void {
  const clr = ROUTE.labelClear;
  const side = ROUTE.labelGap + 2;
  const done: Visit[] = [];
  for (const v of detoured) {
    const lab = v.label;
    if (lab === undefined) continue;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = 0;
    let tallest = lab.h;
    const see = (x: number) => {
      if (!Number.isFinite(x)) return;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    };
    const others = [...visits, ...done];
    for (const u of others) {
      for (const s of u.stubs) see(s.x);
      const rs = u.detour?.rows ?? (u.row >= 0 ? [u.row] : []);
      if (u.row >= 0) {
        see(u.lo);
        see(u.hi);
      }
      if (u.detour !== undefined) see(u.detour.x);
      for (const r of rs) maxY = Math.max(maxY, r * pitch);
      const l = u.label;
      if (l !== undefined && u.row >= 0) {
        const b = labelBox(l, l.mode, l.x0, u.row, pitch);
        see(b.x0);
        see(b.x1);
        maxY = Math.max(maxY, b.y1);
        tallest = Math.max(tallest, l.h);
      }
    }
    const xs = v.stubs.map((s) => s.x);
    if (!Number.isFinite(minX)) {
      minX = Math.min(...xs);
      maxX = Math.max(...xs);
    }
    const right = maxX - Math.max(...xs) <= Math.min(...xs) - minX;
    const x = right ? Math.ceil((maxX + 16) / 4) * 4 : Math.floor((minX - 16) / 4) * 4;
    const turn = v.stubs.every((s) => s.top);
    // Room at the top for the new rows, clear of every label below them.
    const shift = Math.ceil((tallest + lab.h + 3 * clr + 4) / pitch) + (turn ? 3 : 1);
    for (const u of others) {
      if (u.row >= 0) u.row += shift;
      if (u.detour !== undefined) u.detour.rows = u.detour.rows.map((r) => r + shift);
    }
    maxY += shift * pitch;
    let rows: number[];
    if (turn) {
      // The stub nearer the turn takes the top row, so the two rows do not cross.
      const near = Math.abs((xs[0] ?? 0) - x) <= Math.abs((xs[1] ?? 0) - x) ? 0 : 1;
      rows = xs.map((_, i) => (i === near ? 0 : 2));
    } else {
      const low = Math.ceil((maxY + lab.h / 2 + 2 * clr + 4) / pitch) + 1;
      rows = v.stubs.map((s) => (s.top ? 0 : low));
    }
    v.detour = { x, rows };
    v.row = Math.max(...rows);
    lab.mode = "beside";
    lab.x0 = right ? x + side : x - side - lab.w;
    done.push(v);
  }
}

/** Crossings and other harm when run a lies above run b. */
function pairCost(a: Visit, b: Visit): number {
  let c = 0;
  for (const s of b.stubs) if (s.top && inside(s.x, a.lo, a.hi)) c += 1;
  for (const s of a.stubs) if (!s.top && inside(s.x, b.lo, b.hi)) c += 1;
  for (const s of a.stubs) {
    if (s.top) continue;
    for (const t of b.stubs) if (t.top && Math.abs(s.x - t.x) < NEAR) c += HARD;
  }
  const clr = ROUTE.labelClear;
  if (a.label !== undefined) {
    const x0 = a.label.x0 - clr;
    const x1 = a.label.x0 + a.label.w + clr;
    for (const s of b.stubs) if (s.top && inside(s.x, x0, x1)) c += LABEL_HIT;
  }
  if (b.label !== undefined) {
    const x0 = b.label.x0 - clr;
    const x1 = b.label.x0 + b.label.w + clr;
    for (const s of a.stubs) if (!s.top && inside(s.x, x0, x1)) c += LABEL_HIT;
  }
  return c;
}

/**
 * A top-to-bottom order of runs with few crossings: start from how many runs each
 * would rather lie above, then move single runs while that lowers the total.
 */
function orderRuns(cost: number[][]): number[] {
  const n = cost.length;
  const c = (i: number, k: number) => cost[i]?.[k] ?? 0;
  const scores = Array.from({ length: n }, (_, i) => {
    let s = 0;
    for (let k = 0; k < n; k++) if (k !== i) s += Math.sign(c(k, i) - c(i, k));
    return s;
  });
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0) || a - b,
  );
  for (let pass = 0; pass < 20; pass++) {
    let improved = false;
    for (let p = 0; p < n; p++) {
      const e = order[p];
      if (e === undefined) continue;
      const rest = order.filter((_, i) => i !== p);
      let f = 0;
      for (const x of rest) f += c(e, x);
      let best = f;
      let bestQ = 0;
      let current = Number.NaN;
      for (let q = 0; q <= rest.length; q++) {
        if (q === p) current = f;
        if (f < best) {
          best = f;
          bestQ = q;
        }
        const x = rest[q];
        if (x !== undefined) f += c(x, e) - c(e, x);
      }
      if (best < current) {
        rest.splice(bestQ, 0, e);
        order.splice(0, n, ...rest);
        improved = true;
      }
    }
    if (!improved) break;
  }
  return order;
}
