// Text measurement interface (DESIGN.md, "Bundled fonts", "Our own SVG writer").
// The layout measures and wraps every label through a Measurer, and the
// renderer writes one <text> element per run.

export type FontFace = "inter-400" | "inter-600" | "noto-400" | "noto-600";

export interface TextStyle {
  /** Font size in px. */
  size: number;
  weight: 400 | 600;
}

/** A stretch of text drawn from one font face. */
export interface Run {
  text: string;
  face: FontFace;
  /** Offset from the start of the line, in px. */
  dx: number;
  /** Advance width, in px. */
  width: number;
}

export interface Line {
  runs: Run[];
  /** Total advance width, in px. */
  width: number;
}

export interface TextMetrics {
  /** Distance from the top of a line box to the baseline, in px. */
  ascent: number;
  /** Distance from the baseline to the bottom of a line box, in px. */
  descent: number;
  /** Distance between the baselines of two lines, in px. */
  lineHeight: number;
}

export interface Measurer {
  /** One line, never wrapped. */
  measure(text: string, style: TextStyle): Line;
  /**
   * Lines no wider than maxWidth where a break is possible (DESIGN.md, "Bundled fonts"). A piece
   * that cannot break is kept whole, so a line may still exceed maxWidth:
   * the checker reports that as overflow.
   */
  wrap(text: string, style: TextStyle, maxWidth: number): Line[];
  metrics(style: TextStyle): TextMetrics;
  /** Characters that no bundled font can draw, each listed once, in order. */
  missingGlyphs(text: string): string[];
}
