// The diagram model: the facts a diagram file holds (DESIGN.md D6, D7, D8).
// Positions are never part of the model. The engine computes them (D10).

export const FORMAT_VERSION = 1;

export const NODE_KINDS = ["service", "store", "queue", "external", "actor"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_KINDS = ["call", "async", "data"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export const SIZE_STEPS = ["s", "m", "l"] as const;
export type SizeStep = (typeof SIZE_STEPS)[number];

export const DENSITIES = ["compact", "normal", "airy"] as const;
export type Density = (typeof DENSITIES)[number];

export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
  size: SizeStep;
  /** A second, smaller line, such as a port or a topic name. */
  sublabel?: string;
  /** Marks one of the one or two things a reader should see first. */
  accent?: boolean;
  /** The id of a node in another layer that this node sits directly above or below. */
  align?: string;
  /** The id of the group (system) this node belongs to (D7). */
  group?: string;
}

/** A system drawn as one box around its member nodes, which may sit in several neighbouring rows (D7). */
export interface Group {
  id: string;
  label: string;
}

export interface Layer {
  id: string;
  label: string;
  /** Ordered: list order is the order within the layer. */
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
  /** The format version (D22). */
  grafical: number;
  title: string;
  /** One sentence under the title (D26). */
  subtitle?: string;
  /** A footnote, such as "Not shown: …" (D26). */
  note?: string;
  density: Density;
  /** Ordered top to bottom. */
  layers: Layer[];
  /** The systems, in creation order. Absent or empty: no groups. Members name their group (D7). */
  groups?: Group[];
  /** Ordered: list order is creation order, and decides nothing visual. */
  edges: Edge[];
}

export const DEFAULT_NODE_KIND: NodeKind = "service";
export const DEFAULT_EDGE_KIND: EdgeKind = "call";
export const DEFAULT_SIZE: SizeStep = "m";
export const DEFAULT_DENSITY: Density = "normal";
