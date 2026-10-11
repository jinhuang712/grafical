// Alignment (DESIGN.md D6, D10): an aligned node sits in the same column of the
// grid as its target, so directly above or below it. The grid (grid.ts) treats an
// alignment as a join of two columns that must hold. It cannot hold when the order
// of a layer, another alignment or a group puts the target's column on the other
// side of the node's neighbours, and the operation that caused it fails.

export type AlignmentCode =
  | "unknown-node"
  | "same-layer"
  | "self-alignment"
  | "alignment-cycle"
  | "alignment-conflict";

export interface AlignmentProblem {
  code: AlignmentCode;
  /** The aligned node. */
  node: string;
  /** Its alignment target. */
  target: string;
  found: string;
  expected: string;
  suggestion: string;
}
