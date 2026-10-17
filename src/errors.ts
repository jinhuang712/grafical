// What grafical reports back to the caller (DESIGN.md, "Checking and failure", "Defects owned by who can fix them", "Interfaces").

/**
 * The facts that help fix an error or a defect, as discrete values (DESIGN.md, "Records over prose"): never a
 * sentence. The code says what is wrong; these say what is there and what would do.
 * They print in this order.
 */
export interface Facts {
  /** What the found id names: layer, node, group, lane or edge. */
  is?: string;
  /** The kind of the node or edge concerned, such as link. */
  kind?: string;
  /** The type of value a field takes: string, number, boolean, array or object. */
  type?: string;
  /** The closest existing ids, nearest first; none when nothing of the sort exists. */
  near?: readonly string[];
  /** What the found value most likely means, in the allowed words, most likely first. */
  likely?: readonly string[];
  /** The values or fields allowed. */
  allowed?: readonly string[];
  /** How many there are, and the limits grafical enforces. */
  count?: number;
  /** For text: how many lines it takes. */
  lines?: number;
  min?: number;
  max?: number;
  /** An unused id like the one given. */
  free?: string;
  /** The row, group, node, edge or lane it concerns. */
  row?: string;
  group?: string;
  node?: string;
  edge?: string;
  lane?: string;
  /** The lanes it lies in; none for outside every lane. */
  lanes?: readonly string[];
  /** The nodes of that row or group. */
  nodes?: readonly string[];
  /** How the lanes run: rows or columns. */
  run?: string;
  /** Where a group's label sits, as the agent stated it. */
  place?: string;
  /** The places where no line would come near that label. */
  clear?: readonly string[];
  /** The gutters a line's label tried, each as the rows above and below it joined by a slash. */
  gutters?: readonly string[];
  /** Groups from the inside out, as they would nest. */
  chain?: readonly string[];
  /** Where in the YAML text, from 1. */
  line?: number;
  column?: number;
  /** Characters no bundled font can draw. */
  chars?: readonly string[];
  /** Pixels of one line that another shares. */
  shared?: number;
  /** Operations that would fix it, in command-line form. */
  fix?: readonly string[];
}

/** The keys of Facts, in the order they print. */
export const FACT_ORDER: readonly (keyof Facts)[] = [
  "is",
  "kind",
  "type",
  "near",
  "likely",
  "allowed",
  "count",
  "lines",
  "min",
  "max",
  "free",
  "row",
  "group",
  "node",
  "edge",
  "lane",
  "lanes",
  "nodes",
  "run",
  "place",
  "clear",
  "gutters",
  "chain",
  "line",
  "column",
  "chars",
  "shared",
  "fix",
];

/**
 * Every code an operation error may carry. A code names the kind of problem, so that the agent and the harness
 * can tell one from another; what to change is in the error's own facts, never in a page to look up (DESIGN.md,
 * "One entry page, help where it is used").
 */
