// `grafical show`: a compact view of a diagram in the operations' own
// vocabulary (DESIGN.md, "Interfaces"). One line per layer, then one line per edge.

import { laneNodes, laneRun } from "../model/lanes.ts";
import { everyNode, STEP_KEYS } from "../model/steps.ts";
import {
  type Diagram,
  type DiagramNode,
  type Edge,
  LINE_STYLES,
  MARK_SLOTS,
  markStyle,
  markText,
} from "../model/types.ts";
import { wallRun } from "../model/walls.ts";

function nodeText(n: DiagramNode): string {
  let s = `${n.id} ${JSON.stringify(n.label)} ${n.kind}`;
  if (n.size !== undefined) s += ` size=${n.size}`;
  if (n.accent === true) s += " accent";
  if (n.align !== undefined) s += ` align=${n.align}`;
  if (n.group !== undefined) s += ` group=${n.group}`;
  if (n.lane !== undefined) s += ` lane=${n.lane}`;
  if (n.column !== undefined) s += ` column=${n.column}`;
  if (n.sublabel !== undefined) s += ` sub=${JSON.stringify(n.sublabel)}`;
  if (n.from !== undefined) s += ` from=${n.from}`;
  for (const k of STEP_KEYS) if (n[k] !== undefined) s += ` ${k}=${n[k]}`;
  for (const slot of MARK_SLOTS) {
    const m = n.icons?.[slot];
    if (m === undefined) continue;
    s += ` icon.${slot}=${JSON.stringify(markText(m) ?? (m as { file: string }).file)}`;
    for (const [k, v] of Object.entries(markStyle(m))) s += ` icon.${slot}.${k}=${v}`;
  }
  return s;
}

function edgeText(e: Edge): string {
  const plain = e.id === `${e.from}->${e.to}`;
  let s = plain ? e.id : `${e.id} (${e.from}->${e.to})`;
  if (e.kind !== "call") s += ` [${e.kind}]`;
  if (e.both === true) s += " [both ends]";
  if (e.pass === true) s += " [passes bars]";
  if (e.weight !== undefined) s += ` [weight ${e.weight}]`;
  else if (e.accent === true) s += " [main]";
  if (e.step !== undefined) s += ` [step ${e.step}]`;
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
  for (const [w, text] of Object.entries(d.legend?.weights ?? {})) {
    lines.push(`legend weight ${w} ${JSON.stringify(text)}`);
  }
  for (const [mark, text] of Object.entries(d.legend?.marks ?? {})) {
    lines.push(`legend mark ${JSON.stringify(mark)} ${JSON.stringify(text)}`);
  }
  for (const l of d.layers) {
    const nodes = l.nodes.length > 0 ? l.nodes.map(nodeText).join(" | ") : "(empty)";
    const lane = l.lane === undefined ? "" : ` lane=${l.lane}`;
    const look = l.look === undefined ? "" : ` look=${l.look}`;
    lines.push(`layer ${l.id} ${JSON.stringify(l.label)}${lane}${look}: ${nodes}`);
  }
  if (d.layers.length === 0) lines.push("(no layers)");
  // Boxes in no row, placed by steps from another box (DESIGN.md, "Steps from another box").
  for (const n of d.nodes ?? []) lines.push(`node ${nodeText(n)}`);
  for (const g of d.groups ?? []) {
    const members = everyNode(d)
      .filter((n) => n.group === g.id)
      .map((n) => n.id);
    const sub = g.sublabel === undefined ? "" : ` sub=${JSON.stringify(g.sublabel)}`;
    const inner = (d.groups ?? []).filter((x) => x.in === g.id).map((x) => `group ${x.id}`);
    const where = g.in === undefined ? "" : ` in=${g.in}`;
    const title = g.titleAt === undefined ? "" : ` title=${g.titleAt}`;
    lines.push(
      `group ${g.id} ${JSON.stringify(g.label)}${sub}${where}${title}: ${[...members, ...inner].join(", ") || "(empty)"}`,
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
  for (const c of d.columns ?? []) {
    const members = d.layers.flatMap((l) =>
      l.nodes.filter((n) => n.column === c.id).map((n) => n.id),
    );
    lines.push(`column ${c.id}: ${members.join(", ") || "(empty)"}`);
  }
  for (const w of d.walls ?? []) {
    const label = w.label === undefined ? "" : ` ${JSON.stringify(w.label)}`;
    const way = wallRun(d, w)?.run;
    const allow = w.allow === undefined ? "" : ` allow=${w.allow.join(",")}`;
    lines.push(
      `wall ${w.id}${label}${way === undefined ? "" : ` (${way})`}: between=${w.between.join(",")} and=${w.and.join(",")}${allow}`,
    );
  }
  for (const x of d.notes ?? []) lines.push(`note on=${x.on} ${JSON.stringify(x.text)}`);
  lines.push(d.edges.length > 0 ? "edges:" : "edges: (none)");
  for (const e of d.edges) lines.push(edgeText(e));
  return `${lines.join("\n")}\n`;
}
