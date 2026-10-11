// Defect checker (DESIGN.md D14). Pure: it reads the diagram, the scene and a
// measurer, and returns every mechanical flaw, in a deterministic order.

import { DEFECT_CODES, DEFECT_OWNER, type Defect } from "../errors.ts";
import type { Diagram } from "../model/types.ts";
import type { PlacedText, Rect, Scene, SceneEdge, SceneNode } from "../scene.ts";
import type { Measurer } from "../text/types.ts";
import { lineStyle } from "../theme/paint.ts";
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
/** Two edges must share at least this much length to count as overlapping. */
export const MIN_SHARED_LENGTH = 8;
export const MAX_LABEL_LINES = 2;
export const MAX_SUBLABEL_LINES = 1;

const r2 = (v: number): string => String(Math.round(v * 100) / 100);
const rectText = (r: Rect): string =>
  `x ${r2(r.x)}..${r2(r.x + r.w)}, y ${r2(r.y)}..${r2(r.y + r.h)}`;

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
  for (const n of scene.nodes) {
    const box = inset(n.rect, NODE_PADDING, NODE_PADDING_Y);
    for (const t of n.texts) {
      const isSub = t.role === "node-sublabel";
      const max = isSub ? MAX_SUBLABEL_LINES : MAX_LABEL_LINES;
      const lines = lineCount(t);
      const what = isSub ? "sublabel" : "label";
      const shorten = isSub
        ? `shorten the ${what} of ${n.id}: remove the node and add it again with a shorter --sublabel`
        : `grafical node rename <file> ${n.id} --label <shorter text>`;
      const bigger = canGrow.has(n.id) ? `, or grafical node resize <file> ${n.id} --size l` : "";
      if (lines > max) {
        out.push({
          code: "overflow",
          elements: [n.id],
          found: `the ${what} of ${n.id} has ${lines} lines`,
          expected: `at most ${max} ${max === 1 ? "line" : "lines"}`,
          fix: `${shorten}${bigger}`,
        });
      } else if (!rectInside(t.bbox, box)) {
        out.push({
          code: "overflow",
          elements: [n.id],
          found: `the ${what} of ${n.id} spans ${rectText(t.bbox)}, outside ${rectText(box)}`,
          expected: `text inside the box, ${NODE_PADDING}px from its sides and ${NODE_PADDING_Y}px from its top and bottom`,
          fix: `${shorten}${bigger}`,
        });
      }
    }
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
          found: `${a.id} (${rectText(a.rect)}) overlaps ${b.id} (${rectText(b.rect)})`,
          expected: "node boxes that do not intersect",
          fix: `grafical node move <file> ${b.id} --layer <layer> --after ${a.id}`,
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
          found: `edge ${e.id} passes through node ${n.id}`,
          expected: "a route that goes around nodes other than its two ends",
          fix: `grafical node move <file> ${n.id} --layer <layer> --first (or --last), so the route can pass beside it`,
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
          found: `the label of edge ${e.id} overlaps node ${n.id}`,
          expected: "an edge label clear of nodes",
          fix: `grafical edge remove <file> ${e.id}, then add it again with a shorter --label`,
        });
      }
    }
    for (const o of scene.edges) {
      if (o.id === e.id) continue;
      if (segmentsOf(o.points).some((s) => segmentCrossesRect(s, box))) {
        out.push({
          code: "label-collision",
          elements: [e.id, o.id],
          found: `the label of edge ${e.id} sits on edge ${o.id}`,
          expected: "an edge label clear of other edges",
          fix: `grafical edge remove <file> ${e.id}, then add it again with a shorter --label`,
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
          found: `the labels of edges ${a.id} and ${b.id} overlap`,
          expected: "edge labels that do not overlap",
          fix: `grafical edge remove <file> ${b.id}, then add it again with a shorter --label`,
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
  const targets: { id: string; what: string; text: PlacedText; owner?: string }[] = [];
  for (const n of scene.nodes) {
    for (const t of n.texts) targets.push({ id: n.id, what: `the text of node ${n.id}`, text: t });
  }
  for (const e of scene.edges) {
    if (e.label) {
      targets.push({ id: e.id, what: `the label of edge ${e.id}`, text: e.label, owner: e.id });
    }
  }
  for (const g of scene.groups ?? []) {
    targets.push({ id: g.id, what: `the label of group ${g.id}`, text: g.label });
  }
  for (const b of scene.bands ?? []) {
    targets.push({ id: b.id, what: `the label of layer ${b.id}`, text: b.label });
  }
  const named: [string, PlacedText | undefined][] = [
    ["subtitle", scene.subtitle],
    ["note", scene.note],
    ["title", scene.title],
  ];
  for (const [id, t] of named) if (t) targets.push({ id, what: `the ${id}`, text: t });
  for (const [i, item] of (scene.legend ?? []).entries()) {
    targets.push({ id: `legend-${i}`, what: `legend item ${i + 1}`, text: item.label });
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
          found: `edge ${e.id} crosses ${t.what}`,
          expected: "lines that never run through text",
          fix: `none for the agent: the engine must route ${e.id} around the text`,
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
        found: `node ${n.id} (${rectText(n.rect)}) lies inside group ${g.id} (${rectText(g.rect)}) but is not a member`,
        expected: "only members inside a group box",
        fix: `grafical node move <file> ${n.id} --layer <layer> --first (or --last), so the group box can close around its members`,
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
          found: `edges ${a.id} and ${b.id} share ${r2(length(worst))}px of one line, from (${r2(worst.a.x)}, ${r2(worst.a.y)}) to (${r2(worst.b.x)}, ${r2(worst.b.y)})`,
          expected: "edges that can be told apart",
          fix: `grafical node move <file> <node of ${b.id}> --after <neighbour>, to change how the edges are routed`,
        });
      }
    }
  }
}

