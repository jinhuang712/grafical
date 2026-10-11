// Layout entry point (DESIGN.md D7, D10, D11, D24, D25). The whole diagram is laid
// out again from its facts on every call, in a fixed order:
// 1. across: every node on a column of one grid shared by all rows, columns chosen
//    so that edges run straight, then spaced for boxes, groups and labels
//    (grid.ts, place.ts);
// 2. routes across: paths, ports, gap tracks and gutter rows (route.ts);
// 3. down: the title, subtitle and legend, then rows and gutters top to bottom,
//    each gutter taking the smallest height step its rows fit in, plus the room
//    group boxes need below their last row and above their first;
// 4. assembly of routes, labels, group boxes, text and the footnote.
// Rows are not drawn (D7): their bands and labels stay in the scene for the
// checker and for debugging.

import type { Diagram, DiagramNode } from "../model/types.ts";
import type {
  PlacedText,
  Rect,
  Scene,
  SceneEdge,
  SceneGroup,
  SceneLayer,
  SceneLegendItem,
  SceneNode,
} from "../scene.ts";
import type { Measurer } from "../text/types.ts";
import { FRAME, GROUP, SPACING, type Spacing } from "../theme/geometry.ts";
import { TYPE_RAMP } from "../theme/type.ts";
import type { AlignmentProblem } from "./align.ts";
import { buildGrid, type GroupProblem } from "./grid.ts";
import { placeAcross } from "./place.ts";
import { assemble, type LabelBox, type LabelForm, round2, routeAcross } from "./route.ts";
import { planSideways } from "./side.ts";
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

/** Does any group have a non-member between two of its members in this row? */
function splitsGroup(nodes: DiagramNode[]): boolean {
  const seen = new Set<string>();
  let current: string | undefined;
  for (const n of nodes) {
    if (n.group === current) continue;
    if (n.group !== undefined && seen.has(n.group)) return true;
    if (current !== undefined) seen.add(current);
    current = n.group;
  }
  return false;
}

/**
 * D24: the index in its layer, counting the node's current position as removed,
 * that gives the fewest edge crossings. A tie goes to the last slot. Each slot is
 * tried with the real router. A slot that would split a group is not taken while
 * another slot keeps the groups whole.
 */
