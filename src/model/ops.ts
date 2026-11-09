// Operations as data (DESIGNS.md, "Operations are the only way a diagram changes", specs/decisions, "Operations over whole-file rewrites", "Facts over coordinates"). Field names are the command-line
// flags in camelCase. No operation takes a coordinate.

import { z } from "zod";
import type { OpError } from "../errors.ts";
import { issuesToErrors, OP_KEYS, show } from "./issues.ts";
import {
  edgeId,
  idSuffix,
  lookFields,
  nodeId,
  shapeField,
  stepNumber,
  steps,
  text,
  weightValue,
} from "./schema.ts";
import { closest } from "./suggest.ts";
import {
  DENSITIES,
  type Density,
  EDGE_BENDS,
  EDGE_SIDES,
  EDGE_STRETCHES,
  EDGE_STYLES,
  type EdgeBend,
  type EdgeSide,
  type EdgeStretch,
  type EdgeStyleName,
  GAP_MAGNIFICATIONS,
  type GapMagnified,
  type GroupTitle,
  LABEL_ALIGNS,
  LABEL_PLACES,
  LAYER_LOOKS,
  type LabelAlign,
  type LayerLook,
  MARK_SHAPES,
  MARK_SIZES,
  MARK_SLOTS,
  type MarkShape,
  type MarkSize,
  type MarkSlot,
  type Shape,
  SIZE_STEPS,
  SIZINGS,
  type SizeStep,
  type Sizing,
  VIA_SIDES,
  type ViaSide,
} from "./types.ts";

/** Where a node goes in its layer. At most one field is set. */
export interface Position {
  first?: boolean;
  last?: boolean;
  before?: string;
  after?: string;
}

export interface DiagramNewOp {
  op: "diagram.new";
  title: string;
  density?: Density;
  sizing?: Sizing;
  style?: string;
  subtitle?: string;
  caption?: string;
}
/** The theme or stylesheet the diagram takes its look from (specs/decisions, "Themes and stylesheets"). Absent: the default theme. */
export interface DiagramStyleOp {
  op: "diagram.style";
  style?: string;
}
/** How nodes with no size are sized (specs/decisions, "Nodes sized to their text"). */
export interface DiagramSizingOp {
  op: "diagram.sizing";
  mode: Sizing;
}
export interface DiagramSubtitleOp {
  op: "diagram.subtitle";
  /** Absent: clear the subtitle. */
  text?: string;
}
export interface DiagramNoteOp {
  op: "diagram.caption";
  /** Absent: clear the note. */
  text?: string;
}
export interface GroupAddOp {
  op: "group.add";
  id: string;
  label: string;
  sublabel?: string;
  nodes?: string[];
  /** The group the new group sits inside (specs/decisions, "Every layered diagram type"). */
  in?: string;
}
export interface GroupJoinOp {
  op: "group.join";
  group: string;
  /** Nodes, and groups that move inside this one with everything in them (specs/decisions, "Every layered diagram type"). */
  nodes: string[];
}
export interface GroupLeaveOp {
  op: "group.leave";
  /** Nodes or groups. */
  nodes: string[];
  /** true: one level out, into the group around the one they leave. Absent: out of every group. */
  up?: boolean;
}
export interface GroupRenameOp {
  op: "group.label";
  id: string;
  label: string;
}
export interface GroupRemoveOp {
  op: "group.remove";
  id: string;
  /** true: its nodes and inner groups leave every group. Absent: they move into the group around it. */
  out?: boolean;
}
export interface LayerAddOp {
  op: "layer.add";
  id: string;
  label?: string;
  before?: string;
  after?: string;
}
/** Steps from another node, for a node in no layer (specs/decisions, "Steps from another node"). */
export interface Steps {
  from?: string;
  down?: number;
  up?: number;
  left?: number;
  right?: number;
}
/** A node goes in a layer (`layer`), or in no layer, by steps from another node (`from`). */
export interface NodeAddOp extends Position, Steps {
  op: "node.add";
  type?: string;
  id: string;
  layer?: string;
  label: string;
  sublabel?: string;
  size?: SizeStep;
  align?: string;
  emphasis?: boolean;
}
export interface NodeRenameOp {
  op: "node.label";
  id: string;
  label: string;
}
export interface NodeResizeOp {
  op: "node.size";
  id: string;
  /** Absent: the engine sizes the node again (specs/decisions, "Nodes sized to their text"). */
  size?: SizeStep;
}
export interface NodeMoveOp extends Position, Steps {
  op: "node.move";
  id: string;
  layer?: string;
}
export interface NodeRemoveOp {
  op: "node.remove";
  id: string;
}
export interface EdgeAddOp {
  op: "edge.add";
  type?: string;
  from: string;
  to: string;
  id?: string;
  label?: string;
  /** true: an arrowhead at both ends (specs/decisions, "Edges meet any side"). */
  both?: boolean;
  /** true: the edge may pass layers with no node between its ends (specs/decisions, "A layer with no node as one bar"). */
  pass?: boolean;
}
export interface EdgeRemoveOp {
  op: "edge.remove";
  id: string;
}

