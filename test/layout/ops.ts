// The phase 1 operations, applied to a Diagram the way the command line will apply
// them, for the stability tests. A node added or moved goes last in its row, a place
// the agent states (DESIGN.md, "The agent states every order").

import type { Diagram, DiagramNode, Edge, RowLook } from "../../src/model/types.ts";
import type { Named } from "./stability.ts";

export interface Applied {
  diagram: Diagram;
  named: Named;
}

function withLayers(
  d: Diagram,
  f: (nodes: DiagramNode[], layerId: string) => DiagramNode[],
): Diagram {
  return { ...d, layers: d.layers.map((l) => ({ ...l, nodes: f(l.nodes, l.id) })) };
}

function placeLast(d: Diagram, layerId: string, node: DiagramNode): Diagram {
  return withLayers(d, (nodes, id) => (id === layerId ? [...nodes, node] : nodes));
}

export function addNode(d: Diagram, layerId: string, node: DiagramNode): Applied {
  return { diagram: placeLast(d, layerId, node), named: { nodes: [node.id], edges: [] } };
}

/** Removes the node and its edges, and drops alignments to it, as the model does. */
export function removeNode(d: Diagram, id: string): Applied {
  const gone = d.edges.filter((e) => e.from === id || e.to === id).map((e) => e.id);
  const unaligned = d.layers.flatMap((l) => l.nodes.filter((n) => n.align === id).map((n) => n.id));
  return {
    diagram: {
      ...withLayers(d, (nodes) =>
        nodes
          .filter((n) => n.id !== id)
          .map((n) => {
            if (n.align !== id) return n;
            const { align: _, ...rest } = n;
            return rest;
          }),
      ),
      edges: d.edges.filter((e) => !gone.includes(e.id)),
    },
    named: { nodes: [id, ...unaligned], edges: gone },
  };
}

export function renameNode(d: Diagram, id: string, label: string): Applied {
  return {
    diagram: withLayers(d, (nodes) => nodes.map((n) => (n.id === id ? { ...n, label } : n))),
    named: { nodes: [id], edges: [] },
  };
}

export function moveNode(d: Diagram, id: string, layerId: string): Applied {
  const node = d.layers.flatMap((l) => l.nodes).find((n) => n.id === id);
  if (node === undefined) throw new Error(`no node ${id}`);
  const without = withLayers(d, (nodes) => nodes.filter((n) => n.id !== id));
  return { diagram: placeLast(without, layerId, node), named: { nodes: [id], edges: [] } };
}

export function addEdge(d: Diagram, edge: Edge): Applied {
  return { diagram: { ...d, edges: [...d.edges, edge] }, named: { nodes: [], edges: [edge.id] } };
}

export function removeEdge(d: Diagram, id: string): Applied {
  return {
    diagram: { ...d, edges: d.edges.filter((e) => e.id !== id) },
    named: { nodes: [], edges: [id] },
  };
}

/** Gives a row a look, which draws it (DESIGN.md, "A row with a look is drawn"). It names no node and no edge. */
export function lookLayer(d: Diagram, id: string, look: RowLook): Applied {
  return {
    diagram: { ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, look } : l)) },
    named: { nodes: [], edges: [] },
  };
}

/** Numbers one edge as a step (DESIGN.md, "Step badges ride the line"). */
export function numberEdge(d: Diagram, id: string, n: number): Applied {
  return {
    diagram: { ...d, edges: d.edges.map((e) => (e.id === id ? { ...e, step: n } : e)) },
    named: { nodes: [], edges: [id] },
  };
}

/** Plausible and implausible single edges from a fixed seed, with unique ids. */
export function randomEdges(d: Diagram, count: number, seed: number): Edge[] {
  const ids = d.layers.flatMap((l) => l.nodes.map((n) => n.id));
  const taken = new Set(d.edges.map((e) => e.id));
  const kinds = ["call", "async", "data"] as const;
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const out: Edge[] = [];
  while (out.length < count) {
    const from = ids[Math.floor(next() * ids.length)];
    const to = ids[Math.floor(next() * ids.length)];
    const kind = kinds[Math.floor(next() * kinds.length)] ?? "call";
    if (from === undefined || to === undefined) continue;
    let id = `${from}->${to}`;
    for (let k = 2; taken.has(id); k++) id = `${from}->${to}#${k}`;
    taken.add(id);
    const edge: Edge = { id, from, to, kind };
    if (out.length % 2 === 0) edge.label = "new";
    out.push(edge);
  }
  return out;
}
