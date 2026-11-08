// The diagram model: the facts a diagram file holds (DESIGNS.md, "Looks are free, while shape and dash follow the type", specs/decisions, "Facts over coordinates", "Layers unseen, groups as systems").
// Positions are never part of the model. The engine computes them (specs/decisions, "Layout computed again on every change").

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
  "choice",
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_KINDS = ["call", "async", "data", "link", "optional"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export const SIZE_STEPS = ["s", "m", "l"] as const;
export type SizeStep = (typeof SIZE_STEPS)[number];

export const DENSITIES = ["compact", "normal", "airy"] as const;
export type Density = (typeof DENSITIES)[number];

/**
 * The edge styles an edge is drawn in (DESIGNS.md, "Looks are free, while shape and dash follow the type", specs/decisions, "Edges meet any side"): call and data are solid, async dashed,
 * optional dotted, and a link is a plain edge with no arrowhead. The legend names each.
 */
export const EDGE_STYLES = ["solid", "dashed", "dotted", "plain"] as const;
export type EdgeStyleName = (typeof EDGE_STYLES)[number];

/**
 * How a layer is drawn once an edge ends at it (specs/decisions, "A layer with no node as one bar"): as a node, with a node's
 * paint and a dark label, or as a band, with the band's light fill and muted label.
 */
export const LAYER_LOOKS = ["box", "band"] as const;
export type LayerLook = (typeof LAYER_LOOKS)[number];

/**
 * Where a group's label sits, as the agent states it (specs/decisions, "The agent states where a group's label sits"):
 * in the head or the foot, at the node's left, middle or right, or centred just outside its
 * top or bottom side, or beside its layers inside or outside its left or right side. Absent:
 * in the head, where the edges into the group's first layer keep their centres.
 */
export interface DiagramTitle {
  /** From 0 to 1 across the picture: the title's own point at this fraction meets the width's. */
  at: number;
  side: "top" | "bottom";
}

export interface GroupTitle {
  /** From 0 to 1 along the side: the label's own point at this fraction meets the side's. */
  at: number;
  side: EdgeSide;
  place: LabelPlace;
}

export const LABEL_PLACES = ["inside", "outside"] as const;
export type LabelPlace = (typeof LABEL_PLACES)[number];

/** The places a blocked title is tried at: each end and the middle of the sides it reads best on. */
export const GROUP_TITLES: readonly GroupTitle[] = [
  { at: 0, side: "top", place: "inside" },
  { at: 0.5, side: "top", place: "inside" },
  { at: 1, side: "top", place: "inside" },
  { at: 0, side: "bottom", place: "inside" },
  { at: 0.5, side: "bottom", place: "inside" },
  { at: 1, side: "bottom", place: "inside" },
  { at: 0.5, side: "top", place: "outside" },
  { at: 0.5, side: "bottom", place: "outside" },
  { at: 0.5, side: "left", place: "inside" },
  { at: 0.5, side: "right", place: "inside" },
  { at: 0.5, side: "left", place: "outside" },
  { at: 0.5, side: "right", place: "outside" },
];

/** How the engine sizes a node that has no size (specs/decisions, "Nodes sized to their text"). */
export const SIZINGS = ["auto", "fixed"] as const;
export type Sizing = (typeof SIZINGS)[number];

/**
 * Where a mark sits on a node (specs/decisions, "Marks of any kind"): over one of its four corners, or in a column
 * inside the node, left of the text.
 */
export const MARK_SLOTS = ["top-left", "top-right", "bottom-left", "bottom-right", "left"] as const;
export type MarkSlot = (typeof MARK_SLOTS)[number];

/**
 * A mark: an emoji or a short text, or an SVG or PNG file next to the diagram file.
 * A file is kept with its SHA-256, so a changed file is caught (DESIGNS.md, "The same file gives the same picture on any machine", specs/decisions, "Marks of any kind").
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
 * What a text mark may set beyond its text (specs/decisions, "Marks of any kind"). Colors are `#rrggbb`, kept as hex.
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
 * changes a file that already exists (DESIGNS.md, "The same file gives the same picture on any machine").
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

/** What the legend names a mark by: its emoji or text, or its file's name (specs/decisions, "A legend for widths and marks"). */
export function markName(m: Mark): string {
  return markText(m) ?? (m as { file: string }).file;
}

export interface DiagramNode {
  id: string;
  label: string;
  /** Absent: centred. */
  labelAlign?: LabelAlign;
  kind: NodeKind;
  /** Absent: the engine sizes the node to its text, unless the diagram's sizing is fixed (specs/decisions, "Nodes sized to their text"). */
  size?: SizeStep;
  /** A second, smaller edge, such as a port or a topic name. */
  sublabel?: string;
  /** Marks one of the one or two things a reader should see first. */
  emphasis?: boolean;
  /** The id of a node in another layer that this node sits directly above or below. */
  align?: string;
  /** The id of the group (system) this node belongs to (specs/decisions, "Layers unseen, groups as systems"). */
  group?: string;
  /** The lane this node lies in, when lanes run as columns (specs/decisions, "Lanes run one way"). */
  lane?: string;
  /** The column this node follows (specs/decisions, "Columns beside layers"). */
  column?: string;
  /** The type it is, when an agent defined it. `kind` then holds the kind that draws it. */
  type?: string;
  /** The object of its own sort whose look it follows (specs/decisions, "`like` follows an object's look and nothing else"). */
  like?: string;
  /** The styles it marks, a later one over an earlier one. */
  style?: string[];
  /** Marks in fixed slots, such as a warning at the top-left (specs/decisions, "Marks of any kind"). */
  marks?: Partial<Record<MarkSlot, Mark>>;
  /** The node a node in no layer is placed from, by the steps below (specs/decisions, "Steps from another node"). */
  from?: string;
  /** Steps down, up, left or right from `from`, each a cell of the column grid (specs/decisions, "Steps from another node"). */
  down?: number;
  up?: number;
  left?: number;
  right?: number;
}

/** A system drawn as one node around its member nodes, which may sit in several layers (specs/decisions, "Layers unseen, groups as systems"). */
export interface Group {
  id: string;
  label: string;
  /** A second, quieter part of the label, such as "write side". */
  sublabel?: string;
  /** The group this one sits inside, drawn as a node within its node (specs/decisions, "Every layered diagram type"). */
  in?: string;
  /** Where its label sits. Absent: the engine seats it in the head. */
  titleAt?: GroupTitle;
  /** The object of its own sort whose look it follows (specs/decisions, "`like` follows an object's look and nothing else"). */
  like?: string;
  /** The styles it marks. */
  style?: string[];
}

export interface Layer {
  id: string;
  /** Where its label sits, from 0 to 1 along its head (specs/decisions, "A region's label sits at a fraction of a side"). */
  labelAt?: number;
  /** Its name, drawn only when the layer is drawn (specs/decisions, "A layer with a look is drawn"). */
  label?: string;
  /** The lane this layer lies in, when lanes run as layers (specs/decisions, "Lanes run one way"). */
  lane?: string;
  /** How the layer is drawn; a layer with a look is drawn though no edge ends at it. Absent: the layer is drawn only once an edge ends at it, a node with no node in it and a band with nodes (specs/decisions, "A layer with no node as one bar", "A layer with a look is drawn"). */
  look?: LayerLook;
  /** Ordered: list order is the order within the layer. */
  nodes: DiagramNode[];
}

/**
 * A swimlane: a labelled band that names who owns what (specs/decisions, "Lanes run one way"). Its members name
 * it: layers, when lanes run as layers, or nodes, when lanes run as columns. All
 * lanes of a diagram run one way.
 */
/** A column (specs/decisions, "Columns beside layers"): a guide that its nodes follow, left of the next column's in every layer. */
export interface Column {
  id: string;
}

/** How much a gap may be magnified (specs/decisions, "The gap between two regions may be magnified"). */
export const GAP_MAGNIFICATIONS = [1.25, 1.5, 2] as const;
export type GapMagnified = (typeof GAP_MAGNIFICATIONS)[number];

/** A wider gap between two neighbouring regions of one kind: layers, groups or columns. */
export interface Gap {
  between: [string, string];
  magnified: GapMagnified;
}

/** How a text's edges edge up (specs/decisions, "An agent sets a label's breaks and its alignment"). */
export const LABEL_ALIGNS = ["left", "center", "right"] as const;
export type LabelAlign = (typeof LABEL_ALIGNS)[number];

export interface Lane {
  id: string;
  label: string;
  /** Where its label sits, from 0 to 1 along its head (specs/decisions, "A region's label sits at a fraction of a side"). */
  labelAt?: number;
  /** Absent: left in a lane of layers and centred in a lane of columns. */
  labelAlign?: LabelAlign;
  /** The object of its own sort whose look it follows (specs/decisions, "`like` follows an object's look and nothing else"). */
  like?: string;
  /** The styles it marks. */
  style?: string[];
}

/**
 * A wall (specs/decisions, "Walls as space"): empty space between two sides, each a list of nodes and groups. An edge
 * from one side to the other crosses it only where `allow` names the edge, or a node or
 * group at one of its ends.
 */
export interface Wall {
  id: string;
  between: string[];
  and: string[];
  /** Edges, nodes and groups the wall lets through. */
  allow?: string[];
  /** Drawn as a dashed edge through the wall's middle, with these words at its start. Absent: invisible. */
  label?: string;
  /** Absent: centred. */
  labelAlign?: LabelAlign;
}

/** A note (specs/decisions, "Notes as callouts or footnotes"): a short text about a node, a group or an edge, drawn as a callout or a footnote. */
export interface Note {
  /** The id of the node, group or edge it is about. */
  on: string;
  text: string;
  /**
   * true: a footnote, a number on its target and its text in a list at the bottom. Absent: a card
   * beside its target, refused where there is no room for one (specs/decisions, "A note is what the agent states").
   */
  footnote?: true;
  /** How a card's edges edge up. Absent: left. */
  labelAlign?: LabelAlign;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  /** The styles its label marks (specs/decisions, "A label may mark a style"). */
  labelStyle?: string[];
  /** Absent: centred. */
  labelAlign?: LabelAlign;
  /** true: an arrowhead at both ends. A link has none (specs/decisions, "Edges meet any side"). */
  both?: boolean;
  /** true: the edge may pass the layers with no node between its ends (specs/decisions, "A layer with no node as one bar"). */
  pass?: boolean;
  /** A weight level the stylesheet names, or a width in pixels (specs/decisions, "Edge weights"). Absent: thin. */
  weight?: string | number;
  /** The side it leaves by, where the agent states one. Absent: the router's. */
  out?: EdgeSide;
  /** The side it enters by, where the agent states one. Absent: the router's. */
  in?: EdgeSide;
  /** Its label sits beside it, where the agent took it off the edge. Absent: on the edge. */
  seat?: "beside";
  /** The type it is, when an agent defined it. */
  type?: string;
  /** The object of its own sort whose look it follows (specs/decisions, "`like` follows an object's look and nothing else"). */
  like?: string;
  /** The styles it marks. */
  style?: string[];
  /** Its number in a process, drawn as a badge on the edge (specs/decisions, "Step badges ride the edge"). Absent: none. */
  step?: number;
  /** The object it passes and on which side (specs/decisions, "An edge is steered by facts and never by coordinates"). */
  via?: EdgeVia;
  /** true: a line with no bend, or the write is refused. */
  straight?: boolean;
  /** true: the main flow, which takes its column first. */
  main?: boolean;
  /** The edge whose trunk it runs along, which shares one of its ends. */
  with?: string;
  /** Where between its neighbours its longest inner run sits. */
  bendAt?: EdgeBend;
  /** How many times its default a detour reaches. */
  stretch?: EdgeStretch;
}

/** The highest step number: two digits fit the badge (specs/decisions, "Step badges ride the edge"). */
export const STEP_NUMBER_MAX = 99;

/**
 * The legend's words (specs/decisions, "A legend for widths and marks"): per line style; per line width, named by its level or, for
 * a width in pixels, by its number written as a string; and per mark, by its name.
 * What is not named has no entry (specs/decisions, "The legend says only what the agent named").
 */
export type Legend = Partial<Record<EdgeStyleName, string>> & {
  weights?: Record<string, string>;
  marks?: Record<string, string>;
};

/** How the legend names an edge's weight: its level, or its width in pixels as text (specs/decisions, "A legend for widths and marks"). */
export function weightKey(w: string | number): string {
  return typeof w === "number" ? String(w) : w;
}

/** A named look that objects mark (specs/decisions, "A style may be as rich as it likes"). */
export interface Style {
  id: string;
  fill?: string;
  border?: string;
  borderWidth?: number;
  color?: string;
}

/** The shapes a type may choose (specs/decisions, "A type may choose its shape"), with the kind that draws each. */
export const SHAPE_KINDS = {
  box: "service",
  round: "state",
  pill: "actor",
  cylinder: "store",
  diamond: "decision",
  "small-diamond": "choice",
  dot: "initial",
  ring: "final",
} as const;
export type Shape = keyof typeof SHAPE_KINDS;

/** A sort of node or edge an agent defines (specs/decisions, "A type holds attributes"). */
export interface TypeDef {
  id: string;
  /** A built-in kind or another type. */
  base: string;
  shape?: Shape;
  fill?: string;
  border?: string;
  borderWidth?: number;
  color?: string;
}

/** The sides an edge may pass an object by. */
export const VIA_SIDES = ["left", "right"] as const;
export type ViaSide = (typeof VIA_SIDES)[number];
export interface EdgeVia {
  object: string;
  side: ViaSide;
}
export const EDGE_BENDS = [0.25, 0.5, 0.75] as const;
export type EdgeBend = (typeof EDGE_BENDS)[number];
export const EDGE_STRETCHES = [1.25, 1.5, 2] as const;
export type EdgeStretch = (typeof EDGE_STRETCHES)[number];

/** A side of a node that an edge leaves or enters by. */
export const EDGE_SIDES = ["top", "bottom", "left", "right"] as const;
export type EdgeSide = (typeof EDGE_SIDES)[number];

/** What a style sets. */
export type Look = Omit<Style, "id">;

export interface Diagram {
  /** The format version (DESIGNS.md, "What grafical cannot fully read, it refuses"). */
  grafical: number;
  title: string;
  /** One sentence under the title (specs/decisions, "Curation stays with the agent"). */
  subtitle?: string;
  /** A footnote, such as "Not shown: …" (specs/decisions, "Curation stays with the agent"). */
  caption?: string;
  density: Density;
  /** How edges are drawn. Absent: square corners, or the stylesheet's (specs/decisions, "Edges may be drawn square or round"). */
  lines?: "round";
  /** Where the title sits (specs/decisions, "A region's label sits at a fraction of a side"). Absent: top left. */
  titleAt?: DiagramTitle;
  /** "fixed": a node with no size is a medium node, whatever its text. Absent: auto (specs/decisions, "Nodes sized to their text"). */
  sizing?: "fixed";
  /** A built-in theme's name, or a stylesheet's path relative to the file (specs/decisions, "Themes and stylesheets"). Absent: the default theme. */
  style?: string;
  /** Types an agent defined, in creation order. Absent: none. */
  types?: TypeDef[];
  /** Named looks, in creation order. Absent: none. */
  styles?: Style[];
  /** The legend's words (specs/decisions, "A legend for widths and marks", "The legend says only what the agent named"). */
  legend?: Legend;
  /** Ordered top to bottom. */
  layers: Layer[];
  /** Nodes in no layer, each placed by steps from another node, in creation order (specs/decisions, "Steps from another node"). */
  nodes?: DiagramNode[];
  /** The systems, in creation order. Absent or empty: no groups. Members name their group (specs/decisions, "Layers unseen, groups as systems"). */
  groups?: Group[];
  /** The swimlanes. Lanes that run as columns go left to right in this order (specs/decisions, "Lanes run one way"). */
  lanes?: Lane[];
  /** Columns, left to right (specs/decisions, "Columns beside layers"). */
  columns?: Column[];
  /** Gaps the agent magnified. */
  gaps?: Gap[];
  /** Empty space between two sides, in creation order (specs/decisions, "Walls as space"). */
  walls?: Wall[];
  /** One note at most per node, group or edge, in creation order (specs/decisions, "Notes as callouts or footnotes"). */
  notes?: Note[];
  /** Ordered: list order is creation order, and decides nothing visual. */
  edges: Edge[];
}

export const DEFAULT_NODE_KIND: NodeKind = "service";
export const DEFAULT_EDGE_KIND: EdgeKind = "call";
export const DEFAULT_SIZE: SizeStep = "m";
export const DEFAULT_DENSITY: Density = "normal";
