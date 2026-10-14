// Layout entry point (DESIGN.md D7, D10, D11, D24, D25). The whole diagram is laid
// out again from its facts on every call, in a fixed order:
// 1. across: every node on a column of one grid shared by all rows, columns chosen
//    so that edges run straight, then spaced for boxes, groups and labels
//    (grid.ts, place.ts);
// 2. routes across: paths, ports, gap tracks and gutter rows (route.ts);
// 3. down: the title, subtitle and legend, then rows and gutters top to bottom,
//    each gutter taking the smallest height step its rows fit in, plus the room
//    group boxes need below their last row and above their first, and the room
//    of lane headers and borders (D32);
// 4. assembly of routes, labels, group boxes, text and the footnote.
// Rows are not drawn (D7): their bands and labels stay in the scene for the
// checker and for debugging.

import { checkEnds } from "../model/ends.ts";
import { groupChain } from "../model/groups.ts";
import { laneRun, orderByLanes } from "../model/lanes.ts";
import {
  type Diagram,
  type DiagramNode,
  EDGE_KINDS,
  type EdgeKind,
  LINE_STYLES,
  type LineStyleName,
  MARK_SLOTS,
  type Mark,
  markName,
  weightKey,
} from "../model/types.ts";
import { wallRun } from "../model/walls.ts";
import type {
  PlacedText,
  Point,
  Rect,
  Scene,
  SceneBand,
  SceneEdge,
  SceneGroup,
  SceneLane,
  SceneLayer,
  SceneLegendItem,
  SceneNode,
  SceneWall,
} from "../scene.ts";
import type { Measurer } from "../text/types.ts";
import {
  BAND,
  FRAME,
  GROUP,
  LANE,
  MARK_STEP,
  ROUTE,
  SPACING,
  type Spacing,
  WALL,
} from "../theme/geometry.ts";
import { edgeWidth, lineStyle, type Paint, weightOf } from "../theme/paint.ts";
import { isDot, textTop } from "../theme/shapes.ts";
import { DEFAULT_THEME, type TypeRamp, themeOf } from "../theme/themes.ts";
import type { AlignmentProblem } from "./align.ts";
import { cutRoute, planEnds, refineEnds } from "./ends.ts";
import { buildGrid, type GroupProblem } from "./grid.ts";
import { placeAcross } from "./place.ts";
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
import { routeStats } from "./stats.ts";
import { lineBox, lineHeight, placeLine, placeLines } from "./text.ts";

export type { AlignmentCode, AlignmentProblem } from "./align.ts";
export type { GroupCode, GroupProblem } from "./grid.ts";
export { type RouteStats, routeStats } from "./stats.ts";

export function layout(diagram: Diagram, m: Measurer): Scene {
  return compute(diagram, m, true).scene;
}

/**
 * The scene and the absolute x of the centre line the grid is centred on.
 * Positions may be compared relative to that line: a wider canvas may shift
 * everything by the same amount.
 */
export function layoutFramed(diagram: Diagram, m: Measurer): { scene: Scene; centre: number } {
  return compute(diagram, m, true);
}

/**
 * Alignments that cannot hold (D10): an aligned node must share its target's
 * column, and the order of a layer, another alignment or a group can put that
 * column on the other side of its neighbours. Also unknown targets, targets in
 * the same layer and a node aligned with itself. The command line turns each into
 * an operation error.
 */
export function validateAlignments(diagram: Diagram): AlignmentProblem[] {
  return buildGrid(diagram).alignProblems;
}

/**
 * Groups that cannot be drawn as one box (D7): a group whose members are split
 * by another node in a layer, and a group that another group or node would have
 * to lie both left and right of. The command line turns each into an operation
 * error.
 */
export function validateGroups(diagram: Diagram): GroupProblem[] {
  return buildGrid(diagram).groupProblems;
}

/** Does any group, its inner groups' nodes counted, have a non-member between two of its members in this row? */
function splitsGroup(d: Diagram, nodes: DiagramNode[]): boolean {
  const chains = nodes.map((n) => groupChain(d, n.group));
  for (const g of new Set(chains.flat())) {
    const at = chains.flatMap((c, k) => (c.includes(g) ? [k] : []));
    if ((at[at.length - 1] ?? 0) - (at[0] ?? 0) + 1 !== at.length) return true;
  }
  return false;
}

/**
 * Whether row li in this order can be drawn (D7, D10, D28): no group is split or
 * left without one box, every alignment holds, and an edge to a container meets
 * it right beside its end where they share a row.
 */
function drawable(d: Diagram, li: number, nodes: DiagramNode[]): boolean {
  if (splitsGroup(d, nodes)) return false;
  const trial: Diagram = { ...d, layers: d.layers.map((l, i) => (i === li ? { ...l, nodes } : l)) };
  const grid = buildGrid(trial);
  if (grid.groupProblems.length > 0 || grid.alignProblems.length > 0) return false;
  return !checkEnds(trial, 0).some((e) => e.code === "edge-blocked");
}

/**
 * D24: the index in its layer, counting the node's current position as removed,
 * that gives the fewest edge crossings. A tie goes to the last slot. Each slot is
 * tried with the real router. Only slots that can be drawn are tried; when there
 * is none, the slots that keep the groups whole, and then every slot, so that the
 * write is refused for what the agent can change.
 */
