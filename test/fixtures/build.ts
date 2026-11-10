// Shorthand for writing fixture diagrams. Fixtures use fictional systems only.

import type { DiagramNode, Edge, EdgeKind, NodeKind, SizeStep } from "../../src/model/types.ts";

/** An edge with the id `<from>-<to>`, as the fixtures name their edges. */
export function e(from: string, to: string, kind: EdgeKind, label?: string): Edge {
  const edge: Edge = { id: `${from}-${to}`, from, to, kind };
  if (label !== undefined) edge.label = label;
  return edge;
}

export function n(
  id: string,
  label: string,
  kind: NodeKind,
  size: SizeStep,
  extra: { sublabel?: string; emphasis?: boolean; align?: string; group?: string } = {},
): DiagramNode {
  const node: DiagramNode = { id, label, kind, size };
  if (extra.sublabel !== undefined) node.sublabel = extra.sublabel;
  if (extra.emphasis !== undefined) node.emphasis = extra.emphasis;
  if (extra.align !== undefined) node.align = extra.align;
  if (extra.group !== undefined) node.group = extra.group;
  return node;
}
