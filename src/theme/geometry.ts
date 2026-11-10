// Geometry tokens: node sizes per size step and the steps a gutter grows by (specs/decisions, "Facts over coordinates", "Layout computed again on every change").
// How far apart things sit is the stylesheet's and the styles' (specs/decisions, "Styles set spacing as CSS does, and a later style wins").
// Owned by the layout. Every value is a multiple of 4, and every node width a
// multiple of 8, so that node centres and edges stay on the 4 px grid.
// The sizes follow the target picture: 136 x 56 nodes, 32 px between
// neighbours, 24 px of group padding.

import type { MarkShape, MarkSize, SizeStep } from "../model/types.ts";

export const BOX: Record<SizeStep, { w: number; h: number }> = {
  s: { w: 112, h: 48 },
  m: { w: 136, h: 56 },
  l: { w: 184, h: 72 },
};

/**
 * A decision's node per size step (specs/decisions, "Every layered diagram type"). A diamond holds text only in its middle, so
 * its node is larger than a plain node of the same step: medium fits "Within 30
 * days?" on one line, large two short lines of about 115 px.
 */
/**
 * Marks on a node (specs/decisions, "Marks of any kind"). A corner mark is centred on its corner: half its height lies
 * outside the node on each axis, whatever its size. The left mark takes a column inside
 * the node, which the text gives up.
 */
export const MARK = {
  /** Space between the left mark and the text. */
  leftGap: 8,
};

/**
 * A mark's size steps (specs/decisions, "Marks of any kind"): its height, which is also a picture's width, the font size of a
 * text of one character and of several, and the space between a text and its badge's edge.
 */
export const MARK_STEP: Record<MarkSize, { h: number; one: number; many: number; padX: number }> = {
  s: { h: 16, one: 11, many: 9, padX: 4 },
  m: { h: 20, one: 14, many: 11, padX: 5 },
  l: { h: 28, one: 18, many: 14, padX: 7 },
};

/** The font size of a text mark: one character is larger than several. */
export function markTextSize(text: string, size: MarkSize = "m"): number {
  const n = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)].length;
  return n <= 1 ? MARK_STEP[size].one : MARK_STEP[size].many;
}

/** The corner radius of a badge of this shape and height. */
export function markRadius(shape: MarkShape, h: number): number {
  return shape === "square" ? 0 : shape === "pill" ? h / 2 : 4;
}

/** The one size of a state machine's start and end dots (specs/decisions, "Every layered diagram type"). */
export const DOT = 24;

/** The one size of a choice, a small diamond with no label (specs/decisions, "A choice is a small diamond"). */
export const CHOICE = 28;

export const DIAMOND: Record<SizeStep, { w: number; h: number }> = {
  s: { w: 136, h: 64 },
  m: { w: 184, h: 80 },
  l: { w: 232, h: 96 },
};

/**
 * How a gutter grows past the row gap for the tracks it holds (specs/decisions, "Styles set spacing as CSS does, and a
 * later style wins"): it takes the smallest step its tracks fit in, each step the row gap plus one of these, and past
 * the last by the last increment.
 */
export const GUTTER_STEPS = [0, 16, 32, 56, 88] as const;

/** Vertical distance between neighbouring tracks in a gutter. */
export const TRACK_PITCH = 12;

/** The frame around the nodes: title, subtitle, legend and footnote. */
export const FRAME = {
  /** Space between the subtitle (or the title) and the first layer. */
  titleGap: 28,
  /** Space between the title's edge node and the subtitle's. */
  subtitleGap: 4,
  /** Space between the last layer (or group node) and the footnote. */
  noteGap: 24,
  /** Least space between the title and the legend beside it. */
  legendGap: 48,
  /** Length of a legend's sample edge. */
  legendSample: 28,
  /** Space between a sample edge and its label. */
  legendLabelGap: 8,
  /** Space between two legend items. */
  legendItemGap: 24,
  /** Space between two lines of a legend that wraps (specs/decisions, "A legend for widths and marks"). */
  legendLineGap: 6,
  /** The subtitle and the footnote wrap at the content's width, but never narrower than this. */
  minTextWidth: 480,
  /**
   * Horizontal padding inside a node. Its text wraps to the node width minus twice
   * this, which is the room the checker allows (specs/decisions, "Defects owned by who can fix them"), so that an edge that fits is
   * never wrapped.
   */
  textPad: 8,
  /** Vertical padding inside a node, the room the checker allows above and below text (specs/decisions, "Defects owned by who can fix them"). */
  textPadY: 4,
  /** Edges a node label may take before it overflows. */
  labelLines: 2,
  /** Edges a sublabel may take before it overflows. */
  sublabelLines: 1,
  /**
   * Half the height of a store's elliptical lid and bottom: a store is drawn as a
   * cylinder in its node. Its text sits up to half this lower, below the lid.
   */
  storeLid: 7,
};

/** A layer drawn as a band, because an edge ends at it (specs/decisions, "Edges that end at containers"). */
export const BAND = {
  /** Space between the band's sides and the content's left and right edges. */
  padX: 16,
  /** Space between the band's top and the top of its layer, or of the group heads in it: the label sits in it. */
  head: 32,
  /** Space between the band's bottom and its layer, or the bottom of the groups that end in it. */
  pad: 16,
  /** Distance from the band's top to the top of the label's edge node. */
  labelTop: 10,
  /** Distance from the band's left side to the label. */
  labelInset: 16,
};

/** A layer with no node that an edge ends at, drawn as one bar (specs/decisions, "Edges that end at containers"). */
export const BAR = {
  /** Height of the bar: one line of its label, with room above and below it. */
  h: 40,
  /** Width of the stand-in an edge meets inside the bar while it is routed. */
  standW: 32,
  /** Stand-ins nearer than this share one. */
  standGap: 16,
};

