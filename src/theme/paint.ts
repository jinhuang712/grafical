// Paint: every colour and stroke value of a theme, by role (DESIGNS.md, "Looks are free, while shape and dash follow the type", specs/decisions, "Themes and stylesheets").
// The SVG writer reads roles from a scene's paint and never holds a hex code itself.
// The values of each theme live in its stylesheet in presets/ (themes.ts).

import type { EdgeKind, EdgeStyleName, NodeKind } from "../model/types.ts";

export interface NodePaint {
  fill: string;
  stroke: string;
  /** Dash pattern of the border, if any. */
  dash?: string;
}

export interface EdgePaint {
  stroke: string;
  /** Dash pattern of a dashed or dotted edge: async and optional edges (DESIGNS.md, "Looks are free, while shape and dash follow the type", specs/decisions, "Edges meet any side"). */
  dash?: string;
}

export interface BoxPaint {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

/** A lane: its area, its border, and its header's fill. */
export interface LanePaint extends BoxPaint {
  headFill: string;
}

export interface Paint {
  background: string;
  text: {
    title: string;
    subtitle: string;
    note: string;
    legend: string;
    groupLabel: string;
    /** The lighter part of a group label, such as "write side", and a band's label. */
    groupLabelMuted: string;
    laneLabel: string;
    nodeLabel: string;
    nodeSublabel: string;
    edgeLabel: string;
  };
  /** A system node behind its nodes (specs/decisions, "Layers unseen, groups as systems"). Layers are not drawn. */
  group: BoxPaint;
  /**
   * How a node inside a node is told apart (specs/decisions, "Every layered diagram type"). alternate: the fill and the
   * background take turns by depth. shade: each level a shade nearer the border
   * colour, which is darker on a light theme.
   */
  nesting: "alternate" | "shade";
  /** A layer an edge ends at, drawn behind its groups: lighter than a group (specs/decisions, "Edges that end at containers"). */
  band: BoxPaint;
  /** A lane, drawn behind everything else (specs/decisions, "Lanes run one way"). Lanes side by side share a border. */
  lane: LanePaint;
  node: {
    radius: number;
    /** The corner radius of a state, rounder than a node (specs/decisions, "Every layered diagram type"). */
    stateRadius: number;
    strokeWidth: number;
    kinds: Record<NodeKind, NodePaint>;
    /** The single emphasis colour: a border and a very light fill, on one or two nodes. */
    emphasis: { fill: string; stroke: string; strokeWidth: number };
  };
  edge: {
    strokeWidth: number;
    kinds: Record<EdgeKind, EdgePaint>;
    arrow: { length: number; halfWidth: number };
    /** An edge on the main path: a thicker edge and a larger arrowhead (specs/decisions, "Edges meet any side"). */
    main: { strokeWidth: number; arrow: { length: number; halfWidth: number } };
    /**
     * More weight levels (specs/decisions, "Edge weights"): a name and a width. `thin` is `strokeWidth` and `thick` is
     * `main.strokeWidth`; every other level lives here.
     */
    weights: Record<string, number>;
    /** Radius of a rounded corner in a route. */
    cornerRadius: number;
    /** The patch behind an edge label, so the label stays readable over edges. */
    labelBackground: { fill: string; padX: number; padY: number; radius: number };
  };
}

const STYLES: Record<EdgeKind, EdgeStyleName> = {
  call: "solid",
  async: "dashed",
  data: "solid",
  link: "plain",
  optional: "dotted",
};

/** The edge style an edge kind is drawn in. The kind decides it (DESIGNS.md, "Looks are free, while shape and dash follow the type", specs/decisions, "Edges meet any side"). */
export function edgeStyle(kind: EdgeKind): EdgeStyleName {
  return STYLES[kind];
}

/** The narrowest and widest width of one edge, in pixels (specs/decisions, "Edge weights"). */
export const WEIGHT_MIN = 0.5;
export const WEIGHT_MAX = 8;
/** A weight level's name (specs/decisions, "Edge weights"). */
export const WEIGHT_LEVEL = /^[a-z][a-z0-9-]*$/;
/** The longest arrowhead a heavy edge grows to, unless the thick one is longer (specs/decisions, "Edge weights"). */
const ARROW_MAX = 12;

/** The width of an edge in pixels, or undefined for a level the paint lacks (specs/decisions, "Edge weights"). */
export function edgeWidth(e: { weight?: string | number }, P: Paint): number | undefined {
  const w = e.weight ?? "thin";
  if (typeof w === "number") return w;
  if (w === "thin") return P.edge.strokeWidth;
  if (w === "thick") return P.edge.main.strokeWidth;
  return P.edge.weights[w];
}

/**
 * The width and arrowhead of an edge (specs/decisions, "Edge weights"). At the thin width the arrowhead is the thin
 * one and at the thick width it is the main-path one. Between and past them it grows by
 * the same step per pixel, up to a length of ARROW_MAX. A narrower edge keeps the thin one.
 */
export function strokeLook(
  width: number | undefined,
  P: Paint,
): { strokeWidth: number; arrow: { length: number; halfWidth: number } } {
  const { arrow, main } = P.edge;
  const w = width ?? P.edge.strokeWidth;
  const span = main.strokeWidth - P.edge.strokeWidth;
  if (w <= P.edge.strokeWidth || span <= 0) return { strokeWidth: w, arrow };
  let t = (w - P.edge.strokeWidth) / span;
  const dLen = main.arrow.length - arrow.length;
  const dHalf = main.arrow.halfWidth - arrow.halfWidth;
  const cap = Math.max(ARROW_MAX, main.arrow.length);
  if (dLen > 0 && arrow.length + dLen * t > cap) t = (cap - arrow.length) / dLen;
  return {
    strokeWidth: w,
    arrow: { length: arrow.length + dLen * t, halfWidth: arrow.halfWidth + dHalf * t },
  };
}

/** The kind whose paint draws an edge style's sample in the legend. */
export const STYLE_KIND: Record<EdgeStyleName, EdgeKind> = {
  solid: "call",
  dashed: "async",
  dotted: "optional",
  plain: "link",
};

/** A link says two things are related, with no direction, so it has no arrowhead (specs/decisions, "Edges meet any side"). */
export function hasHead(kind: EdgeKind): boolean {
  return kind !== "link";
}
