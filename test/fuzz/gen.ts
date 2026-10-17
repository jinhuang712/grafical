// Random valid diagrams from fixed seeds, built by random operation sequences
// through the model's applyOps, the way an agent builds one. An operation the
// model rejects (an alignment that cannot hold, say) is dropped, as an agent
// would drop it, so every diagram that comes out is valid.

import { acrossTitle, check } from "../../src/check/index.ts";
import {
  layout,
  placeSteps,
  validateAlignments,
  validateGroups,
  validateSteps,
} from "../../src/layout/index.ts";
import { fits } from "../../src/layout/size.ts";
import { orderByColumns } from "../../src/model/columns.ts";
import { checkEnds } from "../../src/model/ends.ts";
import { MAX_GROUP_DEPTH } from "../../src/model/groups.ts";
import type { Op } from "../../src/model/index.ts";
import { applyOps } from "../../src/model/index.ts";
import { checkLanes, laneRun, orderByLanes } from "../../src/model/lanes.ts";
import { checkIntegrity } from "../../src/model/schema.ts";
import {
  DENSITIES,
  type Diagram,
  type DiagramNode,
  EDGE_KINDS,
  type Edge,
  GROUP_TITLES,
  type GroupTitle,
  SIZE_STEPS,
  STEP_NUMBER_MAX,
  type Wall,
} from "../../src/model/types.ts";
import { checkWalls } from "../../src/model/walls.ts";
import type { Measurer } from "../../src/text/types.ts";

/** mulberry32: a small, fast, seeded generator. Never Math.random (DESIGN.md, "Output and determinism"). */
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
    const res = applyOps(d, [op]);
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
      kind: pick(FIRST_NODE_KINDS),
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
  addNesting(d, r, text);
  addNodeKinds(d, r, m);
  addWalls(d, r, text, m);
  addSideWalls(d, r, text, m);
  addNotes(d, r, text);
  addColumns(d, r);
  addSteps(d, r);
  // A stream of its own, so that a seed with no bar is the same diagram as before bars.
  addBars(d, rng(seed ^ 0x5bd1e995));
  addStepNumbers(d, r);
  fitLabels(d, m);
  // A stream of its own, so that a seed with no stated label place is the same diagram as before.
  addTitles(d, rng(seed ^ 0x27d4eb2f), m);
  // A title's place may move a box, and a line with it.
  fitLabels(d, m);

  return { diagram: d, ops, rejected };
}

/**
 * As an agent does after a label-blocked refusal (DESIGN.md, "The dirty work has edges"): a line's
 * label that no gutter of its path holds shortens to its first word, and a word, or a step's
 * badge, that still finds no room is dropped.
 */
function fitLabels(d: Diagram, m: Measurer): void {
  for (let pass = 0; pass < 8; pass++) {
    const blocked = layout(d, m).edges.filter((e) => e.blocked !== undefined);
    if (blocked.length === 0) return;
    for (const b of blocked) {
      const e = d.edges.find((x) => x.id === b.id);
      if (e === undefined) continue;
      if (e.label?.includes(" ") === true) e.label = e.label.split(" ")[0] as string;
      else if (e.label !== undefined) delete e.label;
      else delete e.step;
    }
  }
}

/**
 * A stated place for each group's label in three seeds of ten (DESIGN.md, "The agent states where a group's label sits"),
 * a place of its own for each group. Then, as an agent does after a title-blocked refusal, a
 * label a line runs across, stated or seated by the engine, moves to a place no line comes near
 * (DESIGN.md, "The dirty work has edges"), the first of the places in a random order, which picks
 * among those the refusal names clear as a random pick would; where none is, its text shortens
 * to one word, then to one letter.
 */
function addTitles(d: Diagram, r: () => number, m: Measurer): void {
  if (r() >= 0.7) {
    for (const g of d.groups ?? []) {
      g.titleAt = GROUP_TITLES[Math.floor(r() * GROUP_TITLES.length)] as GroupTitle;
    }
  }
  for (let pass = 0; pass < 12; pass++) {
    const scene = layout(d, m);
    const blocked = (d.groups ?? []).filter((g) => acrossTitle(scene, g.id).length > 0);
    if (blocked.length === 0) return;
    for (const g of blocked) {
      const was = g.titleAt;
      const order = GROUP_TITLES.filter((p) => p !== was)
        .map((p) => ({ p, k: r() }))
        .sort((a, b) => a.k - b.k);
      const clear = order.find(({ p }) => {
        g.titleAt = p;
        return acrossTitle(layout(d, m), g.id).length === 0;
      });
      if (clear !== undefined) continue;
      if (was === undefined) delete g.titleAt;
      else g.titleAt = was;
      g.label = g.label.includes(" ") ? (g.label.split(" ")[0] as string) : g.label.slice(0, 1);
    }
  }
}

