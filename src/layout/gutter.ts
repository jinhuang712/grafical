// One gutter channel (DESIGN.md D11): orders the horizontal runs inside a gutter,
// gives each a row, and places the labels the gutter carries. It sees only the
// visits inside this gutter.
//
// Vertical positions here are in "row px": row t lies at t * pitch. Assembly turns
// them into absolute y once the gutter's height step is known.

import { ROUTE } from "../theme/geometry.ts";
import type { Visit, VisitLabel } from "./route.ts";

const EPS = 1e-6;
/** Two vertical lines closer than this would read as one. */
const NEAR = 8;
const HARD = 1000;
const LABEL_HIT = 4;
/** How many rows below its earliest one a labelled run may go to find a clear slot. */
const LOOK_ROWS = 4;

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
      { mode: "beside", x0: v.lo + side },
      { mode: "beside", x0: v.lo - side - lab.w },
    ];
  }
  const len = v.hi - v.lo;
  const c = (v.lo + v.hi) / 2;
  // Beside the run's ends, level with it: the slots of a run shorter than its label.
  const beside: (Candidate & { score: number })[] = [
    { mode: "beside", x0: v.hi + side, score: len < lab.w ? -2 : 1000 },
    { mode: "beside", x0: v.lo - side - lab.w, score: len < lab.w ? -1 : 1001 },
  ];
  const touch = Math.min(16, len);
  const reach = Math.max(0, (len + lab.w) / 2 - touch);
  const out: (Candidate & { score: number })[] = [...beside];
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

