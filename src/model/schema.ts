// Validation of a diagram file (DESIGN.md D1, D5, D22).

import { z } from "zod";
import type { OpError } from "../errors.ts";
import { ID_EDGE, ID_NODE, issuesToErrors } from "./issues.ts";
import { suggestIds } from "./suggest.ts";
import {
  DEFAULT_DENSITY,
  DEFAULT_EDGE_KIND,
  DEFAULT_NODE_KIND,
  DEFAULT_SIZE,
  DENSITIES,
  type Diagram,
  type DiagramNode,
  EDGE_KINDS,
  type Edge,
  FORMAT_VERSION,
  type Layer,
  NODE_KINDS,
  SIZE_STEPS,
} from "./types.ts";

export const MAX_ACCENTS = 2;

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const EDGE_ID_RE = /^[a-z0-9][a-z0-9._-]*(->[a-z0-9][a-z0-9._-]*)?(#[0-9]+)?$/;

export const nodeId = z.string().regex(ID_RE, { message: ID_NODE });
export const edgeId = z.string().regex(EDGE_ID_RE, { message: ID_EDGE });
export const text = z.string().min(1);

const nodeSchema = z.strictObject({
  id: nodeId,
  label: text,
  kind: z.enum(NODE_KINDS).default(DEFAULT_NODE_KIND),
  sublabel: text.optional(),
  size: z.enum(SIZE_STEPS).default(DEFAULT_SIZE),
  accent: z.boolean().optional(),
  align: nodeId.optional(),
  group: nodeId.optional(),
});

const groupSchema = z.strictObject({ id: nodeId, label: text });

const layerSchema = z.strictObject({
  id: nodeId,
  label: text,
  nodes: z.array(nodeSchema).default([]),
});

const edgeSchema = z.strictObject({
  id: edgeId,
  from: nodeId,
  to: nodeId,
  kind: z.enum(EDGE_KINDS).default(DEFAULT_EDGE_KIND),
  label: text.optional(),
});

export const diagramSchema = z.strictObject({
  grafical: z.number().int().min(1),
  title: text,
  subtitle: text.optional(),
  note: text.optional(),
  density: z.enum(DENSITIES).default(DEFAULT_DENSITY),
  layers: z.array(layerSchema).default([]),
  groups: z.array(groupSchema).default([]),
  edges: z.array(edgeSchema).default([]),
});

type Parsed = z.output<typeof diagramSchema>;

function build(p: Parsed): Diagram {
  const layers: Layer[] = p.layers.map((l) => ({
    id: l.id,
    label: l.label,
    nodes: l.nodes.map((n) => {
      const node: DiagramNode = { id: n.id, label: n.label, kind: n.kind, size: n.size };
      if (n.sublabel !== undefined) node.sublabel = n.sublabel;
      if (n.accent === true) node.accent = true;
      if (n.align !== undefined) node.align = n.align;
      if (n.group !== undefined) node.group = n.group;
      return node;
    }),
  }));
  const edges: Edge[] = p.edges.map((e) => {
    const edge: Edge = { id: e.id, from: e.from, to: e.to, kind: e.kind };
    if (e.label !== undefined) edge.label = e.label;
    return edge;
  });
  const d: Diagram = { grafical: p.grafical, title: p.title, density: p.density, layers, edges };
  if (p.subtitle !== undefined) d.subtitle = p.subtitle;
  if (p.note !== undefined) d.note = p.note;
  if (p.groups.length > 0) d.groups = p.groups.map((g) => ({ id: g.id, label: g.label }));
  return d;
}

/**
 * The rules a schema cannot state: unique ids across layers, nodes and edges,
 * edges that point at nodes, alignments across layers, and at most two accents.
 * `index` is the operation index to put on each error.
 */
export function checkIntegrity(d: Diagram, index = 0): OpError[] {
  const errors: OpError[] = [];
  const seen = new Map<string, string>();
  const claim = (id: string, where: string) => {
    const first = seen.get(id);
    if (first !== undefined) {
      errors.push({
        code: "duplicate-id",
        index,
        field: where,
        found: id,
        expected: "an id that is unique across layers, nodes and edges",
        suggestion: `${id} is already used at ${first}; choose another id`,
      });
    } else seen.set(id, where);
  };
  const layerOf = new Map<string, string>();
  const nodeIds: string[] = [];
  d.layers.forEach((l, li) => {
    claim(l.id, `layers[${li}].id`);
    l.nodes.forEach((n, ni) => {
      claim(n.id, `layers[${li}].nodes[${ni}].id`);
      layerOf.set(n.id, l.id);
      nodeIds.push(n.id);
    });
  });
  (d.groups ?? []).forEach((g, gi) => {
    claim(g.id, `groups[${gi}].id`);
  });
  d.edges.forEach((e, ei) => {
    claim(e.id, `edges[${ei}].id`);
  });
  d.edges.forEach((e, ei) => {
    for (const end of ["from", "to"] as const) {
      if (!layerOf.has(e[end])) {
        errors.push({
          code: "unknown-node",
          index,
          field: `edges[${ei}].${end}`,
          found: e[end],
          expected: "the id of an existing node",
          suggestion: suggestIds(e[end], nodeIds, "node"),
        });
      }
    }
  });
  errors.push(...checkGroups(d, index));
  let accents = 0;
  d.layers.forEach((l, li) => {
    l.nodes.forEach((n, ni) => {
      if (n.accent) accents++;
      if (n.align === undefined) return;
      const field = `layers[${li}].nodes[${ni}].align`;
      const other = layerOf.get(n.align);
      if (other === undefined) {
        errors.push({
          code: "unknown-node",
          index,
          field,
          found: n.align,
          expected: "the id of an existing node",
          suggestion: suggestIds(n.align, nodeIds, "node"),
        });
      } else if (other === l.id) {
        errors.push({
          code: "align-same-layer",
          index,
          field,
          found: `${n.align} (layer ${other})`,
          expected: "a node in another layer",
          suggestion: `${n.id} is in layer ${l.id} too; align to a node in a different layer`,
        });
      }
    });
  });
  if (accents > MAX_ACCENTS) {
    errors.push({
      code: "too-many-accents",
      index,
      field: "accent",
      found: `${accents} accented nodes`,
      expected: `at most ${MAX_ACCENTS}`,
      suggestion: "keep accent on the one or two nodes a reader should see first",
    });
  }
  return errors;
}

/** Group rules: members name an existing group, and a group's rows touch (D7). */
function checkGroups(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const groups = d.groups ?? [];
  const ids = groups.map((g) => g.id);
  const rows = new Map<string, Set<number>>();
  d.layers.forEach((l, li) => {
    l.nodes.forEach((n, ni) => {
      if (n.group === undefined) return;
      if (!ids.includes(n.group)) {
        errors.push({
          code: "unknown-group",
          index,
          field: `layers[${li}].nodes[${ni}].group`,
          found: n.group,
          expected: "the id of an existing group",
          suggestion: suggestIds(n.group, ids, "group"),
        });
        return;
      }
      const set = rows.get(n.group) ?? new Set<number>();
      set.add(li);
      rows.set(n.group, set);
    });
  });
  groups.forEach((g, gi) => {
    const set = rows.get(g.id);
    if (set === undefined) return;
    const used = [...set].sort((a, b) => a - b);
    const lo = used[0] as number;
    const hi = used[used.length - 1] as number;
    const gaps: number[] = [];
    for (let r = lo + 1; r < hi; r++) if (!set.has(r)) gaps.push(r);
    if (gaps.length === 0) return;
    const name = (r: number) => d.layers[r]?.id ?? String(r);
    errors.push({
      code: "group-gap",
      index,
      field: `groups[${gi}]`,
      found: `${g.id} has members in layers ${used.map(name).join(", ")} but none in ${gaps.map(name).join(", ")}`,
      expected: "members in neighbouring layers, with no empty layer between them",
      suggestion: `put a member of ${g.id} in layer ${name(gaps[0] as number)}, or group join/leave nodes so ${g.id} covers neighbouring layers`,
    });
  });
  return errors;
}

/** Validates a parsed file. Returns the diagram, or every error found. */
export function validateDiagram(raw: unknown): Diagram | OpError[] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return [
      {
        code: "bad-file",
        index: 0,
        found: show(raw),
        expected: "a mapping with grafical, title, density, layers and edges",
      },
    ];
  }
  const version = (raw as { grafical?: unknown }).grafical;
  if (typeof version === "number" && Number.isInteger(version) && version > FORMAT_VERSION) {
    return [
      {
        code: "newer-format",
        index: 0,
        field: "grafical",
        found: String(version),
        expected: `format ${FORMAT_VERSION} or older`,
        suggestion: "upgrade grafical; a newer file is refused, never guessed at",
      },
    ];
  }
  const parsed = diagramSchema.safeParse(raw);
  if (!parsed.success) return issuesToErrors(parsed.error.issues, raw, 0);
  const diagram = build(parsed.data);
  const errors = checkIntegrity(diagram);
  return errors.length > 0 ? errors : diagram;
}

function show(v: unknown): string {
  return v === null ? "null" : Array.isArray(v) ? "a list" : String(v);
}
