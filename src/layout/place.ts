// Placement across (DESIGN.md, "Rows unseen, groups as systems", "Layout computed again on every change"): every node sits on a column of one grid
// shared by all rows (grid.ts). Each column gets an x from the room its nodes need:
// box widths and the gap between neighbours, group boxes and the space between a
// box and the nodes outside it, the space between column lanes (DESIGN.md, "Swimlanes run one way"), labels of
// edges that run sideways between neighbours, and lines that pass a row through
// an empty column. Columns are
// packed from the left, as close as that room allows, and the picture is centred
// on one centre line. Every x here is relative to that line.

import { columnRanks } from "../model/columns.ts";
import { groupChain } from "../model/groups.ts";
import { laneRanks, laneRun } from "../model/lanes.ts";
import { DEFAULT_SIZE, type Diagram, type DiagramNode } from "../model/types.ts";
import { wallRun, wallSplit } from "../model/walls.ts";
import { BOX, GROUP, LANE, ROUTE, SPACING, WALL } from "../theme/geometry.ts";
import { nodeBox, portReach } from "../theme/shapes.ts";
import type { AlignmentProblem } from "./align.ts";
import { buildGrid, type GroupProblem } from "./grid.ts";
import type { SideSlot } from "./side.ts";
import { rowHeights } from "./size.ts";

export interface PNode {
  id: string;
  node: DiagramNode;
  /** Index of the node's layer, top to bottom. */
  layer: number;
  /** Index within the layer. */
  order: number;
  /** Column of the grid. */
  col: number;
  /** Left edge, relative to the centre line. */
  x: number;
  w: number;
  h: number;
}

export interface PLayer {
  index: number;
  id: string;
  label: string;
  nodes: PNode[];
  /** Height of the tallest box in the layer, or of a medium box if it is empty. */
  rowH: number;
}

/** A group's box across, and its label. */
export interface PGroup {
  id: string;
  label: string;
  /** The boxed group this one sits in (DESIGN.md, "Every layered diagram type"). */
  parent?: string;
  /** Member ids, its inner groups' included, row by row, in order. */
  members: string[];
  /** First and last layer of its members. */
  top: number;
  bottom: number;
  /** Left and right side of the box. */
  x0: number;
  x1: number;
  /** Left end of the label. */
  labelX: number;
  labelW: number;
}

/** A lane that runs as a column: its sides across. Lanes side by side share a side. */
export interface PLane {
  id: string;
  label: string;
  x0: number;
  x1: number;
}

export interface Placement {
  layers: PLayer[];
  nodes: Map<string, PNode>;
  groups: PGroup[];
  /** Column lanes that hold a node, left to right. Empty when lanes run as rows. */
  lanes: PLane[];
  /** Left end of the label of each edge that runs sideways with a label. */
  sideLabels: Map<string, number>;
  problems: AlignmentProblem[];
  groupProblems: GroupProblem[];
}

/** What placement needs to know about text, measured beforehand. */
export interface PlaceText {
  sideways: Map<string, SideSlot>;
  /** One-line width of an edge's label, or undefined for none. */
  edgeLabelW: (id: string) => number | undefined;
  /** Width of a group's label. */
  groupLabelW: (id: string) => number;
  /**
   * Edges that meet a column lane beside it, by edge id: the lane, and the node
   * that stands for the other end. The label sits between that node and the lane.
   */
  laneEnds?: Map<string, { lane: string; node: string }>;
  /** The space a wall that runs up and down keeps between its sides (DESIGN.md, "Walls as space"). */
  wallSpace?: (id: string) => number;
}

const NO_TEXT: PlaceText = {
  sideways: new Map(),
  edgeLabelW: () => undefined,
  groupLabelW: () => 0,
};

const ceil4 = (x: number) => Math.ceil(x / 4 - 1e-9) * 4;

