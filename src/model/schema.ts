// Validation of a diagram file (DESIGNS.md, "Every write is checked, and each defect has an owner", "What grafical cannot fully read, it refuses", specs/decisions, "Operations over whole-file rewrites").

import { z } from "zod";
import type { Facts, OpError } from "../errors.ts";
import { placeSteps } from "../layout/steps.ts";
import { WEIGHT_LEVEL, WEIGHT_MAX, WEIGHT_MIN } from "../theme/paint.ts";
import { STYLESHEET_SUFFIX, stylesheetProblem, THEMES } from "../theme/themes.ts";
import { checkColumns } from "./columns.ts";
import { checkEnds } from "./ends.ts";
import { groupChain, MAX_GROUP_DEPTH } from "./groups.ts";
import { ID_NODE, ID_SUFFIX, issuesToErrors, STEP_NUMBER, WEIGHT } from "./issues.ts";
import { checkLanes } from "./lanes.ts";
import { likeProblems } from "./like.ts";
import { noteTargets } from "./notes.ts";
import { steerProblems } from "./steer.ts";
import { checkSteps, everyNode, MAX_STEPS, STEP_KEYS } from "./steps.ts";
import { closest } from "./suggest.ts";
import {
  DEFAULT_EDGE_KIND,
  DEFAULT_NODE_KIND,
  type Diagram,
  type DiagramNode,
  EDGE_BENDS,
  EDGE_KINDS,
  EDGE_SIDES,
  EDGE_STRETCHES,
  EDGE_STYLES,
  type Edge,
  FORMAT_VERSION,
  type Group,
  LABEL_ALIGNS,
  LABEL_PLACES,
  LAYER_LOOKS,
  type Layer,
  MARK_COLORS,
  MARK_SHAPES,
  MARK_SIZES,
  MARK_SLOTS,
  type Mark,
  NODE_KINDS,
  OWN_KEYS,
  type OwnSort,
  SHAPE_KINDS,
  type Shape,
  SIZE_STEPS,
  SIZINGS,
  STEP_NUMBER_MAX,
  type Style,
  type TypeDef,
  VIA_SIDES,
  type Wall,
} from "./types.ts";
import { checkWalls } from "./walls.ts";

export const MAX_EMPHASIS = 2;

/** The characters of every id, an edge's too. */
const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;

export const nodeId = z.string().regex(ID_RE, { message: ID_NODE });
/** What a group copy appends to every id it makes (specs/decisions, "A group copy holds its inside"). */
export const idSuffix = z.string().regex(/^[a-z0-9._-]+$/, { message: ID_SUFFIX });
export const text = z.string().min(1);
/** A legend entry's words (specs/decisions, "The legend says only what the agent named"). */
const words = text;

/** The most characters a text mark may hold; a longer text belongs in the label (specs/decisions, "Marks of any kind"). */
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

/** Does this text hold one emoji? Anything else short is drawn as text (specs/decisions, "Marks of any kind"). */
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

/** Is this longer than any mark can be, so that no mark is named by it (specs/decisions, "A legend for widths and marks")? */
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

const COLOR = /^#[0-9a-fA-F]{3,8}$/;

/** A style's values (specs/decisions, "An object names the styles it uses"). */
export const lookFields = {
  fill: z.string().regex(COLOR).optional(),
  border: z.string().regex(COLOR).optional(),
  borderWidth: z.number().min(0).max(8).optional(),
  color: z.string().regex(COLOR).optional(),
};

/** A margin or a gap: pixels on the 4 px grid, never negative (specs/decisions, "Styles set spacing as CSS does, and a later style wins"). */
export const space = z.number().int().min(0).max(400).multipleOf(4);

export const spaceFields = {
  marginTop: space.optional(),
  marginRight: space.optional(),
  marginBottom: space.optional(),
  marginLeft: space.optional(),
  rowGap: space.optional(),
  columnGap: space.optional(),
};

/** Every attribute of a style, checked as `style --set` checks it. */
export const styleFields = { ...lookFields, ...spaceFields };

/** The schema of what a sort holds of a style's attributes itself (specs/decisions, "Every attribute of a style may be set on the object itself"). */
export function ownFields<S extends OwnSort>(
  sort: S,
): { [K in (typeof OWN_KEYS)[S][number]]: (typeof styleFields)[K] } {
  return Object.fromEntries(OWN_KEYS[sort].map((k) => [k, styleFields[k]])) as {
    [K in (typeof OWN_KEYS)[S][number]]: (typeof styleFields)[K];
  };
}

