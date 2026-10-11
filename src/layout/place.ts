// Placement across (DESIGN.md D10): nodes by their order, box sizes from their size
// steps, gaps from the density, each layer centred on one shared centre line, then
// slid as one block where an alignment asks for it (align.ts). Every x here is
// relative to that centre line, so a layer whose contents did not change, and
// whose aligned nodes' targets did not move, keeps its x values exactly, however
// wide the canvas becomes.

import type { Diagram, DiagramNode } from "../model/types.ts";
import { BOX, SPACING } from "../theme/geometry.ts";
import { type AlignmentProblem, resolveAlignments } from "./align.ts";

export interface PNode {
  id: string;
  node: DiagramNode;
  /** Index of the node's layer, top to bottom. */
  layer: number;
  /** Index within the layer. */
  order: number;
  /** Left edge, relative to the centre line. */
  x: number;
  w: number;
  h: number;
  /** Left edge from even spreading alone, before its layer slides for an alignment. */
  natural: number;
}

export interface PLayer {
  index: number;
  id: string;
  label: string;
  nodes: PNode[];
  /** Height of the tallest box in the layer, or of a medium box if it is empty. */
  rowH: number;
}

export interface Placement {
  layers: PLayer[];
  nodes: Map<string, PNode>;
  problems: AlignmentProblem[];
}

export function placeAcross(d: Diagram): Placement {
  const sp = SPACING[d.density];
  const nodes = new Map<string, PNode>();
  const layers: PLayer[] = d.layers.map((layer, index) => {
    const width =
      layer.nodes.reduce((s, n) => s + BOX[n.size].w, 0) +
      Math.max(0, layer.nodes.length - 1) * sp.nodeGap;
    let x = -width / 2;
    const placed = layer.nodes.map((node, order) => {
      const box = BOX[node.size];
      const pn: PNode = {
        id: node.id,
        node,
        layer: index,
        order,
        x,
        w: box.w,
        h: box.h,
        natural: x,
      };
      x += box.w + sp.nodeGap;
      if (!nodes.has(node.id)) nodes.set(node.id, pn);
      return pn;
    });
    const rowH = placed.length === 0 ? BOX.m.h : Math.max(...placed.map((n) => n.h));
    return { index, id: layer.id, label: layer.label, nodes: placed, rowH };
  });
  const problems = resolveAlignments(layers, nodes);
  return { layers, nodes, problems };
}

export const centreX = (n: PNode): number => n.x + n.w / 2;