export function chooseSlot(diagram: Diagram, layerId: string, nodeId: string, m: Measurer): number {
  const li = diagram.layers.findIndex((l) => l.id === layerId);
  const layer = diagram.layers[li];
  if (layer === undefined) return 0;
  const node = layer.nodes.find((n) => n.id === nodeId);
  const rest = layer.nodes.filter((n) => n.id !== nodeId);
  if (node === undefined) return rest.length;
  const whole: number[] = [];
  for (let slot = 0; slot <= rest.length; slot++) {
    if (!splitsGroup([...rest.slice(0, slot), node, ...rest.slice(slot)])) whole.push(slot);
  }
  const slots = whole.length > 0 ? whole : Array.from({ length: rest.length + 1 }, (_, i) => i);
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
 * while the cost drops. The other nodes keep their order, and no slot that splits
 * a group or breaks an alignment is taken. Nodes are tried in the order given,
 * slots from the first, so the result is the same on every machine.
 */
export function orderTogether(diagram: Diagram, ids: readonly string[], m: Measurer): Diagram {
  let d = diagram;
  const cost = (x: Diagram) => routeCost(compute(x, m, false).scene);
  const checkAlign = d.layers.some((l) => l.nodes.some((n) => n.align !== undefined));
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
        if (splitsGroup(nodes)) continue;
        const trial: Diagram = {
          ...d,
          layers: d.layers.map((l, i) => (i === li ? { ...l, nodes } : l)),
        };
        if (checkAlign && buildGrid(trial).alignProblems.length > 0) continue;
        if (buildGrid(trial).groupProblems.length > 0) continue;
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
function narrower(text: string, width: number, m: Measurer): LabelForm[] {
  const style = TYPE_RAMP["edge-label"];
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

/** The legend's text for each line style the diagram uses (D8). */
function legendItems(d: Diagram): { style: "solid" | "dashed"; text: string }[] {
  const kinds = new Set(d.edges.map((e) => e.kind));
  const out: { style: "solid" | "dashed"; text: string }[] = [];
  const call = kinds.has("call");
  const data = kinds.has("data");
  if (call || data) {
    out.push({ style: "solid", text: call && data ? "call or read" : call ? "call" : "data read" });
  }
  if (kinds.has("async")) out.push({ style: "dashed", text: "message" });
  return out;
}

const empty = (role: PlacedText["role"], x: number, y: number): PlacedText => ({
  role,
  runs: [],
  bbox: { x, y, w: 0, h: 0 },
});

function compute(d: Diagram, m: Measurer, withText: boolean): { scene: Scene; centre: number } {
  const sp = SPACING[d.density];

  const labelStyle = TYPE_RAMP["edge-label"];
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
        forms ??= narrower(text, w, m);
        return forms;
      },
    });
  }
  const groupStyle = TYPE_RAMP["group-label"];
  const groupW = new Map((d.groups ?? []).map((g) => [g.id, m.measure(g.label, groupStyle).width]));
  const sideways = planSideways(d, (id) => labelSizes.get(id)?.w, labelH);
  const placement = placeAcross(d, {
    sideways,
    edgeLabelW: (id) => labelSizes.get(id)?.w,
    groupLabelW: (id) => groupW.get(id) ?? 0,
  });
  const { layers, nodes, groups } = placement;

  // Where no vertical line may pass: a group's label, above its first row, and the
  // label of an edge that runs sideways, in the gap it crosses.
  const forbidTop = new Map<number, [number, number][]>();
  for (const g of groups) {
    const list = forbidTop.get(g.top) ?? [];
    list.push([g.labelX - GROUP.labelClear, g.labelX + g.labelW + GROUP.labelClear]);
    forbidTop.set(g.top, list);
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
  const routing = routeAcross(layers, nodes, d.edges, labelSizes, sp.trackPitch, {
    sideways,
    forbidTop,
    forbidGap,
    sideLabelX: placement.sideLabels,
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
  for (const [id, x0] of placement.sideLabels) {
    see(x0);
    see(x0 + (labelSizes.get(id)?.w ?? 0));
  }
  if (Number.isFinite(routing.minX)) see(routing.minX - 16);
  if (Number.isFinite(routing.maxX)) see(routing.maxX + 16);
  half = ceil4(Math.max(half, 80));

  // The frame: title, subtitle and legend at the top, the footnote at the bottom.
  const title = withText
    ? placeLine("title", d.title, sp.margin, sp.margin, m)
    : empty("title", sp.margin, sp.margin);
  const legendStyle = TYPE_RAMP.legend;
  const items = withText ? legendItems(d) : [];
  const itemW = items.map(
    (it) => FRAME.legendSample + FRAME.legendLabelGap + m.measure(it.text, legendStyle).width,
  );
  const legendW =
    itemW.reduce((s, w) => s + w, 0) + Math.max(0, items.length - 1) * FRAME.legendItemGap;
  const textW = Math.max(2 * half, FRAME.minTextWidth);
  const subLines =
    withText && d.subtitle !== undefined && d.subtitle !== ""
      ? m.wrap(d.subtitle, TYPE_RAMP.subtitle, textW)
      : [];
  const noteLines =
    withText && d.note !== undefined && d.note !== "" ? m.wrap(d.note, TYPE_RAMP.note, textW) : [];
  const widest = (lines: { width: number }[]) => Math.max(0, ...lines.map((l) => l.width));
  const width = ceil8(
    Math.max(
      2 * sp.margin + 2 * half,
      2 * sp.margin + title.bbox.w + (items.length > 0 ? FRAME.legendGap + legendW : 0),
      2 * sp.margin + widest(subLines),
      2 * sp.margin + widest(noteLines),
    ),
  );
  const centre = width / 2;

  const titleBottom = title.bbox.y + ceil4(title.bbox.h);
  const subtitle =
    subLines.length > 0
      ? placeLines("subtitle", subLines, sp.margin, titleBottom + FRAME.subtitleGap, "start", m)
      : undefined;
  const headBottom = subtitle !== undefined ? subtitle.bbox.y + subtitle.bbox.h : titleBottom;
  const legend: SceneLegendItem[] = [];
  {
    const mid = title.bbox.y + title.bbox.h / 2;
    const lh = lineBox("legend", m);
    let x = width - sp.margin - legendW;
    items.forEach((it, i) => {
      legend.push({
        style: it.style,
        sample: { x1: x, x2: x + FRAME.legendSample, y: mid },
        label: placeLine(
          "legend",
          it.text,
          x + FRAME.legendSample + FRAME.legendLabelGap,
          mid - lh / 2,
          m,
        ),
      });
      x += (itemW[i] ?? 0) + FRAME.legendItemGap;
    });
  }

  // Down: rows and gutters. A gutter holds, top to bottom, the padding of the
  // groups whose last row is above it, its tracks, and the head of the groups
  // whose first row is below it. A head may rise beside the tracks, as in the
  // target, where no run, label or box of the gutter comes near the group; it
  // then adds only what the tracks do not already give it.
  const startsAt = (r: number) => groups.some((g) => g.top === r);
  const endsAt = (r: number) => groups.some((g) => g.bottom === r);
  const near = (g: (typeof groups)[number], lo: number, hi: number) =>
    lo < g.x1 + GROUP.clear && hi > g.x0 - GROUP.clear;
  /** Room the heads of the groups that start below gutter i still need, besides its tracks. */
  const headRoom = (i: number, tracks: number): number => {
    const starting = groups.filter((g) => g.top === i + 1);
    if (starting.length === 0) return 0;
    for (const g of starting) {
      for (const v of routing.gutters[i] ?? []) {
        if (v.row < 0) continue;
        if (v.hi - v.lo > 1e-6 && near(g, v.lo, v.hi)) return GROUP.head;
        if (v.label !== undefined && near(g, v.label.x0, v.label.x0 + v.label.w)) return GROUP.head;
        if (v.detour !== undefined && near(g, v.detour.x, v.detour.x)) return GROUP.head;
      }
      for (const o of groups) if (o.bottom === i && near(g, o.x0, o.x1)) return GROUP.head;
    }
    const crowded = (layers[i]?.nodes ?? []).some((n) =>
      starting.some((g) => near(g, n.x, n.x + n.w)),
    );
    return Math.max(0, GROUP.head + (crowded ? GROUP.clear : 0) - tracks);
  };
  const rowTops: number[] = [];
  const gutterTops: number[] = [];
  const endPads: number[] = [];
  let y = ceil4(headBottom + FRAME.titleGap);
  if (startsAt(0)) y += GROUP.head;
  layers.forEach((l, i) => {
    rowTops.push(y);
    y += l.rowH;
    const rows = routing.rows[i] ?? 0;
    const last = i === layers.length - 1;
    const pad = endsAt(i) ? GROUP.pad : 0;
    const tracks = rows === 0 ? (last ? 0 : (sp.gutterSteps[0] ?? 48)) : gutterHeight(rows, sp);
    const head = last ? 0 : headRoom(i, tracks);
    gutterTops.push(y);
    endPads.push(pad);
    y += pad + tracks + head;
  });
  let bottom = y;
  const note =
    noteLines.length > 0
      ? placeLines("note", noteLines, sp.margin, ceil4(y + FRAME.noteGap), "start", m)
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

  const layerLabelStyle = TYPE_RAMP["layer-label"];
  const sceneLayers: SceneLayer[] = layers.map((l, i) => {
    const top = rowTops[i] ?? 0;
    const h = rowH(i);
    const lines = withText ? m.wrap(l.label, layerLabelStyle, 2 * half) : [];
    const label = placeLines("layer-label", lines, sp.margin, top, "start", m);
    return { id: l.id, band: { x: sp.margin, y: top, w: width - 2 * sp.margin, h }, label };
  });

  const sceneGroups: SceneGroup[] = groups.map((g) => {
    const y0 = (rowTops[g.top] ?? 0) - GROUP.head;
    const y1 = (rowTops[g.bottom] ?? 0) + rowH(g.bottom) + GROUP.pad;
    const rect: Rect = { x: centre + g.x0, y: y0, w: g.x1 - g.x0, h: y1 - y0 };
    const label = withText
      ? placeLine("group-label", g.label, centre + g.labelX, y0 + GROUP.labelTop, m)
      : empty("group-label", centre + g.labelX, y0 + GROUP.labelTop);
    return { id: g.id, rect, label, members: g.members };
  });

  const nodeLabelStyle = TYPE_RAMP["node-label"];
  const subStyle = TYPE_RAMP["node-sublabel"];
  const nodeLh = lineHeight("node-label", m);
  const subLh = lineHeight("node-sublabel", m);
  const sceneNodes: SceneNode[] = [];
  for (const l of layers) {
    for (const n of l.nodes) {
      const rect: Rect = { x: centre + n.x, y: nodeTop(l.index, n.h), w: n.w, h: n.h };
      const texts: PlacedText[] = [];
      if (withText) {
        const room = n.w - 2 * FRAME.textPad;
        const lines = m.wrap(n.node.label, nodeLabelStyle, room);
        const sub =
          n.node.sublabel === undefined || n.node.sublabel === ""
            ? []
            : m.wrap(n.node.sublabel, subStyle, room);
        const block = lines.length * nodeLh + sub.length * subLh;
        // A store's text drops below its lid, but keeps a lid's height from the bottom.
        const slack = (rect.h - block) / 2;
        const drop =
          n.node.kind === "store"
            ? Math.max(0, Math.min(FRAME.storeLid / 2, slack - FRAME.storeLid))
            : 0;
        const top = rect.y + slack + drop;
        const cx = rect.x + rect.w / 2;
        texts.push(placeLines("node-label", lines, cx, top, "middle", m));
        if (sub.length > 0) {
          texts.push(
            placeLines("node-sublabel", sub, cx, top + lines.length * nodeLh, "middle", m),
          );
        }
      }
      sceneNodes.push({
        id: n.id,
        layer: l.id,
        kind: n.node.kind,
        accent: n.node.accent ?? false,
        rect,
        texts,
      });
    }
  }

  const sceneEdges: SceneEdge[] = [];
  for (const e of d.edges) {
    const a = assembled.get(e.id);
    if (a === undefined) continue;
    const edge: SceneEdge = { id: e.id, from: e.from, to: e.to, kind: e.kind, points: a.points };
    if (a.label !== undefined && e.label !== undefined && withText) {
      const at = a.label;
      if (at.lines > 1) {
        // A wrapped label: its lines centred on each other, its ink box at the slot.
        const lines = m.wrap(e.label, labelStyle, at.maxWidth);
        const lead = (labelMetrics.lineHeight - labelMetrics.ascent - labelMetrics.descent) / 2;
        edge.label = placeLines("edge-label", lines, at.x + at.w / 2, at.y - lead, "middle", m);
      } else {
        edge.label = placeLine("edge-label", e.label, at.x, at.y, m);
      }
    }
    sceneEdges.push(edge);
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
      return out;
    }),
  };
  if (s.subtitle !== undefined) out.subtitle = roundText(s.subtitle);
  if (s.note !== undefined) out.note = roundText(s.note);
  if (s.legend !== undefined) {
    out.legend = s.legend.map((it) => ({
      style: it.style,
      sample: { x1: round2(it.sample.x1), x2: round2(it.sample.x2), y: round2(it.sample.y) },
      label: roundText(it.label),
    }));
  }
  if (s.groups !== undefined) {
    out.groups = s.groups.map((g) => ({
      id: g.id,
      rect: roundRect(g.rect),
      label: roundText(g.label),
      members: [...g.members],
    }));
  }
  return out;
}
