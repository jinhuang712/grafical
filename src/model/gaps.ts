// The gap between two regions takes a multiple (specs/decisions, "The gap between two regions takes a multiple").
// The diagram holds which two regions and by how much, and the layout widens that gap wherever they still neighbour.

import { groupNodes, inGroup } from "./groups.ts";
import type { Diagram } from "./types.ts";

export type RegionKind = "layer" | "group" | "column";

export function regionKind(d: Diagram, id: string): RegionKind | undefined {
  if (d.layers.some((l) => l.id === id)) return "layer";
  if ((d.groups ?? []).some((g) => g.id === id)) return "group";
  if ((d.columns ?? []).some((c) => c.id === id)) return "column";
  return undefined;
}

/** The first and last layer a group's borders sit in. A group of nodes placed by steps has none. */
function rowsOf(d: Diagram, id: string): [number, number] | undefined {
  const members = new Set(groupNodes(d, id));
  const rows = d.layers.flatMap((l, i) => (l.nodes.some((n) => members.has(n)) ? [i] : []));
  const first = rows[0];
  const last = rows[rows.length - 1];
  return first === undefined || last === undefined ? undefined : [first, last];
}

/** Whether one group's border ends in the layer above the other's first. */
function stacked(d: Diagram, a: string, b: string): boolean {
  const x = rowsOf(d, a);
  const y = rowsOf(d, b);
  return x !== undefined && y !== undefined && (x[1] + 1 === y[0] || y[1] + 1 === x[0]);
}

/** Whether a node of one group stands next to a node of the other in a layer. */
function beside(d: Diagram, a: string, b: string): boolean {
  return d.layers.some((l) =>
    l.nodes.some((n, k) => {
      const m = l.nodes[k + 1];
      if (m === undefined) return false;
      return (inGroup(d, n, a) && inGroup(d, m, b)) || (inGroup(d, n, b) && inGroup(d, m, a));
    }),
  );
}

/** Whether two regions of one kind are neighbours. */
export function neighbours(d: Diagram, a: string, b: string): boolean {
  const kind = regionKind(d, a);
  if (a === b || kind === undefined || kind !== regionKind(d, b)) return false;
  if (kind === "group") return stacked(d, a, b) || beside(d, a, b);
  const list = kind === "layer" ? d.layers : (d.columns ?? []);
  const at = (id: string) => list.findIndex((x) => x.id === id);
  return Math.abs(at(a) - at(b)) === 1;
}

/** How much the agent magnified the gap between two regions: 1 where it stated nothing. */
export function magnifiedBetween(d: Diagram, a: string, b: string): number {
  const gap = (d.gaps ?? []).find((g) => g.between.includes(a) && g.between.includes(b));
  return gap === undefined ? 1 : gap.magnified;
}

/** How much the gutter below layer `i` is magnified, by its two layers or by two groups stacked across it. */
export function gutterMagnified(d: Diagram, i: number): number {
  let out = 1;
  for (const g of d.gaps ?? []) {
    const [a, b] = g.between;
    const kind = regionKind(d, a);
    const here =
      kind === "layer"
        ? [a, b].includes(d.layers[i]?.id ?? "") && [a, b].includes(d.layers[i + 1]?.id ?? "")
        : kind === "group" &&
          stacked(d, a, b) &&
          Math.max(rowsOf(d, a)?.[0] ?? 0, rowsOf(d, b)?.[0] ?? 0) === i + 1;
    if (here) out = Math.max(out, g.magnified);
  }
  return out;
}

/** After an operation removed a region, its gaps go too. */
export function pruneGaps(d: Diagram): void {
  if (d.gaps === undefined) return;
  const left = d.gaps.filter((g) => g.between.every((id) => regionKind(d, id) !== undefined));
  if (left.length > 0) d.gaps = left;
  else delete d.gaps;
}
