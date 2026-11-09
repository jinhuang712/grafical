import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import type { Diagram } from "../../src/model/index.ts";
import {
  FORMAT_VERSION,
  readDiagram,
  validateDiagram,
  writeDiagram,
} from "../../src/model/index.ts";

const FILE = `<diagram> {
  format: 1
  title: "Catalog sync"
  density: normal
}

<layer> ingest {
}

<layer> store {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @ingest
    @store
}

<order> ingest-order {
  of: @ingest
  axis: across
  items:
    @relay
    @kafka
}

<order> store-order {
  of: @store
  axis: across
  items:
    @db
}

<node> relay {
  type: @service
  text: "catalog-relay"
  sublabel: "tier 1, :7101"
  layer: @ingest
}

<node> kafka {
  type: @queue
  text: "Kafka"
  layer: @ingest
  size: l
  emphasis: true
}

<node> db {
  type: @store
  text: "数据库"
  layer: @store
  align: @kafka
}

<edge> relay->kafka {
  from: @relay
  to: @kafka
  type: @async
}

<edge> kafka->db {
  from: @kafka
  to: @db
  type: @call
}

<label> ingest-label {
  on: @ingest
  text: "Ingest"
}

<label> store-label {
  on: @store
  text: "Store"
}

<label> relay->kafka-label {
  on: @relay->kafka
  text: "produce"
}
`;

describe("readDiagram and writeDiagram", () => {
  it("round-trips a canonical file byte for byte", () => {
    const d = readDiagram(FILE);
    expect(Array.isArray(d)).toBe(false);
    expect(writeDiagram(d as Diagram)).toBe(FILE);
  });

  it("is byte-stable across repeated reads and writes", () => {
    let text = FILE;
    for (let i = 0; i < 3; i++) text = writeDiagram(readDiagram(text) as Diagram);
    expect(text).toBe(FILE);
  });

  it("leaves out defaults and applies them when reading", () => {
    const d = validateDiagram(
      parse(
        "grafical: 1\ntitle: T\nlayers:\n  - id: a\n    label: A\n    nodes:\n      - id: n\n        label: N\n",
      ),
    ) as Diagram;
    expect(d.density).toBe("normal");
    // No size: the engine sizes the node to its text (specs/decisions, "Nodes sized to their text").
    expect(d.layers[0]?.nodes[0]).toEqual({ id: "n", label: "N", kind: "service" });
    const out = writeDiagram(d);
    expect(out).not.toContain("size");
    expect(out).not.toContain("emphasis");
    expect(out).not.toContain("align");
  });

  it("reads and writes a layer without a label", () => {
    const text =
      "grafical: 1\ntitle: T\ndensity: normal\nlayers:\n  - id: a\n    look: band\n    nodes:\n      - id: n\n        label: N\n";
    const d = validateDiagram(parse(text)) as Diagram;
    expect(d.layers[0]).not.toHaveProperty("label");
    const out = writeDiagram(d);
    expect(out).not.toMatch(/label: undefined|id: a\n {4}label/);
    expect(readDiagram(out)).toEqual(d);
  });

  it("writes keys in the documented order", () => {
    const out = writeDiagram(readDiagram(FILE) as Diagram);
    const sorts = out.split("\n").filter((l) => l.startsWith("<"));
    expect(sorts.slice(0, 4)).toEqual([
      "<diagram> {",
      "<layer> ingest {",
      "<layer> store {",
      "<order> layers {",
    ]);
  });

  it("quotes labels that YAML would misread", () => {
    const d = readDiagram(FILE) as Diagram;
    const tricky = structuredClone(d);
    const first = tricky.layers[0]?.nodes[0];
    if (first) first.label = "yes";
    const again = readDiagram(writeDiagram(tricky)) as Diagram;
    expect(again.layers[0]?.nodes[0]?.label).toBe("yes");
  });

  it("writes an empty diagram", () => {
    const d: Diagram = { grafical: 1, title: "T", density: "normal", layers: [], edges: [] };
    const text = writeDiagram(d);
    expect(text).toBe('<diagram> {\n  format: 1\n  title: "T"\n  density: normal\n}\n');
    expect(readDiagram(text)).toEqual(d);
  });

  it("refuses a newer format version", () => {
    const r = readDiagram(`<diagram> {\n  format: ${FORMAT_VERSION + 1}\n  title: "T"\n}\n`);
    expect(Array.isArray(r)).toBe(true);
    expect((r as { code: string }[])[0]?.code).toBe("newer-format");
  });
});
