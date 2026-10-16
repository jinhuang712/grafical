// Step badges (DESIGN.md, "Step badges ride the line"): a line's number sits in a small ring centred on the line,
// under the start of its label's text, which stands off the line past it. The router
// gives the slot room for both, as it does for any label, and keeps the badge's end of
// the slot over a straight part of the line. A badge that the slot still leaves
// touching something slides along its line to the nearest clear place.

import { type Segment, segmentsOf, toBorder, toRect, toSegment } from "../check/geometry.ts";
import type { Point, Rect, SceneBadge, SceneEdge } from "../scene.ts";
import { ROUTE, STEP } from "../theme/geometry.ts";

/** The square a badge takes. */
export function badgeRect(b: SceneBadge): Rect {
  return { x: b.x - b.r, y: b.y - b.r, w: 2 * b.r, h: 2 * b.r };
}

/** How far each arrowhead of a line reaches along it, 0 where it has none. */
export interface Heads {
  start: number;
  end: number;
}

/** Which ends of a line meet a group, a row or a lane it ends at, at its border. */
export interface Inside {
  start: boolean;
  end: boolean;
}

/**
 * The span along part i of a line, from points[i] to points[i + 1], where a whole
 * badge lies on that part, clear of an arrowhead at the line's ends. Empty when lo > hi.
 */
function span(points: Point[], i: number, heads: Heads): [number, number] {
  const a = points[i] as Point;
  const b = points[i + 1] as Point;
  const [p, q] = a.y === b.y ? [a.x, b.x] : [a.y, b.y];
  const r = STEP.r;
  const atP = i === 0 && heads.start > 0 ? heads.start + STEP.arrowClear : 0;
  const atQ = i === points.length - 2 && heads.end > 0 ? heads.end + STEP.arrowClear : 0;
  return p <= q ? [p + r + atP, q - r - atQ] : [q + r + atQ, p - r - atP];
}

/** The stretch of a line each of its arrowheads covers: from the tip back along the line. */
export function arrowheads(points: Point[], heads: Heads): Segment[] {
  const out: Segment[] = [];
  const back = (tip: Point, next: Point, len: number) => {
    const d = Math.abs(next.x - tip.x) + Math.abs(next.y - tip.y);
    const t = d === 0 ? 0 : Math.min(len, d) / d;
    out.push({ a: tip, b: { x: tip.x + (next.x - tip.x) * t, y: tip.y + (next.y - tip.y) * t } });
  };
  const n = points.length;
  if (heads.start > 0 && n > 1) back(points[0] as Point, points[1] as Point, heads.start);
  if (heads.end > 0 && n > 1) back(points[n - 1] as Point, points[n - 2] as Point, heads.end);
  return out;
}

export interface StepPlace {
  /** The badge's centre, on the line. */
  at: Point;
  /** The top left of the label's text. */
  text: Point;
}

/** How far a slot may sit from its line and still be beside it: a beside slot keeps labelGap + 2. */
const NEAR = ROUTE.labelGap + 2.5;
const EPS = 0.01;

/**
 * Where a step's badge goes on its line, and where its label's text then goes. `slot` is
 * the label's box as the router placed it, the badge's room included; `text` the
 * text's size, 0 wide for none. Along a run the badge sits under the start of the text,
 * or under its end where the start is off the run, and the text stands off the line
 * past it; beside a line up or down, the badge sits on the line level with the text.
 */