export function placeAcross(d: Diagram, text: PlaceText = NO_TEXT): Placement {
  const sp = SPACING[d.density];
  const grid = buildGrid(d);
  const heights = rowHeights(d);
  const nodes = new Map<string, PNode>();
  const layers: PLayer[] = d.layers.map((layer, index) => {
    const placed: PNode[] = [];
    for (const node of layer.nodes) {
      if (nodes.has(node.id)) continue;
      // compute() has sized every node (size.ts).
      const box = nodeBox(node.kind, node.size ?? DEFAULT_SIZE);
      const pn: PNode = {
        id: node.id,
        node,
        layer: index,
        order: placed.length,
        col: grid.col.get(node.id) ?? 0,
        x: 0,
        w: box.w,
        h: heights.get(node.id) ?? box.h,
      };
      nodes.set(node.id, pn);
      placed.push(pn);
    }
    const rowH = placed.length === 0 ? BOX.m.h : Math.max(...placed.map((n) => n.h));
    return { index, id: layer.id, label: layer.label, nodes: placed, rowH };
  });

  // Groups that can be boxed, with their members, the nodes of their inner groups
  // included (DESIGN.md, "Every layered diagram type").
  const broken = new Set(grid.groupProblems.map((p) => p.group));
  const groupIds = (d.groups ?? []).map((g) => g.id).filter((g) => !broken.has(g));
  /** The boxed groups around a node, innermost first. */
  const chainOf = (n: PNode): string[] =>
    groupChain(d, n.node.group).filter((g) => groupIds.includes(g));
  const membersOf = new Map<string, PNode[]>();
  for (const l of layers) {
    for (const n of l.nodes) {
      for (const g of chainOf(n)) {
        const list = membersOf.get(g) ?? [];
        list.push(n);
        membersOf.set(g, list);
      }
    }
  }
  /** The outermost box around n that does not hold other, if any. */
  const boxOf = (n: PNode, other?: PNode): string | undefined => {
    const around = other === undefined ? [] : chainOf(other);
    return chainOf(n)
      .filter((g) => !around.includes(g))
      .pop();
  };
  /** The boxed group a group sits in. */
  const parentOf = (g: string): string | undefined =>
    groupChain(d, g)
      .slice(1)
      .find((x) => membersOf.has(x));
  /** The boxed groups directly inside a group. An empty group draws no box. */
  const innerOf = (g: string): string[] =>
    groupIds.filter((x) => membersOf.has(x) && parentOf(x) === g);
  /** How many boxes lie between a member and the side of g's box, g's own included. */
  const levels = (m: PNode, g: string) => chainOf(m).indexOf(g) + 1;

  // Lines that leave or enter a node by its top side: a group label above a
  // first-row member must leave them room.
  const topEnds = new Map<string, number>();
  for (const e of d.edges) {
    const u = nodes.get(e.from);
    const v = nodes.get(e.to);
    if (u === undefined || v === undefined || u.layer === v.layer) continue;
    const top = u.layer > v.layer ? u : v;
    topEnds.set(top.id, (topEnds.get(top.id) ?? 0) + 1);
  }
  // Column lanes (DESIGN.md, "Swimlanes run one way"), and the nodes outside them, as blocks in order across.
  const ranks = laneRun(d) === "columns" ? laneRanks(d) : new Map<string, number>();
  const laneIds = (d.lanes ?? []).map((x) => x.id);
  const laneOrder: PNode[][] = [];
  {
    const byRank = new Map<number, PNode[]>();
    for (const n of nodes.values()) {
      const r = ranks.get(n.id);
      if (r !== undefined) byRank.set(r, [...(byRank.get(r) ?? []), n]);
    }
    for (const r of [...byRank.keys()].sort((a, b) => a - b))
      laneOrder.push(byRank.get(r) as PNode[]);
  }
  // Columns (DESIGN.md, "Columns hold across rows"): the nodes of each column that holds one, left to right.
  const columnRank = columnRanks(d);
  const columnOrder: PNode[][] = [];
  {
    const byRank = new Map<number, PNode[]>();
    for (const n of nodes.values()) {
      const r = n.node.column === undefined ? undefined : columnRank.get(n.node.column);
      if (r !== undefined) byRank.set(r, [...(byRank.get(r) ?? []), n]);
    }
    for (const r of [...byRank.keys()].sort((a, b) => a - b))
      columnOrder.push(byRank.get(r) as PNode[]);
  }
  const columns = Math.max(1, grid.columns);
  let solved = solve(new Set(), new Set());
  const seats = seatLabels(solved.groups, layers, topEnds);
  const tight = solved.groups.filter((_, i) => (seats[i]?.slack ?? 0) < 0).map((g) => g.id);
  // A label whose every seat covers the centre of a first-row member that a line
  // enters or leaves by its top would push that line off centre: the first two such
  // members move apart, so that the label sits between their lines.
  const crowded = solved.groups
    .filter((_, i) => (seats[i]?.slack ?? 0) >= 0 && seats[i]?.centred === false)
    .map((g) => g.id);
  if (tight.length > 0 || crowded.length > 0) {
    // A label with no seat in its box: the box grows to the right, so that the
    // label can sit past the ports of its first row.
    solved = solve(new Set(tight), new Set(crowded));
    seatLabels(solved.groups, layers, topEnds);
  }
  const groups = solved.groups;

  function solve(wide: Set<string>, spread: Set<string>): { groups: PGroup[] } {
    // Room between columns: x[j] >= x[i] + d for i < j.
    const need: { i: number; d: number }[][] = Array.from({ length: columns }, () => []);
    const add = (i: number, j: number, dist: number) => {
      if (i >= j || j >= columns) return;
      need[j]?.push({ i, d: ceil4(dist) });
    };
    for (const l of layers) {
      for (let k = 1; k < l.nodes.length; k++) {
        const a = l.nodes[k - 1] as PNode;
        const b = l.nodes[k] as PNode;
        add(a.col, b.col, a.w / 2 + sp.nodeGap + b.w / 2);
      }
    }
    // A box placed by steps (DESIGN.md, "Steps from another box"): each step across keeps a medium box and a gap, so
    // that two steps never look like one.
    for (const n of nodes.values()) {
      const from = n.node.from === undefined ? undefined : nodes.get(n.node.from);
      if (from === undefined) continue;
      for (let c = Math.min(from.col, n.col); c < Math.max(from.col, n.col); c++) {
        add(c, c + 1, BOX.m.w + sp.nodeGap);
      }
    }
    const labelSpan = (g: string) => text.groupLabelW(g) + 2 * GROUP.labelInset;
    /** Terms for where a wide group's label ends: past the ports of its first row. */
    const pastPorts = (g: string) => {
      if (!wide.has(g)) return [];
      const ms = membersOf.get(g) ?? [];
      const top = Math.min(...ms.map((m) => m.layer));
      return ms
        .filter((m) => m.layer === top && (topEnds.get(m.id) ?? 0) > 0)
        .map((m) => ({
          col: m.col,
          d: m.w / 2 - portReach(m.w) + GROUP.labelClear + text.groupLabelW(g) + GROUP.labelInset,
        }));
    };
    /** The left side of a group's box, as terms x - d from each member: a box's padding per level. */
    const leftEdge = (g: string) =>
      (membersOf.get(g) ?? []).map((m) => ({ col: m.col, d: m.w / 2 + GROUP.pad * levels(m, g) }));
    /**
     * The right side of a group's box, as terms x + d: past each member by a box's
     * padding per level, and past the label of the group and of each inner group.
     */
    const rightEdge = (g: string): { col: number; d: number }[] => [
      ...(membersOf.get(g) ?? []).flatMap((m) => [
        { col: m.col, d: m.w / 2 + GROUP.pad * levels(m, g) },
        { col: m.col, d: -m.w / 2 - GROUP.pad * levels(m, g) + labelSpan(g) },
      ]),
      ...pastPorts(g),
      ...innerOf(g).flatMap((c) => rightEdge(c).map((t) => ({ col: t.col, d: t.d + GROUP.pad }))),
    ];
    /** Terms that give the right side of what lies left of a gap: a box, or a node. */
    const rightTerms = (n: PNode, other: PNode): { col: number; d: number }[] => {
      const g = boxOf(n, other);
      return g === undefined ? [{ col: n.col, d: n.w / 2 }] : rightEdge(g);
    };
    const leftTerms = (n: PNode, other: PNode): { col: number; d: number }[] => {
      const g = boxOf(n, other);
      return g === undefined ? [{ col: n.col, d: n.w / 2 }] : leftEdge(g);
    };
    // Room for a crowded label between the lines of its first two first-row members
    // that have them: their centres leave the label and its clearance, and a seat step.
    for (const g of spread) {
      const ms = membersOf.get(g) ?? [];
      const top = Math.min(...ms.map((m) => m.layer));
      const [a, b] = ms
        .filter((m) => m.layer === top && (topEnds.get(m.id) ?? 0) > 0)
        .sort((x, y) => x.col - y.col);
      if (a !== undefined && b !== undefined) {
        add(a.col, b.col, text.groupLabelW(g) + 2 * GROUP.labelClear + 4);
      }
    }
    // Every node beside a group's members in a row keeps clear of its box, and so
    // does every other group's box.
    for (const l of layers) {
      for (let k = 1; k < l.nodes.length; k++) {
        const a = l.nodes[k - 1] as PNode;
        const b = l.nodes[k] as PNode;
        const ga = boxOf(a, b);
        const gb = boxOf(b, a);
        if (ga === undefined && gb === undefined) continue;
        const between = ga !== undefined && gb !== undefined ? GROUP.gap : GROUP.clear;
        for (const r of rightTerms(a, b))
          for (const s of leftTerms(b, a)) add(r.col, s.col, r.d + between + s.d);
      }
    }
    // A group with members in several rows: a node beside it in any of its rows.
    for (const [g, ms] of membersOf) {
      const top = Math.min(...ms.map((m) => m.layer));
      const bottom = Math.max(...ms.map((m) => m.layer));
      const lo = Math.min(...ms.map((m) => m.col));
      const hi = Math.max(...ms.map((m) => m.col));
      for (let r = top; r <= bottom; r++) {
        const list = layers[r]?.nodes ?? [];
        const at = list.map((n, k) => (chainOf(n).includes(g) ? k : -1)).filter((k) => k >= 0);
        // A row the box spans with no member keeps its nodes beside the box, as grid.ts
        // put them: the last one left of its columns and the first one right of them.
        const left =
          at.length > 0 ? list[(at[0] as number) - 1] : list.filter((n) => n.col < lo).pop();
        const right =
          at.length > 0 ? list[(at[at.length - 1] as number) + 1] : list.find((n) => n.col > hi);
        const anyMember = ms[0] as PNode;
        if (left !== undefined) {
          const between = boxOf(left, anyMember) !== undefined ? GROUP.gap : GROUP.clear;
          for (const r2 of rightTerms(left, anyMember)) {
            for (const t of leftEdge(g)) add(r2.col, t.col, r2.d + between + t.d);
          }
        }
        if (right !== undefined) {
          const between = boxOf(right, anyMember) !== undefined ? GROUP.gap : GROUP.clear;
          for (const t of rightEdge(g)) {
            for (const s of leftTerms(right, anyMember)) add(t.col, s.col, t.d + between + s.d);
          }
        }
      }
    }
    // Columns: every box of a column keeps a row's gap from every box of the next, in
    // any row, so that a column's boxes never stand over the column before.
    for (let k = 1; k < columnOrder.length; k++) {
      for (const a of columnOrder[k - 1] as PNode[]) {
        for (const b of columnOrder[k] as PNode[])
          add(a.col, b.col, a.w / 2 + sp.nodeGap + b.w / 2);
      }
    }
    // Column lanes: the content of neighbouring lanes, boxes included, keeps twice
    // a lane's padding apart, so that the side they share runs between.
    for (let k = 1; k < laneOrder.length; k++) {
      for (const a of laneOrder[k - 1] as PNode[]) {
        for (const b of laneOrder[k] as PNode[]) {
          for (const r of rightTerms(a, b))
            for (const s of leftTerms(b, a)) add(r.col, s.col, r.d + 2 * LANE.padX + s.d);
        }
      }
    }
    // Walls up and down (DESIGN.md, "Walls as space"): what lies left of a wall in its rows, boxes included,
    // keeps the wall's space from what lies right of it.
    for (const w of d.walls ?? []) {
      const way = wallRun(d, w);
      const split = way?.run === "beside" ? wallSplit(d, way) : undefined;
      if (split === undefined || "row" in split) continue;
      const space = text.wallSpace?.(w.id) ?? WALL.space;
      const side = (ids: string[]) => ids.flatMap((id) => nodes.get(id) ?? []);
      for (const a of side(split.left)) {
        for (const b of side(split.right)) {
          for (const r of rightTerms(a, b))
            for (const s of leftTerms(b, a)) add(r.col, s.col, r.d + space + s.d);
        }
      }
    }
    // Labels of edges that run sideways between neighbours.
    for (const [id, slot] of text.sideways) {
      if (slot.label === undefined) continue;
      const a = nodes.get(slot.left);
      const b = nodes.get(slot.right);
      const w = text.edgeLabelW(id);
      if (a === undefined || b === undefined || w === undefined) continue;
      const room = w + 2 * ROUTE.sideLabelPad;
      for (const r of rightTerms(a, b))
        for (const s of leftTerms(b, a)) add(r.col, s.col, r.d + room + s.d);
      // An edge that meets a lane beside it is drawn from the lane's side: its
      // label's room lies between the node and every node of the lane.
      const end = text.laneEnds?.get(id);
      const x = end === undefined ? undefined : nodes.get(end.node);
      const lane = end === undefined ? -1 : laneIds.indexOf(end.lane);
      if (x === undefined || lane < 0) continue;
      for (const m of laneOrder.find((ns) => ranks.get((ns[0] as PNode).id) === lane) ?? []) {
        if (m.col < x.col) {
          for (const r of rightTerms(m, x))
            for (const s of leftTerms(x, m)) add(r.col, s.col, r.d + LANE.padX + room + s.d);
        } else {
          for (const r of rightTerms(x, m))
            for (const s of leftTerms(m, x)) add(r.col, s.col, r.d + room + LANE.padX + s.d);
        }
      }
    }
    // A node two groups share sits in the gap between their boxes: its column's
    // centre is half a box gap past the box on each side (grid.ts puts its column
    // between theirs), so that both reach it alike and the picture grows no wider.
    for (const id of grid.shared) {
      const n = nodes.get(id);
      if (n === undefined) continue;
      const users = new Set<string>();
      for (const e of d.edges) {
        const other = e.from === id ? e.to : e.to === id ? e.from : undefined;
        const o = other === undefined ? undefined : nodes.get(other);
        const g = o === undefined ? undefined : boxOf(o);
        if (g !== undefined) users.add(g);
      }
      for (const g of users) {
        const ms = membersOf.get(g) ?? [];
        const pad = (m: PNode) => GROUP.pad * levels(m, g);
        if (ms.every((m) => m.col < n.col)) {
          for (const m of ms) add(m.col, n.col, m.w / 2 + pad(m) + GROUP.gap / 2);
        } else if (ms.every((m) => m.col > n.col)) {
          for (const m of ms) add(n.col, m.col, GROUP.gap / 2 + pad(m) + m.w / 2);
        }
      }
    }
    // A line that runs straight through a row where its column is empty.
    for (const [c, rows] of grid.reserved) {
      for (const r of rows) {
        const list = layers[r]?.nodes ?? [];
        const left = list.filter((n) => n.col < c).pop();
        const right = list.find((n) => n.col > c);
        if (left !== undefined) add(left.col, c, left.w / 2 + ROUTE.corridorPad);
        if (right !== undefined) add(c, right.col, ROUTE.corridorPad + right.w / 2);
      }
    }
    const xs: number[] = [];
    for (let j = 0; j < columns; j++) {
      let x = j === 0 ? 0 : (xs[j - 1] as number);
      for (const { i, d: dist } of need[j] ?? []) x = Math.max(x, (xs[i] as number) + dist);
      xs.push(x);
    }

    for (const n of nodes.values()) n.x = (xs[n.col] ?? 0) - n.w / 2;
    // Each box: past its members by a padding per level, past its label, and past
    // each inner box by a padding.
    const sides = new Map<string, [number, number]>();
    const sideOf = (g: string): [number, number] => {
      const known = sides.get(g);
      if (known !== undefined) return known;
      const ms = membersOf.get(g) ?? [];
      const x0 = Math.min(...ms.map((m) => m.x - GROUP.pad * levels(m, g)));
      const x1 = Math.max(
        ...ms.map((m) => m.x + m.w + GROUP.pad * levels(m, g)),
        x0 + labelSpan(g),
        ...pastPorts(g).map((t) => (xs[t.col] ?? 0) + t.d),
        ...innerOf(g).map((c) => sideOf(c)[1] + GROUP.pad),
      );
      sides.set(g, [x0, x1]);
      return [x0, x1];
    };
    const groups: PGroup[] = [];
    for (const g of groupIds) {
      const ms = membersOf.get(g);
      if (ms === undefined) continue;
      const [x0, x1] = sideOf(g);
      const box: PGroup = {
        id: g,
        label: d.groups?.find((x) => x.id === g)?.label ?? g,
        members: ms.map((m) => m.id),
        top: Math.min(...ms.map((m) => m.layer)),
        bottom: Math.max(...ms.map((m) => m.layer)),
        x0,
        x1,
        labelX: x0 + GROUP.labelInset,
        labelW: text.groupLabelW(g),
      };
      const parent = parentOf(g);
      if (parent !== undefined) box.parent = parent;
      groups.push(box);
    }
    return { groups };
  }

  // Centre the picture on one line, on the 4 px grid.
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const n of nodes.values()) {
    lo = Math.min(lo, n.x);
    hi = Math.max(hi, n.x + n.w);
  }
  for (const g of groups) {
    lo = Math.min(lo, g.x0);
    hi = Math.max(hi, g.x1);
  }
  // A lane that an edge meets beside it keeps its side close, so that the label's
  // room lies outside it.
  const hug = new Set<string>();
  for (const [id, end] of text.laneEnds ?? []) {
    if (text.sideways.get(id)?.label !== undefined) hug.add(end.lane);
  }
  const lanes = laneSides(d, laneOrder, ranks, groups, hug);
  for (const l of lanes) {
    lo = Math.min(lo, l.x0);
    hi = Math.max(hi, l.x1);
  }
  const centre = Number.isFinite(lo) ? Math.floor((lo + hi) / 8) * 4 : 0;
  for (const n of nodes.values()) n.x -= centre;
  for (const g of groups) {
    g.x0 -= centre;
    g.x1 -= centre;
    g.labelX -= centre;
  }
  for (const l of lanes) {
    l.x0 -= centre;
    l.x1 -= centre;
  }

  const byId = new Map(groups.map((g) => [g.id, g]));
  const sideLabels = new Map<string, number>();
  for (const [id, slot] of text.sideways) {
    if (slot.label === undefined) continue;
    const a = nodes.get(slot.left);
    const b = nodes.get(slot.right);
    const w = text.edgeLabelW(id);
    if (a === undefined || b === undefined || w === undefined) continue;
    const ga = boxOf(a, b);
    const gb = boxOf(b, a);
    let left = ga !== undefined ? (byId.get(ga)?.x1 ?? a.x + a.w) : a.x + a.w;
    let right = gb !== undefined ? (byId.get(gb)?.x0 ?? b.x) : b.x;
    // Between a node and a lane it meets, the label sits between the node and the lane's side.
    const lane = lanes.find((l) => l.id === text.laneEnds?.get(id)?.lane);
    if (lane !== undefined && text.laneEnds?.get(id)?.node === slot.right) left = lane.x1;
    if (lane !== undefined && text.laneEnds?.get(id)?.node === slot.left) right = lane.x0;
    sideLabels.set(id, (left + right) / 2 - w / 2);
  }
  return {
    layers,
    nodes,
    groups,
    lanes,
    sideLabels,
    problems: grid.alignProblems,
    groupProblems: grid.groupProblems,
  };
}

