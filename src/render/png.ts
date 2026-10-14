// SVG to PNG with resvg. Only the bundled fonts are loaded (DESIGN.md, "Our own SVG writer", "Output and determinism").
// Node only, because it reads the font files (DESIGN.md, "TypeScript on Node").

import { Resvg } from "@resvg/resvg-js";
import { FONT_FILES } from "../text/fonts.ts";

const fontFiles = Object.values(FONT_FILES);

export function renderPng(svg: string, scale: number): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    font: {
      loadSystemFonts: false,
      fontFiles,
      defaultFontFamily: "Inter",
    },
  });
  return new Uint8Array(resvg.render().asPng());
}
