// Notes (DESIGN.md D44): each note is drawn as a callout card beside what it is
// about, where there is room, or as a numbered footnote: a number on its target and
// its text in a list at the bottom. A card keeps clear of every box, line, text and
// other card, and lies wholly inside or outside each group, lane and band. Nothing
// moves to make room for one.

import type { Diagram } from "../model/types.ts";
import type {
  PlacedText,
  Point,
  Rect,
  SceneBadge,
  SceneEdge,
  SceneGroup,
  SceneNode,
  SceneNote,
} from "../scene.ts";
import type { Line, Measurer } from "../text/types.ts";
import { NOTE } from "../theme/geometry.ts";
import type { TypeRamp } from "../theme/themes.ts";
import { lineHeight, placeLines } from "./text.ts";

/** What a card keeps clear of, and where it and the footnotes may go. */
export interface NoteRoom {
  nodes: SceneNode[];
  groups: SceneGroup[];
  edges: SceneEdge[];
  /** Texts and other solid boxes, besides the nodes. */
  solid: Rect[];
  /** Areas a card lies wholly inside or wholly outside: groups, lanes and bands. */
  areas: Rect[];
  /** Where a card may lie. */
  bounds: Rect;
  /** The footnote list: its left edge, its top and its width. */
  list: { x: number; y: number; w: number };
}

/** The lines a note's text wraps to in a card. */
export function cardLines(text: string, m: Measurer, T: TypeRamp): Line[] {
  return m.wrap(text, T.note, NOTE.wrap);
}

/** How much a footnote's text may run across: the list's width, less its number. */
const keyedWidth = (w: number) => w - 2 * NOTE.badge - NOTE.keyGap;

/**
 * A footnote's words in the list: its target's name first, so that the reader finds it
 * even where no number could be drawn on it: a node's or group's label, or a line's ends.
 */
function footnoteText(d: Diagram, on: string, text: string): string {
  const label = (id: string) =>
    d.layers.flatMap((l) => l.nodes).find((n) => n.id === id)?.label ??
    d.groups?.find((g) => g.id === id)?.label ??
    d.layers.find((l) => l.id === id)?.label ??
    d.lanes?.find((x) => x.id === id)?.label ??
    id;
  const edge = d.edges.find((e) => e.id === on);
  const name = edge === undefined ? label(on) : `${label(edge.from)} → ${label(edge.to)}`;
  return `${name}: ${text}`;
}

/** The height of the footnote list for the notes on these targets; 0 for none. */
export function footnotesHeight(
  d: Diagram,
  footnotes: ReadonlySet<string>,
  width: number,
  m: Measurer,
  T: TypeRamp,
): number {
  const lh = lineHeight("note", m, T);
  const heights = (d.notes ?? [])
    .filter((x) => footnotes.has(x.on))
    .map((x) => {
      const lines = m.wrap(footnoteText(d, x.on, x.text), T.note, keyedWidth(width));
      return Math.max(lines.length * lh, 2 * NOTE.badge);
    });
  if (heights.length === 0) return 0;
  return heights.reduce((s, h) => s + h, 0) + NOTE.keyGap * (heights.length - 1);
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const contains = (a: Rect, b: Rect) =>
  b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;
const grow = (r: Rect, c: number): Rect => ({
  x: r.x - c,
  y: r.y - c,
  w: r.w + 2 * c,
  h: r.h + 2 * c,
});

/** Does the axis-parallel segment a-b pass through the inside of r? */
function hits(a: Point, b: Point, r: Rect): boolean {
  const lo = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) };
  const hi = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) };
  return lo.x < r.x + r.w && hi.x > r.x && lo.y < r.y + r.h && hi.y > r.y;
}

/** Do two axis-parallel segments cross or touch? */
function meets(a: Point, b: Point, c: Point, d: Point): boolean {
  const [ax0, ax1] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [ay0, ay1] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  const [cx0, cx1] = [Math.min(c.x, d.x), Math.max(c.x, d.x)];
  const [cy0, cy1] = [Math.min(c.y, d.y), Math.max(c.y, d.y)];
  return ax0 <= cx1 && cx0 <= ax1 && ay0 <= cy1 && cy0 <= ay1;
}

type Seg = [Point, Point];

/** The longest part of a line, where a note on it is anchored. */
function longest(points: Point[]): Seg {
  let best: Seg = [points[0] as Point, (points[1] ?? points[0]) as Point];
  let len = -1;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const l = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (l > len) {
      len = l;
      best = [a, b];
    }
  }
  return best;
}

interface Spot {
  card: Rect;
  link: Seg;
}

