// What the fuzz asserts: the defects the engine owns (DESIGN.md D14). Overflow
// and a missing glyph are the agent's to fix, with a shorter label or other text.

import type { Defect, DefectCode } from "../../src/errors.ts";

export const ENGINE_OWNED: readonly DefectCode[] = [
  "node-overlap",
  "edge-through-node",
  "label-collision",
  "edge-overlap",
];

export function failures(defects: Defect[]): Defect[] {
  return defects.filter((x) => ENGINE_OWNED.includes(x.code));
}
