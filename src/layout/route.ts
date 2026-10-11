// The gap router (DESIGN.md D11): orthogonal routes through the gutters between
// layers and the gaps between neighbouring nodes, never through a node.
//
// It works in three passes, so that a change spreads to another channel only
// through edges that use both:
// 1. Path: each edge's sides, gutters and gaps depend only on the placement and
//    on the edge itself.
// 2. Channels: each node side places its ports, each gap its vertical tracks and
//    each gutter its rows and labels, from the edges inside that channel alone and
//    from keys that come from the placement.
// 3. Assembly: each route is built from its ports, gap tracks and rows.
//
// Everything here is across only, in x relative to the centre line. Gutter rows are
// counted here; their heights and every y come later, in assembly.

import type { Edge, EdgeKind } from "../model/types.ts";
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
  /** gaps[j] lies between gutters[j] and gutters[j + 1]. */
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

interface Stub {
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
}

export interface VisitLabel {
  edgeId: string;
  /** above or below the run, or beside a straight vertical line. */
  mode: "above" | "below" | "beside";
  x0: number;
  w: number;
  h: number;
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

export function routeAcross(
  layers: PLayer[],
  nodes: Map<string, PNode>,
  edges: Edge[],
  labels: Map<string, LabelBox>,
  pitch: number,
): Routing {
  const gapsByLayer = layers.map((l) => gapsOf(l));
  const sorted = [...edges].sort((a, b) => cmp(a.id, b.id));
  const plans: Plan[] = [];
  for (const edge of sorted) {
    const pl = makePlan(edge, nodes, gapsByLayer, labels);
    if (pl !== undefined) plans.push(pl);
  }
  assignPorts(plans);
  assignGapTracks(plans);
  const gutters: Visit[][] = layers.map(() => []);
  buildVisits(plans, gutters);
  const rows = gutters.map((vs) => routeGutter(vs, pitch));

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

// Pass 1: paths -------------------------------------------------------------

function makePlan(
  edge: Edge,
  nodes: Map<string, PNode>,
  gapsByLayer: Gap[][],
  labels: Map<string, LabelBox>,
): Plan | undefined {
  const u = nodes.get(edge.from);
  const v = nodes.get(edge.to);
  if (u === undefined || v === undefined) return undefined;
  const label = labels.get(edge.id);
  const base = {
    edge,
    u,
    v,
    srcPort: 0,
    dstPort: 0,
    gapX: [],
    visits: [],
    label,
    labelAt: -1,
    bus: undefined,
  };
  if (u.layer === v.layer) {
    if (u !== v && Math.abs(u.order - v.order) === 1 && label === undefined) {
      const right = u.order < v.order;
      return {
        ...base,
        kind: "neighbour",
        srcSide: right ? "right" : "left",
        dstSide: right ? "left" : "right",
        gutters: [],
        gaps: [],
        ideal: [centreX(u), centreX(v)],
      };
    }
    return {
      ...base,
      kind: "uturn",
      srcSide: "bottom",
      dstSide: "bottom",
      gutters: [u.layer],
      gaps: [],
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
  const xs = centreX(u);
  const xt = centreX(v);
  const gaps: Gap[] = [];
  const ideal = [xs];
  let cur = xs;
  for (const m of between) {
    let best: Gap | undefined;
    let bestCost = Number.POSITIVE_INFINITY;
    let bestMove = Number.POSITIVE_INFINITY;
    for (const gap of gapsByLayer[m] ?? []) {
      if (gap.hi < gap.lo) continue;
      const travel = dist(cur, gap.lo, gap.hi) + dist(xt, gap.lo, gap.hi);
      const move = dist(cur, gap.lo, gap.hi);
      if (travel < bestCost - EPS || (Math.abs(travel - bestCost) <= EPS && move < bestMove)) {
        best = gap;
        bestCost = travel;
        bestMove = move;
      }
    }
    if (best === undefined) return undefined;
    gaps.push(best);
    cur = step(cur, best.lo, best.hi);
    ideal.push(cur);
  }
  ideal.push(xt);
  return {
    ...base,
    kind: down ? "down" : "up",
    srcSide: down ? "bottom" : "top",
    dstSide: down ? "top" : "bottom",
    gutters,
    gaps,
    ideal,
  };
}

// Pass 2a: ports ------------------------------------------------------------

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

/** The weight of a port or gap track that keeps its line straight. */
const STRAIGHT = 16;

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
      push({
        plan: pl,
        src: true,
        node: u,
        side: pl.srcSide,
        desired: 0,
        far: 0,
        weight: 1,
        key: "",
      });
      push({
        plan: pl,
        src: false,
        node: v,
        side: pl.dstSide,
        desired: 0,
        far: 0,
        weight: 1,
        key: "",
      });
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
      const toGap = pl.ideal[1] ?? centreX(v);
      const fromGap = pl.ideal[pl.ideal.length - 2] ?? centreX(u);
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

  for (const k of [...sides.keys()].sort(cmp)) {
    const ends = sides.get(k) ?? [];
    const first = ends[0];
    if (first === undefined) continue;
    const n = first.node;
    if (first.side === "left" || first.side === "right") {
      ends.sort((a, b) => cmp(a.plan.edge.id, b.plan.edge.id));
      ends.forEach((end, i) => {
        const y = snap((i - (ends.length - 1) / 2) * ROUTE.portPitch);
        if (end.src) end.plan.srcPort = y;
        else end.plan.dstPort = y;
      });
      continue;
    }
    // A fan-out of unlabelled edges of one kind leaves through one port, as a bus.
    const slots: End[] = [];
    const byKind = new Map<EdgeKind, End[]>();
    for (const end of ends) {
      const pl = end.plan;
      const busable = end.src && pl.label === undefined && pl.u !== pl.v;
      if (!busable) {
        slots.push({ ...end, key: pl.edge.id });
        continue;
      }
      const list = byKind.get(pl.edge.kind);
      if (list === undefined) byKind.set(pl.edge.kind, [end]);
      else list.push(end);
    }
    const buses: { bus: Bus; ends: End[] }[] = [];
    for (const [kind, list] of [...byKind].sort((a, b) => cmp(a[0], b[0]))) {
      if (list.length < ROUTE.busMin) {
        for (const end of list) slots.push({ ...end, key: end.plan.edge.id });
        continue;
      }
      const ds = list.map((e) => e.desired).sort((a, b) => a - b);
      const fs = list.map((e) => e.far).sort((a, b) => a - b);
      const bus: Bus = {
        id: `${n.id}:${first.side}:${kind}`,
        members: list.map((e) => e.plan),
        port: 0,
      };
      for (const pl of bus.members) pl.bus = bus;
      buses.push({ bus, ends: list });
      const representative = list[0];
      if (representative === undefined) continue;
      slots.push({
        ...representative,
        desired: median(ds),
        far: median(fs),
        weight: 1,
        key: `\u0001${bus.id}`,
      });
    }
    slots.sort((a, b) => a.desired - b.desired || a.far - b.far || cmp(a.key, b.key));
    const xs = portPositions(
      slots.map((s) => s.desired),
      slots.map((s) => s.weight),
      n,
    );
    slots.forEach((s, i) => {
      const x = xs[i] ?? centreX(n);
      if (s.key.startsWith("\u0001")) {
        const b = buses.find((bb) => `\u0001${bb.bus.id}` === s.key);
        if (b === undefined) return;
        b.bus.port = x;
        for (const pl of b.bus.members) pl.srcPort = x;
        return;
      }
      if (s.src) s.plan.srcPort = x;
      else s.plan.dstPort = x;
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

/**
 * Ports along one side, in order. The preferred pitch and corner inset come first;
 * when they would bend a line that could run straight, the ports that do not keep a
 * line straight may come closer to the corner, and then closer to each other.
 */
function portPositions(desired: number[], weights: number[], n: PNode): number[] {
  let first: number[] | undefined;
  for (const [pitch, inset] of [
    [ROUTE.portPitch, ROUTE.portInset],
    [ROUTE.portPitch, ROUTE.portMin / 2 + 2],
    [ROUTE.portMin, ROUTE.portMin / 2 + 2],
  ] as const) {
    const lo = n.x + inset;
    const hi = n.x + n.w - inset;
    if ((desired.length - 1) * pitch > hi - lo) continue;
    const xs = spread(desired, pitch, lo, hi, weights).map(snap);
    first ??= xs;
    const bent = xs.some((x, i) => (weights[i] ?? 1) > 1 && x !== desired[i]);
    if (!bent) return xs;
  }
  if (first !== undefined) return first;
  return spread(desired, ROUTE.portMin, n.x + ROUTE.portMin / 2, n.x + n.w - ROUTE.portMin / 2);
}

/**
 * Positions in the given order, each at least `pitch` after the one before, inside
 * [lo, hi], as close as possible to `want` (weighted least squares, by pooling
 * adjacent violators). When they cannot fit, they are spread evenly over the range.
 */
export function spread(
  want: number[],
  pitch: number,
  lo: number,
  hi: number,
  weights: number[] = [],
): number[] {
  const n = want.length;
  if (n === 0) return [];
  if ((n - 1) * pitch > hi - lo) {
    if (n === 1) return [(lo + hi) / 2];
    return want.map((_, i) => lo + ((hi - lo) * i) / (n - 1));
  }
  const blocks: { sum: number; weight: number; count: number }[] = [];
  want.forEach((w, i) => {
    const wt = weights[i] ?? 1;
    blocks.push({ sum: wt * (w - i * pitch), weight: wt, count: 1 });
    for (;;) {
      const b = blocks[blocks.length - 1];
      const a = blocks[blocks.length - 2];
      if (a === undefined || b === undefined || a.sum / a.weight < b.sum / b.weight) break;
      blocks.pop();
      a.sum += b.sum;
      a.weight += b.weight;
      a.count += b.count;
    }
  });
  const out: number[] = [];
  const qlo = lo;
  const qhi = hi - (n - 1) * pitch;
  for (const b of blocks) {
    const q = clamp(b.sum / b.weight, qlo, qhi);
    for (let c = 0; c < b.count; c++) out.push(q + out.length * pitch);
  }
  return out;
}

// Pass 2b: gap tracks -------------------------------------------------------

/**
 * The members of one bus that have passed the same gaps before gutter j share the
 * run in gutter j, and the trunk through the next gap they share.
 */
function trunkKey(pl: Plan, j: number): string | undefined {
  if (pl.bus === undefined) return undefined;
  const passed = pl.gaps.slice(0, j).map((g) => `${g.layer}:${g.k}`);
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
      const k = `${gap.layer}:${gap.k}`;
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
  for (const k of [...gaps.keys()].sort(cmp)) {
    const list = gaps.get(k) ?? [];
    list.sort((a, b) => a.ideal - b.ideal || a.around - b.around || cmp(a.key, b.key));
    const first = list[0];
    if (first === undefined) continue;
    const { lo, hi } = first.gap;
    // The port pitch where the gap has room, so that lines from neighbouring ports
    // pass through it straight.
    const pitch = (list.length - 1) * ROUTE.portPitch <= hi - lo ? ROUTE.portPitch : ROUTE.gapPitch;
    const xs = spread(
      list.map((t) => clamp(t.ideal, lo, hi)),
      pitch,
      lo,
      hi,
      list.map((t) => t.weight),
    );
    list.forEach((t, i) => {
      const x = xs[i] ?? t.ideal;
      const s = snap(x);
      for (const m of t.members) m.pl.gapX[m.j] = s >= lo - EPS && s <= hi + EPS ? s : x;
    });
  }
}

// Pass 2c: gutters ----------------------------------------------------------

function buildVisits(plans: Plan[], gutters: Visit[][]): void {
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
      let best = -1;
      let bestLen = -1;
      pl.gutters.forEach((_, j) => {
        const [a, b] = stubsOf(j);
        const len = Math.abs(a.x - b.x);
        if (len >= bestLen - EPS) {
          best = j;
          bestLen = len;
        }
      });
      pl.labelAt = best;
    }
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
      const label =
        pl.label !== undefined && pl.labelAt === j
          ? { edgeId: pl.edge.id, mode: "above" as const, x0: 0, w: pl.label.w, h: pl.label.h }
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

export interface AssembledEdge {
  points: Point[];
  label: Rect | undefined;
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
    let label: Rect | undefined;
    const last = pl.gutters.length - 1;
    pl.gutters.forEach((g, j) => {
      const visit = pl.visits[j];
      const next = j === last ? pl.dstPort : (pl.gapX[j] ?? cur);
      if (visit === undefined || visit.row < 0) {
        cur = next;
        return;
      }
      const y = geo.trackY(g, visit.row);
      pts.push({ x: X(cur), y }, { x: X(next), y });
      cur = next;
      const lab = visit.label;
      if (lab !== undefined && pl.labelAt === j) {
        const ly =
          lab.mode === "above"
            ? y - ROUTE.labelGap - lab.h
            : lab.mode === "below"
              ? y + ROUTE.labelGap
              : y - lab.h / 2;
        label = { x: X(lab.x0), y: ly, w: lab.w, h: lab.h };
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