export interface DiagramTitleOp {
  op: "diagram.title";
  text: string;
}
export interface DiagramDensityOp {
  op: "diagram.density";
  density: Density;
}
/**
 * The legend's words for one edge style, edge width or mark. Absent text: no entry
 * (specs/decisions, "A legend for widths and marks", "The legend says only what the agent named").
 */
export interface DiagramLegendOp {
  op: "diagram.legend";
  /** How the edges look. Named edge until 2026-10-13 (specs/decisions, "The help as the reference"). */
  style?: EdgeStyleName;
  /** A weight level other than thin, or a width in pixels (specs/decisions, "Edge weights"). */
  weight?: string | number;
  /** A mark's emoji, text or file name (specs/decisions, "Marks of any kind"). */
  mark?: string;
  text?: string;
}
export interface LayerRenameOp {
  op: "layer.label";
  id: string;
  label: string;
}
export interface LayerMoveOp {
  op: "layer.move";
  id: string;
  first?: boolean;
  last?: boolean;
  before?: string;
  after?: string;
}
export interface LayerRemoveOp {
  op: "layer.remove";
  id: string;
}
/** How a layer is drawn, and that it is drawn though no edge ends at it (specs/decisions, "A layer with no node as one bar", "A layer with a look is drawn"). */
/** Where the title sits. Absent `at`: top left. */
export interface DiagramLabelAtOp {
  op: "diagram.label-at";
  at?: number;
  side?: "top" | "bottom";
}
/** Where a layer's or a lane's label sits along its head. Absent `at`: where the engine seats it. */
export interface HeadLabelAtOp {
  op: "layer.label-at" | "lane.label-at";
  id: string;
  at?: number;
}
export interface DiagramLinesOp {
  op: "diagram.lines";
  lines: "square" | "round";
}
export interface TypeAddOp {
  op: "type.add";
  id: string;
  base: string;
  shape?: Shape;
  fill?: string;
  border?: string;
  borderWidth?: number;
  color?: string;
}
export interface TypeRemoveOp {
  op: "type.remove";
  id: string;
}
export interface SetTypeOp {
  op: "node.type" | "edge.type";
  id: string;
  type?: string;
}
export interface StyleAddOp {
  op: "style.add";
  id: string;
  fill?: string;
  border?: string;
  borderWidth?: number;
  color?: string;
}
export interface StyleRemoveOp {
  op: "style.remove";
  id: string;
}
export interface MarkStyleOp {
  op: "node.style" | "edge.style" | "group.style" | "lane.style";
  id: string;
  styles?: string[];
}
/** Follow another object's look (specs/decisions, "`like` follows an object's look and nothing else"). Absent `like`: let go. */
export interface FollowOp {
  op: "node.like" | "edge.like" | "group.like" | "lane.like";
  id: string;
  like?: string;
}
export interface LayerLookOp {
  op: "layer.look";
  id: string;
  /** Absent: the layer is drawn only once an edge ends at it, and its look follows the layer, a node with no node in it and a band with nodes. */
  look?: LayerLook;
}
/** Moves a layer's nodes from `from` on (or its second half) into a new layer below it (specs/decisions, "Curation stays with the agent"). */
export interface LayerSplitOp {
  op: "layer.split";
  id: string;
  into: string;
  label: string;
  from?: string;
}
export interface NodeDescribeOp {
  op: "node.sublabel";
  id: string;
  /** Absent: clear the sublabel. */
  text?: string;
}
export interface NodeEmphasizeOp {
  op: "node.emphasis";
  id: string;
  /** true: turn the emphasis off. */
  off?: boolean;
}
export interface NodeMarkOp {
  op: "node.mark";
  id: string;
  slot: MarkSlot;
  /** An emoji or a short text, or the path of an SVG or PNG file. Absent: clear the slot. */
  mark?: string;
  /** The file's SHA-256, filled in by the command line when mark is a file (specs/decisions, "Marks of any kind"). */
  sha256?: string;
  /** The background of a text mark: a name in MARK_COLORS, or `#rrggbb`. */
  bg?: string;
  /** The color of a text mark's text. Absent: light or dark, whichever reads on the background. */
  fg?: string;
  /** The color of a text mark's border. Absent: none. */
  border?: string;
  /** The shape of a text mark's badge. Absent: rounded. */
  shape?: MarkShape;
  /** The size of the mark, a text's or a picture's. Absent: m. */
  size?: MarkSize;
}
export interface NodeAlignOp {
  op: "node.align";
  id: string;
  /** Absent: clear the alignment. */
  to?: string;
}
/** Two nodes trade places: layer and slot. */
export interface NodeSwapOp {
  op: "node.swap";
  a: string;
  b: string;
}
/** Nodes become one new node, at the first one's place, that keeps all their edges. */
export interface NodeMergeOp {
  op: "node.merge";
  nodes: string[];
  id: string;
  label: string;
  sublabel?: string;
  /** A built-in type or one of the diagram's own. */
  type?: string;
}
export interface EdgeSideOp {
  op: "edge.side";
  id: string;
  /** Absent here and in `in`: both sides are the router's again. */
  out?: EdgeSide;
  in?: EdgeSide;
}
export interface EdgeSeatOp {
  op: "edge.label-at";
  id: string;
  seat: "on" | "beside";
}

