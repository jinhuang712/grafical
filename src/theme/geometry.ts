// Geometry tokens: box sizes per size step, spacing per density (DESIGN.md D6, D10).
// Owned by the layout. Every value is a multiple of 4, and every box width a
// multiple of 8, so that box centres and edges stay on the 4 px grid.
// The sizes follow the target picture (D25): 136 x 56 boxes, 32 px between
// neighbours, 24 px of group padding.

import type { Density, SizeStep } from "../model/types.ts";

export const BOX: Record<SizeStep, { w: number; h: number }> = {
  s: { w: 112, h: 48 },
  m: { w: 136, h: 56 },
  l: { w: 184, h: 72 },
};

export interface Spacing {
  /** Least horizontal space between neighbouring nodes in a row. */
  nodeGap: number;
  /** Gutter heights between two rows, smallest first. A gutter takes the smallest step its tracks fit in. */
  gutterSteps: number[];
  /** Vertical distance between neighbouring tracks in a gutter. */
  trackPitch: number;
  /** Margin around the whole diagram. */
  margin: number;
}

export const SPACING: Record<Density, Spacing> = {
  compact: {
    nodeGap: 24,
    gutterSteps: [32, 48, 64, 88, 120],
    trackPitch: 12,
    margin: 24,
  },
  normal: {
    nodeGap: 32,
    gutterSteps: [40, 56, 72, 96, 128],
    trackPitch: 12,
    margin: 32,
  },
  airy: {
    nodeGap: 48,
    gutterSteps: [56, 80, 104, 136, 168],
    trackPitch: 16,
    margin: 40,
  },
};

/** The frame around the nodes: title, subtitle, legend and footnote. */
export const FRAME = {
  /** Space between the subtitle (or the title) and the first row. */
  titleGap: 28,
  /** Space between the title's line box and the subtitle's. */
  subtitleGap: 4,
  /** Space between the last row (or group box) and the footnote. */
  noteGap: 24,
  /** Least space between the title and the legend beside it. */
  legendGap: 48,
  /** Length of a legend's sample line. */
  legendSample: 28,
  /** Space between a sample line and its label. */
  legendLabelGap: 8,
  /** Space between two legend items. */
  legendItemGap: 24,
  /** The subtitle and the footnote wrap at the content's width, but never narrower than this. */
  minTextWidth: 480,
  /**
   * Horizontal padding inside a box. Its text wraps to the box width minus twice
   * this, which is the room the checker allows (D14), so that a line that fits is
   * never wrapped.
   */
  textPad: 8,
  /** Vertical padding inside a box, the room the checker allows above and below text (D14). */
  textPadY: 4,
  /** Lines a node label may take before it overflows. */
  labelLines: 2,
  /** Lines a sublabel may take before it overflows. */
  sublabelLines: 1,
  /**
   * Half the height of a store's elliptical lid and bottom: a store is drawn as a
   * cylinder in its box. Its text sits up to half this lower, below the lid.
   */
  storeLid: 7,
};

/** A layer drawn as a band, because an edge ends at it (DESIGN.md D28). */
export const BAND = {
  /** Space between the band's sides and the content's left and right edges. */
  padX: 16,
  /** Space between the band's top and the top of its row, or of the group heads in it: the label sits in it. */
  head: 32,
  /** Space between the band's bottom and its row, or the bottom of the groups that end in it. */
  pad: 16,
  /** Distance from the band's top to the top of the label's line box. */
  labelTop: 10,
  /** Distance from the band's left side to the label. */
  labelInset: 16,
};

/** Swimlanes (DESIGN.md D32). */
export const LANE = {
  /** Space between a lane's side and the content in it, across. */
  padX: 20,
  /** Space between a lane's top or bottom and the content in it, down. */
  pad: 16,
  /** Widest a row lane's header may grow for its label; longer labels wrap. */
  headMax: 112,
  /** Space around a lane's label inside its header. */
  labelInset: 12,
  /** Distance from the header's top to the top of the label's line box. */
  labelTop: 10,
  /** Space kept between a column lane's side and any line that runs beside it. */
  lineClear: 8,
};

/** System boxes (DESIGN.md D7). */
export const GROUP = {
  /** Space between a group's box and its members, left, right and below. */
  pad: 24,
  /** Space between a group's box top and the top of its first row: the label sits in it. */
  head: 40,
  /** Distance from the box's top to the top of the label's line box. */
  labelTop: 12,
  /** Distance from the box's left side to the label. */
  labelInset: 16,
  /** Least space between a box and a node outside it. */
  clear: 16,
  /** Space between a group's label and its second, quieter part. */
  sublabelGap: 10,
  /** Least space between two boxes side by side. */
  gap: 24,
  /** Space kept between a group's label and any line that passes it. */
  labelClear: 6,
};

/** Routing tokens (DESIGN.md D11). */
export const ROUTE = {
  /** Preferred distance between neighbouring ports on one node side. */
  portPitch: 16,
  /** Least distance between neighbouring ports, so that arrowheads stay apart. */
  portMin: 12,
  /** Least distance from a box corner to a port. */
  portInset: 16,
  /** Least distance from a node to a vertical track in the gap beside it. */
  gapPad: 8,
  /** Distance a line keeps from the nodes of a row it passes, where its corridor has room. */
  passClear: 24,
  /** Distance between neighbouring vertical tracks in a gap. */
  gapPitch: 12,
  /** Least horizontal space between two runs on one gutter track. */
  runSeparation: 12,
  /** Least sideways step of a line that cannot run straight. */
  minJog: 12,
  /** Space between an edge label and its own line. */
  labelGap: 4,
  /** Clearance kept between an edge label and any other line. */
  labelClear: 4,
  /** Least space between two labels side by side, so that they do not read as one. */
  labelSpace: 24,
  /** This many unlabelled edges of one kind on one node side share a trunk (D25 rule 4). */
  busMin: 2,
  /** Space on each side of the label of an edge that runs sideways between neighbours. */
  sideLabelPad: 12,
  /** A sideways edge with a wider label goes round through the gutter instead. */
  sideLabelMax: 120,
  /** Room on each side of a line that runs through an otherwise empty column of a row. */
  corridorPad: 16,
};
