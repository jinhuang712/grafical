// Operations as data (DESIGN.md D1, D2, D3). Field names are the command-line
// flags in camelCase. No operation takes a coordinate.

import { z } from "zod";
import type { OpError } from "../errors.ts";
import { issuesToErrors, OP_KEYS, show } from "./issues.ts";
import { edgeId, nodeId, text } from "./schema.ts";
import { closest } from "./suggest.ts";
import {
  DENSITIES,
  type Density,
  EDGE_KINDS,
  type EdgeKind,
  LINE_STYLES,
  type LineStyleName,
  MARK_SLOTS,
  type MarkSlot,
  NODE_KINDS,
  type NodeKind,
  SIZE_STEPS,
  SIZINGS,
  type SizeStep,
  type Sizing,
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
  note?: string;
}
/** The theme or stylesheet the diagram takes its look from (D30). Absent: the default theme. */
export interface DiagramStyleOp {
  op: "diagram.style";
  style?: string;
}
/** How nodes with no size are sized (D27). */
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
  op: "diagram.note";
  /** Absent: clear the note. */
  text?: string;
}
export interface GroupAddOp {
  op: "group.add";
  id: string;
  label: string;
  sublabel?: string;
  nodes?: string[];
  /** The group the new group sits inside (D34). */
  in?: string;
}
export interface GroupJoinOp {
  op: "group.join";
  group: string;
  /** Nodes, and groups that move inside this one with everything in them (D34). */
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
  op: "group.rename";
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
  label: string;
  before?: string;
  after?: string;
}
export interface NodeAddOp extends Position {
  op: "node.add";
  id: string;
  layer: string;
  label: string;
  kind?: NodeKind;
  sublabel?: string;
  size?: SizeStep;
  align?: string;
  accent?: boolean;
}
export interface NodeRenameOp {
  op: "node.rename";
  id: string;
  label: string;
}
export interface NodeResizeOp {
  op: "node.resize";
  id: string;
  /** Absent: the engine sizes the node again (D27). */
  size?: SizeStep;
}
export interface NodeMoveOp extends Position {
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
  from: string;
  to: string;
  id?: string;
  label?: string;
  kind?: EdgeKind;
  /** true: an arrowhead at both ends (D33). */
  both?: boolean;
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
/** The legend's text for one line style. Absent text: the default wording. */
export interface DiagramLegendOp {
  op: "diagram.legend";
  /** How the lines look. Named line until 2026-10-13 (D36). */
  style: LineStyleName;
  text?: string;
}
/** Reorders every layer once, to untangle lines (D24). */
export interface DiagramTidyOp {
  op: "diagram.tidy";
}
export interface LayerRenameOp {
  op: "layer.rename";
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
/** Reorders one layer's nodes once, to untangle lines (D24). */
export interface LayerTidyOp {
  op: "layer.tidy";
  id: string;
}
/** Moves a layer's nodes from `from` on (or its second half) into a new layer below it (D29). */
export interface LayerSplitOp {
  op: "layer.split";
  id: string;
  into: string;
  label: string;
  from?: string;
}
export interface NodeDescribeOp {
  op: "node.describe";
  id: string;
  /** Absent: clear the sublabel. */
  text?: string;
}
export interface NodeKindOp {
  op: "node.kind";
  id: string;
  kind: NodeKind;
}
export interface NodeEmphasizeOp {
  op: "node.emphasize";
  id: string;
  /** true: turn the accent off. */
  off?: boolean;
}
export interface NodeIconOp {
  op: "node.icon";
  id: string;
  slot: MarkSlot;
  /** An emoji or a short text, or the path of an SVG or PNG file. Absent: clear the slot. */
  icon?: string;
  /** The file's SHA-256, filled in by the command line when icon is a file (D40). */
  sha256?: string;
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
  kind?: NodeKind;
}
export interface EdgeRelabelOp {
  op: "edge.relabel";
  id: string;
  /** Absent: clear the label. */
  label?: string;
}
export interface EdgeKindOp {
  op: "edge.kind";
  id: string;
  kind: EdgeKind;
}
export interface EdgeReverseOp {
  op: "edge.reverse";
  id: string;
}
/** Draws edges thick, as the main path, or thin again (D33). */
export interface EdgeEmphasizeOp {
  op: "edge.emphasize";
  edges: string[];
  /** true: thin again. */
  off?: boolean;
}
/** Draws an arrowhead at both ends of an edge, or at one end again (D33). */
export interface EdgeBothOp {
  op: "edge.both";
  id: string;
  /** true: one arrowhead again. */
  off?: boolean;
}
/** Moves one or both ends of an edge; its id, kind and label stay. */
export interface EdgeRetargetOp {
  op: "edge.retarget";
  id: string;
  from?: string;
  to?: string;
}
export interface GroupDescribeOp {
  op: "group.describe";
  id: string;
  /** Absent: clear the group's second, quieter label. */
  text?: string;
}
/** Puts a group's members before or after another group's, in every layer they share. */
export interface GroupOrderOp {
  op: "group.order";
  id: string;
  before?: string;
  after?: string;
}
/** Members are layers (lanes then run as rows), nodes (as columns) or groups (D32). */
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
  op: "lane.rename";
  id: string;
  label: string;
}
export interface LaneRemoveOp {
  op: "lane.remove";
  id: string;
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
  | DiagramTidyOp
  | GroupAddOp
  | GroupJoinOp
  | GroupLeaveOp
  | GroupRenameOp
  | GroupRemoveOp
  | GroupDescribeOp
  | GroupOrderOp
  | LaneAddOp
  | LaneJoinOp
  | LaneLeaveOp
  | LaneRenameOp
  | LaneRemoveOp
  | LayerAddOp
  | LayerRenameOp
  | LayerMoveOp
  | LayerRemoveOp
  | LayerTidyOp
  | LayerSplitOp
  | NodeAddOp
  | NodeRenameOp
  | NodeResizeOp
  | NodeMoveOp
  | NodeRemoveOp
  | NodeDescribeOp
  | NodeKindOp
  | NodeEmphasizeOp
  | NodeIconOp
  | NodeAlignOp
  | NodeSwapOp
  | NodeMergeOp
  | EdgeAddOp
  | EdgeRemoveOp
  | EdgeRelabelOp
  | EdgeKindOp
  | EdgeReverseOp
  | EdgeBothOp
  | EdgeEmphasizeOp
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
  note: text.optional(),
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
  op: z.literal("diagram.note"),
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
  op: z.literal("group.rename"),
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
  label: text,
  before: nodeId.optional(),
  after: nodeId.optional(),
});
export const nodeAddSchema = z.strictObject({
  op: z.literal("node.add"),
  id: nodeId,
  layer: nodeId,
  label: text,
  kind: z.enum(NODE_KINDS).optional(),
  sublabel: text.optional(),
  size: z.enum(SIZE_STEPS).optional(),
  align: nodeId.optional(),
  accent: z.boolean().optional(),
  ...position,
});
export const nodeRenameSchema = z.strictObject({
  op: z.literal("node.rename"),
  id: nodeId,
  label: text,
});
export const nodeResizeSchema = z.strictObject({
  op: z.literal("node.resize"),
  id: nodeId,
  size: z.enum(SIZE_STEPS).optional(),
});
export const nodeMoveSchema = z.strictObject({
  op: z.literal("node.move"),
  id: nodeId,
  layer: nodeId.optional(),
  ...position,
});
export const nodeRemoveSchema = z.strictObject({ op: z.literal("node.remove"), id: nodeId });
export const edgeAddSchema = z.strictObject({
  op: z.literal("edge.add"),
  from: nodeId,
  to: nodeId,
  id: edgeId.optional(),
  label: text.optional(),
  kind: z.enum(EDGE_KINDS).optional(),
  both: z.boolean().optional(),
});
export const edgeRemoveSchema = z.strictObject({ op: z.literal("edge.remove"), id: edgeId });
export const diagramTitleSchema = z.strictObject({ op: z.literal("diagram.title"), text });
export const diagramDensitySchema = z.strictObject({
  op: z.literal("diagram.density"),
  density: z.enum(DENSITIES),
});
export const diagramLegendSchema = z.strictObject({
  op: z.literal("diagram.legend"),
  style: z.enum(LINE_STYLES),
  text: text.optional(),
});
export const diagramTidySchema = z.strictObject({ op: z.literal("diagram.tidy") });
export const layerRenameSchema = z.strictObject({
  op: z.literal("layer.rename"),
  id: nodeId,
  label: text,
});
export const layerMoveSchema = z.strictObject({
  op: z.literal("layer.move"),
  id: nodeId,
  ...position,
});
export const layerRemoveSchema = z.strictObject({ op: z.literal("layer.remove"), id: nodeId });
export const layerTidySchema = z.strictObject({ op: z.literal("layer.tidy"), id: nodeId });
export const layerSplitSchema = z.strictObject({
  op: z.literal("layer.split"),
  id: nodeId,
  into: nodeId,
  label: text,
  from: nodeId.optional(),
});
export const nodeDescribeSchema = z.strictObject({
  op: z.literal("node.describe"),
  id: nodeId,
  text: text.optional(),
});
export const nodeKindSchema = z.strictObject({
  op: z.literal("node.kind"),
  id: nodeId,
  kind: z.enum(NODE_KINDS),
});
export const nodeEmphasizeSchema = z.strictObject({
  op: z.literal("node.emphasize"),
  id: nodeId,
  off: z.boolean().optional(),
});
export const nodeIconSchema = z.strictObject({
  op: z.literal("node.icon"),
  id: nodeId,
  slot: z.enum(MARK_SLOTS),
  icon: text.optional(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
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
  kind: z.enum(NODE_KINDS).optional(),
});
export const edgeRelabelSchema = z.strictObject({
  op: z.literal("edge.relabel"),
  id: edgeId,
  label: text.optional(),
});
export const edgeKindSchema = z.strictObject({
  op: z.literal("edge.kind"),
  id: edgeId,
  kind: z.enum(EDGE_KINDS),
});
export const edgeReverseSchema = z.strictObject({ op: z.literal("edge.reverse"), id: edgeId });
export const edgeEmphasizeSchema = z.strictObject({
  op: z.literal("edge.emphasize"),
  edges: z.array(edgeId).min(1),
  off: z.boolean().optional(),
});
export const edgeBothSchema = z.strictObject({
  op: z.literal("edge.both"),
  id: edgeId,
  off: z.boolean().optional(),
});
export const edgeRetargetSchema = z.strictObject({
  op: z.literal("edge.retarget"),
  id: edgeId,
  from: nodeId.optional(),
  to: nodeId.optional(),
});
export const groupDescribeSchema = z.strictObject({
  op: z.literal("group.describe"),
  id: nodeId,
  text: text.optional(),
});
export const groupOrderSchema = z.strictObject({
  op: z.literal("group.order"),
  id: nodeId,
  before: nodeId.optional(),
  after: nodeId.optional(),
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
  op: z.literal("lane.rename"),
  id: nodeId,
  label: text,
});
export const laneRemoveSchema = z.strictObject({ op: z.literal("lane.remove"), id: nodeId });

/** Parses one operation. A batch item is exactly this. */
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
  diagramDensitySchema,
  diagramLegendSchema,
  diagramTidySchema,
  groupDescribeSchema,
  groupOrderSchema,
  laneAddSchema,
  laneJoinSchema,
  laneLeaveSchema,
  laneRenameSchema,
  laneRemoveSchema,
  layerRenameSchema,
  layerMoveSchema,
  layerRemoveSchema,
  layerTidySchema,
  layerSplitSchema,
  nodeDescribeSchema,
  nodeKindSchema,
  nodeEmphasizeSchema,
  nodeIconSchema,
  nodeAlignSchema,
  nodeSwapSchema,
  nodeMergeSchema,
  edgeRelabelSchema,
  edgeKindSchema,
  edgeReverseSchema,
  edgeBothSchema,
  edgeEmphasizeSchema,
  edgeRetargetSchema,
]);

