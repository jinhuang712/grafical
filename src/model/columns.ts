// Columns (DESIGN.md, "Columns beside rows"): a guide that boxes follow beside their rows. Every box of
// a column lies left of every box of the next, in every row; a box in no column keeps
// its place beside the box left of it. Nothing is drawn.

import type { OpError } from "../errors.ts";
import { laneRun } from "./lanes.ts";
import { closest } from "./suggest.ts";
import type { Diagram, DiagramNode } from "./types.ts";

/** Each column's place, left to right. */
export function columnRanks(d: Diagram): Map<string, number> {
  return new Map((d.columns ?? []).map((c, i) => [c.id, i]));
}

/**
 * A row's nodes in column order: each column's in turn, and a node in no column right
 * after the node left of it, or first when nothing is left of it. Within that, the
 * row's own order.
 */
export function inColumnOrder(
  nodes: readonly DiagramNode[],
  ranks: Map<string, number>,
): DiagramNode[] {
  let left = -1;
  return nodes
    .map((n, k) => {
      const r = n.column === undefined ? undefined : ranks.get(n.column);
      if (r !== undefined) left = r;
      return { n, k, key: r ?? left };
    })
    .sort((a, b) => a.key - b.key || a.k - b.k)
    .map((x) => x.n);
}

/** Whether a row's nodes with a column come in column order. */
export function columnOrdered(nodes: readonly DiagramNode[], ranks: Map<string, number>): boolean {
  let last = -1;
  for (const n of nodes) {
    const r = n.column === undefined ? undefined : ranks.get(n.column);
    if (r === undefined) continue;
    if (r < last) return false;
    last = r;
  }
  return true;
}

/** Puts each row in column order. Returns the ids of the nodes that moved. */
export function orderByColumns(d: Diagram): string[] {
  if ((d.columns ?? []).length === 0) return [];
  const ranks = columnRanks(d);
  const moved: string[] = [];
  for (const l of d.layers) {
    if (columnOrdered(l.nodes, ranks)) continue;
    const next = inColumnOrder(l.nodes, ranks);
    next.forEach((n, k) => {
      if (l.nodes[k] !== n) moved.push(n.id);
    });
    l.nodes = next;
  }
  return moved;
}

/** Column rules: a node's column exists, and columns and column lanes do not mix. */
export function checkColumns(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const ids = (d.columns ?? []).map((c) => c.id);
  d.layers.forEach((l, li) => {
    l.nodes.forEach((n, ni) => {
      if (n.column === undefined || ids.includes(n.column)) return;
      errors.push({
        code: "unknown-column",
        index,
        field: `layers[${li}].nodes[${ni}].column`,
        found: n.column,
        facts: { near: closest(n.column, ids) },
      });
    });
  });
  if (ids.length > 0 && laneRun(d) === "columns") {
    errors.push({
      code: "column-lanes",
      index,
      field: "columns",
      found: ids[0] as string,
      facts: {
        lanes: (d.lanes ?? []).map((x) => x.id),
        fix: ids.map((id) => `column remove <file> ${id}`),
      },
    });
  }
  return errors;
}
