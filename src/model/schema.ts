// Validation of a diagram file (DESIGN.md D1, D5, D22).

import { z } from "zod";
import type { Facts, OpError } from "../errors.ts";
import { WEIGHT_LEVEL, WEIGHT_MAX, WEIGHT_MIN } from "../theme/paint.ts";
import { STYLESHEET_SUFFIX, styleProblem, THEMES } from "../theme/themes.ts";
import { checkEnds } from "./ends.ts";
import { groupChain, MAX_GROUP_DEPTH } from "./groups.ts";
import { ID_EDGE, ID_NODE, issuesToErrors, WEIGHT } from "./issues.ts";
import { checkLanes } from "./lanes.ts";
import { noteTargets } from "./notes.ts";
import { closest } from "./suggest.ts";
import {
  DEFAULT_DENSITY,
  DEFAULT_EDGE_KIND,
  DEFAULT_NODE_KIND,
  DENSITIES,
  type Diagram,
  type DiagramNode,
  EDGE_KINDS,
  type Edge,
  FORMAT_VERSION,
  type Group,
  type Layer,
  LINE_STYLES,
  MARK_COLORS,
  MARK_SHAPES,
  MARK_SIZES,
  MARK_SLOTS,
  type Mark,
  NODE_KINDS,
  SIZE_STEPS,
  SIZINGS,
  type Wall,
} from "./types.ts";
import { checkWalls } from "./walls.ts";

export const MAX_ACCENTS = 2;

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const EDGE_ID_RE = /^[a-z0-9][a-z0-9._-]*(->[a-z0-9][a-z0-9._-]*)?(#[0-9]+)?$/;

export const nodeId = z.string().regex(ID_RE, { message: ID_NODE });
export const edgeId = z.string().regex(EDGE_ID_RE, { message: ID_EDGE });
export const text = z.string().min(1);
/** A legend entry's words, or false to leave the entry out (D42). */
const words = z.union([text, z.literal(false)]);

/** The most characters a text mark may hold; a longer text belongs in the label (D40). */
export const MARK_TEXT_MAX = 6;

/** The characters a person sees, so that one emoji counts as one. */
export function graphemes(s: string): string[] {
  return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s)].map(
    (x) => x.segment,
  );
}

/** A parsed mark without its absent fields, which the types do not allow to be undefined. */
function compactMark(m: z.output<typeof markSchema>): Mark {
  if (typeof m === "string") return m;
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined)) as Mark;
}

/** Does this text hold one emoji? Anything else short is drawn as text (D40). */
export function isEmoji(text: string): boolean {
  return /^\p{Extended_Pictographic}/u.test(text) && graphemes(text).length === 1;
}

/** The `#rrggbb` a color name or a hex value means, or undefined when it means none. */
export function markColor(v: string): string | undefined {
  const named = (MARK_COLORS as Record<string, string>)[v.toLowerCase()];
  if (named !== undefined) return named;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : undefined;
}

/** Does a mark value name an image file rather than hold a text? */
export function isMarkFile(v: string): boolean {
  return /\.(svg|png)$/i.test(v);
}

/** Is this longer than any mark can be, so that no mark is named by it (D42)? */
export function markNameTooLong(name: string): boolean {
  return !isMarkFile(name) && graphemes(name).length > MARK_TEXT_MAX;
}

const markText1 = z
  .string()
  .min(1)
  .refine((v) => graphemes(v).length <= MARK_TEXT_MAX, { message: "mark-too-long" });

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/);

const markSchema = z.union([
  markText1,
  z.strictObject({
    file: text,
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    size: z.enum(MARK_SIZES).optional(),
  }),
  z.strictObject({
    text: markText1,
    bg: hexColor.optional(),
    border: hexColor.optional(),
    fg: hexColor.optional(),
    shape: z.enum(MARK_SHAPES).optional(),
    size: z.enum(MARK_SIZES).optional(),
  }),
]);

const iconsSchema = z.strictObject({
  "top-left": markSchema.optional(),
  "top-right": markSchema.optional(),
  "bottom-left": markSchema.optional(),
  "bottom-right": markSchema.optional(),
  left: markSchema.optional(),
});