/** Card places beside a box: right, left, below, above, each near and then farther. */
function besideBox(r: Rect, w: number, h: number): Spot[] {
  const spots: Spot[] = [];
  const cy = r.y + r.h / 2;
  const cx = r.x + r.w / 2;
  for (const gap of NOTE.gaps) {
    for (const y of [cy - h / 2, r.y, r.y + r.h - h]) {
      const ly = Math.min(Math.max(cy, y + 4), y + h - 4);
      if (ly < r.y || ly > r.y + r.h) continue;
      const right = r.x + r.w + gap;
      spots.push({
        card: { x: right, y, w, h },
        link: [
          { x: right, y: ly },
          { x: r.x + r.w, y: ly },
        ],
      });
      const left = r.x - gap - w;
      spots.push({
        card: { x: left, y, w, h },
        link: [
          { x: left + w, y: ly },
          { x: r.x, y: ly },
        ],
      });
    }
    for (const x of [cx - w / 2, r.x, r.x + r.w - w]) {
      const lx = Math.min(Math.max(cx, x + 4), x + w - 4);
      if (lx < r.x || lx > r.x + r.w) continue;
      const below = r.y + r.h + gap;
      spots.push({
        card: { x, y: below, w, h },
        link: [
          { x: lx, y: below },
          { x: lx, y: r.y + r.h },
        ],
      });
      const above = r.y - gap - h;
      spots.push({
        card: { x, y: above, w, h },
        link: [
          { x: lx, y: above + h },
          { x: lx, y: r.y },
        ],
      });
    }
  }
  return spots;
}

/** Card places beside a line's longest part, at its middle and its quarters. */
function besideLine([a, b]: Seg, w: number, h: number): Spot[] {
  const spots: Spot[] = [];
  for (const gap of NOTE.gaps) {
    for (const t of [0.5, 0.25, 0.75]) {
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (a.y === b.y) {
        spots.push({
          card: { x: p.x - w / 2, y: p.y + gap, w, h },
          link: [{ x: p.x, y: p.y + gap }, p],
        });
        spots.push({
          card: { x: p.x - w / 2, y: p.y - gap - h, w, h },
          link: [{ x: p.x, y: p.y - gap }, p],
        });
      } else {
        spots.push({
          card: { x: p.x + gap, y: p.y - h / 2, w, h },
          link: [{ x: p.x + gap, y: p.y }, p],
        });
        spots.push({
          card: { x: p.x - gap - w, y: p.y - h / 2, w, h },
          link: [{ x: p.x - gap, y: p.y }, p],
        });
      }
    }
  }
  return spots;
}

/**
 * Every note, as a callout where a place for its card is clear, and as a footnote
 * when its target is in `footnotes` or no place is. `noRoom` names the notes drawn
 * as footnotes that were not in `footnotes`: the list needs room for them, in a
 * second pass.
 */
