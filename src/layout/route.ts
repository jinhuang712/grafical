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

import type { Edge } from "../model/types.ts";
import type { Point, Rect } from "../scene.ts";
import { ROUTE } from "../theme/geometry.ts";
import { routeGutter } from "./gutter.ts";
import { centreX, type PLayer, type PNode } from "./place.ts";

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
  bus: Bus | undefined;
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
/** The weight of a port or gap track that keeps its line straight. */
const STRAIGHT = 16;

export function routeAcross(
  layers: PLayer[],
  nodes: Map<string, PNode>,
  edges: Edge[],
  labels: Map<string, LabelBox>,
  pitch: number,
): Routing {
  const gapsByLayer = layers.map((l) => gapsOf(l));
  const sorted = [...edges].sort((a, b) => cmp(a.id, b.id));
  const side = sideBySide(sorted, nodes, labels);
  const plans: Plan[] = [];
  for (const edge of sorted) {
    const pl = makePlan(edge, nodes, labels, side);
    if (pl !== undefined) plans.push(pl);
  }
  assignBuses(plans);
  chooseGaps(plans, gapsByLayer);
  assignGapTracks(plans);
  assignPorts(plans);

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

function gapsOf(l: PLayer): Gap[] {
  const pad = ROUTE.gapPad;
  const gaps: Gap[] = [];
  let lo = Number.NEGATIVE_INFINITY;
  l.nodes.forEach((n, k) => {
    gaps.push({ layer: l.index, k, lo, hi: n.x - pad });
    lo = n.x + n.w + pad;
  });
  gaps.push({ layer: l.index, k: l.nodes.length, lo, hi: Number.POSITIVE_INFINITY });
  return gaps;
}

/** How many vertical tracks a gap holds. Outer gaps are open, so they hold any number. */
function capacity(gap: Gap): number {
  if (!Number.isFinite(gap.lo) || !Number.isFinite(gap.hi)) return Number.POSITIVE_INFINITY;
  return Math.floor((gap.hi - gap.lo) / TRACK_MIN + EPS) + 1;
}

const gapKey = (g: Gap) => `${g.layer}:${g.k}`;

// Pass 1: paths -------------------------------------------------------------

/** The offsets of ports on a left or right side, from the middle of the row. */
function sidePitch(count: number, h: number): number | undefined {
  const room = h - 2 * ROUTE.portMin;
  if ((count - 1) * ROUTE.portPitch <= room) return ROUTE.portPitch;
  if ((count - 1) * TRACK_MIN <= room) return TRACK_MIN;
  return undefined;
}

/**
 * The unlabelled edges between two neighbours that run straight across their gap.
 * The sides hold a few; the rest go round through the gutter below, as a u-turn.
 */
function sideBySide(
  edges: Edge[],
  nodes: Map<string, PNode>,
  labels: Map<string, LabelBox>,
): Set<string> {
  const pairs = new Map<string, Edge[]>();
  for (const e of edges) {
    const u = nodes.get(e.from);
    const v = nodes.get(e.to);
    if (u === undefined || v === undefined || u === v || u.layer !== v.layer) continue;
    if (Math.abs(u.order - v.order) !== 1 || labels.has(e.id)) continue;
    const key = u.order < v.order ? `${u.id}\u0000${v.id}` : `${v.id}\u0000${u.id}`;
    const list = pairs.get(key);
    if (list === undefined) pairs.set(key, [e]);
    else list.push(e);
  }
  const out = new Set<string>();
  for (const list of pairs.values()) {
    const first = list[0];
    const u = first === undefined ? undefined : nodes.get(first.from);
    const v = first === undefined ? undefined : nodes.get(first.to);
    if (u === undefined || v === undefined) continue;
    const h = Math.min(u.h, v.h);
    let count = list.length;
    while (count > 0 && sidePitch(count, h) === undefined) count--;
    for (const e of list.slice(0, count)) out.add(e.id);
  }
  return out;
}

function makePlan(
  edge: Edge,
  nodes: Map<string, PNode>,
  labels: Map<string, LabelBox>,
  sideways: Set<string>,
): Plan | undefined {
  const u = nodes.get(edge.from);
  const v = nodes.get(edge.to);
  if (u === undefined || v === undefined) return undefined;
  const label = labels.get(edge.id);
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
  };
  if (u.layer === v.layer) {
    if (sideways.has(edge.id)) {
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

/** A fan-out of unlabelled edges of one kind from one node side leaves as a bus. */
function assignBuses(plans: Plan[]): void {
  const groups = new Map<string, Plan[]>();
  for (const pl of plans) {
    if (pl.kind === "neighbour" || pl.label !== undefined || pl.u === pl.v) continue;
    const key = `${pl.u.id}:${pl.srcSide}:${pl.edge.kind}`;
    const list = groups.get(key);
    if (list === undefined) groups.set(key, [pl]);
    else list.push(pl);
  }
  for (const key of [...groups.keys()].sort(cmp)) {
    const members = groups.get(key) ?? [];
    if (members.length < ROUTE.busMin) continue;
    const bus: Bus = { id: key, members, port: 0 };
    for (const pl of members) pl.bus = bus;
  }
}

/**
 * The gap each path takes through each layer it crosses: the one that keeps the
 * line closest to its way, unless that gap is full. Edges choose in id order. The
 * outer gaps are never full, so every path finds one.
 */
function chooseGaps(plans: Plan[], gapsByLayer: Gap[][]): void {
  const load = new Map<string, Set<string>>();
  for (const pl of plans) {
    if (pl.between.length === 0) continue;
    const xs = centreX(pl.u);
    const xt = centreX(pl.v);
    const ideal = [xs];
    let cur = xs;
    for (const m of pl.between) {
      let best: Gap | undefined;
      let bestKey = "";
      let bestCost = Number.POSITIVE_INFINITY;
      let bestMove = Number.POSITIVE_INFINITY;
      for (const gap of gapsByLayer[m] ?? []) {
        if (gap.hi < gap.lo) continue;
        const key = trackKey(pl, [...pl.gaps, gap]);
        const used = load.get(gapKey(gap));
        if (used !== undefined && !used.has(key) && used.size >= capacity(gap)) continue;
        const travel = dist(cur, gap.lo, gap.hi) + dist(xt, gap.lo, gap.hi);
        const move = dist(cur, gap.lo, gap.hi);
        if (travel < bestCost - EPS || (Math.abs(travel - bestCost) <= EPS && move < bestMove)) {
          best = gap;
          bestKey = key;
          bestCost = travel;
          bestMove = move;
        }
      }
      if (best === undefined) continue;
      pl.gaps.push(best);
      const k = gapKey(best);
      const used = load.get(k);
      if (used === undefined) load.set(k, new Set([bestKey]));
      else used.add(bestKey);
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
  around: number;
  /** A track that continues the line above or below it straight weighs more. */
  weight: number;
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
        around: (pl.ideal[j] ?? 0) + (pl.ideal[j + 2] ?? 0),
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
    list.sort((a, b) => a.ideal - b.ideal || a.around - b.around || cmp(a.key, b.key));
    const first = list[0];
    if (first === undefined) continue;
    const want = list.map((t) => t.ideal);
    const weights = list.map((t) => t.weight);
    let { lo, hi } = first.gap;
    // An outer gap is open on one side: bound it near its tracks.
    const reach = (list.length + 1) * ROUTE.portPitch;
    lo = Math.max(lo, Math.min(...want) - reach);
    hi = Math.min(hi, Math.max(...want) + reach);
    const facing = placed.get(first.gap.layer - 1) ?? [];
    const clear = (i: number, x: number, radius: number) => {
      const own = list[i]?.members.map((m) => m.pl) ?? [];
      return facing.every(
        (f) => Math.abs(f.x - x) >= radius || f.plans.some((p) => own.includes(p)),
      );
    };
    // The port pitch where the gap has room, so that lines from neighbouring ports
    // pass through it straight; closer where it has less.
    let xs: number[] | undefined;
    for (const radius of [CLEAR, CLEAR / 2]) {
      for (const pitch of [ROUTE.portPitch, ROUTE.gapPitch, TRACK_MIN]) {
        xs = onGrid(want, weights, lo, hi, pitch, (i, x) => clear(i, x, radius));
        if (xs !== undefined) break;
      }
      if (xs !== undefined) break;
    }
    // A full gap sits half a grid step off the tracks above it.
    xs ??= onGrid(want, weights, lo, hi, TRACK_MIN, (i, x) => clear(i, x, 1), 2);
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

// Pass 2b: ports ------------------------------------------------------------

interface End {
  plan: Plan;
  src: boolean;
  node: PNode;
  side: Side;
  /** Where the port would like to be: toward the edge's next waypoint. */
  desired: number;
  /** The far end's placement-only x: a tie-breaker. */
  far: number;
  /** How much moving this port would cost: a port that keeps a line straight weighs more. */
  weight: number;
  key: string;
}

/** A line on a gutter boundary that a port on the far boundary keeps clear of. */
interface Mark {
  x: number;
  plan: Plan;
}

function assignPorts(plans: Plan[]): void {
  const sides = new Map<string, End[]>();
  const push = (end: End) => {
    const k = `${end.node.id}\u0000${end.side}`;
    const list = sides.get(k);
    if (list === undefined) sides.set(k, [end]);
    else list.push(end);
  };
  const inset = ROUTE.portInset;
  const within = (n: PNode, x: number) => clamp(x, n.x + inset, n.x + n.w - inset);
  for (const pl of plans) {
    const { u, v } = pl;
    if (pl.kind === "neighbour") {
      for (const src of [true, false]) {
        push({
          plan: pl,
          src,
          node: src ? u : v,
          side: src ? pl.srcSide : pl.dstSide,
          desired: 0,
          far: 0,
          weight: 1,
          key: "",
        });
      }
      continue;
    }
    let ds: number;
    let dt: number;
    let ws = 1;
    let wt = 1;
    if (u === v) {
      const c = centreX(u);
      ds = c - ROUTE.portPitch;
      dt = c + ROUTE.portPitch;
    } else if (pl.kind === "uturn") {
      ds = within(u, centreX(v));
      dt = within(v, centreX(u));
    } else if (pl.gaps.length > 0) {
      const toGap = pl.gapX[0] ?? pl.ideal[1] ?? centreX(v);
      const fromGap = pl.gapX[pl.gapX.length - 1] ?? pl.ideal[pl.ideal.length - 2] ?? centreX(u);
      ds = step(toGap, u.x + inset, u.x + u.w - inset);
      dt = step(fromGap, v.x + inset, v.x + v.w - inset);
      if (ds === toGap) ws = STRAIGHT;
      if (dt === fromGap) wt = STRAIGHT;
    } else {
      const lo = Math.max(u.x, v.x) + inset;
      const hi = Math.min(u.x + u.w, v.x + v.w) - inset;
      if (hi >= lo) {
        ds = snap(clamp((centreX(u) + centreX(v)) / 2, lo, hi));
        dt = ds;
        ws = STRAIGHT;
        wt = STRAIGHT;
      } else {
        ds = within(u, centreX(v));
        dt = within(v, centreX(u));
      }
    }
    push({
      plan: pl,
      src: true,
      node: u,
      side: pl.srcSide,
      desired: ds,
      far: centreX(v),
      weight: ws,
      key: "",
    });
    push({
      plan: pl,
      src: false,
      node: v,
      side: pl.dstSide,
      desired: dt,
      far: centreX(u),
      weight: wt,
      key: "",
    });
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
  }

  // Bottom sides first, clear of the gap tracks below them; then top sides, clear
  // of everything on the boundary above them.
  const keys = [...sides.keys()].sort(cmp);
  const order = [
    ...keys.filter((k) => sides.get(k)?.[0]?.side === "bottom"),
    ...keys.filter((k) => sides.get(k)?.[0]?.side === "top"),
    ...keys.filter((k) => {
      const s = sides.get(k)?.[0]?.side;
      return s === "left" || s === "right";
    }),
  ];
  for (const k of order) {
    const ends = sides.get(k) ?? [];
    const first = ends[0];
    if (first === undefined) continue;
    const n = first.node;
    if (first.side === "left" || first.side === "right") {
      ends.sort((a, b) => cmp(a.plan.edge.id, b.plan.edge.id));
      const other = first.src ? first.plan.v : first.plan.u;
      const pitch = sidePitch(ends.length, Math.min(n.h, other.h)) ?? TRACK_MIN;
      ends.forEach((end, i) => {
        const y = snap((i - (ends.length - 1) / 2) * pitch);
        if (end.src) end.plan.srcPort = y;
        else end.plan.dstPort = y;
      });
      continue;
    }
    // A bus leaves through one port, placed like a single end.
    const slots: End[] = [];
    const buses = new Map<string, { bus: Bus; ends: End[] }>();
    for (const end of ends) {
      const bus = end.src ? end.plan.bus : undefined;
      if (bus === undefined) {
        slots.push({ ...end, key: end.plan.edge.id });
        continue;
      }
      const entry = buses.get(bus.id);
      if (entry === undefined) buses.set(bus.id, { bus, ends: [end] });
      else entry.ends.push(end);
    }
    for (const id of [...buses.keys()].sort(cmp)) {
      const entry = buses.get(id);
      const representative = entry?.ends[0];
      if (entry === undefined || representative === undefined) continue;
      slots.push({
        ...representative,
        desired: median(entry.ends.map((e) => e.desired).sort((a, b) => a - b)),
        far: median(entry.ends.map((e) => e.far).sort((a, b) => a - b)),
        weight: 1,
        key: `\u0001${id}`,
      });
    }
    slots.sort((a, b) => a.desired - b.desired || a.far - b.far || cmp(a.key, b.key));

    const g = first.side === "bottom" ? n.layer : n.layer - 1;
    const facing = (first.side === "bottom" ? below.get(g) : above.get(g)) ?? [];
    const busOf = (pl: Plan) => pl.bus?.id;
    const allowed = (i: number, x: number, radius: number) => {
      const s = slots[i];
      if (s === undefined) return true;
      const own = s.plan;
      for (const f of facing) {
        if (Math.abs(f.x - x) >= radius) continue;
        if (f.plan === own) continue;
        if (own.bus !== undefined && busOf(f.plan) === own.bus.id) continue;
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
        for (const pl of entry.bus.members) pl.srcPort = x;
        mark(above, g, { x, plan: s.plan });
        for (const pl of entry.bus.members) mark(above, g, { x, plan: pl });
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

function buildVisits(plans: Plan[], gutters: Visit[][], moved: Map<string, Set<number>>): void {
  const shared = new Map<string, Visit>();
  for (const pl of plans) {
    if (pl.kind === "neighbour") continue;
    const last = pl.gutters.length - 1;
    const stubsOf = (j: number): [Stub, Stub] => {
      const entry: Stub =
        j === 0
          ? { x: pl.srcPort, top: pl.srcSide === "bottom" }
          : { x: pl.gapX[j - 1] ?? 0, top: pl.kind === "down" };
      const exit: Stub =
        j === last
          ? { x: pl.dstPort, top: pl.dstSide === "bottom" }
          : { x: pl.gapX[j] ?? 0, top: pl.kind === "up" };
      return [entry, exit];
    };
    if (pl.label !== undefined) {
      // The longest run carries the label, unless its gutter could not hold it.
      const longest = (skip: Set<number> | undefined) => {
        let best = -1;
        let bestLen = -1;
        pl.gutters.forEach((_, j) => {
          if (skip?.has(j)) return;
          const [a, b] = stubsOf(j);
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
      const [entry, exit] = stubsOf(j);
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
      list.push(visit);
      pl.visits[j] = visit;
    });
  }
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
      out.set(pl.edge.id, { points: simplify(pts), label: undefined });
      continue;
    }
    const sy = pl.srcSide === "bottom" ? geo.top(u) + u.h : geo.top(u);
    const ty = pl.dstSide === "bottom" ? geo.top(v) + v.h : geo.top(v);
    const pts: Point[] = [{ x: X(pl.srcPort), y: sy }];
    let cur = pl.srcPort;
    let label: AssembledLabel | undefined;
    const last = pl.gutters.length - 1;
    pl.gutters.forEach((g, j) => {
      const visit = pl.visits[j];
      const next = j === last ? pl.dstPort : (pl.gapX[j] ?? cur);
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
    pts.push({ x: X(pl.dstPort), y: ty });
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