function checkMissingGlyphs(diagram: Diagram, m: Measurer, out: Found[]): void {
  const add = (id: string, what: string, text: string | undefined, fix: string): void => {
    if (!text) return;
    const missing = m.missingGlyphs(text);
    if (missing.length === 0) return;
    out.push({
      code: "missing-glyph",
      elements: [id],
      found: `the ${what} "${text}" has characters no bundled font can draw: ${missing.join(" ")}`,
      expected: "characters that Inter or Noto Sans SC can draw",
      fix,
    });
  };
  add(
    "title",
    "title",
    diagram.title,
    "replace the title with characters the fonts can draw: grafical new <file> --title <text>",
  );
  add(
    "subtitle",
    "subtitle",
    diagram.subtitle,
    "grafical diagram subtitle <file> --text <text without these characters>",
  );
  add(
    "note",
    "note",
    diagram.note,
    "grafical diagram note <file> --text <text without these characters>",
  );
  for (const g of diagram.groups ?? []) {
    add(
      g.id,
      "group label",
      g.label,
      `grafical group rename <file> ${g.id} --label <text without these characters>`,
    );
  }
  for (const layer of diagram.layers) {
    add(
      layer.id,
      "layer label",
      layer.label,
      `change the label of layer ${layer.id} to text without these characters`,
    );
    for (const n of layer.nodes) {
      add(
        n.id,
        "label",
        n.label,
        `grafical node rename <file> ${n.id} --label <text without these characters>`,
      );
      add(
        n.id,
        "sublabel",
        n.sublabel,
        `remove ${n.id} and add it again with a --sublabel without these characters`,
      );
    }
  }
  for (const e of diagram.edges) {
    add(
      e.id,
      "edge label",
      e.label,
      `grafical edge remove <file> ${e.id}, then add it again with a --label without these characters`,
    );
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
  checkNodeOverlap(scene, out);
  checkEdgeThroughNode(scene, out);
  checkLabelCollision(scene, out);
  checkEdgeOverlap(scene, out);
  checkTextCrossing(scene, out);
  checkGroupIntruder(scene, out);
  checkMissingGlyphs(diagram, measurer, out);
  const order = (d: Found): number => DEFECT_CODES.indexOf(d.code);
  return out
    .sort(
      (a, b) =>
        order(a) - order(b) ||
        compare(a.elements.join("\u0000"), b.elements.join("\u0000")) ||
        compare(a.found, b.found),
    )
    .map((d) => ({
      code: d.code,
      owner: DEFECT_OWNER[d.code],
      elements: d.elements,
      found: d.found,
      expected: d.expected,
      fix: d.fix,
    }));
}
