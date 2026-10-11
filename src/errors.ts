// What grafical reports back to the caller (DESIGN.md D5, D14, D16).

/** An operation that cannot be applied. Nothing changes when one occurs. */
export interface OpError {
  /** Stable, machine-readable, such as "unknown-node" or "bad-value". */
  code: string;
  /** Index of the operation in its batch, 0 for a single command. */
  index: number;
  /** The field at fault, such as "layer" or "kind". */
  field?: string;
  found: string;
  expected: string;
  /** How to fix it, such as the closest existing ids or the allowed values. */
  suggestion?: string;
}

export const DEFECT_CODES = [
  "overflow",
  "node-overlap",
  "edge-through-node",
  "label-collision",
  "edge-overlap",
  "missing-glyph",
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
  "node-overlap": "engine",
  "edge-through-node": "engine",
  "label-collision": "engine",
  "edge-overlap": "engine",
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
  found: string;
  expected: string;
  /** An operation that would fix it, in command-line form. */
  fix: string;
}
