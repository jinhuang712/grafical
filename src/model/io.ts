// Reading and writing the diagram file (FEATURES.md, "The diagram file"; D22).

import { parseDocument, stringify } from "yaml";
import type { OpError } from "../errors.ts";
import { validateDiagram } from "./schema.ts";
import { type Diagram, type DiagramNode, type Edge, type Layer, LINE_STYLES } from "./types.ts";

export function readDiagram(text: string): Diagram | OpError[] {
  const doc = parseDocument(text, { uniqueKeys: true });
  if (doc.errors.length > 0) {
    return doc.errors.map((e) => ({
      code: "bad-yaml",
      index: 0,
      found: e.message.split("\n")[0] ?? "invalid YAML",
      expected: "a valid YAML diagram file",
      suggestion: `line ${e.linePos?.[0]?.line ?? 1}; fix the syntax or recreate with grafical new`,
    }));
  }
  return validateDiagram(doc.toJS());
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
    const legend: Record<string, string> = {};
    for (const line of LINE_STYLES) {
      const text = d.legend[line];
      if (text !== undefined) legend[line] = text;
    }
    out.legend = legend;
  }
  out.layers = d.layers.map(layerOut);
  if (d.groups !== undefined && d.groups.length > 0) {
    out.groups = d.groups.map((g) =>
      g.sublabel === undefined
        ? { id: g.id, label: g.label }
        : { id: g.id, label: g.label, sublabel: g.sublabel },
    );
  }
  if (d.lanes !== undefined && d.lanes.length > 0) {
    out.lanes = d.lanes.map((x) => ({ id: x.id, label: x.label }));
  }
  out.edges = d.edges.map(edgeOut);
  return stringify(out, { lineWidth: 0, indent: 2, indentSeq: true, minContentWidth: 0 });
}
