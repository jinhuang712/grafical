// Layout entry point (specs/decisions, "Layers unseen, groups as systems", "Layout computed again on every change", "Our own gap router"). The whole diagram is laid
// out again from its facts on every call, in a fixed order:
// 1. across: every node on a column of one grid shared by all layers, columns chosen
//    so that edges run straight, then spaced for nodes, groups and labels
//    (grid.ts, place.ts);
// 2. routes across: paths, ports, gap tracks and gutter rows (route.ts);
// 3. down: the title, subtitle and legend, then layers and gutters top to bottom,
//    each gutter taking the smallest height step its rows fit in, plus the room
//    group nodes need below their last layer and above their first, and the room
//    of lane headers and borders (specs/decisions, "Lanes run one way");
// 4. assembly of routes, labels, group nodes, text and the footnote.
// Layers are not drawn (specs/decisions, "Layers unseen, groups as systems"): their bands and labels stay in the scene for the
// checker and for debugging.

import { segmentCrossesRect, segmentsOf } from "../check/geometry.ts";
import { orderByColumns } from "../model/columns.ts";
import { laneRun, orderByLanes } from "../model/lanes.ts";
import { withFollowedWeights } from "../model/like.ts";
import { everyNode } from "../model/steps.ts";
import {
  type Diagram,
  EDGE_KINDS,
  EDGE_STYLES,
  type EdgeStyleName,
  type LabelAlign,
  type Look,
  MARK_SLOTS,
  type Mark,
  markName,
  weightKey,
} from "../model/types.ts";
import { wallRun, wallSplit } from "../model/walls.ts";
import type {
  PlacedText,
  Point,
  Rect,
  Scene,
  SceneBadge,
  SceneBand,
  SceneEdge,
  SceneGroup,
  SceneLane,
  SceneLayer,
  SceneLegendItem,
  SceneNode,
  SceneWall,
} from "../scene.ts";
import type { Line, Measurer } from "../text/types.ts";
import { BAND, BAR, FRAME, GROUP, LANE, MARK_STEP, ROUTE, STEP, WALL } from "../theme/geometry.ts";
import { edgeStyle, edgeWidth, hasHead, type Paint, strokeLook } from "../theme/paint.ts";
import { isDot, textTop } from "../theme/shapes.ts";
import { DEFAULT_THEME, type TypeRamp, themeOf } from "../theme/themes.ts";
import type { AlignmentProblem } from "./align.ts";
import { badgeRect, settleBadges, stepPlace } from "./badges.ts";
import { cutRoute, planEnds, refineEnds, straightIntoBand } from "./ends.ts";
import { buildGrid, type GroupProblem } from "./grid.ts";
import { ON_CLEAR } from "./gutter.ts";
import { footnotesHeight, numberBadge, placeNotes } from "./notes.ts";
import { atSide, centreX, outsideOf, type PNode, placeAcross, reach } from "./place.ts";
import {
  type AssembledLabel,
  assemble,
  type LabelBox,
  type LabelForm,
  round2,
  routeAcross,
} from "./route.ts";
import { planSideways } from "./side.ts";
import { leftInset, markRects, markWidth, nodeLines, withSizes } from "./size.ts";
import { layerMargins, markedLook, type Spacing, spacingOf } from "./space.ts";
import { routeStats } from "./stats.ts";
import { steerEdges } from "./steer.ts";
import { placeSteps } from "./steps.ts";
import { alignedIn, lineBox, lineHeight, placeLine, placeLines } from "./text.ts";

export type { AlignmentCode, AlignmentProblem } from "./align.ts";
export type { GroupCode, GroupProblem, StepProblem } from "./grid.ts";
export { type RouteStats, routeStats } from "./stats.ts";
export { addedLayer, placeSteps, validateSteps } from "./steps.ts";

export function layout(diagram: Diagram, m: Measurer): Scene {
  return framed(diagram, m).scene;
}

/** Laid out with text. */
function framed(diagram: Diagram, m: Measurer): { scene: Scene; centre: number } {
  return compute(diagram, m, true);
}

/**
 * The scene and the absolute x of the centre line the grid is centred on.
 * Positions may be compared relative to that edge: a wider canvas may shift
 * everything by the same amount.
 */
export function layoutFramed(diagram: Diagram, m: Measurer): { scene: Scene; centre: number } {
  return framed(diagram, m);
}

/**
 * Alignments that cannot hold (specs/decisions, "Layout computed again on every change"): an aligned node must share its target's
 * column, and the order of a layer, another alignment or a group can put that
 * column on the other side of its neighbours. Also unknown targets, targets in
 * the same layer and a node aligned with itself. The command line turns each into
 * an operation error.
 */
export function validateAlignments(diagram: Diagram): AlignmentProblem[] {
  return buildGrid(placeSteps(diagram).d).alignProblems;
}

/**
 * Groups that cannot be drawn as one node (specs/decisions, "Layers unseen, groups as systems"): a group whose members are split
 * by another node in a layer, and a group that another group or node would have
 * to lie both left and right of. The command line turns each into an operation
 * error.
 */
export function validateGroups(diagram: Diagram): GroupProblem[] {
  return buildGrid(placeSteps(diagram).d).groupProblems;
}

/** What an object's look is made from: what it holds itself, the styles it marks, what it follows and its type. */
interface Looking extends Pick<Look, "fill" | "border" | "borderWidth" | "color"> {
  id: string;
  like?: string;
  style?: string[];
  type?: string;
}

/**
 * What an object's look is: its type's, under what it follows, under the styles it marks, of which the one defined
 * later wins, under what it holds itself (specs/decisions, "An object names the styles it uses", "Styles set spacing
 * as CSS does, and a later style wins", "Every attribute of a style may be set on the object itself").
 */
function lookOf(
  d: Diagram,
  o: Looking | undefined,
  among: readonly Looking[] = [],
): Look | undefined {
  const look: Look = {};
  const chain: string[] = [];
  for (let at = o?.type; at !== undefined; at = d.types?.find((x) => x.id === at)?.base)
    chain.unshift(at);
  for (const id of chain) {
    const { fill, border, borderWidth, color } = d.types?.find((x) => x.id === id) ?? {};
    Object.assign(look, {
      ...(fill === undefined ? {} : { fill }),
      ...(border === undefined ? {} : { border }),
      ...(borderWidth === undefined ? {} : { borderWidth }),
      ...(color === undefined ? {} : { color }),
    });
  }
  // A followed look sits over the type and under the object's own styles (specs/decisions, "`like` follows an object's look and nothing else").
  const followed = among.find((x) => x.id === o?.like);
  if (followed !== undefined) Object.assign(look, lookOf(d, followed, among));
  // Spacing is placement's: only the paint of a style is a look.
  for (const from of [markedLook(d, o?.style), o ?? {}]) {
    const { fill, border, borderWidth, color } = from;
    Object.assign(look, {
      ...(fill === undefined ? {} : { fill }),
      ...(border === undefined ? {} : { border }),
      ...(borderWidth === undefined ? {} : { borderWidth }),
      ...(color === undefined ? {} : { color }),
    });
  }
  return Object.keys(look).length > 0 ? look : undefined;
}

function lookPart(
  d: Diagram,
  o: Looking | undefined,
  among: readonly Looking[] = [],
): { look?: Look } {
  const look = lookOf(d, o, among);
  return look === undefined ? {} : { look };
}

/**
 * Nodes that lie wholly beside the nodes they connect to, which their edges must then
 * reach across (specs/decisions, "Who chose is punished"): a node with edges to two or more nodes whose centres lie at least
 * its own width apart, left of the leftmost centre or right of the rightmost.
 */
export function asideNodes(scene: Scene): { node: string; users: string[] }[] {
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  const users = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (a === b || !nodes.has(a) || !nodes.has(b)) return;
    users.set(a, (users.get(a) ?? new Set()).add(b));
  };
  for (const e of scene.edges) {
    link(e.from, e.to);
    link(e.to, e.from);
  }
  const out: { node: string; users: string[] }[] = [];
  for (const n of scene.nodes) {
    const us = [...(users.get(n.id) ?? [])].sort(cmpIds);
    if (us.length < 2) continue;
    const cs = us.map((u) => {
      const r = (nodes.get(u) as SceneNode).rect;
      return r.x + r.w / 2;
    });
    const lo = Math.min(...cs);
    const hi = Math.max(...cs);
    if (hi - lo < n.rect.w) continue;
    if (n.rect.x > hi || n.rect.x + n.rect.w < lo) out.push({ node: n.id, users: us });
  }
  return out;
}

const cmpIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * How bad the routes of a scene are, compared in order: crossings plus edges with
 * more than two bends plus nodes aside of what they connect to (specs/decisions, "Who chose is punished"), then
 * crossings, then bends, then length.
 */
function routeCost(scene: Scene): number[] {
  let over = 0;
  for (const e of scene.edges) {
    let bends = 0;
    for (let i = 2; i < e.points.length; i++) {
      const a = e.points[i - 2];
      const b = e.points[i - 1];
      const c = e.points[i];
      if (a === undefined || b === undefined || c === undefined) continue;
      const straight = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
      if (!straight) bends++;
    }
    if (bends > 2) over++;
  }
  const s = routeStats(scene.edges.map((e) => e.points));
  return [s.crossings + over + asideNodes(scene).length, s.crossings, s.bends, s.length];
}

/** A diagram's route cost (see routeCost), laid out without text: for comparing arrangements (specs/decisions, "Who chose is punished", "Records over prose"). */
export function arrangementCost(diagram: Diagram, m: Measurer): number[] {
  return routeCost(compute(diagram, m, false).scene);
}

/** What makes a diagram's edges hard to read: pairs that cross, and edges over two bends. */
export interface EdgeTrouble {
  /** Every point where two routes cross, as the route cost counts them (specs/decisions, "Who chose is punished"). */
  points: number;
  /** Pairs of edge ids whose routes cross, each pair once, in id order. */
  crossings: [string, string][];
  /** Edges that bend more than twice, with their bends, in id order. */
  bent: { edge: string; bends: number }[];
}

/** Every point where two routes cross, and the pairs of edges, each pair once, in id order. */
export function crossingsOf(edges: SceneEdge[]): {
  points: number;
  pairs: [string, string][];
  /** Where each crossing lies. */
  at: Point[];
} {
  const segs: { id: string; v: boolean; at: number; lo: number; hi: number }[] = [];
  for (const e of edges) {
    for (let i = 1; i < e.points.length; i++) {
      const a = e.points[i - 1] as Point;
      const b = e.points[i] as Point;
      if (a.x === b.x)
        segs.push({ id: e.id, v: true, at: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) });
      else if (a.y === b.y)
        segs.push({ id: e.id, v: false, at: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) });
    }
  }
  let points = 0;
  const at: Point[] = [];
  const pairs = new Set<string>();
  for (const h of segs) {
    if (h.v) continue;
    for (const v of segs) {
      if (!v.v || v.id === h.id) continue;
      if (v.at > h.lo && v.at < h.hi && h.at > v.lo && h.at < v.hi) {
        points++;
        at.push({ x: v.at, y: h.at });
        pairs.add(JSON.stringify(h.id < v.id ? [h.id, v.id] : [v.id, h.id]));
      }
    }
  }
  const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return {
    points,
    at,
    pairs: [...pairs]
      .map((p) => JSON.parse(p) as [string, string])
      .sort((a, b) => byId(a[0], b[0]) || byId(a[1], b[1])),
  };
}

/** The turns of an orthogonal route. */
export function bendsOf(points: Point[]): number {
  let bends = 0;
  for (let i = 1; i + 1 < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const c = points[i + 1] as Point;
    if (!((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y))) bends++;
  }
  return bends;
}

/** The pairs of edges that cross, and the edges that bend more than twice (specs/decisions, "Records over prose"). */
export function edgeTrouble(diagram: Diagram, m: Measurer): EdgeTrouble {
  const { scene } = compute(diagram, m, false);
  const { points, pairs } = crossingsOf(scene.edges);
  const bent = scene.edges
    .map((e) => ({ edge: e.id, bends: bendsOf(e.points) }))
    .filter((b) => b.bends > 2)
    .sort((a, b) => (a.edge < b.edge ? -1 : a.edge > b.edge ? 1 : 0));
  return { points, crossings: pairs, bent };
}

/** The edges whose routes cross another route, or bend more than twice. */
export function troubledEdges(diagram: Diagram, m: Measurer): Set<string> {
  const t = edgeTrouble(diagram, m);
  return new Set([...t.crossings.flat(), ...t.bent.map((b) => b.edge)]);
}

