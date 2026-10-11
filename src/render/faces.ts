// How a font face is named in the SVG (DESIGN.md D13). One family per
// `<text>`, never a font stack: resvg would not choose per character.

import type { FontFace } from "../text/types.ts";

export const FACE_FONT: Record<FontFace, { family: string; weight: 400 | 600 }> = {
  "inter-400": { family: "Inter", weight: 400 },
  "inter-600": { family: "Inter", weight: 600 },
  "noto-400": { family: "Noto Sans SC", weight: 400 },
  "noto-600": { family: "Noto Sans SC", weight: 600 },
};
