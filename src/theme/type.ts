// The type ramp: one style per text role. Shared by the layout and the renderer.
// The sizes match the target picture (DESIGN.md D25).

import type { TextRole } from "../scene.ts";
import type { TextStyle } from "../text/types.ts";

export const TYPE_RAMP: Record<TextRole, TextStyle> = {
  title: { size: 18, weight: 600 },
  subtitle: { size: 12, weight: 400 },
  note: { size: 11, weight: 400 },
  legend: { size: 11, weight: 400 },
  "group-label": { size: 12, weight: 600 },
  "group-sublabel": { size: 12, weight: 400 },
  "layer-label": { size: 12, weight: 600 },
  "node-label": { size: 13, weight: 600 },
  "node-sublabel": { size: 11, weight: 400 },
  "edge-label": { size: 11, weight: 400 },
};
