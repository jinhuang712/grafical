// Edges between neighbours in one row run straight sideways (D11, D25): from one
// node's side to the other's, at the row's middle. Which edges do, and where on the
// side, depends only on the facts and the measured labels, so that placement can
// leave room for the labels before anything is routed.
//
// A pair of neighbours holds as many unlabelled lines as fit on the smaller side.
// With a label, it holds at most two lines: the label of the upper one sits above
// it, the label of the lower one below it, both inside the row. The others go
// round through the gutter below the row.

import { DEFAULT_SIZE, type Diagram } from "../model/types.ts";
import { ROUTE } from "../theme/geometry.ts";
import { nodeBox } from "../theme/shapes.ts";
import { rowHeights } from "./size.ts";

export interface SideSlot {
  /** y of the line, from the middle of the row. */
  offset: number;
  label: "above" | "below" | undefined;
  /** The ids of the two neighbours, left first. */
  left: string;
  right: string;
}

/** Least distance between two lines on one side, and between a line and a corner. */
const PITCH = ROUTE.portPitch;
const TIGHT = 8;

/** The pitch for this many lines on a side this high, or undefined if they do not fit. */
export function sidePitch(count: number, h: number): number | undefined {
  const room = h - 2 * ROUTE.portMin;
  if ((count - 1) * PITCH <= room) return PITCH;
  if ((count - 1) * TIGHT <= room) return TIGHT;
  return undefined;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The sideways edges and their lines. `labelW` gives the one-line width of an
 * edge's label, or undefined for none; `labelH` the height of a label line.
 */
export function planSideways(
  d: Diagram,
  labelW: (id: string) => number | undefined,
  labelH: number,
): Map<string, SideSlot> {
  const at = new Map<string, { layer: number; order: number; h: number }>();
  // compute() has sized every node (size.ts); a box takes its row's height.
  const heights = rowHeights(d);
  d.layers.forEach((l, layer) => {
    l.nodes.forEach((n, order) => {
      if (!at.has(n.id))
        at.set(n.id, {
          layer,
          order,
          h: heights.get(n.id) ?? nodeBox(n.kind, n.size ?? DEFAULT_SIZE).h,
        });
    });
  });
  const pairs = new Map<string, { left: string; right: string; h: number; ids: string[] }>();
  for (const e of [...d.edges].sort((a, b) => cmp(a.id, b.id))) {
    const u = at.get(e.from);
    const v = at.get(e.to);
    if (u === undefined || v === undefined || e.from === e.to || u.layer !== v.layer) continue;
    if (Math.abs(u.order - v.order) !== 1) continue;
    const [left, right] = u.order < v.order ? [e.from, e.to] : [e.to, e.from];
    const key = `${left}\u0000${right}`;
    const p = pairs.get(key) ?? { left, right, h: Math.min(u.h, v.h), ids: [] };
    p.ids.push(e.id);
    pairs.set(key, p);
  }
  const out = new Map<string, SideSlot>();
  for (const key of [...pairs.keys()].sort(cmp)) {
    const p = pairs.get(key);
    if (p === undefined) continue;
    const labelled = p.ids.filter((id) => (labelW(id) ?? 0) > 0);
    const fits = labelled.filter((id) => (labelW(id) ?? 0) <= ROUTE.sideLabelMax);
    const plain = p.ids.filter((id) => !labelled.includes(id));
    let lines: { id: string; label: SideSlot["label"] }[];
    if (labelled.length === 0) {
      let count = plain.length;
      while (count > 0 && sidePitch(count, p.h) === undefined) count--;
      lines = plain.slice(0, count).map((id) => ({ id, label: undefined }));
    } else if (fits.length === 0) {
      lines = plain.slice(0, 1).map((id) => ({ id, label: undefined }));
    } else {
      const first = fits[0] as string;
      const second = fits[1] ?? plain[0];
      // Two lines are 16 px apart; each label must stay inside the row.
      const two = p.h / 2 >= PITCH / 2 + ROUTE.labelGap + labelH;
      lines = [{ id: first, label: "above" }];
      if (second !== undefined && two) {
        lines.push({ id: second, label: fits.includes(second) ? "below" : undefined });
      }
    }
    const pitch = sidePitch(lines.length, p.h) ?? TIGHT;
    lines.forEach((line, i) => {
      out.set(line.id, {
        offset: Math.round(((i - (lines.length - 1) / 2) * pitch) / 4) * 4,
        label: line.label,
        left: p.left,
        right: p.right,
      });
    });
  }
  return out;
}