/** How a text's edges edge up (specs/decisions, "An agent sets a label's breaks and its alignment"). */
/** What an edge's label looks like (specs/decisions, "A label may mark a style"). Absent `styles`: clear them. */
export interface LabelStyleOp {
  op: "label.style";
  id: string;
  styles?: string[];
}
export interface LabelAlignOp {
  op: "label.align";
  id: string;
  align: LabelAlign;
}
export interface EdgeRelabelOp {
  op: "edge.label";
  id: string;
  /** Absent: clear the label. */
  label?: string;
}
export interface EdgeReverseOp {
  op: "edge.reverse";
  id: string;
}
/** Gives edges a weight, a level or a width in pixels (specs/decisions, "Edge weights"). */
export interface EdgeWeightOp {
  op: "edge.weight";
  edges: string[];
  /** Absent: thin again. */
  weight?: string | number;
}
/** Lets an edge pass the layers with no node between its ends, or no longer (specs/decisions, "A layer with no node as one bar"). */
export interface EdgePassOp {
  op: "edge.pass";
  id: string;
  /** true: the edge may no longer pass them. */
  off?: boolean;
}
/** Draws an arrowhead at both ends of an edge, or at one end again (specs/decisions, "Edges meet any side"). */
export interface EdgeBothOp {
  op: "edge.both";
  id: string;
  /** true: one arrowhead again. */
  off?: boolean;
}
/** The facts that steer an edge (specs/decisions, "An edge is steered by facts and never by coordinates"). Absent value: the engine's again. */
export interface EdgeViaOp {
  op: "edge.via";
  id: string;
  object?: string;
  side?: ViaSide;
}
export interface EdgeStraightOp {
  op: "edge.straight";
  id: string;
  /** true: the engine's again. */
  off?: boolean;
}
export interface EdgeWithOp {
  op: "edge.with";
  id: string;
  with?: string;
}
export interface EdgeBendOp {
  op: "edge.bend";
  id: string;
  at?: EdgeBend;
}
export interface EdgeStretchOp {
  op: "edge.stretch";
  id: string;
  magnified?: EdgeStretch;
}
/** Numbers an edge as a step of a process, or clears its number (specs/decisions, "Step badges ride the edge"). */
export interface EdgeStepOp {
  op: "edge.number";
  id: string;
  /** Absent: no number. */
  n?: number;
}
/** Moves one or both ends of an edge; its id, kind and label stay. */
export interface EdgeRetargetOp {
  op: "plug";
  id: string;
  from?: string;
  to?: string;
}
export interface GroupDescribeOp {
  op: "group.sublabel";
  id: string;
  /** Absent: clear the group's second, quieter label. */
  text?: string;
}
/** Where a group's label sits (specs/decisions, "The agent states where a group's label sits"). */
export interface GroupTitleOp {
  op: "group.label-at";
  id: string;
  /** Absent: the engine seats the label in the head. */
  /** Absent: the engine seats the label in the head. */
  at?: number;
  side?: GroupTitle["side"];
  place?: GroupTitle["place"];
}
/** Puts a group's borders, its inner groups' too, before or after another group's, in every layer they share. */
export interface GroupOrderOp {
  op: "group.order";
  id: string;
  before?: string;
  after?: string;
}
/**
 * A copy of a group, its inner groups, its nodes and the edges between them, each id with the suffix; each
 * copied node in its original's layer, before or after another group (specs/decisions, "A group copy holds its inside").
 */
export interface GroupCopyOp {
  op: "group.copy";
  id: string;
  /** The copy's id. */
  into: string;
  label: string;
  suffix: string;
  before?: string;
  after?: string;
  /** true: edges between the group and what is outside it are copied too. */
  outside?: boolean;
}
/** Members are layers (lanes then run as layers), nodes (as columns) or groups (specs/decisions, "Lanes run one way"). */
export interface LaneAddOp {
  op: "lane.add";
  id: string;
  label: string;
  members?: string[];
}
export interface LaneJoinOp {
  op: "lane.join";
  lane: string;
  members: string[];
}
export interface LaneLeaveOp {
  op: "lane.leave";
  members: string[];
}
export interface LaneRenameOp {
  op: "lane.label";
  id: string;
  label: string;
}
export interface LaneRemoveOp {
  op: "lane.remove";
  id: string;
}
/** Members are nodes, or groups that bring their nodes (specs/decisions, "Columns beside layers"). */
export interface ColumnAddOp {
  op: "column.add";
  id: string;
  nodes?: string[];
  before?: string;
  after?: string;
}
export interface ColumnJoinOp {
  op: "column.join";
  column: string;
  members: string[];
}
export interface ColumnLeaveOp {
  op: "column.leave";
  members: string[];
}
export interface ColumnRemoveOp {
  op: "column.remove";
  id: string;
}
/** Sides are nodes and groups; allow names edges, nodes and groups (specs/decisions, "Walls as space"). */
export interface WallAddOp {
  op: "wall.add";
  id: string;
  between: string[];
  and: string[];
  allow?: string[];
  label?: string;
}
export interface WallAllowOp {
  op: "wall.allow";
  id: string;
  allow: string[];
  off?: boolean;
}
export interface WallRemoveOp {
  op: "wall.remove";
  id: string;
}
/** A wall's label: the words on its divider. Absent: no label, and the wall is space alone (specs/decisions, "Walls as space"). */
export interface WallRelabelOp {
  op: "wall.label";
  id: string;
  label?: string;
}
/** A note on a node, group or edge; adding one where there is one replaces it (specs/decisions, "Notes as callouts or footnotes"). */
export interface NoteAddOp {
  op: "note.add";
  on: string;
  text: string;
  /** true: a footnote rather than a card. */
  footnote?: boolean;
}
/** A wider gap between two neighbouring regions. Absent `magnified`: back to the default. */
export interface GapBetweenOp {
  op: "gap.between";
  a: string;
  b: string;
  magnified?: GapMagnified;
}
/** How a card's edges edge up (specs/decisions, "An agent sets a label's breaks and its alignment"). */
export interface NoteAlignOp {
  op: "note.align";
  on: string;
  align: LabelAlign;
}
export interface NoteRemoveOp {
  op: "note.remove";
  on: string;
}

