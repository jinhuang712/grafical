// Defect checker entry point (DESIGN.md D14). The stub finds nothing. The real
// checker replaces it.

import type { Defect } from "../errors.ts";
import type { Diagram } from "../model/types.ts";
import type { Scene } from "../scene.ts";
import type { Measurer } from "../text/types.ts";

export function check(_diagram: Diagram, _scene: Scene, _m: Measurer): Defect[] {
  return [];
}