const SCHEMAS: Record<OpName, z.ZodType> = {
  "diagram.new": diagramNewSchema,
  "diagram.sizing": diagramSizingSchema,
  "diagram.style": diagramStyleSchema,
  "diagram.subtitle": diagramSubtitleSchema,
  "diagram.note": diagramNoteSchema,
  "group.add": groupAddSchema,
  "group.join": groupJoinSchema,
  "group.leave": groupLeaveSchema,
  "group.rename": groupRenameSchema,
  "group.remove": groupRemoveSchema,
  "layer.add": layerAddSchema,
  "node.add": nodeAddSchema,
  "node.rename": nodeRenameSchema,
  "node.resize": nodeResizeSchema,
  "node.move": nodeMoveSchema,
  "node.remove": nodeRemoveSchema,
  "edge.add": edgeAddSchema,
  "edge.remove": edgeRemoveSchema,
  "diagram.title": diagramTitleSchema,
  "diagram.density": diagramDensitySchema,
  "diagram.legend": diagramLegendSchema,
  "diagram.tidy": diagramTidySchema,
  "group.describe": groupDescribeSchema,
  "group.order": groupOrderSchema,
  "lane.add": laneAddSchema,
  "lane.join": laneJoinSchema,
  "lane.leave": laneLeaveSchema,
  "lane.rename": laneRenameSchema,
  "lane.remove": laneRemoveSchema,
  "layer.rename": layerRenameSchema,
  "layer.move": layerMoveSchema,
  "layer.remove": layerRemoveSchema,
  "layer.tidy": layerTidySchema,
  "layer.split": layerSplitSchema,
  "node.describe": nodeDescribeSchema,
  "node.kind": nodeKindSchema,
  "node.emphasize": nodeEmphasizeSchema,
  "node.icon": nodeIconSchema,
  "node.align": nodeAlignSchema,
  "node.swap": nodeSwapSchema,
  "node.merge": nodeMergeSchema,
  "edge.relabel": edgeRelabelSchema,
  "edge.kind": edgeKindSchema,
  "edge.reverse": edgeReverseSchema,
  "edge.both": edgeBothSchema,
  "edge.emphasize": edgeEmphasizeSchema,
  "edge.retarget": edgeRetargetSchema,
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
  return compact(parsed.data as Record<string, unknown>) as unknown as Op;
}

/** Parses a batch: a list of operations. Reports every malformed item. */
export function parseOps(raw: unknown): Op[] | OpError[] {
  if (!Array.isArray(raw)) {
    return [
      {
        code: "bad-batch",
        index: 0,
        found: show(raw),
        facts: { type: "array" },
      },
    ];
  }
  const ops: Op[] = [];
  const errors: OpError[] = [];
  raw.forEach((item, i) => {
    const r = parseOp(item, i);
    if (Array.isArray(r)) errors.push(...r);
    else ops.push(r);
  });
  return errors.length > 0 ? errors : ops;
}
