// Shorthand for writing fixture diagrams. Fixtures use fictional systems only.

import type { DiagramNode, Edge, EdgeKind, NodeKind, SizeStep } from "../../src/model/types.ts";

/** An edge with the default id `<from>-><to>` (D4). */
export function e(from: string, to: string, kind: EdgeKind, label?: string): Edge {
  const edge: Edge = { id: `${from}->${to}`, from, to, kind };
  if (label !== undefined) edge.label = label;
  return edge;
}

export function n(
  id: string,
  label: string,
  kind: NodeKind,
  size: SizeStep,
  extra: { sublabel?: string; accent?: boolean; align?: string } = {},
): DiagramNode {
  const node: DiagramNode = { id, label, kind, size };
  if (extra.sublabel !== undefined) node.sublabel = extra.sublabel;
  if (extra.accent !== undefined) node.accent = extra.accent;
  if (extra.align !== undefined) node.align = extra.align;
  return node;
}
