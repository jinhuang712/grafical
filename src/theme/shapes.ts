// Node shapes (DESIGN.md D8, D34). Every node is laid out as a box, and its kind
// decides the outline drawn inside that box: how much room its text has, where
// the text block sits, and where a line that ends at the box's side meets the
// outline. Layout, the checker and the renderer all ask here, so they agree.

import type { NodeKind } from "../model/types.ts";
import type { Point, Rect } from "../scene.ts";
import { FRAME } from "./geometry.ts";

/** The widest a line of a node's text may be, for a text block `blockH` tall. */
export function lineRoom(_kind: NodeKind, w: number, _h: number, _blockH: number): number {
  return w - 2 * FRAME.textPad;
}

/** Does the text box `t` lie inside the room a node of this kind has for text (D14)? */
export function textInside(_kind: NodeKind, r: Rect, t: Rect): boolean {
  const e = 1e-6;
  return (
    t.x >= r.x + FRAME.textPad - e &&
    t.y >= r.y + FRAME.textPadY - e &&
    t.x + t.w <= r.x + r.w - FRAME.textPad + e &&
    t.y + t.h <= r.y + r.h - FRAME.textPadY + e
  );
}

/** The top of a node's text block, `blockH` tall: centred, and below a store's lid. */
export function textTop(kind: NodeKind, r: Rect, blockH: number): number {
  const slack = (r.h - blockH) / 2;
  // A store's text drops below its lid, but keeps a lid's height from the bottom.
  const drop =
    kind === "store" ? Math.max(0, Math.min(FRAME.storeLid / 2, slack - FRAME.storeLid)) : 0;
  return r.y + slack + drop;
}

/**
 * How far below the box top (or above the box bottom) a store's outline lies at
 * x: the lid and the bottom are half-ellipses, so the outline leaves the box edge
 * away from the middle. 0 for every other kind.
 */
function storeInset(r: Rect, x: number): number {
  const ry = FRAME.storeLid;
  const hw = r.w / 2;
  const d = Math.min(1, Math.abs(x - (r.x + hw)) / hw);
  return ry - ry * Math.sqrt(1 - d * d);
}

/**
 * Where a line meets the drawn outline, when its route ends at `end` on the box's
 * side and its next point is `next`. A box's outline is the box; a store's
 * curved top and bottom lie a little inside it.
 */
export function meetOutline(kind: NodeKind, r: Rect, end: Point, next: Point): Point {
  if (kind !== "store" || end.x !== next.x) return end;
  const inset = storeInset(r, end.x);
  if (inset === 0) return end;
  if (Math.abs(end.y - r.y) < 0.01 && next.y < end.y) return { x: end.x, y: end.y + inset };
  const bottom = r.y + r.h;
  if (Math.abs(end.y - bottom) < 0.01 && next.y > end.y) return { x: end.x, y: end.y - inset };
  return end;
}