export type Op =
  | DiagramNewOp
  | DiagramSizingOp
  | DiagramStyleOp
  | DiagramSubtitleOp
  | DiagramNoteOp
  | DiagramTitleOp
  | DiagramDensityOp
  | DiagramLegendOp
  | GroupAddOp
  | GroupJoinOp
  | GroupLeaveOp
  | GroupRenameOp
  | GroupRemoveOp
  | GroupDescribeOp
  | GroupTitleOp
  | GroupOrderOp
  | GroupCopyOp
  | LaneAddOp
  | LaneJoinOp
  | LaneLeaveOp
  | LaneRenameOp
  | LaneRemoveOp
  | ColumnAddOp
  | ColumnJoinOp
  | ColumnLeaveOp
  | ColumnRemoveOp
  | WallAddOp
  | WallAllowOp
  | WallRemoveOp
  | WallRelabelOp
  | NoteAddOp
  | NoteAlignOp
  | GapBetweenOp
  | NoteRemoveOp
  | LayerAddOp
  | LayerRenameOp
  | LayerMoveOp
  | LayerRemoveOp
  | LayerLookOp
  | DiagramLinesOp
  | DiagramLabelAtOp
  | HeadLabelAtOp
  | TypeAddOp
  | TypeRemoveOp
  | SetTypeOp
  | StyleAddOp
  | StyleRemoveOp
  | MarkStyleOp
  | FollowOp
  | LayerSplitOp
  | NodeAddOp
  | NodeRenameOp
  | NodeResizeOp
  | NodeMoveOp
  | NodeRemoveOp
  | NodeDescribeOp
  | NodeEmphasizeOp
  | NodeMarkOp
  | NodeAlignOp
  | NodeSwapOp
  | NodeMergeOp
  | EdgeAddOp
  | EdgeRemoveOp
  | EdgeRelabelOp
  | LabelAlignOp
  | LabelStyleOp
  | EdgeSeatOp
  | EdgeSideOp
  | EdgeReverseOp
  | EdgeBothOp
  | EdgeViaOp
  | EdgeStraightOp
  | EdgeWithOp
  | EdgeBendOp
  | EdgeStretchOp
  | EdgePassOp
  | EdgeWeightOp
  | EdgeStepOp
  | EdgeRetargetOp;

export type OpName = Op["op"];

const position = {
  first: z.boolean().optional(),
  last: z.boolean().optional(),
  before: nodeId.optional(),
  after: nodeId.optional(),
};

