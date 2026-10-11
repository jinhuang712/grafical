// Paint: every colour and stroke value of a theme, by role (DESIGN.md D8, D30).
// The SVG writer reads roles from a scene's paint and never holds a hex code itself.
// PAINT is the default theme's paint; themes.ts holds the others.

import type { EdgeKind, LineStyleName, NodeKind } from "../model/types.ts";

export interface NodePaint {
  fill: string;
  stroke: string;
  /** Dash pattern of the border, if any. */
  dash?: string;
}

export interface EdgePaint {
  stroke: string;
  /** Dash pattern of a dashed or dotted line: async and optional edges (D8, D33). */
  dash?: string;
}

export interface BoxPaint {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

/** A swimlane: its area, its border, and its header's fill. */
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
  /** A system box behind its nodes (D7). Rows are not drawn. */
  group: BoxPaint;
  /** A layer an edge ends at, drawn behind its groups: lighter than a group (D28). */
  band: BoxPaint;
  /** A swimlane, drawn behind everything else (D32). Lanes side by side share a border. */
  lane: LanePaint;
  node: {
    radius: number;
    /** The corner radius of a state, rounder than a box (D34). */
    stateRadius: number;
    strokeWidth: number;
    kinds: Record<NodeKind, NodePaint>;
    /** The single accent colour: a border and a very light fill, on one or two nodes. */
    accent: { fill: string; stroke: string; strokeWidth: number };
  };
  edge: {
    strokeWidth: number;
    kinds: Record<EdgeKind, EdgePaint>;
    arrow: { length: number; halfWidth: number };
    /** An edge on the main path: a thicker line and a larger arrowhead (D33). */
    main: { strokeWidth: number; arrow: { length: number; halfWidth: number } };
    /** Radius of a rounded corner in a route. */
    cornerRadius: number;
    /** The patch behind an edge label, so the label stays readable over lines. */
    labelBackground: { fill: string; padX: number; padY: number; radius: number };
  };
}

const STYLES: Record<EdgeKind, LineStyleName> = {
  call: "solid",
  async: "dashed",
  data: "solid",
  link: "plain",
  optional: "dotted",
};

/** The line style an edge kind is drawn in. The kind decides it (D8, D33). */
export function lineStyle(kind: EdgeKind): LineStyleName {
  return STYLES[kind];
}

/** The kind whose paint draws a line style's sample in the legend. */
export const STYLE_KIND: Record<LineStyleName, EdgeKind> = {
  solid: "call",
  dashed: "async",
  dotted: "optional",
  plain: "link",
};

/** A link says two things are related, with no direction, so it has no arrowhead (D33). */
export function hasHead(kind: EdgeKind): boolean {
  return kind !== "link";
}

export const PAINT: Paint = {
  background: "#ffffff",
  text: {
    title: "#1f2328",
    subtitle: "#6b727c",
    note: "#6b727c",
    legend: "#6b727c",
    groupLabel: "#4b525c",
    groupLabelMuted: "#6b727c",
    laneLabel: "#4b525c",
    nodeLabel: "#1f2328",
    nodeSublabel: "#6b727c",
    edgeLabel: "#4b525c",
  },
  group: { fill: "#f5f6f8", stroke: "#d5d9df", strokeWidth: 1, radius: 8 },
  band: { fill: "#fafbfc", stroke: "#dfe3e8", strokeWidth: 1, radius: 8 },
  lane: { fill: "#ffffff", stroke: "#d5d9df", strokeWidth: 1, radius: 0, headFill: "#f0f2f5" },
  node: {
    radius: 6,
    stateRadius: 14,
    strokeWidth: 1,
    kinds: {
      service: { fill: "#ffffff", stroke: "#b4bac3" },
      store: { fill: "#f0f2f5", stroke: "#b4bac3" },
      queue: { fill: "#fbf6ec", stroke: "#cdbf9f" },
      external: { fill: "#ffffff", stroke: "#9aa1ab", dash: "4 3" },
      actor: { fill: "#f8f9fa", stroke: "#b4bac3" },
      state: { fill: "#ffffff", stroke: "#b4bac3" },
      terminal: { fill: "#e9edf2", stroke: "#9aa4b1" },
    },
    accent: { fill: "#eef3fd", stroke: "#2f5fc4", strokeWidth: 1.5 },
  },
  edge: {
    strokeWidth: 1.25,
    kinds: {
      call: { stroke: "#6f7681" },
      async: { stroke: "#6f7681", dash: "5 3" },
      data: { stroke: "#6f7681" },
      link: { stroke: "#6f7681" },
      optional: { stroke: "#6f7681", dash: "1.5 2.5" },
    },
    arrow: { length: 7, halfWidth: 3 },
    main: { strokeWidth: 2.5, arrow: { length: 9, halfWidth: 4 } },
    cornerRadius: 6,
    labelBackground: { fill: "#ffffff", padX: 3, padY: 1, radius: 2 },
  },
};