export function placeNotes(
  d: Diagram,
  footnotes: ReadonlySet<string>,
  room: NoteRoom,
  m: Measurer,
  T: TypeRamp,
): { notes: SceneNote[]; noRoom: string[] } {
  const notes = d.notes ?? [];
  if (notes.length === 0) return { notes: [], noRoom: [] };
  const lh = lineHeight("note", m, T);
  const segs = room.edges.flatMap((e) =>
    e.points.slice(1).map((b, j): Seg & { edge?: string } => {
      const s = [e.points[j] as Point, b] as Seg & { edge?: string };
      s.edge = e.id;
      return s;
    }),
  );
  const nodeRect = new Map(room.nodes.map((n) => [n.id, n.rect]));
  const groupRect = new Map(room.groups.map((g) => [g.id, g]));
  const edgeOf = new Map(room.edges.map((e) => [e.id, e]));
  const taken: Rect[] = [];

  const clear = (spot: Spot, on: string): boolean => {
    const wide = grow(spot.card, NOTE.clear);
    if (!contains(room.bounds, spot.card)) return false;
    if (room.nodes.some((n) => overlaps(n.rect, wide))) return false;
    if (room.solid.some((s) => overlaps(s, wide))) return false;
    if (taken.some((t) => overlaps(t, wide))) return false;
    if (room.areas.some((a) => overlaps(a, spot.card) && !contains(a, spot.card))) return false;
    if (segs.some(([a, b]) => hits(a, b, wide))) return false;
    // The dotted line meets only its own target: no other box, text, card or line.
    const [p, q] = spot.link;
    if (room.nodes.some((n) => n.id !== on && hits(p, q, n.rect))) return false;
    if (room.solid.some((s) => hits(p, q, s)) || taken.some((t) => hits(p, q, t))) return false;
    return !segs.some((s) => s.edge !== on && meets(p, q, s[0], s[1]));
  };

  const out = new Map<string, SceneNote>();
  const noRoom: string[] = [];
  const keyed: { on: string; at: Point; text: string }[] = [];
  for (const x of notes) {
    const lines = cardLines(x.text, m, T);
    const w = Math.ceil(Math.max(0, ...lines.map((l) => l.width)) + 2 * NOTE.padX);
    const h = Math.ceil(lines.length * lh + 2 * NOTE.padY);
    const node = nodeRect.get(x.on);
    const group = groupRect.get(x.on);
    const edge = edgeOf.get(x.on);
    const target = node ?? group?.rect;
    const at: Point =
      target !== undefined
        ? { x: target.x, y: target.y }
        : edge !== undefined
          ? midpoint(longest(edge.points))
          : { x: 0, y: 0 };
    if (!footnotes.has(x.on)) {
      const spots =
        target !== undefined
          ? besideBox(target, w, h)
          : edge !== undefined
            ? besideLine(longest(edge.points), w, h)
            : [];
      const spot = spots.find((s) => clear(s, x.on));
      if (spot !== undefined) {
        taken.push(spot.card);
        out.set(x.on, {
          on: x.on,
          as: "callout",
          card: spot.card,
          link: { a: spot.link[0], b: spot.link[1] },
          text: placeLines(
            "note",
            lines,
            spot.card.x + NOTE.padX,
            spot.card.y + NOTE.padY,
            "start",
            m,
            T,
          ),
        });
        continue;
      }
      noRoom.push(x.on);
    }
    keyed.push({ on: x.on, at, text: x.text });
  }

  // Footnotes, numbered in reading order of their targets, listed in that order.
  keyed.sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x || (a.on < b.on ? -1 : 1));
  const r = NOTE.badge;
  let y = room.list.y;
  keyed.forEach((k, i) => {
    const n = i + 1;
    const lines = m.wrap(footnoteText(d, k.on, k.text), T.note, keyedWidth(room.list.w));
    const rowH = Math.max(lines.length * lh, 2 * r);
    // The number sits level with the first line of its text.
    const first = Math.max(lh, 2 * r);
    const key = badge(n, room.list.x + r, y + first / 2, m, T);
    const top = y + (first - lh) / 2;
    const text = placeLines("note", lines, room.list.x + 2 * r + NOTE.keyGap, top, "start", m, T);
    const mark = markOn(k.on, n);
    out.set(k.on, { on: k.on, as: "footnote", number: n, ...(mark ? { mark } : {}), key, text });
    y += rowH + NOTE.keyGap;
  });

  /** A footnote's number on its target: a free corner of a box, after a group's label, beside a line. */
  function markOn(on: string, n: number): SceneBadge | undefined {
    const free = (p: Point) => {
      const box = grow({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r }, 2);
      if (segs.some(([a, b]) => hits(a, b, box))) return false;
      if (room.nodes.some((x) => x.id !== on && overlaps(x.rect, box))) return false;
      if (room.solid.some((s) => overlaps(s, box)) || taken.some((t) => overlaps(t, box)))
        return false;
      const marks = room.nodes.find((x) => x.id === on)?.marks ?? [];
      return !marks.some((mk) => overlaps(mk.rect, box));
    };
    const node = nodeRect.get(on);
    const group = groupRect.get(on);
    const edge = edgeOf.get(on);
    let spots: Point[] = [];
    if (node !== undefined) {
      // On a corner, its digits just outside the box, so that they read as the number's.
      const { x, y: top, w, h } = node;
      const out = NOTE.badge - 2;
      spots = [
        { x: x + w + out, y: top },
        { x: x - out, y: top },
        { x: x + w + out, y: top + h },
        { x: x - out, y: top + h },
      ];
    } else if (group !== undefined) {
      const after = group.sublabel?.bbox ?? group.label.bbox;
      spots = [
        { x: after.x + after.w + NOTE.keyGap + r, y: group.label.bbox.y + group.label.bbox.h / 2 },
      ];
    } else if (edge !== undefined) {
      // Beside each part of the line, longest first, at its middle and then further out.
      const parts = edge.points
        .slice(1)
        .map((b, j): Seg => [edge.points[j] as Point, b])
        .sort(
          ([a, b], [c, e]) =>
            Math.abs(c.x - e.x) + Math.abs(c.y - e.y) - (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)),
        );
      for (const [a, b] of parts) {
        for (const off of [r + 4, r + 10]) {
          for (const t of [0.5, 0.3, 0.7, 0.15, 0.85]) {
            const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            const across = a.y === b.y;
            spots.push(
              across ? { x: p.x, y: p.y - off } : { x: p.x + off, y: p.y },
              across ? { x: p.x, y: p.y + off } : { x: p.x - off, y: p.y },
            );
          }
        }
      }
    }
    // Where no place is clear, the number is left off the picture, and the list names
    // the target instead.
    const p = spots.find(free);
    if (p === undefined) return undefined;
    taken.push({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r });
    return badge(n, p.x, p.y, m, T);
  }

  return { notes: notes.flatMap((x) => out.get(x.on) ?? []), noRoom };
}

function midpoint([a, b]: Seg): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** A numbered circle centred at (x, y). */
function badge(n: number, x: number, y: number, m: Measurer, T: TypeRamp): SceneBadge {
  const lines = m.wrap(String(n), T.note, 100);
  const lh = lineHeight("note", m, T);
  const label: PlacedText = placeLines("note", lines, x, y - lh / 2, "middle", m, T);
  return { x, y, r: NOTE.badge, label };
}
