import * as fontkit from "fontkit";
import * as hb from "harfbuzzjs";
import { fontBytes, fontPath, type Weight } from "./fonts.ts";
import { type Policy, splitRuns } from "./runs.ts";

/** What a measurer reports for one label, in px at the given size. */
export interface Measure {
  /** Sum of the glyph advances, including kerning. This is the layout width. */
  advance: number;
  /** Left edge of the glyph outlines, relative to the pen start. */
  inkLeft: number;
  /** Right edge of the glyph outlines, relative to the pen start. */
  inkRight: number;
}

export interface Measurer {
  name: string;
  measure(text: string, size: number, weight: Weight, policy: Policy): Measure;
}

interface Placed {
  advance: number;
  inkLeft: number;
  inkRight: number;
  hasInk: boolean;
}

function combine(parts: Placed[]): Measure {
  let pen = 0;
  let inkLeft = Number.POSITIVE_INFINITY;
  let inkRight = Number.NEGATIVE_INFINITY;
  for (const p of parts) {
    if (p.hasInk) {
      inkLeft = Math.min(inkLeft, pen + p.inkLeft);
      inkRight = Math.max(inkRight, pen + p.inkRight);
    }
    pen += p.advance;
  }
  return { advance: pen, inkLeft, inkRight };
}

// ---------------------------------------------------------------- harfbuzzjs

type HbFonts = Record<"latin" | "hanzi", Record<Weight, { font: hb.Font; upem: number }>>;

function loadHb(): HbFonts {
  const load = (path: string) => {
    const face = new hb.Face(new hb.Blob(fontBytes(path)));
    return { font: new hb.Font(face), upem: face.upem };
  };
  return {
    latin: { 400: load(fontPath.latin[400]), 600: load(fontPath.latin[600]) },
    hanzi: { 400: load(fontPath.hanzi[400]), 600: load(fontPath.hanzi[600]) },
  };
}

export function harfbuzzMeasurer(): Measurer {
  const fonts = loadHb();
  const buf = new hb.Buffer(); // reused: harfbuzzjs 1.6.3 has no destroy(), so a new Buffer per call leaks
  return {
    name: "harfbuzzjs",
    measure(text, size, weight, policy) {
      const runs = splitRuns(text, weight, policy);
      const parts: Placed[] = [];
      for (const run of runs) {
        const { font, upem } = fonts[run.font][run.weight];
        const k = size / upem;
        buf.reset();
        buf.addText(run.text);
        buf.guessSegmentProperties();
        hb.shape(font, buf);
        const infos = buf.getGlyphInfos();
        const pos = buf.getGlyphPositions();
        let pen = 0;
        let inkLeft = Number.POSITIVE_INFINITY;
        let inkRight = Number.NEGATIVE_INFINITY;
        infos.forEach((info, i) => {
          const p = pos[i];
          if (!p) return;
          const ext = font.glyphExtents(info.codepoint);
          if (ext && ext.width !== 0) {
            const x = pen + p.xOffset + ext.xBearing;
            inkLeft = Math.min(inkLeft, x);
            inkRight = Math.max(inkRight, x + ext.width);
          }
          pen += p.xAdvance;
        });
        const hasInk = Number.isFinite(inkLeft);
        parts.push({
          advance: pen * k,
          inkLeft: hasInk ? inkLeft * k : 0,
          inkRight: hasInk ? inkRight * k : 0,
          hasInk,
        });
      }
      return combine(parts);
    },
  };
}

// ------------------------------------------------------------------- fontkit

type KitFonts = Record<"latin" | "hanzi", Record<Weight, fontkit.Font>>;

function loadKit(): KitFonts {
  const load = (path: string) => fontkit.create(Buffer.from(fontBytes(path))) as fontkit.Font;
  return {
    latin: { 400: load(fontPath.latin[400]), 600: load(fontPath.latin[600]) },
    hanzi: { 400: load(fontPath.hanzi[400]), 600: load(fontPath.hanzi[600]) },
  };
}

export function fontkitMeasurer(): Measurer {
  const fonts = loadKit();
  return {
    name: "fontkit",
    measure(text, size, weight, policy) {
      const runs = splitRuns(text, weight, policy);
      const parts: Placed[] = [];
      for (const run of runs) {
        const font = fonts[run.font][run.weight];
        const k = size / font.unitsPerEm;
        const layout = font.layout(run.text);
        let pen = 0;
        let inkLeft = Number.POSITIVE_INFINITY;
        let inkRight = Number.NEGATIVE_INFINITY;
        layout.glyphs.forEach((glyph, i) => {
          const p = layout.positions[i];
          if (!p) return;
          const box = glyph.bbox;
          if (box.maxX - box.minX !== 0) {
            const x = pen + p.xOffset;
            inkLeft = Math.min(inkLeft, x + box.minX);
            inkRight = Math.max(inkRight, x + box.maxX);
          }
          pen += p.xAdvance;
        });
        const hasInk = Number.isFinite(inkLeft);
        parts.push({
          advance: pen * k,
          inkLeft: hasInk ? inkLeft * k : 0,
          inkRight: hasInk ? inkRight * k : 0,
          hasInk,
        });
      }
      return combine(parts);
    },
  };
}
