// Node shapes (DESIGN.md D8, D34). Every node is laid out as a box, and its kind
// decides the outline drawn inside that box: how much room its text has, where
// the text block sits, and where a line that ends at the box's side meets the
// outline. Layout, the checker and the renderer all ask here, so they agree.

import type { NodeKind, SizeStep } from "../model/types.ts";
import type { Point, Rect } from "../scene.ts";
import { BOX, DIAMOND, FRAME } from "./geometry.ts";

/** The box a node of this kind and size step is laid out in. */
export function nodeBox(kind: NodeKind, step: SizeStep): { w: number; h: number } {
  return kind === "decision" ? DIAMOND[step] : BOX[step];
}

/**
 * The widest a line of a node's text may be, for a text block `blockH` tall. In a
 * diamond, a padded block of width tw and height th fits when tw/w + th/h <= 1,
 * so a taller block leaves narrower lines.
 */
export function lineRoom(kind: NodeKind, w: number, h: number, blockH: number): number {
  if (kind === "decision") {
    return Math.max(0, w * (1 - (blockH + 2 * FRAME.textPadY) / h) - 2 * FRAME.textPad);
  }
  return w - 2 * FRAME.textPad;
}

/** Does the text box `t` lie inside the room a node of this kind has for text (D14)? */
export function textInside(kind: NodeKind, r: Rect, t: Rect): boolean {
  const e = 1e-6;
  if (kind === "decision") {
    // The corner of the box farthest from the middle, padded, stays inside the diamond.
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const dx = Math.max(Math.abs(t.x - cx), Math.abs(t.x + t.w - cx)) + FRAME.textPad;
    const dy = Math.max(Math.abs(t.y - cy), Math.abs(t.y + t.h - cy)) + FRAME.textPadY;
    return dx / (r.w / 2) + dy / (r.h / 2) <= 1 + e;
  }
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

/** Where a line along the box's side meets a diamond's slanted outline. */
function diamondMeet(r: Rect, end: Point, next: Point): Point {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  if (end.x === next.x) {
    // Down into the top, or up into the bottom: the outline is this far in at x.
    const inset = (r.h / 2) * Math.min(1, Math.abs(end.x - cx) / (r.w / 2));
    return { x: end.x, y: next.y < end.y ? r.y + inset : r.y + r.h - inset };
  }
  if (end.y === next.y) {
    const inset = (r.w / 2) * Math.min(1, Math.abs(end.y - cy) / (r.h / 2));
    return { x: next.x < end.x ? r.x + inset : r.x + r.w - inset, y: end.y };
  }
  return end;
}

/**
 * Where a line meets the drawn outline, when its route ends at `end` on the box's
 * side and its next point is `next`. A box's outline is the box; a store's
 * curved top and bottom lie a little inside it, and a diamond's sides slant in.
 */
export function meetOutline(kind: NodeKind, r: Rect, end: Point, next: Point): Point {
  if (kind === "decision") return diamondMeet(r, end, next);
  if (kind !== "store" || end.x !== next.x) return end;
  const inset = storeInset(r, end.x);
  if (inset === 0) return end;
  if (Math.abs(end.y - r.y) < 0.01 && next.y < end.y) return { x: end.x, y: end.y + inset };
  const bottom = r.y + r.h;
  if (Math.abs(end.y - bottom) < 0.01 && next.y > end.y) return { x: end.x, y: end.y - inset };
  return end;
}
