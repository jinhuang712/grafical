import { describe, expect, it } from "vitest";
import type { OpError } from "../../src/errors.ts";
import { readDiagram } from "../../src/model/index.ts";

function errorsOf(text: string): OpError[] {
  const r = readDiagram(text);
  if (!Array.isArray(r)) throw new Error("expected errors");
  return r;
}

const head = "grafical: 1\ntitle: T\n";
const layers = (nodes: string, more = "") =>
  `${head}layers:\n  - id: a\n    label: A\n    nodes:\n${nodes}${more}`;

describe("file validation", () => {
  it("rejects an unknown kind and lists the allowed values", () => {
    const [e] = errorsOf(layers("      - id: n\n        label: N\n        kind: database\n"));
    expect(e).toMatchObject({
      code: "bad-value",
      field: "layers[0].nodes[0].kind",
      found: "database",
    });
    expect(e?.suggestion).toBe("allowed: service, store, queue, external, actor");
  });

  it("rejects an unknown size", () => {
    const [e] = errorsOf(layers("      - id: n\n        label: N\n        size: xl\n"));
    expect(e).toMatchObject({ code: "bad-value", field: "layers[0].nodes[0].size" });
    expect(e?.suggestion).toBe("allowed: s, m, l");
  });

  it("rejects an unknown density", () => {
    const [e] = errorsOf(`${head}density: tight\n`);
    expect(e).toMatchObject({ code: "bad-value", field: "density", found: "tight" });
    expect(e?.suggestion).toBe("allowed: compact, normal, airy");
  });

  it("rejects a bad id", () => {
    const [e] = errorsOf(layers("      - id: Bad_Id\n        label: N\n"));
    expect(e).toMatchObject({ code: "bad-id", found: "Bad_Id" });
    expect(e?.expected).toContain("lowercase");
  });

  it("rejects a duplicate id across layers, nodes and edges", () => {
    const text = `${layers("      - id: n\n        label: N\n      - id: a\n        label: Same as layer\n")}`;
    const [e] = errorsOf(text);
    expect(e).toMatchObject({ code: "duplicate-id", found: "a", field: "layers[0].nodes[1].id" });
    expect(e?.suggestion).toContain("layers[0].id");
  });

  it("rejects an edge that points at a missing node and suggests the closest", () => {
    const text = layers(
      "      - id: relay\n        label: R\n      - id: kafka\n        label: K\n",
      "edges:\n  - id: e\n    from: relay\n    to: kafak\n",
    );
    const [e] = errorsOf(text);
    expect(e).toMatchObject({ code: "unknown-node", field: "edges[0].to", found: "kafak" });
    expect(e?.suggestion).toBe("closest ids: kafka, relay, a");
  });

  it("rejects an align to a node in the same layer", () => {
    const text = layers(
      "      - id: n\n        label: N\n        align: m\n      - id: m\n        label: M\n",
    );
    expect(errorsOf(text)[0]).toMatchObject({
      code: "align-same-layer",
      field: "layers[0].nodes[0].align",
    });
  });

  it("rejects an align to a missing node", () => {
    const text = layers("      - id: n\n        label: N\n        align: zzz\n");
    expect(errorsOf(text)[0]).toMatchObject({ code: "unknown-node", found: "zzz" });
  });

  it("rejects more than two accents", () => {
    const n = (id: string) => `      - id: ${id}\n        label: ${id}\n        accent: true\n`;
    expect(errorsOf(layers(n("a1") + n("a2") + n("a3")))[0]?.code).toBe("too-many-accents");
  });

  it("rejects unknown fields and suggests the nearest", () => {
    const [e] = errorsOf(layers("      - id: n\n        label: N\n        sublable: x\n"));
    expect(e).toMatchObject({ code: "unknown-field", found: "sublable" });
    expect(e?.suggestion).toBe("did you mean: sublabel, label");
  });

  it("rejects a missing title and a wrong type", () => {
    const missing = errorsOf("grafical: 1\n");
    expect(missing[0]).toMatchObject({ code: "missing-field", field: "title" });
    const wrong = errorsOf("grafical: 1\ntitle: T\nlayers: nope\n");
    expect(wrong[0]).toMatchObject({ code: "bad-type", field: "layers" });
  });

  it("rejects an empty label and a missing version", () => {
    expect(errorsOf(layers("      - id: n\n        label: ''\n"))[0]?.code).toBe("empty-value");
    expect(errorsOf("title: T\n")[0]).toMatchObject({ code: "missing-field", field: "grafical" });
  });

  it("allows edge ids with -> and a #n suffix", () => {
    const text = layers(
      "      - id: a1\n        label: A\n      - id: b1\n        label: B\n",
      "edges:\n  - id: a1->b1#2\n    from: a1\n    to: b1\n",
    );
    expect(Array.isArray(readDiagram(text))).toBe(false);
  });
});
