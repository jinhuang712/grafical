// SVG to PNG with resvg. Only the bundled fonts are loaded (DESIGN.md D13, D15).

import { Resvg } from "@resvg/resvg-js";
import { RENDER_FONT_FILES } from "./fontFiles.ts";

export function renderPng(svg: string, scale: number): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    font: {
      loadSystemFonts: false,
      fontFiles: RENDER_FONT_FILES,
      defaultFontFamily: "Inter",
    },
  });
  return new Uint8Array(resvg.render().asPng());
}
