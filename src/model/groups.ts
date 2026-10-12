// Groups inside groups (D7, D34): which groups hold a node or a group, through
// every level. A group names the group it sits in; a node names its innermost one.

import type { Diagram, DiagramNode } from "./types.ts";

/** Groups may sit inside each other this deep: a region, a network in it, a host group in that. */
export const MAX_GROUP_DEPTH = 3;

/** A group and every group around it, innermost first. Stops at a cycle or an unknown parent. */
export function groupChain(d: Diagram, id: string | undefined): string[] {
  const parent = new Map((d.groups ?? []).map((g) => [g.id, g.in]));
  const out: string[] = [];
  for (let at = id; at !== undefined && !out.includes(at); at = parent.get(at)) {
    out.push(at);
    if (!parent.has(at)) break;
  }
  return out;
}

/** Whether a node lies in a group, directly or through the groups inside it. */
export function inGroup(d: Diagram, n: DiagramNode, id: string): boolean {
  return groupChain(d, n.group).includes(id);
}

/** The nodes of a group, its own and its inner groups', in layer order. */
export function groupNodes(d: Diagram, id: string): DiagramNode[] {
  return d.layers.flatMap((l) => l.nodes.filter((n) => inGroup(d, n, id)));
}

/** The groups directly inside a group. */
export function innerGroups(d: Diagram, id: string): string[] {
  return (d.groups ?? []).filter((g) => g.in === id).map((g) => g.id);
}