export function stepPlace(
  points: Point[],
  slot: Rect,
  text: { w: number; h: number },
  heads: Heads,
  inside: Inside,
): StepPlace {
  const r = STEP.r;
  const last = points.length - 2;
  const within = (v: number, [lo, hi]: [number, number]) => v >= lo - EPS && v <= hi + EPS;
  const gap = r + STEP.gap;

  // A run the slot lies above or below first: a slot that hangs past a run's end may
  // also lie beside the line's next part.
  for (let i = 0; i <= last; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    if (a.y !== b.y) continue;
    const above = slot.y + slot.h <= a.y + EPS && a.y - (slot.y + slot.h) <= NEAR;
    const below = slot.y >= a.y - EPS && slot.y - a.y <= NEAR;
    if (!above && !below) continue;
    const y = above ? slot.y : slot.y + slot.h - text.h;
    const s = span(points, i, heads);
    const lead = slot.x + r;
    if (within(lead, s)) return { at: { x: lead, y: a.y }, text: { x: lead, y } };
    const trail = slot.x + slot.w - r;
    if (within(trail, s)) return { at: { x: trail, y: a.y }, text: { x: trail - text.w, y } };
  }
  for (let i = 0; i <= last; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    if (a.x !== b.x) continue;
    const right = slot.x >= a.x - EPS && slot.x - a.x <= NEAR;
    const left = slot.x + slot.w <= a.x + EPS && a.x - (slot.x + slot.w) <= NEAR;
    if (!right && !left) continue;
    // Level with the text, or slid along the line past an arrowhead while still beside it.
    const mid = slot.y + slot.h / 2;
    const [lo, hi] = span(points, i, heads);
    if (lo > hi + EPS) continue;
    const y = Math.min(Math.max(mid, lo), hi);
    if (Math.abs(y - mid) > slot.h / 2) continue;
    const x = right ? a.x + gap : a.x - gap - text.w;
    return { at: { x: a.x, y }, text: { x, y: mid - text.h / 2 } };
  }

  // Beside the end of a run shorter than the badge, or a detour's corner, where the
  // router kept room for it: on the line where it comes nearest the slot, a corner as
  // like as not, clear of the arrowheads. The text stands beside it, in the slot.
  const centre = { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 };
  const tips = arrowheads(points, heads);
  const beside = (p: Point): StepPlace => {
    const x =
      p.x <= centre.x
        ? Math.max(slot.x, p.x + gap)
        : Math.min(slot.x + slot.w - text.w, p.x - gap - text.w);
    return { at: p, text: { x, y: centre.y - text.h / 2 } };
  };
  let best: Point | undefined;
  let dist = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= last; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const p = {
      x: Math.min(Math.max(centre.x, Math.min(a.x, b.x)), Math.max(a.x, b.x)),
      y: Math.min(Math.max(centre.y, Math.min(a.y, b.y)), Math.max(a.y, b.y)),
    };
    const d = Math.max(
      slot.x - p.x,
      p.x - (slot.x + slot.w),
      slot.y - p.y,
      p.y - (slot.y + slot.h),
    );
    if (d > NEAR || d >= dist) continue;
    if (tips.some((s) => toSegment(p, s) < r + STEP.arrowClear - EPS)) continue;
    dist = d;
    best = p;
  }
  if (best !== undefined) return beside(best);

  // Elsewhere on a part the badge lies on whole, nearest the slot's start.
  const lead = { x: slot.x + r, y: centre.y };
  for (let i = 0; i <= last; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const across = a.y === b.y;
    const [lo, hi] = span(points, i, heads);
    if (lo > hi + EPS) continue;
    const along = Math.min(Math.max(across ? lead.x : lead.y, lo), hi);
    const p = across ? { x: along, y: a.y } : { x: a.x, y: along };
    const d = Math.abs(p.x - lead.x) + Math.abs(p.y - lead.y);
    if (d < dist - EPS) {
      dist = d;
      best = p;
    }
  }
  if (best !== undefined) return beside(best);

  // A line too short for the badge: where it meets a group, a row or a lane it ends at,
  // on its way into the container, past its arrowhead there and clear of the other end.
  const into =
    inside.start && (heads.start === 0 || !inside.end) ? "start" : inside.end ? "end" : undefined;
  if (into !== undefined) {
    const p = (into === "start" ? points[0] : points[last + 1]) as Point;
    const q = (into === "start" ? points[1] : points[last]) as Point;
    const len = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
    const ownHead = into === "start" ? heads.start : heads.end;
    const farHead = last > 0 ? 0 : into === "start" ? heads.end : heads.start;
    const far = farHead > 0 ? farHead + STEP.arrowClear : STEP.clear;
    const t = ownHead > 0 ? -(r + STEP.arrowClear) : Math.min(len / 2, len - far - r);
    return beside({ x: p.x + Math.sign(q.x - p.x) * t, y: p.y + Math.sign(q.y - p.y) * t });
  }
  // Else on the line where it comes nearest the slot's start.
  for (let i = 0; i <= last; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const p = {
      x: Math.min(Math.max(lead.x, Math.min(a.x, b.x)), Math.max(a.x, b.x)),
      y: Math.min(Math.max(lead.y, Math.min(a.y, b.y)), Math.max(a.y, b.y)),
    };
    const d = Math.abs(p.x - lead.x) + Math.abs(p.y - lead.y);
    if (d < dist - EPS) {
      dist = d;
      best = p;
    }
  }
  return beside(best ?? (points[0] as Point));
}

/** What every badge keeps clear of, besides the lines, labels and badges of the edges. */
export interface BadgeRoom {
  /** Boxes, texts, marks and every other solid thing. */
  solid: Rect[];
  /** Lines that are not edges, such as a labelled wall's divider. */
  lines: Segment[];
  /** Areas whose border is drawn as a line: groups and bands. */
  borders: { id: string; rect: Rect }[];
  heads: (e: SceneEdge) => Heads;
  inside: (e: SceneEdge) => Inside;
}

/** Step between the places a badge tries along its line. */
const SLIDE = 2;
/** The places along each line two badges try together, nearest first. */
const PAIR = 40;

/**
 * Moves each badge that touches something along its own line, to the clear place
 * nearest to where its label's slot put it. A badge with no clear place stays.
 */