const nodeSchema = z.strictObject({
  id: nodeId,
  label: text,
  kind: z.enum(NODE_KINDS).default(DEFAULT_NODE_KIND),
  sublabel: text.optional(),
  size: z.enum(SIZE_STEPS).optional(),
  accent: z.boolean().optional(),
  align: nodeId.optional(),
  group: nodeId.optional(),
  lane: nodeId.optional(),
  icons: iconsSchema.optional(),
});

const groupSchema = z.strictObject({
  id: nodeId,
  label: text,
  sublabel: text.optional(),
  in: nodeId.optional(),
});

const laneSchema = z.strictObject({ id: nodeId, label: text });

/** Empty space between two sides (D43): nodes and groups; it lets through lines, nodes and groups. */
const wallSchema = z.strictObject({
  id: nodeId,
  between: z.array(nodeId).min(1),
  and: z.array(nodeId).min(1),
  allow: z.array(z.string().min(1)).optional(),
  label: text.optional(),
});

const layerSchema = z.strictObject({
  id: nodeId,
  label: text,
  lane: nodeId.optional(),
  nodes: z.array(nodeSchema).default([]),
});

/** A width in pixels, written as a legend's key (D42). */
const WIDTH_KEY = /^[0-9]+(\.[0-9]+)?$/;

/**
 * What a legend may name as a weight (D42): a level other than thin, or a width in
 * pixels within the limits. Returns the facts of a refusal, or undefined. `levels` are
 * the levels the stylesheet has; whether a level exists is checked once it is read.
 */
export function legendWeightProblem(
  key: string,
  levels: readonly string[] = ["thick", "heavy"],
): Facts | undefined {
  const facts: Facts = {
    allowed: levels.filter((l) => l !== "thin"),
    min: WEIGHT_MIN,
    max: WEIGHT_MAX,
  };
  if (WIDTH_KEY.test(key)) {
    const w = Number(key);
    return w >= WEIGHT_MIN && w <= WEIGHT_MAX ? undefined : facts;
  }
  return key !== "thin" && WEIGHT_LEVEL.test(key) ? undefined : facts;
}

/** An edge weight: a level name, or a width in pixels (D41). Whether the level exists is checked once the stylesheet is read. */
export const weightValue = z.union([
  z.string().regex(WEIGHT_LEVEL, { message: WEIGHT }),
  z.number().min(WEIGHT_MIN, { message: WEIGHT }).max(WEIGHT_MAX, { message: WEIGHT }),
]);

const edgeSchema = z.strictObject({
  id: edgeId,
  from: nodeId,
  to: nodeId,
  kind: z.enum(EDGE_KINDS).default(DEFAULT_EDGE_KIND),
  label: text.optional(),
  both: z.boolean().optional(),
  accent: z.boolean().optional(),
  weight: weightValue.optional(),
});

export const diagramSchema = z.strictObject({
  grafical: z.number().int().min(1),
  title: text,
  subtitle: text.optional(),
  note: text.optional(),
  density: z.enum(DENSITIES).default(DEFAULT_DENSITY),
  sizing: z.enum(SIZINGS).optional(),
  style: text.optional(),
  legend: z
    .strictObject({
      solid: words.optional(),
      dashed: words.optional(),
      dotted: words.optional(),
      plain: words.optional(),
      weights: z.record(z.string(), words).optional(),
      marks: z.record(z.string(), text).optional(),
    })
    .optional(),
  layers: z.array(layerSchema).default([]),
  groups: z.array(groupSchema).default([]),
  lanes: z.array(laneSchema).default([]),
  walls: z.array(wallSchema).default([]),
  notes: z.array(z.strictObject({ on: z.string().min(1), text })).default([]),
  edges: z.array(edgeSchema).default([]),
});

type Parsed = z.output<typeof diagramSchema>;

