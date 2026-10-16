// What the fuzz asserts: the defects the engine owns (DESIGN.md, "Defects owned by who can fix them"). Overflow
// and a missing glyph are the agent's to fix, with a shorter label or other text.
// A line through text and a node inside a group it does not belong to are the
// engine's too (DESIGN.md, "A target picture with measured rules" rule 8, DESIGN.md, "Rows unseen, groups as systems"); until the checker on this branch finds them,
// the layout's own geometry checks count them.

import type { Defect, DefectCode } from "../../src/errors.ts";
import type { Scene } from "../../src/scene.ts";
import { groupIntruders, textCrossings } from "../layout/checks.ts";

export const ENGINE_OWNED: readonly DefectCode[] = [
  "node-overlap",
  "edge-through-node",
  "label-collision",
  "step-collision",
  "edge-overlap",
  "text-crossing",
  "group-intruder",
  "lane-stray",
];

export function failures(defects: Defect[]): Defect[] {
  return defects.filter((x) => ENGINE_OWNED.includes(x.code));
}

/** Text crossings and group intruders, from the layout's own checks, as defects. */
export function geometryFailures(s: Scene): Defect[] {
  const as = (code: DefectCode, found: string): Defect => ({
    code,
    owner: "engine",
    elements: [],
    found,
    facts: {},
  });
  return [
    ...textCrossings(s).map((x) => as("text-crossing", x)),
    ...groupIntruders(s).map((x) => as("group-intruder", x)),
  ];
}
