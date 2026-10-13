// Reading and writing the diagram file (FEATURES.md, "The diagram file"; D22).

import { parseDocument, stringify } from "yaml";
import type { OpError } from "../errors.ts";
import { validateDiagram } from "./schema.ts";
import {
  type Diagram,
  type DiagramNode,
  type Edge,
  type Layer,
  LINE_STYLES,
  MARK_SLOTS,
} from "./types.ts";

export function readDiagram(text: string): Diagram | OpError[] {
  const doc = parseDocument(text, { uniqueKeys: true });
  if (doc.errors.length > 0) return doc.errors.map((e) => yamlError(text, e));
  return validateDiagram(doc.toJS());
}

/** A YAML syntax error: the line and column it is at, from 1, and the text of that line. */
export function yamlError(text: string, err: unknown): OpError {
  const at = (err as { linePos?: { line: number; col: number }[] } | null)?.linePos?.[0];
  const line = at?.line ?? 1;
  return {
    code: "bad-yaml",
    index: 0,
    found: (text.split("\n")[line - 1] ?? "").trim(),
    facts: { line, ...(at !== undefined ? { column: at.col } : {}) },
  };
}

// Key order is fixed here. A field that holds its default is left out.
function nodeOut(n: DiagramNode): Record<string, unknown> {
  const o: Record<string, unknown> = { id: n.id, label: n.label, kind: n.kind };
  if (n.sublabel !== undefined) o.sublabel = n.sublabel;
  if (n.size !== undefined) o.size = n.size;
  if (n.accent === true) o.accent = true;
  if (n.align !== undefined) o.align = n.align;
  if (n.group !== undefined) o.group = n.group;
  if (n.lane !== undefined) o.lane = n.lane;
  if (n.icons !== undefined && Object.keys(n.icons).length > 0) {
    const icons: Record<string, unknown> = {};
    for (const slot of MARK_SLOTS) {
      const m = n.icons[slot];
      if (m === undefined) continue;
      if (typeof m === "string") icons[slot] = m;
      else if ("file" in m) {
        icons[slot] = { file: m.file, sha256: m.sha256, ...(m.size ? { size: m.size } : {}) };
      } else {
        // Keys sorted, so the same facts give the same bytes (D15).
        const o: Record<string, string> = {};
        for (const k of ["bg", "border", "fg", "shape", "size", "text"] as const) {
          if (m[k] !== undefined) o[k] = m[k];
        }
        icons[slot] = o;
      }
    }
    o.icons = icons;
  }
  return o;
}

function layerOut(l: Layer): Record<string, unknown> {
  const o: Record<string, unknown> = { id: l.id, label: l.label };
  if (l.lane !== undefined) o.lane = l.lane;
  o.nodes = l.nodes.map(nodeOut);
  return o;
}

function edgeOut(e: Edge): Record<string, unknown> {
  const o: Record<string, unknown> = { id: e.id, from: e.from, to: e.to, kind: e.kind };
  if (e.label !== undefined) o.label = e.label;
  if (e.both === true) o.both = true;
  if (e.accent === true) o.accent = true;
  if (e.weight !== undefined) o.weight = e.weight;
  return o;
}

export function writeDiagram(d: Diagram): string {
  const out: Record<string, unknown> = { grafical: d.grafical, title: d.title };
  if (d.subtitle !== undefined) out.subtitle = d.subtitle;
  if (d.note !== undefined) out.note = d.note;
  out.density = d.density;
  if (d.sizing === "fixed") out.sizing = "fixed";
  if (d.style !== undefined) out.style = d.style;
  if (d.legend !== undefined && Object.keys(d.legend).length > 0) {
    const legend: Record<string, unknown> = {};
    for (const line of LINE_STYLES) {
      const text = d.legend[line];
      if (text !== undefined) legend[line] = text;
    }
    // Sorted, so the same words give the same file whatever order they were set in.
    const weights = Object.entries(d.legend.weights ?? {}).sort(([a], [b]) => (a < b ? -1 : 1));
    if (weights.length > 0) legend.weights = Object.fromEntries(weights);
    out.legend = legend;
  }
  out.layers = d.layers.map(layerOut);
  if (d.groups !== undefined && d.groups.length > 0) {
    out.groups = d.groups.map((g) => {
      const o: Record<string, unknown> = { id: g.id, label: g.label };
      if (g.sublabel !== undefined) o.sublabel = g.sublabel;
      if (g.in !== undefined) o.in = g.in;
      return o;
    });
  }
  if (d.lanes !== undefined && d.lanes.length > 0) {
    out.lanes = d.lanes.map((x) => ({ id: x.id, label: x.label }));
  }
  out.edges = d.edges.map(edgeOut);
  return stringify(out, { lineWidth: 0, indent: 2, indentSeq: true, minContentWidth: 0 });
}
