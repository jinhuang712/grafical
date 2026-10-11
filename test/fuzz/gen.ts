// Random valid diagrams from fixed seeds, built by random operation sequences
// through the model's applyOps, the way an agent builds one. An operation the
// model rejects (an alignment that cannot hold, say) is dropped, as an agent
// would drop it, so every diagram that comes out is valid.

import { validateAlignments, validateGroups } from "../../src/layout/index.ts";
import { checkEnds } from "../../src/model/ends.ts";
import type { Op } from "../../src/model/index.ts";
import { applyOps } from "../../src/model/index.ts";
import { checkLanes, orderByLanes } from "../../src/model/lanes.ts";
import {
  DENSITIES,
  type Diagram,
  EDGE_KINDS,
  type Edge,
  NODE_KINDS,
  SIZE_STEPS,
} from "../../src/model/types.ts";
import type { Measurer } from "../../src/text/types.ts";

/** mulberry32: a small, fast, seeded generator. Never Math.random (D15). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LATIN = "abcdefghijklmnopqrstuvwxyz";
const WORDS = ["read", "write", "sync", "publish", "consume", "fetch", "retry", "cache", "GET"];
const HANZI = "订单库存缓存同步读取写入消息队列重试价格目录用户服务数据查询更新删除通知日志";

export interface Generated {
  diagram: Diagram;
  /** The operations that were applied, in order. */
  ops: Op[];
  /** Operations the model rejected, which were dropped. */
  rejected: number;
}

/**
 * One random diagram: 3 to 7 layers, 5 to 50 nodes of random kinds and sizes,
 * 0 to 80 edges (both ways between two layers, within a layer, across layers,
 * several between one pair, self-loops), labels of 2 to 20 characters, some of
 * them Chinese, and random alignments.
 */