export const diagramNewSchema = z.strictObject({
  op: z.literal("diagram.new"),
  title: text,
  density: z.enum(DENSITIES).optional(),
  sizing: z.enum(SIZINGS).optional(),
  style: text.optional(),
  subtitle: text.optional(),
  caption: text.optional(),
});
export const diagramStyleSchema = z.strictObject({
  op: z.literal("diagram.style"),
  style: text.optional(),
});
export const diagramSizingSchema = z.strictObject({
  op: z.literal("diagram.sizing"),
  mode: z.enum(SIZINGS),
});
export const diagramSubtitleSchema = z.strictObject({
  op: z.literal("diagram.subtitle"),
  text: text.optional(),
});
export const diagramNoteSchema = z.strictObject({
  op: z.literal("diagram.caption"),
  text: text.optional(),
});
const nodeList = z.array(nodeId).min(1);
export const groupAddSchema = z.strictObject({
  op: z.literal("group.add"),
  id: nodeId,
  label: text,
  sublabel: text.optional(),
  nodes: z.array(nodeId).optional(),
  in: nodeId.optional(),
});
export const groupJoinSchema = z.strictObject({
  op: z.literal("group.join"),
  group: nodeId,
  nodes: nodeList,
});
export const groupLeaveSchema = z.strictObject({
  op: z.literal("group.leave"),
  nodes: nodeList,
  up: z.boolean().optional(),
});
export const groupRenameSchema = z.strictObject({
  op: z.literal("group.label"),
  id: nodeId,
  label: text,
});
export const groupRemoveSchema = z.strictObject({
  op: z.literal("group.remove"),
  id: nodeId,
  out: z.boolean().optional(),
});
export const layerAddSchema = z.strictObject({
  op: z.literal("layer.add"),
  id: nodeId,
  label: text.optional(),
  before: nodeId.optional(),
  after: nodeId.optional(),
});
const stepFields = {
  from: nodeId.optional(),
  down: steps.optional(),
  up: steps.optional(),
  left: steps.optional(),
  right: steps.optional(),
};
export const nodeAddSchema = z.strictObject({
  op: z.literal("node.add"),
  id: nodeId,
  layer: nodeId.optional(),
  label: text,
  type: nodeId.optional(),
  sublabel: text.optional(),
  size: z.enum(SIZE_STEPS).optional(),
  align: nodeId.optional(),
  emphasis: z.boolean().optional(),
  ...position,
  ...stepFields,
});
export const nodeRenameSchema = z.strictObject({
  op: z.literal("node.label"),
  id: nodeId,
  label: text,
});
export const nodeResizeSchema = z.strictObject({
  op: z.literal("node.size"),
  id: nodeId,
  size: z.enum(SIZE_STEPS).optional(),
});
export const nodeMoveSchema = z.strictObject({
  op: z.literal("node.move"),
  id: nodeId,
  layer: nodeId.optional(),
  ...position,
  ...stepFields,
});
export const nodeRemoveSchema = z.strictObject({ op: z.literal("node.remove"), id: nodeId });
export const edgeAddSchema = z.strictObject({
  op: z.literal("edge.add"),
  from: nodeId,
  to: nodeId,
  id: edgeId.optional(),
  label: text.optional(),
  type: nodeId.optional(),
  both: z.boolean().optional(),
  pass: z.boolean().optional(),
});
export const edgeRemoveSchema = z.strictObject({ op: z.literal("edge.remove"), id: edgeId });
export const layerLabelAtSchema = z.strictObject({
  op: z.literal("layer.label-at"),
  id: nodeId,
  at: z.number().min(0).max(1).optional(),
});
export const laneLabelAtSchema = z.strictObject({
  op: z.literal("lane.label-at"),
  id: nodeId,
  at: z.number().min(0).max(1).optional(),
});
export const diagramLabelAtSchema = z.strictObject({
  op: z.literal("diagram.label-at"),
  at: z.number().min(0).max(1).optional(),
  side: z.enum(["top", "bottom"]).optional(),
});
export const diagramTitleSchema = z.strictObject({ op: z.literal("diagram.title"), text });
export const diagramLinesSchema = z.strictObject({
  op: z.literal("diagram.lines"),
  lines: z.enum(["square", "round"]),
});
export const diagramDensitySchema = z.strictObject({
  op: z.literal("diagram.density"),
  density: z.enum(DENSITIES),
});
export const diagramLegendSchema = z.strictObject({
  op: z.literal("diagram.legend"),
  style: z.enum(EDGE_STYLES).optional(),
  weight: weightValue.optional(),
  mark: text.optional(),
  text: text.optional(),
});
export const layerRenameSchema = z.strictObject({
  op: z.literal("layer.label"),
  id: nodeId,
  label: text,
});
export const layerMoveSchema = z.strictObject({
  op: z.literal("layer.move"),
  id: nodeId,
  ...position,
});
export const layerRemoveSchema = z.strictObject({ op: z.literal("layer.remove"), id: nodeId });
export const typeAddSchema = z.strictObject({
  op: z.literal("type.add"),
  id: nodeId,
  base: nodeId,
  shape: shapeField,
  ...lookFields,
});
export const typeRemoveSchema = z.strictObject({ op: z.literal("type.remove"), id: nodeId });
export const nodeTypeSchema = z.strictObject({
  op: z.literal("node.type"),
  id: nodeId,
  type: nodeId.optional(),
});
export const edgeTypeSchema = z.strictObject({
  op: z.literal("edge.type"),
  id: edgeId,
  type: nodeId.optional(),
});
export const styleAddSchema = z.strictObject({
  op: z.literal("style.add"),
  id: nodeId,
  ...lookFields,
});
export const styleRemoveSchema = z.strictObject({ op: z.literal("style.remove"), id: nodeId });
const styleMark = <N extends string>(name: N) =>
  z.strictObject({
    op: z.literal(name),
    id: z.string().min(1),
    styles: z.array(nodeId).min(1).optional(),
  });
export const nodeStyleSchema = styleMark("node.style");
export const edgeStyleSchema = styleMark("edge.style");
export const groupStyleSchema = styleMark("group.style");
export const laneStyleSchema = styleMark("lane.style");
const follow = <N extends string>(name: N) =>
  z.strictObject({
    op: z.literal(name),
    id: z.string().min(1),
    like: z.string().min(1).optional(),
  });