const ceil4 = (x: number) => Math.ceil(x / 4 - 1e-9) * 4;
const ceil8 = (x: number) => Math.ceil(x / 8 - 1e-9) * 8;

/**
 * An edge label on two and on three edges, each at the least width that wraps it
 * onto that many, for a label that finds no clear slot on one line. A label that
 * cannot break, or gets no narrower, has none.
 */
function narrower(text: string, width: number, m: Measurer, T: TypeRamp): LabelForm[] {
  const style = T["edge-label"];
  const mt = m.metrics(style);
  const out: LabelForm[] = [];
  let widest = width;
  for (const k of [2, 3]) {
    let lo = width / k - 1;
    let hi = width;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      if (m.wrap(text, style, mid).length <= k) hi = mid;
      else lo = mid;
    }
    const lines = m.wrap(text, style, hi);
    const w = Math.max(...lines.map((l) => l.width));
    if (lines.length < 2 || w >= widest - 1) continue;
    out.push({
      w,
      h: (lines.length - 1) * mt.lineHeight + mt.ascent + mt.descent,
      lines: lines.length,
      maxWidth: hi,
    });
    widest = w;
  }
  return out;
}

/** How far a gutter's first track lies below its top, and its last track above its bottom. */
function trackLead(sp: Spacing): number {
  return Math.max(ROUTE.endRun, sp.trackPitch);
}

/** The smallest gutter step that holds this many tracks, growing past the last step by its last increment. */
export function gutterHeight(rows: number, sp: Spacing): number {
  const need = (rows - 1) * sp.trackPitch + 2 * trackLead(sp);
  for (const h of sp.gutterSteps) if (h >= need) return h;
  const last = sp.gutterSteps[sp.gutterSteps.length - 1] ?? need;
  const prev = sp.gutterSteps[sp.gutterSteps.length - 2] ?? 0;
  const inc = Math.max(4, last - prev);
  let h = last;
  while (h < need) h += inc;
  return h;
}

/** A legend entry, or a style or width the picture draws with no entry (specs/decisions, "The legend says only what the agent named"). */
export interface LegendEntry {
  /** An edge's entry: the style of its sample. */
  style?: EdgeStyleName;
  /** The agent's words; none for a style or width it has not named, which the legend leaves out. */
  text?: string;
  /** An edge width's entry: the weight as the legend names it, and its sample's width (specs/decisions, "A legend for widths and marks"). */
  weight?: string;
  width?: number;
  /** A mark's entry: the mark, at the small size (specs/decisions, "A legend for widths and marks"). */
  mark?: Mark;
}
type LegendItem = LegendEntry & { text: string };

/** A mark at the small size, as the legend draws it (specs/decisions, "A legend for widths and marks"). */
function smallMark(mk: Mark): Mark {
  return typeof mk === "string" ? { text: mk, size: "s" } : { ...mk, size: "s" };
}

/**
 * The legend's entries and what it leaves unnamed (specs/decisions, "A legend for widths and marks", "The legend says only what the
 * agent named"): each edge style the diagram uses, then each edge width other than thin, from the thinnest,
 * each with the agent's words or none; then each mark the diagram names, drawn like the
 * first one found: layers top to bottom, nodes in order, slots in order.
 */
export function legendEntries(facts: Diagram, P: Paint): LegendEntry[] {
  const d = withFollowedWeights(facts);
  const kinds = new Set(d.edges.map((e) => e.kind));
  const out: LegendEntry[] = [];
  for (const style of EDGE_STYLES) {
    if (!EDGE_KINDS.some((k) => kinds.has(k) && edgeStyle(k) === style)) continue;
    const text = d.legend?.[style];
    out.push(text === undefined ? { style } : { style, text });
  }
  const widths = new Map<string, number>();
  for (const e of d.edges) {
    const w = e.weight;
    const px = edgeWidth(e, P);
    if (w !== undefined && w !== "thin" && px !== undefined) widths.set(weightKey(w), px);
  }
  const weighted: LegendEntry[] = [];
  for (const [weight, width] of widths) {
    const text = d.legend?.weights?.[weight];
    weighted.push({ style: "solid", weight, width, ...(text === undefined ? {} : { text }) });
  }
  // Sorting is stable: equal widths keep the order of the edges.
  weighted.sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const marks: LegendEntry[] = [];
  const seen = new Set<string>();
  for (const n of d.layers.flatMap((l) => l.nodes)) {
    for (const slot of MARK_SLOTS) {
      const mk = n.marks?.[slot];
      if (mk === undefined) continue;
      const name = markName(mk);
      const text = d.legend?.marks?.[name];
      if (text === undefined || seen.has(name)) continue;
      seen.add(name);
      marks.push({ text, mark: smallMark(mk) });
    }
  }
  return [...out, ...weighted, ...marks];
}

/** Items, by width, in edges no wider than `room`. An edge holds at least one item (specs/decisions, "A legend for widths and marks"). */
function wrapItems(
  widths: number[],
  room: number,
  gap: number,
): { items: number[]; width: number }[] {
  const rows: { items: number[]; width: number }[] = [];
  widths.forEach((w, i) => {
    const last = rows[rows.length - 1];
    if (last !== undefined && last.width + gap + w <= room) {
      last.items.push(i);
      last.width += gap + w;
    } else rows.push({ items: [i], width: w });
  });
  return rows;
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Does the axis-parallel run a-b pass through the inside of r? */
function segmentHits(a: Point, b: Point, r: Rect): boolean {
  if (a.y === b.y) {
    return (
      a.y > r.y && a.y < r.y + r.h && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.w
    );
  }
  return a.x > r.x && a.x < r.x + r.w && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.h;
}

/**
 * A label stays where the router put it while it still lies beside its edge, clear. A
 * route cut at a container (specs/decisions, "Edges that end at containers") can lose the part the label sat on, or leave
 * the label across the container's border: the label then moves beside a part
 * that remains, the longest first, above or below it, or right or left of it,
 * at its middle or one of its ends, stepping away from it while other edges
 * crowd it: the first place `free` accepts, clear of the border. `drawn` gives
 * the text in a place, which a step's badge may push out of it (specs/decisions, "Step
 * badges ride the edge"): the text too must be clear. Failing every place, no edge
 * moves for the label: it takes the first place `free` accepts across the border,
 * or else the first place, and is not clear (specs/decisions, "An edge never moves for its label").
 */
function besideRoute(
  points: Point[],
  at: AssembledLabel,
  boxes: Rect[],
  free: (r: Rect) => boolean,
  drawn: (r: Rect) => Rect,
): { at: AssembledLabel; clear: boolean } {
  const near = ROUTE.labelGap + 4;
  const across = (r: Rect) =>
    boxes.some(
      (b) =>
        overlaps(r, b) &&
        !(r.x >= b.x && r.x + r.w <= b.x + b.w && r.y >= b.y && r.y + r.h <= b.y + b.h),
    );
  const fits = (r: Rect) => {
    const t = drawn(r);
    return free(r) && (t === r || free(t));
  };
  const clear = (r: Rect) => !across(r) && !across(drawn(r)) && fits(r);
  const parts: [Point, Point][] = [];
  const keep = clear(at);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const dx = Math.max(0, at.x - Math.max(a.x, b.x), Math.min(a.x, b.x) - (at.x + at.w));
    const dy = Math.max(0, at.y - Math.max(a.y, b.y), Math.min(a.y, b.y) - (at.y + at.h));
    if (keep && Math.max(dx, dy) <= near) return { at, clear: true };
    parts.push([a, b]);
  }
  const span = ([a, b]: [Point, Point]) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  parts.sort((p, q) => span(q) - span(p));
  // Right beside each part first; then, where other edges crowd it, stepping away
  // from it, up to twice the label's size, past the edges in the way.
  const besides = (away: number) =>
    parts.flatMap(([a, b]) => {
      const gap = ROUTE.labelGap + away;
      if (a.y === b.y) {
        const lo = Math.min(a.x, b.x);
        const hi = Math.max(a.x, b.x);
        const xs = [(lo + hi) / 2 - at.w / 2, lo + ROUTE.labelGap, hi - ROUTE.labelGap - at.w];
        return [a.y - gap - at.h, a.y + gap].flatMap((y) => xs.map((x) => ({ x, y })));
      }
      const lo = Math.min(a.y, b.y);
      const hi = Math.max(a.y, b.y);
      const ys = [(lo + hi) / 2 - at.h / 2, lo + ROUTE.labelGap, hi - ROUTE.labelGap - at.h];
      return [a.x + gap, a.x - gap - at.w].flatMap((x) => ys.map((y) => ({ x, y })));
    });
  const reach = 2 * Math.max(at.w, at.h);
  const places = [];
  for (let away = 0; away <= reach; away += 4) places.push(...besides(away));
  // Last, past an end of the route, beside where the edge would go on: a part too short for
  // the label, cut at a border, leaves it room only outside the border.
  const past = (p: Point, q: Point) => {
    const gap = ROUTE.labelGap;
    if (p.x === q.x) {
      const y = q.y > p.y ? p.y - gap - at.h : p.y + gap;
      return [p.x + gap, p.x - gap - at.w].map((x) => ({ x, y }));
    }
    const x = q.x > p.x ? p.x - gap - at.w : p.x + gap;
    return [p.y - gap - at.h, p.y + gap].map((y) => ({ x, y }));
  };
  const [p0, p1] = [points[0], points[1]];
  const [pn, pm] = [points[points.length - 1], points[points.length - 2]];
  if (p0 !== undefined && p1 !== undefined) places.push(...past(p0, p1));
  if (pn !== undefined && pm !== undefined) places.push(...past(pn, pm));
  const rects = places.map((p) => ({ x: p.x, y: p.y, w: at.w, h: at.h }));
  const place = rects.find(clear);
  if (place !== undefined) return { at: { ...at, ...place }, clear: true };
  const first = rects.find(fits) ?? rects[0];
  return { at: first === undefined ? at : { ...at, ...first }, clear: false };
}

/**
 * A label on a vertical run of its edge sits at the run's middle, or as near it as `free`
 * allows, on its way back to where the gutter seated it (specs/decisions, "An edge's label
 * sits on its edge"). It keeps off the run's ends, which may carry a corner or an arrowhead.
 */
function centred(points: Point[], at: AssembledLabel, free: (r: Rect) => boolean): AssembledLabel {
  const cx = at.x + at.w / 2;
  const cy = at.y + at.h / 2;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    if (a.x !== b.x || Math.abs(a.x - cx) > 1 || cy < y0 || cy > y1) continue;
    const lo = y0 + ROUTE.onArrow;
    const hi = y1 - ROUTE.onArrow - at.h;
    if (hi < lo) return at;
    const mid = (lo + hi) / 2;
    const way = at.y < mid ? -4 : 4;
    for (let y = mid; way < 0 ? y > at.y : y < at.y; y += way) {
      if (y >= lo && y <= hi && free({ ...at, y })) return { ...at, y };
    }
    return at;
  }
  return at;
}

/**
 * A label the gutter seated off its edge goes onto its edge where `free` finds room: the gutter
 * counts every edge in its height, though a run may leave the label's own height clear. Longest
 * run first, nearest the run's middle first (specs/decisions, "An edge's label sits on its edge").
 */
function ontoEdge(points: Point[], at: AssembledLabel, free: (r: Rect) => boolean): AssembledLabel {
  const runs = points.slice(1).flatMap((b, i) => {
    const a = points[i] as Point;
    return a.x === b.x || a.y === b.y
      ? [{ a, b, len: Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }]
      : [];
  });
  const through = runs.some(({ a, b }) =>
    a.x === b.x
      ? a.x >= at.x &&
        a.x <= at.x + at.w &&
        Math.min(a.y, b.y) < at.y + at.h &&
        Math.max(a.y, b.y) > at.y
      : a.y >= at.y &&
        a.y <= at.y + at.h &&
        Math.min(a.x, b.x) < at.x + at.w &&
        Math.max(a.x, b.x) > at.x,
  );
  if (through) return at;
  for (const { a, b } of [...runs].sort((p, q) => q.len - p.len)) {
    const down = a.x === b.x;
    const pad = down ? ROUTE.onArrow : ON_CLEAR;
    const size = down ? at.h : at.w;
    const lo = Math.min(down ? a.y : a.x, down ? b.y : b.x) + pad;
    const hi = Math.max(down ? a.y : a.x, down ? b.y : b.x) - pad - size;
    if (hi < lo) continue;
    const mid = (lo + hi) / 2;
    for (let d = 0; d <= (hi - lo) / 2 + 1e-9; d += 4) {
      for (const p of d > 0 ? [mid - d, mid + d] : [mid]) {
        const r = down ? { ...at, x: a.x - at.w / 2, y: p } : { ...at, x: p, y: a.y - at.h / 2 };
        const others = runs.filter((o) => o.a !== a);
        if (others.every((o) => !segmentHits(o.a, o.b, r)) && free(r)) return r;
      }
    }
  }
  return at;
}

