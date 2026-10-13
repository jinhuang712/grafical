// Defect checker (DESIGN.md D14). Pure: it reads the diagram, the scene and a
// measurer, and returns every mechanical flaw, in a deterministic order.

import { DEFECT_CODES, DEFECT_OWNER, type Defect } from "../errors.ts";
import { laneNodes } from "../model/lanes.ts";
import { type Diagram, LINE_STYLES, MARK_SLOTS, markText } from "../model/types.ts";
import { isEmoji } from "../render/marks.ts";
import type { PlacedText, Rect, Scene, SceneEdge, SceneNode } from "../scene.ts";
import type { Measurer } from "../text/types.ts";
import { lineStyle } from "../theme/paint.ts";
import { textInside } from "../theme/shapes.ts";
import {
  collinearOverlap,
  inset,
  length,
  pointNearRect,
  rectInside,
  rectsOverlap,
  type Segment,
  segmentCrossesRect,
  segmentsOf,
} from "./geometry.ts";

/** Text must stay this far inside its node's rect, left and right. */
export const NODE_PADDING = 8;
/**
 * Text must stay this far inside its node's rect, top and bottom. It is smaller
 * than the side padding because a text bbox is a line box: it already includes
 * the fonts' ascent and descent, which reach well beyond the visible letters.
 */
export const NODE_PADDING_Y = 4;
/** An edge may graze a node's rect by this much, at its ports. */
export const PORT_TOLERANCE = 4;
/** How far a text's box may reach under a corner mark before the mark covers it (D40). */
export const MARK_TEXT_SLACK = 3;
/** Two edges must share at least this much length to count as overlapping. */
export const MIN_SHARED_LENGTH = 8;
export const MAX_LABEL_LINES = 2;
export const MAX_SUBLABEL_LINES = 1;

const r2 = (v: number): string => String(Math.round(v * 100) / 100);

function lineCount(t: PlacedText): number {
  return new Set(t.runs.map((r) => r2(r.y))).size;
}

function checkOverflow(diagram: Diagram, scene: Scene, out: Found[]): void {
  // A node may grow to l by node resize when it is not l already. One the engine
  // sizes (D27) is already l when its text needs it, unless sizing is fixed.
  const canGrow = new Set<string>();
  for (const layer of diagram.layers) {
    for (const n of layer.nodes) {
      const explicit = n.size !== undefined && n.size !== "l";
      if (explicit || (n.size === undefined && diagram.sizing === "fixed")) canGrow.add(n.id);
    }
  }
  const texts = new Map<string, { label: string; sublabel?: string }>();
  for (const layer of diagram.layers) for (const n of layer.nodes) texts.set(n.id, n);
  for (const n of scene.nodes) {
    for (const t of n.texts) {
      const isSub = t.role === "node-sublabel";
      const max = isSub ? MAX_SUBLABEL_LINES : MAX_LABEL_LINES;
      const lines = lineCount(t);
      const field = isSub ? "sublabel" : "label";
      const fix = [
        isSub
          ? `grafical node describe <file> ${n.id} --text <shorter text>`
          : `grafical node rename <file> ${n.id} --label <shorter text>`,
        ...(canGrow.has(n.id) ? [`grafical node resize <file> ${n.id} --size l`] : []),
      ];
      const found = (isSub ? texts.get(n.id)?.sublabel : texts.get(n.id)?.label) ?? "";
      if (lines > max) {
        out.push({ code: "overflow", elements: [n.id], field, found, facts: { lines, max, fix } });
      } else if (!textInside(n.kind, n.rect, t.bbox)) {
        out.push({ code: "overflow", elements: [n.id], field, found, facts: { lines, fix } });
      }
    }
  }
}

/** A lane's label stays inside its header (D32). Row lane headers are narrow, so a long label can run out below. */
function checkLaneLabels(scene: Scene, out: Found[]): void {
  for (const x of scene.lanes ?? []) {
    if (rectInside(x.label.bbox, x.head)) continue;
    out.push({
      code: "overflow",
      elements: [x.id],
      field: "label",
      found: x.label.runs.map((r) => r.text).join(" "),
      facts: { fix: [`grafical lane rename <file> ${x.id} --label <shorter text>`] },
    });
  }
}