export function generate(seed: number, m: Measurer): Generated {
  const r = rng(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
  const chance = (p: number) => r() < p;

  const text = (lo: number, hi: number): string => {
    const len = int(lo, hi);
    if (chance(0.2)) {
      let s = "";
      for (let i = 0; i < len; i++) s += pick([...HANZI]);
      return s;
    }
    let s = chance(0.5) ? pick(WORDS) : "";
    while (s.length < len) {
      if (s.length > 0 && chance(0.2)) s += " ";
      else s += pick([...LATIN]);
    }
    return s.slice(0, len).trim() || "ab";
  };

  const ops: Op[] = [];
  let rejected = 0;
  const density = chance(0.6) ? "normal" : pick(DENSITIES);
  let d: Diagram = {
    grafical: 1,
    title: `fuzz ${seed}`,
    density,
    layers: [],
    edges: [],
  };
  const apply = (op: Op): boolean => {
    const res = applyOps(d, [op], m);
    if ("errors" in res) {
      rejected++;
      return false;
    }
    d = res.diagram;
    ops.push(op);
    return true;
  };

  const layerCount = int(3, 7);
  for (let i = 0; i < layerCount; i++) {
    const op: Op = { op: "layer.add", id: `l${i}`, label: `Layer ${i} ${text(2, 10)}` };
    if (i > 0 && chance(0.2)) op.before = `l${int(0, i - 1)}`;
    apply(op);
  }

  const nodeCount = int(5, 50);
  const ids: string[] = [];
  const layerOf = new Map<string, string>();
  let accents = 0;
  for (let i = 0; i < nodeCount; i++) {
    const id = `n${i}`;
    const layer = `l${int(0, layerCount - 1)}`;
    const op: Op = {
      op: "node.add",
      id,
      layer,
      label: chance(0.15) ? text(2, 6) : `${pick(["svc", "db", "queue", "job", "api"])}-${i}`,
      kind: pick(NODE_KINDS),
      size: pick(SIZE_STEPS),
    };
    if (chance(0.3)) op.sublabel = chance(0.5) ? `:${7000 + i}` : text(2, 8);
    if (accents < 2 && chance(0.05)) {
      op.accent = true;
      accents++;
    }
    const inLayer = ids.filter((x) => layerOf.get(x) === layer);
    const where = r();
    if (inLayer.length === 0 || where < 0.4) op.last = true;
    else if (where < 0.55) op.first = true;
    else if (where < 0.8) op.after = pick(inLayer);
    else op.before = pick(inLayer);
    const others = ids.filter((x) => layerOf.get(x) !== layer);
    let added: boolean;
    if (others.length > 0 && chance(0.15)) {
      op.align = pick(others);
      added = apply(op);
      if (!added) {
        delete op.align;
        added = apply(op);
      }
    } else added = apply(op);
    if (!added) continue;
    ids.push(id);
    layerOf.set(id, layer);
  }

  const edgeCount = chance(0.05) ? 0 : int(1, 80);
  // Layers by their place in the picture, which layer.add --before may have changed.
  const order = d.layers.map((l) => l.id);
  const layerIdx = (id: string) => order.indexOf(layerOf.get(id) ?? "");
  const inLayer = (l: number) => ids.filter((x) => layerIdx(x) === l);
  const pairs: [string, string][] = [];
  for (let i = 0; i < edgeCount; i++) {
    const a = pick(ids);
    let b = pick(ids);
    const shape = r();
    if (shape < 0.08) b = a;
    else if (shape < 0.18 && pairs.length > 0) {
      // Another edge between a pair that has one, either way round.
      const [p, q] = pick(pairs);
      const [from, to] = chance(0.5) ? [p, q] : [q, p];
      pairs.push([from, to]);
      addEdge(from, to);
      continue;
    } else if (shape < 0.35) {
      const same = inLayer(layerIdx(a)).filter((x) => x !== a);
      if (same.length > 0) b = pick(same);
    } else if (shape < 0.65) {
      const near = inLayer(layerIdx(a) + (chance(0.5) ? 1 : -1));
      if (near.length > 0) b = pick(near);
    }
    pairs.push([a, b]);
    addEdge(a, b);
  }

  function addEdge(from: string, to: string) {
    const op: Op = { op: "edge.add", from, to, kind: pick(FIRST_EDGE_KINDS) };
    if (chance(0.5)) op.label = text(2, 20);
    apply(op);
  }

  // A few changes afterwards, as an agent makes them: move or remove a node,
  // remove an edge.
  const changes = int(0, 4);
  for (let i = 0; i < changes; i++) {
    const kind = r();
    const live = d.layers.flatMap((l) => l.nodes.map((n) => n.id));
    if (kind < 0.4 && live.length > 0) {
      const op: Op = { op: "node.move", id: pick(live), layer: pick(order) };
      if (chance(0.5)) op.first = true;
      else op.last = true;
      apply(op);
    } else if (kind < 0.6 && live.length > 5) {
      apply({ op: "node.remove", id: pick(live) });
    } else if (d.edges.length > 0) {
      apply({ op: "edge.remove", id: pick(d.edges).id });
    }
  }

  addGroups(d, r, text);
  if (chance(0.3)) d.subtitle = text(10, 70);
  if (chance(0.3)) d.note = `Not shown: ${text(5, 60)}`;
  // Drawn last, so that every seed's diagram is the same as before up to here.
  addContainerEdges(d, r, text);
  addLanes(d, r, text);
  addEdgeLooks(d, r);

  return { diagram: d, ops, rejected };
}

/** The edge kinds the generator picked before phase 1d, so that each seed's diagram stays the same. */
const FIRST_EDGE_KINDS = ["call", "async", "data"] as const;

/** Phase 1d's line looks (D33), drawn last: some edges become links or optional calls. */
function addEdgeLooks(d: Diagram, r: () => number): void {
  for (const e of d.edges) {
    const x = r();
    if (x < 0.1) e.kind = "link";
    else if (x < 0.2) e.kind = "optional";
  }
}

/**
 * Up to three edges that end at a group or a layer (D28), each kept only if the
 * model's end rules allow it, as an agent keeps only what grafical accepts.
 */
function addContainerEdges(
  d: Diagram,
  r: () => number,
  text: (lo: number, hi: number) => string,
): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const count = r() < 0.5 ? 0 : int(1, 3);
  const containers = [...(d.groups ?? []).map((g) => g.id), ...d.layers.map((l) => l.id)];
  const nodes = d.layers.flatMap((l) => l.nodes.map((n) => n.id));
  for (let i = 0; i < count; i++) {
    if (containers.length === 0 || nodes.length === 0) break;
    const c = containers[int(0, containers.length - 1)] as string;
    const other =
      r() < 0.7
        ? (nodes[int(0, nodes.length - 1)] as string)
        : (containers[int(0, containers.length - 1)] as string);
    const [from, to] = r() < 0.5 ? [c, other] : [other, c];
    const edge: Edge = { id: `c${i}`, from, to, kind: EDGE_KINDS[int(0, 2)] ?? "call" };
    if (r() < 0.4) edge.label = text(2, 16);
    const trial: Diagram = { ...d, edges: [...d.edges, edge] };
    if (checkEnds(trial, 0).length > 0) continue;
    d.edges = trial.edges;
  }
}

/**
 * Lanes (D32) in half the seeds: as rows, runs of one to three neighbouring layers
 * with some layers left out; as columns, two to four lanes over the nodes with
 * some nodes left out, each group in its first member's lane. Alignments that
 * column lanes make impossible are dropped, as an agent would drop them. Then up
 * to two edges that end at a lane, each kept only if the model allows it.
 */
