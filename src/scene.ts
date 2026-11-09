// The scene: everything the engine computes from a diagram (specs/decisions, "Layout computed again on every change", "Our own gap router").
// The layout produces it, the checker inspects it, the renderer draws it.
// Coordinates are px, origin top left, y down.

import type { SteerCode } from "./layout/steer.ts";
import type { EdgeKind, EdgeStyleName, Look, Mark, MarkSlot, NodeKind } from "./model/types.ts";
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
  /** The edge nodes' union: what the checker tests for overflow and collisions. */
  bbox: Rect;
}

/**
 * A layer's layer. Layers are not drawn (specs/decisions, "Layers unseen, groups as systems"): the band and label stay in the scene
 * for the checker and for debugging, and the renderer skips them.
 */
export interface SceneLayer {
  id: string;
  band: Rect;
  label: PlacedText;
}

/** A system node around its member nodes (specs/decisions, "Layers unseen, groups as systems"). */
export interface SceneGroup {
  id: string;
  rect: Rect;
  /** What its styles set. */
  look?: Look;
  label: PlacedText;
  /** Ids of the member nodes, the nodes of its inner groups included. */
  members: string[];
  /** The label's second, quieter part, such as "write side", after the label. */
  sublabel?: PlacedText;
  /** How many nodes it sits in, itself counted, when it sits in another (specs/decisions, "Every layered diagram type"). Absent: 1. */
  depth?: number;
}

/** A layer drawn as a band across the content, because an edge ends at it (specs/decisions, "Edges that end at containers"). */
export interface SceneBand {
  /** The layer's id. */
  id: string;
  rect: Rect;
  /** Absent for a layer with no label (specs/decisions, "A layer with a look is drawn"). */
  label?: PlacedText;
  /** A layer with no node, drawn as one bar that edges meet and may pass (specs/decisions, "A layer with no node as one bar"). */
  bar?: true;
  /** Drawn with a node's paint and a dark label, not the band's (specs/decisions, "A layer with no node as one bar"). */
  box?: true;
  /** true: an edge runs through the place the agent stated for the bar's label, and the write is refused. */
  blocked?: true;
}

/** A lane (specs/decisions, "Lanes run one way"): its whole area, the header that holds its label, and the label. */
export interface SceneLane {
  id: string;
  /** What its styles set. */
  look?: Look;
  /** Layers: the header is on the left. Columns: on top. */
  run: "layers" | "columns";
  rect: Rect;
  head: Rect;
  label: PlacedText;
}

/**
 * A wall (specs/decisions, "Walls as space"): the empty space it keeps between its sides, as long as the sides
 * need. A labelled wall draws a dashed edge through the middle, the label above it.
 */
export interface SceneWall {
  id: string;
  run: "across" | "beside";
  rect: Rect;
  /** From a to b; `gaps` are spans along it, in x across or y up and down, where it breaks around text. */
  line?: { a: Point; b: Point; gaps?: [number, number][] };
  label?: PlacedText;
  /**
   * true: no place along the wall keeps its label clear of the edges across it, so the label lies
   * across one, and the write is refused (specs/decisions, "A wall's label stays along its wall").
   */
  blocked?: true;
}

/**
 * A small numbered circle: a footnote's number on its target, or before its text (specs/decisions, "Notes as callouts or footnotes"); or a
 * edge's step, on the edge (specs/decisions, "Step badges ride the edge").
 */
export interface SceneBadge {
  x: number;
  y: number;
  r: number;
  label: PlacedText;
}

/**
 * A note (specs/decisions, "Notes as callouts or footnotes"), as grafical drew it: a callout card beside its target, joined to it
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
  /**
   * true: a card with no place beside its target clear of everything else, drawn at the first
   * place anyway; the write is refused (specs/decisions, "A note is what the agent states").
   */
  blocked?: true;
}