function checkNodeOverlap(scene: Scene, out: Found[]): void {
  const nodes = scene.nodes;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i] as SceneNode;
      const b = nodes[j] as SceneNode;
      if (rectsOverlap(a.rect, b.rect)) {
        out.push({
          code: "node-overlap",
          elements: [a.id, b.id].sort(),
          facts: {},
        });
      }
    }
  }
}

/**
 * A mark must not cover text or another node (D40). A corner mark sticks out of its
 * box, so a long label or a close neighbour can meet it.
 */
function checkMarkCovers(scene: Scene, out: Found[]): void {
  for (const n of scene.nodes) {
    for (const mark of n.marks ?? []) {
      // Two ways out: a larger box, or the same mark on the other side of the box, which
      // takes the old slot's mark away first.
      const other = mark.slot.replace(/^top|^bottom/, (v) => (v === "top" ? "bottom" : "top"));
      const fix = [
        `grafical node resize <file> ${n.id} --size l`,
        `grafical node icon <file> ${n.id} --slot ${mark.slot}`,
        `grafical node icon <file> ${n.id} --slot ${other} --icon <mark>`,
      ];
      // A text's box is taller and wider than its ink, so a few pixels of it may meet a mark.
      if (n.texts.some((t) => rectsOverlap(inset(t.bbox, MARK_TEXT_SLACK), mark.rect))) {
        out.push({
          code: "mark-covers",
          elements: [n.id],
          field: "icon",
          found: mark.slot,
          facts: { is: "label", fix },
        });
      }
      for (const other of scene.nodes) {
        if (other.id === n.id || !rectsOverlap(other.rect, mark.rect)) continue;
        out.push({
          code: "mark-covers",
          elements: [n.id, other.id].sort(),
          field: "icon",
          found: mark.slot,
          facts: { is: "node", fix },
        });
      }
    }
  }
}

function checkEdgeThroughNode(scene: Scene, out: Found[]): void {
  for (const e of scene.edges) {
    const segs = segmentsOf(e.points);
    for (const n of scene.nodes) {
      if (n.id === e.from || n.id === e.to) continue;
      const core = inset(n.rect, PORT_TOLERANCE);
      if (segs.some((s) => segmentCrossesRect(s, core))) {
        out.push({
          code: "edge-through-node",
          elements: [e.id, n.id],
          facts: {},
        });
      }
    }
  }
}

function checkLabelCollision(scene: Scene, out: Found[]): void {
  const labelled = scene.edges.filter((e): e is SceneEdge & { label: PlacedText } => !!e.label);
  for (const e of labelled) {
    const box = e.label.bbox;
    for (const n of scene.nodes) {
      if (rectsOverlap(box, n.rect)) {
        out.push({
          code: "label-collision",
          elements: [e.id, n.id],
          facts: { is: "node" },
        });
      }
    }
    for (const o of scene.edges) {
      if (o.id === e.id) continue;
      if (segmentsOf(o.points).some((s) => segmentCrossesRect(s, box))) {
        out.push({
          code: "label-collision",
          elements: [e.id, o.id],
          facts: { is: "edge" },
        });
      }
    }
  }
  for (let i = 0; i < labelled.length; i++) {
    for (let j = i + 1; j < labelled.length; j++) {
      const a = labelled[i] as SceneEdge & { label: PlacedText };
      const b = labelled[j] as SceneEdge & { label: PlacedText };
      if (rectsOverlap(a.label.bbox, b.label.bbox)) {
        out.push({
          code: "label-collision",
          elements: [a.id, b.id].sort(),
          facts: { is: "label" },
        });
      }
    }
  }
}

/** An edge may graze a text box by this much before it counts as crossing it (D25 rule 8). */
export const TEXT_TOLERANCE = 2;

/**
 * No edge segment crosses any text: node labels, other edges' labels, group
 * labels, subtitle, note, title or legend. An edge's own label is exempt,
 * because its segments run next to it by design.
 */
