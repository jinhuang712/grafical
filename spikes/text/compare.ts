import type { Weight } from "./fonts.ts";
import { labels } from "./labels.ts";
import { fontkitMeasurer, harfbuzzMeasurer, type Measurer } from "./measure.ts";
import { resvgMeasure } from "./resvg.ts";
import type { Policy } from "./runs.ts";

export const sizes = [12, 14] as const;
export const weights: Weight[] = [400, 600];

export interface Row {
  lib: string;
  policy: string;
  label: string;
  size: number;
  weight: Weight;
  libAdvance: number;
  resvgAdvance: number;
  /** Ink width difference: library minus resvg getBBox. */
  dInkWidth: number;
  dInkLeft: number;
  dInkRight: number;
  /** Ink width difference: library minus rendered pixels at 8x. */
  dPixelWidth: number;
  dAdvance: number;
}

/** `lib` is how the library splits the label, `draw` is how the SVG is drawn. */
export function compare(measurer: Measurer, lib: Policy, draw: Policy): Row[] {
  const rows: Row[] = [];
  for (const size of sizes) {
    for (const weight of weights) {
      for (const label of labels) {
        const m = measurer.measure(label, size, weight, lib);
        const r = resvgMeasure(label, size, weight, draw);
        rows.push({
          lib: measurer.name,
          policy: `measure=${lib} draw=${draw}`,
          label,
          size,
          weight,
          libAdvance: m.advance,
          resvgAdvance: r.advance,
          dAdvance: m.advance - r.advance,
          dInkWidth: m.inkRight - m.inkLeft - (r.inkRight - r.inkLeft),
          dInkLeft: m.inkLeft - r.inkLeft,
          dInkRight: m.inkRight - r.inkRight,
          dPixelWidth: m.inkRight - m.inkLeft - (r.pixelRight - r.pixelLeft),
        });
      }
    }
  }
  return rows;
}

export const measurers = (): Measurer[] => [harfbuzzMeasurer(), fontkitMeasurer()];

export function summarize(rows: Row[]) {
  const max = (f: (r: Row) => number) => Math.max(...rows.map((r) => Math.abs(f(r))));
  return {
    n: rows.length,
    maxAdvance: max((r) => r.dAdvance),
    maxInkWidth: max((r) => r.dInkWidth),
    maxInkLeft: max((r) => r.dInkLeft),
    maxInkRight: max((r) => r.dInkRight),
    maxPixelWidth: max((r) => r.dPixelWidth),
  };
}