/** One edge style, edge width or mark in the legend, with its sample (DESIGNS.md, "Looks are free, while shape and dash follow the type", specs/decisions, "A legend for widths and marks"). */
export interface SceneLegendItem {
  /** The edge style the sample is drawn in (DESIGNS.md, "Looks are free, while shape and dash follow the type"). A mark's entry has none. */
  style?: EdgeStyleName;
  /** The sample's width in pixels when it is not the thin one: an edge width's entry (specs/decisions, "Edge weights", "A legend for widths and marks"). */
  width?: number;
  /** Where the sample sits, left to right, at the label's middle height. An edge is drawn along it. */
  sample: { x1: number; x2: number; y: number };
  /** A mark's entry: the mark, at the small size, in this rect (specs/decisions, "A legend for widths and marks"). */
  mark?: { mark: Mark; rect: Rect };
  label: PlacedText;
}

/** A mark on a node, in a square the layout fixed (specs/decisions, "Marks of any kind"). */
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
  emphasis: boolean;
  /** What its styles set. Absent: its kind's look. */
  look?: Look;
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
  /** What its styles set. */
  look?: Look;
  /** Orthogonal polyline from the source port to the target port. The arrowhead sits at the last point. */
  points: Point[];
  label?: PlacedText;
  /** What the styles its label marks set. Absent: a patch the color behind it, and the labels' color. */
  labelLook?: Look;
  /** true: a second arrowhead at the first point (specs/decisions, "Edges meet any side"). */
  both?: boolean;
  /** The edge width in pixels when it is not the thin one: a heavier edge (specs/decisions, "Edges meet any side", "Edge weights"). */
  width?: number;
  /** Its step's number in a ring centred on the edge (specs/decisions, "Step badges ride the edge"). */
  step?: SceneBadge;
  /** The stated side the edge could not take, and the side it took (specs/decisions, "An agent may state the side of an edge"). */
  unmet?: { end: "out" | "in"; stated: string; drawn: string }[];
  /** The facts stated to steer it that could not hold (specs/decisions, "An edge is steered by facts and never by coordinates"). */
  refused?: SteerCode[];
  /**
   * The gutters its label, or its step's badge, tried when none could hold it clear of the other
   * edges, each as the layers above and below it joined by a slash. No edge moves for it, so it lies
   * across another edge, and the write is refused (specs/decisions, "An edge never moves for its label").
   */
  blocked?: string[];
}

export interface Scene {
  /** The paint of the diagram's theme (specs/decisions, "Themes and stylesheets"). Absent: the default theme. */
  paint?: Paint;
  /** Round corners where room allows, from `diagram --lines round` (specs/decisions, "Edges may be drawn square or round"). Absent: square. */
  lines?: "round";
  width: number;
  height: number;
  title: PlacedText;
  /** One sentence under the title (specs/decisions, "Curation stays with the agent"). */
  subtitle?: PlacedText;
  /** The footnote at the bottom (specs/decisions, "Curation stays with the agent"). */
  note?: PlacedText;
  /** The edge styles the diagram uses, top right (DESIGNS.md, "Looks are free, while shape and dash follow the type"). Empty when it has no edges. */
  legend?: SceneLegendItem[];
  layers: SceneLayer[];
  /** System nodes, drawn behind nodes and edges (specs/decisions, "Layers unseen, groups as systems"). */
  groups?: SceneGroup[];
  /** Layers an edge ends at, drawn behind the groups. Absent when there are none. */
  bands?: SceneBand[];
  lanes?: SceneLane[];
  /** Walls (specs/decisions, "Walls as space"), drawn over the groups and under the edges. Absent when there are none. */
  walls?: SceneWall[];
  /** Notes (specs/decisions, "Notes as callouts or footnotes"), drawn over everything but the edges' arrowheads. Absent when there are none. */
  notes?: SceneNote[];
  nodes: SceneNode[];
  edges: SceneEdge[];
}