function checkTextCrossing(scene: Scene, out: Found[]): void {
  // Each text, with the element it belongs to and what that element is.
  const targets: { id: string; is: string; text: PlacedText; owner?: string }[] = [];
  for (const n of scene.nodes) {
    for (const t of n.texts) targets.push({ id: n.id, is: "node", text: t });
  }
  for (const e of scene.edges) {
    if (e.label) targets.push({ id: e.id, is: "edge", text: e.label, owner: e.id });
  }
  for (const g of scene.groups ?? []) {
    targets.push({ id: g.id, is: "group", text: g.label });
    if (g.sublabel) targets.push({ id: g.id, is: "group", text: g.sublabel });
  }
  for (const b of scene.bands ?? []) targets.push({ id: b.id, is: "layer", text: b.label });
  for (const x of scene.lanes ?? []) targets.push({ id: x.id, is: "lane", text: x.label });
  const named: [string, PlacedText | undefined][] = [
    ["subtitle", scene.subtitle],
    ["note", scene.note],
    ["title", scene.title],
  ];
  for (const [id, t] of named) if (t) targets.push({ id, is: id, text: t });
  for (const [i, item] of (scene.legend ?? []).entries()) {
    targets.push({ id: `legend-${i}`, is: "legend", text: item.label });
  }
  for (const e of scene.edges) {
    const segs = segmentsOf(e.points);
    for (const t of targets) {
      if (t.owner === e.id) continue;
      const box = inset(t.text.bbox, TEXT_TOLERANCE);
      if (segs.some((s) => segmentCrossesRect(s, box))) {
        out.push({
          code: "text-crossing",
          elements: [e.id, t.id],
          facts: { is: t.is },
        });
      }
    }
  }
}

/** A node that is not a member lies inside a group's box (D7). */
function checkGroupIntruder(scene: Scene, out: Found[]): void {
  for (const g of scene.groups ?? []) {
    const members = new Set(g.members);
    for (const n of scene.nodes) {
      if (members.has(n.id) || !rectsOverlap(n.rect, g.rect)) continue;
      out.push({
        code: "group-intruder",
        elements: [g.id, n.id],
        facts: {},
      });
    }
  }
}

/** Every node of a lane lies inside it, and no other node does (D32). */
function checkLaneStray(diagram: Diagram, scene: Scene, out: Found[]): void {
  for (const x of scene.lanes ?? []) {
    const members = new Set(laneNodes(diagram, x.id));
    for (const n of scene.nodes) {
      const member = members.has(n.id);
      if (member ? rectInside(n.rect, x.rect) : !rectsOverlap(n.rect, x.rect)) continue;
      out.push({
        code: "lane-stray",
        elements: [x.id, n.id],
        facts: { lane: member ? x.id : "none" },
      });
    }
  }
}

function sharedEndpoints(a: SceneEdge, b: SceneEdge): string[] {
  return [a.from, a.to].filter((id) => id === b.from || id === b.to);
}

/**
 * The router draws a fan-out of unlabelled edges in one line style from one node as a
 * bus: one trunk that branches (D11). Its members share segments on purpose, and
 * a reader loses nothing, since they carry no label and look the same.
 */
function isBus(a: SceneEdge, b: SceneEdge): boolean {
  return a.from === b.from && lineStyle(a.kind) === lineStyle(b.kind) && !a.label && !b.label;
}

function checkEdgeOverlap(scene: Scene, out: Found[]): void {
  const rects = new Map(scene.nodes.map((n) => [n.id, n.rect]));
  const edges = scene.edges;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i] as SceneEdge;
      const b = edges[j] as SceneEdge;
      if (isBus(a, b)) continue;
      const shared = sharedEndpoints(a, b)
        .map((id) => rects.get(id))
        .filter((r): r is Rect => !!r);
      let worst: Segment | undefined;
      for (const s of segmentsOf(a.points)) {
        for (const t of segmentsOf(b.points)) {
          const o = collinearOverlap(s, t);
          if (!o || length(o) < MIN_SHARED_LENGTH) continue;
          const nearShared = shared.some(
            (r) => pointNearRect(o.a, r, PORT_TOLERANCE) || pointNearRect(o.b, r, PORT_TOLERANCE),
          );
          if (nearShared) continue;
          if (!worst || length(o) > length(worst)) worst = o;
        }
      }
      if (worst) {
        out.push({
          code: "edge-overlap",
          elements: [a.id, b.id].sort(),
          facts: { shared: Math.round(length(worst)) },
        });
      }
    }
  }
}

