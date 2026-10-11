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
    nodeGap: 24,
    gutterSteps: [32, 48, 64, 96, 128],
    trackPitch: 8,
    bandPadding: 12,
    margin: 24,
  },
  normal: {
    nodeGap: 40,
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
