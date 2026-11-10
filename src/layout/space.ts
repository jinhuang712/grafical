// How far apart things sit (specs/decisions, "Styles set spacing as CSS does, and a later style wins"): the
// stylesheet's diagram type gives the row gap, the column gap and the diagram's margin, the styles the diagram marks
// change them, and the styles any region or node marks give it a margin of its own. What an object holds itself beats
// the styles it marks (specs/decisions, "Every attribute of a style may be set on the object itself"). Pure.

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

/** What gives an object its margins: the styles it marks, and what it holds itself, never what it follows. */
export type Spaced = { style?: readonly string[] } & Pick<
  Look,
  "marginTop" | "marginRight" | "marginBottom" | "marginLeft"
>;

/** The margin an object holds itself, or else the styles it marks give it; none where neither gives one. */
export function marginOf(d: Diagram, o: Spaced | undefined): Margin {
  const l = markedLook(d, o?.style);
  return {
    top: o?.marginTop ?? l.marginTop ?? 0,
    right: o?.marginRight ?? l.marginRight ?? 0,
    bottom: o?.marginBottom ?? l.marginBottom ?? 0,
    left: o?.marginLeft ?? l.marginLeft ?? 0,
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

/** The diagram's spacing: its stylesheet's, under the styles the diagram marks, under what it holds itself. */
export function spacingOf(d: Diagram): Spacing {
  const t = themeOf(d).space;
  const marked = markedLook(d, d.style);
  const rowGap = d.rowGap ?? marked.rowGap ?? t.rowGap;
  return {
    columnGap: d.columnGap ?? marked.columnGap ?? t.columnGap,
    gutterSteps: GUTTER_STEPS.map((s) => rowGap + s),
    trackPitch: TRACK_PITCH,
    margin: {
      top: d.marginTop ?? marked.marginTop ?? t.marginTop,
      right: d.marginRight ?? marked.marginRight ?? t.marginRight,
      bottom: d.marginBottom ?? marked.marginBottom ?? t.marginBottom,
      left: d.marginLeft ?? marked.marginLeft ?? t.marginLeft,
    },
  };
}

/**
 * A layer's margins above and below, by its id: the largest of its own, its nodes', and those of the groups and the
 * columns whose first layer it is (above) or whose last layer it is (below). A margin is room outside an object's own
 * box (specs/decisions, "Every attribute of a style may be set on the object itself"), so a lane's is not here: it
 * lies outside the lane's band, which the layout places.
 */
export function layerMargins(d: Diagram): (layer: string) => Margin {
  const at = new Map<string, Margin>();
  const groupOf = new Map<string, string | undefined>();
  for (const g of d.groups ?? []) groupOf.set(g.id, g.in);
  const groups = new Map((d.groups ?? []).map((g) => [g.id, g]));
  const columns = new Map((d.columns ?? []).map((c) => [c.id, c]));
  // The first and last layer each group's members span, its own and its inner groups', and each column's.
  const span = new Map<string, { top: number; bottom: number }>();
  const columnSpan = new Map<string, { top: number; bottom: number }>();
  const stretch = (m: Map<string, { top: number; bottom: number }>, id: string, i: number) => {
    const s = m.get(id);
    m.set(id, s === undefined ? { top: i, bottom: i } : { top: s.top, bottom: i });
  };
  d.layers.forEach((l, i) => {
    for (const n of l.nodes) {
      for (let g = n.group; g !== undefined; g = groupOf.get(g)) stretch(span, g, i);
      if (n.column !== undefined) stretch(columnSpan, n.column, i);
    }
  });
  d.layers.forEach((l, i) => {
    let m = marginOf(d, l);
    for (const n of l.nodes) m = widest(m, marginOf(d, n));
    const ends = (
      spans: Map<string, { top: number; bottom: number }>,
      of: (id: string) => Spaced | undefined,
    ) => {
      for (const [id, s] of spans) {
        if (s.top === i) m = widest(m, { ...NO_MARGIN, top: marginOf(d, of(id)).top });
        if (s.bottom === i) m = widest(m, { ...NO_MARGIN, bottom: marginOf(d, of(id)).bottom });
      }
    };
    ends(span, (g) => groups.get(g));
    ends(columnSpan, (c) => columns.get(c));
    at.set(l.id, m);
  });
  return (layer) => {
    const m = at.get(layer) ?? NO_MARGIN;
    return { ...NO_MARGIN, top: m.top, bottom: m.bottom };
  };
}

/**
 * A node's margins left and right, its own (specs/decisions, "Styles set spacing as CSS does, and a later style
 * wins"). A node's margin widens its whole column in every layer, which placement does.
 */
export function nodeMargins(d: Diagram): (node: Spaced) => Margin {
  return (n) => marginOf(d, n);
}

/** Each column's and each lane's margins, by id: room outside its strip or its band. */
export function regionMargins(d: Diagram): (id: string | undefined) => Margin {
  const at = new Map<string, Margin>();
  for (const c of d.columns ?? []) at.set(c.id, marginOf(d, c));
  for (const l of d.lanes ?? []) at.set(l.id, marginOf(d, l));
  return (id) => (id === undefined ? NO_MARGIN : (at.get(id) ?? NO_MARGIN));
}

/** A layer's margins left and right, by its id: room between its content and the canvas side, or the lane header. */
export function layerSides(d: Diagram): (layer: string) => Margin {
  const at = new Map(d.layers.map((l) => [l.id, marginOf(d, l)] as const));
  return (layer) => {
    const m = at.get(layer) ?? NO_MARGIN;
    return { ...NO_MARGIN, left: m.left, right: m.right };
  };
}
