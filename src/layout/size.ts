// Box sizes (DESIGN.md D27). A node with no size takes a medium box, or a large
// one when its text does not fit the medium box. A diagram whose sizing is fixed
// gives every such node a medium box, as before D27. The fit test is the checker's
// overflow rule (D14), so a node the engine sizes overflows only when its text
// does not fit the large box either.

import type { Diagram, DiagramNode, NodeKind, SizeStep } from "../model/types.ts";
import type { Line, Measurer } from "../text/types.ts";
import { FRAME } from "../theme/geometry.ts";
import { lineRoom, nodeBox } from "../theme/shapes.ts";
import { type TypeRamp, themeOf } from "../theme/themes.ts";
import { TYPE_RAMP } from "../theme/type.ts";
import { lineHeight } from "./text.ts";

/** A node's label and sublabel, wrapped to the room its shape gives its text (D34). */
export function nodeLines(
  kind: NodeKind,
  w: number,
  h: number,
  label: string,
  sublabel: string | undefined,
  m: Measurer,
  T: TypeRamp,
): { label: Line[]; sub: Line[]; room: number } {
  const wrap = (room: number) => ({
    label: m.wrap(label, T["node-label"], room),
    sub:
      sublabel === undefined || sublabel === "" ? [] : m.wrap(sublabel, T["node-sublabel"], room),
    room,
  });
  if (kind !== "decision") return wrap(lineRoom(kind, w, h, 0));
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
  const box = nodeBox(node.kind, step);
  const { label, sub, room } = nodeLines(node.kind, box.w, box.h, node.label, node.sublabel, m, T);
  if (label.length > FRAME.labelLines || sub.length > FRAME.sublabelLines) return false;
  if ([...label, ...sub].some((l) => l.width > room + 1e-6)) return false;
  const block =
    label.length * lineHeight("node-label", m, T) + sub.length * lineHeight("node-sublabel", m, T);
  return block <= box.h - 2 * FRAME.textPadY + 1e-6;
}

interface Sized {
  label: string;
  sublabel: string | undefined;
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
    hit.sublabel === node.sublabel
  ) {
    return hit.step;
  }
  const step: SizeStep = fits(node, "m", m, T) ? "m" : "l";
  byNode.set(node, { label: node.label, sublabel: node.sublabel, step, ramp: T });
  return step;
}

/** The step a node is drawn at. */
export function sizeOf(node: DiagramNode, d: Diagram, m: Measurer): SizeStep {
  if (node.size !== undefined) return node.size;
  if (d.sizing === "fixed") return "m";
  return autoSize(node, m, themeOf(d).type);
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