/**
 * A bar in three seeds of ten (DESIGN.md, "A row with no box as one bar"): a row with no box put between two rows, or
 * above or below them all, with one to four lines between it and boxes or groups. Every
 * line that then passes it says it may, as an agent does after a bar-crossed refusal,
 * and one bar in four is drawn as a band. A bar that a check refuses is dropped.
 */
function addBars(d: Diagram, r: () => number): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  if (r() < 0.7 || laneRun(d) === "columns") return;
  const nodes = d.layers.flatMap((l) => l.nodes.map((n) => n.id));
  const groups = (d.groups ?? []).map((g) => g.id);
  if (nodes.length === 0) return;
  const trial: Diagram = structuredClone(d);
  const at = int(0, trial.layers.length);
  const above = trial.layers[at - 1]?.lane;
  const bar: Diagram["layers"][number] = {
    id: "bar",
    label: ["gateway", "event bus", "API 网关", "message bus"][int(0, 3)] as string,
    ...(above !== undefined && above === trial.layers[at]?.lane ? { lane: above } : {}),
    nodes: [],
  };
  trial.layers.splice(at, 0, bar);
  const count = int(1, 4);
  for (let i = 0; i < count; i++) {
    const other =
      r() < 0.8 || groups.length === 0
        ? (nodes[int(0, nodes.length - 1)] as string)
        : (groups[int(0, groups.length - 1)] as string);
    const [from, to] = r() < 0.5 ? [other, "bar"] : ["bar", other];
    const edge: Edge = { id: `b${i}`, from, to, kind: EDGE_KINDS[int(0, 2)] ?? "call" };
    if (trial.edges.some((e) => e.from === from && e.to === to)) continue;
    trial.edges.push(edge);
  }
  // Boxes placed by steps sit in rows once placed, as the model checks them.
  for (const x of checkEnds(placeSteps(trial).d, 0)) {
    const e = trial.edges.find((y) => y.id === x.found);
    if (x.code === "bar-crossed" && e !== undefined) e.pass = true;
  }
  const refused =
    checkIntegrity(trial).length > 0 ||
    validateGroups(trial).length > 0 ||
    validateAlignments(trial).length > 0 ||
    validateSteps(trial).length > 0;
  if (refused) return;
  // Drawn last, so that the bar is the same with or without a look.
  if (r() < 0.25) bar.look = "band";
  d.layers = trial.layers;
  d.edges = trial.edges;
}

/**
 * Numbered lines (DESIGN.md, "Step badges ride the line"), drawn last, in four seeds of ten: a share of the lines,
 * from a few to all, numbered in the order they were added, now and then two with one
 * number, and past 9 where there are enough of them.
 */
function addStepNumbers(d: Diagram, r: () => number): void {
  if (r() < 0.6) return;
  const share = 0.2 + 0.8 * r();
  let n = 0;
  for (const e of d.edges) {
    if (r() >= share) continue;
    if (n === 0 || r() >= 0.15) n = Math.min(n + 1, STEP_NUMBER_MAX);
    e.step = n;
  }
}

/**
 * One to three boxes placed by steps (DESIGN.md, "Steps from another box"), drawn last, in three seeds of ten: each a
 * node taken out of its row, stepping up to two cells across and down from another
 * node, now and then one placed by steps itself. A box that a check refuses goes back
 * to its row, as an agent would drop the operation.
 */
function addSteps(d: Diagram, r: () => number): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  if (r() < 0.7) return;
  const tries = int(1, 3);
  for (let t = 0; t < tries; t++) {
    const rowNodes = d.layers.flatMap((l) => l.nodes);
    const free = rowNodes.filter(
      (x) => x.align === undefined && x.column === undefined && x.lane === undefined,
    );
    if (free.length < 2) return;
    const box = free[int(0, free.length - 1)] as DiagramNode;
    const anchors = [...rowNodes, ...(d.nodes ?? [])].filter((x) => x.id !== box.id);
    const from = anchors[int(0, anchors.length - 1)] as DiagramNode;
    let dx = int(-2, 2);
    const dy = int(-2, 2);
    if (dx === 0 && dy === 0) dx = 1;
    const trial: Diagram = structuredClone(d);
    for (const l of trial.layers) l.nodes = l.nodes.filter((x) => x.id !== box.id);
    const moved: DiagramNode = { ...structuredClone(box), from: from.id };
    if (dx > 0) moved.right = dx;
    if (dx < 0) moved.left = -dx;
    if (dy > 0) moved.down = dy;
    if (dy < 0) moved.up = -dy;
    trial.nodes = [...(trial.nodes ?? []), moved];
    const refused =
      checkIntegrity(trial).length > 0 ||
      validateGroups(trial).length > 0 ||
      validateAlignments(trial).length > 0 ||
      validateSteps(trial).length > 0;
    if (refused) continue;
    d.layers = trial.layers;
    d.nodes = trial.nodes;
  }
}

