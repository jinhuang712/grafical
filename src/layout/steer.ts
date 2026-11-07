// The facts an edge states about its line, met once the lines are drawn (specs/decisions, "An edge is steered by
// facts and never by coordinates"). A fact that cannot hold leaves the line as it was and names itself, which refuses
// the write. Nothing here moves a node or another line.

import type { Edge, EdgeBend } from "../model/types.ts";
import type { Point, Rect, SceneEdge } from "../scene.ts";
import { simplify } from "./route.ts";

export type SteerCode =
  | "via-blocked"
  | "not-straight"
  | "no-trunk"
  | "bend-blocked"
  | "stretch-blocked";

interface World {
  edges: SceneEdge[];
  facts: Map<string, Edge>;
  nodes: Map<string, Rect>;
  /** Nodes and groups by id, for what a line passes. */
  objects: Map<string, Rect>;
}

const EPS = 0.01;
/** How far apart two runs of one axis stay, one track pitch of the tightest density. */
const CLEAR = 12;
const flat = (a: Point, b: Point) => Math.abs(a.y - b.y) < EPS;
const round4 = (n: number) => Math.round(n / 4) * 4;

function hitsRect(a: Point, b: Point, r: Rect): boolean {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return x1 > r.x && x0 < r.x + r.w && y1 > r.y && y0 < r.y + r.h;
}

/** Two runs of one axis that lie on each other. */
function overlaps(a: Point, b: Point, c: Point, d: Point): boolean {
  if (flat(a, b) !== flat(c, d)) return false;
  const along = flat(a, b) ? "x" : "y";
  const across = flat(a, b) ? "y" : "x";
  if (Math.abs(a[across] - c[across]) >= CLEAR) return false;
  const lo = Math.max(Math.min(a[along], b[along]), Math.min(c[along], d[along]));
  const hi = Math.min(Math.max(a[along], b[along]), Math.max(c[along], d[along]));
  return hi - lo > EPS;
}

/** A line clear of every node but its ends, every other line but its kin, every label, and the canvas's edge. */
function clear(w: World, e: SceneEdge, points: Point[], kin: ReadonlySet<string>): boolean {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    if (Math.min(a.x, b.x) < 8 || Math.min(a.y, b.y) < 8) return false;
    for (const [id, r] of w.nodes) {
      if (id === e.from || id === e.to) {
        const inner = { x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 };
        if (hitsRect(a, b, inner)) return false;
      } else if (hitsRect(a, b, r)) return false;
    }
    for (const o of w.edges) {
      if (o.label !== undefined && hitsRect(a, b, o.label.bbox) && o.id !== e.id) return false;
      if (o.id === e.id || kin.has(o.id)) continue;
      for (let k = 1; k < o.points.length; k++) {
        if (overlaps(a, b, o.points[k - 1] as Point, o.points[k] as Point)) return false;
      }
    }
  }
  return true;
}

/** Where a line meets its node: the middle of the side it comes in by. */
function entry(line: Point[], r: Rect, stated: string | undefined): { p: Point; across: boolean } {
  const end = line.at(-1) as Point;
  const side =
    stated ??
    (Math.abs(end.x - r.x) < EPS
      ? "left"
      : Math.abs(end.x - r.x - r.w) < EPS
        ? "right"
        : Math.abs(end.y - r.y) < EPS
          ? "top"
          : "bottom");
  if (side === "left") return { p: { x: r.x, y: r.y + r.h / 2 }, across: true };
  if (side === "right") return { p: { x: r.x + r.w, y: r.y + r.h / 2 }, across: true };
  if (side === "top") return { p: { x: r.x + r.w / 2, y: r.y }, across: false };
  return { p: { x: r.x + r.w / 2, y: r.y + r.h }, across: false };
}

/** A line along a trunk to its own end: the trunk as far as one straight run reaches that end. */
function alongTrunk(
  w: World,
  e: SceneEdge,
  trunk: Point[],
  own: Point[],
  r: Rect,
  stated: string | undefined,
  kin: ReadonlySet<string>,
): Point[] | undefined {
  const { p, across } = entry(own, r, stated);
  for (let i = 1; i < trunk.length; i++) {
    const a = trunk[i - 1] as Point;
    const b = trunk[i] as Point;
    const along = flat(a, b);
    // A run into a side comes square to it, so it leaves a run of the other axis.
    if (along === across) continue;
    const at = across ? p.y : p.x;
    const lo = Math.min(across ? a.y : a.x, across ? b.y : b.x);
    const hi = Math.max(across ? a.y : a.x, across ? b.y : b.x);
    if (at <= lo + EPS || at >= hi - EPS) continue;
    const join = across ? { x: a.x, y: p.y } : { x: p.x, y: a.y };
    const outside =
      stated === "left"
        ? join.x < p.x
        : stated === "right"
          ? join.x > p.x
          : stated === "top"
            ? join.y < p.y
            : stated === "bottom"
              ? join.y > p.y
              : true;
    if (!outside) continue;
    const points = [...trunk.slice(0, i), join, p];
    if (clear(w, e, points, kin)) return points;
  }
  return undefined;
}