export function settleBadges(edges: SceneEdge[], room: BadgeRoom): void {
  const free = (e: SceneEdge, c: Point, r: number): boolean => {
    const need = r + STEP.clear;
    if (room.solid.some((b) => toRect(c, b) < need)) return false;
    // A line that ends at a group or a band meets its border there.
    const own = (id: string) => id === e.from || id === e.to;
    if (room.borders.some((b) => !own(b.id) && toBorder(c, b.rect) < need)) return false;
    if (room.lines.some((s) => toSegment(c, s) < need)) return false;
    if (e.label !== undefined && toRect(c, e.label.bbox) < need) return false;
    for (const o of edges) {
      if (o === e) continue;
      if (o.label !== undefined && toRect(c, o.label.bbox) < need) return false;
      if (o.step !== undefined && Math.hypot(o.step.x - c.x, o.step.y - c.y) < need + o.step.r)
        return false;
      if (segmentsOf(o.points).some((s) => toSegment(c, s) < need)) return false;
    }
    return !arrowheads(e.points, room.heads(e)).some((s) => toSegment(c, s) < need);
  };

  /**
   * Every place where the whole badge lies on a straight part of the line, or on its way
   * into a group, a row or a lane it ends at, nearest to where it sits now first.
   */
  const spotsOf = (e: SceneEdge, b: SceneBadge): Point[] => {
    const heads = room.heads(e);
    const pts = e.points;
    const spots: { p: Point; d: number }[] = [];
    let start = 0;
    let now = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i] as Point;
      const q = pts[i + 1] as Point;
      const len = Math.abs(q.x - a.x) + Math.abs(q.y - a.y);
      const across = a.y === q.y;
      const on = across
        ? Math.abs(b.y - a.y) < EPS &&
          b.x >= Math.min(a.x, q.x) - EPS &&
          b.x <= Math.max(a.x, q.x) + EPS
        : Math.abs(b.x - a.x) < EPS &&
          b.y >= Math.min(a.y, q.y) - EPS &&
          b.y <= Math.max(a.y, q.y) + EPS;
      if (on) now = start + Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      const [lo, hi] = span(pts, i, heads);
      for (let t = lo; t <= hi + EPS; t += SLIDE) {
        const p = across ? { x: t, y: a.y } : { x: a.x, y: t };
        spots.push({ p, d: start + Math.abs(p.x - a.x) + Math.abs(p.y - a.y) });
      }
      start += len;
    }
    const into = (p: Point, q: Point, from: number, sign: number) => {
      for (let t = 0; t <= 3 * STEP.r; t += SLIDE) {
        const at = { x: p.x + Math.sign(p.x - q.x) * t, y: p.y + Math.sign(p.y - q.y) * t };
        spots.push({ p: at, d: from + sign * t });
      }
    };
    const inside = room.inside(e);
    const n = pts.length;
    if (inside.start && n > 1) into(pts[0] as Point, pts[1] as Point, 0, -1);
    if (inside.end && n > 1) into(pts[n - 1] as Point, pts[n - 2] as Point, start, 1);
    if (spots.length > 0 && !spots.some((s) => Math.abs(s.d - now) < EPS)) {
      // A badge off every straight part, as beside a short run's end, measures from the
      // part nearest it.
      now = spots.reduce((u, s) =>
        Math.hypot(s.p.x - b.x, s.p.y - b.y) < Math.hypot(u.p.x - b.x, u.p.y - b.y) ? s : u,
      ).d;
    }
    spots.sort((u, v) => Math.abs(u.d - now) - Math.abs(v.d - now) || u.d - v.d);
    return spots.map((s) => s.p);
  };
  const put = (e: SceneEdge, b: SceneBadge, p: Point) => {
    e.step = moved(b, p.x - b.x, p.y - b.y);
  };

  const stuck: SceneEdge[] = [];
  for (const e of edges) {
    const b = e.step;
    if (b === undefined || free(e, b, b.r)) continue;
    const to = spotsOf(e, b).find((p) => free(e, p, b.r));
    if (to === undefined) stuck.push(e);
    else put(e, b, to);
  }
  // Two badges that leave each other no place alone, as on two lines between the same
  // neighbours, move together.
  for (const e of stuck) {
    const b = e.step;
    if (b === undefined || free(e, b, b.r)) continue;
    const near = edges.filter(
      (o) =>
        o !== e &&
        o.step !== undefined &&
        Math.hypot(o.step.x - b.x, o.step.y - b.y) < b.r + o.step.r + 2 * STEP.clear + 4 * STEP.r,
    );
    for (const o of near) {
      const c = o.step as SceneBadge;
      const ps = spotsOf(e, b).slice(0, PAIR);
      const qs = spotsOf(o, c).slice(0, PAIR);
      const pair = (() => {
        for (const p of ps) {
          for (const q of qs) {
            put(e, b, p);
            put(o, c, q);
            if (free(e, p, b.r) && free(o, q, c.r)) return true;
          }
        }
        e.step = b;
        o.step = c;
        return false;
      })();
      if (pair) break;
    }
  }
}

function moved(b: SceneBadge, dx: number, dy: number): SceneBadge {
  return {
    x: b.x + dx,
    y: b.y + dy,
    r: b.r,
    label: {
      role: b.label.role,
      runs: b.label.runs.map((r) => ({ ...r, x: r.x + dx, y: r.y + dy })),
      bbox: { ...b.label.bbox, x: b.label.bbox.x + dx, y: b.label.bbox.y + dy },
    },
  };
}
