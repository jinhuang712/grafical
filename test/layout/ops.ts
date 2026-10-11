// The phase 1 operations, applied to a Diagram the way the command line will apply
// them, for the stability tests. A node added or moved without a position takes the
// slot chooseSlot picks (D24).

import { chooseSlot } from "../../src/layout/index.ts";
import type { Diagram, DiagramNode, Edge } from "../../src/model/types.ts";
import type { Measurer } from "../../src/text/types.ts";
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

function placeBySlot(d: Diagram, layerId: string, node: DiagramNode, m: Measurer): Diagram {
  const appended = withLayers(d, (nodes, id) => (id === layerId ? [...nodes, node] : nodes));
  const slot = chooseSlot(appended, layerId, node.id, m);
  return withLayers(d, (nodes, id) =>
    id === layerId ? [...nodes.slice(0, slot), node, ...nodes.slice(slot)] : nodes,
  );
}

export function addNode(d: Diagram, layerId: string, node: DiagramNode, m: Measurer): Applied {
  return { diagram: placeBySlot(d, layerId, node, m), named: { nodes: [node.id], edges: [] } };
}

export function removeNode(d: Diagram, id: string): Applied {
  const gone = d.edges.filter((e) => e.from === id || e.to === id).map((e) => e.id);
  return {
    diagram: {
      ...withLayers(d, (nodes) => nodes.filter((n) => n.id !== id)),
      edges: d.edges.filter((e) => !gone.includes(e.id)),
    },
    named: { nodes: [id], edges: gone },
  };
}

export function renameNode(d: Diagram, id: string, label: string): Applied {
  return {
    diagram: withLayers(d, (nodes) => nodes.map((n) => (n.id === id ? { ...n, label } : n))),
    named: { nodes: [id], edges: [] },
  };
}

export function moveNode(d: Diagram, id: string, layerId: string, m: Measurer): Applied {
  const node = d.layers.flatMap((l) => l.nodes).find((n) => n.id === id);
  if (node === undefined) throw new Error(`no node ${id}`);
  const without = withLayers(d, (nodes) => nodes.filter((n) => n.id !== id));
  return { diagram: placeBySlot(without, layerId, node, m), named: { nodes: [id], edges: [] } };
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
