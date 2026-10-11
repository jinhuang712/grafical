// `grafical show`: a compact view of a diagram in the operations' own
// vocabulary (DESIGN.md D17). One line per layer, then one line per edge.

import type { Diagram, DiagramNode, Edge } from "../model/types.ts";

function nodeText(n: DiagramNode): string {
  let s = `${n.id} ${JSON.stringify(n.label)} ${n.kind}`;
  if (n.size !== "m") s += ` size=${n.size}`;
  if (n.accent === true) s += " accent";
  if (n.align !== undefined) s += ` align=${n.align}`;
  if (n.sublabel !== undefined) s += ` sub=${JSON.stringify(n.sublabel)}`;
  return s;
}

function edgeText(e: Edge): string {
  const plain = e.id === `${e.from}->${e.to}`;
  let s = plain ? e.id : `${e.id} (${e.from}->${e.to})`;
  if (e.kind !== "call") s += ` [${e.kind}]`;
  if (e.label !== undefined) s += ` ${e.label}`;
  return s;
}

export function showDiagram(d: Diagram): string {
  const lines = [`diagram ${JSON.stringify(d.title)} density=${d.density}`];
  for (const l of d.layers) {
    const nodes = l.nodes.length > 0 ? l.nodes.map(nodeText).join(" | ") : "(empty)";
    lines.push(`layer ${l.id} ${JSON.stringify(l.label)}: ${nodes}`);
  }
  if (d.layers.length === 0) lines.push("(no layers)");
  lines.push(d.edges.length > 0 ? "edges:" : "edges: (none)");
  for (const e of d.edges) lines.push(edgeText(e));
  return `${lines.join("\n")}\n`;
}
