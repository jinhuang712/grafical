// How far apart things sit (specs/decisions, "Styles set spacing as CSS does, and a later style wins"): the
// stylesheet's diagram type gives the row gap, the column gap and the diagram's margin, the styles the diagram marks
// change them, and the styles any region or node marks give it a margin of its own. Pure.

import type { Diagram, Look } from "../model/types.ts";
import { GUTTER_STEPS, TRACK_PITCH } from "../theme/geometry.ts";
import { stylesOf, themeOf } from "../theme/themes.ts";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_MARGIN: Margin = { top: 0, right: 0, bottom: 0, left: 0 };

export interface Spacing {
  /** Least horizontal space between neighbouring nodes in a layer, before their margins. */
  columnGap: number;
  /** Gutter heights between two layers, smallest first. A gutter takes the smallest step its tracks fit in. */
  gutterSteps: number[];
  /** Vertical distance between neighbouring tracks in a gutter. */
  trackPitch: number;
  /** Margin around the whole diagram. */
  margin: Margin;
}

/** What the styles an object marks set, a style defined later over an earlier one. */
export function markedLook(d: Diagram, names: readonly string[] | undefined): Look {
  const look: Look = {};
  if (names === undefined || names.length === 0) return look;
  for (const st of stylesOf(d)) {
    if (!names.includes(st.id)) continue;
    const { id: _id, ...values } = st;
    Object.assign(look, values);
  }
  return look;
}

/** The margin the styles an object marks give it; none where they give none. */
export function marginOf(d: Diagram, names: readonly string[] | undefined): Margin {
  const l = markedLook(d, names);
  return {
    top: l.marginTop ?? 0,
    right: l.marginRight ?? 0,
    bottom: l.marginBottom ?? 0,
    left: l.marginLeft ?? 0,
  };
}

/** The larger of two margins on each side. */
export function widest(a: Margin, b: Margin): Margin {
  return {
    top: Math.max(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
    left: Math.max(a.left, b.left),
  };
}

/** The diagram's spacing: its stylesheet's, under the styles the diagram marks. */
export function spacingOf(d: Diagram): Spacing {
  const t = themeOf(d).space;
  const own = markedLook(d, d.style);
  const rowGap = own.rowGap ?? t.rowGap;
  return {
    columnGap: own.columnGap ?? t.columnGap,
    gutterSteps: GUTTER_STEPS.map((s) => rowGap + s),
    trackPitch: TRACK_PITCH,
    margin: {
      top: own.marginTop ?? t.marginTop,
      right: own.marginRight ?? t.marginRight,
      bottom: own.marginBottom ?? t.marginBottom,
      left: own.marginLeft ?? t.marginLeft,
    },
  };
}

/**
 * A layer's margins above and below, by its id: the largest of its own, its nodes', its lane's when lanes run as
 * layers, and those of the groups whose first layer it is (above) or whose last layer it is (below).
 */
export function layerMargins(d: Diagram): (layer: string) => Margin {
  const at = new Map<string, Margin>();
  const lanes = new Map((d.lanes ?? []).map((l) => [l.id, l.style]));
  const groupOf = new Map<string, string | undefined>();
  for (const g of d.groups ?? []) groupOf.set(g.id, g.in);
  const groupStyle = new Map((d.groups ?? []).map((g) => [g.id, g.style]));
  // The first and last layer each group's members span, its own and its inner groups'.
  const span = new Map<string, { top: number; bottom: number }>();
  d.layers.forEach((l, i) => {
    for (const n of l.nodes) {
      for (let g = n.group; g !== undefined; g = groupOf.get(g)) {
        const s = span.get(g);
        span.set(g, s === undefined ? { top: i, bottom: i } : { top: s.top, bottom: i });
      }
    }
  });
  d.layers.forEach((l, i) => {
    let m = marginOf(d, l.style);
    for (const n of l.nodes) m = widest(m, marginOf(d, n.style));
    if (l.lane !== undefined) m = widest(m, marginOf(d, lanes.get(l.lane)));
    const top = (g: string) => ({ ...NO_MARGIN, top: marginOf(d, groupStyle.get(g)).top });
    const bottom = (g: string) => ({ ...NO_MARGIN, bottom: marginOf(d, groupStyle.get(g)).bottom });
    for (const [g, s] of span) {
      if (s.top === i) m = widest(m, top(g));
      if (s.bottom === i) m = widest(m, bottom(g));
    }
    at.set(l.id, m);
  });
  return (layer) => at.get(layer) ?? NO_MARGIN;
}

/**
 * A node's margins left and right: the largest of its own, its column's and its lane's when lanes run as columns
 * (specs/decisions, "Styles set spacing as CSS does, and a later style wins"). A node's margin widens its whole
 * column in every layer, which placement does.
 */
export function nodeMargins(
  d: Diagram,
): (node: { style?: string[]; column?: string; lane?: string }) => Margin {
  const columns = new Map((d.columns ?? []).map((c) => [c.id, c.style]));
  const lanes = new Map((d.lanes ?? []).map((l) => [l.id, l.style]));
  return (n) => {
    let m = marginOf(d, n.style);
    if (n.column !== undefined) m = widest(m, marginOf(d, columns.get(n.column)));
    if (n.lane !== undefined) m = widest(m, marginOf(d, lanes.get(n.lane)));
    return m;
  };
}