export function chooseSlot(diagram: Diagram, layerId: string, nodeId: string, m: Measurer): number {
  const li = diagram.layers.findIndex((l) => l.id === layerId);
  const layer = diagram.layers[li];
  if (layer === undefined) return 0;
  const node = layer.nodes.find((n) => n.id === nodeId);
  const rest = layer.nodes.filter((n) => n.id !== nodeId);
  if (node === undefined) return rest.length;
  const order = (slot: number) => [...rest.slice(0, slot), node, ...rest.slice(slot)];
  const all = Array.from({ length: rest.length + 1 }, (_, i) => i);
  const drawn = all.filter((slot) => drawable(diagram, li, order(slot)));
  const whole = all.filter((slot) => !splitsGroup(diagram, order(slot)));
  const slots = drawn.length > 0 ? drawn : whole.length > 0 ? whole : all;
  let best = slots[slots.length - 1] ?? rest.length;
  let fewest = Number.POSITIVE_INFINITY;
  for (const slot of slots) {
    const nodes = [...rest.slice(0, slot), node, ...rest.slice(slot)];
    const trial: Diagram = {
      ...diagram,
      layers: diagram.layers.map((l, i) => (i === li ? { ...l, nodes } : l)),
    };
    const { scene } = compute(trial, m, false);
    const c = routeStats(scene.edges.map((e) => e.points)).crossings;
    if (c <= fewest) {
      fewest = c;
      best = slot;
    }
  }
  return best;
}

/** Most layouts `orderTogether` tries, so that a large batch stays fast. */
const ORDER_TRIES = 1500;

/**
 * How bad the routes of a scene are, compared in order: crossings plus edges with
 * more than two bends (D25 rule 2), then crossings, then bends, then length.
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
  return [s.crossings + over, s.crossings, s.bends, s.length];
}

/** A diagram's route cost (see routeCost), laid out without text: for comparing arrangements (D24, D35). */
export function arrangementCost(diagram: Diagram, m: Measurer): number[] {
  return routeCost(compute(diagram, m, false).scene);
}

/** What makes a diagram's lines hard to read (D25 rules 2 and 3): pairs that cross, and lines over two bends. */
export interface LineTrouble {
  /** Every point where two routes cross, as the route cost counts them (D24). */
  points: number;
  /** Pairs of edge ids whose routes cross, each pair once, in id order. */
  crossings: [string, string][];
  /** Edges that bend more than twice, with their bends, in id order. */
  bent: { edge: string; bends: number }[];
}

