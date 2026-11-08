// `grafical show`: a compact view of a diagram in the operations' own
// vocabulary (DESIGNS.md, "The command line comes first, and the help is the agent's only reference"). One line per layer, then one line per edge.

import { laneNodes, laneRun } from "../model/lanes.ts";
import { everyNode, STEP_KEYS } from "../model/steps.ts";
import {
  type Diagram,
  type DiagramNode,
  EDGE_STYLES,
  type Edge,
  MARK_SLOTS,
  markStyle,
  markText,
} from "../model/types.ts";
import { wallRun } from "../model/walls.ts";

function nodeText(n: DiagramNode): string {
  let s = `${n.id} ${JSON.stringify(n.label)} ${n.kind}`;
  if (n.size !== undefined) s += ` size=${n.size}`;
  if (n.emphasis === true) s += " emphasis";
  if (n.align !== undefined) s += ` align=${n.align}`;
  if (n.group !== undefined) s += ` group=${n.group}`;
  if (n.lane !== undefined) s += ` lane=${n.lane}`;
  if (n.column !== undefined) s += ` column=${n.column}`;
  if (n.sublabel !== undefined) s += ` sub=${JSON.stringify(n.sublabel)}`;
  if (n.labelAlign !== undefined) s += ` [label ${n.labelAlign}]`;
  if (n.from !== undefined) s += ` from=${n.from}`;
  for (const k of STEP_KEYS) if (n[k] !== undefined) s += ` ${k}=${n[k]}`;
  for (const slot of MARK_SLOTS) {
    const m = n.marks?.[slot];
    if (m === undefined) continue;
    s += ` mark.${slot}=${JSON.stringify(markText(m) ?? (m as { file: string }).file)}`;
    for (const [k, v] of Object.entries(markStyle(m))) s += ` mark.${slot}.${k}=${v}`;
  }
  return s;
}

function edgeText(e: Edge): string {
  const plain = e.id === `${e.from}->${e.to}`;
  let s = plain ? e.id : `${e.id} (${e.from}->${e.to})`;
  if (e.kind !== "call") s += ` [${e.kind}]`;
  if (e.both === true) s += " [both ends]";
  if (e.pass === true) s += " [passes bars]";
  if (e.seat !== undefined) s += " [label beside]";
  if (e.labelAlign !== undefined) s += ` [label ${e.labelAlign}]`;
  if (e.labelStyle !== undefined) s += ` [label style ${e.labelStyle.join(",")}]`;
  if (e.out !== undefined) s += ` [out ${e.out}]`;
  if (e.in !== undefined) s += ` [in ${e.in}]`;
  if (e.weight !== undefined) s += ` [weight ${e.weight}]`;
  if (e.step !== undefined) s += ` [step ${e.step}]`;
  if (e.label !== undefined) s += ` ${e.label.includes("\n") ? JSON.stringify(e.label) : e.label}`;
  return s;
}