export const centreX = (n: PNode): number => n.x + n.w / 2;

/**
 * The sides of each column lane that holds a node: its content's extent, boxes
 * included, widened by its padding; between two lanes, the middle of the space
 * between their contents, unless one of them hugs its content, because an edge
 * meets it beside it. Blocks of nodes outside every lane are skipped.
 */
function laneSides(
  d: Diagram,
  blocks: PNode[][],
  ranks: Map<string, number>,
  groups: PGroup[],
  hug: Set<string>,
): PLane[] {
  const lanes = d.lanes ?? [];
  const boxOf = new Map(
    groups
      .filter((g) => g.parent === undefined)
      .flatMap((g) => g.members.map((m) => [m, g] as const)),
  );
  const extent = (ns: PNode[]) => {
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const n of ns) {
      const g = boxOf.get(n.id);
      lo = Math.min(lo, g?.x0 ?? n.x);
      hi = Math.max(hi, g?.x1 ?? n.x + n.w);
    }
    return { lo, hi };
  };
  const inLanes = blocks.filter((b) => {
    const r = ranks.get((b[0] as PNode).id) ?? -1;
    return r >= 0 && r < lanes.length;
  });
  const spans = inLanes.map(extent);
  const ids = inLanes.map(
    (b) => (lanes[ranks.get((b[0] as PNode).id) as number] as { id: string }).id,
  );
  /** The side between the k-th lane and the next. */
  const between = (k: number): number => {
    const a = spans[k] as { hi: number };
    const b = spans[k + 1] as { lo: number };
    const left = hug.has(ids[k] as string);
    const right = hug.has(ids[k + 1] as string);
    if (left && !right) return a.hi + LANE.padX;
    if (right && !left) return b.lo - LANE.padX;
    return (a.hi + b.lo) / 2;
  };
  return inLanes.map((b, k) => {
    const lane = lanes[ranks.get((b[0] as PNode).id) as number] as { id: string; label: string };
    const { lo, hi } = spans[k] as { lo: number; hi: number };
    return {
      id: lane.id,
      label: lane.label,
      x0: k === 0 ? lo - LANE.padX : between(k - 1),
      x1: k === inLanes.length - 1 ? hi + LANE.padX : between(k),
    };
  });
}

