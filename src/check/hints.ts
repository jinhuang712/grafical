// Hints (DESIGN.md D35): rearrangements the engine has measured to make the lines
// better, named as commands the agent can run. The engine arranges; the agent
// decides what the diagram says (PHILOSOPHY.md): a hint never applies itself,
// because moving a node to another row can change what the picture says.

import { arrangementCost, layout, troubledEdges } from "../layout/index.ts";
import { applyOps, type Diagram, type NodeKind, type Op } from "../model/index.ts";
import type { Measurer } from "../text/types.ts";
import { check } from "./index.ts";

export interface Hint {
  /** The operations that make the change, as a batch would list them. */
  ops: Op[];
  /** The same as commands, with <file> for the diagram's path. */
  command: string;
  /** What gets better, measured. */
  gain: string;
  /** The troubled lines it untangles: crossing or bending more than twice now, not after. */
  fixes: string[];
  /**
   * Keeps every node among its own kind and every row in its place: a swap or a slide
   * within a row, a group moved past another, or a move into a row of the same family.
   * A hint that is not safe is marked, for the agent to weigh against what its rows mean.
   */
  safe: boolean;
}

/**
 * Kinds that belong in one row together. Agents read a row as a tier, and undo a move
 * that puts a store among queues or a caller among services, so such a move is marked;
 * callers and outside systems are never moved at all.
 */
const FAMILY: Record<NodeKind, string> = {
  service: "step",
  state: "step",
  decision: "step",
  terminal: "step",
  initial: "step",
  final: "step",
  store: "store",
  queue: "queue",
  actor: "edge",
  external: "edge",
};

/**
 * Most rearrangements one search tries: 200 for a small diagram, fewer as it grows,
 * since each try lays it out again, so that a command stays quick (benchmark 11).
 */
function triesFor(nodes: number): number {
  return Math.min(200, Math.max(16, Math.floor(1200 / Math.max(1, nodes))));
}

/** A diagram of at most this many nodes tries every node, not only those at troubled lines. */
const SMALL = 16;

/** A node with at least this many lines is a hub, and is tried at every place in its row. */
const HUB = 3;

/** A cost is [crossings + lines over two bends, crossings, bends, length]. */
function better(c: number[], base: number[]): boolean {
  const [p, x, b] = c as [number, number, number];
  const [p0, x0, b0] = base as [number, number, number];
  if (p !== p0) return p < p0;
  return x <= x0 && b <= b0 - 2;
}

function lower(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (Math.abs(x - y) > 1e-6) return x < y;
  }
  return false;
}

function gainText(c: number[], base: number[]): string {
  const parts: string[] = [];
  const say = (what: string, from: number, to: number) => {
    if (from !== to) parts.push(`${what} ${from} -> ${to}`);
  };
  say("crossings", base[1] ?? 0, c[1] ?? 0);
  say("lines with more than two bends", (base[0] ?? 0) - (base[1] ?? 0), (c[0] ?? 0) - (c[1] ?? 0));
  say("bends", base[2] ?? 0, c[2] ?? 0);
  return parts.join(", ");
}

const quote = (s: string) => (/^[\w.-]+$/.test(s) ? s : `"${s}"`);

function commandOf(op: Op): string {
  if (op.op === "node.swap") return `grafical node swap <file> ${op.a} ${op.b}`;
  if (op.op === "node.move") {
    if (op.layer !== undefined)
      return `grafical node move <file> ${op.id} --layer ${quote(op.layer)}`;
    return op.before !== undefined
      ? `grafical node move <file> ${op.id} --before ${op.before}`
      : `grafical node move <file> ${op.id} --after ${op.after ?? ""}`;
  }
  if (op.op === "layer.move") {
    return op.before !== undefined
      ? `grafical layer move <file> ${op.id} --before ${op.before}`
      : `grafical layer move <file> ${op.id} --after ${op.after ?? ""}`;
  }
  if (op.op === "layer.remove") return `grafical layer remove <file> ${op.id}`;
  if (op.op === "group.order") {
    return op.before !== undefined
      ? `grafical group order <file> ${op.id} --before ${op.before}`
      : `grafical group order <file> ${op.id} --after ${op.after ?? ""}`;
  }
  return op.op;
}

/**
 * Up to `limit` rearrangements that make the lines measurably better: fewer lines
 * that cross or bend more than twice, or as many and at least two fewer bends.
 * Only the nodes at the ends of such lines are tried: swapped with a neighbour in
 * their row, or moved into the row above or below, where grafical picks the slot
 * (D24). A row a move empties is removed with it. Every hint applies cleanly and
 * leaves no defect.
 */
