// The scene: everything the engine computes from a diagram (DESIGN.md D10, D11).
// The layout produces it, the checker inspects it, the renderer draws it.
// Coordinates are px, origin top left, y down.

import type { EdgeKind, NodeKind } from "./model/types.ts";
import type { FontFace } from "./text/types.ts";

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

export type TextRole = "title" | "layer-label" | "node-label" | "node-sublabel" | "edge-label";

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

export interface SceneLayer {
  id: string;
  band: Rect;
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
  width: number;
  height: number;
  title: PlacedText;
  layers: SceneLayer[];
  nodes: SceneNode[];
  edges: SceneEdge[];
}
