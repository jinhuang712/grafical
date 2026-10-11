// `grafical show`: a compact view of a diagram in the operations' own
// vocabulary (DESIGN.md D17). One line per layer, then one line per edge.

import { laneNodes, laneRun } from "../model/lanes.ts";
import { type Diagram, type DiagramNode, type Edge, LINE_STYLES } from "../model/types.ts";

function nodeText(n: DiagramNode): string {
  let s = `${n.id} ${JSON.stringify(n.label)} ${n.kind}`;
  if (n.size !== undefined) s += ` size=${n.size}`;
  if (n.accent === true) s += " accent";
  if (n.align !== undefined) s += ` align=${n.align}`;
  if (n.group !== undefined) s += ` group=${n.group}`;
  if (n.lane !== undefined) s += ` lane=${n.lane}`;
  if (n.sublabel !== undefined) s += ` sub=${JSON.stringify(n.sublabel)}`;
  return s;
}

function edgeText(e: Edge): string {
  const plain = e.id === `${e.from}->${e.to}`;
  let s = plain ? e.id : `${e.id} (${e.from}->${e.to})`;
  if (e.kind !== "call") s += ` [${e.kind}]`;
  if (e.both === true) s += " [both ends]";
  if (e.accent === true) s += " [main]";
  if (e.label !== undefined) s += ` ${e.label}`;
  return s;
}

export function showDiagram(d: Diagram): string {
  const sizing = d.sizing === "fixed" ? " sizing=fixed" : "";
  const lines = [`diagram ${JSON.stringify(d.title)} density=${d.density}${sizing}`];
  if (d.subtitle !== undefined) lines.push(`subtitle ${JSON.stringify(d.subtitle)}`);
  if (d.note !== undefined) lines.push(`note ${JSON.stringify(d.note)}`);
  for (const line of LINE_STYLES) {
    const text = d.legend?.[line];
    if (text !== undefined) lines.push(`legend ${line} ${JSON.stringify(text)}`);
  }
  for (const l of d.layers) {
    const nodes = l.nodes.length > 0 ? l.nodes.map(nodeText).join(" | ") : "(empty)";
    const lane = l.lane === undefined ? "" : ` lane=${l.lane}`;
    lines.push(`layer ${l.id} ${JSON.stringify(l.label)}${lane}: ${nodes}`);
  }
  if (d.layers.length === 0) lines.push("(no layers)");
  for (const g of d.groups ?? []) {
    const members = d.layers.flatMap((l) =>
      l.nodes.filter((n) => n.group === g.id).map((n) => n.id),
    );
    const sub = g.sublabel === undefined ? "" : ` sub=${JSON.stringify(g.sublabel)}`;
    lines.push(
      `group ${g.id} ${JSON.stringify(g.label)}${sub}: ${members.join(", ") || "(empty)"}`,
    );
  }
  const run = laneRun(d);
  for (const x of d.lanes ?? []) {
    const members =
      run === "rows"
        ? d.layers.filter((l) => l.lane === x.id).map((l) => l.id)
        : laneNodes(d, x.id);
    const way = run === undefined ? "" : ` (${run})`;
    lines.push(`lane ${x.id} ${JSON.stringify(x.label)}${way}: ${members.join(", ") || "(empty)"}`);
  }
  lines.push(d.edges.length > 0 ? "edges:" : "edges: (none)");
  for (const e of d.edges) lines.push(edgeText(e));
  return `${lines.join("\n")}\n`;
}
