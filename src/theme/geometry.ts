// Geometry tokens: box sizes per size step, spacing per density (DESIGN.md D6, D10).
// Owned by the layout. Every value is a multiple of 4.

import type { Density, SizeStep } from "../model/types.ts";

export const BOX: Record<SizeStep, { w: number; h: number }> = {
  s: { w: 120, h: 48 },
  m: { w: 160, h: 56 },
  l: { w: 200, h: 72 },
};

export interface Spacing {
  /** Horizontal space between neighbouring nodes in a layer. */
  nodeGap: number;
  /** Gutter heights between two layers, smallest first. A gutter takes the smallest step its tracks fit in. */
  gutterSteps: number[];
  /** Vertical distance between neighbouring tracks in a gutter. */
  trackPitch: number;
  /** Padding inside a layer band, around its nodes. */
  bandPadding: number;
  /** Margin around the whole diagram. */
  margin: number;
}

export const SPACING: Record<Density, Spacing> = {
  compact: {
    nodeGap: 32,
    gutterSteps: [40, 56, 72, 96, 128],
    trackPitch: 12,
    bandPadding: 12,
    margin: 24,
  },
  normal: {
    nodeGap: 48,
    gutterSteps: [48, 72, 96, 128, 160],
    trackPitch: 12,
    bandPadding: 16,
    margin: 32,
  },
  airy: {
    nodeGap: 64,
    gutterSteps: [64, 96, 128, 160, 192],
    trackPitch: 16,
    bandPadding: 24,
    margin: 48,
  },
};

/** The frame around the nodes: title, bands and their label column. */
export const FRAME = {
  /** Width of the layer label column at the left of every band. */
  labelColumn: 128,
  /** Padding around a layer label inside its column. */
  labelPad: 16,
  /** Space between the title and the first band. */
  titleGap: 24,
  /** Horizontal padding inside a box. Its text wraps to the box width minus twice this. */
  textPad: 12,
  /** Lines a node label may take before it overflows. */
  labelLines: 2,
  /** Lines a sublabel may take before it overflows. */
  sublabelLines: 1,
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
  /** This many unlabelled edges of one kind leaving one node side share a bus. */
  busMin: 3,
};
