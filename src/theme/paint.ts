// Paint: every colour and stroke value of the one theme, by role (DESIGN.md D8).
// The SVG writer reads roles from here and never holds a hex code itself.

import type { EdgeKind, NodeKind } from "../model/types.ts";

export interface NodePaint {
  fill: string;
  stroke: string;
  /** Dash pattern of the border, if any. */
  dash?: string;
}

export interface EdgePaint {
  stroke: string;
  dash?: string;
}

export const PAINT = {
  background: "#ffffff",
  text: {
    title: "#1f2328",
    subtitle: "#6b727c",
    note: "#6b727c",
    legend: "#6b727c",
    groupLabel: "#4b525c",
    /** The lighter part of a group label, such as "write side". */
    groupLabelMuted: "#6b727c",
    nodeLabel: "#1f2328",
    nodeSublabel: "#6b727c",
    edgeLabel: "#4b525c",
  },
  /** A system box behind its nodes (D7). Rows are not drawn. */
  group: { fill: "#f5f6f8", stroke: "#d5d9df", strokeWidth: 1, radius: 8 },
  node: {
    radius: 6,
    strokeWidth: 1,
    kinds: {
      service: { fill: "#ffffff", stroke: "#b4bac3" },
      store: { fill: "#f0f2f5", stroke: "#b4bac3" },
      queue: { fill: "#fbf6ec", stroke: "#cdbf9f" },
      external: { fill: "#ffffff", stroke: "#9aa1ab", dash: "4 3" },
      actor: { fill: "#f8f9fa", stroke: "#b4bac3" },
    } satisfies Record<NodeKind, NodePaint>,
    /** The single accent colour: a border and a very light fill, on one or two nodes. */
    accent: { fill: "#eef3fd", stroke: "#2f5fc4", strokeWidth: 1.5 },
  },
  edge: {
    strokeWidth: 1.25,
    kinds: {
      call: { stroke: "#6f7681" },
      async: { stroke: "#6f7681", dash: "5 3" },
      data: { stroke: "#6f7681" },
    } satisfies Record<EdgeKind, EdgePaint>,
    arrow: { length: 7, halfWidth: 3 },
    /** Radius of a rounded corner in a route. */
    cornerRadius: 6,
    /** Only two line styles exist (D8): solid and dashed. */
    legendDash: "5 3",
    /** The patch behind an edge label, so the label stays readable over lines. */
    labelBackground: { fill: "#ffffff", padX: 3, padY: 1, radius: 2 },
  },
} as const;
