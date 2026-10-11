// The scene: everything the engine computes from a diagram (DESIGN.md D10, D11).
// The layout produces it, the checker inspects it, the renderer draws it.
// Coordinates are px, origin top left, y down.

import type { EdgeKind, NodeKind } from "./model/types.ts";
import type { FontFace } from "./text/types.ts";
import type { Paint } from "./theme/paint.ts";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TextRole =
  | "title"
  | "subtitle"
  | "note"
  | "legend"
  | "group-label"
  | "group-sublabel"
  | "layer-label"
  | "lane-label"
  | "node-label"
  | "node-sublabel"
  | "edge-label";

export interface PlacedRun {
  text: string;
  face: FontFace;
  size: number;
  /** Left end of the run. */
  x: number;
  /** Baseline. */
  y: number;
}

export interface PlacedText {
  role: TextRole;
  runs: PlacedRun[];
  /** The line boxes' union: what the checker tests for overflow and collisions. */
  bbox: Rect;
}

/**
 * A layer's row. Rows are not drawn (D7): the band and label stay in the scene
 * for the checker and for debugging, and the renderer skips them.
 */
export interface SceneLayer {
  id: string;
  band: Rect;
  label: PlacedText;
}

/** A system box around its member nodes (D7). */
export interface SceneGroup {
  id: string;
  rect: Rect;
  label: PlacedText;
  /** Ids of the member nodes. */
  members: string[];
  /** The label's second, quieter part, such as "write side", after the label. */
  sublabel?: PlacedText;
}

/** A layer drawn as a band across the content, because an edge ends at it (D28). */
export interface SceneBand {
  /** The layer's id. */
  id: string;
  rect: Rect;
  label: PlacedText;
}

/** A swimlane (D32): its whole area, the header that holds its label, and the label. */
export interface SceneLane {
  id: string;
  /** Rows: the header is on the left. Columns: on top. */
  run: "rows" | "columns";
  rect: Rect;
  head: Rect;
  label: PlacedText;
}

/** One line style in the legend, with a short sample line (D8). */
export interface SceneLegendItem {
  /** "solid": calls and data reads. "dashed": messages through a queue. */
  style: "solid" | "dashed";
  /** The sample line, left to right, at the label's middle height. */
  sample: { x1: number; x2: number; y: number };
  label: PlacedText;
}

export interface SceneNode {
  id: string;
  layer: string;
  kind: NodeKind;
  accent: boolean;
  rect: Rect;
  /** The label, then the sublabel if any. */
  texts: PlacedText[];
}

export interface SceneEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  /** Orthogonal polyline from the source port to the target port. The arrowhead sits at the last point. */
  points: Point[];
  label?: PlacedText;
}

export interface Scene {
  /** The paint of the diagram's theme (D30). Absent: the default theme. */
  paint?: Paint;
  width: number;
  height: number;
  title: PlacedText;
  /** One sentence under the title (D26). */
  subtitle?: PlacedText;
  /** The footnote at the bottom (D26). */
  note?: PlacedText;
  /** The line styles the diagram uses, top right (D8). Empty when it has no edges. */
  legend?: SceneLegendItem[];
  layers: SceneLayer[];
  /** System boxes, drawn behind nodes and edges (D7). */
  groups?: SceneGroup[];
  /** Layers an edge ends at, drawn behind the groups. Absent when there are none. */
  bands?: SceneBand[];
  lanes?: SceneLane[];
  nodes: SceneNode[];
  edges: SceneEdge[];
}