function build(p: Parsed): Diagram {
  const layers: Layer[] = p.layers.map((l) => ({
    id: l.id,
    label: l.label,
    ...(l.lane === undefined ? {} : { lane: l.lane }),
    nodes: l.nodes.map((n) => {
      const node: DiagramNode = { id: n.id, label: n.label, kind: n.kind };
      if (n.sublabel !== undefined) node.sublabel = n.sublabel;
      if (n.size !== undefined) node.size = n.size;
      if (n.accent === true) node.accent = true;
      if (n.align !== undefined) node.align = n.align;
      if (n.group !== undefined) node.group = n.group;
      if (n.lane !== undefined) node.lane = n.lane;
      if (n.icons !== undefined) {
        const icons: NonNullable<DiagramNode["icons"]> = {};
        for (const slot of MARK_SLOTS) {
          const m = n.icons[slot];
          if (m !== undefined) icons[slot] = compactMark(m);
        }
        if (Object.keys(icons).length > 0) node.icons = icons;
      }
      return node;
    }),
  }));
  const edges: Edge[] = p.edges.map((e) => {
    const edge: Edge = { id: e.id, from: e.from, to: e.to, kind: e.kind };
    if (e.label !== undefined) edge.label = e.label;
    if (e.both === true) edge.both = true;
    if (e.accent === true) edge.accent = true;
    if (e.weight !== undefined) edge.weight = e.weight;
    return edge;
  });
  const d: Diagram = { grafical: p.grafical, title: p.title, density: p.density, layers, edges };
  if (p.sizing === "fixed") d.sizing = "fixed";
  if (p.style !== undefined) d.style = p.style;
  if (p.legend !== undefined) {
    const legend: NonNullable<Diagram["legend"]> = {};
    for (const line of LINE_STYLES) {
      const text = p.legend[line];
      if (text !== undefined) legend[line] = text;
    }
    // YAML may write a width as 2.50 or "2.50"; the legend names it as the edge's number does.
    const weights = Object.entries(p.legend.weights ?? {}).map(
      ([k, v]) => [WIDTH_KEY.test(k) ? String(Number(k)) : k, v] as const,
    );
    if (weights.length > 0) legend.weights = Object.fromEntries(weights);
    if (p.legend.marks !== undefined && Object.keys(p.legend.marks).length > 0) {
      legend.marks = { ...p.legend.marks };
    }
    if (Object.keys(legend).length > 0) d.legend = legend;
  }
  if (p.subtitle !== undefined) d.subtitle = p.subtitle;
  if (p.note !== undefined) d.note = p.note;
  if (p.groups.length > 0) {
    d.groups = p.groups.map((g) => {
      const group: Group = { id: g.id, label: g.label };
      if (g.sublabel !== undefined) group.sublabel = g.sublabel;
      if (g.in !== undefined) group.in = g.in;
      return group;
    });
  }
  if (p.lanes.length > 0) d.lanes = p.lanes.map((x) => ({ id: x.id, label: x.label }));
  if (p.walls.length > 0) {
    d.walls = p.walls.map((x) => {
      const wall: Wall = { id: x.id, between: [...x.between], and: [...x.and] };
      if (x.allow !== undefined && x.allow.length > 0) wall.allow = [...x.allow];
      if (x.label !== undefined) wall.label = x.label;
      return wall;
    });
  }
  if (p.notes.length > 0) d.notes = p.notes.map((x) => ({ on: x.on, text: x.text }));
  return d;
}

/**
 * The rules a schema cannot state: unique ids across layers, nodes and edges,
 * edges that point at nodes, alignments across layers, and at most two accents.
 * `index` is the operation index to put on each error.
 */