export const nodeLikeSchema = follow("node.like");
export const edgeLikeSchema = follow("edge.like");
export const groupLikeSchema = follow("group.like");
export const laneLikeSchema = follow("lane.like");
export const layerLookSchema = z.strictObject({
  op: z.literal("layer.look"),
  id: nodeId,
  look: z.enum(LAYER_LOOKS).optional(),
});
export const layerSplitSchema = z.strictObject({
  op: z.literal("layer.split"),
  id: nodeId,
  into: nodeId,
  label: text,
  from: nodeId.optional(),
});
export const nodeDescribeSchema = z.strictObject({
  op: z.literal("node.sublabel"),
  id: nodeId,
  text: text.optional(),
});
export const nodeEmphasizeSchema = z.strictObject({
  op: z.literal("node.emphasis"),
  id: nodeId,
  off: z.boolean().optional(),
});
export const nodeMarkSchema = z.strictObject({
  op: z.literal("node.mark"),
  id: nodeId,
  slot: z.enum(MARK_SLOTS),
  mark: text.optional(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  bg: text.optional(),
  fg: text.optional(),
  border: text.optional(),
  shape: z.enum(MARK_SHAPES).optional(),
  size: z.enum(MARK_SIZES).optional(),
});
export const nodeAlignSchema = z.strictObject({
  op: z.literal("node.align"),
  id: nodeId,
  to: nodeId.optional(),
});
export const nodeSwapSchema = z.strictObject({ op: z.literal("node.swap"), a: nodeId, b: nodeId });
export const nodeMergeSchema = z.strictObject({
  op: z.literal("node.merge"),
  nodes: z.array(nodeId).min(2),
  id: nodeId,
  label: text,
  sublabel: text.optional(),
  type: nodeId.optional(),
});
export const labelStyleSchema = z.strictObject({
  op: z.literal("label.style"),
  id: edgeId,
  styles: z.array(nodeId).min(1).optional(),
});
export const labelAlignSchema = z.strictObject({
  op: z.literal("label.align"),
  id: z.string().min(1),
  align: z.enum(LABEL_ALIGNS),
});
export const edgeRelabelSchema = z.strictObject({
  op: z.literal("edge.label"),
  id: edgeId,
  label: text.optional(),
});
export const edgeReverseSchema = z.strictObject({ op: z.literal("edge.reverse"), id: edgeId });
export const edgeSideSchema = z.strictObject({
  op: z.literal("edge.side"),
  id: z.string(),
  out: z.enum(EDGE_SIDES).optional(),
  in: z.enum(EDGE_SIDES).optional(),
});

export const edgeSeatSchema = z.strictObject({
  op: z.literal("edge.label-at"),
  id: z.string(),
  seat: z.enum(["on", "beside"]),
});

export const edgeWeightSchema = z.strictObject({
  op: z.literal("edge.weight"),
  edges: z.array(edgeId).min(1),
  weight: weightValue.optional(),
});
export const edgeBothSchema = z.strictObject({
  op: z.literal("edge.both"),
  id: edgeId,
  off: z.boolean().optional(),
});
export const edgeViaSchema = z.strictObject({
  op: z.literal("edge.via"),
  id: edgeId,
  object: nodeId.optional(),
  side: z.enum(VIA_SIDES).optional(),
});
export const edgeStraightSchema = z.strictObject({
  op: z.literal("edge.straight"),
  id: edgeId,
  off: z.boolean().optional(),
});
export const edgeWithSchema = z.strictObject({
  op: z.literal("edge.with"),
  id: edgeId,
  with: edgeId.optional(),
});
export const edgeBendSchema = z.strictObject({
  op: z.literal("edge.bend"),
  id: edgeId,
  at: z.literal(EDGE_BENDS).optional(),
});
export const edgeStretchSchema = z.strictObject({
  op: z.literal("edge.stretch"),
  id: edgeId,
  magnified: z.literal(EDGE_STRETCHES).optional(),
});
export const edgePassSchema = z.strictObject({
  op: z.literal("edge.pass"),
  id: edgeId,
  off: z.boolean().optional(),
});
export const edgeStepSchema = z.strictObject({
  op: z.literal("edge.number"),
  id: edgeId,
  n: stepNumber.optional(),
});
export const edgeRetargetSchema = z.strictObject({
  op: z.literal("plug"),
  id: edgeId,
  from: nodeId.optional(),
  to: nodeId.optional(),
});
export const groupDescribeSchema = z.strictObject({
  op: z.literal("group.sublabel"),
  id: nodeId,
  text: text.optional(),
});
export const groupTitleSchema = z.strictObject({
  op: z.literal("group.label-at"),
  id: nodeId,
  at: z.number().min(0).max(1).optional(),
  side: z.enum(EDGE_SIDES).optional(),
  place: z.enum(LABEL_PLACES).optional(),
});
export const groupOrderSchema = z.strictObject({
  op: z.literal("group.order"),
  id: nodeId,
  before: nodeId.optional(),
  after: nodeId.optional(),
});
export const groupCopySchema = z.strictObject({
  op: z.literal("group.copy"),
  id: nodeId,
  into: nodeId,
  label: text,
  suffix: idSuffix,
  before: nodeId.optional(),
  after: nodeId.optional(),
  outside: z.boolean().optional(),
});
export const laneAddSchema = z.strictObject({
  op: z.literal("lane.add"),
  id: nodeId,
  label: text,
  members: z.array(nodeId).optional(),
});
export const laneJoinSchema = z.strictObject({
  op: z.literal("lane.join"),
  lane: nodeId,
  members: nodeList,
});
export const laneLeaveSchema = z.strictObject({ op: z.literal("lane.leave"), members: nodeList });
export const laneRenameSchema = z.strictObject({
  op: z.literal("lane.label"),
  id: nodeId,
  label: text,
});
export const laneRemoveSchema = z.strictObject({ op: z.literal("lane.remove"), id: nodeId });
export const columnAddSchema = z.strictObject({
  op: z.literal("column.add"),
  id: nodeId,
  nodes: nodeList.optional(),
  before: nodeId.optional(),
  after: nodeId.optional(),
});
export const columnJoinSchema = z.strictObject({
  op: z.literal("column.join"),
  column: nodeId,
  members: nodeList,
});
export const columnLeaveSchema = z.strictObject({
  op: z.literal("column.leave"),
  members: nodeList,
});
export const columnRemoveSchema = z.strictObject({ op: z.literal("column.remove"), id: nodeId });
/** What a wall lets through: an edge's id, or a node's or a group's. */
const passList = z.array(z.string().min(1)).min(1);
export const wallAddSchema = z.strictObject({
  op: z.literal("wall.add"),
  id: nodeId,
  between: nodeList,
  and: nodeList,
  allow: passList.optional(),
  label: text.optional(),
});
export const wallAllowSchema = z.strictObject({
  op: z.literal("wall.allow"),
  id: nodeId,
  allow: passList,
  off: z.boolean().optional(),
});
export const wallRemoveSchema = z.strictObject({ op: z.literal("wall.remove"), id: nodeId });
export const wallRelabelSchema = z.strictObject({
  op: z.literal("wall.label"),
  id: nodeId,
  label: text.optional(),
});
export const noteAddSchema = z.strictObject({
  op: z.literal("note.add"),
  on: edgeId,
  text,
  footnote: z.boolean().optional(),
});
export const noteRemoveSchema = z.strictObject({ op: z.literal("note.remove"), on: edgeId });
export const gapBetweenSchema = z.strictObject({
  op: z.literal("gap.between"),
  a: nodeId,
  b: nodeId,
  magnified: z.literal(GAP_MAGNIFICATIONS).optional(),
});
export const noteAlignSchema = z.strictObject({
  op: z.literal("note.align"),
  on: edgeId,
  align: z.enum(LABEL_ALIGNS),
});

/** Parses one operation. */
export const opSchema = z.discriminatedUnion("op", [
  diagramNewSchema,
  diagramSizingSchema,
  diagramStyleSchema,
  diagramSubtitleSchema,
  diagramNoteSchema,
  groupAddSchema,
  groupJoinSchema,
  groupLeaveSchema,
  groupRenameSchema,
  groupRemoveSchema,
  layerAddSchema,
  nodeAddSchema,
  nodeRenameSchema,
  nodeResizeSchema,
  nodeMoveSchema,
  nodeRemoveSchema,
  edgeAddSchema,
  edgeRemoveSchema,
  diagramTitleSchema,
  diagramLabelAtSchema,
  layerLabelAtSchema,
  laneLabelAtSchema,
  diagramDensitySchema,
  diagramLinesSchema,
  diagramLegendSchema,
  groupDescribeSchema,
  groupOrderSchema,
  groupCopySchema,
  laneAddSchema,
  laneJoinSchema,
  laneLeaveSchema,
  laneRenameSchema,
  laneRemoveSchema,
  columnAddSchema,
  columnJoinSchema,
  columnLeaveSchema,
  columnRemoveSchema,
  wallAddSchema,
  wallAllowSchema,
  wallRemoveSchema,
  wallRelabelSchema,
  noteAddSchema,
  noteRemoveSchema,
  noteAlignSchema,
  gapBetweenSchema,
  layerRenameSchema,
  layerMoveSchema,
  layerRemoveSchema,
  layerLookSchema,
  typeAddSchema,
  typeRemoveSchema,
  nodeTypeSchema,
  edgeTypeSchema,
  styleAddSchema,
  styleRemoveSchema,
  nodeStyleSchema,
  edgeStyleSchema,
  groupStyleSchema,
  laneStyleSchema,
  nodeLikeSchema,
  edgeLikeSchema,
  groupLikeSchema,
  laneLikeSchema,
  layerSplitSchema,
  nodeDescribeSchema,
  nodeEmphasizeSchema,
  nodeMarkSchema,
  nodeAlignSchema,
  nodeSwapSchema,
  nodeMergeSchema,
  edgeRelabelSchema,
  labelAlignSchema,
  labelStyleSchema,
  edgeReverseSchema,
  edgeBothSchema,
  edgeViaSchema,
  edgeStraightSchema,
  edgeWithSchema,
  edgeBendSchema,
  edgeStretchSchema,
  edgePassSchema,
  edgeWeightSchema,
  edgeSeatSchema,
  edgeSideSchema,
  edgeStepSchema,
  edgeRetargetSchema,
]);

/** Each operation's schema, by name. */
export const SCHEMAS: Record<OpName, z.ZodType> = {
  "diagram.new": diagramNewSchema,
  "diagram.sizing": diagramSizingSchema,
  "diagram.style": diagramStyleSchema,
  "diagram.subtitle": diagramSubtitleSchema,
  "diagram.caption": diagramNoteSchema,
  "group.add": groupAddSchema,
  "group.join": groupJoinSchema,
  "group.leave": groupLeaveSchema,
  "group.label": groupRenameSchema,
  "group.remove": groupRemoveSchema,
  "layer.add": layerAddSchema,
  "node.add": nodeAddSchema,
  "node.label": nodeRenameSchema,
  "node.size": nodeResizeSchema,
  "node.move": nodeMoveSchema,
  "node.remove": nodeRemoveSchema,
  "edge.add": edgeAddSchema,
  "edge.remove": edgeRemoveSchema,
  "diagram.title": diagramTitleSchema,
  "diagram.label-at": diagramLabelAtSchema,
  "layer.label-at": layerLabelAtSchema,
  "lane.label-at": laneLabelAtSchema,
  "diagram.density": diagramDensitySchema,
  "diagram.lines": diagramLinesSchema,
  "diagram.legend": diagramLegendSchema,
  "group.sublabel": groupDescribeSchema,
  "group.label-at": groupTitleSchema,
  "group.order": groupOrderSchema,
  "group.copy": groupCopySchema,
  "lane.add": laneAddSchema,
  "lane.join": laneJoinSchema,
  "lane.leave": laneLeaveSchema,
  "lane.label": laneRenameSchema,
  "lane.remove": laneRemoveSchema,
  "column.add": columnAddSchema,
  "column.join": columnJoinSchema,
  "column.leave": columnLeaveSchema,
  "column.remove": columnRemoveSchema,
  "wall.add": wallAddSchema,
  "wall.allow": wallAllowSchema,
  "wall.remove": wallRemoveSchema,
  "wall.label": wallRelabelSchema,
  "note.add": noteAddSchema,
  "note.remove": noteRemoveSchema,
  "note.align": noteAlignSchema,
  "gap.between": gapBetweenSchema,
  "layer.label": layerRenameSchema,
  "layer.move": layerMoveSchema,
  "layer.remove": layerRemoveSchema,
  "layer.look": layerLookSchema,
  "type.add": typeAddSchema,
  "type.remove": typeRemoveSchema,
  "node.type": nodeTypeSchema,
  "edge.type": edgeTypeSchema,
  "style.add": styleAddSchema,
  "style.remove": styleRemoveSchema,
  "node.style": nodeStyleSchema,
  "edge.style": edgeStyleSchema,
  "group.style": groupStyleSchema,
  "lane.style": laneStyleSchema,
  "node.like": nodeLikeSchema,
  "edge.like": edgeLikeSchema,
  "group.like": groupLikeSchema,
  "lane.like": laneLikeSchema,
  "layer.split": layerSplitSchema,
  "node.sublabel": nodeDescribeSchema,
  "node.emphasis": nodeEmphasizeSchema,
  "node.mark": nodeMarkSchema,
  "node.align": nodeAlignSchema,
  "node.swap": nodeSwapSchema,
  "node.merge": nodeMergeSchema,
  "edge.label": edgeRelabelSchema,
  "label.align": labelAlignSchema,
  "label.style": labelStyleSchema,
  "edge.reverse": edgeReverseSchema,
  "edge.both": edgeBothSchema,
  "edge.via": edgeViaSchema,
  "edge.straight": edgeStraightSchema,
  "edge.with": edgeWithSchema,
  "edge.bend": edgeBendSchema,
  "edge.stretch": edgeStretchSchema,
  "edge.pass": edgePassSchema,
  "edge.weight": edgeWeightSchema,
  "edge.label-at": edgeSeatSchema,
  "edge.side": edgeSideSchema,
  "edge.number": edgeStepSchema,
  plug: edgeRetargetSchema,
};

export const OP_NAMES = Object.keys(SCHEMAS) as OpName[];

for (const [name, schema] of Object.entries(SCHEMAS)) {
  OP_KEYS[name] = Object.keys((schema as z.ZodObject).shape);
}

function compact(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

/** Parses one operation, reporting errors with the operation's index. */
export function parseOp(raw: unknown, index: number): Op | OpError[] {
  const name = (raw as { op?: unknown } | null)?.op;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw) || typeof name !== "string") {
    return [
      {
        code: "bad-op",
        index,
        field: "op",
        found: show(raw),
        facts: { allowed: OP_NAMES },
      },
    ];
  }
  if (!(name in SCHEMAS)) {
    return [
      {
        code: "unknown-op",
        index,
        field: "op",
        found: name,
        facts: { likely: closest(name, OP_NAMES, 2) },
      },
    ];
  }
  const parsed = (SCHEMAS[name as OpName] as z.ZodType).safeParse(raw);
  if (!parsed.success) return issuesToErrors(parsed.error.issues, raw, index, true);
  const op = compact(parsed.data as Record<string, unknown>);
  // A shell's "a\\nb" stays two characters, and a label holds no backslash-n by intent.
  for (const k of ["label", "sublabel", "text"]) {
    const v = op[k];
    if (typeof v === "string") op[k] = v.replaceAll("\\n", "\n");
  }
  return op as unknown as Op;
}
