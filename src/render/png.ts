// SVG to PNG with resvg. Only the bundled fonts are loaded (DESIGNS.md, "The same file gives the same picture on any machine", specs/decisions, "Our own SVG writer").
// Node only, because it reads the font files (specs/decisions, "TypeScript on Node").

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
