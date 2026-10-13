// Marks in the SVG (DESIGN.md D40). Pure: no Node APIs. An emoji or a file is
// drawn as an image that the SVG holds as a data URI, so the output never links to
// a file (D15). The command line reads the files and gives their bytes in here
// before it renders, the way it gives in stylesheets (D30).

import { isEmoji } from "../model/schema.ts";
import type { Mark } from "../model/types.ts";
import type { Rect, SceneMark } from "../scene.ts";
import { FONT_FAMILY } from "../text/faces.ts";
import { markTextSize } from "../theme/geometry.ts";
import { escapeXml, num } from "./svg.ts";

export { isEmoji };

export interface MarkImage {
  mime: "image/svg+xml" | "image/png";
  base64: string;
}

const images = new Map<string, MarkImage>();

/** What identifies the picture a mark draws: the emoji, or the file's hash. A text has none. */
export function markKey(m: Mark): string {
  if (typeof m === "string") return isEmoji(m) ? `e:${m}` : `t:${m}`;
  return "file" in m ? `f:${m.sha256}` : `t:${m.text}`;
}

export function provideMarkImage(key: string, image: MarkImage): void {
  images.set(key, image);
}

export function markImage(m: Mark): MarkImage | undefined {
  return images.get(markKey(m));
}

/** The badge of a text mark when it names no color. */
const DEFAULT_BADGE = "#1f2328";

/** White text on a dark badge, and dark text on a light one. */
function readableOn(bg: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(bg.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#1f2328" : "#ffffff";
}

/**
 * A text mark sits on a badge. Over a corner it would otherwise float, with the
 * box outline running through it.
 */
function textMark(text: string, r: Rect, bg: string): string {
  // The layout sized the badge for this text size (markWidth), so the two must agree.
  const size = markTextSize(text);
  const f = FONT_FAMILY[/[　-鿿＀-￯]/.test(text) ? "noto-600" : "inter-600"];
  return (
    `<rect x="${num(r.x)}" y="${num(r.y)}" width="${num(r.w)}" height="${num(r.h)}" rx="4" fill="${bg}"/>\n` +
    `<text x="${num(r.x + r.w / 2)}" y="${num(r.y + r.h / 2 + size * 0.36)}" text-anchor="middle" ` +
    `font-family="${f.family}" font-size="${num(size)}" font-weight="${f.weight}" fill="${readableOn(bg)}" ` +
    `xml:space="preserve">${escapeXml(text)}</text>`
  );
}

/** One mark as SVG. A mark whose picture was not given in draws nothing. */
export function markShape(m: SceneMark): string[] {
  const mark = m.mark;
  if (typeof mark === "object" && "text" in mark) return [textMark(mark.text, m.rect, mark.bg)];
  if (typeof mark === "string" && !isEmoji(mark)) {
    return [textMark(mark, m.rect, DEFAULT_BADGE)];
  }
  const img = markImage(mark);
  if (img === undefined) return [];
  return [
    `<image x="${num(m.rect.x)}" y="${num(m.rect.y)}" width="${num(m.rect.w)}" height="${num(m.rect.h)}" ` +
      `preserveAspectRatio="xMidYMid meet" href="data:${img.mime};base64,${img.base64}"/>`,
  ];
}
