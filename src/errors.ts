// What grafical reports back to the caller (DESIGN.md D5, D14, D16).

/**
 * The facts that help fix an error or a defect, as discrete values (D37): never a
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
  "chain",
  "line",
  "column",
  "chars",
  "shared",
  "fix",
];

/** An operation that cannot be applied. Nothing changes when one occurs. */
export interface OpError {
  /** Stable, machine-readable, such as "unknown-node" or "bad-value". */
  code: string;
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
  "edge-overlap",
  "text-crossing",
  "group-intruder",
  "lane-stray",
  "missing-glyph",
  "mark-covers",
  "wall-crossed",
  "needless-bend",
  "box-aside",
] as const;
export type DefectCode = (typeof DEFECT_CODES)[number];

/**
 * Who can fix a defect (D14). The agent can shorten a label or change a
 * character. Only the engine can move a line or a box, so it must avoid the
 * rest itself.
 */
export type DefectOwner = "agent" | "engine";

export const DEFECT_OWNER: Record<DefectCode, DefectOwner> = {
  overflow: "agent",
  "missing-glyph": "agent",
  "mark-covers": "agent",
  // The agent's boxes lead the line through the wall; it allows the line or moves one (D43).
  "wall-crossed": "agent",
  "node-overlap": "engine",
  "edge-through-node": "engine",
  "label-collision": "engine",
  "edge-overlap": "engine",
  "text-crossing": "engine",
  "group-intruder": "engine",
  "lane-stray": "engine",
  // One x would have served both ends of the line (D47).
  "needless-bend": "engine",
  // The agent placed the box by steps beside everything it connects to (D47).
  "box-aside": "agent",
};

/**
 * A mechanical flaw in the laid-out picture. A write that leaves an agent-owned
 * defect fails. An engine-owned one is an engine bug: the write goes ahead, and
 * only `grafical check --all` reports it (D14).
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
