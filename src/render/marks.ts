// Marks in the SVG (DESIGN.md, "Marks of any kind"). Pure: no Node APIs. An emoji or a file is
// drawn as an image that the SVG holds as a data URI, so the output never links to
// a file (DESIGN.md, "Output and determinism"). The command line reads the files and gives their bytes in here
// before it renders, the way it gives in stylesheets (DESIGN.md, "Themes and stylesheets").

import { isEmoji } from "../model/schema.ts";
import {
  DEFAULT_MARK_SHAPE,
  DEFAULT_MARK_SIZE,
  type Mark,
  markStyle,
  markText,
} from "../model/types.ts";
import type { Rect, SceneMark } from "../scene.ts";
import { FONT_FAMILY } from "../text/faces.ts";
import { markRadius, markTextSize } from "../theme/geometry.ts";
import { escapeXml, num } from "./svg.ts";

/** A mark and the rect it is drawn in: on a node, or in the legend (DESIGN.md, "Marks of any kind", "A legend for widths and marks"). */
type DrawnMark = Pick<SceneMark, "mark" | "rect">;

export { isEmoji };

export interface MarkImage {
  mime: "image/svg+xml" | "image/png";
  base64: string;
}

const images = new Map<string, MarkImage>();

/** The emoji a mark shows, when its text is one. */
function emojiOf(m: Mark): string | undefined {
  const text = markText(m);
  return text !== undefined && isEmoji(text) ? text : undefined;
}

/**
 * What identifies the picture a mark draws: the emoji, or the file's hash. A text mark
 * has none, and its size, which the picture does not depend on, is not part of it.
 */
export function markKey(m: Mark): string {
  if (typeof m === "object" && "file" in m) return `f:${m.sha256}`;
  const emoji = emojiOf(m);
  return emoji !== undefined ? `e:${emoji}` : `t:${markText(m)}`;
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
 * box outline running through it. The layout sized the badge for this text size
 * (markWidth), so the two must agree.
 */
function textMark(m: DrawnMark, text: string): string {
  const style = markStyle(m.mark);
  const r: Rect = m.rect;
  const bg = style.bg ?? DEFAULT_BADGE;
  const size = markTextSize(text, style.size ?? DEFAULT_MARK_SIZE);
  const f = FONT_FAMILY[/[　-鿿＀-￯]/.test(text) ? "noto-600" : "inter-600"];
  // A border is drawn inside the badge's rect, so it never reaches past the space the layout gave.
  const border = style.border === undefined ? "" : ` stroke="${style.border}" stroke-width="1.5"`;
  const inner =
    style.border === undefined ? r : { x: r.x + 0.75, y: r.y + 0.75, w: r.w - 1.5, h: r.h - 1.5 };
  // The radius follows the rect that is drawn, so a pill's ends stay half circles.
  const rx = markRadius(style.shape ?? DEFAULT_MARK_SHAPE, inner.h);
  return (
    `<rect x="${num(inner.x)}" y="${num(inner.y)}" width="${num(inner.w)}" height="${num(inner.h)}" rx="${num(rx)}" fill="${bg}"${border}/>\n` +
    `<text x="${num(r.x + r.w / 2)}" y="${num(r.y + r.h / 2 + size * 0.36)}" text-anchor="middle" ` +
    `font-family="${f.family}" font-size="${num(size)}" font-weight="${f.weight}" fill="${style.fg ?? readableOn(bg)}" ` +
    `xml:space="preserve">${escapeXml(text)}</text>`
  );
}

/** One mark as SVG, on a node or in the legend. A mark whose picture was not given in draws nothing. */
export function markShape(m: DrawnMark): string[] {
  const text = markText(m.mark);
  if (text !== undefined && !isEmoji(text)) return [textMark(m, text)];
  const img = markImage(m.mark);
  if (img === undefined) return [];
  return [
    `<image x="${num(m.rect.x)}" y="${num(m.rect.y)}" width="${num(m.rect.w)}" height="${num(m.rect.h)}" ` +
      `preserveAspectRatio="xMidYMid meet" href="data:${img.mime};base64,${img.base64}"/>`,
  ];
}