/** Copies what an object holds of a style's attributes itself, in the table's order. */
function copyOwn(sort: OwnSort, from: object, to: object): void {
  const src = from as Record<string, unknown>;
  const dst = to as Record<string, unknown>;
  for (const k of OWN_KEYS[sort]) if (src[k] !== undefined) dst[k] = src[k];
}

const styleNames = z.array(nodeId).min(1).optional();

export const shapeField = z.enum(Object.keys(SHAPE_KINDS) as [Shape, ...Shape[]]).optional();

const typeSchema = z.strictObject({ id: nodeId, base: nodeId, shape: shapeField, ...lookFields });

const nodeSchema = z.strictObject({
  id: nodeId,
  label: text,
  kind: z.enum(NODE_KINDS).default(DEFAULT_NODE_KIND),
  sublabel: text.optional(),
  labelAlign: z.enum(LABEL_ALIGNS).optional(),
  size: z.enum(SIZE_STEPS).optional(),
  emphasis: z.boolean().optional(),
  align: nodeId.optional(),
  group: nodeId.optional(),
  lane: nodeId.optional(),
  column: nodeId.optional(),
  type: nodeId.optional(),
  ...ownFields("node"),
  like: nodeId.optional(),
  style: styleNames,
  marks: iconsSchema.optional(),
});

/** A whole number of steps (specs/decisions, "Steps from another node"). */
export const steps = z.number().int().min(1).max(MAX_STEPS);

/** A node in no layer, placed by steps from another node (specs/decisions, "Steps from another node"). It has no layer, alignment, column or lane. */
const stepNodeSchema = nodeSchema.omit({ align: true, lane: true, column: true }).extend({
  from: nodeId,
  down: steps.optional(),
  up: steps.optional(),
  left: steps.optional(),
  right: steps.optional(),
});

/** Where a region's label sits (specs/decisions, "A region's label sits at a fraction of a side"). */
export const groupTitle = z.strictObject({
  at: z.number().min(0).max(1),
  side: z.enum(EDGE_SIDES),
  place: z.enum(LABEL_PLACES),
});

const groupSchema = z.strictObject({
  id: nodeId,
  label: text,
  sublabel: text.optional(),
  in: nodeId.optional(),
  titleAt: groupTitle.optional(),
  ...ownFields("group"),
  like: nodeId.optional(),
  style: styleNames,
});

const laneSchema = z.strictObject({
  id: nodeId,
  label: text,
  labelAt: z.number().min(0).max(1).optional(),
  labelAlign: z.enum(LABEL_ALIGNS).optional(),
  ...ownFields("lane"),
  like: nodeId.optional(),
  style: styleNames,
});

/** Empty space between two sides (specs/decisions, "Walls as space"): nodes and groups; it lets through edges, nodes and groups. */
const wallSchema = z.strictObject({
  id: nodeId,
  between: z.array(nodeId).min(1),
  and: z.array(nodeId).min(1),
  allow: z.array(z.string().min(1)).optional(),
  label: text.optional(),
  labelAlign: z.enum(LABEL_ALIGNS).optional(),
});

const layerSchema = z.strictObject({
  id: nodeId,
  label: text.optional(),
  labelAt: z.number().min(0).max(1).optional(),
  lane: nodeId.optional(),
  look: z.enum(LAYER_LOOKS).optional(),
  ...ownFields("layer"),
  style: styleNames,
  nodes: z.array(nodeSchema).default([]),
});

/** A width in pixels, written as a legend's key (specs/decisions, "A legend for widths and marks"). */
const WIDTH_KEY = /^[0-9]+(\.[0-9]+)?$/;

/**
 * What a legend may name as a weight (specs/decisions, "A legend for widths and marks"): a level other than thin, or a width in
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

/** An edge weight: a level name, or a width in pixels (specs/decisions, "Edge weights"). Whether the level exists is checked once the stylesheet is read. */
export const weightValue = z.union([
  z.string().regex(WEIGHT_LEVEL, { message: WEIGHT }),
  z.number().min(WEIGHT_MIN, { message: WEIGHT }).max(WEIGHT_MAX, { message: WEIGHT }),
]);

/** An edge's step number (specs/decisions, "Step badges ride the edge"): a whole number from 1 to STEP_NUMBER_MAX. */
export const stepNumber = z
  .number()
  .int({ message: STEP_NUMBER })
  .min(1, { message: STEP_NUMBER })
  .max(STEP_NUMBER_MAX, { message: STEP_NUMBER });