const empty = (role: PlacedText["role"], x: number, y: number): PlacedText => ({
  role,
  runs: [],
  bbox: { x, y, w: 0, h: 0 },
});

function compute(facts: Diagram, m: Measurer, withText: boolean): { scene: Scene; centre: number } {
  // The diagram's theme decides the type sizes here and the paint in the scene (specs/decisions, "Themes and stylesheets").
  const theme = themeOf(facts);
  const T = theme.type;
  // Nodes placed by steps sit in layers from here on (specs/decisions, "Steps from another node").
  const sized = withSizes(placeSteps(withFollowedWeights(facts)).d, m);
  // Column lanes keep each layer in lane order (specs/decisions, "Lanes run one way"); a file edited by hand may not.
  orderByLanes(sized);
  orderByColumns(sized);
  // Container ends route to a stand-in node and are cut at the container (specs/decisions, "Edges that end at containers").
  const ends = planEnds(sized);
  const d: Diagram = { ...sized, edges: ends.edges };
  const sp = spacingOf(d);
  // A layer's margins: its own, its nodes', its lane's and those of the groups that start or end in it (specs/decisions,
  // "Styles set spacing as CSS does, and a later style wins").
  const marginAt = layerMargins(d);

  const followable = everyNode(d);
  const labelStyle = T["edge-label"];
  const labelMetrics = m.metrics(labelStyle);
  const labelH = labelMetrics.ascent + labelMetrics.descent;
  const labelSizes = new Map<string, LabelBox>();
  // How far an edge's arrowheads reach, at its start and its end.
  const headsOf = (e: Diagram["edges"][number]) => {
    const head = strokeLook(edgeWidth(e, theme.paint), theme.paint).arrow.length;
    return { start: e.both === true ? head : 0, end: hasHead(e.kind) ? head : 0 };
  };
  for (const e of d.edges) {
    const text = e.label === "" ? undefined : e.label;
    if (text === undefined && e.step === undefined) continue;
    // A step's badge rides the edge under one end of its label's text, and the text stands
    // off it (specs/decisions, "Step badges ride the edge"): the router finds room for both.
    const step = e.step !== undefined;
    const size = (w: number, h: number) =>
      !step
        ? { w, h }
        : text === undefined
          ? { w: 2 * STEP.r, h: STEP.r - ROUTE.labelGap }
          : { w: w + STEP.r, h: h + STEP.lift };
    // A stated break holds on every form (specs/decisions, "An agent sets a label's breaks and its alignment").
    const stated = text === undefined ? [] : m.wrap(text, labelStyle, Number.POSITIVE_INFINITY);
    const w = Math.max(0, ...stated.map((l) => l.width));
    const h = labelH + Math.max(0, stated.length - 1) * labelMetrics.lineHeight;
    let forms: LabelForm[] | undefined;
    labelSizes.set(e.id, {
      ...size(w, h),
      ...(step ? { badge: headsOf(e) } : {}),
      ...(e.seat === "beside" ? { beside: true } : {}),
      narrower: () => {
        forms ??=
          text === undefined
            ? []
            : narrower(text, w, m, T).map((f) => ({ ...f, ...size(f.w, f.h) }));
        return forms;
      },
    });
  }
  const groupStyle = T["group-label"];
  const groupSubStyle = T["group-sublabel"];
  const labelW = (g: { label: string }) => m.measure(g.label, groupStyle).width;
  // A group's label and its quieter second part take one span: edges keep clear of both.
  const groupW = new Map(
    (d.groups ?? []).map((g) => [
      g.id,
      labelW(g) +
        (g.sublabel === undefined
          ? 0
          : GROUP.sublabelGap + m.measure(g.sublabel, groupSubStyle).width),
    ]),
  );
  const sideways = planSideways(
    d,
    (id) => labelSizes.get(id)?.w,
    (id) => labelSizes.get(id)?.h ?? labelH,
    (id) => {
      const s = labelSizes.get(id);
      return s?.badge === undefined && s?.beside !== true;
    },
  );
  // Edges that meet a column lane beside it (specs/decisions, "Lanes run one way"), and the node at their other end.
  const laneEnds = new Map<string, { lane: string; node: string }>();
  if (laneRun(d) === "columns") {
    for (const e of d.edges) {
      const plan = ends.ends.get(e.id);
      for (const side of ["from", "to"] as const) {
        const end = plan?.[side];
        if (end?.kind !== "lane" || end.across) continue;
        laneEnds.set(e.id, { lane: end.id, node: side === "from" ? e.to : e.from });
      }
    }
  }
  // Walls up and down (specs/decisions, "Walls as space"): each label wraps to a few words, and the wall is as wide as
  // its widest edge, or its least space.
  const wallStyle = T["layer-label"];
  const wallLines = new Map(
    (d.walls ?? []).map((w) => [
      w.id,
      w.label === undefined ? [] : m.wrap(w.label, wallStyle, WALL.labelWrap),
    ]),
  );
  const wallSpace = (id: string) =>
    Math.max(
      WALL.space,
      ceil4(Math.max(0, ...(wallLines.get(id) ?? []).map((l) => l.width)) + 2 * WALL.labelClear),
    );
  // Two numbered edges between the same neighbours need room for both badges side by
  // side, each clear of its edge's arrowheads (specs/decisions, "Step badges ride the edge").
  const numbered = new Map<string, number>();
  const factOf = new Map(d.edges.map((e) => [e.id, e]));
  for (const [id, slot] of sideways) {
    if (factOf.get(id)?.step === undefined) continue;
    const key = `${slot.left}\u0000${slot.right}`;
    numbered.set(key, (numbered.get(key) ?? 0) + 1);
  }
  const sideRoom = (id: string): number => {
    const e = factOf.get(id);
    const slot = sideways.get(id);
    if (e?.step === undefined || slot === undefined) return 0;
    if ((numbered.get(`${slot.left}\u0000${slot.right}`) ?? 0) < 2) return 0;
    const heads = headsOf(e);
    return 4 * STEP.r + heads.start + heads.end + 2 * STEP.arrowClear + 2 * STEP.r + STEP.clear;
  };
  const placement = placeAcross(d, {
    sideways,
    edgeLabelW: (id) => labelSizes.get(id)?.w,
    sideRoom,
    groupLabelW: (id) => groupW.get(id) ?? 0,
    laneEnds,
    wallSpace,
  });
  const { layers, nodes, groups } = placement;
  // Where each wall up and down runs across: from the right of what lies left of it to
  // the left of what lies right, nodes included; and the layers it spans.
  const besideWalls = (d.walls ?? []).flatMap((w) => {
    const way = wallRun(d, w);
    const split = way?.run === "beside" ? wallSplit(d, way) : undefined;
    if (split === undefined || "layer" in split) return [];
    const left = new Set(split.left);
    const right = new Set(split.right);
    const edges = (ids: Set<string>, side: "right" | "left") => [
      ...[...ids].flatMap((id) => {
        const n = nodes.get(id);
        return n === undefined ? [] : [side === "right" ? n.x + n.w : n.x];
      }),
      ...groups
        .filter((g) => g.members.length > 0 && g.members.every((id) => ids.has(id)))
        .map((g) => (side === "right" ? g.x1 : g.x0)),
    ];
    const x0 = Math.max(...edges(left, "right"));
    const x1 = Math.min(...edges(right, "left"));
    return [{ wall: w, x0, x1, top: split.top, bottom: split.bottom }];
  });
  const refined = refineEnds(sized, ends, nodes);
  // Bars (specs/decisions, "A layer with no node as one bar"): a layer with no node that an edge ends at, or that has a look,
  // is one bar high, and each edge meets it straight past its other end. The router knows only nodes, so a
  // narrow stand-in sits in the bar there, shared by edges whose other ends lie close.
  const barStands = new Map<number, PNode[]>();
  const standOf = new Map<string, { from?: string; to?: string }>();
  for (const l of layers) {
    if (!ends.bars.has(l.id)) continue;
    l.layerH = BAR.h;
    const meets: { edge: string; side: "from" | "to"; x: number }[] = [];
    for (const e of refined) {
      for (const side of ["from", "to"] as const) {
        const other = nodes.get(side === "from" ? e.to : e.from);
        if (e[side] === l.id && other !== undefined)
          meets.push({ edge: e.id, side, x: centreX(other) });
      }
    }
    meets.sort((a, b) => a.x - b.x || cmpIds(a.edge, b.edge));
    const runs: (typeof meets)[] = [];
    for (const mt of meets) {
      const last = runs[runs.length - 1];
      const lastX = last?.[last.length - 1]?.x;
      if (last !== undefined && lastX !== undefined && mt.x - lastX < BAR.standW + BAR.standGap)
        last.push(mt);
      else runs.push([mt]);
    }
    const stands = runs.map((run, k): PNode => {
      const id = `${l.id}\u0000${k}`;
      for (const mt of run) standOf.set(mt.edge, { ...standOf.get(mt.edge), [mt.side]: id });
      const x0 = (run[0]?.x ?? 0) - BAR.standW / 2;
      const x1 = (run[run.length - 1]?.x ?? 0) + BAR.standW / 2;
      const node = { id, label: "", kind: "service" as const };
      return { id, node, layer: l.index, order: k, col: -1, x: x0, w: x1 - x0, h: BAR.h };
    });
    barStands.set(l.index, stands);
  }
  const routeEdges = refined.map((e) => {
    const s = standOf.get(e.id);
    return s === undefined ? e : { ...e, from: s.from ?? e.from, to: s.to ?? e.to };
  });
  const routeLayers = layers.map((l) => {
    const stands = barStands.get(l.index);
    return stands === undefined ? l : { ...l, nodes: stands };
  });
  const routeNodes = new Map(nodes);
  for (const stands of barStands.values()) for (const n of stands) routeNodes.set(n.id, n);

  // Bands (specs/decisions, "Edges that end at containers", "A layer with a look is drawn"): the layers an edge ends at or
  // that have a look, drawn across the content. Each band's label sits in its head above the layer, at the content's
  // left edge.
  let contentLeft = Number.POSITIVE_INFINITY;
  let contentRight = Number.NEGATIVE_INFINITY;
  for (const n of nodes.values()) {
    contentLeft = Math.min(contentLeft, n.x);
    contentRight = Math.max(contentRight, n.x + n.w);
  }
  for (const g of groups) {
    const [x0, x1] = reach(g);
    contentLeft = Math.min(contentLeft, x0);
    contentRight = Math.max(contentRight, x1);
  }
  const bandStyle = T["layer-label"];
  /** Where a layer's label starts at a fraction of its head, its own point meeting the head's. */
  const headX = (at: number, w: number) => {
    const left = contentLeft - BAND.padX + BAND.labelInset;
    const right = contentRight + BAND.padX - BAND.labelInset;
    return left + at * (right - left - w);
  };
  const bandLayers = new Map<
    number,
    { id: string; label?: string; labelX: number; labelW: number; bar: boolean; blocked?: true }
  >();
  layers.forEach((l, i) => {
    if (!ends.bands.has(l.id) || !Number.isFinite(contentLeft)) return;
    const stands = barStands.get(i);
    // The lane already says it (specs/decisions, "A band in a lane of its name draws no label").
    const laneId = d.layers.find((x) => x.id === l.id)?.lane;
    const inLane = d.lanes?.find((x) => x.id === laneId)?.label === l.label;
    const label = inLane ? undefined : l.label;
    // A layer with no label draws no name (specs/decisions, "A layer with a look is drawn"), and its band has no head.
    if (label === undefined) {
      const labelX = contentLeft - BAND.padX + BAND.labelInset;
      bandLayers.set(i, { id: l.id, labelX, labelW: 0, bar: stands !== undefined });
      return;
    }
    const labelW = m.measure(label, bandStyle).width;
    if (stands !== undefined) {
      // A bar's label is seated once the edges that pass it are routed, below.
      bandLayers.set(i, { id: l.id, label, labelX: Number.NaN, labelW, bar: true });
      return;
    }
    // The label goes above the first stretch of its layer with no node below it, so
    // that no edge into a node's top must cross it; failing that, left of the content.
    const need = labelW + 2 * GROUP.clear;
    let edge = contentLeft - BAND.padX + BAND.labelInset - GROUP.clear;
    let labelX: number | undefined;
    const fraction = d.layers[i]?.labelAt;
    const atFraction = fraction === undefined ? undefined : headX(fraction, labelW);
    if (atFraction !== undefined) {
      bandLayers.set(i, { id: l.id, label, labelX: atFraction, labelW, bar: false });
      return;
    }
    for (const n of [...l.nodes, undefined]) {
      const end = n === undefined ? contentRight + BAND.padX - BAND.labelInset + GROUP.clear : n.x;
      if (end - edge >= need) {
        labelX = edge + GROUP.clear;
        break;
      }
      if (n !== undefined) edge = Math.max(edge, n.x + n.w);
    }
    labelX ??= contentLeft - BAND.padX - labelW - GROUP.clear;
    bandLayers.set(i, { id: l.id, label, labelX, labelW, bar: false });
  });

  // Where no vertical edge may pass: a band's label, above its layer, and the label of an
  // edge that runs sideways, in the gap it crosses. A group's label moves no edge: an edge
  // across it refuses the write; nor does a bar's, seated once the edges are routed
  // (specs/decisions, "A group's label moves no node and no edge").
  const forbidTop = new Map<number, [number, number][]>();
  // No edge runs down through a wall up and down, in the layers it spans (specs/decisions, "Walls as space").
  for (const b of besideWalls) {
    for (let r = b.top; r <= b.bottom; r++) {
      forbidTop.set(r, [...(forbidTop.get(r) ?? []), [b.x0, b.x1]]);
    }
  }
  for (const [li, b] of bandLayers) {
    if (b.label === undefined || b.bar) continue;
    const list = forbidTop.get(li) ?? [];
    list.push([b.labelX - GROUP.labelClear, b.labelX + b.labelW + GROUP.labelClear]);
    forbidTop.set(li, list);
  }
  // A column lane's sides run the whole height: no edge runs along one.
  const run = laneRun(d);
  const colLanes = run === "columns" ? placement.lanes : [];
  const laneSides = colLanes.flatMap((l, k) => (k === 0 ? [l.x0, l.x1] : [l.x1]));
  if (laneSides.length > 0) {
    for (const l of layers) {
      const list = forbidTop.get(l.index) ?? [];
      for (const x of laneSides) list.push([x - LANE.lineClear, x + LANE.lineClear]);
      forbidTop.set(l.index, list);
    }
  }
  // Walls that run across (specs/decisions, "Walls as space"): each takes its own space in the gutter just below the
  // lowest layer of its upper side, after the gutter's tracks.
  const acrossWalls = (d.walls ?? []).flatMap((w) => {
    const way = wallRun(d, w);
    if (way?.run !== "across") return [];
    const gutter = Math.max(...way.first.map((id) => nodes.get(id)?.layer ?? 0));
    return [{ wall: w, gutter }];
  });
  // Where an edge between two nodes of a layer may not take the gutter above it: a wall
  // across there lies between the gutter's tracks and the layer, a wall up and down runs
  // through it or reaches into it, and a lane's border runs below its tracks.
  const closedAbove = new Map<number, [number, number][]>();
  const close = (li: number, span: [number, number]) =>
    closedAbove.set(li, [...(closedAbove.get(li) ?? []), span]);
  for (const { wall, gutter } of acrossWalls) {
    const xs = [...wall.between, ...wall.and].flatMap((id) => {
      const n = nodes.get(id);
      const g = groups.find((x) => x.id === id);
      return n !== undefined ? [n.x, n.x + n.w] : g !== undefined ? [g.x0, g.x1] : [];
    });
    if (xs.length > 0)
      close(gutter + 1, [Math.min(...xs) - WALL.reach, Math.max(...xs) + WALL.reach]);
  }
  // A wall up and down reaches past its nodes, into the gutters above and below its layers.
  for (const b of besideWalls) for (let r = b.top; r <= b.bottom + 1; r++) close(r, [b.x0, b.x1]);
  if (run === "layers") {
    const laneOf = (i: number) => d.layers[layers[i]?.index ?? -1]?.lane;
    for (let i = 1; i < layers.length; i++) {
      if (laneOf(i) !== laneOf(i - 1)) close(i, [-Infinity, Infinity]);
    }
  }
  const forbidGap = new Map<string, [number, number][]>();
  for (const [id, x0] of placement.sideLabels) {
    const slot = sideways.get(id);
    const right = slot === undefined ? undefined : nodes.get(slot.right);
    const w = labelSizes.get(id)?.w ?? 0;
    if (right === undefined) continue;
    const key = `${right.layer}:${right.order}`;
    const list = forbidGap.get(key) ?? [];
    list.push([x0 - GROUP.labelClear, x0 + w + GROUP.labelClear]);
    forbidGap.set(key, list);
  }
  const routing = routeAcross(routeLayers, routeNodes, routeEdges, labelSizes, sp.trackPitch, {
    sideways,
    forbidTop,
    forbidGap,
    sideLabelX: placement.sideLabels,
    alone: new Set(ends.ends.keys()),
    bandEnds: new Map(
      [...ends.ends].map(([id, p]) => [
        id,
        {
          from: p.from?.kind === "layer" && p.from.across,
          to: p.to?.kind === "layer" && p.to.across,
        },
      ]),
    ),
    closedAbove,
    boxes: placement.groups.map((g) => ({
      id: g.id,
      x0: g.x0,
      x1: g.x1,
      top: g.top,
      bottom: g.bottom,
      members: new Set(g.members),
    })),
    laneSides,
    // An edge meets a bar at its top or bottom, never at a stand-in's side.
    noSideExit: new Set([
      ...(run === "columns"
        ? [...ends.ends]
            .filter(([, p]) => p.from?.kind === "lane" || p.to?.kind === "lane")
            .map(([id]) => id)
        : []),
      ...standOf.keys(),
    ]),
  });

  // A bar's label sits in it, at its left, in the first stretch that no edge meets: 16 px clear of
  // the stand-ins of the edges that end at it, and of each edge that passes it, where the router ran
  // it. Failing that, left of the content and of those edges, and the bar reaches it. No edge moves
  // for it (specs/decisions, "A layer with no node as one bar", "Unreadable is refused and costly is reported").
  for (const [i, b] of bandLayers) {
    if (!b.bar || b.label === undefined) continue;
    const taken: [number, number][] = (barStands.get(i) ?? []).map((s) => [s.x, s.x + s.w]);
    for (const pl of routing.plans) {
      // As assembled: an edge runs down through each layer between its ends at its gap's x.
      let x = pl.turn ?? pl.srcPort;
      pl.between.forEach((li, j) => {
        x = pl.gapX[j] ?? x;
        if (li === i) taken.push([x, x]);
      });
    }
    taken.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    let edge = contentLeft - BAND.padX + BAND.labelInset;
    let labelX: number | undefined;
    const stated = d.layers[i]?.labelAt;
    if (stated !== undefined) {
      const x = headX(stated, b.labelW);
      const hit = taken.some((s) => s[0] - GROUP.clear < x + b.labelW && x < s[1] + GROUP.clear);
      bandLayers.set(i, { ...b, labelX: x, ...(hit ? { blocked: true as const } : {}) });
      continue;
    }
    for (const s of [...taken, undefined]) {
      const end = s === undefined ? contentRight + BAND.padX - BAND.labelInset : s[0] - GROUP.clear;
      if (end - edge >= b.labelW) {
        labelX = edge;
        break;
      }
      if (s !== undefined) edge = Math.max(edge, s[1] + GROUP.clear);
    }
    const left = Math.min(
      contentLeft - BAND.padX - BAND.labelInset,
      ...taken.map((s) => s[0] - GROUP.clear),
    );
    bandLayers.set(i, { ...b, labelX: labelX ?? left - b.labelW });
  }
  // A band reaches the label it carries, when that sits left of the content.
  const bandLeft = Math.min(
    contentLeft - BAND.padX,
    ...[...bandLayers.values()].map((b) => b.labelX - BAND.labelInset),
  );

  // Across: the content is symmetric about the centre line.
  let half = 0;
  let low = 0;
  let high = 0;
  const see = (x: number) => {
    if (!Number.isFinite(x)) return;
    half = Math.max(half, Math.abs(x));
    low = Math.min(low, x);
    high = Math.max(high, x);
  };
  for (const n of nodes.values()) {
    see(n.x);
    see(n.x + n.w);
  }
  for (const g of groups) {
    const [x0, x1] = reach(g);
    see(x0);
    see(x1);
  }
  if (bandLayers.size > 0) {
    see(bandLeft);
    see(contentRight + BAND.padX);
  }
  for (const [id, x0] of placement.sideLabels) {
    see(x0);
    see(x0 + (labelSizes.get(id)?.w ?? 0));
  }
  if (Number.isFinite(routing.minX)) see(routing.minX - 16);
  if (Number.isFinite(routing.maxX)) see(routing.maxX + 16);

  // Lanes (specs/decisions, "Lanes run one way"). Layer lanes share one header column, left of everything the layers
  // hold, edges included. Column lanes have a header on top, as wide as the lane.
  const laneStyle = T["lane-label"];
  const laneLh = lineHeight("lane-label", m, T);
  const layerLanes: { id: string; label: string; first: number; last: number }[] = [];
  if (run === "layers") {
    for (const lane of d.lanes ?? []) {
      const laneLayers = layers
        .filter((l) => d.layers[l.index]?.lane === lane.id)
        .map((l) => l.index);
      if (laneLayers.length === 0) continue;
      layerLanes.push({
        id: lane.id,
        label: lane.label,
        first: laneLayers[0] as number,
        last: laneLayers[laneLayers.length - 1] as number,
      });
    }
  }
  let laneLeft = 0;
  let laneRight = 0;
  let headW = 0;
  if (layerLanes.length > 0 && Number.isFinite(contentLeft)) {
    const widest = Math.max(...layerLanes.map((x) => m.measure(x.label, laneStyle).width));
    headW = ceil4(Math.min(widest, LANE.headMax) + 2 * LANE.labelInset);
    let left = bandLayers.size > 0 ? bandLeft : contentLeft;
    let right = bandLayers.size > 0 ? contentRight + BAND.padX : contentRight;
    if (Number.isFinite(routing.minX)) left = Math.min(left, routing.minX);
    if (Number.isFinite(routing.maxX)) right = Math.max(right, routing.maxX);
    laneLeft = left - LANE.padX - headW;
    laneRight = right + LANE.padX;
    see(laneLeft);
    see(laneRight);
  }
  const laneAt = (i: number) => layerLanes.find((x) => x.first <= i && i <= x.last)?.id;
  const colLines = colLanes.map((l) =>
    withText ? m.wrap(l.label, laneStyle, l.x1 - l.x0 - 2 * LANE.labelInset) : [],
  );
  const headH =
    colLanes.length === 0
      ? 0
      : ceil4(2 * LANE.labelTop + Math.max(1, ...colLines.map((ls) => ls.length)) * laneLh);
  for (const l of colLanes) {
    see(l.x0);
    see(l.x1);
  }
  // Layer lanes hold everything across, header included, and a group's label outside its
  // left or right side reaches out on one side only: the picture centres on what it holds,
  // not on the centre line, so that the header's or label's width is not mirrored as empty space.
  const [lo, hi] = layerLanes.length > 0 ? [laneLeft, laneRight] : [low, high];
  const offCentre =
    layerLanes.length > 0 || groups.some((g) => outsideOf(g, "left") || outsideOf(g, "right"));
  const shift = offCentre ? Math.round((lo + hi) / 8) * 4 : 0;
  if (offCentre) half = Math.max(shift - lo, hi - shift);
  half = ceil4(Math.max(half, 80));

  // The frame: title, subtitle and legend at the top, the footnote at the bottom.
  let title = withText
    ? placeLine("title", d.title, sp.margin.left, sp.margin.top, m, T)
    : empty("title", sp.margin.left, sp.margin.top);
  const legendStyle = T.legend;
  // The legend draws only what the agent named (specs/decisions, "The legend says only what the agent named").
  const items = withText
    ? legendEntries(d, theme.paint).filter((it): it is LegendItem => it.text !== undefined)
    : [];
  // An edge's sample is a short edge; a mark's is the mark (specs/decisions, "A legend for widths and marks").
  const sampleW = items.map((it) =>
    it.mark === undefined ? FRAME.legendSample : markWidth(it.mark, m),
  );
  const itemW = items.map(
    (it, i) => (sampleW[i] ?? 0) + FRAME.legendLabelGap + m.measure(it.text, legendStyle).width,
  );
  const textW = Math.max(2 * half, FRAME.minTextWidth);
  // A legend wider than the room right of the title wraps into more edges (specs/decisions, "A legend for widths and marks").
  const legendRows = wrapItems(
    itemW,
    Math.max(0, ...itemW, textW - title.bbox.w - FRAME.legendGap),
    FRAME.legendItemGap,
  );
  const legendW = Math.max(0, ...legendRows.map((r) => r.width));
  const subLines =
    withText && d.subtitle !== undefined && d.subtitle !== ""
      ? m.wrap(d.subtitle, T.subtitle, textW)
      : [];
  const noteLines =
    withText && d.caption !== undefined && d.caption !== "" ? m.wrap(d.caption, T.note, textW) : [];
  const widest = (lines: { width: number }[]) => Math.max(0, ...lines.map((l) => l.width));
  const sides = sp.margin.left + sp.margin.right;
  const width = ceil8(
    Math.max(
      sides + 2 * half,
      sides + title.bbox.w + (items.length > 0 ? FRAME.legendGap + legendW : 0),
      sides + widest(subLines),
      sides + widest(noteLines),
    ),
  );
  const centre = (width + sp.margin.left - sp.margin.right) / 2 - shift;

  // The legend's first line is level with the title, and each further line starts
  // at the same left edge below it (specs/decisions, "A legend for widths and marks").
  const legend: SceneLegendItem[] = [];
  const lh = lineBox("legend", m, T);
  // A line of the legend is as high as its text, or as a mark when it lists one.
  const lineH = items.some((it) => it.mark !== undefined) ? Math.max(lh, MARK_STEP.s.h) : lh;
  const firstMid = title.bbox.y + title.bbox.h / 2;
  const legendPitch = lineH + FRAME.legendLineGap;
  legendRows.forEach((row, r) => {
    const mid = firstMid + r * legendPitch;
    let x = width - sp.margin.right - legendW;
    for (const i of row.items) {
      const it = items[i];
      if (it === undefined) continue;
      const w = sampleW[i] ?? 0;
      const h = MARK_STEP.s.h;
      legend.push({
        ...(it.style !== undefined ? { style: it.style } : {}),
        ...(it.width !== undefined ? { width: it.width } : {}),
        sample: { x1: x, x2: x + w, y: mid },
        ...(it.mark !== undefined
          ? { mark: { mark: it.mark, rect: { x, y: mid - h / 2, w, h } } }
          : {}),
        label: placeLine("legend", it.text, x + w + FRAME.legendLabelGap, mid - lh / 2, m),
      });
      x += (itemW[i] ?? 0) + FRAME.legendItemGap;
    }
  });
  const legendBottom = firstMid + (legendRows.length - 1) * legendPitch + lineH / 2;
  // A subtitle starts below the title, and below the legend when it wraps.
  const titleBottom = Math.max(title.bbox.y + ceil4(title.bbox.h), ceil4(legendBottom));
  // A stated title sits at a fraction of the picture's width, short of the legend, and a
  // subtitle follows it (specs/decisions, "A region's label sits at a fraction of a side").
  const stated = d.titleAt;
  const along = stated?.at ?? 0;
  const textRoom = width - sides;
  const titleRoom = textRoom - (items.length > 0 ? FRAME.legendGap + legendW : 0);
  const titleLine = (y: number) =>
    withText
      ? placeLine("title", d.title, sp.margin.left + along * (titleRoom - title.bbox.w), y, m, T)
      : empty("title", sp.margin.left, y);
  const subtitleAt = (y: number) =>
    subLines.length > 0
      ? placeLines("subtitle", subLines, sp.margin.left + along * textRoom, y, along, m, T)
      : undefined;
  const below = stated?.side === "bottom";
  if (stated !== undefined && !below) title = titleLine(sp.margin.top);
  let subtitle = below ? undefined : subtitleAt(titleBottom + FRAME.subtitleGap);
  const headBottom = below
    ? items.length > 0
      ? ceil4(legendBottom)
      : sp.margin.top - FRAME.titleGap
    : subtitle !== undefined
      ? subtitle.bbox.y + subtitle.bbox.h
      : titleBottom;

  // Down: layers and gutters. A gutter holds, top to bottom, the padding of the
  // groups whose last layer is above it, its tracks, and the head of the groups
  // whose first layer is below it. A head may rise beside the tracks, as in the
  // target, where no run, label or node of the gutter comes near the group; it
  // then adds only what the tracks do not already give it.
  // A node inside a node that starts in the same layer has its head below the outer
  // one's, and one that ends in the same layer its padding above it (specs/decisions, "Every layered diagram type").
  // A label in the foot takes the head's height there, and leaves a padding's at the top; a
  // label outside the node takes a head's height outside its side, and leaves a padding's
  // inside (specs/decisions, "The agent states where a group's label sits").
  const outside = (g: (typeof groups)[number], side: "top" | "bottom") =>
    outsideOf(g, side) ? GROUP.head : 0;
  const inHead = (g: (typeof groups)[number]) =>
    g.titleAt === undefined || (g.titleAt.side === "top" && g.titleAt.place === "inside");
  const inFoot = (g: (typeof groups)[number]) =>
    g.titleAt?.side === "bottom" && g.titleAt.place === "inside";
  const heads = (g: (typeof groups)[number]): number =>
    outside(g, "top") +
    (inHead(g) ? GROUP.head : GROUP.pad) +
    Math.max(0, ...groups.filter((c) => c.parent === g.id && c.top === g.top).map(heads));
  const pads = (g: (typeof groups)[number]): number =>
    outside(g, "bottom") +
    (inFoot(g) ? GROUP.head : GROUP.pad) +
    Math.max(0, ...groups.filter((c) => c.parent === g.id && c.bottom === g.bottom).map(pads));
  /** The height of the heads stacked above layer r, and of the paddings and feet below it. */
  const headsAt = (r: number) => Math.max(0, ...groups.filter((g) => g.top === r).map(heads));
  const padsAt = (r: number) => Math.max(0, ...groups.filter((g) => g.bottom === r).map(pads));
  /** A band that holds nodes has a head above its layer and a padding below; a bar has neither. */
  const bandHead = (r: number) => bandLayers.get(r)?.bar === false;
  /** A band's head holds its label; with none, it is a padding. */
  const bandHeadH = (r: number) => (bandLayers.get(r)?.label === undefined ? BAND.pad : BAND.head);
  const near = (g: (typeof groups)[number], lo: number, hi: number) =>
    lo < g.x1 + GROUP.clear && hi > g.x0 - GROUP.clear;
  /** Room the heads of the groups that start below gutter i still need, besides its tracks. */
  const headRoom = (i: number, tracks: number): number => {
    // A band's head sits above its groups' heads, below the tracks, in full.
    if (bandHead(i + 1)) return headsAt(i + 1) + bandHeadH(i + 1);
    const starting = groups.filter((g) => g.top === i + 1);
    if (starting.length === 0) return 0;
    const full = headsAt(i + 1);
    for (const g of starting) {
      for (const v of routing.gutters[i] ?? []) {
        if (v.row < 0) continue;
        if (v.hi - v.lo > 1e-6 && near(g, v.lo, v.hi)) return full;
        if (v.label !== undefined && near(g, v.label.x0, v.label.x0 + v.label.w)) return full;
      }
      for (const o of groups) if (o.bottom === i && near(g, o.x0, o.x1)) return full;
    }
    // A bar spans the content: the heads below it keep a group's gap from it.
    if (bandLayers.get(i)?.bar === true) return Math.max(0, full + GROUP.gap - tracks);
    const crowded = (layers[i]?.nodes ?? []).some((n) =>
      starting.some((g) => near(g, n.x, n.x + n.w)),
    );
    return Math.max(0, full + (crowded ? GROUP.clear : 0) - tracks);
  };
  const wallsAt = (i: number) => acrossWalls.filter((x) => x.gutter === i).length;
  /** Where the walls of gutter i start, top to bottom. */
  const wallTops = new Map<number, number>();
  const layerTops: number[] = [];
  const gutterTops: number[] = [];
  const endPads: number[] = [];
  let y = ceil4(headBottom + FRAME.titleGap);
  const lanesTop = y;
  if (colLanes.length > 0) y += headH + LANE.pad;
  if (laneAt(0) !== undefined) y += LANE.pad;
  y += headsAt(0);
  if (bandHead(0)) y += bandHeadH(0);
  /** Where a layer lane's border crosses gutter i, between two layers in different lanes. */
  const borders = new Map<number, number>();
  /** A layer that holds a store: the gutters beside it keep more room from its cylinders. */
  const storeLayer = (i: number) => (layers[i]?.nodes ?? []).some((n) => n.node.kind === "store");
  layers.forEach((l, i) => {
    // A margin adds to the row gap: the larger one above a gutter, and the larger one below it.
    if (i === 0) y += marginAt(l.id).top;
    layerTops.push(y);
    y += l.layerH;
    const rows = routing.rows[i] ?? 0;
    const last = i === layers.length - 1;
    const below = last ? 0 : marginAt(layers[i + 1]?.id ?? "").top;
    const pad =
      padsAt(i) +
      (bandHead(i) ? BAND.pad : 0) +
      (rows > 0 && storeLayer(i) ? ROUTE.storeRoom : 0) +
      marginAt(l.id).bottom;
    const walls = wallsAt(i);
    // A gutter with no runs keeps its least height only when no wall gives it room.
    const tracks = ceil4(
      rows === 0
        ? last || walls > 0
          ? 0
          : (sp.gutterSteps[0] ?? 48)
        : gutterHeight(rows, sp) + (storeLayer(i + 1) ? ROUTE.storeRoom : 0),
    );
    gutterTops.push(y);
    endPads.push(pad);
    if (!last && laneAt(i) !== laneAt(i + 1)) {
      // The border runs below the gutter's tracks and walls; heads below it take their full room.
      y += pad + (rows === 0 && walls === 0 ? LANE.pad : tracks);
      wallTops.set(i, y);
      y += walls * WALL.space;
      borders.set(i, y);
      y += below + LANE.pad + headsAt(i + 1) + (bandHead(i + 1) ? bandHeadH(i + 1) : 0);
      return;
    }
    if (walls > 0) {
      // Nothing is placed in a wall: the heads below it take their full room (specs/decisions, "Walls as space").
      y += pad + tracks;
      wallTops.set(i, y);
      y += walls * WALL.space + below + headRoom(i, 0);
      return;
    }
    const head = last ? 0 : headRoom(i, tracks);
    y += pad + tracks + below + head;
  });
  if (colLanes.length > 0 || laneAt(layers.length - 1) !== undefined) y += LANE.pad;
  const lanesBottom = y;
  let bottom = y;
  // Footnotes (specs/decisions, "Notes as callouts or footnotes") are listed below the content, above the footnote of specs/decisions, "Curation stays with the agent".
  const listTop = ceil4(y + FRAME.noteGap);
  // A note is a footnote where the agent says so (specs/decisions, "A note is what the agent states").
  const footnotes = new Set((d.notes ?? []).filter((x) => x.footnote === true).map((x) => x.on));
  const listH = withText ? footnotesHeight(d, footnotes, textW, m, T) : 0;
  if (listH > 0) {
    y = listTop + listH;
    bottom = y;
  }
  const note =
    noteLines.length > 0
      ? placeLines("note", noteLines, sp.margin.left, ceil4(y + FRAME.noteGap), "start", m, T)
      : undefined;
  if (note !== undefined) bottom = note.bbox.y + note.bbox.h;
  if (below) {
    title = titleLine(ceil4(bottom + FRAME.noteGap));
    bottom = title.bbox.y + title.bbox.h;
    subtitle = subtitleAt(ceil4(bottom) + FRAME.subtitleGap);
    if (subtitle !== undefined) bottom = subtitle.bbox.y + subtitle.bbox.h;
  }
  const height = ceil4(bottom + sp.margin.bottom);

  const layerH = (i: number) => layers[i]?.layerH ?? 0;
  const nodeTop = (layer: number, h: number) => (layerTops[layer] ?? 0) + (layerH(layer) - h) / 2;
  const assembled = assemble(routing, {
    centre,
    top: (n) => nodeTop(n.layer, n.h),
    layerMid: (layer) => (layerTops[layer] ?? 0) + layerH(layer) / 2,
    // Layers sit on fixed slots from the top of the gutter's tracks, so that a layer
    // keeps its place when layers are added below it.
    trackY: (g, row) =>
      (gutterTops[g] ?? 0) + (endPads[g] ?? 0) + trackLead(sp) + row * sp.trackPitch,
  });

  const layerLabelStyle = T["layer-label"];
  const sceneLayers: SceneLayer[] = layers.map((l, i) => {
    const top = layerTops[i] ?? 0;
    const h = layerH(i);
    const lines =
      withText && l.label !== undefined ? m.wrap(l.label, layerLabelStyle, 2 * half) : [];
    const label = placeLines("layer-label", lines, sp.margin.left, top, "start", m, T);
    return { id: l.id, band: { x: sp.margin.left, y: top, w: width - sides, h }, label };
  });

  const depthOf = (g: (typeof groups)[number]): number => {
    const parent = groups.find((p) => p.id === g.parent);
    return parent === undefined ? 1 : 1 + depthOf(parent);
  };
  // Outer nodes first, so that each is drawn under the nodes inside it.
  const outerFirst = groups
    .map((g, k) => ({ g, k }))
    .sort((a, b) => depthOf(a.g) - depthOf(b.g) || a.k - b.k)
    .map((x) => x.g);
  /** How far below where a label is placed its ink's middle lies. */
  const middleOf = (text: string) => {
    const b = placeLine("group-label", text, 0, 0, m, T).bbox;
    return b.y + b.h / 2;
  };
  /**
   * Where a label the agent did not place starts: the leftmost seat in its group's head, every
   * 4 px and the rightmost exactly, that no edge and no edge's label comes nearer than the
   * engine keeps its edges. No edge or node moves for it: where no seat is clear, it sits at
   * the left, and the write is refused as title-blocked (specs/decisions, "A group's label moves no node and no edge").
   */
  const seat = (g: (typeof groups)[number], ly: number): number => {
    const first = centre + g.x0 + GROUP.labelInset;
    if (!withText) return first;
    const last = centre + g.x1 - GROUP.labelInset - g.labelW;
    const xs: number[] = [];
    for (let x = first; x <= last + 1e-6; x += 4) xs.push(x);
    if (xs.length > 0 && (xs[xs.length - 1] as number) < last - 1e-6) xs.push(last);
    // The label and its sublabel take one span, as high as the label.
    const ink = placeLine("group-label", g.label, first, ly, m, T).bbox;
    const clr = GROUP.labelClear;
    const clear = (x: number) => {
      const r = { x: x - clr, y: ink.y - clr, w: g.labelW + 2 * clr, h: ink.h + 2 * clr };
      for (const a of assembled.values()) {
        if (segmentsOf(a.points).some((s) => segmentCrossesRect(s, r))) return false;
        if (a.label !== undefined && overlaps(a.label, r)) return false;
      }
      return true;
    };
    return xs.find(clear) ?? first;
  };
  const sceneGroups: SceneGroup[] = outerFirst.map((g) => {
    const y0 = (layerTops[g.top] ?? 0) - heads(g) + outside(g, "top");
    const y1 = (layerTops[g.bottom] ?? 0) + layerH(g.bottom) + pads(g) - outside(g, "bottom");
    const rect: Rect = { x: centre + g.x0, y: y0, w: g.x1 - g.x0, h: y1 - y0 };
    const groupLook = lookOf(
      d,
      d.groups?.find((x) => x.id === g.id),
      d.groups,
    );
    // In its head, in its foot, a head's height outside its top or bottom side, or beside its layers.
    const mid = withText ? middleOf(g.label) : 0;
    const along = g.titleAt?.at ?? 0.5;
    const ly = atSide(g)
      ? y0 + GROUP.labelTop + along * (y1 - y0 - 2 * GROUP.labelTop - 2 * mid)
      : (outsideOf(g, "top")
          ? y0 - GROUP.head
          : outsideOf(g, "bottom")
            ? y1
            : inFoot(g)
              ? y1 - GROUP.head
              : y0) + GROUP.labelTop;
    const lx = g.titleAt === undefined ? seat(g, ly) : centre + g.labelX;
    const label = withText
      ? placeLine("group-label", g.label, lx, ly, m, T)
      : empty("group-label", lx, ly);
    const out: SceneGroup = { id: g.id, rect, label, members: g.members };
    if (groupLook !== undefined) out.look = groupLook;
    if (depthOf(g) > 1) out.depth = depthOf(g);
    const sub = d.groups?.find((x) => x.id === g.id)?.sublabel;
    if (sub !== undefined && withText) {
      const x = lx + labelW(g) + GROUP.sublabelGap;
      out.sublabel = placeLine("group-sublabel", sub, x, ly, m, T);
    }
    return out;
  });

  const sceneBands: SceneBand[] = [...bandLayers].map(([i, b]): SceneBand => {
    // A layer's look is the agent's; without one, a bar is a node and a band a band.
    const box =
      (d.layers[i]?.look ?? (b.bar ? "box" : "band")) === "box" ? { box: true as const } : {};
    if (b.bar) {
      const y0 = layerTops[i] ?? 0;
      const rect: Rect = {
        x: centre + bandLeft,
        y: y0,
        w: contentRight + BAND.padX - bandLeft,
        h: layerH(i),
      };
      const top = y0 + (layerH(i) - lineHeight("layer-label", m, T)) / 2;
      if (b.label === undefined) return { id: b.id, rect, bar: true, ...box };
      const label = withText
        ? placeLine("layer-label", b.label, centre + b.labelX, top, m, T)
        : empty("layer-label", centre + b.labelX, top);
      const blocked = b.blocked === true ? { blocked: true as const } : {};
      return { id: b.id, rect, label, bar: true, ...box, ...blocked };
    }
    const y0 = (layerTops[i] ?? 0) - headsAt(i) - bandHeadH(i);
    const y1 = (layerTops[i] ?? 0) + layerH(i) + padsAt(i) + BAND.pad;
    const x0 = centre + bandLeft;
    const rect: Rect = { x: x0, y: y0, w: contentRight + BAND.padX - bandLeft, h: y1 - y0 };
    if (b.label === undefined) return { id: b.id, rect, ...box };
    const label = withText
      ? placeLine("layer-label", b.label, centre + b.labelX, y0 + BAND.labelTop, m, T)
      : empty("layer-label", centre + b.labelX, y0 + BAND.labelTop);
    return { id: b.id, rect, label, ...box };
  });
  const sceneLanes: SceneLane[] = [];
  const laneLabel = (
    id: string,
    lines: Line[],
    x: number,
    w: number,
    y: number,
    plain: LabelAlign,
    /** The room a layer lane's head leaves below its label. */
    spare = 0,
  ) => {
    const lane = d.lanes?.find((l) => l.id === id);
    const at = alignedIn(lane?.labelAlign ?? plain, x, w);
    const along = lane?.labelAt;
    if (along !== undefined && spare === 0 && plain === "center") {
      return placeLines("lane-label", lines, x + along * w, y + LANE.labelTop, along, m, T);
    }
    const down = along === undefined ? 0 : along * spare;
    return placeLines("lane-label", lines, at.x, y + LANE.labelTop + down, at.align, m, T);
  };
  for (const x of layerLanes) {
    const y0 = x.first === 0 ? lanesTop : (borders.get(x.first - 1) ?? 0);
    const y1 = x.last === layers.length - 1 ? lanesBottom : (borders.get(x.last) ?? 0);
    const rect: Rect = { x: centre + laneLeft, y: y0, w: laneRight - laneLeft, h: y1 - y0 };
    const lx = rect.x + LANE.labelInset;
    const lines = withText ? m.wrap(x.label, laneStyle, headW - 2 * LANE.labelInset) : [];
    sceneLanes.push({
      id: x.id,
      ...lookPart(
        d,
        d.lanes?.find((y) => y.id === x.id),
        d.lanes,
      ),
      run: "layers",
      rect,
      head: { x: rect.x, y: y0, w: headW, h: y1 - y0 },
      label: laneLabel(
        x.id,
        lines,
        lx,
        headW - 2 * LANE.labelInset,
        y0,
        "left",
        Math.max(0, y1 - y0 - 2 * LANE.labelTop - lines.length * laneLh),
      ),
    });
  }
  colLanes.forEach((l, k) => {
    const rect: Rect = { x: centre + l.x0, y: lanesTop, w: l.x1 - l.x0, h: lanesBottom - lanesTop };
    const cx = centre + (l.x0 + l.x1) / 2;
    const laneRoom = l.x1 - l.x0 - 2 * LANE.labelInset;
    sceneLanes.push({
      id: l.id,
      ...lookPart(
        d,
        d.lanes?.find((y) => y.id === l.id),
        d.lanes,
      ),
      run: "columns",
      rect,
      head: { x: rect.x, y: lanesTop, w: rect.w, h: headH },
      label: laneLabel(l.id, colLines[k] ?? [], cx - laneRoom / 2, laneRoom, lanesTop, "center"),
    });
  });
  const boxOf = new Map<string, Rect>();
  for (const g of sceneGroups) boxOf.set(g.id, g.rect);
  for (const b of sceneBands) boxOf.set(b.id, b.rect);
  for (const x of sceneLanes) boxOf.set(x.id, x.rect);
  const factsById = new Map(facts.edges.map((e) => [e.id, e]));

  const nodeLh = lineHeight("node-label", m, T);
  const subLh = lineHeight("node-sublabel", m, T);
  const sceneNodes: SceneNode[] = [];
  for (const l of layers) {
    for (const n of l.nodes) {
      const rect: Rect = { x: centre + n.x, y: nodeTop(l.index, n.h), w: n.w, h: n.h };
      const marks = markRects(n.node, rect, m);
      const texts: PlacedText[] = [];
      const inset = leftInset(n.node, m);
      // A dot's label stays in the file and in show, but is not drawn (specs/decisions, "Every layered diagram type").
      if (withText && !isDot(n.node.kind)) {
        const {
          label: lines,
          sub,
          room,
        } = nodeLines(n.node.kind, n.w, n.h, n.node.label, n.node.sublabel, m, T, inset);
        const block = lines.length * nodeLh + sub.length * subLh;
        const top = textTop(n.node.kind, rect, block);
        // A left mark takes a column, so the text centres in what is left.
        const cx = rect.x + rect.w / 2 + inset / 2;
        const at = alignedIn(n.node.labelAlign, cx - room / 2, room);
        texts.push(placeLines("node-label", lines, at.x, top, at.align, m, T));
        if (sub.length > 0) {
          texts.push(
            placeLines("node-sublabel", sub, at.x, top + lines.length * nodeLh, at.align, m, T),
          );
        }
      }
      sceneNodes.push({
        id: n.id,
        layer: l.id,
        kind: n.node.kind,
        emphasis: n.node.emphasis ?? false,
        ...lookPart(d, n.node, followable),
        rect,
        ...(marks.length > 0 ? { marks } : {}),
        texts,
      });
    }
  }

  // What a label moved off a cut route must keep clear of: nodes, edges, other labels and text.
  const labelAt = new Map<string, Rect>();
  for (const [id, a] of assembled) if (a.label !== undefined) labelAt.set(id, a.label);
  const captions: Rect[] = [
    ...sceneGroups.flatMap((g) => [g.label.bbox, ...(g.sublabel ? [g.sublabel.bbox] : [])]),
    ...sceneBands.flatMap((b) => (b.label === undefined ? [] : [b.label.bbox])),
    ...sceneLanes.map((x) => x.head),
  ];
  const solid: Rect[] = [...sceneNodes.map((n) => n.rect), ...captions];
  const clearOf = (id: string) => (r: Rect) => {
    const pad = ROUTE.labelClear / 2;
    const wide = { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad };
    if (solid.some((s) => overlaps(wide, s))) return false;
    // The border of a group or a band is an edge: the label lies wholly inside the node or
    // wholly outside it.
    const within = (b: Rect) =>
      wide.x >= b.x &&
      wide.x + wide.w <= b.x + b.w &&
      wide.y >= b.y &&
      wide.y + wide.h <= b.y + b.h;
    const borders = [...sceneGroups, ...sceneBands].map((x) => x.rect);
    if (borders.some((b) => overlaps(wide, b) && !within(b))) return false;
    for (const [other, l] of labelAt) if (other !== id && overlaps(wide, l)) return false;
    // A label still to come stands where the gutter seated it.
    for (const [other, a] of assembled) {
      if (other === id || labelAt.has(other) || a.label === undefined) continue;
      if (overlaps(wide, a.label)) return false;
    }
    // Clear of every other edge as routed, and as drawn: an edge that meets a band may
    // since run straight on into it.
    for (const [other, a] of assembled) {
      if (other === id) continue;
      for (const pts of [a.points, routes.get(other) ?? []]) {
        for (let i = 1; i < pts.length; i++) {
          if (segmentHits(pts[i - 1] as Point, pts[i] as Point, wide)) return false;
        }
      }
    }
    return true;
  };

  // A container end's route stops at its node.
  const routes = new Map<string, Point[]>();
  for (const e of d.edges) {
    const a = assembled.get(e.id);
    if (a === undefined) continue;
    let points = a.points;
    const plan = ends.ends.get(e.id);
    const toBox = plan?.to === undefined ? undefined : boxOf.get(plan.to.id);
    const fromBox = plan?.from === undefined ? undefined : boxOf.get(plan.from.id);
    if (toBox !== undefined) points = cutRoute(points, toBox, "end");
    if (fromBox !== undefined) points = cutRoute(points, fromBox, "start");
    routes.set(e.id, points);
  }
  // An edge that meets a band across layers runs straight into it where it can: clear of
  // every node and text, of the router's label slots, and of every other edge.
  const edgeClear = (id: string) => (a: Point, b: Point) => {
    const pad = (r: Rect, p: number) => ({
      x: r.x - p,
      y: r.y - p,
      w: r.w + 2 * p,
      h: r.h + 2 * p,
    });
    // The edge starts at its own end node; every other node and text is in its way.
    const real = factsById.get(id);
    const own = new Set([real?.from, real?.to]);
    const inWay = [...sceneNodes.filter((n) => !own.has(n.id)).map((n) => n.rect), ...captions];
    if (inWay.some((r) => segmentHits(a, b, pad(r, ROUTE.labelClear)))) return false;
    for (const [other, o] of assembled) {
      if (
        other !== id &&
        o.label !== undefined &&
        segmentHits(a, b, pad(o.label, ROUTE.labelClear))
      )
        return false;
    }
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    for (const [other, pts] of routes) {
      if (other === id) continue;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1] as Point;
        const q = pts[i] as Point;
        if (p.y === q.y) {
          const across = a.x > Math.min(p.x, q.x) - 1 && a.x < Math.max(p.x, q.x) + 1;
          if (across && p.y > y0 - 1 && p.y < y1 + 1) return false;
        } else if (Math.abs(p.x - a.x) < ROUTE.runSeparation) {
          if (Math.min(Math.max(p.y, q.y), y1) - Math.max(Math.min(p.y, q.y), y0) > 0) return false;
        }
      }
    }
    return true;
  };
  for (const e of d.edges) {
    const plan = ends.ends.get(e.id);
    let points = routes.get(e.id);
    if (plan === undefined || points === undefined) continue;
    for (const [end, at] of [
      [plan.to, "end"],
      [plan.from, "start"],
    ] as const) {
      const band = end?.kind === "layer" && end.across ? boxOf.get(end.id) : undefined;
      if (band !== undefined) points = straightIntoBand(points, band, at, edgeClear(e.id));
    }
    routes.set(e.id, points);
  }

  // Which ends of an edge meet a group, a layer or a lane it ends at (specs/decisions, "Step badges ride the edge").
  const insideOf = (id: string) => {
    const plan = ends.ends.get(id);
    return { start: plan?.from !== undefined, end: plan?.to !== undefined };
  };
  /** Gutters as a refusal names them: the layers above and below each. */
  const gutterNames = (gs: number[]) =>
    gs.map((g) => `${layers[g]?.id ?? "-"}/${layers[g + 1]?.id ?? "-"}`);
  const planOf = new Map(routing.plans.map((p) => [p.edge.id, p]));
  const holds = (b: Rect, r: Rect) =>
    r.x >= b.x && r.x + r.w <= b.x + b.w && r.y >= b.y && r.y + r.h <= b.y + b.h;
  const inWall = (r: Rect) =>
    [...wallTops].some(([g, y]) => r.y < y + wallsAt(g) * WALL.space && r.y + r.h > y);
  const sceneEdges: SceneEdge[] = [];
  for (const e of d.edges) {
    const a = assembled.get(e.id);
    const points = routes.get(e.id);
    if (a === undefined || points === undefined) continue;
    // The scene names the edge's real ends.
    const real = factsById.get(e.id) ?? e;
    const plan = ends.ends.get(e.id);
    const toBox = plan?.to === undefined ? undefined : boxOf.get(plan.to.id);
    const fromBox = plan?.from === undefined ? undefined : boxOf.get(plan.from.id);
    const edge: SceneEdge = { id: e.id, from: real.from, to: real.to, kind: e.kind, points };
    const edgeLook = lookOf(d, real, facts.edges);
    if (edgeLook !== undefined) edge.look = edgeLook;
    const labelLook = lookOf(
      d,
      e.labelStyle === undefined && e.labelLook === undefined
        ? undefined
        : {
            id: e.id,
            ...e.labelLook,
            ...(e.labelStyle === undefined ? {} : { style: e.labelStyle }),
          },
    );
    if (labelLook !== undefined) edge.labelLook = labelLook;
    if (e.both === true) edge.both = true;
    const routed = planOf.get(e.id);
    const unmet = [
      ...(routed !== undefined && e.out !== undefined && e.out !== routed.srcSide
        ? [{ end: "out" as const, stated: e.out, drawn: routed.srcSide }]
        : []),
      ...(routed !== undefined && e.in !== undefined && e.in !== routed.dstSide
        ? [{ end: "in" as const, stated: e.in, drawn: routed.dstSide }]
        : []),
    ];
    if (unmet.length > 0) edge.unmet = unmet;
    const blocked = routing.blocked.get(e.id);
    if (blocked !== undefined) edge.blocked = gutterNames(blocked);
    const width = edgeWidth(e, theme.paint);
    if (width !== undefined && width !== theme.paint.edge.strokeWidth) edge.width = width;
    const text = e.label === "" ? undefined : e.label;
    if (a.label !== undefined && (text !== undefined || e.step !== undefined) && withText) {
      // The text takes the slot, or stands off the step's badge in it (specs/decisions, "Step badges ride the edge").
      const ink = labelMetrics.ascent + labelMetrics.descent;
      const lines =
        text !== undefined && (a.label.lines > 1 || text.includes("\n"))
          ? m.wrap(text, labelStyle, a.label.maxWidth)
          : [];
      const th = lines.length > 1 ? (lines.length - 1) * labelMetrics.lineHeight + ink : ink;
      const tw = e.step === undefined ? a.label.w : text === undefined ? 0 : a.label.w - STEP.r;
      const head = strokeLook(width, theme.paint).arrow.length;
      const heads = { start: e.both === true ? head : 0, end: hasHead(e.kind) ? head : 0 };
      const stepIn = (slot: Rect) =>
        stepPlace(points, slot, { w: tw, h: th }, heads, insideOf(e.id));
      const drawn = (slot: Rect): Rect => {
        if (e.step === undefined || tw === 0) return slot;
        const { text: p } = stepIn(slot);
        return { x: p.x, y: p.y, w: tw, h: th };
      };
      // A lane's border is kept clear of as the container's is.
      const cutAt = [toBox, fromBox, ...sceneLanes.map((x) => x.rect)].filter(
        (b): b is Rect => b !== undefined,
      );
      let at = a.label;
      if (points !== a.points) {
        const moved = besideRoute(points, a.label, cutAt, clearOf(e.id), drawn);
        at = moved.at;
        // No place beside what is left of the edge holds it: the write is refused.
        if (!moved.clear) edge.blocked ??= gutterNames(planOf.get(e.id)?.gutters ?? []);
      }
      if (e.step === undefined && e.seat === undefined) {
        // Clear of what is near as a label in a gutter is, and of a lane's border and a wall.
        const clearHere = clearOf(e.id);
        const open = (r: Rect) => {
          const wide = { x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 };
          const cut = sceneLanes.some((l) => overlaps(wide, l.rect) && !holds(l.rect, wide));
          return !cut && !inWall(wide) && clearHere(wide);
        };
        // Step badges look for their places once every label has its seat, so a picture
        // with steps keeps the seats the gutters left them room around.
        const numbered = d.edges.some((x) => x.step !== undefined);
        at = centred(points, numbered ? at : ontoEdge(points, at, open), open);
      }
      labelAt.set(e.id, at);
      let top = { x: at.x, y: at.y };
      if (e.step !== undefined) {
        const place = stepIn(at);
        edge.step = numberBadge(e.step, place.at.x, place.at.y, STEP.r, m, T);
        top = place.text;
      }
      if (lines.length > 1) {
        // A wrapped label: its lines centred on each other, its ink box at its place.
        const lead = (labelMetrics.lineHeight - ink) / 2;
        const place = alignedIn(e.labelAlign, top.x, tw);
        edge.label = placeLines("edge-label", lines, place.x, top.y - lead, place.align, m, T);
      } else if (text !== undefined) {
        edge.label = placeLine("edge-label", text, top.x, top.y, m, T);
      }
    }
    sceneEdges.push(edge);
  }

  // Walls (specs/decisions, "Walls as space"): each as long as the nodes of its sides. A labelled one draws a dashed
  // edge through its middle, and its label above the edge at the first place along
  // it that no crossing edge comes near.
  const nodeRects = new Map(sceneNodes.map((n) => [n.id, n.rect]));
  steerEdges({
    edges: sceneEdges,
    facts: factsById,
    nodes: nodeRects,
    objects: new Map([...nodeRects, ...sceneGroups.map((g) => [g.id, g.rect] as const)]),
  });
  const sceneWalls: SceneWall[] = [];
  const boxRects = new Map<string, Rect>([
    ...sceneNodes.map((n) => [n.id, n.rect] as const),
    ...sceneGroups.map((g) => [g.id, g.rect] as const),
  ]);
  const stacked = new Map<number, number>();
  for (const { wall, gutter } of acrossWalls) {
    const k = stacked.get(gutter) ?? 0;
    stacked.set(gutter, k + 1);
    const rects = [...wall.between, ...wall.and].flatMap((id) => boxRects.get(id) ?? []);
    if (rects.length === 0) continue;
    const x0 = Math.min(...rects.map((r) => r.x)) - WALL.reach;
    const x1 = Math.max(...rects.map((r) => r.x + r.w)) + WALL.reach;
    const y0 = (wallTops.get(gutter) ?? 0) + k * WALL.space;
    const out: SceneWall = {
      id: wall.id,
      run: "across",
      rect: { x: x0, y: y0, w: x1 - x0, h: WALL.space },
    };
    if (wall.label !== undefined) {
      const mid = y0 + WALL.space / 2;
      out.line = { a: { x: x0, y: mid }, b: { x: x1, y: mid } };
      if (withText) {
        const lh = lineBox("layer-label", m, T);
        const w = m.measure(wall.label, T["layer-label"]).width;
        const top = mid - WALL.labelGap - lh;
        // The x of every edge that runs down or up through the label's height.
        const crossing = sceneEdges
          .flatMap((e) =>
            e.points.slice(1).flatMap((b, j) => {
              const a = e.points[j] as Point;
              const lo = Math.min(a.y, b.y);
              const hi = Math.max(a.y, b.y);
              return a.x === b.x && lo < mid && hi > top ? [a.x] : [];
            }),
          )
          .sort((p, q) => p - q);
        // The first place from x on that no crossing edge comes near, or undefined past the end.
        const free = (from: number, end: number): number | undefined => {
          let x = from;
          for (const c of crossing) {
            if (c < x - WALL.labelClear) continue;
            if (c > x + w + WALL.labelClear) break;
            x = c + WALL.labelClear;
          }
          return x + w <= end ? x : undefined;
        };
        // Along the wall, and nowhere else: where no place is clear, the label sits at the
        // start, and the write is refused (specs/decisions, "A wall's label stays along its wall").
        const placed = free(x0 + WALL.reach, x1 - WALL.reach);
        if (placed === undefined) out.blocked = true;
        out.label = placeLine("layer-label", wall.label, placed ?? x0 + WALL.reach, top, m, T);
      }
    }
    sceneWalls.push(out);
  }
  // The text a wall's label and edge keep clear of: edge, group, band and lane labels.
  const texts: Rect[] = [
    ...sceneEdges.flatMap((e) => (e.label === undefined ? [] : [e.label.bbox])),
    ...sceneEdges.flatMap((e) => (e.step === undefined ? [] : [badgeRect(e.step)])),
    ...sceneGroups.flatMap((g) => [g.label.bbox, ...(g.sublabel ? [g.sublabel.bbox] : [])]),
    ...sceneBands.flatMap((x) => (x.label === undefined ? [] : [x.label.bbox])),
    ...sceneLanes.map((x) => x.label.bbox),
  ];
  // Walls up and down: from the top of the highest node of either side to the bottom of
  // the lowest. A label sits at the top, centred, at the first height no crossing edge
  // comes near, and the dashed edge runs on below it.
  for (const b of besideWalls) {
    const rects = [...b.wall.between, ...b.wall.and].flatMap((id) => boxRects.get(id) ?? []);
    if (rects.length === 0) continue;
    const y0 = Math.min(...rects.map((r) => r.y)) - WALL.reach;
    const y1 = Math.max(...rects.map((r) => r.y + r.h)) + WALL.reach;
    const rect = { x: centre + b.x0, y: y0, w: b.x1 - b.x0, h: y1 - y0 };
    const out: SceneWall = { id: b.wall.id, run: "beside", rect };
    const mid = rect.x + rect.w / 2;
    if (b.wall.label !== undefined) {
      const lines = wallLines.get(b.wall.id) ?? [];
      const lh = lineHeight("layer-label", m, T);
      const h = lines.length * lh;
      const w = Math.max(0, ...lines.map((l) => l.width));
      // A place is clear when no edge, node or text comes within the label's clearance.
      const clear = (top: number) => {
        const c = WALL.labelClear;
        const r = { x: mid - w / 2 - c, y: top - c, w: w + 2 * c, h: h + 2 * c };
        if (sceneNodes.some((n) => overlaps(n.rect, r))) return false;
        if (texts.some((t) => overlaps(t, r))) return false;
        return sceneEdges.every((e) =>
          e.points.slice(1).every((p, j) => !segmentHits(e.points[j] as Point, p, r)),
        );
      };
      // Down the wall from its top, and nowhere else: where no place is clear, the label sits
      // at the top, and the write is refused (specs/decisions, "A wall's label stays along its wall").
      const tops: number[] = [];
      for (let t = y0; t + h <= y1; t += 4) tops.push(t);
      const placed = tops.find(clear);
      if (placed === undefined && withText) out.blocked = true;
      const y = placed ?? y0;
      if (withText) {
        const place = alignedIn(b.wall.labelAlign, mid - w / 2, w);
        out.label = placeLines("layer-label", lines, place.x, y, place.align, m, T);
      }
      out.line = { a: { x: mid, y: y + h + WALL.labelGap }, b: { x: mid, y: y1 } };
    }
    sceneWalls.push(out);
  }
  // A dashed line breaks where it would cross text: a label of an edge the wall allows.
  for (const wl of sceneWalls) {
    if (wl.line === undefined) continue;
    const { a, b } = wl.line;
    const across = a.y === b.y;
    const others = sceneWalls.flatMap((x) =>
      x === wl || x.label === undefined ? [] : [x.label.bbox],
    );
    const gaps = [...texts, ...others]
      .filter((t) =>
        across
          ? t.y < a.y && t.y + t.h > a.y && t.x < b.x && t.x + t.w > a.x
          : t.x < a.x && t.x + t.w > a.x && t.y < b.y && t.y + t.h > a.y,
      )
      .map((t): [number, number] =>
        across
          ? [t.x - WALL.labelGap, t.x + t.w + WALL.labelGap]
          : [t.y - WALL.labelGap, t.y + t.h + WALL.labelGap],
      )
      .sort((p, q) => p[0] - q[0]);
    if (gaps.length > 0) wl.line.gaps = gaps;
  }

  // A badge its label's slot left touching something slides along its edge (specs/decisions, "Step badges ride the edge").
  if (withText) {
    settleBadges(sceneEdges, {
      solid: [
        ...sceneNodes.flatMap((n) => [n.rect, ...(n.marks ?? []).map((x) => x.rect)]),
        ...captions,
        ...sceneWalls.flatMap((x) => (x.label ? [x.label.bbox] : [])),
      ],
      lines: sceneWalls.flatMap((x) => (x.line ? [{ a: x.line.a, b: x.line.b }] : [])),
      borders: [
        ...sceneGroups.map((g) => ({ id: g.id, rect: g.rect })),
        ...sceneBands.map((b) => ({ id: b.id, rect: b.rect })),
      ],
      heads: (e) => {
        const head = strokeLook(e.width, theme.paint).arrow.length;
        return { start: e.both === true ? head : 0, end: hasHead(e.kind) ? head : 0 };
      },
      inside: (e) => insideOf(e.id),
    });
  }

  // Notes (specs/decisions, "Notes as callouts or footnotes"): a card beside its target, or a footnote where the agent says so.
  const placedNotes = withText
    ? placeNotes(
        d,
        footnotes,
        {
          nodes: sceneNodes,
          groups: sceneGroups,
          edges: sceneEdges,
          solid: [
            ...texts,
            // A note's dotted line meets its edge, but keeps off the edge's badge.
            ...sceneEdges.flatMap((e) =>
              e.step === undefined ? [] : [badgeRect({ ...e.step, r: e.step.r + STEP.clear })],
            ),
            ...sceneWalls.flatMap((x) => [x.rect, ...(x.label ? [x.label.bbox] : [])]),
            ...sceneLanes.map((x) => x.head),
            ...legend.flatMap((it) => [it.label.bbox, ...(it.mark ? [it.mark.rect] : [])]),
            title.bbox,
            ...(subtitle ? [subtitle.bbox] : []),
          ],
          areas: [
            ...sceneGroups.map((g) => g.rect),
            ...sceneLanes.map((x) => x.rect),
            ...sceneBands.map((x) => x.rect),
          ],
          bounds: {
            x: sp.margin.left,
            y: headBottom + FRAME.titleGap / 2,
            w: width - sides,
            h: lanesBottom - headBottom - FRAME.titleGap / 2,
          },
          list: { x: sp.margin.left, y: listTop, w: textW },
        },
        m,
        T,
      )
    : [];

  const scene: Scene = {
    width,
    height,
    title,
    layers: sceneLayers,
    nodes: sceneNodes,
    edges: sceneEdges,
  };
  if (subtitle !== undefined) scene.subtitle = subtitle;
  if (note !== undefined) scene.note = note;
  scene.legend = legend;
  scene.groups = sceneGroups;
  if (d.lines !== undefined) scene.lines = d.lines;
  if (theme !== DEFAULT_THEME) scene.paint = theme.paint;
  if (sceneBands.length > 0) scene.bands = sceneBands;
  if (sceneLanes.length > 0) scene.lanes = sceneLanes;
  if (sceneWalls.length > 0) scene.walls = sceneWalls;
  if (placedNotes.length > 0) scene.notes = placedNotes;
  return { scene: roundScene(scene), centre };
}

