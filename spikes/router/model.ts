// Minimal diagram model for the router spike. Not the final file format.

export type NodeKind = "service" | "store" | "queue" | "external" | "actor";
export type EdgeKind = "call" | "async" | "data";
export type SizeStep = "s" | "m" | "l";
export type Density = "compact" | "normal" | "airy";

export interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  kind: NodeKind;
  size: SizeStep;
  /** Centre this node under (or over) a node in an earlier layer (D6). */
  alignWith?: string;
}

export interface Layer {
  id: string;
  label: string;
  nodes: DiagramNode[];
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
}

export interface Diagram {
  title: string;
  density: Density;
  layers: Layer[];
  edges: Edge[];
}

/** Shorthand for writing fixtures: `e("a", "b", "call", "label")`. */
export function e(from: string, to: string, kind: EdgeKind, label?: string): Edge {
  const edge: Edge = { id: `${from}->${to}`, from, to, kind };
  if (label !== undefined) edge.label = label;
  return edge;
}

export function withEdge(d: Diagram, edge: Edge): Diagram {
  return { ...d, edges: [...d.edges, edge] };
}
