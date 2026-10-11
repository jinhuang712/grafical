// A deterministic approximation of text measurement, for tests that do not
// need real fonts. Latin characters are 0.58 em wide, Chinese characters 1 em.

import type { Line, Measurer, TextMetrics, TextStyle } from "./types.ts";

const WIDE = /[⺀-鿿豈-﫿＀-￯]/u;

function charWidth(ch: string, style: TextStyle): number {
  return WIDE.test(ch) ? style.size : style.size * 0.58;
}

function line(text: string, style: TextStyle): Line {
  let width = 0;
  for (const ch of text) width += charWidth(ch, style);
  const face = style.weight === 600 ? "inter-600" : "inter-400";
  return { runs: text ? [{ text, face, dx: 0, width }] : [], width };
}

export function createStubMeasurer(): Measurer {
  return {
    measure: line,
    wrap(text, style, maxWidth) {
      const words = text.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (current && line(next, style).width > maxWidth) {
          lines.push(current);
          current = word;
        } else {
          current = next;
        }
      }
      if (current) lines.push(current);
      return lines.map((l) => line(l, style));
    },
    metrics(style): TextMetrics {
      return { ascent: style.size * 0.8, descent: style.size * 0.2, lineHeight: style.size * 1.3 };
    },
    missingGlyphs() {
      return [];
    },
  };
}
