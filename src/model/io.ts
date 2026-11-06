// Reading and writing the diagram file (FEATURES.md, "The diagram file"; DESIGNS.md, "What grafical cannot fully read, it refuses").

import { parseDocument, stringify } from "yaml";
import type { OpError } from "../errors.ts";
import { parseGrafical, writeGrafical } from "./grafical-format.ts";
import { validateDiagram } from "./schema.ts";
import { STEP_KEYS } from "./steps.ts";
import {
  type Diagram,
  type DiagramNode,
  type Edge,
  type Layer,
  LINE_STYLES,
  MARK_SLOTS,
} from "./types.ts";

export function readDiagram(text: string): Diagram | OpError[] {
  if (text.startsWith("<diagram>")) {
    const plain = parseGrafical(text);
    return Array.isArray(plain) ? plain : validateDiagram(plain);
  }
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
  if (n.labelAlign !== undefined) o.labelAlign = n.labelAlign;
  if (n.size !== undefined) o.size = n.size;
  if (n.accent === true) o.accent = true;
  if (n.align !== undefined) o.align = n.align;
  if (n.group !== undefined) o.group = n.group;
  if (n.lane !== undefined) o.lane = n.lane;
  if (n.column !== undefined) o.column = n.column;
  if (n.type !== undefined) o.type = n.type;
  if (n.style !== undefined) o.style = n.style;
  if (n.icons !== undefined && Object.keys(n.icons).length > 0) {
    const icons: Record<string, unknown> = {};
    for (const slot of MARK_SLOTS) {
      const m = n.icons[slot];
      if (m === undefined) continue;
      if (typeof m === "string") icons[slot] = m;
      else if ("file" in m) {
        icons[slot] = { file: m.file, sha256: m.sha256, ...(m.size ? { size: m.size } : {}) };
      } else {
        // Keys sorted, so the same facts give the same bytes (DESIGNS.md, "The same file gives the same picture on any machine").
        const o: Record<string, string> = {};
        for (const k of ["bg", "border", "fg", "shape", "size", "text"] as const) {
          if (m[k] !== undefined) o[k] = m[k];
        }
        icons[slot] = o;
      }
    }
    o.icons = icons;
  }
  if (n.from !== undefined) o.from = n.from;
  for (const k of STEP_KEYS) if (n[k] !== undefined) o[k] = n[k];
  return o;
}

function layerOut(l: Layer): Record<string, unknown> {
  const o: Record<string, unknown> = { id: l.id };
  if (l.label !== undefined) o.label = l.label;
  if (l.lane !== undefined) o.lane = l.lane;
  if (l.look !== undefined) o.look = l.look;
  o.nodes = l.nodes.map(nodeOut);
  return o;
}

function edgeOut(e: Edge): Record<string, unknown> {
  const o: Record<string, unknown> = { id: e.id, from: e.from, to: e.to, kind: e.kind };
  if (e.label !== undefined) o.label = e.label;
  if (e.labelAlign !== undefined) o.labelAlign = e.labelAlign;
  if (e.both === true) o.both = true;
  if (e.pass === true) o.pass = true;
  if (e.seat !== undefined) o.seat = e.seat;
  if (e.out !== undefined) o.out = e.out;
  if (e.in !== undefined) o.in = e.in;
  if (e.accent === true) o.accent = true;
  if (e.weight !== undefined) o.weight = e.weight;
  if (e.step !== undefined) o.step = e.step;
  if (e.type !== undefined) o.type = e.type;
  if (e.style !== undefined) o.style = e.style;
  return o;
}

/** The file's bytes: a .grafical file in its own form, and any other as YAML until it moves. */
export function fileBytes(d: Diagram, path: string): string {
  return path.endsWith(".grafical") ? writeGrafical(d) : writeDiagram(d);
}

export function writeDiagram(d: Diagram): string {
  const out: Record<string, unknown> = { grafical: d.grafical, title: d.title };
  if (d.subtitle !== undefined) out.subtitle = d.subtitle;
  if (d.note !== undefined) out.note = d.note;
  out.density = d.density;
  if (d.lines !== undefined) out.lines = d.lines;
  if (d.sizing === "fixed") out.sizing = "fixed";
  if (d.style !== undefined) out.style = d.style;
  if (d.types !== undefined && d.types.length > 0) out.types = d.types;
  if (d.styles !== undefined && d.styles.length > 0) out.styles = d.styles;
  if (d.legend !== undefined && Object.keys(d.legend).length > 0) {
    const legend: Record<string, unknown> = {};
    for (const line of LINE_STYLES) {
      const text = d.legend[line];
      if (text !== undefined) legend[line] = text;
    }
    // Sorted, so the same words give the same file whatever order they were set in.
    for (const key of ["weights", "marks"] as const) {
      const words = Object.entries(d.legend[key] ?? {}).sort(([a], [b]) => (a < b ? -1 : 1));
      if (words.length > 0) legend[key] = Object.fromEntries(words);
    }
    out.legend = legend;
  }
  out.layers = d.layers.map(layerOut);
  if (d.nodes !== undefined && d.nodes.length > 0) out.nodes = d.nodes.map(nodeOut);
  if (d.groups !== undefined && d.groups.length > 0) {
    out.groups = d.groups.map((g) => {
      const o: Record<string, unknown> = { id: g.id, label: g.label };
      if (g.sublabel !== undefined) o.sublabel = g.sublabel;
      if (g.in !== undefined) o.in = g.in;
      if (g.titleAt !== undefined) o.titleAt = { ...g.titleAt };
      if (g.style !== undefined) o.style = g.style;
      return o;
    });
  }
  if (d.lanes !== undefined && d.lanes.length > 0) {
    out.lanes = d.lanes.map((x) => ({
      id: x.id,
      label: x.label,
      ...(x.labelAlign === undefined ? {} : { labelAlign: x.labelAlign }),
      ...(x.style === undefined ? {} : { style: x.style }),
    }));
  }
  if (d.columns !== undefined && d.columns.length > 0) {
    out.columns = d.columns.map((x) => ({ id: x.id }));
  }
  if (d.gaps !== undefined && d.gaps.length > 0) {
    out.gaps = d.gaps.map((x) => ({ between: x.between, magnified: x.magnified }));
  }
  if (d.walls !== undefined && d.walls.length > 0) {
    out.walls = d.walls.map((x) => {
      const o: Record<string, unknown> = { id: x.id, between: x.between, and: x.and };
      if (x.allow !== undefined && x.allow.length > 0) o.allow = x.allow;
      if (x.label !== undefined) o.label = x.label;
      if (x.labelAlign !== undefined) o.labelAlign = x.labelAlign;
      return o;
    });
  }
  if (d.notes !== undefined && d.notes.length > 0) {
    out.notes = d.notes.map((x) => ({
      on: x.on,
      text: x.text,
      ...(x.footnote === true ? { footnote: true } : {}),
      ...(x.labelAlign === undefined ? {} : { labelAlign: x.labelAlign }),
    }));
  }
  out.edges = d.edges.map(edgeOut);
  return stringify(out, { lineWidth: 0, indent: 2, indentSeq: true, minContentWidth: 0 });
}
