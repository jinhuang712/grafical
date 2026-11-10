// What grafical reports back to the caller (DESIGNS.md, "Every write is checked, and each defect has an owner", "The command line comes first, and the help is the agent's only reference", specs/decisions, "Defects owned by who can fix them").

/**
 * What is there, as discrete values (specs/decisions, "Records over prose", "Refusals say what happened and which commands
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
  /** For text: how many edges it takes. */
  lines?: number;
  min?: number;
  max?: number;
  /** An unused id like the one given. */
  free?: string;
  /** The layer, group, node, edge, lane or wall it concerns. */
  layer?: string;
  group?: string;
  node?: string;
  edge?: string;
  /** Two edges it concerns, such as two that cross. */
  edges?: readonly string[];
  /** The two ends of the edge it concerns, from first. */
  ends?: readonly string[];
  lane?: string;
  wall?: string;
  /** A note, by what it is on. */
  note?: string;
  /** The lanes it lies in; none for outside every lane. */
  lanes?: readonly string[];
  /** The nodes of that layer or group. */
  nodes?: readonly string[];
  /** The layers an edge runs through without meeting a node of them. */
  layers?: readonly string[];
  /** The first and last layers a group's border covers, top to bottom. */
  top?: string;
  bottom?: string;
  /** The groups whose node an edge runs through. */
  groups?: readonly string[];
  /** The members of a group that a node stands between in one layer. */
  between?: readonly string[];
  /** The edges that run across a text. */
  across?: readonly string[];
  /** The node that a mark covers. */
  covers?: string;
  /** Another group, whose nodes would sit on both sides of a group's border. */
  beside?: string;
  /** How the lanes run: layers or columns. */
  run?: string;
  /** Where a group's label sits, as the agent stated it. */
  place?: string;
  /** The side an edge was drawn by. */
  drawn?: string;
  /** The places where no edge would come near that label. */
  clear?: readonly string[];
  /** The gutters an edge's label tried, each as the layers above and below it joined by a slash. */
  gutters?: readonly string[];
  /** Groups from the inside out, as they would nest. */
  chain?: readonly string[];
  /** The arguments a command takes, as its usage names them. */
  takes?: readonly string[];
  /** Where in the text, from 1. */
  line?: number;
  column?: number;
  /** Characters no bundled font can draw. */
  chars?: readonly string[];
  /** Pixels of one line that another shares. */
  shared?: number;
  /** Pixels along which two edges run close side by side. */
  over?: number;
  /** How often an edge bends, and the layers between the layers of its ends. */
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
  "layer",
  "group",
  "edge",
  "edges",
  "ends",
  "lane",
  "wall",
  "note",
  "nodes",
  "layers",
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
  "drawn",
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
 * can tell one from another; what to change is in the error's own facts, never in a page to look up (specs/decisions,
 * "One entry page, help where it is used").
 */
