// The diagram model: the facts a diagram file holds (DESIGN.md D6, D7, D8).
// Positions are never part of the model. The engine computes them (D10).

export const FORMAT_VERSION = 1;

export const NODE_KINDS = ["service", "store", "queue", "external", "actor"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_KINDS = ["call", "async", "data", "link", "optional"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export const SIZE_STEPS = ["s", "m", "l"] as const;
export type SizeStep = (typeof SIZE_STEPS)[number];

export const DENSITIES = ["compact", "normal", "airy"] as const;
export type Density = (typeof DENSITIES)[number];

/**
 * The line styles an edge is drawn in (D8, D33): call and data are solid, async dashed,
 * optional dotted, and a link is a plain line with no arrowhead. The legend names each.
 */
export const LINE_STYLES = ["solid", "dashed", "dotted", "plain"] as const;
export type LineStyleName = (typeof LINE_STYLES)[number];

/** How the engine sizes a node that has no size (D27). */
export const SIZINGS = ["auto", "fixed"] as const;
export type Sizing = (typeof SIZINGS)[number];

export interface DiagramNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Absent: the engine sizes the box to its text, unless the diagram's sizing is fixed (D27). */
  size?: SizeStep;
  /** A second, smaller line, such as a port or a topic name. */
  sublabel?: string;
  /** Marks one of the one or two things a reader should see first. */
  accent?: boolean;
  /** The id of a node in another layer that this node sits directly above or below. */
  align?: string;
  /** The id of the group (system) this node belongs to (D7). */
  group?: string;
  /** The lane this node lies in, when lanes run as columns (D32). */
  lane?: string;
}

/** A system drawn as one box around its member nodes, which may sit in several neighbouring rows (D7). */
export interface Group {
  id: string;
  label: string;
  /** A second, quieter part of the label, such as "write side". */
  sublabel?: string;
}

export interface Layer {
  id: string;
  label: string;
  /** The lane this layer lies in, when lanes run as rows (D32). */
  lane?: string;
  /** Ordered: list order is the order within the layer. */
  nodes: DiagramNode[];
}

/**
 * A swimlane: a labelled band that names who owns what (D32). Its members name
 * it: layers, when lanes run as rows, or nodes, when lanes run as columns. All
 * lanes of a diagram run one way.
 */
export interface Lane {
  id: string;
  label: string;
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
  /** "fixed": a node with no size is a medium box, whatever its text. Absent: auto (D27). */
  sizing?: "fixed";
  /** A built-in theme's name, or a stylesheet's path relative to the file (D30). Absent: the default theme. */
  style?: string;
  /** The legend's wording per line style, where it differs from the default. */
  legend?: Partial<Record<LineStyleName, string>>;
  /** Ordered top to bottom. */
  layers: Layer[];
  /** The systems, in creation order. Absent or empty: no groups. Members name their group (D7). */
  groups?: Group[];
  /** The swimlanes. Lanes that run as columns go left to right in this order (D32). */
  lanes?: Lane[];
  /** Ordered: list order is creation order, and decides nothing visual. */
  edges: Edge[];
}

export const DEFAULT_NODE_KIND: NodeKind = "service";
export const DEFAULT_EDGE_KIND: EdgeKind = "call";
export const DEFAULT_SIZE: SizeStep = "m";
export const DEFAULT_DENSITY: Density = "normal";
