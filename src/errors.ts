// What grafical reports back to the caller (DESIGN.md, "Checking and failure", "Defects owned by who can fix them", "Interfaces").

/**
 * What is there, as discrete values (DESIGN.md, "Records over prose", "Refusals say what happened and which commands
 * can change it"): never a sentence, and never a command to run. The code says what happened; these say what is
 * there. They print in FACT_ORDER.
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
  /** The row, group, node, edge, lane or wall it concerns. */
  row?: string;
  group?: string;
  node?: string;
  edge?: string;
  /** Two lines it concerns, such as two that cross. */
  edges?: readonly string[];
  /** The two ends of the line it concerns, from first. */
  ends?: readonly string[];
  lane?: string;
  wall?: string;
  /** A note, by what it is on. */
  note?: string;
  /** The lanes it lies in; none for outside every lane. */
  lanes?: readonly string[];
  /** The nodes of that row or group. */
  nodes?: readonly string[];
  /** The rows a line runs through without meeting a box of them. */
  rows?: readonly string[];
  /** The first and last rows a group's box covers, top to bottom. */
  top?: string;
  bottom?: string;
  /** The groups whose box a line runs through. */
  groups?: readonly string[];
  /** The members of a group that a box stands between in one row. */
  between?: readonly string[];
  /** The lines that run across a text. */
  across?: readonly string[];
  /** The box that a mark covers. */
  covers?: string;
  /** Another group, whose boxes would sit on both sides of a group's box. */
  beside?: string;
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
  /** The arguments a command takes, as its usage names them. */
  takes?: readonly string[];
  /** Where in the YAML text, from 1. */
  line?: number;
  column?: number;
  /** Characters no bundled font can draw. */
  chars?: readonly string[];
  /** Pixels of one line that another shares. */
  shared?: number;
  /** Pixels along which two lines run close side by side. */
  over?: number;
  /** How often a line bends, and the rows between the rows of its ends. */
  bends?: number;
  skip?: number;
}

/**
 * The keys of Facts, in the order they print: what it concerns first, then what is there, then what is allowed and
 * the limits.
 */
export const FACT_ORDER: readonly (keyof Facts)[] = [
  "likely",
  "near",
  "free",
  "is",
  "kind",
  "type",
  "node",
  "row",
  "group",
  "edge",
  "edges",
  "ends",
  "lane",
  "wall",
  "note",
  "nodes",
  "rows",
  "groups",
  "top",
  "bottom",
  "lanes",
  "between",
  "across",
  "covers",
  "beside",
  "chain",
  "run",
  "place",
  "clear",
  "gutters",
  "allowed",
  "takes",
  "count",
  "lines",
  "min",
  "max",
  "line",
  "column",
  "chars",
  "shared",
  "over",
  "bends",
  "skip",
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

/**
 * The codes of a command line grafical cannot read: commander's refusals, in kebab case, and grafical's own. Each
 * exits 2 (DESIGN.md, "Refusals say what happened and which commands can change it").
 */
export const USAGE_CODES = [
  "bad-port",
  "bad-scale",
  "conflicting-option",
  "excess-arguments",
  "invalid-argument",
  "missing-argument",
  "missing-mandatory-option-value",
  "no-folder",
  "option-missing-argument",
  "unknown-command",
  "unknown-guide",
  "unknown-option",
] as const;
export type UsageCode = (typeof USAGE_CODES)[number];

/**
 * The codes of a warning: written, exit 0, and drawn poorly (DESIGN.md, "Refusals say what happened and which
 * commands can change it", "Every write prints every warning"), in the order they print: a line with more than two
 * bends (DESIGN.md, "The dirty work has edges"), the places the counts passing, across, tight and crowded count
 * (DESIGN.md, "Composition counts"), a box no line reaches, and two lines that cross.
 */
export const WARNING_CODES = [
  "bent-line",
  "passing-row",
  "line-across-group",
  "tight-lines",
  "crowded-label",
  "lonely-box",
  "crossing",
] as const;
export type WarningCode = (typeof WARNING_CODES)[number];

/**
 * Something drawn poorly, which is written: its code and what is there. It has no source: the outcome line names
 * what the write changed (DESIGN.md, "Every write prints every warning").
 */
export interface Warning {
  code: WarningCode;
  facts: Facts;
}

/** An operation that cannot be applied. Nothing changes when one occurs. */
export interface OpError {
  /** Stable, machine-readable, such as "unknown-node" or "bad-value". */
  code: ErrorCode;
  /** Index of the operation in its batch, 0 for a single command; -1 when no operation can be named as its cause. */
  index: number;
  /** The field at fault, such as "layer" or "kind". */
  field?: string;
  /** The value at fault, as given; empty when it is missing. */
  found: string;
  facts?: Facts;
  /**
   * Found only once the whole batch is applied, in the diagram it makes, so that no one operation's index names
   * it; the write path finds the operation after which it appears (DESIGN.md, "Refusals say what happened and which
   * commands can change it").
   */
  whole?: true;
  /** What caused it, as the report prints it: the command line, a batch's line, or what was in the file before. */
  source?: string;
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
  /** What is there. */
  facts: Facts;
  /** What caused it, as for an error. */
  source?: string;
}
