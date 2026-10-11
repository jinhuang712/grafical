// Our own router: orthogonal segments through the gutters between layers and the
// gaps between neighbouring nodes (D11).
//
// Stable by construction, as far as the spike goes:
// - each edge's path (which gutters and gaps it uses, and which node sides) depends
//   only on the placement and on the edge itself;
// - positions inside a channel (ports on a node side, tracks in a gap or a gutter)
//   depend only on the edges in that channel, and are decided from placement-only
//   keys, so a change in one channel does not spread to the next.

import { type Point, type Routes, simplify } from "./geom.js";
import type { Diagram, Edge } from "./model.js";
import type { PlacedNode, Placement } from "./place.js";

type Side = "top" | "bottom" | "left" | "right";

interface Gap {
  layer: number;
  k: number;
  left: number;
  right: number;
}

interface Plan {
  edge: Edge;
  u: PlacedNode;
  v: PlacedNode;
  srcSide: Side;
  dstSide: Side;
  kind: "vertical" | "neighbour" | "uturn";
  /** Gutter indices in path order. Gutter i lies below layer i. */
  gutters: number[];
  /** gaps[j] lies between gutters[j] and gutters[j + 1]. */
  gaps: Gap[];
  /** Placement-only x of each waypoint: source centre, each gap, target centre. */
  wx: number[];
  /** Filled in by the channel passes. */
  srcPort?: Point;
  dstPort?: Point;
  gapX: number[];
  gapKey: number[];
  trackY: number[];
}

const GAP_PAD = 10;
const GAP_PITCH = 12;
const GUTTER_PAD = 10;
const GUTTER_PITCH = 14;
const TRACK_SEPARATION = 20;
const PORT_CLEAR = 8;

/** Spike experiment: how gutter tracks are spaced. */
export const gapOptions: { tracks: "spread" | "fixed" } = { tracks: "spread" };

export function gapRoute(d: Diagram, p: Placement): Routes {
  const gapsByLayer = p.layers.map((l) => {
    const gaps: Gap[] = [];
    let left = p.contentLeft;
    l.nodes.forEach((n, k) => {
      gaps.push({ layer: l.index, k, left, right: n.x });
      left = n.x + n.w;
    });
    gaps.push({ layer: l.index, k: l.nodes.length, left, right: p.contentRight });
    return gaps;
  });

  const plans = d.edges.map((edge) => plan(edge, p, gapsByLayer));
  assignPorts(plans);
  assignGapTracks(plans);
  assignGutterTracks(plans, p);

  const routes: Routes = new Map();
  for (const pl of plans) routes.set(pl.edge.id, assemble(pl));
  return routes;
}

function node(p: Placement, id: string): PlacedNode {
  const n = p.nodes.get(id);
  if (n === undefined) throw new Error(`unknown node ${id}`);
  return n;
}

const cx = (n: PlacedNode) => n.x + n.w / 2;
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);
const dist = (x: number, lo: number, hi: number) => (x < lo ? lo - x : x > hi ? x - hi : 0);

function plan(edge: Edge, p: Placement, gapsByLayer: Gap[][]): Plan {
  const u = node(p, edge.from);
  const v = node(p, edge.to);
  const base = { edge, u, v, gapX: [], gapKey: [], trackY: [] };
  if (u.layer === v.layer) {
    if (Math.abs(u.order - v.order) === 1) {
      const left = u.order < v.order;
      const gap = gapsByLayer[u.layer]?.[Math.max(u.order, v.order)];
      if (gap === undefined) throw new Error("no gap");
      return {
        ...base,
        kind: "neighbour",
        srcSide: left ? "right" : "left",
        dstSide: left ? "left" : "right",
        gutters: [],
        gaps: [gap],
        wx: [cx(u), cx(v)],
      };
    }
    return {
      ...base,
      kind: "uturn",
      srcSide: "bottom",
      dstSide: "bottom",
      gutters: [u.layer],
      gaps: [],
      wx: [cx(u), cx(v)],
    };
  }
  const down = u.layer < v.layer;
  const gutters: number[] = [];
  const layersBetween: number[] = [];
  if (down) {
    for (let g = u.layer; g < v.layer; g++) gutters.push(g);
    for (let m = u.layer + 1; m < v.layer; m++) layersBetween.push(m);
  } else {
    for (let g = u.layer - 1; g >= v.layer; g--) gutters.push(g);
    for (let m = u.layer - 1; m > v.layer; m--) layersBetween.push(m);
  }
  const gaps: Gap[] = [];
  const wx = [cx(u)];
  let xCur = cx(u);
  const xTarget = cx(v);
  for (const m of layersBetween) {
    let best: Gap | undefined;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const gap of gapsByLayer[m] ?? []) {
      const lo = gap.left + GAP_PAD;
      const hi = gap.right - GAP_PAD;
      if (hi < lo) continue;
      const cost = dist(xCur, lo, hi) + dist(xTarget, lo, hi);
      if (cost < bestCost) {
        best = gap;
        bestCost = cost;
      }
    }
    if (best === undefined) throw new Error(`no gap in layer ${m}`);
    gaps.push(best);
    xCur = clamp(xCur, best.left + GAP_PAD, best.right - GAP_PAD);
    wx.push(xCur);
  }
  wx.push(xTarget);
  return {
    ...base,
    kind: "vertical",
    srcSide: down ? "bottom" : "top",
    dstSide: down ? "top" : "bottom",
    gutters,
    gaps,
    wx,
  };
}