function checkMissingGlyphs(diagram: Diagram, m: Measurer, out: Found[]): void {
  const add = (id: string, field: string, text: string | undefined, fix: string): void => {
    if (!text) return;
    const missing = m.missingGlyphs(text);
    if (missing.length === 0) return;
    out.push({
      code: "missing-glyph",
      elements: [id],
      field,
      found: text,
      facts: { chars: missing, fix: [fix] },
    });
  };
  add("title", "title", diagram.title, "grafical diagram title <file> --text <text>");
  add("subtitle", "subtitle", diagram.subtitle, "grafical diagram subtitle <file> --text <text>");
  add("note", "note", diagram.note, "grafical diagram note <file> --text <text>");
  for (const g of diagram.groups ?? []) {
    add(g.id, "label", g.label, `grafical group rename <file> ${g.id} --label <text>`);
    add(g.id, "sublabel", g.sublabel, `grafical group describe <file> ${g.id} --text <text>`);
  }
  for (const x of diagram.lanes ?? []) {
    add(x.id, "label", x.label, `grafical lane rename <file> ${x.id} --label <text>`);
  }
  for (const line of LINE_STYLES) {
    add(
      `legend-${line}`,
      "text",
      diagram.legend?.[line],
      `grafical diagram legend <file> ${line} --text <text>`,
    );
  }
  for (const layer of diagram.layers) {
    add(layer.id, "label", layer.label, `grafical layer rename <file> ${layer.id} --label <text>`);
    for (const n of layer.nodes) {
      add(n.id, "label", n.label, `grafical node rename <file> ${n.id} --label <text>`);
      add(n.id, "sublabel", n.sublabel, `grafical node describe <file> ${n.id} --text <text>`);
      for (const slot of MARK_SLOTS) {
        const mark = n.icons?.[slot];
        // An emoji is drawn as a picture, so only plain text needs the fonts.
        const text = mark === undefined ? undefined : markText(mark);
        if (text !== undefined && !isEmoji(text)) {
          add(n.id, "icon", text, `grafical node icon <file> ${n.id} --slot ${slot} --icon <text>`);
        }
      }
    }
  }
  for (const e of diagram.edges) {
    add(e.id, "label", e.label, `grafical edge relabel <file> ${e.id} --label <text>`);
  }
}

export { measureTaste, type TasteReport, type TasteRule } from "./taste.ts";

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A defect before its owner is filled in from its code. */
type Found = Omit<Defect, "owner">;

/** Every defect, agent-owned and engine-owned, in a deterministic order (D14). */
export function check(diagram: Diagram, scene: Scene, measurer: Measurer): Defect[] {
  const out: Found[] = [];
  checkOverflow(diagram, scene, out);
  checkLaneLabels(scene, out);
  checkNodeOverlap(scene, out);
  checkMarkCovers(scene, out);
  checkEdgeThroughNode(scene, out);
  checkLabelCollision(scene, out);
  checkEdgeOverlap(scene, out);
  checkTextCrossing(scene, out);
  checkGroupIntruder(scene, out);
  checkLaneStray(diagram, scene, out);
  checkMissingGlyphs(diagram, measurer, out);
  const order = (d: Found): number => DEFECT_CODES.indexOf(d.code);
  return out
    .sort(
      (a, b) =>
        order(a) - order(b) ||
        compare(a.elements.join("\u0000"), b.elements.join("\u0000")) ||
        compare(
          `${a.field ?? ""}\u0000${a.found ?? ""}`,
          `${b.field ?? ""}\u0000${b.found ?? ""}`,
        ) ||
        compare(JSON.stringify(a.facts), JSON.stringify(b.facts)),
    )
    .map((d) => ({
      code: d.code,
      owner: DEFECT_OWNER[d.code],
      elements: d.elements,
      ...(d.field !== undefined ? { field: d.field } : {}),
      ...(d.found !== undefined ? { found: d.found } : {}),
      facts: d.facts,
    }));
}
