// Box sizes (DESIGN.md D27). A node with no size takes a medium box, or a large
// one when its text does not fit the medium box. A diagram whose sizing is fixed
// gives every such node a medium box, as before D27. The fit test is the checker's
// overflow rule (D14), so a node the engine sizes overflows only when its text
// does not fit the large box either.

import { isEmoji } from "../model/schema.ts";
import {
  type Diagram,
  type DiagramNode,
  MARK_SLOTS,
  type Mark,
  markText,
  type NodeKind,
  type SizeStep,
} from "../model/types.ts";
import type { Rect, SceneMark } from "../scene.ts";
import type { Line, Measurer } from "../text/types.ts";
import { FRAME, MARK, markTextSize } from "../theme/geometry.ts";
import { isDot, lineRoom, nodeBox } from "../theme/shapes.ts";
import { type TypeRamp, themeOf } from "../theme/themes.ts";
import { TYPE_RAMP } from "../theme/type.ts";
import { lineHeight } from "./text.ts";

/**
 * How wide a mark is (D40). A picture is a square. A text sits on a badge that is as
 * wide as the text and its padding, and at least a square, so that `NEW` fits.
 */
export function markWidth(mark: Mark, m: Measurer): number {
  const text = markText(mark);
  if (text === undefined || isEmoji(text)) return MARK.size;
  const w = m.measure(text, { size: markTextSize(text), weight: 600 }).width;
  return Math.max(MARK.size, Math.ceil(w + 2 * MARK.padX));
}

/** The width a node's text gives up for its left mark (D40). A diamond and a dot have no left slot. */
export function leftInset(node: DiagramNode, m: Measurer): number {
  const mark = node.icons?.left;
  if (mark === undefined || node.kind === "decision" || isDot(node.kind)) return 0;
  return markWidth(mark, m) + MARK.leftGap;
}

/**
 * Where a node's marks go (D40). A corner mark is a square that sticks out of its
 * corner by MARK.overhang. The left mark is inside the box, centred in its column.
 * A diamond and a dot have corner marks only.
 */
export function markRects(node: DiagramNode, r: Rect, m: Measurer): SceneMark[] {
  const out: SceneMark[] = [];
  const { size, overhang } = MARK;
  for (const slot of MARK_SLOTS) {
    const mark = node.icons?.[slot];
    if (mark === undefined) continue;
    const w = markWidth(mark, m);
    let rect: Rect;
    if (slot === "left") {
      if (leftInset(node, m) === 0) continue;
      rect = { x: r.x + FRAME.textPad, y: r.y + (r.h - size) / 2, w, h: size };
    } else {
      // A corner mark grows away from its corner, so it stays over the same corner.
      const x = slot.endsWith("left") ? r.x - overhang : r.x + r.w - w + overhang;
      const y = slot.startsWith("top") ? r.y - overhang : r.y + r.h - size + overhang;
      rect = { x, y, w, h: size };
    }
    out.push({ slot, rect, mark });
  }
  return out;
}

/** A node's label and sublabel, wrapped to the room its shape gives its text (D34). */
export function nodeLines(
  kind: NodeKind,
  w: number,
  h: number,
  label: string,
  sublabel: string | undefined,
  m: Measurer,
  T: TypeRamp,
  /** Width the text gives up on the left, for a left mark (D40). */
  inset = 0,
): { label: Line[]; sub: Line[]; room: number } {
  const wrap = (room: number) => ({
    label: m.wrap(label, T["node-label"], room),
    sub:
      sublabel === undefined || sublabel === "" ? [] : m.wrap(sublabel, T["node-sublabel"], room),
    room,
  });
  if (kind !== "decision") return wrap(lineRoom(kind, w, h, 0) - inset);
  // A diamond's lines narrow as its text block grows, so wrap again until the block
  // the lines were wrapped for holds them.
  const lh = lineHeight("node-label", m, T);
  const subLh = lineHeight("node-sublabel", m, T);
  let blockH = lh;
  let out = wrap(lineRoom(kind, w, h, blockH));
  for (let k = 0; k < 4; k++) {
    const need = out.label.length * lh + out.sub.length * subLh;
    if (need <= blockH) break;
    blockH = need;
    out = wrap(lineRoom(kind, w, h, blockH));
  }
  return out;
}

/** Does the node's text fit a box of this step, by the checker's rule? */
export function fits(
  node: DiagramNode,
  step: SizeStep,
  m: Measurer,
  T: TypeRamp = TYPE_RAMP,
): boolean {
  // A dot draws no text, so any label fits it.
  if (isDot(node.kind)) return true;
  const box = nodeBox(node.kind, step);
  const { label, sub, room } = nodeLines(
    node.kind,
    box.w,
    box.h,
    node.label,
    node.sublabel,
    m,
    T,
    leftInset(node, m),
  );
  if (label.length > FRAME.labelLines || sub.length > FRAME.sublabelLines) return false;
  if ([...label, ...sub].some((l) => l.width > room + 1e-6)) return false;
  const block =
    label.length * lineHeight("node-label", m, T) + sub.length * lineHeight("node-sublabel", m, T);
  return block <= box.h - 2 * FRAME.textPadY + 1e-6;
}

interface Sized {
  label: string;
  sublabel: string | undefined;
  inset: number;
  step: SizeStep;
}

// The answer depends only on the node's text, the measurer and the type sizes, so
// it is kept per node object while those are unchanged: slot choice lays out many trials.
const cache = new WeakMap<Measurer, WeakMap<DiagramNode, Sized & { ramp: TypeRamp }>>();

function autoSize(node: DiagramNode, m: Measurer, T: TypeRamp): SizeStep {
  let byNode = cache.get(m);
  if (byNode === undefined) {
    byNode = new WeakMap();
    cache.set(m, byNode);
  }
  const hit = byNode.get(node);
  if (
    hit !== undefined &&
    hit.ramp === T &&
    hit.label === node.label &&
    hit.sublabel === node.sublabel &&
    hit.inset === leftInset(node, m)
  ) {
    return hit.step;
  }
  const step: SizeStep = fits(node, "m", m, T) ? "m" : "l";
  byNode.set(node, {
    label: node.label,
    sublabel: node.sublabel,
    inset: leftInset(node, m),
    step,
    ramp: T,
  });
  return step;
}

/** The step a node is drawn at. */
export function sizeOf(node: DiagramNode, d: Diagram, m: Measurer): SizeStep {
  if (node.size !== undefined) return node.size;
  if (d.sizing === "fixed") return "m";
  return autoSize(node, m, themeOf(d).type);
}

/**
 * Each node's box height in its row: every box of a row takes the height of the row's
 * tallest box, so that their tops line up. Dots and diamonds keep their own shapes.
 * The nodes must be sized (withSizes).
 */
export function rowHeights(d: Diagram): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of d.layers) {
    const boxes = l.nodes.filter((n) => !isDot(n.kind) && n.kind !== "decision");
    const tallest = Math.max(0, ...boxes.map((n) => nodeBox(n.kind, n.size ?? "m").h));
    for (const n of l.nodes) {
      if (out.has(n.id)) continue;
      out.set(n.id, boxes.includes(n) ? tallest : nodeBox(n.kind, n.size ?? "m").h);
    }
  }
  return out;
}

/** The diagram with every node's step filled in, for layout. The input is not changed. */
export function withSizes(d: Diagram, m: Measurer): Diagram {
  return {
    ...d,
    layers: d.layers.map((l) => ({
      ...l,
      nodes: l.nodes.map((n) => (n.size !== undefined ? n : { ...n, size: sizeOf(n, d, m) })),
    })),
  };
}