const edgeSchema = z.strictObject({
  id: nodeId,
  from: nodeId,
  to: nodeId,
  kind: z.enum(EDGE_KINDS).default(DEFAULT_EDGE_KIND),
  label: text.optional(),
  labelAlign: z.enum(LABEL_ALIGNS).optional(),
  labelStyle: styleNames,
  labelLook: z.strictObject(ownFields("label")).optional(),
  both: z.boolean().optional(),
  pass: z.boolean().optional(),
  seat: z.enum(["beside"]).optional(),
  out: z.enum(EDGE_SIDES).optional(),
  in: z.enum(EDGE_SIDES).optional(),
  weight: weightValue.optional(),
  step: stepNumber.optional(),
  via: z.strictObject({ object: nodeId, side: z.enum(VIA_SIDES) }).optional(),
  straight: z.boolean().optional(),
  with: nodeId.optional(),
  bendAt: z.literal(EDGE_BENDS).optional(),
  stretch: z.literal(EDGE_STRETCHES).optional(),
  type: nodeId.optional(),
  ...ownFields("edge"),
  like: nodeId.optional(),
  style: styleNames,
});

export const diagramSchema = z.strictObject({
  grafical: z.number().int().min(1),
  title: text,
  subtitle: text.optional(),
  caption: text.optional(),
  lines: z.enum(["round"]).optional(),
  titleAt: z
    .strictObject({ at: z.number().min(0).max(1), side: z.enum(["top", "bottom"]) })
    .optional(),
  sizing: z.enum(SIZINGS).optional(),
  stylesheet: text.optional(),
  ...ownFields("diagram"),
  style: styleNames,
  types: z.array(typeSchema).default([]),
  styles: z.array(z.strictObject({ id: nodeId, ...lookFields, ...spaceFields })).default([]),
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
  nodes: z.array(stepNodeSchema).default([]),
  groups: z.array(groupSchema).default([]),
  lanes: z.array(laneSchema).default([]),
  columns: z
    .array(z.strictObject({ id: nodeId, ...ownFields("column"), style: styleNames }))
    .default([]),
  walls: z.array(wallSchema).default([]),
  notes: z
    .array(
      z.strictObject({
        on: z.string().min(1),
        text,
        footnote: z.boolean().optional(),
        labelAlign: z.enum(LABEL_ALIGNS).optional(),
      }),
    )
    .default([]),
  edges: z.array(edgeSchema).default([]),
});

type Parsed = z.output<typeof diagramSchema>;

function buildNode(n: Parsed["layers"][number]["nodes"][number] | Parsed["nodes"][number]) {
  const node: DiagramNode = { id: n.id, label: n.label, kind: n.kind };
  if (n.sublabel !== undefined) node.sublabel = n.sublabel;
  if (n.labelAlign !== undefined) node.labelAlign = n.labelAlign;
  if (n.size !== undefined) node.size = n.size;
  if (n.emphasis === true) node.emphasis = true;
  if ("align" in n && n.align !== undefined) node.align = n.align;
  if (n.group !== undefined) node.group = n.group;
  if ("lane" in n && n.lane !== undefined) node.lane = n.lane;
  if ("column" in n && n.column !== undefined) node.column = n.column;
  if (n.marks !== undefined) {
    const marks: NonNullable<DiagramNode["marks"]> = {};
    for (const slot of MARK_SLOTS) {
      const m = n.marks[slot];
      if (m !== undefined) marks[slot] = compactMark(m);
    }
    if (Object.keys(marks).length > 0) node.marks = marks;
  }
  if (n.type !== undefined) node.type = n.type;
  copyOwn("node", n, node);
  if (n.like !== undefined) node.like = n.like;
  if (n.style !== undefined) node.style = [...n.style];
  if ("from" in n) {
    node.from = n.from;
    for (const k of STEP_KEYS) if (n[k] !== undefined) node[k] = n[k];
  }
  return node;
}

