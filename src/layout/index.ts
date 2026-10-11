// Layout entry point (DESIGN.md D10, D11, D24). The whole diagram is laid out again
// from its facts on every call, in a fixed order and without search:
// 1. across: each layer centred and spread evenly, then aligned nodes slid (place.ts);
// 2. routes across: paths, ports, gap tracks and gutter rows (route.ts);
// 3. down: the title, then bands and gutters top to bottom, each gutter taking the
//    smallest height step its rows fit in;
// 4. assembly of routes, labels and text.

import type { Diagram } from "../model/types.ts";
import type { PlacedText, Rect, Scene, SceneEdge, SceneLayer, SceneNode } from "../scene.ts";
import type { Measurer } from "../text/types.ts";
import { FRAME, SPACING, type Spacing } from "../theme/geometry.ts";
import { TYPE_RAMP } from "../theme/type.ts";
import type { AlignmentProblem } from "./align.ts";
import { placeAcross } from "./place.ts";
import { assemble, type LabelBox, type LabelForm, round2, routeAcross } from "./route.ts";
import { routeStats } from "./stats.ts";
import { lineHeight, placeLine, placeLines } from "./text.ts";

export type { AlignmentCode, AlignmentProblem } from "./align.ts";
export { type RouteStats, routeStats } from "./stats.ts";

export function layout(diagram: Diagram, m: Measurer): Scene {
  return compute(diagram, m, true).scene;
}

/**
 * The scene and the absolute x of the centre line every layer is centred on.
 * Stability (D10) is measured relative to that line: a wider canvas may shift
 * everything by the same amount.
 */
export function layoutFramed(diagram: Diagram, m: Measurer): { scene: Scene; centre: number } {
  return compute(diagram, m, true);
}

/**
 * Alignments that cannot hold with the order of their layers (D10), and other
 * alignment faults. The command line turns each into an operation error.
 */
export function validateAlignments(diagram: Diagram): AlignmentProblem[] {
  return placeAcross(diagram).problems;
}

/**
 * D24: the index in its layer, counting the node's current position as removed,
 * that gives the fewest edge crossings. A tie goes to the last slot. Each slot is
 * tried with the real router.
 */
export function chooseSlot(diagram: Diagram, layerId: string, nodeId: string, m: Measurer): number {
  const li = diagram.layers.findIndex((l) => l.id === layerId);
  const layer = diagram.layers[li];
  if (layer === undefined) return 0;
  const node = layer.nodes.find((n) => n.id === nodeId);
  const rest = layer.nodes.filter((n) => n.id !== nodeId);
  if (node === undefined) return rest.length;
  let best = rest.length;
  let fewest = Number.POSITIVE_INFINITY;
  for (let slot = 0; slot <= rest.length; slot++) {
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

const ceil4 = (x: number) => Math.ceil(x / 4 - 1e-9) * 4;

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

function compute(d: Diagram, m: Measurer, withText: boolean): { scene: Scene; centre: number } {
  const sp = SPACING[d.density];
  const placement = placeAcross(d);
  const { layers, nodes } = placement;

  const labelStyle = TYPE_RAMP["edge-label"];
  const labelMetrics = m.metrics(labelStyle);
  const labelSizes = new Map<string, LabelBox>();
  for (const e of d.edges) {
    const text = e.label;
    if (text === undefined || text === "") continue;
    const w = m.measure(text, labelStyle).width;
    let forms: LabelForm[] | undefined;
    labelSizes.set(e.id, {
      w,
      h: labelMetrics.ascent + labelMetrics.descent,
      narrower: () => {
        forms ??= narrower(text, w, m);
        return forms;
      },
    });
  }
  const routing = routeAcross(layers, nodes, d.edges, labelSizes, sp.trackPitch);

  // Across: the content is symmetric about the centre line.
  let half = 0;
  for (const n of nodes.values()) half = Math.max(half, Math.abs(n.x), Math.abs(n.x + n.w));
  half += sp.nodeGap;
  if (Number.isFinite(routing.minX)) half = Math.max(half, -routing.minX + 16);
  if (Number.isFinite(routing.maxX)) half = Math.max(half, routing.maxX + 16);
  half = ceil4(Math.max(half, 80));
  const contentLeft = sp.margin + FRAME.labelColumn;
  const centre = contentLeft + half;
  const contentRight = centre + half;

  const title = withText
    ? placeLine("title", d.title, sp.margin, sp.margin, m)
    : { role: "title" as const, runs: [], bbox: { x: sp.margin, y: sp.margin, w: 0, h: 0 } };
  const titleH = ceil4(title.bbox.h);
  const width = ceil4(Math.max(contentRight + sp.margin, 2 * sp.margin + title.bbox.w));

  // Down: bands and gutters.
  const layerLabelStyle = TYPE_RAMP["layer-label"];
  const layerLabelLh = lineHeight("layer-label", m);
  const bandTops: number[] = [];
  const bandHs: number[] = [];
  const gutterTops: number[] = [];
  const gutterHs: number[] = [];
  const layerLines = layers.map((l) =>
    withText ? m.wrap(l.label, layerLabelStyle, FRAME.labelColumn - 2 * FRAME.labelPad) : [],
  );
  let y = sp.margin + titleH + FRAME.titleGap;
  layers.forEach((l, i) => {
    const textH = (layerLines[i]?.length ?? 0) * layerLabelLh;
    const bandH = ceil4(Math.max(l.rowH, textH) + 2 * sp.bandPadding);
    bandTops.push(y);
    bandHs.push(bandH);
    y += bandH;
    const rows = routing.rows[i] ?? 0;
    const last = i === layers.length - 1;
    const gh =
      rows === 0 && last ? 0 : rows === 0 ? (sp.gutterSteps[0] ?? 48) : gutterHeight(rows, sp);
    gutterTops.push(y);
    gutterHs.push(gh);
    y += gh;
  });
  const height = ceil4(y + sp.margin);

  const nodeTop = (layer: number, h: number) =>
    (bandTops[layer] ?? 0) + ((bandHs[layer] ?? 0) - h) / 2;
  const assembled = assemble(routing, {
    centre,
    top: (n) => nodeTop(n.layer, n.h),
    rowMid: (layer) => (bandTops[layer] ?? 0) + (bandHs[layer] ?? 0) / 2,
    // Rows sit on fixed slots from the top of the gutter, so that a row keeps its
    // place when rows are added below it.
    trackY: (g, row) => (gutterTops[g] ?? 0) + (row + 1) * sp.trackPitch,
  });

  const sceneLayers: SceneLayer[] = layers.map((l, i) => {
    const top = bandTops[i] ?? 0;
    const h = bandHs[i] ?? 0;
    const lines = layerLines[i] ?? [];
    const label = placeLines(
      "layer-label",
      lines,
      sp.margin + FRAME.labelPad,
      top + (h - lines.length * layerLabelLh) / 2,
      "start",
      m,
    );
    return { id: l.id, band: { x: sp.margin, y: top, w: width - 2 * sp.margin, h }, label };
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
        const top = rect.y + (rect.h - block) / 2;
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

  const scene = roundScene({
    width,
    height,
    title,
    layers: sceneLayers,
    nodes: sceneNodes,
    edges: sceneEdges,
  });
  return { scene, centre };
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
  return {
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
}