/** The trunk's line and this line, both read from the end they share. */
function plugIn(w: World, e: SceneEdge, fact: Edge, trunk: SceneEdge): Point[] | undefined {
  const kin = new Set([trunk.id]);
  for (const o of w.edges) if (w.facts.get(o.id)?.with === trunk.id) kin.add(o.id);
  if (e.label !== undefined || e.step !== undefined) return undefined;
  // With no side stated, the side the line came in by, or the first that reaches the trunk.
  const tries = (stated: string | undefined) =>
    stated !== undefined ? [stated] : [undefined, "left", "right", "top", "bottom"];
  if (e.from === trunk.from) {
    const r = w.nodes.get(e.to);
    if (r === undefined) return undefined;
    for (const side of tries(fact.in)) {
      const line = alongTrunk(w, e, trunk.points, e.points, r, side, kin);
      if (line !== undefined) return line;
    }
    return undefined;
  }
  if (e.to !== trunk.to) return undefined;
  const r = w.nodes.get(e.from);
  if (r === undefined) return undefined;
  const line = [...trunk.points].reverse();
  for (const side of tries(fact.out)) {
    const back = alongTrunk(w, e, line, [...e.points].reverse(), r, side, kin);
    if (back !== undefined) return back.reverse();
  }
  return undefined;
}

/** The longest inner run whose neighbours lie apart (a turn to slide) or together (a detour to reach). */
function innerRun(points: Point[], apart: boolean): number | undefined {
  let best: number | undefined;
  let longest = -1;
  for (let i = 1; i + 2 < points.length; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const axis = flat(a, b) ? "y" : "x";
    const before = (points[i - 1] as Point)[axis] - a[axis];
    const after = (points[i + 2] as Point)[axis] - a[axis];
    if (before * after < 0 !== apart) continue;
    const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (length > longest) {
      longest = length;
      best = i;
    }
  }
  return best;
}

function moved(points: Point[], i: number, to: number): Point[] {
  const axis = flat(points[i] as Point, points[i + 1] as Point) ? "y" : "x";
  return points.map((p, k) => (k === i || k === i + 1 ? { ...p, [axis]: to } : p));
}

function bent(w: World, e: SceneEdge, at: EdgeBend): Point[] | undefined {
  if (e.label !== undefined || e.step !== undefined) return undefined;
  const points = simplify(e.points);
  const i = innerRun(points, true);
  if (i === undefined) return undefined;
  const axis = flat(points[i] as Point, points[i + 1] as Point) ? "y" : "x";
  const from = (points[i - 1] as Point)[axis];
  const to = (points[i + 2] as Point)[axis];
  const line = moved(points, i, round4(from + (to - from) * at));
  return clear(w, e, line, new Set()) ? line : undefined;
}

function stretched(w: World, e: SceneEdge, magnified: number): Point[] | undefined {
  if (e.label !== undefined || e.step !== undefined) return undefined;
  const points = simplify(e.points);
  const i = innerRun(points, false);
  if (i === undefined) return undefined;
  const axis = flat(points[i] as Point, points[i + 1] as Point) ? "y" : "x";
  const at = (points[i] as Point)[axis];
  const near = [(points[i - 1] as Point)[axis] - at, (points[i + 2] as Point)[axis] - at];
  const reach = Math.min(...near.map(Math.abs));
  const outward = (near[0] as number) > 0 ? -1 : 1;
  const line = moved(points, i, round4(at + outward * reach * (magnified - 1)));
  return clear(w, e, line, new Set()) ? line : undefined;
}

/** Whether a line passes an object on a side: wherever it lies level with the object. */
function passes(points: Point[], r: Rect, side: "left" | "right"): boolean {
  let level = false;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    if (Math.max(a.y, b.y) <= r.y || Math.min(a.y, b.y) >= r.y + r.h) continue;
    level = true;
    const x = side === "left" ? Math.max(a.x, b.x) : Math.min(a.x, b.x);
    if (side === "left" ? x > r.x : x < r.x + r.w) return false;
  }
  return level;
}

/** Meets each edge's facts in place, and names on the edge any that could not hold. */
export function steerEdges(w: World): void {
  const byId = new Map(w.edges.map((e) => [e.id, e]));
  const refuse = (e: SceneEdge, code: SteerCode) => {
    e.refused = [...(e.refused ?? []), code];
  };
  const done = new Set<string>();
  const follow = (e: SceneEdge) => {
    if (done.has(e.id)) return;
    done.add(e.id);
    const fact = w.facts.get(e.id);
    if (fact?.with === undefined) return;
    const trunk = byId.get(fact.with);
    if (trunk === undefined) return;
    follow(trunk);
    const line = plugIn(w, e, fact, trunk);
    if (line === undefined) refuse(e, "no-trunk");
    else {
      e.points = line;
      delete e.unmet;
    }
  };
  for (const e of w.edges) follow(e);
  for (const e of w.edges) {
    const fact = w.facts.get(e.id);
    if (fact === undefined) continue;
    if (fact.bendAt !== undefined) {
      const line = bent(w, e, fact.bendAt);
      if (line === undefined) refuse(e, "bend-blocked");
      else e.points = line;
    }
    if (fact.stretch !== undefined) {
      const line = stretched(w, e, fact.stretch);
      if (line === undefined) refuse(e, "stretch-blocked");
      else e.points = line;
    }
    if (fact.straight === true && simplify(e.points).length > 2) refuse(e, "not-straight");
    if (fact.via !== undefined) {
      const r = w.objects.get(fact.via.object);
      if (r === undefined || !passes(e.points, r, fact.via.side)) refuse(e, "via-blocked");
    }
  }
}
