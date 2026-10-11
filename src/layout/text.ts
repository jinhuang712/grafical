// Placing measured text into the scene. Text never decides a box size (D6): it is
// wrapped to the room it is given, and whatever does not fit is left for the
// checker to report as overflow.

import type { PlacedText, Rect, TextRole } from "../scene.ts";
import type { Line, Measurer } from "../text/types.ts";
import { TYPE_RAMP } from "../theme/type.ts";

/** The height one line of a role takes in a stack of lines. */
export function lineHeight(role: TextRole, m: Measurer): number {
  return m.metrics(TYPE_RAMP[role]).lineHeight;
}

/** The height of the ink box of one line: ascent plus descent. */
export function lineBox(role: TextRole, m: Measurer): number {
  const mt = m.metrics(TYPE_RAMP[role]);
  return mt.ascent + mt.descent;
}

/**
 * Lines stacked from `top`, each taking one line height, and each aligned at the
 * start of `x` or centred on `x`. The bbox is the union of the lines' ink boxes.
 */
export function placeLines(
  role: TextRole,
  lines: Line[],
  x: number,
  top: number,
  align: "start" | "middle",
  m: Measurer,
): PlacedText {
  const style = TYPE_RAMP[role];
  const mt = m.metrics(style);
  const ink = mt.ascent + mt.descent;
  const lead = (mt.lineHeight - ink) / 2;
  const runs: PlacedText["runs"] = [];
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  lines.forEach((line, i) => {
    const left = align === "middle" ? x - line.width / 2 : x;
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

/** One unwrapped line whose ink box has its top left corner at (x, top). */
export function placeLine(
  role: TextRole,
  text: string,
  x: number,
  top: number,
  m: Measurer,
): PlacedText {
  const style = TYPE_RAMP[role];
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
