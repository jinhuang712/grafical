// Marks in the SVG (DESIGN.md D40). Pure: no Node APIs. An emoji or a file is
// drawn as an image that the SVG holds as a data URI, so the output never links to
// a file (D15). The command line reads the files and gives their bytes in here
// before it renders, the way it gives in stylesheets (D30).

import type { Mark } from "../model/types.ts";
import type { Rect, SceneMark } from "../scene.ts";
import { FONT_FAMILY } from "../text/faces.ts";
import { escapeXml, num } from "./svg.ts";

export interface MarkImage {
  mime: "image/svg+xml" | "image/png";
  base64: string;
}

const images = new Map<string, MarkImage>();

/** Does this text hold one emoji? Anything else short is drawn as text. */
export function isEmoji(text: string): boolean {
  return /^\p{Extended_Pictographic}/u.test(text) && [...segments(text)].length === 1;
}

function* segments(text: string): Generator<string> {
  for (const s of new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)) {
    yield s.segment;
  }
}

/** What identifies the picture a mark draws: the text, or the file's hash. */
export function markKey(m: Mark): string {
  return typeof m === "string" ? (isEmoji(m) ? `e:${m}` : `t:${m}`) : `f:${m.sha256}`;
}

export function provideMarkImage(key: string, image: MarkImage): void {
  images.set(key, image);
}

export function markImage(m: Mark): MarkImage | undefined {
  return images.get(markKey(m));
}

/** The font size of a text mark: the more characters, the smaller. */
const TEXT_SIZE = [14, 14, 11, 9];

function textMark(text: string, r: Rect, fill: string): string {
  const n = [...segments(text)].length;
  const size = TEXT_SIZE[Math.min(n, TEXT_SIZE.length - 1)] as number;
  const f = FONT_FAMILY[/[　-鿿＀-￯]/.test(text) ? "noto-600" : "inter-600"];
  // White text on a dark badge: a text mark over a corner would otherwise float, with
  // the box outline running through it.
  return (
    `<rect x="${num(r.x)}" y="${num(r.y)}" width="${num(r.w)}" height="${num(r.h)}" rx="4" fill="${fill}"/>\n` +
    `<text x="${num(r.x + r.w / 2)}" y="${num(r.y + r.h / 2 + size * 0.36)}" text-anchor="middle" ` +
    `font-family="${f.family}" font-size="${num(size)}" font-weight="${f.weight}" fill="#ffffff" ` +
    `xml:space="preserve">${escapeXml(text)}</text>`
  );
}

/** One mark as SVG. A mark whose picture was not given in draws nothing. */
export function markShape(m: SceneMark, textFill: string): string[] {
  if (typeof m.mark === "string" && !isEmoji(m.mark)) return [textMark(m.mark, m.rect, textFill)];
  const img = markImage(m.mark);
  if (img === undefined) return [];
  return [
    `<image x="${num(m.rect.x)}" y="${num(m.rect.y)}" width="${num(m.rect.w)}" height="${num(m.rect.h)}" ` +
      `preserveAspectRatio="xMidYMid meet" href="data:${img.mime};base64,${img.base64}"/>`,
  ];
}