function build(p: Parsed): Diagram {
  const layers: Layer[] = p.layers.map((l) => {
    const layer: Layer = {
      id: l.id,
      ...(l.label === undefined ? {} : { label: l.label }),
      ...(l.lane === undefined ? {} : { lane: l.lane }),
      ...(l.look === undefined ? {} : { look: l.look }),
      ...(l.labelAt === undefined ? {} : { labelAt: l.labelAt }),
      nodes: [],
    };
    copyOwn("layer", l, layer);
    if (l.style !== undefined) layer.style = [...l.style];
    layer.nodes = l.nodes.map(buildNode);
    return layer;
  });
  const edges: Edge[] = p.edges.map((e) => {
    const edge: Edge = { id: e.id, from: e.from, to: e.to, kind: e.kind };
    if (e.label !== undefined) edge.label = e.label;
    if (e.labelAlign !== undefined) edge.labelAlign = e.labelAlign;
    if (e.labelStyle !== undefined) edge.labelStyle = [...e.labelStyle];
    if (e.labelLook !== undefined) {
      const look = {};
      copyOwn("label", e.labelLook, look);
      if (Object.keys(look).length > 0) edge.labelLook = look;
    }
    if (e.both === true) edge.both = true;
    if (e.pass === true) edge.pass = true;
    if (e.seat !== undefined) edge.seat = e.seat;
    if (e.out !== undefined) edge.out = e.out;
    if (e.in !== undefined) edge.in = e.in;
    if (e.weight !== undefined) edge.weight = e.weight;
    if (e.step !== undefined) edge.step = e.step;
    if (e.via !== undefined) edge.via = { ...e.via };
    if (e.straight === true) edge.straight = true;
    if (e.with !== undefined) edge.with = e.with;
    if (e.bendAt !== undefined) edge.bendAt = e.bendAt;
    if (e.stretch !== undefined) edge.stretch = e.stretch;
    if (e.type !== undefined) edge.type = e.type;
    copyOwn("edge", e, edge);
    if (e.like !== undefined) edge.like = e.like;
    if (e.style !== undefined) edge.style = [...e.style];
    return edge;
  });
  const d: Diagram = { grafical: p.grafical, title: p.title, layers, edges };
  if (p.sizing === "fixed") d.sizing = "fixed";
  if (p.lines !== undefined) d.lines = p.lines;
  if (p.titleAt !== undefined) d.titleAt = p.titleAt;
  if (p.stylesheet !== undefined) d.stylesheet = p.stylesheet;
  copyOwn("diagram", p, d);
  if (p.style !== undefined) d.style = [...p.style];
  if (p.types.length > 0) {
    d.types = p.types.map(
      (s) =>
        Object.fromEntries(
          Object.entries(s).filter(([, v]) => v !== undefined),
        ) as unknown as TypeDef,
    );
  }
  if (p.styles.length > 0) {
    d.styles = p.styles.map(
      (s) =>
        Object.fromEntries(
          Object.entries(s).filter(([, v]) => v !== undefined),
        ) as unknown as Style,
    );
  }
  if (p.legend !== undefined) {
    const legend: NonNullable<Diagram["legend"]> = {};
    for (const styleName of EDGE_STYLES) {
      const text = p.legend[styleName];
      if (typeof text === "string") legend[styleName] = text;
    }
    // A width is named as the edge's number names it: 2.5 and not 2.50.
    const weights = Object.entries(p.legend.weights ?? {}).flatMap(([k, v]) =>
      typeof v === "string" ? [[WIDTH_KEY.test(k) ? String(Number(k)) : k, v] as const] : [],
    );
    if (weights.length > 0) legend.weights = Object.fromEntries(weights);
    if (p.legend.marks !== undefined && Object.keys(p.legend.marks).length > 0) {
      legend.marks = { ...p.legend.marks };
    }
    if (Object.keys(legend).length > 0) d.legend = legend;
  }
  if (p.subtitle !== undefined) d.subtitle = p.subtitle;
  if (p.caption !== undefined) d.caption = p.caption;
  if (p.groups.length > 0) {
    d.groups = p.groups.map((g) => {
      const group: Group = { id: g.id, label: g.label };
      if (g.sublabel !== undefined) group.sublabel = g.sublabel;
      if (g.in !== undefined) group.in = g.in;
      if (g.titleAt !== undefined) group.titleAt = g.titleAt;
      copyOwn("group", g, group);
      if (g.like !== undefined) group.like = g.like;
      if (g.style !== undefined) group.style = [...g.style];
      return group;
    });
  }
  if (p.nodes.length > 0) d.nodes = p.nodes.map(buildNode);
  if (p.lanes.length > 0) {
    d.lanes = p.lanes.map((x) => {
      const lane: NonNullable<Diagram["lanes"]>[number] = {
        id: x.id,
        label: x.label,
        ...(x.labelAlign === undefined ? {} : { labelAlign: x.labelAlign }),
        ...(x.labelAt === undefined ? {} : { labelAt: x.labelAt }),
      };
      copyOwn("lane", x, lane);
      if (x.like !== undefined) lane.like = x.like;
      if (x.style !== undefined) lane.style = [...x.style];
      return lane;
    });
  }
  if (p.columns.length > 0) {
    d.columns = p.columns.map((x) => {
      const column: NonNullable<Diagram["columns"]>[number] = { id: x.id };
      copyOwn("column", x, column);
      if (x.style !== undefined) column.style = [...x.style];
      return column;
    });
  }
  if (p.walls.length > 0) {
    d.walls = p.walls.map((x) => {
      const wall: Wall = { id: x.id, between: [...x.between], and: [...x.and] };
      if (x.allow !== undefined && x.allow.length > 0) wall.allow = [...x.allow];
      if (x.label !== undefined) wall.label = x.label;
      if (x.labelAlign !== undefined) wall.labelAlign = x.labelAlign;
      return wall;
    });
  }
  if (p.notes.length > 0) {
    d.notes = p.notes.map((x) => ({
      on: x.on,
      text: x.text,
      ...(x.footnote === true ? { footnote: true as const } : {}),
      ...(x.labelAlign === undefined ? {} : { labelAlign: x.labelAlign }),
    }));
  }
  return d;
}

