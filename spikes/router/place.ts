// Placement per D10: layers top to bottom, nodes by order, fixed box sizes per size
// step, gaps from the density, layers left-aligned. No search, no optimization.

import type { Density, Diagram, DiagramNode, SizeStep } from "./model.js";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedNode extends Rect {
  id: string;
  node: DiagramNode;
  layer: number;
  order: number;
}

export interface PlacedLayer {
  id: string;
  label: string;
  index: number;
  /** The band drawn behind the layer. */
  band: Rect;
  /** Where the layer label is drawn: an obstacle for routes. */
  header: Rect;
  /** Top of the highest node and bottom of the lowest node in the layer. */
  rowTop: number;
  rowBottom: number;
  nodes: PlacedNode[];
}

export interface Placement {
  width: number;
  height: number;
  titleY: number;
  /** Left edge of the area where nodes may sit (after the layer headers). */
  contentLeft: number;
  /** Right edge of the drawing area. */
  contentRight: number;
  layers: PlacedLayer[];
  nodes: Map<string, PlacedNode>;
  theme: Theme;
}

export interface Theme {
  sizes: Record<SizeStep, { w: number; h: number }>;
  nodeGap: number;
  layerGap: number;
  bandPadY: number;
  headerW: number;
  margin: number;
  titleH: number;
  rightPad: number;
}

const densities: Record<Density, { nodeGap: number; layerGap: number; bandPadY: number }> = {
  compact: { nodeGap: 40, layerGap: 56, bandPadY: 12 },
  normal: { nodeGap: 56, layerGap: 72, bandPadY: 16 },
  airy: { nodeGap: 72, layerGap: 96, bandPadY: 24 },
};

export function themeFor(density: Density): Theme {
  return {
    sizes: { s: { w: 120, h: 44 }, m: { w: 152, h: 52 }, l: { w: 184, h: 52 } },
    ...densities[density],
    headerW: 136,
    margin: 24,
    titleH: 48,
    rightPad: 120,
  };
}

export function place(d: Diagram): Placement {
  const theme = themeFor(d.density);
  const contentLeft = theme.margin + theme.headerW;
  const nodes = new Map<string, PlacedNode>();
  const layers: PlacedLayer[] = [];
  let y = theme.margin + theme.titleH;
  let maxRight = contentLeft;

  d.layers.forEach((layer, li) => {
    const rowH = Math.max(...layer.nodes.map((n) => theme.sizes[n.size].h));
    const bandH = rowH + 2 * theme.bandPadY;
    const placed: PlacedNode[] = [];
    let x = contentLeft + theme.nodeGap;
    layer.nodes.forEach((node, order) => {
      const size = theme.sizes[node.size];
      let nx = x;
      if (node.alignWith !== undefined) {
        const target = nodes.get(node.alignWith);
        if (target === undefined || target.layer >= li) {
          throw new Error(`align: ${node.id} must align with a node in an earlier layer`);
        }
        const wanted = target.x + target.w / 2 - size.w / 2;
        if (wanted < x) {
          throw new Error(
            `align: ${node.id} cannot sit under ${node.alignWith} and keep its order`,
          );
        }
        nx = wanted;
      }
      const pn: PlacedNode = {
        id: node.id,
        node,
        layer: li,
        order,
        x: nx,
        y: y + theme.bandPadY + (rowH - size.h) / 2,
        w: size.w,
        h: size.h,
      };
      placed.push(pn);
      nodes.set(node.id, pn);
      x = nx + size.w + theme.nodeGap;
    });
    maxRight = Math.max(maxRight, x);
    layers.push({
      id: layer.id,
      label: layer.label,
      index: li,
      band: { x: theme.margin, y, w: 0, h: bandH },
      header: { x: theme.margin + 8, y: y + 8, w: theme.headerW - 16, h: bandH - 16 },
      rowTop: Math.min(...placed.map((n) => n.y)),
      rowBottom: Math.max(...placed.map((n) => n.y + n.h)),
      nodes: placed,
    });
    y += bandH + theme.layerGap;
  });

  const contentRight = maxRight + theme.rightPad;
  for (const l of layers) l.band.w = contentRight - theme.margin;
  return {
    width: contentRight + theme.margin,
    height: y - theme.layerGap + theme.margin + theme.layerGap / 2,
    titleY: theme.margin + 20,
    contentLeft,
    contentRight,
    layers,
    nodes,
    theme,
  };
}

// Text width stub: a fixed width per character, Chinese characters count double.
// The text measurement spike chooses the real library (D12).
export function textWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const wide =
      (cp >= 0x2e80 && cp <= 0x9fff) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xff00 && cp <= 0xffef);
    units += wide ? 2 : 1;
  }
  return units * fontSize * 0.58;
}
