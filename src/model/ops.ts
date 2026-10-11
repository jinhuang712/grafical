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
  NODE_KINDS,
  type NodeKind,
  SIZE_STEPS,
  type SizeStep,
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
}
export interface EdgeRemoveOp {
  op: "edge.remove";
  id: string;
}

export type Op =
  | DiagramNewOp
  | LayerAddOp
  | NodeAddOp
  | NodeRenameOp
  | NodeMoveOp
  | NodeRemoveOp
  | EdgeAddOp
  | EdgeRemoveOp;

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
});
export const edgeRemoveSchema = z.strictObject({ op: z.literal("edge.remove"), id: edgeId });

/** Parses one operation. A batch item is exactly this. */
export const opSchema = z.discriminatedUnion("op", [
  diagramNewSchema,
  layerAddSchema,
  nodeAddSchema,
  nodeRenameSchema,
  nodeMoveSchema,
  nodeRemoveSchema,
  edgeAddSchema,
  edgeRemoveSchema,
]);

const SCHEMAS: Record<OpName, z.ZodType> = {
  "diagram.new": diagramNewSchema,
  "layer.add": layerAddSchema,
  "node.add": nodeAddSchema,
  "node.rename": nodeRenameSchema,
  "node.move": nodeMoveSchema,
  "node.remove": nodeRemoveSchema,
  "edge.add": edgeAddSchema,
  "edge.remove": edgeRemoveSchema,
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
        expected: "a mapping with op: <noun>.<verb> and the operation's fields",
        suggestion: `ops: ${OP_NAMES.join(", ")}`,
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
        expected: `one of: ${OP_NAMES.join(", ")}`,
        suggestion: `closest ops: ${closest(name, OP_NAMES, 2).join(", ")}`,
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
        expected: "a YAML list of operations, each starting with op: <noun>.<verb>",
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