/** Every point where two routes cross, and the pairs of lines, each pair once, in id order. */
export function crossingsOf(edges: SceneEdge[]): { points: number; pairs: [string, string][] } {
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
  const pairs = new Set<string>();
  for (const h of segs) {
    if (h.v) continue;
    for (const v of segs) {
      if (!v.v || v.id === h.id) continue;
      if (v.at > h.lo && v.at < h.hi && h.at > v.lo && h.at < v.hi) {
        points++;
        pairs.add(JSON.stringify(h.id < v.id ? [h.id, v.id] : [v.id, h.id]));
      }
    }
  }
  const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return {
    points,
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

/** The pairs of lines that cross, and the lines that bend more than twice (D35). */
export function lineTrouble(diagram: Diagram, m: Measurer): LineTrouble {
  const { scene } = compute(diagram, m, false);
  const { points, pairs } = crossingsOf(scene.edges);
  const bent = scene.edges
    .map((e) => ({ edge: e.id, bends: bendsOf(e.points) }))
    .filter((b) => b.bends > 2)
    .sort((a, b) => (a.edge < b.edge ? -1 : a.edge > b.edge ? 1 : 0));
  return { points, crossings: pairs, bent };
}

/** The edges whose routes cross another route, or bend more than twice (D25 rules 2 and 3). */
export function troubledEdges(diagram: Diagram, m: Measurer): Set<string> {
  const t = lineTrouble(diagram, m);
  return new Set([...t.crossings.flat(), ...t.bent.map((b) => b.edge)]);
}

function lower(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (Math.abs(x - y) > 1e-6) return x < y;
  }
  return false;
}

/**
 * D24: the nodes one batch added without a position, ordered together. Each in
 * turn tries every slot of its row and takes the one with the lowest route cost,
 * while the cost drops. The other nodes keep their order, and only slots that can
 * be drawn are taken. Nodes are tried in the order given, slots from the first, so
 * the result is the same on every machine.
 */
export function orderTogether(diagram: Diagram, ids: readonly string[], m: Measurer): Diagram {
  let d = diagram;
  const cost = (x: Diagram) => routeCost(compute(x, m, false).scene);
  let best = cost(d);
  let tries = 0;
  for (let pass = 0; pass < 4 && tries < ORDER_TRIES; pass++) {
    let moved = false;
    for (const id of ids) {
      const li = d.layers.findIndex((l) => l.nodes.some((n) => n.id === id));
      const layer = d.layers[li];
      const node = layer?.nodes.find((n) => n.id === id);
      if (layer === undefined || node === undefined) continue;
      const rest = layer.nodes.filter((n) => n.id !== id);
      const at = layer.nodes.indexOf(node);
      let pick: Diagram | undefined;
      for (let slot = 0; slot <= rest.length && tries < ORDER_TRIES; slot++) {
        if (slot === at) continue;
        const nodes = [...rest.slice(0, slot), node, ...rest.slice(slot)];
        if (!drawable(d, li, nodes)) continue;
        const trial: Diagram = {
          ...d,
          layers: d.layers.map((l, i) => (i === li ? { ...l, nodes } : l)),
        };
        tries++;
        const c = cost(trial);
        if (lower(c, best)) {
          best = c;
          pick = trial;
        }
      }
      if (pick !== undefined) {
        d = pick;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return d;
}

const ceil4 = (x: number) => Math.ceil(x / 4 - 1e-9) * 4;
const ceil8 = (x: number) => Math.ceil(x / 8 - 1e-9) * 8;

/**
 * An edge label on two and on three lines, each at the least width that wraps it
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

/** The smallest gutter step that holds this many rows, growing past the last step by its last increment. */
export function gutterHeight(rows: number, sp: Spacing): number {
  const need = (rows + 1) * sp.trackPitch;
  for (const h of sp.gutterSteps) if (h >= need) return h;
  const last = sp.gutterSteps[sp.gutterSteps.length - 1] ?? need;
  const prev = sp.gutterSteps[sp.gutterSteps.length - 2] ?? 0;
  const inc = Math.max(4, last - prev);
  let h = last;
  while (h < need) h += inc;
  return h;
}

/** A legend entry's default words for an edge kind (D8). */
const LEGEND_WORDS: Record<EdgeKind, string> = {
  call: "call",
  async: "message",
  data: "data read",
  link: "related",
  optional: "optional",
};

interface LegendItem {
  /** A line's entry: the style of its sample. */
  style?: LineStyleName;
  text: string;
  /** A line width's entry: its sample's width (D42). */
  width?: number;
  /** A mark's entry: the mark, at the small size (D42). */
  mark?: Mark;
}

/** A mark at the small size, as the legend draws it (D42). */
function smallMark(mk: Mark): Mark {
  return typeof mk === "string" ? { text: mk, size: "s" } : { ...mk, size: "s" };
}

/**
 * The legend's entries (D8, D42): each line style the diagram uses, then each line
 * width, from the thinnest, then each mark the diagram names. A width the diagram names
 * has its own entry. The heavier ones it does not name share "main path", drawn at the
 * thinnest of them (D41). A mark has an entry only when it is named, drawn like the first
 * one found: rows top to bottom, nodes in order, slots in order.
 */
function legendItems(d: Diagram, P: Paint): LegendItem[] {
  const kinds = new Set(d.edges.map((e) => e.kind));
  const out: LegendItem[] = [];
  for (const style of LINE_STYLES) {
    const used = EDGE_KINDS.filter((k) => kinds.has(k) && lineStyle(k) === style);
    const first = used[0];
    if (first === undefined) continue;
    // Calls and data reads share the solid line.
    const plain = used.length > 1 ? "call or read" : LEGEND_WORDS[first];
    const words = d.legend?.[style];
    if (words !== false) out.push({ style, text: words ?? plain });
  }
  const widths = new Map<string, number>();
  for (const e of d.edges) {
    const w = weightOf(e);
    const px = edgeWidth(e, P);
    if (w !== undefined && w !== "thin" && px !== undefined) widths.set(weightKey(w), px);
  }
  const named: LegendItem[] = [];
  let main: number | undefined;
  for (const [key, px] of widths) {
    const text = d.legend?.weights?.[key];
    // A width left out has no entry, and is not in the shared one either.
    if (text === false) continue;
    if (text !== undefined) named.push({ style: "solid", text, width: px });
    else if (px > P.edge.strokeWidth) main = Math.min(main ?? px, px);
  }
  if (main !== undefined) named.push({ style: "solid", text: "main path", width: main });
  // Sorting is stable: equal widths keep the order of the edges, and "main path" comes last.
  named.sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const marks: LegendItem[] = [];
  const seen = new Set<string>();
  for (const n of d.layers.flatMap((l) => l.nodes)) {
    for (const slot of MARK_SLOTS) {
      const mk = n.icons?.[slot];
      if (mk === undefined) continue;
      const name = markName(mk);
      const text = d.legend?.marks?.[name];
      if (text === undefined || seen.has(name)) continue;
      seen.add(name);
      marks.push({ text, mark: smallMark(mk) });
    }
  }
  return [...out, ...named, ...marks];
}

/** Items, by width, in lines no wider than `room`. A line holds at least one item (D42). */
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

/** Does the axis-parallel segment a-b pass through the inside of r? */
function segmentHits(a: Point, b: Point, r: Rect): boolean {
  if (a.y === b.y) {
    return (
      a.y > r.y && a.y < r.y + r.h && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.w
    );
  }
  return a.x > r.x && a.x < r.x + r.w && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.h;
}

/**
 * A label stays where the router put it while it still lies beside its line, clear. A
 * route cut at a container (D28) can lose the part the label sat on, or leave
 * the label across the container's border: the label then moves beside a part
 * that remains, the longest first, above or below it, or right or left of it,
 * at its middle or one of its ends, stepping away from it while other lines
 * crowd it: the first place `free` accepts, clear of the border if one is,
 * across it if not. Failing every place, it goes above or right of the middle of
 * the longest part.
 */
function besideRoute(
  points: Point[],
  at: AssembledLabel,
  boxes: Rect[],
  free: (r: Rect) => boolean,
): AssembledLabel {
  const near = ROUTE.labelGap + 4;
  const across = (r: Rect) =>
    boxes.some(
      (b) =>
        overlaps(r, b) &&
        !(r.x >= b.x && r.x + r.w <= b.x + b.w && r.y >= b.y && r.y + r.h <= b.y + b.h),
    );
  const parts: [Point, Point][] = [];
  const keep = !across(at) && free(at);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const dx = Math.max(0, at.x - Math.max(a.x, b.x), Math.min(a.x, b.x) - (at.x + at.w));
    const dy = Math.max(0, at.y - Math.max(a.y, b.y), Math.min(a.y, b.y) - (at.y + at.h));
    if (keep && Math.max(dx, dy) <= near) return at;
    parts.push([a, b]);
  }
  const span = ([a, b]: [Point, Point]) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  parts.sort((p, q) => span(q) - span(p));
  // Right beside each part first; then, where other lines crowd it, stepping away
  // from it, up to twice the label's size, past the lines in the way.
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
  // Clear of the container's border if it can be; else across it, which a label's patch covers.
  for (const strict of [true, false]) {
    for (const p of places) {
      const r = { x: p.x, y: p.y, w: at.w, h: at.h };
      if ((!strict || !across(r)) && free(r)) return { ...at, ...p };
    }
  }
  const first = places[0];
  return first === undefined ? at : { ...at, ...first };
}

const empty = (role: PlacedText["role"], x: number, y: number): PlacedText => ({
  role,
  runs: [],
  bbox: { x, y, w: 0, h: 0 },
});

function compute(facts: Diagram, m: Measurer, withText: boolean): { scene: Scene; centre: number } {
  // The diagram's theme decides the type sizes here and the paint in the scene (D30).
  const theme = themeOf(facts);
  const T = theme.type;
  const sized = withSizes(facts, m);
  // Column lanes keep each row in lane order (D32); a file edited by hand may not.
  orderByLanes(sized);
  // Container ends route to a stand-in node and are cut at the container (D28).
  const ends = planEnds(sized);
  const d: Diagram = { ...sized, edges: ends.edges };
  const sp = SPACING[d.density];

  const labelStyle = T["edge-label"];
  const labelMetrics = m.metrics(labelStyle);
  const labelH = labelMetrics.ascent + labelMetrics.descent;
  const labelSizes = new Map<string, LabelBox>();
  for (const e of d.edges) {
    const text = e.label;
    if (text === undefined || text === "") continue;
    const w = m.measure(text, labelStyle).width;
    let forms: LabelForm[] | undefined;
    labelSizes.set(e.id, {
      w,
      h: labelH,
      narrower: () => {
        forms ??= narrower(text, w, m, T);
        return forms;
      },
    });
  }
  const groupStyle = T["group-label"];
  const groupSubStyle = T["group-sublabel"];
  const labelW = (g: { label: string }) => m.measure(g.label, groupStyle).width;
  // A group's label and its quieter second part take one span: lines keep clear of both.
  const groupW = new Map(
    (d.groups ?? []).map((g) => [
      g.id,
      labelW(g) +
        (g.sublabel === undefined
          ? 0
          : GROUP.sublabelGap + m.measure(g.sublabel, groupSubStyle).width),
    ]),
  );
  const sideways = planSideways(d, (id) => labelSizes.get(id)?.w, labelH);
  // Edges that meet a column lane beside it (D32), and the node at their other end.
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
  const placement = placeAcross(d, {
    sideways,
    edgeLabelW: (id) => labelSizes.get(id)?.w,
    groupLabelW: (id) => groupW.get(id) ?? 0,
    laneEnds,
  });
  const { layers, nodes, groups } = placement;
  const routeEdges = refineEnds(sized, ends, nodes);

  // Bands (D28): the layers an edge ends at, drawn across the content. Each band's
  // label sits in its head above the row, at the content's left edge.
  let contentLeft = Number.POSITIVE_INFINITY;
  let contentRight = Number.NEGATIVE_INFINITY;
  for (const n of nodes.values()) {
    contentLeft = Math.min(contentLeft, n.x);
    contentRight = Math.max(contentRight, n.x + n.w);
  }
  for (const g of groups) {
    contentLeft = Math.min(contentLeft, g.x0);
    contentRight = Math.max(contentRight, g.x1);
  }
  const bandStyle = T["layer-label"];
  const bandRows = new Map<number, { id: string; label: string; labelX: number; labelW: number }>();
  layers.forEach((l, i) => {
    if (!ends.bands.has(l.id) || !Number.isFinite(contentLeft)) return;
    // The label goes above the first stretch of its row with no node below it, so
    // that no line into a node's top must cross it; failing that, left of the content.
    const labelW = m.measure(l.label, bandStyle).width;
    const need = labelW + 2 * GROUP.clear;
    let edge = contentLeft - BAND.padX + BAND.labelInset - GROUP.clear;
    let labelX: number | undefined;
    for (const n of [...l.nodes, undefined]) {
      const end = n === undefined ? contentRight + BAND.padX - BAND.labelInset + GROUP.clear : n.x;
      if (end - edge >= need) {
        labelX = edge + GROUP.clear;
        break;
      }
      if (n !== undefined) edge = Math.max(edge, n.x + n.w);
    }
    labelX ??= contentLeft - BAND.padX - labelW - GROUP.clear;
    bandRows.set(i, { id: l.id, label: l.label, labelX, labelW });
  });
  // A band reaches the label it carries, when that sits left of the content.
  const bandLeft = Math.min(
    contentLeft - BAND.padX,
    ...[...bandRows.values()].map((b) => b.labelX - BAND.labelInset),
  );

  // Where no vertical line may pass: a group's or band's label, above its first
  // row, and the label of an edge that runs sideways, in the gap it crosses.
  const forbidTop = new Map<number, [number, number][]>();
  for (const g of groups) {
    const list = forbidTop.get(g.top) ?? [];
    list.push([g.labelX - GROUP.labelClear, g.labelX + g.labelW + GROUP.labelClear]);
    forbidTop.set(g.top, list);
  }
  for (const [row, b] of bandRows) {
    const list = forbidTop.get(row) ?? [];
    list.push([b.labelX - GROUP.labelClear, b.labelX + b.labelW + GROUP.labelClear]);
    forbidTop.set(row, list);
  }
  // A column lane's sides run the whole height: no line runs along one.
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
  const routing = routeAcross(layers, nodes, routeEdges, labelSizes, sp.trackPitch, {
    sideways,
    forbidTop,
    forbidGap,
    sideLabelX: placement.sideLabels,
    alone: new Set(ends.ends.keys()),
    boxes: placement.groups.map((g) => ({
      x0: g.x0,
      x1: g.x1,
      top: g.top,
      bottom: g.bottom,
      members: new Set(g.members),
    })),
    noSideExit: new Set(
      run === "columns"
        ? [...ends.ends]
            .filter(([, p]) => p.from?.kind === "lane" || p.to?.kind === "lane")
            .map(([id]) => id)
        : [],
    ),
  });

  // Across: the content is symmetric about the centre line.
  let half = 0;
  const see = (x: number) => {
    if (Number.isFinite(x)) half = Math.max(half, Math.abs(x));
  };
  for (const n of nodes.values()) {
    see(n.x);
    see(n.x + n.w);
  }
  for (const g of groups) {
    see(g.x0);
    see(g.x1);
  }
  if (bandRows.size > 0) {
    see(bandLeft);
    see(contentRight + BAND.padX);
  }
  for (const [id, x0] of placement.sideLabels) {
    see(x0);
    see(x0 + (labelSizes.get(id)?.w ?? 0));
  }
  if (Number.isFinite(routing.minX)) see(routing.minX - 16);
  if (Number.isFinite(routing.maxX)) see(routing.maxX + 16);

  // Lanes (D32). Row lanes share one header column, left of everything the rows
  // hold, lines included. Column lanes have a header on top, as wide as the lane.
  const laneStyle = T["lane-label"];
  const laneLh = lineHeight("lane-label", m, T);
  const rowLanes: { id: string; label: string; first: number; last: number }[] = [];
  if (run === "rows") {
    for (const lane of d.lanes ?? []) {
      const rows = layers.filter((l) => d.layers[l.index]?.lane === lane.id).map((l) => l.index);
      if (rows.length === 0) continue;
      rowLanes.push({
        id: lane.id,
        label: lane.label,
        first: rows[0] as number,
        last: rows[rows.length - 1] as number,
      });
    }
  }
  let laneLeft = 0;
  let laneRight = 0;
  let headW = 0;
  if (rowLanes.length > 0 && Number.isFinite(contentLeft)) {
    const widest = Math.max(...rowLanes.map((x) => m.measure(x.label, laneStyle).width));
    headW = ceil4(Math.min(widest, LANE.headMax) + 2 * LANE.labelInset);
    let left = bandRows.size > 0 ? bandLeft : contentLeft;
    let right = bandRows.size > 0 ? contentRight + BAND.padX : contentRight;
    if (Number.isFinite(routing.minX)) left = Math.min(left, routing.minX);
    if (Number.isFinite(routing.maxX)) right = Math.max(right, routing.maxX);
    laneLeft = left - LANE.padX - headW;
    laneRight = right + LANE.padX;
    see(laneLeft);
    see(laneRight);
  }
  const laneAt = (i: number) => rowLanes.find((x) => x.first <= i && i <= x.last)?.id;
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
  // Row lanes hold everything across, header included: the picture centres on them,
  // not on the centre line, so that the header's width is not mirrored as empty space.
  const shift = rowLanes.length > 0 ? Math.round((laneLeft + laneRight) / 8) * 4 : 0;
  if (rowLanes.length > 0) half = Math.max(shift - laneLeft, laneRight - shift);
  half = ceil4(Math.max(half, 80));

  // The frame: title, subtitle and legend at the top, the footnote at the bottom.
  const title = withText
    ? placeLine("title", d.title, sp.margin, sp.margin, m, T)
    : empty("title", sp.margin, sp.margin);
  const legendStyle = T.legend;
  const items = withText ? legendItems(d, theme.paint) : [];
  // A line's sample is a short line; a mark's is the mark (D42).
  const sampleW = items.map((it) =>
    it.mark === undefined ? FRAME.legendSample : markWidth(it.mark, m),
  );
  const itemW = items.map(
    (it, i) => (sampleW[i] ?? 0) + FRAME.legendLabelGap + m.measure(it.text, legendStyle).width,
  );
  const textW = Math.max(2 * half, FRAME.minTextWidth);
  // A legend wider than the room right of the title wraps into more lines (D42).
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
    withText && d.note !== undefined && d.note !== "" ? m.wrap(d.note, T.note, textW) : [];
  const widest = (lines: { width: number }[]) => Math.max(0, ...lines.map((l) => l.width));
  const width = ceil8(
    Math.max(
      2 * sp.margin + 2 * half,
      2 * sp.margin + title.bbox.w + (items.length > 0 ? FRAME.legendGap + legendW : 0),
      2 * sp.margin + widest(subLines),
      2 * sp.margin + widest(noteLines),
    ),
  );
  const centre = width / 2 - shift;

  // The legend's first line is level with the title, and each further line starts
  // at the same left edge below it (D42).
  const legend: SceneLegendItem[] = [];
  const lh = lineBox("legend", m, T);
  // A line of the legend is as high as its text, or as a mark when it lists one.
  const lineH = items.some((it) => it.mark !== undefined) ? Math.max(lh, MARK_STEP.s.h) : lh;
  const firstMid = title.bbox.y + title.bbox.h / 2;
  const legendPitch = lineH + FRAME.legendLineGap;
  legendRows.forEach((row, r) => {
    const mid = firstMid + r * legendPitch;
    let x = width - sp.margin - legendW;
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
  const subtitle =
    subLines.length > 0
      ? placeLines("subtitle", subLines, sp.margin, titleBottom + FRAME.subtitleGap, "start", m, T)
      : undefined;
  const headBottom = subtitle !== undefined ? subtitle.bbox.y + subtitle.bbox.h : titleBottom;

  // Down: rows and gutters. A gutter holds, top to bottom, the padding of the
  // groups whose last row is above it, its tracks, and the head of the groups
  // whose first row is below it. A head may rise beside the tracks, as in the
  // target, where no run, label or box of the gutter comes near the group; it
  // then adds only what the tracks do not already give it.
  // A box inside a box that starts in the same row has its head below the outer
  // one's, and one that ends in the same row its padding above it (D34).
  const heads = (g: (typeof groups)[number]): number =>
    1 + Math.max(0, ...groups.filter((c) => c.parent === g.id && c.top === g.top).map(heads));
  const pads = (g: (typeof groups)[number]): number =>
    1 + Math.max(0, ...groups.filter((c) => c.parent === g.id && c.bottom === g.bottom).map(pads));
  /** The heads stacked above row r, and the paddings below it. */
  const headsAt = (r: number) => Math.max(0, ...groups.filter((g) => g.top === r).map(heads));
  const padsAt = (r: number) => Math.max(0, ...groups.filter((g) => g.bottom === r).map(pads));
  const near = (g: (typeof groups)[number], lo: number, hi: number) =>
    lo < g.x1 + GROUP.clear && hi > g.x0 - GROUP.clear;
  /** Room the heads of the groups that start below gutter i still need, besides its tracks. */
  const headRoom = (i: number, tracks: number): number => {
    // A band's head sits above its groups' heads, below the tracks, in full.
    if (bandRows.has(i + 1)) return GROUP.head * headsAt(i + 1) + BAND.head;
    const starting = groups.filter((g) => g.top === i + 1);
    if (starting.length === 0) return 0;
    const full = GROUP.head * headsAt(i + 1);
    for (const g of starting) {
      for (const v of routing.gutters[i] ?? []) {
        if (v.row < 0) continue;
        if (v.hi - v.lo > 1e-6 && near(g, v.lo, v.hi)) return full;
        if (v.label !== undefined && near(g, v.label.x0, v.label.x0 + v.label.w)) return full;
        if (v.detour !== undefined && near(g, v.detour.x, v.detour.x)) return full;
      }
      for (const o of groups) if (o.bottom === i && near(g, o.x0, o.x1)) return full;
    }
    const crowded = (layers[i]?.nodes ?? []).some((n) =>
      starting.some((g) => near(g, n.x, n.x + n.w)),
    );
    return Math.max(0, full + (crowded ? GROUP.clear : 0) - tracks);
  };
  // Walls that run across (D43): each takes its own space in the gutter just below the
  // lowest row of its upper side, after the gutter's tracks.
  const acrossWalls = (d.walls ?? []).flatMap((w) => {
    const way = wallRun(d, w);
    if (way?.run !== "across") return [];
    const gutter = Math.max(...way.first.map((id) => nodes.get(id)?.layer ?? 0));
    return [{ wall: w, gutter }];
  });
  const wallsAt = (i: number) => acrossWalls.filter((x) => x.gutter === i).length;
  /** Where the walls of gutter i start, top to bottom. */
  const wallTops = new Map<number, number>();
  const rowTops: number[] = [];
  const gutterTops: number[] = [];
  const endPads: number[] = [];
  let y = ceil4(headBottom + FRAME.titleGap);
  const lanesTop = y;
  if (colLanes.length > 0) y += headH + LANE.pad;
  if (laneAt(0) !== undefined) y += LANE.pad;
  y += GROUP.head * headsAt(0);
  if (bandRows.has(0)) y += BAND.head;
  /** Where a row lane's border crosses gutter i, between two rows in different lanes. */
  const borders = new Map<number, number>();
  /** A row that holds a store: the gutters beside it keep more room from its cylinders. */
  const storeRow = (i: number) => (layers[i]?.nodes ?? []).some((n) => n.node.kind === "store");
  layers.forEach((l, i) => {
    rowTops.push(y);
    y += l.rowH;
    const rows = routing.rows[i] ?? 0;
    const last = i === layers.length - 1;
    const pad =
      GROUP.pad * padsAt(i) +
      (bandRows.has(i) ? BAND.pad : 0) +
      (rows > 0 && storeRow(i) ? ROUTE.storeRoom : 0);
    const walls = wallsAt(i);
    // A gutter with no runs keeps its least height only when no wall gives it room.
    const tracks =
      rows === 0
        ? last || walls > 0
          ? 0
          : (sp.gutterSteps[0] ?? 48)
        : gutterHeight(rows, sp) + (storeRow(i + 1) ? ROUTE.storeRoom : 0);
    gutterTops.push(y);
    endPads.push(pad);
    if (!last && laneAt(i) !== laneAt(i + 1)) {
      // The border runs below the gutter's tracks and walls; heads below it take their full room.
      y += pad + (rows === 0 && walls === 0 ? LANE.pad : tracks);
      wallTops.set(i, y);
      y += walls * WALL.space;
      borders.set(i, y);
      y += LANE.pad + GROUP.head * headsAt(i + 1) + (bandRows.has(i + 1) ? BAND.head : 0);
      return;
    }
    if (walls > 0) {
      // Nothing is placed in a wall: the heads below it take their full room (D43).
      y += pad + tracks;
      wallTops.set(i, y);
      y += walls * WALL.space + headRoom(i, 0);
      return;
    }
    const head = last ? 0 : headRoom(i, tracks);
    y += pad + tracks + head;
  });
  if (colLanes.length > 0 || laneAt(layers.length - 1) !== undefined) y += LANE.pad;
  const lanesBottom = y;
  let bottom = y;
  const note =
    noteLines.length > 0
      ? placeLines("note", noteLines, sp.margin, ceil4(y + FRAME.noteGap), "start", m, T)
      : undefined;
  if (note !== undefined) bottom = note.bbox.y + note.bbox.h;
  const height = ceil4(bottom + sp.margin);

  const rowH = (i: number) => layers[i]?.rowH ?? 0;
  const nodeTop = (layer: number, h: number) => (rowTops[layer] ?? 0) + (rowH(layer) - h) / 2;
  const assembled = assemble(routing, {
    centre,
    top: (n) => nodeTop(n.layer, n.h),
    rowMid: (layer) => (rowTops[layer] ?? 0) + rowH(layer) / 2,
    // Rows sit on fixed slots from the top of the gutter's tracks, so that a row
    // keeps its place when rows are added below it.
    trackY: (g, row) => (gutterTops[g] ?? 0) + (endPads[g] ?? 0) + (row + 1) * sp.trackPitch,
  });

  const layerLabelStyle = T["layer-label"];
  const sceneLayers: SceneLayer[] = layers.map((l, i) => {
    const top = rowTops[i] ?? 0;
    const h = rowH(i);
    const lines = withText ? m.wrap(l.label, layerLabelStyle, 2 * half) : [];
    const label = placeLines("layer-label", lines, sp.margin, top, "start", m, T);
    return { id: l.id, band: { x: sp.margin, y: top, w: width - 2 * sp.margin, h }, label };
  });

  const depthOf = (g: (typeof groups)[number]): number => {
    const parent = groups.find((p) => p.id === g.parent);
    return parent === undefined ? 1 : 1 + depthOf(parent);
  };
  // Outer boxes first, so that each is drawn under the boxes inside it.
  const outerFirst = groups
    .map((g, k) => ({ g, k }))
    .sort((a, b) => depthOf(a.g) - depthOf(b.g) || a.k - b.k)
    .map((x) => x.g);
  const sceneGroups: SceneGroup[] = outerFirst.map((g) => {
    const y0 = (rowTops[g.top] ?? 0) - GROUP.head * heads(g);
    const y1 = (rowTops[g.bottom] ?? 0) + rowH(g.bottom) + GROUP.pad * pads(g);
    const rect: Rect = { x: centre + g.x0, y: y0, w: g.x1 - g.x0, h: y1 - y0 };
    const label = withText
      ? placeLine("group-label", g.label, centre + g.labelX, y0 + GROUP.labelTop, m, T)
      : empty("group-label", centre + g.labelX, y0 + GROUP.labelTop);
    const out: SceneGroup = { id: g.id, rect, label, members: g.members };
    if (depthOf(g) > 1) out.depth = depthOf(g);
    const sub = d.groups?.find((x) => x.id === g.id)?.sublabel;
    if (sub !== undefined && withText) {
      const x = centre + g.labelX + labelW(g) + GROUP.sublabelGap;
      out.sublabel = placeLine("group-sublabel", sub, x, y0 + GROUP.labelTop, m, T);
    }
    return out;
  });

  const sceneBands: SceneBand[] = [...bandRows].map(([i, b]) => {
    const y0 = (rowTops[i] ?? 0) - GROUP.head * headsAt(i) - BAND.head;
    const y1 = (rowTops[i] ?? 0) + rowH(i) + GROUP.pad * padsAt(i) + BAND.pad;
    const x0 = centre + bandLeft;
    const rect: Rect = { x: x0, y: y0, w: contentRight + BAND.padX - bandLeft, h: y1 - y0 };
    const label = withText
      ? placeLine("layer-label", b.label, centre + b.labelX, y0 + BAND.labelTop, m, T)
      : empty("layer-label", centre + b.labelX, y0 + BAND.labelTop);
    return { id: b.id, rect, label };
  });
  const sceneLanes: SceneLane[] = [];
  for (const x of rowLanes) {
    const y0 = x.first === 0 ? lanesTop : (borders.get(x.first - 1) ?? 0);
    const y1 = x.last === layers.length - 1 ? lanesBottom : (borders.get(x.last) ?? 0);
    const rect: Rect = { x: centre + laneLeft, y: y0, w: laneRight - laneLeft, h: y1 - y0 };
    const lx = rect.x + LANE.labelInset;
    const lines = withText ? m.wrap(x.label, laneStyle, headW - 2 * LANE.labelInset) : [];
    sceneLanes.push({
      id: x.id,
      run: "rows",
      rect,
      head: { x: rect.x, y: y0, w: headW, h: y1 - y0 },
      label: placeLines("lane-label", lines, lx, y0 + LANE.labelTop, "start", m, T),
    });
  }
  colLanes.forEach((l, k) => {
    const rect: Rect = { x: centre + l.x0, y: lanesTop, w: l.x1 - l.x0, h: lanesBottom - lanesTop };
    const cx = centre + (l.x0 + l.x1) / 2;
    sceneLanes.push({
      id: l.id,
      run: "columns",
      rect,
      head: { x: rect.x, y: lanesTop, w: rect.w, h: headH },
      label: placeLines(
        "lane-label",
        colLines[k] ?? [],
        cx,
        lanesTop + LANE.labelTop,
        "middle",
        m,
        T,
      ),
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
      // A dot's label stays in the file and in show, but is not drawn (D34).
      if (withText && !isDot(n.node.kind)) {
        const { label: lines, sub } = nodeLines(
          n.node.kind,
          n.w,
          n.h,
          n.node.label,
          n.node.sublabel,
          m,
          T,
          inset,
        );
        const block = lines.length * nodeLh + sub.length * subLh;
        const top = textTop(n.node.kind, rect, block);
        // A left mark takes a column, so the text centres in what is left.
        const cx = rect.x + rect.w / 2 + inset / 2;
        texts.push(placeLines("node-label", lines, cx, top, "middle", m, T));
        if (sub.length > 0) {
          texts.push(
            placeLines("node-sublabel", sub, cx, top + lines.length * nodeLh, "middle", m, T),
          );
        }
      }
      sceneNodes.push({
        id: n.id,
        layer: l.id,
        kind: n.node.kind,
        accent: n.node.accent ?? false,
        rect,
        ...(marks.length > 0 ? { marks } : {}),
        texts,
      });
    }
  }

  // What a label moved off a cut route must keep clear of: boxes, lines, other labels and text.
  const labelAt = new Map<string, Rect>();
  for (const [id, a] of assembled) if (a.label !== undefined) labelAt.set(id, a.label);
  const solid: Rect[] = [
    ...sceneNodes.map((n) => n.rect),
    ...sceneGroups.flatMap((g) => [g.label.bbox, ...(g.sublabel ? [g.sublabel.bbox] : [])]),
    ...sceneBands.map((b) => b.label.bbox),
    ...sceneLanes.map((x) => x.head),
  ];
  const clearOf = (id: string) => (r: Rect) => {
    const pad = ROUTE.labelClear / 2;
    const wide = { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad };
    if (solid.some((s) => overlaps(wide, s))) return false;
    for (const [other, l] of labelAt) if (other !== id && overlaps(wide, l)) return false;
    for (const [other, a] of assembled) {
      if (other === id) continue;
      for (let i = 1; i < a.points.length; i++) {
        if (segmentHits(a.points[i - 1] as Point, a.points[i] as Point, wide)) return false;
      }
    }
    return true;
  };

  const sceneEdges: SceneEdge[] = [];
  for (const e of d.edges) {
    const a = assembled.get(e.id);
    if (a === undefined) continue;
    // The scene names the edge's real ends; a container end's route stops at its box.
    const real = factsById.get(e.id) ?? e;
    let points = a.points;
    const plan = ends.ends.get(e.id);
    const toBox = plan?.to === undefined ? undefined : boxOf.get(plan.to.id);
    const fromBox = plan?.from === undefined ? undefined : boxOf.get(plan.from.id);
    if (toBox !== undefined) points = cutRoute(points, toBox, "end");
    if (fromBox !== undefined) points = cutRoute(points, fromBox, "start");
    const edge: SceneEdge = { id: e.id, from: real.from, to: real.to, kind: e.kind, points };
    if (e.both === true) edge.both = true;
    const width = edgeWidth(e, theme.paint);
    if (width !== undefined && width !== theme.paint.edge.strokeWidth) edge.width = width;
    if (a.label !== undefined && e.label !== undefined && withText) {
      const cutAt = [toBox, fromBox].filter((b): b is Rect => b !== undefined);
      const at = points === a.points ? a.label : besideRoute(points, a.label, cutAt, clearOf(e.id));
      labelAt.set(e.id, at);
      if (at.lines > 1) {
        // A wrapped label: its lines centred on each other, its ink box at the slot.
        const lines = m.wrap(e.label, labelStyle, at.maxWidth);
        const lead = (labelMetrics.lineHeight - labelMetrics.ascent - labelMetrics.descent) / 2;
        edge.label = placeLines("edge-label", lines, at.x + at.w / 2, at.y - lead, "middle", m, T);
      } else {
        edge.label = placeLine("edge-label", e.label, at.x, at.y, m, T);
      }
    }
    sceneEdges.push(edge);
  }

  // Walls (D43): each as long as the boxes of its sides. A labelled one draws a dashed
  // line through its middle, and its label above the line at the first place along
  // it that no crossing line comes near.
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
        // The x of every line that runs down or up through the label's height.
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
        let x = x0 + WALL.reach;
        for (const c of crossing) {
          if (c < x - WALL.labelClear) continue;
          if (c > x + w + WALL.labelClear) break;
          x = c + WALL.labelClear;
        }
        if (x + w > x1 - WALL.reach) x = x0 + WALL.reach;
        x = Math.max(sp.margin, Math.min(x, width - sp.margin - w));
        out.label = placeLine("layer-label", wall.label, x, top, m, T);
      }
    }
    sceneWalls.push(out);
  }

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
  if (theme !== DEFAULT_THEME) scene.paint = theme.paint;
  if (sceneBands.length > 0) scene.bands = sceneBands;
  if (sceneLanes.length > 0) scene.lanes = sceneLanes;
  if (sceneWalls.length > 0) scene.walls = sceneWalls;
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

/** Every coordinate in the scene, rounded to 2 decimals (D15). */
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
      if (e.both === true) out.both = true;
      if (e.width !== undefined) out.width = e.width;
      return out;
    }),
  };
  if (s.paint !== undefined) out.paint = s.paint;
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
    }));
  }
  if (s.bands !== undefined) {
    out.bands = s.bands.map((b) => ({
      id: b.id,
      rect: roundRect(b.rect),
      label: roundText(b.label),
    }));
  }
  if (s.lanes !== undefined) {
    out.lanes = s.lanes.map((x) => ({
      id: x.id,
      run: x.run,
      rect: roundRect(x.rect),
      head: roundRect(x.head),
      label: roundText(x.label),
    }));
  }
  if (s.walls !== undefined) {
    const pt = (p: Point) => ({ x: round2(p.x), y: round2(p.y) });
    out.walls = s.walls.map((w) => ({
      id: w.id,
      run: w.run,
      rect: roundRect(w.rect),
      ...(w.line === undefined ? {} : { line: { a: pt(w.line.a), b: pt(w.line.b) } }),
      ...(w.label === undefined ? {} : { label: roundText(w.label) }),
    }));
  }
  return out;
}
