import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js";
import { fontFamily, fontFiles, type Weight } from "./fonts.ts";
import { type Policy, splitRuns } from "./runs.ts";

/** resvg options that load only the bundled fonts. No system fonts. */
export function resvgOptions(extra: Partial<ResvgRenderOptions> = {}): ResvgRenderOptions {
  return {
    font: { loadSystemFonts: false, fontFiles, defaultFontFamily: "Inter" },
    ...extra,
  };
}

export const escapeXml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const ORIGIN_X = 300;
const ZOOM = 8;

export const family = { latin: "Inter", hanzi: "'Noto Sans SC'" } as const;

export function textSvg(
  text: string,
  size: number,
  weight: Weight,
  families: string,
  anchor: "start" | "end",
): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="60" viewBox="0 0 600 60">` +
    `<text xml:space="preserve" x="${ORIGIN_X}" y="35" font-family="${families}" font-size="${size}" ` +
    `font-weight="${weight}" text-anchor="${anchor}">${escapeXml(text)}</text></svg>`
  );
}

export interface ResvgMeasure {
  /** Advance width: the shift of the ink when the anchor moves from start to end. */
  advance: number;
  /** Ink edges relative to the pen start, from getBBox with text-anchor start. */
  inkLeft: number;
  inkRight: number;
  /** Ink edges from the rendered pixels at 8x, relative to the pen start. */
  pixelLeft: number;
  pixelRight: number;
}

function pixelExtent(svg: string): { left: number; right: number } {
  const img = new Resvg(svg, resvgOptions({ fitTo: { mode: "zoom", value: ZOOM } })).render();
  const { width, height } = img;
  const px = img.pixels;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((px[(y * width + x) * 4 + 3] as number) >= 64) {
        if (x < left) left = x;
        if (x + 1 > right) right = x + 1;
      }
    }
  }
  return { left: left / ZOOM, right: right / ZOOM };
}

/** Measure one `<text>` element: its advance, its ink box and its ink in pixels. */
function measureText(text: string, size: number, weight: Weight, families: string): ResvgMeasure {
  const startSvg = textSvg(text, size, weight, families, "start");
  const endSvg = textSvg(text, size, weight, families, "end");
  const start = new Resvg(startSvg, resvgOptions()).getBBox();
  const end = new Resvg(endSvg, resvgOptions()).getBBox();
  if (!start || !end) throw new Error(`resvg drew nothing for "${text}"`);
  const pixels = pixelExtent(startSvg);
  return {
    advance: start.x - end.x,
    inkLeft: start.x - ORIGIN_X,
    inkRight: start.x + start.width - ORIGIN_X,
    pixelLeft: pixels.left - ORIGIN_X,
    pixelRight: pixels.right - ORIGIN_X,
  };
}

/**
 * What resvg draws for a label. "stack" is one `<text>` with the font stack. "runs" is one
 * `<text>` per run, each placed at the pen position resvg itself measured for the runs before it.
 */
export function resvgMeasure(
  text: string,
  size: number,
  weight: Weight,
  policy: Policy,
): ResvgMeasure {
  if (policy === "stack") return measureText(text, size, weight, fontFamily);
  let pen = 0;
  const out: ResvgMeasure = {
    advance: 0,
    inkLeft: Number.POSITIVE_INFINITY,
    inkRight: Number.NEGATIVE_INFINITY,
    pixelLeft: Number.POSITIVE_INFINITY,
    pixelRight: Number.NEGATIVE_INFINITY,
  };
  for (const run of splitRuns(text, weight, policy)) {
    const m = measureText(run.text, size, run.weight, family[run.font]);
    out.inkLeft = Math.min(out.inkLeft, pen + m.inkLeft);
    out.inkRight = Math.max(out.inkRight, pen + m.inkRight);
    out.pixelLeft = Math.min(out.pixelLeft, pen + m.pixelLeft);
    out.pixelRight = Math.max(out.pixelRight, pen + m.pixelRight);
    pen += m.advance;
  }
  out.advance = pen;
  return out;
}