/**
 * Seats each group's label in the head of its box, where no line may then pass
 * (DESIGN.md, "A target picture with measured rules" rule 8). The leftmost seat wins that keeps clear of the centre of every
 * first-row member a line enters or leaves by its top, so that its straight lines
 * stay centred; failing that, the leftmost that leaves each such member room for
 * the ports it needs; failing that, the one that leaves the most room. Returns,
 * for each group, the room its seat leaves (negative when no seat leaves enough),
 * and whether the seat keeps clear of every such centre.
 */
/** The longest stretch of [a, b] that no span covers, or -1 when none is left. */
function freeRoom(a: number, b: number, spans: [number, number][]): number {
  let best = -1;
  let at = a;
  for (const [lo, hi] of [...spans].sort((x, y) => x[0] - y[0])) {
    if (hi <= at) continue;
    if (lo >= b) break;
    if (lo >= at) best = Math.max(best, lo - at);
    at = hi;
  }
  return at <= b ? Math.max(best, b - at) : best;
}

function seatLabels(
  groups: PGroup[],
  layers: PLayer[],
  topEnds: Map<string, number>,
): { slack: number; centred: boolean }[] {
  const clr = GROUP.labelClear;
  const byId = new Map(groups.map((g) => [g.id, g]));
  const depth = (g: PGroup): number => {
    const parent = g.parent === undefined ? undefined : byId.get(g.parent);
    return parent === undefined ? 1 : 1 + depth(parent);
  };
  // Outer labels first: a line into a row passes every head stacked above it, so an
  // inner label's ports must leave room for the outer labels too (DESIGN.md, "Every layered diagram type").
  const order = groups
    .map((_, i) => i)
    .sort((i, j) => depth(groups[i] as PGroup) - depth(groups[j] as PGroup) || i - j);
  const out: { slack: number; centred: boolean }[] = [];
  for (const i of order) out[i] = seat(groups[i] as PGroup);
  return out;

  function seat(g: PGroup): { slack: number; centred: boolean } {
    const row = (layers[g.top]?.nodes ?? []).filter(
      (n) => g.members.includes(n.id) && (topEnds.get(n.id) ?? 0) > 0,
    );
    const above: [number, number][] = [];
    for (let p = g.parent; p !== undefined; p = byId.get(p)?.parent) {
      const o = byId.get(p);
      if (o !== undefined && o.top === g.top)
        above.push([o.labelX - clr, o.labelX + o.labelW + clr]);
    }
    let roomy: number | undefined;
    let best = g.labelX;
    let bestSlack = Number.NEGATIVE_INFINITY;
    let bestTotal = Number.NEGATIVE_INFINITY;
    // Seats every 4 px, and the rightmost seat exactly: a box that grew for its label
    // has room for it there, which the 4 px steps can miss.
    const last = g.x1 - GROUP.labelInset - g.labelW;
    const xs: number[] = [];
    for (let x = g.x0 + GROUP.labelInset; x <= last + 1e-6; x += 4) xs.push(x);
    if (xs.length > 0 && (xs[xs.length - 1] as number) < last - 1e-6) xs.push(last);
    for (const x of xs) {
      const lo = x - clr;
      const hi = x + g.labelW + clr;
      let slack = Number.POSITIVE_INFINITY;
      let total = 0;
      let centred = true;
      for (const n of row) {
        const a = n.x + portReach(n.w);
        const b = n.x + n.w - portReach(n.w);
        const c = centreX(n);
        if (c > lo - 1e-6 && c < hi + 1e-6) centred = false;
        // A dot's ports sit at its centre or spread over all of it, so a label over
        // any part of it leaves its lines no room (DESIGN.md, "Every layered diagram type").
        const clear = hi <= a || lo >= b;
        const room =
          above.length > 0
            ? portReach(n.w) === 0 && (!clear || above.some(([x, y]) => y > a && x < b))
              ? -1
              : freeRoom(a, b, [[lo, hi], ...above])
            : clear
              ? b - a
              : portReach(n.w) === 0
                ? -1
                : Math.max(Math.min(b, lo) - a, b - Math.max(a, hi));
        slack = Math.min(slack, room - ((topEnds.get(n.id) ?? 1) - 1) * ROUTE.portPitch);
        total += room;
      }
      if (slack >= 0 && centred) {
        g.labelX = x;
        return { slack, centred: true };
      }
      if (slack >= 0) roomy ??= x;
      // When the most crowded member leaves every seat the same room, the seat that
      // leaves the others the most room wins, so the label stays off their ports too.
      if (slack > bestSlack || (slack === bestSlack && total > bestTotal)) {
        bestSlack = slack;
        bestTotal = total;
        best = x;
      }
    }
    g.labelX = roomy ?? best;
    return { slack: roomy !== undefined ? 0 : bestSlack, centred: false };
  }
}