/**
 * The rules a schema cannot state: unique ids across layers, nodes and edges,
 * edges that point at nodes, alignments across layers, and at most two emphases.
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
  const nodeIds: string[] = [];
  d.layers.forEach((l, li) => {
    claim(l.id, `layers[${li}].id`, "layer");
    l.nodes.forEach((n, ni) => {
      claim(n.id, `layers[${li}].nodes[${ni}].id`, "node");
      nodeIds.push(n.id);
    });
  });
  (d.nodes ?? []).forEach((n, ni) => {
    claim(n.id, `nodes[${ni}].id`, "node");
    nodeIds.push(n.id);
  });
  // Rules that depend on layers see each node placed by steps in its layer (specs/decisions, "Steps from another node").
  const placed = placeSteps(d).d;
  const layerOf = new Map(placed.layers.flatMap((l) => l.nodes.map((n) => [n.id, l.id] as const)));
  (d.groups ?? []).forEach((g, gi) => {
    claim(g.id, `groups[${gi}].id`, "group");
  });
  (d.lanes ?? []).forEach((x, i) => {
    claim(x.id, `lanes[${i}].id`, "lane");
  });
  (d.columns ?? []).forEach((x, i) => {
    claim(x.id, `columns[${i}].id`, "column");
  });
  (d.walls ?? []).forEach((x, i) => {
    claim(x.id, `walls[${i}].id`, "wall");
  });
  d.edges.forEach((e, ei) => {
    claim(e.id, `edges[${ei}].id`, "edge");
  });
  errors.push(...checkGroups(d, index));
  errors.push(...checkSteps(d, index));
  errors.push(...checkLanes(placed, index));
  errors.push(...checkEnds(placed, index));
  errors.push(...checkColumns(d, index));
  errors.push(...checkWalls(placed, index));
  errors.push(...checkNotes(d, index));
  errors.push(...likeProblems(d, index));
  errors.push(...steerProblems(d, index));
  if (d.stylesheet !== undefined) {
    const problem = stylesheetProblem(d.stylesheet);
    if (problem !== undefined) {
      errors.push({
        code: problem,
        index,
        field: "stylesheet",
        found: d.stylesheet,
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
  let emphases = (d.nodes ?? []).filter((n) => n.emphasis).length;
  d.layers.forEach((l, li) => {
    l.nodes.forEach((n, ni) => {
      if (n.emphasis) emphases++;
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
          facts: { node: n.id, layer: l.id },
        });
      }
    });
  });
  if (emphases > MAX_EMPHASIS) {
    errors.push({
      code: "too-much-emphasis",
      index,
      field: "emphasis",
      found: "true",
      facts: {
        count: emphases,
        max: MAX_EMPHASIS,
        nodes: everyNode(d)
          .filter((n) => n.emphasis)
          .map((n) => n.id),
      },
    });
  }
  return errors;
}

/** Note rules (specs/decisions, "Notes as callouts or footnotes"): a note is about a node, a group or an edge that exists, one note each. */
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
 * inside each other at most three deep, with no group inside itself (specs/decisions, "Layers unseen, groups as systems", "Every layered diagram type").
 */
function checkGroups(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const groups = d.groups ?? [];
  const ids = groups.map((g) => g.id);
  const listed = [
    ...d.layers.flatMap((l, li) =>
      l.nodes.map((n, ni) => ({ n, at: `layers[${li}].nodes[${ni}]` })),
    ),
    ...(d.nodes ?? []).map((n, ni) => ({ n, at: `nodes[${ni}]` })),
  ];
  for (const { n, at } of listed) {
    if (n.group === undefined || ids.includes(n.group)) continue;
    errors.push({
      code: "unknown-group",
      index,
      field: `${at}.group`,
      found: n.group,
      facts: { near: closest(n.group, ids) },
    });
  }
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
        facts: { allowed: ["grafical", "title", "layers", "edges"] },
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
