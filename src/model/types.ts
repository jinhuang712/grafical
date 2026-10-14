// The diagram model: the facts a diagram file holds (DESIGN.md D6, D7, D8).
// Positions are never part of the model. The engine computes them (D10).

export const FORMAT_VERSION = 1;

export const NODE_KINDS = [
  "service",
  "store",
  "queue",
  "external",
  "actor",
  "state",
  "terminal",
  "decision",
  "initial",
  "final",
] as const;
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

/**
 * Where a mark sits on a node (D40): over one of its four corners, or in a column
 * inside the box, left of the text.
 */
export const MARK_SLOTS = ["top-left", "top-right", "bottom-left", "bottom-right", "left"] as const;
export type MarkSlot = (typeof MARK_SLOTS)[number];

/**
 * A mark: an emoji or a short text, or an SVG or PNG file next to the diagram file.
 * A file is kept with its SHA-256, so a changed file is caught (D40, D15).
 */
export type Mark =
  | string
  | { file: string; sha256: string; size?: MarkSize }
  | ({ text: string } & MarkStyle);

export const MARK_SIZES = ["s", "m", "l"] as const;
export type MarkSize = (typeof MARK_SIZES)[number];

/** The outline of a text mark's badge: square corners, slightly rounded ones, or a pill. */
export const MARK_SHAPES = ["square", "rounded", "pill"] as const;
export type MarkShape = (typeof MARK_SHAPES)[number];

/**
 * What a text mark may set beyond its text (D40). Colors are `#rrggbb`, kept as hex.
 * Every field is absent when it holds its default: a dark badge, light or dark text
 * that reads on it, no border, a rounded shape, the medium size.
 */
export interface MarkStyle {
  bg?: string;
  border?: string;
  fg?: string;
  shape?: MarkShape;
  size?: MarkSize;
}

export const DEFAULT_MARK_SIZE: MarkSize = "m";
export const DEFAULT_MARK_SHAPE: MarkShape = "rounded";

/** A mark's style: the size of a file, and everything a text mark sets. */
export function markStyle(m: Mark): MarkStyle {
  if (typeof m === "string") return {};
  if ("file" in m) return m.size === undefined ? {} : { size: m.size };
  const { text: _text, ...style } = m;
  return style;
}

/**
 * The colors a text mark's background may be named by. Any `#rrggbb` is allowed too.
 * A name is turned into its hex when the mark is set, so a change here never
 * changes a file that already exists (D15).
 */
export const MARK_COLORS = {
  red: "#d1242f",
  amber: "#bf8700",
  green: "#1a7f37",
  blue: "#0969da",
  purple: "#8250df",
  gray: "#57606a",
  dark: "#1f2328",
} as const;

/** The text of a text or emoji mark, with or without a background. A file has none. */
export function markText(m: Mark): string | undefined {
  if (typeof m === "string") return m;
  return "text" in m ? m.text : undefined;
}

/** What the legend names a mark by: its emoji or text, or its file's name (D42). */
export function markName(m: Mark): string {
  return markText(m) ?? (m as { file: string }).file;
}

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
  /** The column this node follows (D45). */
  column?: string;
  /** Marks in fixed slots, such as a warning at the top-left (D40). */
  icons?: Partial<Record<MarkSlot, Mark>>;
}

/** A system drawn as one box around its member nodes, which may sit in several rows (D7). */
export interface Group {
  id: string;
  label: string;
  /** A second, quieter part of the label, such as "write side". */
  sublabel?: string;
  /** The group this one sits inside, drawn as a box within its box (D34). */
  in?: string;
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
/** A column (D45): a guide that its nodes follow, left of the next column's in every row. */
export interface Column {
  id: string;
}

export interface Lane {
  id: string;
  label: string;
}

/**
 * A wall (D43): empty space between two sides, each a list of nodes and groups. A line
 * from one side to the other crosses it only where `allow` names the line, or a node or
 * group at one of its ends.
 */
export interface Wall {
  id: string;
  between: string[];
  and: string[];
  /** Lines, nodes and groups the wall lets through. */
  allow?: string[];
  /** Drawn as a dashed line through the wall's middle, with these words at its start. Absent: invisible. */
  label?: string;
}

/** A note (D44): a short text about a node, a group or a line, drawn as a callout or a footnote. */
export interface Note {
  /** The id of the node, group or line it is about. */
  on: string;
  text: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  /** true: an arrowhead at both ends. A link has none (D33). */
  both?: boolean;
  /** true: drawn thick, as part of the main path (D33). Means `weight: thick`; `weight` wins. */
  accent?: boolean;
  /** A weight level the stylesheet names, or a width in pixels (D41). Absent: thin. */
  weight?: string | number;
}

/**
 * The legend's words (D42): per line style; per line width, named by its level or, for
 * a width in pixels, by its number written as a string; and per mark, by its name.
 * `false` leaves a line style's or a width's entry out. A mark is left out by not naming it.
 */
export type Legend = Partial<Record<LineStyleName, string | false>> & {
  weights?: Record<string, string | false>;
  marks?: Record<string, string>;
};

/** How the legend names an edge's weight: its level, or its width in pixels as text (D42). */
export function weightKey(w: string | number): string {
  return typeof w === "number" ? String(w) : w;
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
  /** The legend's words, where they differ from the default (D42). */
  legend?: Legend;
  /** Ordered top to bottom. */
  layers: Layer[];
  /** The systems, in creation order. Absent or empty: no groups. Members name their group (D7). */
  groups?: Group[];
  /** The swimlanes. Lanes that run as columns go left to right in this order (D32). */
  lanes?: Lane[];
  /** Columns, left to right (D45). */
  columns?: Column[];
  /** Empty space between two sides, in creation order (D43). */
  walls?: Wall[];
  /** One note at most per node, group or line, in creation order (D44). */
  notes?: Note[];
  /** Ordered: list order is creation order, and decides nothing visual. */
  edges: Edge[];
}

export const DEFAULT_NODE_KIND: NodeKind = "service";
export const DEFAULT_EDGE_KIND: EdgeKind = "call";
export const DEFAULT_SIZE: SizeStep = "m";
export const DEFAULT_DENSITY: Density = "normal";
