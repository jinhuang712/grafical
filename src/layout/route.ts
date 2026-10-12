// The gap router (DESIGN.md D11): orthogonal routes through the gutters between
// layers and the gaps between neighbouring nodes, never through a node.
//
// It works in three passes, so that a change spreads to another channel only
// through edges that use both:
// 1. Path: each edge's sides, gutters and gaps depend on the placement and on the
//    edge itself. Only a full gap sends an edge to its next best gap.
// 2. Channels: each gap places its vertical tracks, each node side its ports and
//    each gutter its rows and labels, from the edges inside that channel and from
//    keys that come from the placement. The ports of a gutter's lower boundary keep
//    clear of the stubs on its upper boundary, and the upper ports of the gap
//    tracks below, so that two lines of a gutter never share an x.
// 3. Assembly: each route is built from its ports, gap tracks and rows.
//
// Everything here is across only, in x relative to the centre line. Gutter rows are
// counted here; their heights and every y come later, in assembly.
//
// For the target look (D25): edges between neighbours run straight sideways
// (side.ts); every line meets its node side at a port of its own, unless the side
// has more lines than room, where unlabelled edges of one kind that leave it share
// a trunk and those that arrive at it share a port (D33); a path that skips rows
// takes one corridor, an x that is free in every row it passes; and no vertical
// line passes a group's label or the label of a sideways edge.

import type { Edge } from "../model/types.ts";
import type { Point, Rect } from "../scene.ts";
import { ROUTE } from "../theme/geometry.ts";
import { lineStyle } from "../theme/paint.ts";
import { portInset } from "../theme/shapes.ts";
import { routeGutter } from "./gutter.ts";
import { centreX, type PLayer, type PNode } from "./place.ts";
import type { SideSlot } from "./side.ts";

/** What the router must keep clear of, from placement. */
export interface RouteExtra {
  /** Edges that run straight sideways between neighbours, and their lines. */
  sideways: Map<string, SideSlot>;
  /** x spans no vertical line may take where it enters a layer from above: group labels. */
  forbidTop: Map<number, [number, number][]>;
  /** x spans no track may take in a gap, by `${layer}:${k}`: labels of sideways edges. */
  forbidGap: Map<string, [number, number][]>;
  /** Left end of the label of each sideways edge that has one. */
  sideLabelX: Map<string, number>;
  /** Edges routed to a stand-in for a container (D28): they never share a port or trunk. */
  alone: Set<string>;
  /**
   * Edges that never leave by a side: those to a column lane (D32), whose border
   * runs the whole height and would leave a side exit only a stub.
   */
  noSideExit: Set<string>;
}

const NO_EXTRA: RouteExtra = {
  sideways: new Map(),
  forbidTop: new Map(),
  forbidGap: new Map(),
  sideLabelX: new Map(),
  alone: new Set(),
  noSideExit: new Set(),
};

export type Side = "top" | "bottom" | "left" | "right";

/**
 * down: to a lower layer. up: to a higher layer. uturn: within one layer through the
 * gutter below it, and every self-loop. neighbour: straight across the gap between
 * two neighbours.
 */
export type PlanKind = "down" | "up" | "uturn" | "neighbour";

export interface LabelBox {
  w: number;
  h: number;
  /** The label wrapped onto more lines, narrower: asked for only when it does not fit on one. */
  narrower?: () => LabelForm[];
}

/** One way to set a label: its box, its lines, and the width it wraps at. */
export interface LabelForm {
  w: number;
  h: number;
  lines: number;
  maxWidth: number;
}

/** The space beside node k of a layer, where vertical tracks may run. */
export interface Gap {
  layer: number;
  /** The gap left of node k. k equal to the node count is the gap after the last node. */
  k: number;
  /** Usable range for tracks. Outer gaps are open on their outer side. */
  lo: number;
  hi: number;
  /** Spans inside the range that no track may take. */
  forbid: [number, number][];
}

export interface Plan {
  edge: Edge;
  u: PNode;
  v: PNode;
  kind: PlanKind;
  srcSide: Side;
  dstSide: Side;
  /** Gutters in path order. Gutter i lies below layer i. */
  gutters: number[];
  /** Layers the path crosses between its ends, in path order. */
  between: number[];
  /** gaps[j] lies in between[j], between gutters[j] and gutters[j + 1]. */
  gaps: Gap[];
  /** Placement-only x of every waypoint: the source, each gap, the target. */
  ideal: number[];
  /** x of a port on a top or bottom side, or the y offset from the row's middle on a left or right side. */
  srcPort: number;
  dstPort: number;
  gapX: number[];
  /** The visit of each gutter in path order. */
  visits: Visit[];
  label: LabelBox | undefined;
  /** Index into gutters of the gutter that carries the label. */
  labelAt: number;
  /** The fan-out this edge leaves by: one port and one trunk. */
  bus: Bus | undefined;
  /** The fan-in this edge arrives by: one port, each line joining it on its own row. */
  fanIn: Bus | undefined;
  /** Where a sideways edge runs. */
  side: SideSlot | undefined;
  /** The label of a sideways edge, in its row beside its line. */
  sideLabel: { x0: number; w: number; h: number } | undefined;
  /**
   * A side exit: the line leaves its source's left or right side at the middle of
   * the row, and turns at this x into its target. Undefined for every other edge.
   */
  turn: number | undefined;
  /**
   * A side entry (D33): the line leaves its source's top or bottom at this x, runs
   * straight to the target's row, and turns into its left or right side at the
   * middle of the row. Undefined for every other edge.
   */
  turnIn: number | undefined;
}

interface Bus {
  id: string;
  members: Plan[];
  port: number;
}

export interface Stub {
  x: number;
  /** Enters the gutter from its top boundary, or from its bottom one. */
  top: boolean;
}

/** One horizontal run in one gutter, shared by the members of a bus. */
export interface Visit {
  id: string;
  gutter: number;
  members: { plan: Plan; j: number }[];
  stubs: Stub[];
  lo: number;
  hi: number;
  label: VisitLabel | undefined;
  /** Row in the gutter, top first. -1 for a straight line, which needs none. */
  row: number;
  /** A run that steps out beyond everything else in the gutter, to carry its label there. */
  detour?: Detour;
  /** Runs of one fan-out or fan-in share their trunk's stub: their stubs at one x are one line. */
  bus?: string | undefined;
}

/**
 * A detour: each stub runs to its own row, and the rows meet in a vertical line at
 * x, outside every other line of the gutter. The label sits beside it, on `row`.
 */
export interface Detour {
  x: number;
  /** The row of each stub, in the order of the visit's stubs. */
  rows: number[];
}

export interface VisitLabel {
  edgeId: string;
  /** above or below the run, or beside a straight vertical line. */
  mode: "above" | "below" | "beside";
  x0: number;
  w: number;
  h: number;
  /** Lines the label takes, and the width it wraps at when that is more than one. */
  lines: number;
  maxWidth: number;
  narrower: (() => LabelForm[]) | undefined;
}

export interface Routing {
  plans: Plan[];
  /** Visits per gutter. */
  gutters: Visit[][];
  /** Rows per gutter. */
  rows: number[];
  /** Horizontal extent of all routes and labels, relative to the centre line. */
  minX: number;
  maxX: number;
}

const EPS = 1e-6;
/** Least distance between two vertical tracks in one gap. */
const TRACK_MIN = 8;
/** Least distance between a port and a line on the far boundary of its gutter. */
const CLEAR = 8;
/** What a jog costs a corridor, in px of travel. */
const JOG = 96;
/** What a crossing costs a corridor, in px of travel. */
const CROSS = 2 * JOG;
/** The weight of a port or gap track that keeps its line straight. */
const STRAIGHT = 16;

