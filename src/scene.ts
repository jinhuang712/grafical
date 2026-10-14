// The scene: everything the engine computes from a diagram (DESIGN.md, "Layout computed again on every change", "Our own gap router").
// The layout produces it, the checker inspects it, the renderer draws it.
// Coordinates are px, origin top left, y down.

import type { EdgeKind, LineStyleName, Mark, MarkSlot, NodeKind } from "./model/types.ts";
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
 * A layer's row. Rows are not drawn (DESIGN.md, "Rows unseen, groups as systems"): the band and label stay in the scene
 * for the checker and for debugging, and the renderer skips them.
 */
export interface SceneLayer {
  id: string;
  band: Rect;
  label: PlacedText;
}

/** A system box around its member nodes (DESIGN.md, "Rows unseen, groups as systems"). */
export interface SceneGroup {
  id: string;
  rect: Rect;
  label: PlacedText;
  /** Ids of the member nodes, the nodes of its inner groups included. */
  members: string[];
  /** The label's second, quieter part, such as "write side", after the label. */
  sublabel?: PlacedText;
  /** How many boxes it sits in, itself counted, when it sits in another (DESIGN.md, "Every layered diagram type"). Absent: 1. */
  depth?: number;
}

/** A layer drawn as a band across the content, because an edge ends at it (DESIGN.md, "Lines that end at containers"). */
export interface SceneBand {
  /** The layer's id. */
  id: string;
  rect: Rect;
  label: PlacedText;
}

/** A swimlane (DESIGN.md, "Swimlanes run one way"): its whole area, the header that holds its label, and the label. */
export interface SceneLane {
  id: string;
  /** Rows: the header is on the left. Columns: on top. */
  run: "rows" | "columns";
  rect: Rect;
  head: Rect;
  label: PlacedText;
}

/**
 * A wall (DESIGN.md, "Walls as space"): the empty space it keeps between its sides, as long as the sides
 * need. A labelled wall draws a dashed line through the middle, the label above it.
 */
export interface SceneWall {
  id: string;
  run: "across" | "beside";
  rect: Rect;
  /** From a to b; `gaps` are spans along it, in x across or y up and down, where it breaks around text. */
  line?: { a: Point; b: Point; gaps?: [number, number][] };
  label?: PlacedText;
}

/** A small numbered circle: a footnote's number on its target, or before its text (DESIGN.md, "Notes as callouts or footnotes"). */
export interface SceneBadge {
  x: number;
  y: number;
  r: number;
  label: PlacedText;
}

/**
 * A note (DESIGN.md, "Notes as callouts or footnotes"), as grafical drew it: a callout card beside its target, joined to it
 * by a dotted line; or a footnote, a number on the target and its text in the list
 * at the bottom.
 */
export interface SceneNote {
  on: string;
  as: "callout" | "footnote";
  /** The words: in the card, or in the list. */
  text: PlacedText;
  card?: Rect;
  link?: { a: Point; b: Point };
  number?: number;
  /** The footnote's number on its target, and again before its text. */
  mark?: SceneBadge;
  key?: SceneBadge;
}

/** One line style, line width or mark in the legend, with its sample (DESIGN.md, "Looks", "A legend for widths and marks"). */
export interface SceneLegendItem {
  /** The line style the sample is drawn in (DESIGN.md, "Looks"). A mark's entry has none. */
  style?: LineStyleName;
  /** The sample's width in pixels when it is not the thin one: a line width's entry (DESIGN.md, "Edge weights", "A legend for widths and marks"). */
  width?: number;
  /** Where the sample sits, left to right, at the label's middle height. A line is drawn along it. */
  sample: { x1: number; x2: number; y: number };
  /** A mark's entry: the mark, at the small size, in this rect (DESIGN.md, "A legend for widths and marks"). */
  mark?: { mark: Mark; rect: Rect };
  label: PlacedText;
}

/** A mark on a node, in a square the layout fixed (DESIGN.md, "Marks of any kind"). */
export interface SceneMark {
  slot: MarkSlot;
  rect: Rect;
  /** The mark as the diagram holds it. The SVG writer draws it with what the provider has for it. */
  mark: Mark;
}

export interface SceneNode {
  id: string;
  layer: string;
  kind: NodeKind;
  accent: boolean;
  rect: Rect;
  /** Marks, in slot order. Absent: none. */
  marks?: SceneMark[];
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
  /** true: a second arrowhead at the first point (DESIGN.md, "Lines meet any side"). */
  both?: boolean;
  /** The line width in pixels when it is not the thin one: a heavier edge (DESIGN.md, "Lines meet any side", "Edge weights"). */
  width?: number;
}

export interface Scene {
  /** The paint of the diagram's theme (DESIGN.md, "Themes and stylesheets"). Absent: the default theme. */
  paint?: Paint;
  width: number;
  height: number;
  title: PlacedText;
  /** One sentence under the title (DESIGN.md, "Curation stays with the agent"). */
  subtitle?: PlacedText;
  /** The footnote at the bottom (DESIGN.md, "Curation stays with the agent"). */
  note?: PlacedText;
  /** The line styles the diagram uses, top right (DESIGN.md, "Looks"). Empty when it has no edges. */
  legend?: SceneLegendItem[];
  layers: SceneLayer[];
  /** System boxes, drawn behind nodes and edges (DESIGN.md, "Rows unseen, groups as systems"). */
  groups?: SceneGroup[];
  /** Layers an edge ends at, drawn behind the groups. Absent when there are none. */
  bands?: SceneBand[];
  lanes?: SceneLane[];
  /** Walls (DESIGN.md, "Walls as space"), drawn over the groups and under the lines. Absent when there are none. */
  walls?: SceneWall[];
  /** Notes (DESIGN.md, "Notes as callouts or footnotes"), drawn over everything but the lines' arrowheads. Absent when there are none. */
  notes?: SceneNote[];
  nodes: SceneNode[];
  edges: SceneEdge[];
}