/**
 * Two or three columns (DESIGN.md, "Columns beside rows"), drawn last, in three seeds of ten: each node follows one
 * at random, or none, and every row is put in column order. Columns that a check
 * refuses are dropped, as an agent would drop the operation.
 */
function addColumns(d: Diagram, r: () => number): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  if (r() < 0.7 || laneRun(d) === "columns") return;
  const columns = Array.from({ length: int(2, 3) }, (_, i) => ({ id: `col${i}` }));
  const trial: Diagram = structuredClone(d);
  trial.columns = columns;
  for (const l of trial.layers) {
    for (const nd of l.nodes) {
      if (r() < 0.6) nd.column = columns[int(0, columns.length - 1)]?.id as string;
    }
  }
  orderByColumns(trial);
  const refused =
    checkIntegrity(trial).length > 0 ||
    validateGroups(trial).length > 0 ||
    validateAlignments(trial).length > 0;
  if (refused) return;
  d.layers = trial.layers;
  d.columns = columns;
}

/**
 * Up to four notes (DESIGN.md, "Notes as callouts or footnotes"), drawn last: on nodes, groups and lines at random, each a
 * few words to a sentence, so that some find room for a card and some are footnotes.
 */
function addNotes(d: Diagram, r: () => number, text: (lo: number, hi: number) => string): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  if (r() < 0.6) return;
  const targets = [
    ...d.layers.flatMap((l) => l.nodes.map((n) => n.id)),
    ...(d.groups ?? []).map((g) => g.id),
    ...d.edges.map((e) => e.id),
  ];
  const notes = new Map<string, string>();
  const count = int(1, 4);
  for (let k = 0; k < count && targets.length > 0; k++) {
    notes.set(targets[int(0, targets.length - 1)] as string, text(5, 60));
  }
  if (notes.size > 0) d.notes = [...notes].map(([on, words]) => ({ on, text: words }));
}

/**
 * Up to two walls across (DESIGN.md, "Walls as space"), drawn last: one to three nodes of a row against one
 * to three of the rows below it, letting through every line of either side, some of
 * them labelled. A wall the model refuses is dropped, as an agent would drop it, and
 * a line the drawing finds through a wall is let through, as its defect's fix says.
 */
function addWalls(
  d: Diagram,
  r: () => number,
  text: (lo: number, hi: number) => string,
  m: Measurer,
): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  if (r() < 0.6 || d.layers.length < 2) return;
  const count = int(1, 2);
  for (let k = 0; k < count; k++) {
    const g = int(0, d.layers.length - 2);
    const above = d.layers[g]?.nodes ?? [];
    const below = d.layers.slice(g + 1).flatMap((l) => l.nodes);
    if (above.length === 0 || below.length === 0) continue;
    const some = (ns: typeof above) => {
      const start = int(0, ns.length - 1);
      return ns.slice(start, start + int(1, 3)).map((n) => n.id);
    };
    const between = some(above);
    const and = some(below);
    const wall: Wall = { id: `wall${k}`, between, and, allow: [...between, ...and] };
    if (r() < 0.6) wall.label = text(3, 18);
    const trial: Diagram = { ...d, walls: [...(d.walls ?? []), wall] };
    if (checkWalls(trial, 0).length > 0) continue;
    for (const x of check(trial, layout(trial, m), m)) {
      if (x.code === "wall-crossed" && x.elements[1] === wall.id)
        wall.allow?.push(x.elements[0] ?? "");
    }
    d.walls = [...(d.walls ?? []), wall];
  }
}

/**
 * Up to one wall up and down (DESIGN.md, "Walls as space"), drawn after the walls across: in one or two
 * neighbouring rows of two nodes or more, the node left of a cut against the one
 * right of it, letting through every line of either side. A wall the model or the
 * grid refuses is dropped, and a line the drawing finds through it is let through.
 */
