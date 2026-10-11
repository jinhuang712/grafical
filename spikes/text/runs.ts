import * as fontkit from "fontkit";
import { fontBytes, fontPath, type Weight } from "./fonts.ts";

export type FontKey = "latin" | "hanzi";

/** A run of code points that one font file draws. */
export interface Run {
  font: FontKey;
  weight: Weight;
  text: string;
}

/**
 * How a label is split into fonts.
 * - "runs": grafical decides. Inter wherever Inter has the glyph, Noto Sans SC for the rest, and
 *   each run is its own `<text>` element with a single font family. This is the design to use.
 * - "stack": one `<text>` with the family stack "Inter, 'Noto Sans SC'", left to resvg. Measured
 *   behavior of resvg-js 2.6.2: if Inter lacks any character of the label, resvg draws the whole
 *   label in the first loaded face that has every character, which is Noto Sans SC Regular, at
 *   weight 400 whatever font-weight says. This policy models that, to show it is a trap.
 */
export type Policy = "runs" | "stack";

const cmap = new Map<string, fontkit.Font>();
function has(key: FontKey, weight: Weight, cp: number): boolean {
  const id = `${key}${weight}`;
  let font = cmap.get(id);
  if (!font) {
    font = fontkit.create(Buffer.from(fontBytes(fontPath[key][weight]))) as fontkit.Font;
    cmap.set(id, font);
  }
  return font.hasGlyphForCodePoint(cp);
}

export function splitRuns(text: string, weight: Weight, policy: Policy): Run[] {
  const cps = [...text].map((ch) => ch.codePointAt(0) as number);
  if (policy === "stack") {
    const allLatin = cps.every((cp) => has("latin", weight, cp));
    return allLatin ? [{ font: "latin", weight, text }] : [{ font: "hanzi", weight: 400, text }];
  }
  const runs: Run[] = [];
  for (const ch of text) {
    const font: FontKey = has("latin", weight, ch.codePointAt(0) as number) ? "latin" : "hanzi";
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += ch;
    else runs.push({ font, weight, text: ch });
  }
  return runs;
}
