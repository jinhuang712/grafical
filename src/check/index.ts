// Defect checker (DESIGN.md D14). Pure: it reads the diagram, the scene and a
// measurer, and returns every mechanical flaw, in a deterministic order.

import { DEFECT_CODES, type Defect } from "../errors.ts";
import type { Diagram } from "../model/types.ts";
import type { PlacedText, Rect, Scene, SceneEdge, SceneNode } from "../scene.ts";
import type { Measurer } from "../text/types.ts";
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

/** Text must stay this far inside its node's rect. */
export const NODE_PADDING = 8;
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

function checkOverflow(diagram: Diagram, scene: Scene, out: Defect[]): void {
  const model = new Map<string, { size: string; layer: string }>();
  for (const layer of diagram.layers) {
    for (const n of layer.nodes) model.set(n.id, { size: n.size, layer: layer.id });
  }
  for (const n of scene.nodes) {
    const box = inset(n.rect, NODE_PADDING);
    const info = model.get(n.id);
    for (const t of n.texts) {
      const isSub = t.role === "node-sublabel";
      const max = isSub ? MAX_SUBLABEL_LINES : MAX_LABEL_LINES;
      const lines = lineCount(t);
      const what = isSub ? "sublabel" : "label";
      const shorten = isSub
        ? `shorten the ${what} of ${n.id}: remove the node and add it again with a shorter --sublabel`
        : `grafical node rename <file> ${n.id} --label <shorter text>`;
      if (lines > max) {
        out.push({
          code: "overflow",
          elements: [n.id],
          found: `the ${what} of ${n.id} has ${lines} lines`,
          expected: `at most ${max} ${max === 1 ? "line" : "lines"}`,
          fix: shorten,
        });
      } else if (!rectInside(t.bbox, box)) {
        const bigger =
          !isSub && info && info.size !== "l"
            ? `, or remove ${n.id} and add it again with --size l`
            : "";
        out.push({
          code: "overflow",
          elements: [n.id],
          found: `the ${what} of ${n.id} spans ${rectText(t.bbox)}, outside ${rectText(box)}`,
          expected: `text inside the box with ${NODE_PADDING}px padding`,
          fix: isSub ? shorten : `${shorten}${bigger}`,
        });
      }
    }
  }
}

function checkNodeOverlap(scene: Scene, out: Defect[]): void {
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

function checkEdgeThroughNode(scene: Scene, out: Defect[]): void {
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

function checkLabelCollision(scene: Scene, out: Defect[]): void {
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

function sharedEndpoints(a: SceneEdge, b: SceneEdge): string[] {
  return [a.from, a.to].filter((id) => id === b.from || id === b.to);
}

function checkEdgeOverlap(scene: Scene, out: Defect[]): void {
  const rects = new Map(scene.nodes.map((n) => [n.id, n.rect]));
  const edges = scene.edges;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i] as SceneEdge;
      const b = edges[j] as SceneEdge;
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

function checkMissingGlyphs(diagram: Diagram, m: Measurer, out: Defect[]): void {
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

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function check(diagram: Diagram, scene: Scene, measurer: Measurer): Defect[] {
  const out: Defect[] = [];
  checkOverflow(diagram, scene, out);
  checkNodeOverlap(scene, out);
  checkEdgeThroughNode(scene, out);
  checkLabelCollision(scene, out);
  checkEdgeOverlap(scene, out);
  checkMissingGlyphs(diagram, measurer, out);
  const order = (d: Defect): number => DEFECT_CODES.indexOf(d.code);
  return out.sort(
    (a, b) =>
      order(a) - order(b) ||
      compare(a.elements.join("\u0000"), b.elements.join("\u0000")) ||
      compare(a.found, b.found),
  );
}
