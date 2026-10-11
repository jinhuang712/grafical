// Box sizes (DESIGN.md D27). A node with no size takes a medium box, or a large
// one when its text does not fit the medium box. A diagram whose sizing is fixed
// gives every such node a medium box, as before D27. The fit test is the checker's
// overflow rule (D14), so a node the engine sizes overflows only when its text
// does not fit the large box either.

import type { Diagram, DiagramNode, SizeStep } from "../model/types.ts";
import type { Measurer } from "../text/types.ts";
import { BOX, FRAME } from "../theme/geometry.ts";
import { type TypeRamp, themeOf } from "../theme/themes.ts";
import { TYPE_RAMP } from "../theme/type.ts";
import { lineHeight } from "./text.ts";

/** Does the node's text fit a box of this step, by the checker's rule? */
export function fits(
  node: DiagramNode,
  step: SizeStep,
  m: Measurer,
  T: TypeRamp = TYPE_RAMP,
): boolean {
  const box = BOX[step];
  const room = box.w - 2 * FRAME.textPad;
  const label = m.wrap(node.label, T["node-label"], room);
  const sub =
    node.sublabel === undefined || node.sublabel === ""
      ? []
      : m.wrap(node.sublabel, T["node-sublabel"], room);
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