export function checkIntegrity(d: Diagram, index = 0): OpError[] {
  const errors: OpError[] = [];
  // What each id first names: a layer, node, group, lane or edge.
  const seen = new Map<string, string>();
  const claim = (id: string, where: string, is: string) => {
    const first = seen.get(id);
    if (first !== undefined) {
      errors.push({
        code: "duplicate-id",
        index,
        field: where,
        found: id,
        facts: { is: first },
      });
    } else seen.set(id, is);
  };
  const layerOf = new Map<string, string>();
  const nodeIds: string[] = [];
  d.layers.forEach((l, li) => {
    claim(l.id, `layers[${li}].id`, "layer");
    l.nodes.forEach((n, ni) => {
      claim(n.id, `layers[${li}].nodes[${ni}].id`, "node");
      layerOf.set(n.id, l.id);
      nodeIds.push(n.id);
    });
  });
  (d.groups ?? []).forEach((g, gi) => {
    claim(g.id, `groups[${gi}].id`, "group");
  });
  (d.lanes ?? []).forEach((x, i) => {
    claim(x.id, `lanes[${i}].id`, "lane");
  });
  (d.walls ?? []).forEach((x, i) => {
    claim(x.id, `walls[${i}].id`, "wall");
  });
  d.edges.forEach((e, ei) => {
    claim(e.id, `edges[${ei}].id`, "edge");
  });
  errors.push(...checkGroups(d, index));
  errors.push(...checkLanes(d, index));
  errors.push(...checkEnds(d, index));
  errors.push(...checkWalls(d, index));
  errors.push(...checkNotes(d, index));
  if (d.style !== undefined) {
    const problem = styleProblem(d.style);
    if (problem !== undefined) {
      errors.push({
        code: problem,
        index,
        field: "style",
        found: d.style,
        facts: { allowed: [...Object.keys(THEMES), `<name>${STYLESHEET_SUFFIX}`] },
      });
    }
  }
  for (const key of Object.keys(d.legend?.weights ?? {})) {
    const facts = legendWeightProblem(key);
    if (facts !== undefined) {
      errors.push({ code: "bad-value", index, field: "legend.weights", found: key, facts });
    }
  }
  for (const name of Object.keys(d.legend?.marks ?? {})) {
    if (!markNameTooLong(name)) continue;
    errors.push({
      code: "mark-too-long",
      index,
      field: "legend.marks",
      found: name,
      facts: { max: MARK_TEXT_MAX },
    });
  }
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
          facts: { near: closest(n.align, nodeIds) },
        });
      } else if (other === l.id) {
        errors.push({
          code: "align-same-layer",
          index,
          field,
          found: n.align,
          facts: { row: l.id },
        });
      }
    });
  });
  if (accents > MAX_ACCENTS) {
    errors.push({
      code: "too-many-accents",
      index,
      field: "accent",
      found: "true",
      facts: {
        count: accents,
        max: MAX_ACCENTS,
        nodes: d.layers.flatMap((l) => l.nodes.filter((n) => n.accent).map((n) => n.id)),
      },
    });
  }
  return errors;
}

/** Note rules (D44): a note is about a node, a group or a line that exists, one note each. */
function checkNotes(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const targets = noteTargets(d);
  const seen = new Set<string>();
  (d.notes ?? []).forEach((x, i) => {
    if (!targets.includes(x.on)) {
      errors.push({
        code: "unknown-node",
        index,
        field: `notes[${i}].on`,
        found: x.on,
        facts: { near: closest(x.on, targets) },
      });
    } else if (seen.has(x.on)) {
      errors.push({
        code: "duplicate-id",
        index,
        field: `notes[${i}].on`,
        found: x.on,
        facts: { is: "note" },
      });
    }
    seen.add(x.on);
  });
  return errors;
}

/**
 * Group rules: members and inner groups name an existing group, and groups sit
 * inside each other at most three deep, with no group inside itself (D7, D34).
 */
function checkGroups(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const groups = d.groups ?? [];
  const ids = groups.map((g) => g.id);
  d.layers.forEach((l, li) => {
    l.nodes.forEach((n, ni) => {
      if (n.group === undefined || ids.includes(n.group)) return;
      errors.push({
        code: "unknown-group",
        index,
        field: `layers[${li}].nodes[${ni}].group`,
        found: n.group,
        facts: { near: closest(n.group, ids) },
      });
    });
  });
  groups.forEach((g, gi) => {
    if (g.in === undefined) return;
    if (!ids.includes(g.in)) {
      errors.push({
        code: "unknown-group",
        index,
        field: `groups[${gi}].in`,
        found: g.in,
        facts: { near: closest(g.in, ids) },
      });
      return;
    }
    const chain = groupChain(d, g.id);
    const parent = groups.find((x) => x.id === chain[chain.length - 1])?.in;
    if (parent !== undefined && chain.includes(parent)) {
      errors.push({
        code: "group-cycle",
        index,
        field: `groups[${gi}].in`,
        found: g.in,
        facts: { chain: [...chain, parent] },
      });
    } else if (chain.length > MAX_GROUP_DEPTH) {
      errors.push({
        code: "group-too-deep",
        index,
        field: `groups[${gi}].in`,
        found: g.in,
        facts: { count: chain.length, max: MAX_GROUP_DEPTH, chain },
      });
    }
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
        facts: { allowed: ["grafical", "title", "density", "layers", "edges"] },
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
        facts: { max: FORMAT_VERSION },
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