export function findHints(d: Diagram, m: Measurer, limit = 3, onlySafe = false): Hint[] {
  const troubled = troubledEdges(d, m);
  if (troubled.size === 0) return [];
  const rowOf = new Map<string, number>();
  d.layers.forEach((l, i) => {
    for (const n of l.nodes) rowOf.set(n.id, i);
  });
  // A small diagram tries every node: the move that helps most can be one no troubled
  // line ends at, such as a queue that would sit beside the service that fills it.
  const focus = new Set<string>(rowOf.size <= SMALL ? rowOf.keys() : []);
  // Nodes at the most troubled lines come first, so a large diagram's few tries go there.
  const trouble = new Map<string, number>();
  for (const e of d.edges) {
    if (!troubled.has(e.id)) continue;
    for (const end of [e.from, e.to]) {
      if (!rowOf.has(end)) continue;
      focus.add(end);
      trouble.set(end, (trouble.get(end) ?? 0) + 1);
    }
  }
  const order = [...focus].sort(
    (a, b) => (trouble.get(b) ?? 0) - (trouble.get(a) ?? 0) || (a < b ? -1 : a > b ? 1 : 0),
  );
  const maxTries = triesFor(rowOf.size);
  const base = arrangementCost(d, m);
  const tried: { ops: Op[]; cost: number[]; safe: boolean }[] = [];
  let tries = 0;
  const attempt = (ops: Op[], safe: boolean) => {
    if (tries >= maxTries) return;
    tries++;
    const r = applyOps(d, ops, m);
    if ("errors" in r) return;
    const cost = arrangementCost(r.diagram, m);
    if (better(cost, base)) tried.push({ ops, cost, safe });
  };
  // A row moved up or down keeps every node in its row and among its kind, and fixes lines
  // that pass a row they do not connect, as agents found by hand; but the order of the rows
  // is the story's (a request runs top to bottom), so it is marked for the agent to weigh.
  for (let i = 0; i < d.layers.length; i++) {
    const id = d.layers[i]?.id as string;
    for (const step of [1, 2]) {
      const below = d.layers[i + step];
      if (below !== undefined) attempt([{ op: "layer.move", id, after: below.id }], false);
    }
    const above = d.layers[i - 2];
    if (above !== undefined) attempt([{ op: "layer.move", id, before: above.id }], false);
  }
  // A whole system moved past another keeps every node in its row and among its kind,
  // and is often the only fix for a hub that a single node cannot leave its group to reach.
  const groups = (d.groups ?? []).map((g) => g.id).sort();
  if (troubled.size > 0) {
    for (const a of groups) {
      for (const b of groups) {
        if (a === b) continue;
        attempt([{ op: "group.order", id: a, before: b }], true);
        attempt([{ op: "group.order", id: a, after: b }], true);
      }
    }
  }
  for (const id of order) {
    const row = rowOf.get(id) as number;
    const layer = d.layers[row];
    if (layer === undefined) continue;
    for (const other of layer.nodes) {
      // Each pair once: from the node that sorts first, or from the only one in focus.
      if (other.id === id || (focus.has(other.id) && other.id < id)) continue;
      attempt([{ op: "node.swap", a: id, b: other.id }], true);
    }
    // A hub slid to each place in its row, so that it can sit over the nodes it reaches.
    const lines = d.edges.filter((e) => e.from === id || e.to === id).length;
    if (lines >= HUB) {
      for (const other of layer.nodes) {
        if (other.id === id) continue;
        attempt([{ op: "node.move", id, before: other.id }], true);
        attempt([{ op: "node.move", id, after: other.id }], true);
      }
    }
    const node = layer.nodes.find((n) => n.id === id);
    if (node === undefined || FAMILY[node.kind] === "edge") continue;
    for (const to of [row - 1, row + 1]) {
      const target = d.layers[to];
      if (target === undefined) continue;
      const ops: Op[] = [{ op: "node.move", id, layer: target.id }];
      if (layer.nodes.length === 1) ops.push({ op: "layer.remove", id: layer.id });
      attempt(
        ops,
        target.nodes.every((n) => FAMILY[n.kind] === FAMILY[node.kind]),
      );
    }
  }
  // Those that keep every node among its kind and every row in place first, since agents
  // decline the others more often than not; then the best first. The best of the others
  // keeps the last place when it leaves fewer troubled lines than any safe one, so that
  // small safe gains do not hide a large fix. One hint per change, so they do not repeat.
  tried.sort(
    (a, b) =>
      Number(b.safe) - Number(a.safe) ||
      (lower(a.cost, b.cost) ? -1 : lower(b.cost, a.cost) ? 1 : 0),
  );
  const firstUnsafe = tried.findIndex((t) => !t.safe);
  const bold = tried[firstUnsafe];
  if (
    bold !== undefined &&
    firstUnsafe > limit - 1 &&
    (bold.cost[0] ?? 0) < (tried[0]?.cost[0] ?? 0)
  ) {
    tried.splice(firstUnsafe, 1);
    tried.splice(limit - 1, 0, bold);
  }
  const out: Hint[] = [];
  const seen = new Set<string>();
  for (const t of tried) {
    if (out.length >= limit) break;
    if (onlySafe && !t.safe) continue;
    const key = JSON.stringify(t.ops);
    if (seen.has(key)) continue;
    seen.add(key);
    const r = applyOps(d, t.ops, m);
    if ("errors" in r || check(r.diagram, layout(r.diagram, m), m).length > 0) continue;
    const after = troubledEdges(r.diagram, m);
    out.push({
      ops: t.ops,
      command: t.ops.map(commandOf).join("; "),
      gain: gainText(t.cost, base),
      fixes: [...troubled].filter((id) => !after.has(id)).sort(),
      safe: t.safe,
    });
  }
  return out;
}
