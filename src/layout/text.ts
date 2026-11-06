// Placing measured text into the scene. Text never decides a box size (specs/decisions, "Facts over coordinates"): it is
// wrapped to the room it is given, and whatever does not fit is left for the
// checker to report as overflow.

import type { LabelAlign } from "../model/types.ts";
import type { PlacedText, Rect, TextRole } from "../scene.ts";
import type { Line, Measurer } from "../text/types.ts";
import type { TypeRamp } from "../theme/themes.ts";
import { TYPE_RAMP } from "../theme/type.ts";

/** The height one line of a role takes in a stack of lines. */
export function lineHeight(role: TextRole, m: Measurer, ramp: TypeRamp = TYPE_RAMP): number {
  return m.metrics(ramp[role]).lineHeight;
}

/** The height of the ink box of one line: ascent plus descent. */
export function lineBox(role: TextRole, m: Measurer, ramp: TypeRamp = TYPE_RAMP): number {
  const mt = m.metrics(ramp[role]);
  return mt.ascent + mt.descent;
}

/**
 * Lines stacked from `top`, each taking one line height, and each starting at `x`,
 * centred on it or ending at it. The bbox is the union of the lines' ink boxes.
 */
export function placeLines(
  role: TextRole,
  lines: Line[],
  x: number,
  top: number,
  /** A number is the fraction of each line that meets `x`. */
  align: "start" | "middle" | "end" | number,
  m: Measurer,
  ramp: TypeRamp = TYPE_RAMP,
): PlacedText {
  const style = ramp[role];
  const mt = m.metrics(style);
  const ink = mt.ascent + mt.descent;
  const lead = (mt.lineHeight - ink) / 2;
  const runs: PlacedText["runs"] = [];
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  lines.forEach((line, i) => {
    const share =
      typeof align === "number" ? align : align === "middle" ? 0.5 : align === "end" ? 1 : 0;
    const left = x - share * line.width;
    x0 = Math.min(x0, left);
    x1 = Math.max(x1, left + line.width);
    const baseline = top + i * mt.lineHeight + lead + mt.ascent;
    for (const r of line.runs) {
      runs.push({ text: r.text, face: r.face, size: style.size, x: left + r.dx, y: baseline });
    }
  });
  if (lines.length === 0) {
    x0 = x;
    x1 = x;
  }
  const bbox: Rect = {
    x: x0,
    y: top + lead,
    w: x1 - x0,
    h: lines.length === 0 ? 0 : (lines.length - 1) * mt.lineHeight + ink,
  };
  return { role, runs, bbox };
}

/** Where lines stated to align sit in a block from `x` that is `w` wide, by the anchor of placeLines. */
export function alignedIn(
  align: LabelAlign | undefined,
  x: number,
  w: number,
): { x: number; align: "start" | "middle" | "end" } {
  if (align === "left") return { x, align: "start" };
  if (align === "right") return { x: x + w, align: "end" };
  return { x: x + w / 2, align: "middle" };
}

/** One unwrapped line whose ink box has its top left corner at (x, top). */
export function placeLine(
  role: TextRole,
  text: string,
  x: number,
  top: number,
  m: Measurer,
  ramp: TypeRamp = TYPE_RAMP,
): PlacedText {
  const style = ramp[role];
  const mt = m.metrics(style);
  const line = m.measure(text, style);
  return {
    role,
    runs: line.runs.map((r) => ({
      text: r.text,
      face: r.face,
      size: style.size,
      x: x + r.dx,
      y: top + mt.ascent,
    })),
    bbox: { x, y: top, w: line.width, h: mt.ascent + mt.descent },
  };
}
