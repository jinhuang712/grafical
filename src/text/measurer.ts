// The real measurer (DESIGN.md, "Bundled fonts"): harfbuzzjs shapes the bundled fonts.
// It takes font bytes, so it has no file system dependency. See fonts.ts.

import * as hb from "harfbuzzjs";
import { breakPoints, isSpace } from "./breaks.ts";
import type { FontFace, Line, Measurer, Run, TextMetrics, TextStyle } from "./types.ts";

interface Loaded {
  font: hb.Font;
  upem: number;
}

const FACES: FontFace[] = ["inter-400", "inter-600", "noto-400", "noto-600"];
const CACHE_LIMIT = 20000;

export function createHarfbuzzMeasurer(bytes: Record<FontFace, Uint8Array>): Measurer {
  const fonts = {} as Record<FontFace, Loaded>;
  for (const id of FACES) {
    const face = new hb.Face(new hb.Blob(bytes[id]));
    fonts[id] = { font: new hb.Font(face), upem: face.upem };
  }
  // harfbuzzjs 1.6.3 has no destroy(): a new Buffer per call leaks (phase 0
  // text spike). One buffer is reset and reused for every shaping call.
  const buf = new hb.Buffer();

  /** Shapes text with one face. Returns the advance in font units. */
  function shape(id: FontFace, text: string): number {
    buf.reset();
    buf.addText(text);
    buf.guessSegmentProperties();
    hb.shape(fonts[id].font, buf);
    let pen = 0;
    for (const p of buf.getGlyphPositions()) pen += p.xAdvance;
    return pen;
  }

  // Coverage per code point: does the font have a glyph (id 0 is notdef)?
  const coverage = new Map<string, { inter: boolean; noto: boolean }>();
  function covers(ch: string): { inter: boolean; noto: boolean } {
    let c = coverage.get(ch);
    if (!c) {
      const has = (id: FontFace): boolean => {
        buf.reset();
        buf.addText(ch);
        buf.guessSegmentProperties();
        hb.shape(fonts[id].font, buf);
        const infos = buf.getGlyphInfos();
        // Default-ignorable characters shape to nothing: not missing.
        return infos.length === 0 || infos.every((i) => i.codepoint !== 0);
      };
      c = { inter: has("inter-400"), noto: has("noto-400") };
      coverage.set(ch, c);
    }
    return c;
  }

  function faceFor(ch: string, weight: 400 | 600): FontFace {
    return covers(ch).inter ? (`inter-${weight}` as FontFace) : (`noto-${weight}` as FontFace);
  }

  function build(text: string, style: TextStyle): Line {
    const runs: Run[] = [];
    let pen = 0;
    let curFace: FontFace | undefined;
    let curText = "";
    const flush = () => {
      if (curFace === undefined) return;
      const width = (shape(curFace, curText) * style.size) / fonts[curFace].upem;
      runs.push({ text: curText, face: curFace, dx: pen, width });
      pen += width;
    };
    for (const ch of text) {
      const face = faceFor(ch, style.weight);
      if (face !== curFace) {
        flush();
        curFace = face;
        curText = "";
      }
      curText += ch;
    }
    flush();
    return { runs, width: pen };
  }

  const cache = new Map<string, Line>();
  function measure(text: string, style: TextStyle): Line {
    const key = `${style.weight}|${style.size}|${text}`;
    let line = cache.get(key);
    if (!line) {
      line = build(text, style);
      if (cache.size >= CACHE_LIMIT) cache.clear();
      cache.set(key, line);
    }
    return { runs: line.runs.map((r) => ({ ...r })), width: line.width };
  }

  const metricsCache = new Map<string, TextMetrics>();
  function metrics(style: TextStyle): TextMetrics {
    const key = `${style.weight}|${style.size}`;
    let m = metricsCache.get(key);
    if (!m) {
      let asc = 0;
      let desc = 0;
      for (const id of [`inter-${style.weight}`, `noto-${style.weight}`] as FontFace[]) {
        const { font, upem } = fonts[id];
        const e = font.hExtents();
        asc = Math.max(asc, (e.ascender * style.size) / upem);
        desc = Math.max(desc, (-e.descender * style.size) / upem);
      }
      // Round up to a multiple of 4 px. Tiny sizes keep the natural height.
      const natural = asc + desc;
      const lineHeight = style.size >= 4 ? Math.ceil(natural / 4 - 1e-9) * 4 : natural;
      m = { ascent: asc, descent: desc, lineHeight };
      metricsCache.set(key, m);
    }
    return { ...m };
  }

  function wrapParagraph(text: string, style: TextStyle, maxWidth: number): Line[] {
    const chars = [...text];
    if (chars.every(isSpace)) return [];
    const cuts = [0, ...breakPoints(chars), chars.length];
    const lines: Line[] = [];
    const slice = (a: number, b: number): string => {
      let end = b;
      while (end > a && isSpace(chars[end - 1] as string)) end--;
      return chars.slice(a, end).join("");
    };
    let start = 0; // index into cuts
    let best = 0; // cut index of the longest fitting line end
    for (let k = 1; k < cuts.length; k++) {
      const a = cuts[start] as number;
      const b = cuts[k] as number;
      const fits = measure(slice(a, b), style).width <= maxWidth;
      if (fits) {
        best = k;
        continue;
      }
      if (best <= start) best = k; // unbreakable piece: keep whole
      lines.push(measure(slice(a, cuts[best] as number), style));
      start = best;
      k = best; // the loop increments to best + 1
      best = start;
    }
    if (start < cuts.length - 1) {
      lines.push(measure(slice(cuts[start] as number, chars.length), style));
    }
    return lines;
  }

  function wrap(text: string, style: TextStyle, maxWidth: number): Line[] {
    if (text === "") return [];
    const out: Line[] = [];
    for (const para of text.split("\n")) out.push(...wrapParagraph(para, style, maxWidth));
    return out;
  }

  function missingGlyphs(text: string): string[] {
    const seen = new Set<string>();
    for (const ch of text) {
      const c = covers(ch);
      if (!c.inter && !c.noto) seen.add(ch);
    }
    return [...seen];
  }

  return { measure, wrap, metrics, missingGlyphs };
}
