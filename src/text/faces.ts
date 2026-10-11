// How each font face is named in the SVG and in resvg (DESIGN.md D12, D13).
// One family per <text>, never a font stack. Browser-safe: no file access.

import type { FontFace } from "./types.ts";

export const FONT_FAMILY: Record<FontFace, { family: string; weight: 400 | 600 }> = {
  "inter-400": { family: "Inter", weight: 400 },
  "inter-600": { family: "Inter", weight: 600 },
  "noto-400": { family: "Noto Sans SC", weight: 400 },
  "noto-600": { family: "Noto Sans SC", weight: 600 },
};
