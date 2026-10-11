// Reading and writing the diagram file (FEATURES.md, "The diagram file"; D22).

import { parseDocument, stringify } from "yaml";
import type { OpError } from "../errors.ts";
import { validateDiagram } from "./schema.ts";
import type { Diagram, DiagramNode, Edge, Layer } from "./types.ts";

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
  if (n.size !== "m") o.size = n.size;
  if (n.accent === true) o.accent = true;
  if (n.align !== undefined) o.align = n.align;
  return o;
}

function layerOut(l: Layer): Record<string, unknown> {
  return { id: l.id, label: l.label, nodes: l.nodes.map(nodeOut) };
}

function edgeOut(e: Edge): Record<string, unknown> {
  const o: Record<string, unknown> = { id: e.id, from: e.from, to: e.to, kind: e.kind };
  if (e.label !== undefined) o.label = e.label;
  return o;
}

export function writeDiagram(d: Diagram): string {
  return stringify(
    {
      grafical: d.grafical,
      title: d.title,
      density: d.density,
      layers: d.layers.map(layerOut),
      edges: d.edges.map(edgeOut),
    },
    { lineWidth: 0, indent: 2, indentSeq: true, minContentWidth: 0 },
  );
}