function roundRect(r: Rect): Rect {
  return { x: round2(r.x), y: round2(r.y), w: round2(r.w), h: round2(r.h) };
}

function roundText(t: PlacedText): PlacedText {
  return {
    role: t.role,
    runs: t.runs.map((r) => ({ ...r, x: round2(r.x), y: round2(r.y) })),
    bbox: roundRect(t.bbox),
  };
}

function roundBadge(b: SceneBadge): SceneBadge {
  return { x: round2(b.x), y: round2(b.y), r: b.r, label: roundText(b.label) };
}

/** Every coordinate in the scene, rounded to 2 decimals (DESIGNS.md, "The same file gives the same picture on any machine"). */
function roundScene(s: Scene): Scene {
  const out: Scene = {
    width: round2(s.width),
    height: round2(s.height),
    title: roundText(s.title),
    layers: s.layers.map((l) => ({ id: l.id, band: roundRect(l.band), label: roundText(l.label) })),
    nodes: s.nodes.map((n) => ({ ...n, rect: roundRect(n.rect), texts: n.texts.map(roundText) })),
    edges: s.edges.map((e) => {
      const out: SceneEdge = {
        id: e.id,
        from: e.from,
        to: e.to,
        kind: e.kind,
        points: e.points.map((p) => ({ x: round2(p.x), y: round2(p.y) })),
      };
      if (e.label !== undefined) out.label = roundText(e.label);
      if (e.look !== undefined) out.look = e.look;
      if (e.labelLook !== undefined) out.labelLook = e.labelLook;
      if (e.both === true) out.both = true;
      if (e.width !== undefined) out.width = e.width;
      if (e.step !== undefined) out.step = roundBadge(e.step);
      if (e.blocked !== undefined) out.blocked = e.blocked;
      if (e.unmet !== undefined) out.unmet = e.unmet;
      if (e.refused !== undefined) out.refused = e.refused;
      return out;
    }),
  };
  if (s.paint !== undefined) out.paint = s.paint;
  if (s.lines !== undefined) out.lines = s.lines;
  if (s.subtitle !== undefined) out.subtitle = roundText(s.subtitle);
  if (s.note !== undefined) out.note = roundText(s.note);
  if (s.legend !== undefined) {
    out.legend = s.legend.map((it) => ({
      ...(it.style !== undefined ? { style: it.style } : {}),
      ...(it.width !== undefined ? { width: it.width } : {}),
      sample: { x1: round2(it.sample.x1), x2: round2(it.sample.x2), y: round2(it.sample.y) },
      ...(it.mark !== undefined
        ? { mark: { mark: it.mark.mark, rect: roundRect(it.mark.rect) } }
        : {}),
      label: roundText(it.label),
    }));
  }
  if (s.groups !== undefined) {
    out.groups = s.groups.map((g) => ({
      id: g.id,
      rect: roundRect(g.rect),
      label: roundText(g.label),
      members: [...g.members],
      ...(g.sublabel === undefined ? {} : { sublabel: roundText(g.sublabel) }),
      ...(g.depth === undefined ? {} : { depth: g.depth }),
      ...(g.look === undefined ? {} : { look: g.look }),
    }));
  }
  if (s.bands !== undefined) {
    out.bands = s.bands.map((b) => ({
      id: b.id,
      rect: roundRect(b.rect),
      ...(b.label === undefined ? {} : { label: roundText(b.label) }),
      ...(b.bar === true ? { bar: true as const } : {}),
      ...(b.box === true ? { box: true as const } : {}),
      ...(b.blocked === true ? { blocked: true as const } : {}),
    }));
  }
  if (s.lanes !== undefined) {
    out.lanes = s.lanes.map((x) => ({
      id: x.id,
      run: x.run,
      rect: roundRect(x.rect),
      head: roundRect(x.head),
      label: roundText(x.label),
      ...(x.look === undefined ? {} : { look: x.look }),
    }));
  }
  if (s.notes !== undefined) {
    const pt = (p: Point) => ({ x: round2(p.x), y: round2(p.y) });
    out.notes = s.notes.map((x) => ({
      on: x.on,
      as: x.as,
      text: roundText(x.text),
      ...(x.card === undefined ? {} : { card: roundRect(x.card) }),
      ...(x.link === undefined ? {} : { link: { a: pt(x.link.a), b: pt(x.link.b) } }),
      ...(x.number === undefined ? {} : { number: x.number }),
      ...(x.mark === undefined ? {} : { mark: roundBadge(x.mark) }),
      ...(x.key === undefined ? {} : { key: roundBadge(x.key) }),
      ...(x.blocked === true ? { blocked: true as const } : {}),
    }));
  }
  if (s.walls !== undefined) {
    const pt = (p: Point) => ({ x: round2(p.x), y: round2(p.y) });
    out.walls = s.walls.map((w) => ({
      id: w.id,
      run: w.run,
      rect: roundRect(w.rect),
      ...(w.line === undefined
        ? {}
        : {
            line: {
              a: pt(w.line.a),
              b: pt(w.line.b),
              ...(w.line.gaps === undefined
                ? {}
                : {
                    gaps: w.line.gaps.map(([p, q]): [number, number] => [round2(p), round2(q)]),
                  }),
            },
          }),
      ...(w.label === undefined ? {} : { label: roundText(w.label) }),
      ...(w.blocked === true ? { blocked: true as const } : {}),
    }));
  }
  return out;
}
