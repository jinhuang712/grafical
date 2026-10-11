// Placement across (DESIGN.md D7, D10): every node sits on a column of one grid
// shared by all rows (grid.ts). Each column gets an x from the room its nodes need:
// box widths and the gap between neighbours, group boxes and the space between a
// box and the nodes outside it, labels of edges that run sideways between
// neighbours, and lines that pass a row through an empty column. Columns are
// packed from the left, as close as that room allows, and the picture is centred
// on one centre line. Every x here is relative to that line.

import type { Diagram, DiagramNode } from "../model/types.ts";
import { BOX, GROUP, ROUTE, SPACING } from "../theme/geometry.ts";
import type { AlignmentProblem } from "./align.ts";
import { buildGrid, type GroupProblem } from "./grid.ts";
import type { SideSlot } from "./side.ts";

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
  /** Member ids, row by row, in order. */
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

export interface Placement {
  layers: PLayer[];
  nodes: Map<string, PNode>;
  groups: PGroup[];
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
  const nodes = new Map<string, PNode>();
  const layers: PLayer[] = d.layers.map((layer, index) => {
    const placed: PNode[] = [];
    for (const node of layer.nodes) {
      if (nodes.has(node.id)) continue;
      const box = BOX[node.size];
      const pn: PNode = {
        id: node.id,
        node,
        layer: index,
        order: placed.length,
        col: grid.col.get(node.id) ?? 0,
        x: 0,
        w: box.w,
        h: box.h,
      };
      nodes.set(node.id, pn);
      placed.push(pn);
    }
    const rowH = placed.length === 0 ? BOX.m.h : Math.max(...placed.map((n) => n.h));
    return { index, id: layer.id, label: layer.label, nodes: placed, rowH };
  });

  // Groups that can be boxed, with their members.
  const broken = new Set(grid.groupProblems.map((p) => p.group));
  const groupIds = (d.groups ?? []).map((g) => g.id).filter((g) => !broken.has(g));
  const membersOf = new Map<string, PNode[]>();
  for (const l of layers) {
    for (const n of l.nodes) {
      const g = n.node.group;
      if (g === undefined || !groupIds.includes(g)) continue;
      const list = membersOf.get(g) ?? [];
      list.push(n);
      membersOf.set(g, list);
    }
  }
  const groupOf = (n: PNode) => {
    const g = n.node.group;
    return g !== undefined && membersOf.has(g) ? g : undefined;
  };

  // Room between columns: x[j] >= x[i] + d for i < j.
  const columns = Math.max(1, grid.columns);
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
  const labelSpan = (g: string) => text.groupLabelW(g) + 2 * GROUP.labelInset;
  // The left side of a group's box and of its label room, as terms from each member.
  const boxLeft = (g: string) => (membersOf.get(g) ?? []).map((m) => ({ col: m.col, d: m.w / 2 }));
  /** Terms that give the right side of what lies left of a gap: a box, or a node. */
  const rightTerms = (n: PNode, other: PNode): { col: number; d: number }[] => {
    const g = groupOf(n);
    if (g === undefined || groupOf(other) === g) return [{ col: n.col, d: n.w / 2 }];
    return (membersOf.get(g) ?? []).flatMap((m) => [
      { col: m.col, d: m.w / 2 + GROUP.pad },
      { col: m.col, d: -m.w / 2 - GROUP.pad + labelSpan(g) },
    ]);
  };
  const leftTerms = (n: PNode, other: PNode): { col: number; d: number }[] => {
    const g = groupOf(n);
    if (g === undefined || groupOf(other) === g) return [{ col: n.col, d: n.w / 2 }];
    return boxLeft(g).map((t) => ({ col: t.col, d: t.d + GROUP.pad }));
  };
  // Every node beside a group's members in a row keeps clear of its box, and so
  // does every other group's box.
  for (const l of layers) {
    for (let k = 1; k < l.nodes.length; k++) {
      const a = l.nodes[k - 1] as PNode;
      const b = l.nodes[k] as PNode;
      if (groupOf(a) === groupOf(b)) continue;
      const both = groupOf(a) !== undefined && groupOf(b) !== undefined;
      const between = both ? GROUP.gap : GROUP.clear;
      for (const r of rightTerms(a, b))
        for (const s of leftTerms(b, a)) add(r.col, s.col, r.d + between + s.d);
    }
  }
  // A group with members in several rows: a node beside it in any of its rows.
  for (const [g, ms] of membersOf) {
    const top = Math.min(...ms.map((m) => m.layer));
    const bottom = Math.max(...ms.map((m) => m.layer));
    for (let r = top; r <= bottom; r++) {
      const list = layers[r]?.nodes ?? [];
      const at = list.map((n, k) => (groupOf(n) === g ? k : -1)).filter((k) => k >= 0);
      if (at.length === 0) continue;
      const left = list[(at[0] as number) - 1];
      const right = list[(at[at.length - 1] as number) + 1];
      const anyMember = ms[0] as PNode;
      if (left !== undefined) {
        const between = groupOf(left) !== undefined ? GROUP.gap : GROUP.clear;
        for (const r2 of rightTerms(left, anyMember)) {
          for (const t of boxLeft(g)) add(r2.col, t.col, r2.d + between + GROUP.pad + t.d);
        }
      }
      if (right !== undefined) {
        const between = groupOf(right) !== undefined ? GROUP.gap : GROUP.clear;
        for (const t of rightTerms(anyMember, right)) {
          for (const s of leftTerms(right, anyMember)) add(t.col, s.col, t.d + between + s.d);
        }
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
  const groups: PGroup[] = [];
  for (const g of groupIds) {
    const ms = membersOf.get(g);
    if (ms === undefined) continue;
    const x0 = Math.min(...ms.map((m) => m.x)) - GROUP.pad;
    const x1 = Math.max(Math.max(...ms.map((m) => m.x + m.w)) + GROUP.pad, x0 + labelSpan(g));
    groups.push({
      id: g,
      label: d.groups?.find((x) => x.id === g)?.label ?? g,
      members: ms.map((m) => m.id),
      top: Math.min(...ms.map((m) => m.layer)),
      bottom: Math.max(...ms.map((m) => m.layer)),
      x0,
      x1,
      labelX: x0 + GROUP.labelInset,
      labelW: text.groupLabelW(g),
    });
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
  const centre = Number.isFinite(lo) ? Math.floor((lo + hi) / 8) * 4 : 0;
  for (const n of nodes.values()) n.x -= centre;
  for (const g of groups) {
    g.x0 -= centre;
    g.x1 -= centre;
    g.labelX -= centre;
  }

  const byId = new Map(groups.map((g) => [g.id, g]));
  const sideLabels = new Map<string, number>();
  for (const [id, slot] of text.sideways) {
    if (slot.label === undefined) continue;
    const a = nodes.get(slot.left);
    const b = nodes.get(slot.right);
    const w = text.edgeLabelW(id);
    if (a === undefined || b === undefined || w === undefined) continue;
    const ga = groupOf(a);
    const gb = groupOf(b);
    const left = ga !== undefined && ga !== gb ? (byId.get(ga)?.x1 ?? a.x + a.w) : a.x + a.w;
    const right = gb !== undefined && ga !== gb ? (byId.get(gb)?.x0 ?? b.x) : b.x;
    sideLabels.set(id, (left + right) / 2 - w / 2);
  }
  return {
    layers,
    nodes,
    groups,
    sideLabels,
    problems: grid.alignProblems,
    groupProblems: grid.groupProblems,
  };
}

export const centreX = (n: PNode): number => n.x + n.w / 2;