interface End {
  pl: Plan;
  src: boolean;
  key: number;
  other: number;
}

function assignPorts(plans: Plan[]): void {
  const sides = new Map<string, End[]>();
  const push = (n: PlacedNode, side: Side, end: End) => {
    const k = `${n.id}:${side}`;
    const list = sides.get(k) ?? [];
    list.push(end);
    sides.set(k, list);
  };
  for (const pl of plans) {
    const last = pl.wx.length - 1;
    push(pl.u, pl.srcSide, { pl, src: true, key: pl.wx[1] ?? 0, other: cx(pl.v) });
    push(pl.v, pl.dstSide, { pl, src: false, key: pl.wx[last - 1] ?? 0, other: cx(pl.u) });
  }
  for (const [k, ends] of sides) {
    const side = k.slice(k.indexOf(":") + 1) as Side;
    ends.sort((a, b) => a.key - b.key || a.other - b.other || cmp(a.pl.edge.id, b.pl.edge.id));
    ends.forEach((end, i) => {
      const n = end.src ? end.pl.u : end.pl.v;
      const f = (i + 1) / (ends.length + 1);
      let pt: Point;
      if (side === "top") pt = { x: n.x + n.w * f, y: n.y };
      else if (side === "bottom") pt = { x: n.x + n.w * f, y: n.y + n.h };
      else if (side === "left") pt = { x: n.x, y: n.y + n.h * f };
      else pt = { x: n.x + n.w, y: n.y + n.h * f };
      if (end.src) end.pl.srcPort = pt;
      else end.pl.dstPort = pt;
    });
  }
  // A straight line when an edge is alone on both sides and the boxes overlap in x.
  for (const pl of plans) {
    if (pl.kind !== "vertical" || pl.gutters.length !== 1) continue;
    const alone = (n: PlacedNode, side: Side) => sides.get(`${n.id}:${side}`)?.length === 1;
    if (!alone(pl.u, pl.srcSide) || !alone(pl.v, pl.dstSide)) continue;
    const lo = Math.max(pl.u.x, pl.v.x) + 8;
    const hi = Math.min(pl.u.x + pl.u.w, pl.v.x + pl.v.w) - 8;
    if (hi < lo || pl.srcPort === undefined || pl.dstPort === undefined) continue;
    const x = (lo + hi) / 2;
    pl.srcPort = { x, y: pl.srcPort.y };
    pl.dstPort = { x, y: pl.dstPort.y };
  }
  // A top-side port right below a bottom-side port of another edge would make the two
  // edges run on top of each other. Both sides face the same gutter, so moving the
  // lower port cannot reach an edge outside that gutter.
  const bottoms: { x: number; layer: number; id: string }[] = [];
  for (const pl of plans) {
    if (pl.srcSide === "bottom" && pl.srcPort)
      bottoms.push({ x: pl.srcPort.x, layer: pl.u.layer, id: pl.edge.id });
    if (pl.dstSide === "bottom" && pl.dstPort)
      bottoms.push({ x: pl.dstPort.x, layer: pl.v.layer, id: pl.edge.id });
  }
  const nudge = (pt: Point, n: PlacedNode, id: string): Point => {
    const clash = bottoms.some(
      (b) => b.layer === n.layer - 1 && b.id !== id && Math.abs(b.x - pt.x) < PORT_CLEAR,
    );
    if (!clash) return pt;
    const x = pt.x + PORT_CLEAR <= n.x + n.w - 4 ? pt.x + PORT_CLEAR : pt.x - PORT_CLEAR;
    return { x, y: pt.y };
  };
  for (const pl of plans) {
    if (pl.srcSide === "top" && pl.srcPort) pl.srcPort = nudge(pl.srcPort, pl.u, pl.edge.id);
    if (pl.dstSide === "top" && pl.dstPort) pl.dstPort = nudge(pl.dstPort, pl.v, pl.edge.id);
  }
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function assignGapTracks(plans: Plan[]): void {
  const gaps = new Map<
    string,
    { gap: Gap; pl: Plan; j: number; ideal: number; above: number; below: number }[]
  >();
  for (const pl of plans) {
    if (pl.kind !== "vertical") continue;
    const down = pl.u.layer < pl.v.layer;
    pl.gaps.forEach((gap, j) => {
      const ideal = pl.wx[j + 1] ?? 0;
      const before = pl.wx[j] ?? 0;
      const after = pl.wx[j + 2] ?? 0;
      const k = `${gap.layer}:${gap.k}`;
      const list = gaps.get(k) ?? [];
      list.push({ gap, pl, j, ideal, above: down ? before : after, below: down ? after : before });
      gaps.set(k, list);
    });
  }
  for (const list of gaps.values()) {
    list.sort(
      (a, b) =>
        a.ideal - b.ideal ||
        a.above - b.above ||
        a.below - b.below ||
        cmp(a.pl.edge.id, b.pl.edge.id),
    );
    const first = list[0];
    if (first === undefined) continue;
    const lo = first.gap.left + GAP_PAD;
    const hi = first.gap.right - GAP_PAD;
    const pitch = list.length > 1 ? Math.min(GAP_PITCH, (hi - lo) / (list.length - 1)) : 0;
    // Exact positions may follow a port next to the gap, so a line can run straight.
    // Every edge in this gap also uses the gutters next to it, so this cannot reach
    // an edge outside those gutters. Decisions elsewhere use the ideal, not this.
    const xs = list.map((t) => {
      const port =
        t.j === 0 ? t.pl.srcPort : t.j === t.pl.gaps.length - 1 ? t.pl.dstPort : undefined;
      return port !== undefined && port.x >= lo && port.x <= hi ? port.x : clamp(t.ideal, lo, hi);
    });
    for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i] ?? 0, (xs[i - 1] ?? 0) + pitch);
    for (let i = xs.length - 1; i >= 0; i--) {
      const next = i + 1 < xs.length ? (xs[i + 1] ?? 0) - pitch : hi;
      xs[i] = Math.min(xs[i] ?? 0, next, hi);
    }
    list.forEach((t, i) => {
      t.pl.gapX[t.j] = xs[i] ?? t.ideal;
      // Decision key: the placement-only ideal, nudged by the stable order in the gap.
      t.pl.gapKey[t.j] = t.ideal + i * 1e-4;
    });
  }
}