export const ERROR_CODES = [
  "align-same-layer",
  "alignment-conflict",
  "bad-file",
  "bad-id",
  "bad-line",
  "bad-mark",
  "bad-op",
  "bad-reference",
  "bad-revision",
  "bad-stylesheet",
  "bad-type",
  "bad-value",
  "bar-crossed",
  "bar-in-group",
  "bar-to-bar",
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
  "like-cycle",
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
  "placed-elsewhere",
  "same-layer",
  "self-alignment",
  "step-anchor",
  "step-blocked",
  "step-cycle",
  "style-not-found",
  "title-blocked",
  "too-much-emphasis",
  "unknown-column",
  "unknown-edge",
  "unknown-field",
  "unknown-group",
  "unknown-lane",
  "unknown-layer",
  "unknown-style",
  "unknown-type",
  "unknown-node",
  "no-trunk",
  "unknown-note",
  "unknown-op",
  "unknown-wall",
  "unknown-weight",
  "wall-crossed",
  "wall-sides",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * The codes of a command line grafical cannot read: commander's refusals, in kebab case, and grafical's own. Each
 * exits 2 (specs/decisions, "Refusals say what happened and which commands can change it").
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
 * The codes of a warning: written, exit 0, and drawn poorly (specs/decisions, "Refusals say what happened and which
 * commands can change it", "An answer says what happened, and a write reports only what it changed"), in the order they
 * print: an edge with more than two
 * bends (specs/decisions, "A bent edge is reported and never refused"), the places the counts passing, across, tight and crowded count
 * (specs/decisions, "Composition counts"), a node no edge reaches, an edge alike from every node of a group to one end (specs/decisions,
 * "An edge from every node of a group is a warning"), and two edges that cross.
 */
export const WARNING_CODES = [
  "bent-edge",
  "passing-layer",
  "edge-across-group",
  "tight-edges",
  "crowded-label",
  "lonely-node",
  "node-aside",
  "edge-per-member",
  "crossing",
] as const;
export type WarningCode = (typeof WARNING_CODES)[number];

/**
 * Something drawn poorly, which is written: its code and what is there. Its identity is its code and its facts, so
 * that a write reports only the warnings it brought and those it cleared
 * (specs/decisions, "An answer says what happened, and a write reports only what it changed").
 */
export interface Warning {
  code: WarningCode;
  facts: Facts;
}

/** An operation that cannot be applied. Nothing changes when one occurs. */
export interface OpError {
  /** Stable, machine-readable, such as "unknown-node" or "bad-value". */
  code: ErrorCode;
  /** 0 for the command's operation; -1 when no operation can be named as its cause. */
  index: number;
  /** The field at fault, such as "layer" or "kind". */
  field?: string;
  /** The value at fault, as given; empty when it is missing. */
  found: string;
  facts?: Facts;
  /**
   * Found in the whole diagram the operation makes, so that the write path asks whether the file already had it
   * (specs/decisions, "Refusals say what happened and which commands can change it").
   */
  whole?: true;
  /**
   * For an error of the whole diagram: which of its checks found it, from 1, in the order they run. Each check runs
   * only when those before it found nothing, so a diagram refused by a later check has no error of an earlier one.
   */
  stage?: number;
  /** What caused it, as the report prints it: the command line, or what was in the file before. */
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
  "title-blocked",
  "label-blocked",
  "side-blocked",
  "via-blocked",
  "not-straight",
  "no-trunk",
  "bend-blocked",
  "stretch-blocked",
] as const;
export type DefectCode = (typeof DEFECT_CODES)[number];

/**
 * Who can fix a defect (specs/decisions, "Defects owned by who can fix them"). The agent can shorten a label or change a
 * character. Only the engine can move an edge or a node, so it must avoid the
 * rest itself.
 */
export type DefectOwner = "agent" | "engine";

export const DEFECT_OWNER: Record<DefectCode, DefectOwner> = {
  overflow: "agent",
  "missing-glyph": "agent",
  "mark-covers": "agent",
  // The agent's nodes lead the edge through the wall; it allows the edge or moves one (specs/decisions, "Walls as space").
  "wall-crossed": "agent",
  "node-overlap": "engine",
  "edge-through-node": "engine",
  "label-collision": "engine",
  // A step's badge rides its edge, which only the engine places (specs/decisions, "Step badges ride the edge").
  "step-collision": "engine",
  "edge-overlap": "engine",
  "text-crossing": "engine",
  "group-intruder": "engine",
  "lane-stray": "engine",
  // One x would have served both ends of the edge (specs/decisions, "Who chose is punished").
  "needless-bend": "engine",
  // An edge runs where a group's label sits, and no edge moves for it: the agent states a place (specs/decisions, "A group's label moves no node and no edge").
  "title-blocked": "agent",
  // No gutter of its path holds an edge's label clear, and no edge moves for it: the agent shortens
  // or drops the text, or changes layers (specs/decisions, "An edge never moves for its label").
  "label-blocked": "agent",
  // The router has no route by a stated side, and takes no other: the agent changes the side or the layers
  // (specs/decisions, "An agent may state the side of an edge").
  "side-blocked": "agent",
  "via-blocked": "agent",
  "not-straight": "agent",
  "no-trunk": "agent",
  "bend-blocked": "agent",
  "stretch-blocked": "agent",
};

/**
 * A mechanical flaw in the laid-out picture. A write that leaves an agent-owned
 * defect fails. An engine-owned one is an engine bug: the write goes ahead, and
 * only `grafical check --all` reports it (specs/decisions, "Defects owned by who can fix them").
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
