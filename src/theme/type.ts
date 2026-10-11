// The type ramp: one style per text role. Shared by the layout and the renderer.

import type { TextRole } from "../scene.ts";
import type { TextStyle } from "../text/types.ts";

export const TYPE_RAMP: Record<TextRole, TextStyle> = {
  title: { size: 18, weight: 600 },
  "layer-label": { size: 12, weight: 600 },
  "node-label": { size: 13, weight: 600 },
  "node-sublabel": { size: 11, weight: 400 },
  "edge-label": { size: 11, weight: 400 },
};
