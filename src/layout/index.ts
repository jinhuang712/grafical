// Layout entry point (DESIGN.md D10, D11, D24). This is a naive stub so the
// rest of the pipeline can run: layers stacked, nodes left to right, straight
// two-bend routes, no labels on edges. The real layout replaces it.

import type { Diagram } from "../model/types.ts";
import type {
  PlacedText,
  Rect,
  Scene,
  SceneEdge,
  SceneLayer,
  SceneNode,
  TextRole,
} from "../scene.ts";
import type { Measurer } from "../text/types.ts";
import { BOX, SPACING } from "../theme/geometry.ts";
import { TYPE_RAMP } from "../theme/type.ts";

function placeText(text: string, role: TextRole, x: number, top: number, m: Measurer): PlacedText {
  const style = TYPE_RAMP[role];
  const line = m.measure(text, style);
  const metrics = m.metrics(style);
  return {
    role,
    runs: line.runs.map((r) => ({
      text: r.text,
      face: r.face,
      size: style.size,
      x: x + r.dx,
      y: top + metrics.ascent,
    })),
    bbox: { x, y: top, w: line.width, h: metrics.ascent + metrics.descent },
  };
}

export function layout(diagram: Diagram, m: Measurer): Scene {
  const sp = SPACING[diagram.density];
  const title = placeText(diagram.title, "title", sp.margin, sp.margin, m);
  let y = title.bbox.y + title.bbox.h + sp.margin;
  const layers: SceneLayer[] = [];
  const nodes: SceneNode[] = [];
  const centre = new Map<string, Rect>();
  let width = 0;
  for (const layer of diagram.layers) {
    const height = Math.max(...layer.nodes.map((n) => BOX[n.size].h), BOX.m.h) + 2 * sp.bandPadding;
    const band: Rect = { x: sp.margin, y, w: 0, h: height };
    let x = sp.margin + 160;
    for (const n of layer.nodes) {
      const box = BOX[n.size];
      const rect: Rect = { x, y: y + (height - box.h) / 2, w: box.w, h: box.h };
      nodes.push({
        id: n.id,
        layer: layer.id,
        kind: n.kind,
        accent: n.accent ?? false,
        rect,
        texts: [placeText(n.label, "node-label", rect.x + 8, rect.y + 8, m)],
      });
      centre.set(n.id, rect);
      x += box.w + sp.nodeGap;
    }
    width = Math.max(width, x);
    layers.push({
      id: layer.id,
      band,
      label: placeText(layer.label, "layer-label", sp.margin + 8, y + 8, m),
    });
    y += height + (sp.gutterSteps[0] ?? 48);
  }
  for (const l of layers) l.band.w = width - sp.margin;
  const edges: SceneEdge[] = diagram.edges.flatMap((e) => {
    const a = centre.get(e.from);
    const b = centre.get(e.to);
    if (!a || !b) return [];
    const ax = a.x + a.w / 2;
    const bx = b.x + b.w / 2;
    const down = b.y > a.y;
    const ay = down ? a.y + a.h : a.y;
    const by = down ? b.y : b.y + b.h;
    const midY = (ay + by) / 2;
    return [
      {
        id: e.id,
        from: e.from,
        to: e.to,
        kind: e.kind,
        points: [
          { x: ax, y: ay },
          { x: ax, y: midY },
          { x: bx, y: midY },
          { x: bx, y: by },
        ],
      },
    ];
  });
  return { width: width + sp.margin, height: y + sp.margin, title, layers, nodes, edges };
}

/**
 * D24: the index in its layer where a node added without a position goes.
 * The stub appends it last.
 */
export function chooseSlot(
  diagram: Diagram,
  layerId: string,
  _nodeId: string,
  _m: Measurer,
): number {
  const layer = diagram.layers.find((l) => l.id === layerId);
  return layer ? layer.nodes.length : 0;
}
