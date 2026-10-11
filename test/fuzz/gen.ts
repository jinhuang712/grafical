// Random valid diagrams from fixed seeds, built by random operation sequences
// through the model's applyOps, the way an agent builds one. An operation the
// model rejects (an alignment that cannot hold, say) is dropped, as an agent
// would drop it, so every diagram that comes out is valid.

import type { Op } from "../../src/model/index.ts";
import { applyOps } from "../../src/model/index.ts";
import {
  DENSITIES,
  type Diagram,
  EDGE_KINDS,
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
    const op: Op = { op: "edge.add", from, to, kind: pick(EDGE_KINDS) };
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

  return { diagram: d, ops, rejected };
}