export function showDiagram(d: Diagram): string {
  const sizing = d.sizing === "fixed" ? " sizing=fixed" : "";
  const lines = [`diagram ${JSON.stringify(d.title)} density=${d.density}${sizing}`];
  if (d.subtitle !== undefined) lines.push(`subtitle ${JSON.stringify(d.subtitle)}`);
  if (d.caption !== undefined) lines.push(`caption ${JSON.stringify(d.caption)}`);
  for (const styleName of EDGE_STYLES) {
    const text = d.legend?.[styleName];
    if (text !== undefined) lines.push(`legend ${styleName} ${JSON.stringify(text)}`);
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
    const label = l.label === undefined ? "" : ` ${JSON.stringify(l.label)}`;
    const at = l.labelAt === undefined ? "" : ` label-at=${l.labelAt}`;
    lines.push(`layer ${l.id}${label}${lane}${look}${at}: ${nodes}`);
  }
  if (d.layers.length === 0) lines.push("(no layers)");
  // Nodes in no layer, placed by steps from another node (specs/decisions, "Steps from another node").
  for (const n of d.nodes ?? []) lines.push(`node ${nodeText(n)}`);
  for (const g of d.groups ?? []) {
    const members = everyNode(d)
      .filter((n) => n.group === g.id)
      .map((n) => n.id);
    const sub = g.sublabel === undefined ? "" : ` sub=${JSON.stringify(g.sublabel)}`;
    const inner = (d.groups ?? []).filter((x) => x.in === g.id).map((x) => `group ${x.id}`);
    const where = g.in === undefined ? "" : ` in=${g.in}`;
    const t = g.titleAt;
    const title = t === undefined ? "" : ` title=${t.at},${t.side},${t.place}`;
    lines.push(
      `group ${g.id} ${JSON.stringify(g.label)}${sub}${where}${title}: ${[...members, ...inner].join(", ") || "(empty)"}`,
    );
  }
  const run = laneRun(d);
  for (const x of d.lanes ?? []) {
    const members =
      run === "layers"
        ? d.layers.filter((l) => l.lane === x.id).map((l) => l.id)
        : laneNodes(d, x.id);
    const way = run === undefined ? "" : ` (${run})`;
    const at = x.labelAt === undefined ? "" : ` label-at=${x.labelAt}`;
    lines.push(
      `lane ${x.id} ${JSON.stringify(x.label)}${way}${at}: ${members.join(", ") || "(empty)"}`,
    );
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
  for (const g of d.gaps ?? []) {
    lines.push(`gap ${g.between.join(" ")} magnified=${g.magnified}`);
  }
  for (const x of d.notes ?? []) {
    lines.push(
      `note on=${x.on}${x.footnote === true ? " footnote" : ""}${x.labelAlign === undefined ? "" : ` [text ${x.labelAlign}]`} ${JSON.stringify(x.text)}`,
    );
  }
  lines.push(d.edges.length > 0 ? "edges:" : "edges: (none)");
  for (const e of d.edges) lines.push(edgeText(e));
  return `${lines.join("\n")}\n`;
}

/**
 * One object and what refers to it (specs/decisions, "The file is blocks of attributes, and a reference carries @"), or
 * undefined when no object has the ID. Nobody searches the file as text: this is how an agent finds what touches a name.
 */
export function showObject(d: Diagram, id: string): string | undefined {
  const facts = (o: object) =>
    Object.entries(o)
      .filter(([k, v]) => k !== "nodes" && v !== undefined)
      .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`);
  const nodes = everyNode(d);
  const kinds: [string, { id: string } | undefined][] = [
    ["node", nodes.find((x) => x.id === id)],
    ["edge", d.edges.find((x) => x.id === id)],
    ["layer", d.layers.find((x) => x.id === id)],
    ["group", d.groups?.find((x) => x.id === id)],
    ["lane", d.lanes?.find((x) => x.id === id)],
    ["column", d.columns?.find((x) => x.id === id)],
    ["wall", d.walls?.find((x) => x.id === id)],
  ];
  const found = kinds.find(([, o]) => o !== undefined);
  if (found === undefined) return undefined;
  const refs = [
    ...d.edges.filter((e) => e.from === id || e.to === id).map((e) => `edge ${e.id}`),
    ...nodes
      .filter((n) => {
        const place = n as { from?: string };
        return (
          n.group === id || n.lane === id || n.column === id || n.align === id || place.from === id
        );
      })
      .map((n) => `node ${n.id}`),
    ...d.layers.filter((l) => l.lane === id).map((l) => `layer ${l.id}`),
    ...(d.groups ?? []).filter((g) => g.in === id).map((g) => `group ${g.id}`),
    ...(d.notes ?? []).filter((n) => n.on === id).map(() => "note"),
  ];
  const [sort, object] = found;
  const head = [`${sort} ${id}`, ...facts(object as object)];
  const used = refs.length === 0 ? [] : ["used by:", ...refs.map((r) => `  ${r}`)];
  return `${[...head, ...used].join("\n")}\n`;
}