/** Walls: empty space between two sides (specs/decisions, "Walls as space"). */
export const WALL = {
  /** The space a wall adds where it runs, for each wall there. */
  space: 48,
  /** How far a wall reaches past the outermost nodes of its sides. */
  reach: 16,
  /** Space between a labelled wall's dashed edge and the bottom of its label. */
  labelGap: 4,
  /** Least space between a wall's label and an edge that crosses the wall. */
  labelClear: 8,
  /** Widest the label of a wall up and down runs before it wraps: the wall grows to hold it. */
  labelWrap: 96,
};

/** An edge's step badge (specs/decisions, "Step badges ride the edge"). */
export const STEP = {
  /** Radius of the badge: two digits fit inside its ring. */
  r: 9,
  /** Space between the badge and its label's text beside it, on an edge up or down. */
  gap: 4,
  /** How much further from its edge a label's text stands when a badge rides the edge under it: past the badge, and clear of it. */
  lift: 7,
  /** Least space between the badge and an arrowhead of its own edge. */
  arrowClear: 2,
  /** Least space between the badge and anything else it keeps clear of. */
  clear: 2,
};

/** Notes: callout cards and footnotes (specs/decisions, "Notes as callouts or footnotes"). */
export const NOTE = {
  /** Widest a note's text runs before it wraps. */
  wrap: 160,
  /** The most edges a note may take. */
  maxLines: 4,
  /** Space between a card's side and its text, across and down. */
  padX: 8,
  padY: 6,
  /** Space between a card and what it is about: the length of the dotted line. */
  gaps: [16, 32],
  /** Least space between a card and any other node, edge or text. */
  clear: 8,
  /** Radius of a footnote's number. */
  badge: 8,
  /** Space between a number and the text it keys, and between two footnotes. */
  keyGap: 6,
};

/** Lanes (specs/decisions, "Lanes run one way"). */
export const LANE = {
  /** Space between a lane's side and the content in it, across. */
  padX: 20,
  /** Space between a lane's top or bottom and the content in it, down. */
  pad: 16,
  /** Widest a layer lane's header may grow for its label; longer labels wrap. */
  headMax: 112,
  /** Space around a lane's label inside its header. */
  labelInset: 12,
  /** Distance from the header's top to the top of the label's edge node. */
  labelTop: 10,
  /** Space kept between a column lane's side and any edge that runs beside it. */
  lineClear: 8,
};

/** System nodes (specs/decisions, "Layers unseen, groups as systems"). */
export const GROUP = {
  /** Space between a group's border and its members, left, right and below. */
  pad: 24,
  /** Space between a group's border top and the top of its first layer: the label sits in it. */
  head: 40,
  /** Distance from the node's top to the top of the label's edge node. */
  labelTop: 12,
  /** Distance from the node's left side to the label. */
  labelInset: 16,
  /** Least space between a node and a node outside it. */
  clear: 16,
  /** Space between a group's label and its second, quieter part. */
  sublabelGap: 10,
  /** Least space between two nodes side by side. */
  gap: 24,
  /** Space kept between a group's label and any edge that passes it. */
  labelClear: 6,
  /** Space between a group's side and its label outside it (specs/decisions, "The agent states where a group's label sits"). */
  outsideGap: 12,
};

/** Routing tokens (specs/decisions, "Our own gap router"). */
export const ROUTE = {
  /** Preferred distance between neighbouring ports on one node side. */
  portPitch: 16,
  /** Least distance between neighbouring ports, so that arrowheads stay apart. */
  portMin: 12,
  /** Least distance from a node corner to a port. */
  portInset: 16,
  /** Least distance from a node to a vertical track in the gap beside it. */
  gapPad: 8,
  /** Least run of an edge from a node to the first track of a gutter (specs/decisions, "The router draws clean edges and the agent makes their room"). */
  endRun: 16,
  /** Distance an edge keeps from the nodes of a layer it passes, where its corridor has room. */
  passClear: 24,
  /** Distance between neighbouring vertical tracks in a gap. */
  gapPitch: 12,
  /** Least horizontal space between two runs on one gutter track. */
  runSeparation: 12,
  /** Least sideways step of an edge that cannot run straight. */
  minJog: 12,
  /** Space between an edge label and its own edge. */
  labelGap: 4,
  /** Clearance kept between an edge label and any other edge. */
  labelClear: 4,
  /** Least space between two labels side by side, so that they do not read as one. */
  labelSpace: 24,
  /** Room a gutter adds on its side next to a layer that holds a store, past a cylinder's lid and base. */
  storeRoom: 8,
  /** This many unlabelled edges of one kind on a crowded node side share a trunk. */
  bundleMin: 2,
  /** This many unlabelled edges of one kind leaving one node side leave as one bundle, crowded or not (specs/decisions, "Fan-outs of three bundle"). */
  fanOut: 3,
  /** Space on each side of the label of an edge that runs sideways between neighbours. */
  sideLabelPad: 12,
  /** Space on each side of a label that sits on such an edge, so that the edge shows past it and its arrowhead. */
  onLabelPad: 20,
  /** Gap between a run and a label on the edge that comes into it, past a rounded corner. */
  throughGap: 8,
  /** Room a label on an edge keeps from the end of a gutter, for the edge's arrowhead. */
  onArrow: 12,
  /** A sideways edge with a wider label goes round through the gutter instead. */
  sideLabelMax: 200,
  /** Room on each side of an edge that runs through an otherwise empty column of a layer. */
  corridorPad: 16,
};