interface Visit {
  pl: Plan;
  j: number;
  /** Stubs: where the edge enters or leaves the gutter, and from which boundary. */
  stubs: { x: number; key: number; top: boolean }[];
  lo: number;
  hi: number;
}

function assignGutterTracks(plans: Plan[], p: Placement): void {
  const gutters = new Map<number, Visit[]>();
  for (const pl of plans) {
    if (pl.kind === "neighbour") continue;
    const down = pl.u.layer < pl.v.layer;
    pl.gutters.forEach((g, j) => {
      const inX = j === 0 ? (pl.srcPort?.x ?? 0) : (pl.gapX[j - 1] ?? 0);
      const inKey = j === 0 ? inX : (pl.gapKey[j - 1] ?? 0);
      const last = j === pl.gutters.length - 1;
      const outX = last ? (pl.dstPort?.x ?? 0) : (pl.gapX[j] ?? 0);
      const outKey = last ? outX : (pl.gapKey[j] ?? 0);
      const stubs =
        pl.kind === "uturn"
          ? [
              { x: inX, key: inKey, top: true },
              { x: outX, key: outKey, top: true },
            ]
          : [
              { x: inX, key: inKey, top: down },
              { x: outX, key: outKey, top: !down },
            ];
      const list = gutters.get(g) ?? [];
      list.push({ pl, j, stubs, lo: Math.min(inKey, outKey), hi: Math.max(inKey, outKey) });
      gutters.set(g, list);
    });
  }

  for (const [g, visits] of gutters) {
    visits.sort((a, b) => cmp(a.pl.edge.id, b.pl.edge.id));
    // above[i] holds the visits that must run above visit i.
    const above = visits.map(() => new Set<number>());
    visits.forEach((a, i) => {
      visits.forEach((b, k) => {
        if (i === k) return;
        // Two stubs at the same x: the one from the top must end before the other starts.
        for (const s of a.stubs) {
          for (const t of b.stubs) {
            if (Math.abs(s.key - t.key) < 1 && s.top && !t.top) above[k]?.add(i);
          }
        }
        if (!(a.lo < b.hi && b.lo < a.hi)) return;
        for (const s of a.stubs) {
          if (s.key > b.lo && s.key < b.hi) {
            if (s.top) above[k]?.add(i);
            else above[i]?.add(k);
          }
        }
      });
    });
    // Topological order; a cycle is broken at the first remaining visit by edge ID.
    const order: number[] = [];
    const done = new Set<number>();
    while (order.length < visits.length) {
      let pick = -1;
      for (let i = 0; i < visits.length; i++) {
        if (done.has(i)) continue;
        const ready = [...(above[i] ?? [])].every((k) => done.has(k));
        if (ready) {
          pick = i;
          break;
        }
      }
      if (pick < 0) pick = visits.findIndex((_, i) => !done.has(i));
      order.push(pick);
      done.add(pick);
    }
    const track = new Map<number, number>();
    const byTrack: number[][] = [];
    for (const i of order) {
      const v = visits[i];
      if (v === undefined) continue;
      let t = 0;
      for (const k of above[i] ?? []) {
        const tk = track.get(k);
        if (tk !== undefined) t = Math.max(t, tk + 1);
      }
      const clash = (tt: number) =>
        (byTrack[tt] ?? []).some((k) => {
          const o = visits[k];
          return (
            o !== undefined && v.lo - TRACK_SEPARATION < o.hi && o.lo - TRACK_SEPARATION < v.hi
          );
        });
      while (clash(t)) t++;
      track.set(i, t);
      const row = byTrack[t] ?? [];
      row.push(i);
      byTrack[t] = row;
    }
    const tracks = byTrack.length;
    const layer = p.layers[g];
    const below = p.layers[g + 1];
    if (layer === undefined) continue;
    const top = layer.rowBottom;
    const bottom =
      below !== undefined ? below.rowTop : layer.band.y + layer.band.h + p.theme.layerGap / 2;
    const span = bottom - top - 2 * GUTTER_PAD;
    const pitch = tracks > 1 ? Math.min(GUTTER_PITCH, span / (tracks - 1)) : 0;
    const mid = (top + bottom) / 2;
    // "fixed": tracks sit on fixed slots, so a new track does not move the others.
    const slots = Math.floor(span / GUTTER_PITCH) + 1;
    visits.forEach((v, i) => {
      const t = track.get(i) ?? 0;
      v.pl.trackY[v.j] =
        gapOptions.tracks === "fixed" && tracks <= slots
          ? mid + (t - (slots - 1) / 2) * GUTTER_PITCH
          : mid + (t - (tracks - 1) / 2) * pitch;
    });
  }
}

function assemble(pl: Plan): Point[] {
  const s = pl.srcPort;
  const t = pl.dstPort;
  if (s === undefined || t === undefined) throw new Error(`no ports for ${pl.edge.id}`);
  if (pl.kind === "neighbour") {
    const y = (s.y + t.y) / 2;
    return simplify([
      { x: s.x, y },
      { x: t.x, y },
    ]);
  }
  const pts: Point[] = [s];
  let x = s.x;
  pl.gutters.forEach((_, j) => {
    const y = pl.trackY[j] ?? 0;
    pts.push({ x, y });
    const last = j === pl.gutters.length - 1;
    x = last ? t.x : (pl.gapX[j] ?? 0);
    pts.push({ x, y });
  });
  pts.push(t);
  return simplify(pts);
}
