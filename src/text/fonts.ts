// The bundled font files (DESIGN.md D12). The renderer loads the same files
// into resvg, so measurement and drawing use identical fonts.
// This is the loader side: it is the only place that touches the file system.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FontFace } from "./types.ts";

const file = (name: string): string =>
  fileURLToPath(new URL(`../../fonts/${name}`, import.meta.url));

/** Absolute paths of the four bundled font files. */
export const FONT_FILES: Record<FontFace, string> = {
  "inter-400": file("Inter-Regular.ttf"),
  "inter-600": file("Inter-SemiBold.ttf"),
  "noto-400": file("NotoSansSC-Regular.ttf"),
  "noto-600": file("NotoSansSC-SemiBold.ttf"),
};

/** The family name and weight each face carries in the SVG and in resvg. */
export const FONT_FAMILY: Record<FontFace, { family: string; weight: 400 | 600 }> = {
  "inter-400": { family: "Inter", weight: 400 },
  "inter-600": { family: "Inter", weight: 600 },
  "noto-400": { family: "Noto Sans SC", weight: 400 },
  "noto-600": { family: "Noto Sans SC", weight: 600 },
};

/** Reads the four font files. */
export function loadFontBytes(): Record<FontFace, Uint8Array> {
  const out = {} as Record<FontFace, Uint8Array>;
  for (const face of Object.keys(FONT_FILES) as FontFace[]) {
    out[face] = new Uint8Array(readFileSync(FONT_FILES[face]));
  }
  return out;
}