function addSideWalls(
  d: Diagram,
  r: () => number,
  text: (lo: number, hi: number) => string,
  m: Measurer,
): void {
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  if (r() < 0.7 || d.layers.length === 0) return;
  const top = int(0, d.layers.length - 1);
  const rows = d.layers.slice(top, top + int(1, 2));
  if (rows.some((l) => l.nodes.length < 2)) return;
  const between: string[] = [];
  const and: string[] = [];
  for (const l of rows) {
    const cut = int(1, l.nodes.length - 1);
    between.push(l.nodes[cut - 1]?.id ?? "");
    and.push(l.nodes[cut]?.id ?? "");
  }
  const wall: Wall = { id: "side-wall", between, and, allow: [...between, ...and] };
  if (r() < 0.6) wall.label = text(3, 18);
  const trial: Diagram = { ...d, walls: [...(d.walls ?? []), wall] };
  const refused =
    checkWalls(trial, 0).length > 0 ||
    validateGroups(trial).length > 0 ||
    validateAlignments(trial).length > 0;
  if (refused) return;
  for (const x of check(trial, layout(trial, m), m)) {
    if (x.code === "wall-crossed" && x.elements[1] === wall.id)
      wall.allow?.push(x.elements[0] ?? "");
  }
  d.walls = [...(d.walls ?? []), wall];
}

/** The kinds the generator picked before phase 1d, so that each seed's diagram stays the same. */
const FIRST_EDGE_KINDS = ["call", "async", "data"] as const;
const FIRST_NODE_KINDS = ["service", "store", "queue", "external", "actor"] as const;

/**
 * Phase 1d's node kinds (DESIGN.md, "Every layered diagram type"), drawn last. A diamond holds less text than a box, so a
 * node becomes one only when its text still fits, as grafical refuses a write otherwise.
 */
function addNodeKinds(d: Diagram, r: () => number, m: Measurer): void {
  for (const n of d.layers.flatMap((l) => l.nodes)) {
    const x = r();
    if (x < 0.1) n.kind = "state";
    else if (x < 0.15) n.kind = "terminal";
    else if (x < 0.2 && fits({ ...n, kind: "decision" }, n.size ?? "m", m)) n.kind = "decision";
    else if (x < 0.23) n.kind = "initial";
    else if (x < 0.26) n.kind = "final";
  }
}

/** Phase 1d's line looks (DESIGN.md, "Lines meet any side"), drawn last: links, optional calls, two-way edges and a main path. */
function addEdgeLooks(d: Diagram, r: () => number): void {
  for (const e of d.edges) {
    const x = r();
    if (x < 0.1) e.kind = "link";
    else if (x < 0.2) e.kind = "optional";
    else if (x < 0.27) e.both = true;
    if (r() < 0.08) e.accent = true;
  }
}

/**
 * Groups inside groups (DESIGN.md, "Every layered diagram type"): a group may be wrapped in a new outer group, which may
 * take a free node beside the group in one of its rows, and that outer group again
 * in a third. Done last, so that every seed's diagram is the same as before up to
 * here. A wrap the model refuses is dropped, as an agent would drop it.
 */
function addNesting(d: Diagram, r: () => number, text: (lo: number, hi: number) => string): void {
  for (const g of [...(d.groups ?? [])]) {
    if (r() >= 0.4) continue;
    let inner = g.id;
    for (let level = 2; level <= MAX_GROUP_DEPTH; level++) {
      if (level > 2 && r() >= 0.5) break;
      const id = `${inner}o`;
      // A free node next to the inner group's block, in the first row that has one.
      let beside: string | undefined;
      if (r() < 0.5) {
        for (const l of d.layers) {
          const at = l.nodes.flatMap((n, k) => (n.group === inner ? [k] : []));
          if (at.length === 0) continue;
          const left = l.nodes[(at[0] as number) - 1];
          const right = l.nodes[(at[at.length - 1] as number) + 1];
          beside = [left, right].find((n) => n !== undefined && n.group === undefined)?.id;
          if (beside !== undefined) break;
        }
      }
      const trial: Diagram = {
        ...d,
        groups: [
          ...(d.groups ?? []).map((x) => (x.id === inner ? { ...x, in: id } : x)),
          { id, label: text(3, 14) },
        ],
        layers: d.layers.map((l) => ({
          ...l,
          nodes: l.nodes.map((n) => (n.id === beside ? { ...n, group: id } : n)),
        })),
      };
      if (
        checkIntegrity(trial).length > 0 ||
        validateGroups(trial).length > 0 ||
        validateAlignments(trial).length > 0
      )
        break;
      d.groups = trial.groups ?? [];
      d.layers = trial.layers;
      inner = id;
    }
  }
}

/**
 * Up to three edges that end at a group or a layer (DESIGN.md, "Lines that end at containers"), each kept only if the
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
 * Lanes (DESIGN.md, "Swimlanes run one way") in half the seeds: as rows, runs of one to three neighbouring layers
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
 * Up to three groups (DESIGN.md, "Rows unseen, groups as systems"), each a block of neighbouring nodes in one to three
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