/** Vertical extent of a stub in row px: a top stub runs from the gutter's top to its row. */
function stubSpan(v: Visit, top: boolean, pitch: number): [number, number] {
  if (v.row < 0) return [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
  const y = v.row * pitch;
  return top ? [Number.NEGATIVE_INFINITY, y] : [y, Number.POSITIVE_INFINITY];
}

/**
 * Orders the runs, gives each a row and places every label. Returns the rows the
 * gutter needs.
 */
export function routeGutter(visits: Visit[], pitch: number): number {
  const clr = ROUTE.labelClear;
  // Lines that cross every row of the gutter, or nearly so.
  const through = visits
    .filter((v) => v.hi - v.lo < ROUTE.runSeparation && v.label === undefined)
    .flatMap((v) => v.stubs.map((s) => s.x));

  // Each label starts in its best slot that is clear of its own lines and of the
  // straight lines through this gutter.
  for (const v of visits) {
    const lab = v.label;
    if (lab === undefined) continue;
    const own = (mode: VisitLabel["mode"]) =>
      v.stubs.filter((s) => mode === "beside" || s.top === (mode === "above")).map((s) => s.x);
    const ok = (c: Candidate) =>
      [...own(c.mode), ...through].every((x) => !inside(x, c.x0 - clr, c.x0 + lab.w + clr));
    const best = candidates(v, lab).find(ok) ?? candidates(v, lab)[0];
    if (best !== undefined) {
      lab.mode = best.mode;
      lab.x0 = best.x0;
    }
  }

  const ranked = visits
    .filter((v) => v.hi - v.lo > EPS || v.label !== undefined)
    .sort((a, b) => cmp(a.id, b.id));
  const n = ranked.length;
  if (n === 0) return 0;
  const cost: number[][] = ranked.map((a) => ranked.map((b) => (a === b ? 0 : pairCost(a, b))));
  const order = orderRuns(cost);

  const runs = new Map<number, { a: number; b: number; v: Visit }[]>();
  const labels: { box: Box; v: Visit }[] = [];
  const sep = ROUTE.runSeparation;
  // Two labels side by side would read as one phrase, so they keep more room across.
  const space = ROUTE.labelSpace;
  const overlaps = (p: Box, q: Box) =>
    p.x0 < q.x1 + space && q.x0 < p.x1 + space && p.y0 < q.y1 + clr && q.y0 < p.y1 + clr;
  const runFits = (v: Visit, t: number) => {
    const y = t * pitch;
    if ((runs.get(t) ?? []).some((r) => v.lo - sep < r.b && r.a < v.hi + sep)) return false;
    return !labels.some(
      (l) =>
        l.v !== v &&
        y > l.box.y0 - clr &&
        y < l.box.y1 + clr &&
        v.lo < l.box.x1 + clr &&
        l.box.x0 - clr < v.hi,
    );
  };
  const labelFits = (v: Visit, box: Box) => {
    if (box.y0 < -pitch + 2) return false;
    if (labels.some((l) => l.v !== v && overlaps(box, l.box))) return false;
    for (const [t, list] of runs) {
      const y = t * pitch;
      if (!(y > box.y0 - clr && y < box.y1 + clr)) continue;
      if (list.some((r) => r.v !== v && r.a < box.x1 + clr && box.x0 - clr < r.b)) return false;
    }
    return true;
  };

  type Placed = { x: number; span: [number, number] };
  const spans = (u: Visit): Placed[] =>
    u.stubs.map((s) => ({ x: s.x, span: stubSpan(u, s.top, pitch) }));
  const hitBy = (box: Box, list: Placed[]) =>
    list.some(
      (s) =>
        inside(s.x, box.x0 - clr, box.x1 + clr) &&
        s.span[0] < box.y1 + clr &&
        box.y0 - clr < s.span[1],
    );
  // Lines that need no row are known from the start; the others once placed.
  const placed: Placed[] = visits.filter((u) => !ranked.includes(u)).flatMap(spans);

  const rowOf = new Map<Visit, number>();
  const commit = (v: Visit, t: number, box: Box | undefined) => {
    if (v.hi - v.lo > EPS) {
      const list = runs.get(t);
      const r = { a: v.lo, b: v.hi, v };
      if (list === undefined) runs.set(t, [r]);
      else list.push(r);
    }
    if (box !== undefined) labels.push({ box, v });
    rowOf.set(v, t);
    v.row = t;
    placed.push(...spans(v));
  };
  const crossesLabels = (v: Visit, t: number) => {
    v.row = t;
    const own = spans(v);
    return labels.some((l) => l.v !== v && hitBy(l.box, own));
  };

  // A straight line's label sits beside it on the first row, on a side that no
  // other line reaches from the top, so that it moves only with its own line.
  for (const v of ranked) {
    const lab = v.label;
    if (lab === undefined || v.hi - v.lo > EPS) continue;
    const others = visits
      .filter((u) => u !== v)
      .flatMap((u) => u.stubs.filter((s) => s.top).map((s) => s.x));
    for (const c of candidates(v, lab)) {
      if ([...others, ...through].some((x) => inside(x, c.x0 - clr, c.x0 + lab.w + clr))) continue;
      v.row = 0;
      const b = labelBox(lab, c.mode, c.x0, 0, pitch);
      if (!labelFits(v, b) || hitBy(b, placed)) continue;
      lab.mode = c.mode;
      lab.x0 = c.x0;
      commit(v, 0, b);
      break;
    }
    if (!rowOf.has(v)) v.row = -1;
  }

  order.forEach((i, pos) => {
    const v = ranked[i];
    if (v === undefined || rowOf.has(v)) return;
    let t0 = 0;
    for (const k of order.slice(0, pos)) {
      const u = ranked[k];
      const r = u === undefined ? undefined : rowOf.get(u);
      if (r !== undefined && (cost[k]?.[i] ?? 0) !== (cost[i]?.[k] ?? 0)) t0 = Math.max(t0, r + 1);
    }
    const lab = v.label;
    let chosen: { t: number; box?: Box; c?: Candidate } | undefined;
    if (lab !== undefined) {
      // The run moves down a few rows to keep its label in its own first slot,
      // before the label tries another slot.
      const tryRows = (slots: Candidate[]) => {
        for (let r = t0; r < t0 + LOOK_ROWS; r++) {
          if (!runFits(v, r) || crossesLabels(v, r)) continue;
          const own = spans(v);
          for (const c of slots) {
            const b = labelBox(lab, c.mode, c.x0, r, pitch);
            if (labelFits(v, b) && !hitBy(b, placed) && !hitBy(b, own)) return { t: r, box: b, c };
          }
        }
        return undefined;
      };
      chosen = tryRows([{ mode: lab.mode, x0: lab.x0 }]) ?? tryRows(candidates(v, lab));
      if (chosen === undefined) {
        for (let t = t0; ; t++) {
          const b = labelBox(lab, lab.mode, lab.x0, t, pitch);
          if (runFits(v, t) && labelFits(v, b)) {
            chosen = { t, box: b };
            break;
          }
        }
      }
    } else {
      // A run goes down a few rows rather than cross a label with its stubs.
      for (let r = t0; r < t0 + LOOK_ROWS && chosen === undefined; r++) {
        if (runFits(v, r) && !crossesLabels(v, r)) chosen = { t: r };
      }
      if (chosen === undefined) {
        let t = t0;
        while (!runFits(v, t)) t++;
        chosen = { t };
      }
    }
    if (lab !== undefined && chosen.c !== undefined) {
      lab.mode = chosen.c.mode;
      lab.x0 = chosen.c.x0;
    }
    commit(v, chosen.t, chosen.box);
  });

  // A label that a stub placed after it still crosses moves to its next slot that is
  // clear of everything in the gutter. If there is none, it stays, and the checker
  // reports the collision.
  const hit = (box: Box) => hitBy(box, placed);
  for (const l of labels) {
    const lab = l.v.label;
    if (lab === undefined || !hit(l.box)) continue;
    for (const c of candidates(l.v, lab)) {
      const box = labelBox(lab, c.mode, c.x0, l.v.row, pitch);
      if (!hit(box) && labelFits(l.v, box)) {
        lab.mode = c.mode;
        lab.x0 = c.x0;
        l.box = box;
        break;
      }
    }
  }

  let rows = 0;
  for (const v of ranked) rows = Math.max(rows, v.row + 1);
  for (const l of labels) rows = Math.max(rows, Math.ceil((l.box.y1 + 2) / pitch - EPS));
  return rows;
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