function addLanes(d: Diagram, r: () => number, text: (lo: number, hi: number) => string): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const way = r();
  if (way >= 0.5 || d.layers.length === 0) return;
  const lanes: { id: string; label: string }[] = [];
  const trial: Diagram = structuredClone(d);
  if (way < 0.25) {
    let at = 0;
    while (at < trial.layers.length) {
      const len = int(1, 3);
      if (r() < 0.25) {
        at += len;
        continue;
      }
      const id = `lane${lanes.length}`;
      lanes.push({ id, label: text(3, 14) });
      for (const l of trial.layers.slice(at, at + len)) l.lane = id;
      at += len;
    }
    // A group across two lanes takes the lane of its first layer for all its layers.
    for (const g of trial.groups ?? []) {
      const rows = trial.layers.filter((l) => l.nodes.some((n) => n.group === g.id));
      const lane = rows[0]?.lane;
      for (const l of rows) {
        if (lane === undefined) delete l.lane;
        else l.lane = lane;
      }
    }
  } else {
    const count = int(2, 4);
    for (let i = 0; i < count; i++) lanes.push({ id: `lane${i}`, label: text(3, 14) });
    for (const l of trial.layers) {
      for (const n of l.nodes) {
        if (r() < 0.15) continue;
        n.lane = lanes[int(0, count - 1)]?.id as string;
      }
    }
    const nodes = trial.layers.flatMap((l) => l.nodes);
    for (const g of trial.groups ?? []) {
      const members = nodes.filter((n) => n.group === g.id);
      const lane = members[0]?.lane;
      for (const n of members) {
        if (lane === undefined) delete n.lane;
        else n.lane = lane;
      }
    }
  }
  if (lanes.length === 0) return;
  trial.lanes = lanes;
  orderByLanes(trial);
  for (const p of validateAlignments(trial)) {
    for (const l of trial.layers) for (const n of l.nodes) if (n.id === p.node) delete n.align;
  }
  if (
    checkLanes(trial, 0).length > 0 ||
    validateAlignments(trial).length > 0 ||
    validateGroups(trial).length > 0 ||
    checkEnds(trial, 0).length > 0
  ) {
    return;
  }
  d.layers = trial.layers;
  d.lanes = lanes;
  const ends = [
    ...d.layers.flatMap((l) => l.nodes.map((n) => n.id)),
    ...(d.groups ?? []).map((g) => g.id),
    ...d.layers.map((l) => l.id),
  ];
  const count = int(0, 2);
  for (let i = 0; i < count; i++) {
    const lane = lanes[int(0, lanes.length - 1)]?.id as string;
    const other = ends[int(0, ends.length - 1)] as string;
    const [from, to] = r() < 0.5 ? [lane, other] : [other, lane];
    const edge: Edge = { id: `w${i}`, from, to, kind: EDGE_KINDS[int(0, 2)] ?? "call" };
    if (r() < 0.4) edge.label = text(2, 16);
    const next: Diagram = { ...d, edges: [...d.edges, edge] };
    if (checkEnds(next, 0).length > 0) continue;
    d.edges = next.edges;
  }
}

/**
 * Up to three groups (D7), each a block of neighbouring nodes in one to three
 * neighbouring layers. The model has no group operations on this branch yet, so
 * they are set on the diagram directly. A group that cannot be one box with the
 * ones before it is dropped, as an agent would drop an operation that failed.
 */
function addGroups(d: Diagram, r: () => number, text: (lo: number, hi: number) => string): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const count = r() < 0.4 ? 0 : int(1, 3);
  const groups: { id: string; label: string }[] = [];
  for (let g = 0; g < count; g++) {
    if (d.layers.length === 0) break;
    const top = int(0, d.layers.length - 1);
    const bottom = Math.min(d.layers.length - 1, top + int(0, 2));
    const id = `g${g}`;
    const chosen: string[] = [];
    let ok = true;
    for (let li = top; li <= bottom && ok; li++) {
      const free = (d.layers[li]?.nodes ?? []).map((n) => n.group === undefined);
      const nodes = d.layers[li]?.nodes ?? [];
      if (nodes.length === 0) {
        ok = false;
        break;
      }
      const start = int(0, nodes.length - 1);
      const len = int(1, Math.min(3, nodes.length - start));
      for (let k = start; k < start + len; k++) {
        if (!free[k]) {
          ok = false;
          break;
        }
        chosen.push(nodes[k]?.id ?? "");
      }
    }
    if (!ok || chosen.length === 0) continue;
    const trial: Diagram = {
      ...d,
      groups: [...groups, { id, label: text(3, 14) }],
      layers: d.layers.map((l) => ({
        ...l,
        nodes: l.nodes.map((n) => (chosen.includes(n.id) ? { ...n, group: id } : n)),
      })),
    };
    if (validateGroups(trial).length > 0 || validateAlignments(trial).length > 0) continue;
    groups.push({ id, label: trial.groups?.[groups.length]?.label ?? id });
    d.layers = trial.layers;
  }
  if (groups.length > 0) d.groups = groups;
}