export function routeAcross(
  layers: PLayer[],
  nodes: Map<string, PNode>,
  edges: Edge[],
  labels: Map<string, LabelBox>,
  pitch: number,
  extra: RouteExtra = NO_EXTRA,
): Routing {
  const gapsByLayer = layers.map((l) => gapsOf(l, extra));
  const sorted = [...edges].sort((a, b) => cmp(a.id, b.id));
  const plans: Plan[] = [];
  for (const edge of sorted) {
    const pl = makePlan(edge, nodes, labels, extra);
    if (pl !== undefined) plans.push(pl);
  }
  assignBuses(plans, extra.alone);
  chooseGaps(plans, gapsByLayer, extra.forbidTop);
  assignGapTracks(plans);
  chooseSideExits(plans, layers, extra.forbidTop, extra.noSideExit);
  chooseSideEntries(plans, layers, extra.forbidTop, extra.noSideExit);
  placePorts(plans, extra.forbidTop);

  // A label that its gutter cannot hold clear of every other line moves to the
  // next gutter of its path. Once it has tried them all, its line steps out of the
  // crowd in its first gutter, and the label sits beside the step.
  const byId = new Map(plans.map((p) => [p.edge.id, p]));
  const moved = new Map<string, Set<number>>();
  const away = new Set<string>();
  let gutters: Visit[][] = [];
  let rows: number[] = [];
  for (let round = 0; round < 12; round++) {
    gutters = layers.map(() => []);
    buildVisits(plans, gutters, moved);
    rows = [];
    const stranded: string[] = [];
    for (const vs of gutters) {
      const r = routeGutter(vs, pitch, away);
      rows.push(r.rows);
      stranded.push(...r.stranded);
    }
    let again = false;
    for (const id of stranded) {
      const pl = byId.get(id);
      if (pl === undefined) continue;
      const tried = moved.get(id) ?? new Set<number>();
      tried.add(pl.labelAt);
      moved.set(id, tried);
      if (tried.size < pl.gutters.length) again = true;
      else if (!away.has(id)) {
        away.add(id);
        again = true;
      }
    }
    if (!again) break;
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  const see = (x: number) => {
    if (!Number.isFinite(x)) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  };
  for (const vs of gutters) {
    for (const v of vs) {
      see(v.lo);
      see(v.hi);
      if (v.detour !== undefined) see(v.detour.x);
      if (v.label !== undefined) {
        see(v.label.x0);
        see(v.label.x0 + v.label.w);
      }
    }
  }
  return { plans, gutters, rows, minX, maxX };
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);
const dist = (x: number, lo: number, hi: number) => (x < lo ? lo - x : x > hi ? x - hi : 0);
const snap = (x: number) => Math.round(x / 4) * 4;

/**
 * x brought into [lo, hi]. A line that must step sideways steps at least
 * ROUTE.minJog, so that the step reads as meant and not as a glitch.
 */
function step(x: number, lo: number, hi: number): number {
  const c = clamp(x, lo, hi);
  const d = c - x;
  if (d === 0 || Math.abs(d) >= ROUTE.minJog) return c;
  return clamp(x + Math.sign(d) * ROUTE.minJog, lo, hi);
}

function gapsOf(l: PLayer, extra: RouteExtra): Gap[] {
  const pad = ROUTE.gapPad;
  const gaps: Gap[] = [];
  const top = extra.forbidTop.get(l.index) ?? [];
  const forbid = (k: number) => [...top, ...(extra.forbidGap.get(`${l.index}:${k}`) ?? [])];
  let lo = Number.NEGATIVE_INFINITY;
  l.nodes.forEach((n, k) => {
    gaps.push({ layer: l.index, k, lo, hi: n.x - pad, forbid: forbid(k) });
    lo = n.x + n.w + pad;
  });
  const k = l.nodes.length;
  gaps.push({ layer: l.index, k, lo, hi: Number.POSITIVE_INFINITY, forbid: forbid(k) });
  return gaps;
}

/** Is x inside one of the spans? */
function inSpans(x: number, spans: [number, number][]): boolean {
  return spans.some(([a, b]) => x > a - EPS && x < b + EPS);
}

/** The parts of [lo, hi] outside the spans, in order. */
function freeParts(lo: number, hi: number, spans: [number, number][]): [number, number][] {
  let parts: [number, number][] = [[lo, hi]];
  for (const [a, b] of spans) {
    const next: [number, number][] = [];
    for (const [p, q] of parts) {
      if (b <= p || a >= q) next.push([p, q]);
      else {
        if (a > p) next.push([p, a]);
        if (b < q) next.push([b, q]);
      }
    }
    parts = next;
  }
  return parts;
}

/** How many vertical tracks a gap holds. Outer gaps are open, so they hold any number. */
function capacity(gap: Gap): number {
  if (!Number.isFinite(gap.lo) || !Number.isFinite(gap.hi)) return Number.POSITIVE_INFINITY;
  if (gap.forbid.length === 0) return Math.floor((gap.hi - gap.lo) / TRACK_MIN + EPS) + 1;
  // Tracks sit on the 4 px grid, TRACK_MIN apart, outside the forbidden spans.
  let n = 0;
  let last = Number.NEGATIVE_INFINITY;
  for (let x = Math.ceil(gap.lo / 4 - EPS) * 4; x <= gap.hi + EPS; x += 4) {
    if (x - last < TRACK_MIN - EPS || inSpans(x, gap.forbid)) continue;
    n++;
    last = x;
  }
  return n;
}

const gapKey = (g: Gap) => `${g.layer}:${g.k}`;

// Pass 1: paths -------------------------------------------------------------

function makePlan(
  edge: Edge,
  nodes: Map<string, PNode>,
  labels: Map<string, LabelBox>,
  extra: RouteExtra,
): Plan | undefined {
  const u = nodes.get(edge.from);
  const v = nodes.get(edge.to);
  if (u === undefined || v === undefined) return undefined;
  const side = extra.sideways.get(edge.id);
  // A sideways edge carries its label in its row, not in a gutter.
  const label = side === undefined ? labels.get(edge.id) : undefined;
  const box = labels.get(edge.id);
  const x0 = extra.sideLabelX.get(edge.id);
  const sideLabel =
    side?.label !== undefined && box !== undefined && x0 !== undefined
      ? { x0, w: box.w, h: box.h }
      : undefined;
  const base = {
    edge,
    u,
    v,
    between: [],
    gaps: [],
    srcPort: 0,
    dstPort: 0,
    gapX: [],
    visits: [],
    label,
    labelAt: -1,
    bus: undefined,
    fanIn: undefined,
    side,
    sideLabel,
    turn: undefined,
    turnIn: undefined,
  };
  if (u.layer === v.layer) {
    if (side !== undefined) {
      const right = u.order < v.order;
      return {
        ...base,
        kind: "neighbour",
        srcSide: right ? "right" : "left",
        dstSide: right ? "left" : "right",
        gutters: [],
        ideal: [centreX(u), centreX(v)],
      };
    }
    return {
      ...base,
      kind: "uturn",
      srcSide: "bottom",
      dstSide: "bottom",
      gutters: [u.layer],
      ideal: [centreX(u), centreX(v)],
    };
  }
  const down = u.layer < v.layer;
  const gutters: number[] = [];
  const between: number[] = [];
  if (down) {
    for (let g = u.layer; g < v.layer; g++) gutters.push(g);
    for (let m = u.layer + 1; m < v.layer; m++) between.push(m);
  } else {
    for (let g = u.layer - 1; g >= v.layer; g--) gutters.push(g);
    for (let m = u.layer - 1; m > v.layer; m--) between.push(m);
  }
  return {
    ...base,
    kind: down ? "down" : "up",
    srcSide: down ? "bottom" : "top",
    dstSide: down ? "top" : "bottom",
    gutters,
    between,
    ideal: [centreX(u), centreX(v)],
  };
}

/** How many ports a node's top or bottom side holds at the port pitch. */
function portsOn(n: PNode): number {
  return Math.floor((n.w - 2 * portInset(n.w)) / ROUTE.portPitch) + 1;
}

/**
 * Every line meets its node side at a port of its own (D33), unless the side has
 * more lines than slots. From such a side, a fan-out of unlabelled edges in one
 * line style leaves as a bus: one port and one trunk. Of the rest, a fan-in of
 * unlabelled edges in one style into such a side arrives through one port.
 */
function assignBuses(plans: Plan[], alone: Set<string>): void {
  const load = new Map<string, number>();
  for (const pl of plans) {
    if (pl.kind === "neighbour") continue;
    for (const k of [`${pl.u.id}:${pl.srcSide}`, `${pl.v.id}:${pl.dstSide}`]) {
      load.set(k, (load.get(k) ?? 0) + 1);
    }
  }
  const roomy = (n: PNode, side: Side) => (load.get(`${n.id}:${side}`) ?? 0) <= portsOn(n);
  const collect = (key: (pl: Plan) => string, skip: (pl: Plan) => boolean) => {
    const groups = new Map<string, Plan[]>();
    for (const pl of plans) {
      if (pl.kind === "neighbour" || pl.label !== undefined || pl.u === pl.v || skip(pl)) continue;
      if (alone.has(pl.edge.id)) continue;
      const k = key(pl);
      const list = groups.get(k);
      if (list === undefined) groups.set(k, [pl]);
      else list.push(pl);
    }
    return [...groups.keys()]
      .sort(cmp)
      .map((k) => ({ id: k, members: groups.get(k) ?? [], port: 0 }))
      .filter((b) => b.members.length >= ROUTE.busMin);
  };
  // A two-way edge has an arrowhead at its start, so it never shares a trunk from there, and
  // a main-path edge shares one only with main-path edges, which are as thick (D33).
  const look = (pl: Plan) => `${lineStyle(pl.edge.kind)}${pl.edge.accent === true ? ":main" : ""}`;
  for (const bus of collect(
    (pl) => `${pl.u.id}:${pl.srcSide}:${look(pl)}`,
    (pl) => pl.edge.both === true || roomy(pl.u, pl.srcSide),
  )) {
    for (const pl of bus.members) pl.bus = bus;
  }
  for (const fan of collect(
    (pl) => `in ${pl.v.id}:${pl.dstSide}:${look(pl)}`,
    (pl) => pl.bus !== undefined || roomy(pl.v, pl.dstSide),
  )) {
    for (const pl of fan.members) pl.fanIn = fan;
  }
}

/**
 * How many lines pl would cross if it passed its rows at x, counting only the
 * crossings that placement already makes certain (D24): a line straight through
 * pl's first or last gutter where pl runs along it, a line along a gutter that pl
 * passes straight through, and a sideways line across a row that pl passes.
 */
function certainCrossings(plans: Plan[], pl: Plan, x: number): number {
  const first = pl.gutters[0];
  const last = pl.gutters[pl.gutters.length - 1];
  const xs = centreX(pl.u);
  const xt = centreX(pl.v);
  const inside = (t: number, a: number, b: number) =>
    t > Math.min(a, b) + EPS && t < Math.max(a, b) - EPS;
  let n = 0;
  for (const o of plans) {
    if (o === pl) continue;
    if (o.kind === "neighbour") {
      const [l, r] = o.u.x < o.v.x ? [o.u, o.v] : [o.v, o.u];
      if (pl.between.includes(o.u.layer) && inside(x, l.x + l.w, r.x)) n++;
      continue;
    }
    // Only lines whose way through every gutter is known: placement's, or chosen.
    if (o.ideal.length !== o.gutters.length + 1) continue;
    const lo = Math.max(o.u.x, o.v.x);
    const hi = Math.min(o.u.x + o.u.w, o.v.x + o.v.w);
    o.gutters.forEach((g, j) => {
      const a = o.ideal[j] ?? 0;
      const b = o.ideal[j + 1] ?? 0;
      // A line between neighbouring rows that overlap runs straight.
      const up =
        o.between.length === 0 && o.u !== o.v && hi > lo
          ? clamp((a + b) / 2, lo, hi)
          : Math.abs(a - b) < EPS
            ? a
            : undefined;
      if (g === first && up !== undefined && inside(up, xs, x)) n++;
      else if (g === last && up !== undefined && inside(up, x, xt)) n++;
      else if (g !== first && g !== last && pl.gutters.includes(g) && up === undefined) {
        if (inside(x, a, b)) n++;
      }
    });
  }
  return n;
}

/** The x spans free in every one of these layers, given each layer's gaps. */
function corridors(between: number[], gapsByLayer: Gap[][]): [number, number][] {
  let spans: [number, number][] = [[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]];
  for (const m of between) {
    const next: [number, number][] = [];
    for (const [a, b] of spans) {
      for (const g of gapsByLayer[m] ?? []) {
        if (g.hi < g.lo) continue;
        for (const [p, q] of freeParts(g.lo, g.hi, g.forbid)) {
          const lo = Math.max(a, p);
          const hi = Math.min(b, q);
          if (hi >= lo) next.push([lo, hi]);
        }
      }
    }
    spans = next;
  }
  return spans;
}

/**
 * The gaps each path takes through the layers it crosses. A path that skips rows
 * takes one corridor: an x span that is free in every layer it passes, the one
 * closest to its way, so that it passes them all as one straight line (D25 rule
 * 5). Only when every corridor is full does it pick a gap per layer, each the one
 * closest to its way. Edges choose in id order. The outer gaps are never full, so
 * every path finds one.
 */
function chooseGaps(
  plans: Plan[],
  gapsByLayer: Gap[][],
  forbidTop: Map<number, [number, number][]>,
): void {
  const load = new Map<string, Set<string>>();
  const take = (pl: Plan, gap: Gap) => {
    const key = trackKey(pl, [...pl.gaps, gap]);
    pl.gaps.push(gap);
    const k = gapKey(gap);
    const used = load.get(k);
    if (used === undefined) load.set(k, new Set([key]));
    else used.add(key);
  };
  const room = (pl: Plan, gaps: Gap[], gap: Gap) => {
    const key = trackKey(pl, [...gaps, gap]);
    const used = load.get(gapKey(gap));
    return used === undefined || used.has(key) || used.size < capacity(gap);
  };
  // The unlabelled lines that leave one node side past the same rows choose one
  // corridor together, so that they pass those rows side by side, or as one trunk,
  // and part near their ends. A labelled line finds its own, where its label has room.
  const mateKey = (pl: Plan) =>
    pl.label === undefined ? `${pl.u.id}:${pl.srcSide}|${pl.between.join(",")}` : undefined;
  const mates = new Map<string, Plan[]>();
  for (const pl of plans) {
    const k = mateKey(pl);
    if (k === undefined || pl.between.length === 0) continue;
    const list = mates.get(k);
    if (list === undefined) mates.set(k, [pl]);
    else list.push(pl);
  }
  const chosen = new Map<string, number>();
  for (const pl of plans) {
    if (pl.between.length === 0) continue;
    const xs = centreX(pl.u);
    const xt = centreX(pl.v);
    const k = mateKey(pl);
    const team = (k === undefined ? undefined : mates.get(k)) ?? [pl];
    // A corridor that one end's ports can reach straight saves that end a jog:
    // two bends at most instead of four (D25 rule 2).
    const reach = (n: PNode, lo: number, hi: number) =>
      hi >= n.x + portInset(n.w) && lo <= n.x + n.w - portInset(n.w);
    // The line goes on into the lower end's top side, past any group label there.
    const lower = forbidTop.get(Math.max(pl.u.layer, pl.v.layer)) ?? [];
    const taken = k === undefined ? undefined : chosen.get(k);
    const spans = corridors(pl.between, gapsByLayer)
      .flatMap(([lo, hi]) => freeParts(lo, hi, lower))
      .map(([lo, hi]) => ({
        lo,
        hi,
        travel:
          dist(xs, lo, hi) +
          (reach(pl.u, lo, hi) ? 0 : JOG) +
          team.reduce(
            (s, m) =>
              s +
              dist(centreX(m.v), lo, hi) +
              (reach(m.v, lo, hi) ? 0 : JOG) +
              CROSS * certainCrossings(plans, m, clamp(xs, lo, hi)),
            0,
          ),
        move: dist(xs, lo, hi),
      }))
      .sort(
        (a, b) =>
          Number(b.lo === taken) - Number(a.lo === taken) ||
          a.travel - b.travel ||
          a.move - b.move ||
          a.lo - b.lo,
      );
    let done = false;
    for (const s of spans) {
      const gaps: Gap[] = [];
      for (const m of pl.between) {
        const gap = (gapsByLayer[m] ?? []).find((g) => g.lo <= s.lo + EPS && g.hi >= s.hi - EPS);
        if (gap === undefined || !room(pl, gaps, gap)) break;
        gaps.push(gap);
      }
      if (gaps.length !== pl.between.length) continue;
      for (const gap of gaps) take(pl, gap);
      if (k !== undefined) chosen.set(k, s.lo);
      // The line runs where an end's ports can meet it straight, if one can, and
      // keeps ROUTE.passClear from the nodes it passes where the corridor has room.
      const extra = ROUTE.passClear - ROUTE.gapPad;
      let clo = Number.isFinite(s.lo) ? s.lo + extra : s.lo;
      let chi = Number.isFinite(s.hi) ? s.hi - extra : s.hi;
      if (chi < clo) {
        clo = (s.lo + s.hi) / 2;
        chi = clo;
      }
      const meet = (n: PNode, x: number, lo: number, hi: number) =>
        clamp(x, Math.max(lo, n.x + portInset(n.w)), Math.min(hi, n.x + n.w - portInset(n.w)));
      const straight = (lo: number, hi: number) =>
        reach(pl.u, lo, hi)
          ? meet(pl.u, xs, lo, hi)
          : reach(pl.v, lo, hi)
            ? meet(pl.v, xt, lo, hi)
            : undefined;
      const at = straight(clo, chi) ?? straight(s.lo, s.hi) ?? step(xs, clo, chi);
      pl.ideal = [xs, ...gaps.map(() => at), xt];
      done = true;
      break;
    }
    if (done) continue;
    const ideal = [xs];
    let cur = xs;
    for (const m of pl.between) {
      let best: Gap | undefined;
      let bestCost = Number.POSITIVE_INFINITY;
      let bestMove = Number.POSITIVE_INFINITY;
      for (const gap of gapsByLayer[m] ?? []) {
        if (gap.hi < gap.lo || !room(pl, pl.gaps, gap)) continue;
        const travel = dist(cur, gap.lo, gap.hi) + dist(xt, gap.lo, gap.hi);
        const move = dist(cur, gap.lo, gap.hi);
        if (travel < bestCost - EPS || (Math.abs(travel - bestCost) <= EPS && move < bestMove)) {
          best = gap;
          bestCost = travel;
          bestMove = move;
        }
      }
      if (best === undefined) continue;
      take(pl, best);
      cur = step(cur, best.lo, best.hi);
      ideal.push(cur);
    }
    ideal.push(xt);
    pl.ideal = ideal;
  }
}

/** The track a path takes through the last of `gaps`: shared by bus members with the same way so far. */
function trackKey(pl: Plan, gaps: Gap[]): string {
  if (pl.bus === undefined) return pl.edge.id;
  return `${pl.bus.id}|${gaps.map(gapKey).join(",")}`;
}

// Pass 2a: gap tracks -------------------------------------------------------

/**
 * The members of one bus that have passed the same gaps before gutter j share the
 * run in gutter j, and the trunk through the next gap they share.
 */
function trunkKey(pl: Plan, j: number): string | undefined {
  if (pl.bus === undefined) return undefined;
  const passed = pl.gaps.slice(0, j).map(gapKey);
  return `${pl.bus.id}|${passed.join(",")}`;
}

interface Track {
  gap: Gap;
  key: string;
  members: { pl: Plan; j: number }[];
  ideal: number;
  /** Where the line comes from: its waypoint before this gap. */
  from: number;
  parting: [number, number, number];
  /** A track that continues the line above or below it straight weighs more. */
  weight: number;
}

/**
 * Where a line leaves the corridor it takes through gap j: -1 to the left, 1 to
 * the right, 0 on to its end; then at which waypoint, and toward which x. Of the
 * lines that share a corridor, one that leaves it to the left must run left of
 * those that go on, and one that leaves it sooner further out, or they cross.
 */
function parting(pl: Plan, j: number): [number, number, number] {
  const at = pl.ideal[j + 1] ?? 0;
  for (let i = j + 2; i < pl.ideal.length; i++) {
    const x = pl.ideal[i] ?? at;
    if (Math.abs(x - at) > EPS) return [Math.sign(x - at), i, x];
  }
  return [0, pl.ideal.length, at];
}

function byParting(a: [number, number, number], b: [number, number, number]): number {
  const [sa, ia, xa] = a;
  const [sb, ib, xb] = b;
  return sa - sb || (sa < 0 ? ia - ib : ib - ia) || xa - xb;
}

function assignGapTracks(plans: Plan[]): void {
  const gaps = new Map<string, Track[]>();
  for (const pl of plans) {
    pl.gaps.forEach((gap, j) => {
      const k = gapKey(gap);
      const trunk = trunkKey(pl, j + 1);
      let list = gaps.get(k);
      if (list === undefined) {
        list = [];
        gaps.set(k, list);
      }
      const shared = trunk === undefined ? undefined : list.find((t) => t.key === trunk);
      if (shared !== undefined) {
        shared.members.push({ pl, j });
        return;
      }
      list.push({
        gap,
        key: trunk ?? pl.edge.id,
        members: [{ pl, j }],
        ideal: pl.ideal[j + 1] ?? 0,
        from: pl.ideal[j] ?? 0,
        parting: parting(pl, j),
        weight: pl.ideal[j + 1] === pl.ideal[j] ? STRAIGHT : 1,
      });
    });
  }
  // Layer by layer from the top, so that the tracks of a layer keep clear of the
  // tracks of the layer above, which face them across one gutter.
  const placed = new Map<number, { x: number; plans: Plan[] }[]>();
  const keys = [...gaps.keys()].sort((a, b) => {
    const [la, ka] = a.split(":").map(Number);
    const [lb, kb] = b.split(":").map(Number);
    return (la ?? 0) - (lb ?? 0) || (ka ?? 0) - (kb ?? 0);
  });
  for (const k of keys) {
    const list = gaps.get(k) ?? [];
    const head = list[0];
    if (head === undefined) continue;
    // A line that came straight down through the layer above keeps going straight
    // where this gap allows it.
    const above = placed.get(head.gap.layer - 1) ?? [];
    for (const t of list) {
      const prev = above.find((f) => t.members.some((m) => f.plans.includes(m.pl)));
      if (prev === undefined) continue;
      t.ideal = clamp(prev.x, head.gap.lo, head.gap.hi);
      if (t.ideal === prev.x) t.weight = STRAIGHT;
    }
    list.sort(
      (a, b) =>
        a.ideal - b.ideal ||
        a.from - b.from ||
        byParting(a.parting, b.parting) ||
        cmp(a.key, b.key),
    );
    const first = list[0];
    if (first === undefined) continue;
    const want = list.map((t) => t.ideal);
    const weights = list.map((t) => t.weight);
    let { lo, hi } = first.gap;
    // An outer gap is open on one side: bound it near its tracks, past any label.
    const blocked = first.gap.forbid.reduce((s, [a, b]) => s + Math.max(0, b - a), 0);
    const reach = (list.length + 1) * ROUTE.portPitch + blocked;
    lo = Math.max(lo, Math.min(...want) - reach);
    hi = Math.min(hi, Math.max(...want) + reach);
    const facing = placed.get(first.gap.layer - 1) ?? [];
    const clear = (i: number, x: number, radius: number) => {
      const own = list[i]?.members.map((m) => m.pl) ?? [];
      return facing.every(
        (f) => Math.abs(f.x - x) >= radius || f.plans.some((p) => own.includes(p)),
      );
    };
    // No track passes a label in this gap or a group label above it.
    const free = (x: number) => !inSpans(x, first.gap.forbid);
    // The port pitch where the gap has room, so that lines from neighbouring ports
    // pass through it straight; closer where it has less.
    let xs: number[] | undefined;
    for (const radius of [CLEAR, CLEAR / 2]) {
      for (const pitch of [ROUTE.portPitch, ROUTE.gapPitch, TRACK_MIN]) {
        xs = onGrid(want, weights, lo, hi, pitch, (i, x) => free(x) && clear(i, x, radius));
        if (xs !== undefined) break;
      }
      if (xs !== undefined) break;
    }
    // A full gap sits half a grid step off the tracks above it.
    xs ??= onGrid(want, weights, lo, hi, TRACK_MIN, (i, x) => free(x) && clear(i, x, 1), 2);
    xs ??= onGrid(want, weights, lo, hi, TRACK_MIN, (_, x) => free(x));
    xs ??= onGrid(want, weights, lo, hi, TRACK_MIN, () => true);
    xs ??= evenly(list.length, lo, hi);
    const mine = placed.get(first.gap.layer) ?? [];
    placed.set(first.gap.layer, mine);
    list.forEach((t, i) => {
      const x = xs[i] ?? t.ideal;
      for (const m of t.members) m.pl.gapX[m.j] = x;
      mine.push({ x, plans: t.members.map((m) => m.pl) });
    });
  }
}

// Pass 2a': side exits ------------------------------------------------------

/**
 * Whether a line other than pl runs across x in gutter g, judged from where the
 * placement puts its ends and gaps. A side exit or side entry runs down the whole
 * gutter at x, so such a line would cross it.
 */
function runsAcross(plans: Plan[], pl: Plan, g: number, x: number): boolean {
  return plans.some((o) => {
    if (o === pl || o.turn !== undefined || o.turnIn !== undefined) return false;
    const j = o.gutters.indexOf(g);
    if (j < 0) return false;
    const a = o.ideal[j] ?? x;
    const b = o.ideal[j + 1] ?? x;
    return Math.min(a, b) < x - EPS && Math.max(a, b) > x + EPS;
  });
}

/**
 * An edge into the next row up or down, to a node wholly on one side of its
 * source, leaves from that side of the source and turns once into the target: an
 * L with one bend, where leaving from the bottom takes a Z with two. It needs the
 * source's row clear between the two: no node and no gap track, and room for the
 * turn beside the next node, and no other line may run across the gutter at the
 * turn. Fan-outs and fan-ins keep their shared port, a node side takes one side
 * exit at most, and a side with an edge to a neighbour takes none. The turn goes
 * into the target's centre where it can, past group labels. An edge that skips
 * rows leaves by a side where its corridor lies in the open beside its source, and
 * turns into the corridor.
 */
function chooseSideExits(
  plans: Plan[],
  layers: PLayer[],
  forbidTop: Map<number, [number, number][]>,
  noSideExit: Set<string>,
): void {
  const taken = new Set<string>();
  for (const pl of plans) {
    if (pl.kind !== "neighbour") continue;
    taken.add(`${pl.u.id}:${pl.srcSide}`);
    taken.add(`${pl.v.id}:${pl.dstSide}`);
  }
  const pad = ROUTE.corridorPad;
  // One side exit per gap of a row, so that two never run along one line.
  const gapsUsed = new Set<string>();
  for (const pl of plans) {
    const { u, v } = pl;
    if (pl.kind !== "down" && pl.kind !== "up") continue;
    if (pl.bus !== undefined || pl.fanIn !== undefined) continue;
    if (noSideExit.has(pl.edge.id)) continue;
    // A line that skips rows turns into its corridor at its first gap track; any
    // other turns above or below its target.
    const corridor = pl.between.length > 0 ? pl.gapX[0] : undefined;
    if (pl.between.length > 0 && corridor === undefined) continue;
    const left = corridor !== undefined ? corridor < u.x : v.x + v.w <= u.x;
    const right = corridor !== undefined ? corridor > u.x + u.w : v.x >= u.x + u.w;
    if (!left && !right) continue;
    const side: Side = left ? "left" : "right";
    if (taken.has(`${u.id}:${side}`)) continue;
    const row = layers[u.layer]?.nodes ?? [];
    const k = row.indexOf(u);
    const next = row[left ? k - 1 : k + 1];
    const lo = left
      ? next === undefined
        ? Number.NEGATIVE_INFINITY
        : next.x + next.w + pad
      : u.x + u.w + pad;
    const hi = left ? u.x - pad : next === undefined ? Number.POSITIVE_INFINITY : next.x - pad;
    let x: number;
    if (corridor !== undefined) {
      // The corridor's track must lie in the open beside the source, and a line that
      // goes up passes the labels at the top of the source's row.
      if (corridor < lo - EPS || corridor > hi + EPS) continue;
      if (pl.kind === "up" && inSpans(corridor, forbidTop.get(u.layer) ?? [])) continue;
      x = corridor;
    } else {
      const plo = Math.max(lo, v.x + portInset(v.w));
      const phi = Math.min(hi, v.x + v.w - portInset(v.w));
      if (phi < plo) continue;
      // The vertical part passes the group labels above the lower of the two rows.
      const spans = forbidTop.get(Math.max(u.layer, v.layer)) ?? [];
      x = nearestFree(centreX(v), plo, phi, spans);
      if (x < plo - EPS || x > phi + EPS || inSpans(x, spans)) continue;
    }
    // No line runs up or down through the source's row between it and the turn.
    const gk = left ? k : k + 1;
    if (gapsUsed.has(`${u.layer}:${gk}`)) continue;
    const a = Math.min(x, left ? u.x : u.x + u.w) - TRACK_MIN;
    const b = Math.max(x, left ? u.x : u.x + u.w) + TRACK_MIN;
    const crossed = plans.some((o) =>
      o.gaps.some((g, j) => {
        const gx = o.gapX[j];
        return g.layer === u.layer && g.k === gk && gx !== undefined && gx > a && gx < b;
      }),
    );
    if (crossed) continue;
    if (runsAcross(plans, pl, pl.gutters[0] ?? u.layer, x)) continue;
    pl.srcSide = side;
    pl.turn = x;
    taken.add(`${u.id}:${side}`);
    gapsUsed.add(`${u.layer}:${gk}`);
  }
}

/**
 * Side entries (D33), for lines that could not leave by a side: a line between
 * neighbouring rows whose target lies wholly left or right of its source runs
 * straight out of the source's top or bottom, beside the target, and turns into the
 * target's facing side at the middle of its row: one bend, where a route through the
 * gutter takes two. The target's side must be free, the vertical part must run in
 * the open beside the target, clear of its neighbour, of every line through that
 * gap and of every other line's run across the gutter, and a line that would have
 * joined a fan-in leaves it. An edge that skips rows enters by a side where its
 * corridor lies in the open beside its target, and turns out of the corridor.
 */
function chooseSideEntries(
  plans: Plan[],
  layers: PLayer[],
  forbidTop: Map<number, [number, number][]>,
  noSideExit: Set<string>,
): void {
  const taken = new Set<string>();
  const gapsUsed = new Set<string>();
  const gapOf = (n: PNode, side: Side) => {
    const row = layers[n.layer]?.nodes ?? [];
    const k = row.indexOf(n);
    return `${n.layer}:${side === "left" ? k : k + 1}`;
  };
  for (const pl of plans) {
    if (pl.kind === "neighbour") {
      taken.add(`${pl.u.id}:${pl.srcSide}`);
      taken.add(`${pl.v.id}:${pl.dstSide}`);
    }
    if (pl.turn !== undefined) {
      taken.add(`${pl.u.id}:${pl.srcSide}`);
      gapsUsed.add(gapOf(pl.u, pl.srcSide));
    }
  }
  const pad = ROUTE.corridorPad;
  for (const pl of plans) {
    const { u, v } = pl;
    if (pl.kind !== "down" && pl.kind !== "up") continue;
    if (pl.bus !== undefined) continue;
    // A line between neighbouring rows turns once: by a side exit or a side entry.
    if (pl.between.length === 0 && pl.turn !== undefined) continue;
    // Only between two nodes: a container end is cut at the container's box (D28).
    if (pl.edge.from !== u.id || pl.edge.to !== v.id || noSideExit.has(pl.edge.id)) continue;
    // A line that skips rows turns out of its corridor at its last gap track.
    const corridor = pl.between.length > 0 ? pl.gapX[pl.gapX.length - 1] : undefined;
    if (pl.between.length > 0 && corridor === undefined) continue;
    const left = corridor !== undefined ? corridor > v.x + v.w : u.x >= v.x + v.w;
    const right = corridor !== undefined ? corridor < v.x : u.x + u.w <= v.x;
    if (!left && !right) continue;
    // The side of the target that faces the source.
    const side: Side = left ? "right" : "left";
    if (taken.has(`${v.id}:${side}`)) continue;
    const gap = gapOf(v, side);
    if (gapsUsed.has(gap)) continue;
    const row = layers[v.layer]?.nodes ?? [];
    const k = row.indexOf(v);
    const next = row[side === "right" ? k + 1 : k - 1];
    const lo =
      side === "right" ? v.x + v.w + pad : next === undefined ? -Infinity : next.x + next.w + pad;
    const hi = side === "right" ? (next === undefined ? Infinity : next.x - pad) : v.x - pad;
    let x: number;
    if (corridor !== undefined) {
      // The corridor's track must lie in the open beside the target, and a line that
      // comes down passes the labels at the top of the target's row.
      if (corridor < lo - EPS || corridor > hi + EPS) continue;
      if (pl.kind === "down" && inSpans(corridor, forbidTop.get(v.layer) ?? [])) continue;
      x = corridor;
    } else {
      const plo = Math.max(lo, u.x + portInset(u.w));
      const phi = Math.min(hi, u.x + u.w - portInset(u.w));
      if (phi < plo) continue;
      // A port on the source's top keeps clear of group labels there, and the line into
      // a lower row passes the group labels above it.
      const spans = forbidTop.get(pl.kind === "up" ? u.layer : v.layer) ?? [];
      x = nearestFree(centreX(u), plo, phi, spans);
      if (x < plo - EPS || x > phi + EPS || inSpans(x, spans)) continue;
    }
    // No line runs up or down through the target's row between it and the turn.
    const gk = side === "right" ? k + 1 : k;
    const a = Math.min(x, side === "right" ? v.x + v.w : v.x) - TRACK_MIN;
    const b = Math.max(x, side === "right" ? v.x + v.w : v.x) + TRACK_MIN;
    const crossed = plans.some((o) =>
      o.gaps.some((g, j) => {
        const gx = o.gapX[j];
        return g.layer === v.layer && g.k === gk && gx !== undefined && gx > a && gx < b;
      }),
    );
    if (crossed) continue;
    if (runsAcross(plans, pl, pl.gutters[pl.gutters.length - 1] ?? v.layer, x)) continue;
    const fan = pl.fanIn;
    if (fan !== undefined) {
      fan.members = fan.members.filter((m) => m !== pl);
      if (fan.members.length < ROUTE.busMin) for (const m of fan.members) m.fanIn = undefined;
      pl.fanIn = undefined;
    }
    pl.dstSide = side;
    pl.turnIn = x;
    taken.add(`${v.id}:${side}`);
    gapsUsed.add(gap);
  }
}

/**
 * Ports for every side. A side exit whose target port could not sit at its turn
 * leaves from its bottom or top again, and the ports are placed anew, until every
 * side exit meets its port straight.
 */
function placePorts(plans: Plan[], forbidTop: Map<number, [number, number][]>): void {
  for (;;) {
    assignPorts(plans, forbidTop);
    // Between neighbouring rows, the far end's port must sit at the turn; a line that
    // skips rows turns at its corridor, which no port moves.
    const direct = (pl: Plan) => pl.between.length === 0;
    const off = plans.filter(
      (pl) => pl.turn !== undefined && direct(pl) && Math.abs(pl.dstPort - pl.turn) > EPS,
    );
    const offIn = plans.filter(
      (pl) => pl.turnIn !== undefined && direct(pl) && Math.abs(pl.srcPort - pl.turnIn) > EPS,
    );
    if (off.length === 0 && offIn.length === 0) return;
    for (const pl of off) {
      pl.turn = undefined;
      pl.srcSide = pl.kind === "down" ? "bottom" : "top";
    }
    for (const pl of offIn) {
      pl.turnIn = undefined;
      pl.dstSide = pl.kind === "down" ? "top" : "bottom";
    }
  }
}

// Pass 2b: ports ------------------------------------------------------------

interface End {
  plan: Plan;
  src: boolean;
  node: PNode;
  side: Side;
  /** Where the port would like to be: toward the edge's next waypoint. */
  desired: number;
  /** Where the line's run in this gutter ends: at the other port, a gap track or a turn. */
  far: number;
  /** The run ends on the boundary this port is on: a u-turn or a self-loop. */
  back: boolean;
  /** How much moving this port would cost: a port that keeps a line straight weighs more. */
  weight: number;
  key: string;
}

/**
 * Where an end's run ends, as a place on a walk round the edge of its gutter that
 * starts at the node's left corner: out along the node's own boundary to the left,
 * across the far boundary from left to right, and back along the node's boundary
 * from the right. Ports in this order, left to right, give runs that need not
 * cross (D33).
 */
function around(e: End): [number, number] {
  const n = e.node;
  if (!e.back) return [1, e.far];
  if (e.far < n.x) return [0, -e.far];
  if (e.far > n.x + n.w) return [2, -e.far];
  // A self-loop's two ends sit side by side.
  return [1, centreX(n)];
}

/** A line on a gutter boundary that a port on the far boundary keeps clear of. */
interface Mark {
  x: number;
  plan: Plan;
}

/** The point on the 4 px grid nearest x, inside [lo, hi] and outside the spans; x if there is none. */
function nearestFree(x: number, lo: number, hi: number, spans: [number, number][]): number {
  const start = snap(clamp(x, lo, hi));
  for (let d = 0; d <= hi - lo + 4; d += 4) {
    for (const c of d === 0 ? [start] : [start - d, start + d]) {
      if (c >= lo - EPS && c <= hi + EPS && !inSpans(c, spans)) return c;
    }
  }
  return start;
}

function assignPorts(plans: Plan[], forbidTop: Map<number, [number, number][]>): void {
  const sides = new Map<string, End[]>();
  const push = (end: End) => {
    const k = `${end.node.id}\u0000${end.side}`;
    const list = sides.get(k);
    if (list === undefined) sides.set(k, [end]);
    else list.push(end);
  };
  const within = (n: PNode, x: number) =>
    clamp(x, n.x + portInset(n.w), n.x + n.w - portInset(n.w));
  /** A port that leans toward x, at most a quarter of the box from its centre. */
  const toward = (n: PNode, x: number) =>
    snap(centreX(n) + clamp(x - centreX(n), -n.w / 4, n.w / 4));
  for (const pl of plans) {
    const { u, v } = pl;
    if (pl.kind === "neighbour") {
      const y = pl.side?.offset ?? 0;
      pl.srcPort = y;
      pl.dstPort = y;
      continue;
    }
    if (pl.turnIn !== undefined && pl.between.length === 0) {
      // A side entry arrives at the middle of its side; only its source has a port.
      pl.dstPort = 0;
      push({
        plan: pl,
        src: true,
        node: u,
        side: pl.srcSide,
        desired: pl.turnIn,
        far: pl.turnIn,
        back: false,
        weight: STRAIGHT,
        key: "",
      });
      continue;
    }
    if (pl.turn !== undefined && pl.between.length === 0) {
      // A side exit leaves from the middle of its side; only its target has a port.
      pl.srcPort = 0;
      push({
        plan: pl,
        src: false,
        node: v,
        side: pl.dstSide,
        desired: pl.turn,
        far: pl.turn,
        back: false,
        weight: STRAIGHT,
        key: "",
      });
      continue;
    }
    let ds: number;
    let dt: number;
    let ws = 1;
    let wt = 1;
    // Where the run from each end ends: the other end, unless the line passes gaps.
    let fs: number | undefined;
    let ft: number | undefined;
    if (u === v) {
      // A self-loop's ends sit wide enough apart that it reads as a loop.
      const c = centreX(u);
      ds = c - 1.5 * ROUTE.portPitch;
      dt = c + 1.5 * ROUTE.portPitch;
    } else if (pl.kind === "uturn") {
      ds = within(u, centreX(v));
      dt = within(v, centreX(u));
    } else if (pl.gaps.length > 0) {
      const toGap = pl.gapX[0] ?? pl.ideal[1] ?? centreX(v);
      const fromGap = pl.gapX[pl.gapX.length - 1] ?? pl.ideal[pl.ideal.length - 2] ?? centreX(u);
      ds = step(toGap, u.x + portInset(u.w), u.x + u.w - portInset(u.w));
      dt = step(fromGap, v.x + portInset(v.w), v.x + v.w - portInset(v.w));
      if (ds === toGap) ws = STRAIGHT;
      if (dt === fromGap) wt = STRAIGHT;
      fs = toGap;
      ft = fromGap;
    } else {
      const lo = Math.max(u.x + portInset(u.w), v.x + portInset(v.w));
      const hi = Math.min(u.x + u.w - portInset(u.w), v.x + v.w - portInset(v.w));
      if (hi >= lo) {
        // Straight, and clear of a group label on the lower node's top side.
        const lower = pl.kind === "down" ? v : u;
        const spans = forbidTop.get(lower.layer) ?? [];
        ds = nearestFree((centreX(u) + centreX(v)) / 2, lo, hi, spans);
        dt = ds;
        ws = STRAIGHT;
        wt = STRAIGHT;
      } else {
        // A branch of a fan-out ends at its node's centre, and a line into a
        // fan-in starts at its node's centre; other lines lean toward each other.
        ds = pl.fanIn !== undefined ? snap(centreX(u)) : toward(u, centreX(v));
        dt = pl.bus !== undefined ? snap(centreX(v)) : toward(v, centreX(u));
      }
    }
    const back = pl.kind === "uturn";
    // A line that skips rows and turns by a side leaves or arrives at the side's middle.
    if (pl.turn !== undefined) pl.srcPort = 0;
    else {
      push({
        plan: pl,
        src: true,
        node: u,
        side: pl.srcSide,
        desired: ds,
        far: fs ?? dt,
        back,
        weight: ws,
        key: "",
      });
    }
    if (pl.turnIn !== undefined) pl.dstPort = 0;
    else {
      push({
        plan: pl,
        src: false,
        node: v,
        side: pl.dstSide,
        desired: dt,
        far: ft ?? ds,
        back,
        weight: wt,
        key: "",
      });
    }
  }

  // Lines on each gutter boundary that do not come from a port: gap tracks.
  // above[g] lies on the top boundary of gutter g, below[g] on its bottom one.
  const above = new Map<number, Mark[]>();
  const below = new Map<number, Mark[]>();
  const mark = (map: Map<number, Mark[]>, g: number, m: Mark) => {
    const list = map.get(g);
    if (list === undefined) map.set(g, [m]);
    else list.push(m);
  };
  for (const pl of plans) {
    pl.gaps.forEach((gap, j) => {
      const x = pl.gapX[j];
      if (x === undefined) return;
      mark(above, gap.layer, { x, plan: pl });
      mark(below, gap.layer - 1, { x, plan: pl });
    });
    // A side exit's turn crosses the boundary of its gutter on the source's side.
    if (pl.turn !== undefined) {
      if (pl.kind === "down") mark(above, pl.u.layer, { x: pl.turn, plan: pl });
      else mark(below, pl.u.layer - 1, { x: pl.turn, plan: pl });
    }
    // A side entry's line crosses the boundary of its gutter on the target's side.
    if (pl.turnIn !== undefined) {
      if (pl.kind === "down") mark(below, pl.v.layer - 1, { x: pl.turnIn, plan: pl });
      else mark(above, pl.v.layer, { x: pl.turnIn, plan: pl });
    }
  }

  // Bottom sides first, clear of the gap tracks below them; then top sides, clear
  // of everything on the boundary above them.
  const keys = [...sides.keys()].sort(cmp);
  const order = [
    ...keys.filter((k) => sides.get(k)?.[0]?.side === "bottom"),
    ...keys.filter((k) => sides.get(k)?.[0]?.side === "top"),
  ];
  for (const k of order) {
    const ends = sides.get(k) ?? [];
    const first = ends[0];
    if (first === undefined) continue;
    const n = first.node;
    // A fan-out leaves through one port and a fan-in arrives through one, each
    // placed like a single end.
    const slots: End[] = [];
    const buses = new Map<string, { bus: Bus; ends: End[]; src: boolean }>();
    for (const end of ends) {
      const bus = end.src ? end.plan.bus : end.plan.fanIn;
      if (bus === undefined) {
        slots.push({ ...end, key: end.plan.edge.id });
        continue;
      }
      const entry = buses.get(bus.id);
      if (entry === undefined) buses.set(bus.id, { bus, ends: [end], src: end.src });
      else entry.ends.push(end);
    }
    for (const id of [...buses.keys()].sort(cmp)) {
      const entry = buses.get(id);
      if (entry === undefined || entry.ends[0] === undefined) continue;
      // A member that can run straight keeps its line straight: the trunk is
      // that line, and the others branch off it. Otherwise the port sits at the
      // members' median.
      const straight = entry.ends
        .filter((e) => e.weight > 1)
        .sort((a, b) => Math.abs(a.desired - centreX(n)) - Math.abs(b.desired - centreX(n)))[0];
      slots.push({
        ...(straight ?? entry.ends[0]),
        desired:
          straight?.desired ?? median(entry.ends.map((e) => e.desired).sort((a, b) => a - b)),
        far: median(entry.ends.map((e) => e.far).sort((a, b) => a - b)),
        back: entry.ends.every((e) => e.back),
        weight: straight === undefined ? 1 : STRAIGHT,
        key: `\u0001${id}`,
      });
    }
    // In the order of where each run ends, so that runs from one side need not cross.
    slots.sort((a, b) => {
      const [ga, ka] = around(a);
      const [gb, kb] = around(b);
      return ga - gb || ka - kb || cmp(a.key, b.key) || Number(b.src) - Number(a.src);
    });

    const g = first.side === "bottom" ? n.layer : n.layer - 1;
    const facing = (first.side === "bottom" ? below.get(g) : above.get(g)) ?? [];
    const spans = first.side === "top" ? (forbidTop.get(n.layer) ?? []) : [];
    const sameBus = (a: Plan, b: Plan) =>
      (a.bus !== undefined && b.bus?.id === a.bus.id) ||
      (a.fanIn !== undefined && b.fanIn?.id === a.fanIn.id);
    const allowed = (i: number, x: number, radius: number) => {
      const s = slots[i];
      if (s === undefined) return true;
      if (inSpans(x, spans)) return false;
      const own = s.plan;
      for (const f of facing) {
        if (Math.abs(f.x - x) >= radius) continue;
        if (f.plan === own || sameBus(own, f.plan)) continue;
        return false;
      }
      return true;
    };
    const xs = portPositions(
      slots.map((s) => s.desired),
      slots.map((s) => s.weight),
      n,
      allowed,
    );
    slots.forEach((s, i) => {
      const x = xs[i] ?? centreX(n);
      if (s.key.startsWith("\u0001")) {
        const entry = buses.get(s.key.slice(1));
        if (entry === undefined) return;
        entry.bus.port = x;
        for (const pl of entry.bus.members) {
          if (entry.src) pl.srcPort = x;
          else pl.dstPort = x;
          if (first.side === "bottom") mark(above, g, { x, plan: pl });
        }
        return;
      }
      if (s.src) s.plan.srcPort = x;
      else s.plan.dstPort = x;
      if (first.side === "bottom") mark(above, g, { x, plan: s.plan });
    });
  }
}

function median(xs: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
  const a = xs[Math.floor((n - 1) / 2)] ?? 0;
  const b = xs[Math.floor(n / 2)] ?? 0;
  return (a + b) / 2;
}

/** The ways ports may sit on a side, best first: pitch, corner inset, and clearance from the far boundary. */
const PORT_TIERS: { pitch: number; inset: number; clear: number }[] = [
  { pitch: ROUTE.portPitch, inset: ROUTE.portInset, clear: CLEAR },
  { pitch: ROUTE.portPitch, inset: ROUTE.portMin / 2 + 2, clear: CLEAR },
  { pitch: ROUTE.portMin, inset: ROUTE.portMin / 2 + 2, clear: CLEAR },
  { pitch: ROUTE.portMin, inset: ROUTE.portMin / 2 + 2, clear: CLEAR / 2 },
  { pitch: TRACK_MIN, inset: ROUTE.portMin / 2 + 2, clear: CLEAR / 2 },
  { pitch: 4, inset: 4, clear: CLEAR / 2 },
];

/**
 * Ports along one side, in order. The preferred pitch and corner inset come first;
 * when they would bend a line that could run straight, the ports that do not keep a
 * line straight may come closer to the corner, and then closer to each other. A
 * port keeps clear of the lines on the far boundary of its gutter.
 */
function portPositions(
  desired: number[],
  weights: number[],
  n: PNode,
  allowed: (i: number, x: number, radius: number) => boolean,
): number[] {
  // Arrowheads need the least port pitch: below it, a side is crowded, and only
  // fitting counts.
  let first: number[] | undefined;
  for (const t of PORT_TIERS) {
    const xs = onGrid(desired, weights, n.x + t.inset, n.x + n.w - t.inset, t.pitch, (i, x) =>
      allowed(i, x, t.clear),
    );
    if (xs === undefined) continue;
    if (t.pitch < ROUTE.portMin) return first ?? xs;
    first ??= xs;
    const bent = xs.some((x, i) => (weights[i] ?? 1) > 1 && x !== desired[i]);
    if (!bent) return xs;
  }
  if (first !== undefined) return first;
  // A side this crowded sits half a grid step off the far boundary's grid, so
  // that no two lines of its gutter share an x.
  return (
    onGrid(desired, weights, n.x + 2, n.x + n.w - 2, 4, (i, x) => allowed(i, x, 1), 2) ??
    onGrid(desired, weights, n.x + 2, n.x + n.w - 2, 4, (i, x) => allowed(i, x, 1)) ??
    evenly(desired.length, n.x + 2, n.x + n.w - 2)
  );
}

function evenly(count: number, lo: number, hi: number): number[] {
  if (count === 1) return [(lo + hi) / 2];
  return Array.from({ length: count }, (_, i) => lo + ((hi - lo) * i) / (count - 1));
}

/**
 * Positions on the 4 px grid, shifted by `offset`, inside [lo, hi], in the given
 * order, each at least `pitch` after the one before and each where `ok` allows
 * it, as close as possible to `want` in weighted squares. Undefined when they do
 * not fit.
 */
export function onGrid(
  want: number[],
  weights: number[],
  lo: number,
  hi: number,
  pitch: number,
  ok: (i: number, x: number) => boolean,
  offset = 0,
): number[] | undefined {
  const n = want.length;
  if (n === 0) return [];
  const g0 = Math.ceil((lo - offset) / 4 - EPS);
  const g1 = Math.floor((hi - offset) / 4 + EPS);
  const size = g1 - g0 + 1;
  const stride = Math.max(1, Math.ceil(pitch / 4 - EPS));
  if (size <= 0 || (n - 1) * stride > size - 1) return undefined;
  let prev = new Float64Array(size);
  const back: Int32Array[] = [];
  for (let i = 0; i < n; i++) {
    const cur = new Float64Array(size).fill(Number.POSITIVE_INFINITY);
    const arg = new Int32Array(size).fill(-1);
    let best = i === 0 ? 0 : Number.POSITIVE_INFINITY;
    let bestJ = -1;
    const w = weights[i] ?? 1;
    const d = want[i] ?? 0;
    for (let j = 0; j < size; j++) {
      if (i > 0) {
        const jp = j - stride;
        const pv = jp >= 0 ? (prev[jp] ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
        if (pv < best) {
          best = pv;
          bestJ = jp;
        }
      }
      if (best === Number.POSITIVE_INFINITY) continue;
      const x = (g0 + j) * 4 + offset;
      if (!ok(i, x)) continue;
      cur[j] = best + w * (x - d) * (x - d);
      arg[j] = bestJ;
    }
    back.push(arg);
    prev = cur;
  }
  let bj = -1;
  let bv = Number.POSITIVE_INFINITY;
  for (let j = 0; j < size; j++) {
    const v = prev[j] ?? Number.POSITIVE_INFINITY;
    if (v < bv) {
      bv = v;
      bj = j;
    }
  }
  if (bj < 0) return undefined;
  const out: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    out[i] = (g0 + bj) * 4 + offset;
    bj = back[i]?.[bj] ?? -1;
  }
  return out;
}

// Pass 2c: gutters ----------------------------------------------------------

/** Where a path enters gutter j of its path, and where it leaves it. */
function stubsOf(pl: Plan, j: number): [Stub, Stub] {
  const last = pl.gutters.length - 1;
  const entry: Stub =
    j === 0
      ? pl.turn !== undefined
        ? { x: pl.turn, top: pl.kind === "down" }
        : { x: pl.srcPort, top: pl.srcSide === "bottom" }
      : { x: pl.gapX[j - 1] ?? 0, top: pl.kind === "down" };
  const exit: Stub =
    j === last
      ? pl.turnIn !== undefined
        ? { x: pl.turnIn, top: pl.kind === "up" }
        : { x: pl.dstPort, top: pl.dstSide === "bottom" }
      : { x: pl.gapX[j] ?? 0, top: pl.kind === "up" };
  return [entry, exit];
}

function buildVisits(plans: Plan[], gutters: Visit[][], moved: Map<string, Set<number>>): void {
  const shared = new Map<string, Visit>();
  for (const pl of plans) {
    if (pl.kind === "neighbour") continue;
    const last = pl.gutters.length - 1;
    if (pl.label !== undefined) {
      // The longest run carries the label, unless its gutter could not hold it.
      const longest = (skip: Set<number> | undefined) => {
        let best = -1;
        let bestLen = -1;
        pl.gutters.forEach((_, j) => {
          if (skip?.has(j)) return;
          const [a, b] = stubsOf(pl, j);
          const len = Math.abs(a.x - b.x);
          if (len >= bestLen - EPS) {
            best = j;
            bestLen = len;
          }
        });
        return best;
      };
      const best = longest(moved.get(pl.edge.id));
      pl.labelAt = best >= 0 ? best : longest(undefined);
    }
    pl.visits = [];
    pl.gutters.forEach((g, j) => {
      const [entry, exit] = stubsOf(pl, j);
      const list = gutters[g];
      if (list === undefined) return;
      const trunk = trunkKey(pl, j);
      if (trunk !== undefined) {
        let visit = shared.get(trunk);
        if (visit === undefined) {
          visit = {
            id: `bus ${trunk}`,
            gutter: g,
            members: [],
            stubs: [entry],
            lo: entry.x,
            hi: entry.x,
            label: undefined,
            row: -1,
            bus: pl.bus?.id,
          };
          shared.set(trunk, visit);
          list.push(visit);
        }
        visit.members.push({ plan: pl, j });
        if (!visit.stubs.some((s) => s.x === exit.x && s.top === exit.top)) visit.stubs.push(exit);
        visit.lo = Math.min(visit.lo, exit.x);
        visit.hi = Math.max(visit.hi, exit.x);
        pl.visits[j] = visit;
        return;
      }
      const label: VisitLabel | undefined =
        pl.label !== undefined && pl.labelAt === j
          ? {
              edgeId: pl.edge.id,
              mode: "above",
              x0: 0,
              w: pl.label.w,
              h: pl.label.h,
              lines: 1,
              maxWidth: Number.POSITIVE_INFINITY,
              narrower: pl.label.narrower,
            }
          : undefined;
      const visit: Visit = {
        id: pl.edge.id,
        gutter: g,
        members: [{ plan: pl, j }],
        stubs: [entry, exit],
        lo: Math.min(entry.x, exit.x),
        hi: Math.max(entry.x, exit.x),
        label,
        row: -1,
      };
      // The lines of a fan-in meet at its port, each on its own row.
      if (pl.fanIn !== undefined && j === last) visit.bus = pl.fanIn.id;
      list.push(visit);
      pl.visits[j] = visit;
    });
  }
  for (const visit of shared.values()) stagger(visit, gutters[visit.gutter]);
}

/**
 * A trunk that goes on straight through its run, with branches on both sides,
 * would meet them in a junction that reads as a crossing. The branches on each
 * side then take a run of their own, on different rows (D25 rule 4).
 */
function stagger(visit: Visit, list: Visit[] | undefined): void {
  const entry = visit.stubs[0];
  if (entry === undefined || list === undefined) return;
  const exits = visit.stubs.slice(1);
  const on = (s: Stub) => Math.abs(s.x - entry.x) < EPS;
  const straight = exits.some((s) => on(s) && s.top !== entry.top);
  const left = exits.filter((s) => s.x < entry.x - EPS);
  const right = exits.filter((s) => s.x > entry.x + EPS);
  if (!straight || left.length === 0 || right.length === 0) return;
  const part = (id: string, stubs: Stub[]): Visit => ({
    ...visit,
    id,
    members: [],
    stubs: [entry, ...stubs],
    lo: Math.min(entry.x, ...stubs.map((s) => s.x)),
    hi: Math.max(entry.x, ...stubs.map((s) => s.x)),
  });
  const a = part(`${visit.id} <`, [...left, ...exits.filter(on)]);
  const b = part(`${visit.id} >`, right);
  for (const m of visit.members) {
    const exit = stubsOf(m.plan, m.j)[1];
    const into = exit.x > entry.x + EPS ? b : a;
    into.members.push(m);
    m.plan.visits[m.j] = into;
  }
  const at = list.indexOf(visit);
  if (at >= 0) list.splice(at, 1, a, b);
}

// Pass 3: assembly ----------------------------------------------------------

/** Everything vertical, decided after the rows are known. Absolute px. */
export interface Vertical {
  /** Absolute x of the centre line. */
  centre: number;
  top(n: PNode): number;
  /** The middle of a layer's row, for edges between neighbours. */
  rowMid(layer: number): number;
  trackY(gutter: number, row: number): number;
}

export interface AssembledLabel extends Rect {
  /** Lines the label takes; more than one wraps it at maxWidth. */
  lines: number;
  maxWidth: number;
}

export interface AssembledEdge {
  points: Point[];
  label: AssembledLabel | undefined;
}

export function assemble(r: Routing, geo: Vertical): Map<string, AssembledEdge> {
  const out = new Map<string, AssembledEdge>();
  const X = (x: number) => geo.centre + x;
  for (const pl of r.plans) {
    const { u, v } = pl;
    if (pl.kind === "neighbour") {
      const right = pl.srcSide === "right";
      const ys = geo.rowMid(u.layer) + pl.srcPort;
      const yt = geo.rowMid(v.layer) + pl.dstPort;
      const pts = [
        { x: X(right ? u.x + u.w : u.x), y: ys },
        { x: X(right ? v.x : v.x + v.w), y: yt },
      ];
      if (ys !== yt) {
        const mx = (pts[0]?.x ?? 0) / 2 + (pts[1]?.x ?? 0) / 2;
        pts.splice(1, 0, { x: mx, y: ys }, { x: mx, y: yt });
      }
      const sl = pl.sideLabel;
      const mode = pl.side?.label;
      const label =
        sl === undefined || mode === undefined
          ? undefined
          : {
              x: X(sl.x0),
              y: mode === "above" ? ys - ROUTE.labelGap - sl.h : ys + ROUTE.labelGap,
              w: sl.w,
              h: sl.h,
              lines: 1,
              maxWidth: Number.POSITIVE_INFINITY,
            };
      out.set(pl.edge.id, { points: simplify(pts), label });
      continue;
    }
    const pts: Point[] = [];
    let cur = pl.srcPort;
    if (pl.turn !== undefined) {
      // A side exit: out of the side at the row's middle, then along the row to the turn.
      const my = geo.rowMid(u.layer) + pl.srcPort;
      pts.push({ x: X(pl.srcSide === "left" ? u.x : u.x + u.w), y: my }, { x: X(pl.turn), y: my });
      cur = pl.turn;
    } else {
      const sy = pl.srcSide === "bottom" ? geo.top(u) + u.h : geo.top(u);
      pts.push({ x: X(pl.srcPort), y: sy });
    }
    let label: AssembledLabel | undefined;
    const last = pl.gutters.length - 1;
    pl.gutters.forEach((g, j) => {
      const visit = pl.visits[j];
      const next = j === last ? (pl.turnIn ?? pl.dstPort) : (pl.gapX[j] ?? cur);
      if (visit === undefined || visit.row < 0) {
        cur = next;
        return;
      }
      const y = geo.trackY(g, visit.row);
      const d = visit.detour;
      if (d !== undefined) {
        // stubs[0] is where the path enters this gutter, stubs[1] where it leaves.
        const y0 = geo.trackY(g, d.rows[0] ?? visit.row);
        const y1 = geo.trackY(g, d.rows[1] ?? visit.row);
        pts.push({ x: X(cur), y: y0 }, { x: X(d.x), y: y0 }, { x: X(d.x), y: y1 });
        pts.push({ x: X(next), y: y1 });
      } else pts.push({ x: X(cur), y }, { x: X(next), y });
      cur = next;
      const lab = visit.label;
      if (lab !== undefined && pl.labelAt === j) {
        const ly =
          lab.mode === "above"
            ? y - ROUTE.labelGap - lab.h
            : lab.mode === "below"
              ? y + ROUTE.labelGap
              : y - lab.h / 2;
        label = {
          x: X(lab.x0),
          y: ly,
          w: lab.w,
          h: lab.h,
          lines: lab.lines,
          maxWidth: lab.maxWidth,
        };
      }
    });
    if (pl.turnIn !== undefined) {
      // A side entry: on beside the target to the row's middle, then into its side.
      const my = geo.rowMid(v.layer) + pl.dstPort;
      pts.push(
        { x: X(pl.turnIn), y: my },
        { x: X(pl.dstSide === "left" ? v.x : v.x + v.w), y: my },
      );
    } else {
      const ty = pl.dstSide === "bottom" ? geo.top(v) + v.h : geo.top(v);
      pts.push({ x: X(pl.dstPort), y: ty });
    }
    out.set(pl.edge.id, { points: simplify(pts), label });
  }
  return out;
}

export function round2(n: number): number {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r;
}

/** Rounds to 2 decimals, drops repeated points and the middle points of straight runs. */
export function simplify(points: Point[]): Point[] {
  const pts: Point[] = [];
  for (const p of points) {
    const q = { x: round2(p.x), y: round2(p.y) };
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