export const ERROR_CODES = [
  "align-same-layer",
  "alignment-conflict",
  "bad-batch",
  "bad-file",
  "bad-id",
  "bad-mark",
  "bad-op",
  "bad-reference",
  "bad-revision",
  "bad-stylesheet",
  "bad-type",
  "bad-value",
  "bad-yaml",
  "bar-crossed",
  "bar-in-group",
  "bar-to-bar",
  "batch-unreadable",
  "both-on-link",
  "column-lanes",
  "column-order",
  "conflicting-fields",
  "conflicting-position",
  "copy-conflict",
  "duplicate-id",
  "edge-blocked",
  "edge-inside",
  "empty-container",
  "empty-value",
  "file-exists",
  "file-not-found",
  "file-unreadable",
  "group-across-lanes",
  "group-conflict",
  "group-cycle",
  "group-split",
  "group-too-deep",
  "invalid",
  "label-blocked",
  "lane-gap",
  "lane-mixed",
  "lane-to-lane",
  "layer-not-empty",
  "layer-too-small",
  "mark-file-changed",
  "mark-file-not-found",
  "mark-file-outside",
  "mark-file-unread",
  "mark-file-unreadable",
  "mark-file-unsafe",
  "mark-not-drawn",
  "mark-style-on-picture",
  "mark-too-long",
  "missing-field",
  "newer-format",
  "no-diagram",
  "no-shared-layer",
  "not-allowed",
  "not-in-git",
  "not-in-layer",
  "outside-folder",
  "same-layer",
  "self-alignment",
  "step-anchor",
  "step-blocked",
  "step-cycle",
  "style-not-found",
  "title-blocked",
  "too-many-accents",
  "unknown-column",
  "unknown-edge",
  "unknown-field",
  "unknown-group",
  "unknown-lane",
  "unknown-layer",
  "unknown-node",
  "unknown-note",
  "unknown-op",
  "unknown-wall",
  "unknown-weight",
  "unquoted-text",
  "wall-crossed",
  "wall-sides",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** An operation that cannot be applied. Nothing changes when one occurs. */
export interface OpError {
  /** Stable, machine-readable, such as "unknown-node" or "bad-value". */
  code: ErrorCode;
  /** Index of the operation in its batch, 0 for a single command. */
  index: number;
  /** The field at fault, such as "layer" or "kind". */
  field?: string;
  /** The value at fault, as given; empty when it is missing. */
  found: string;
  facts?: Facts;
}

export const DEFECT_CODES = [
  "overflow",
  "node-overlap",
  "edge-through-node",
  "label-collision",
  "step-collision",
  "edge-overlap",
  "text-crossing",
  "group-intruder",
  "lane-stray",
  "missing-glyph",
  "mark-covers",
  "wall-crossed",
  "needless-bend",
  "box-aside",
  "title-blocked",
  "label-blocked",
] as const;
export type DefectCode = (typeof DEFECT_CODES)[number];

/**
 * Who can fix a defect (DESIGN.md, "Defects owned by who can fix them"). The agent can shorten a label or change a
 * character. Only the engine can move a line or a box, so it must avoid the
 * rest itself.
 */
export type DefectOwner = "agent" | "engine";

export const DEFECT_OWNER: Record<DefectCode, DefectOwner> = {
  overflow: "agent",
  "missing-glyph": "agent",
  "mark-covers": "agent",
  // The agent's boxes lead the line through the wall; it allows the line or moves one (DESIGN.md, "Walls as space").
  "wall-crossed": "agent",
  "node-overlap": "engine",
  "edge-through-node": "engine",
  "label-collision": "engine",
  // A step's badge rides its line, which only the engine places (DESIGN.md, "Step badges ride the line").
  "step-collision": "engine",
  "edge-overlap": "engine",
  "text-crossing": "engine",
  "group-intruder": "engine",
  "lane-stray": "engine",
  // One x would have served both ends of the line (DESIGN.md, "Who chose is punished").
  "needless-bend": "engine",
  // The agent placed the box by steps beside everything it connects to (DESIGN.md, "Who chose is punished").
  "box-aside": "agent",
  // A line runs where a group's label sits, and no line moves for it: the agent states a place (DESIGN.md, "The dirty work has edges").
  "title-blocked": "agent",
  // No gutter of its path holds a line's label clear, and no line moves for it: the agent shortens
  // or drops the text, or changes rows (DESIGN.md, "The dirty work has edges").
  "label-blocked": "agent",
};

/**
 * A mechanical flaw in the laid-out picture. A write that leaves an agent-owned
 * defect fails. An engine-owned one is an engine bug: the write goes ahead, and
 * only `grafical check --all` reports it (DESIGN.md, "Defects owned by who can fix them").
 */
export interface Defect {
  code: DefectCode;
  owner: DefectOwner;
  /** Ids of the elements involved. */
  elements: string[];
  /** For a defect in text: the field it is in, such as label, and the text. */
  field?: string;
  found?: string;
  /** What is there, and the operations that would fix it. */
  facts: Facts;
}
