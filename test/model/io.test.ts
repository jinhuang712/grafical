import { describe, expect, it } from "vitest";
import type { Diagram } from "../../src/model/index.ts";
import { FORMAT_VERSION, readDiagram, writeDiagram } from "../../src/model/index.ts";

const FILE = `grafical: 1
title: Catalog sync
density: normal
layers:
  - id: ingest
    label: Ingest
    nodes:
      - id: relay
        label: catalog-relay
        kind: service
        sublabel: tier 1, :7101
      - id: kafka
        label: Kafka
        kind: queue
        size: l
        accent: true
  - id: store
    label: Store
    nodes:
      - id: db
        label: 数据库
        kind: store
        align: kafka
edges:
  - id: relay->kafka
    from: relay
    to: kafka
    kind: async
    label: produce
  - id: kafka->db
    from: kafka
    to: db
    kind: call
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
    const d = readDiagram(
      "grafical: 1\ntitle: T\nlayers:\n  - id: a\n    label: A\n    nodes:\n      - id: n\n        label: N\n",
    ) as Diagram;
    expect(d.density).toBe("normal");
    // No size: the engine sizes the box to its text (DESIGN.md, "Boxes sized to their text").
    expect(d.layers[0]?.nodes[0]).toEqual({ id: "n", label: "N", kind: "service" });
    const out = writeDiagram(d);
    expect(out).not.toContain("size");
    expect(out).not.toContain("accent");
    expect(out).not.toContain("align");
  });

  it("reads and writes a row without a label", () => {
    const text =
      "grafical: 1\ntitle: T\ndensity: normal\nlayers:\n  - id: a\n    look: band\n    nodes:\n      - id: n\n        label: N\n";
    const d = readDiagram(text) as Diagram;
    expect(d.layers[0]).not.toHaveProperty("label");
    const out = writeDiagram(d);
    expect(out).not.toMatch(/label: undefined|id: a\n {4}label/);
    expect(readDiagram(out)).toEqual(d);
  });

  it("writes keys in the documented order", () => {
    const out = writeDiagram(readDiagram(FILE) as Diagram);
    const keys = out.split("\n").map((l) => l.trim().replace(/^- /, "").split(":")[0]);
    expect(keys.slice(0, 4)).toEqual(["grafical", "title", "density", "layers"]);
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
    expect(text).toBe("grafical: 1\ntitle: T\ndensity: normal\nlayers: []\nedges: []\n");
    expect(readDiagram(text)).toEqual(d);
  });

  it("refuses a newer format version", () => {
    const r = readDiagram(`grafical: ${FORMAT_VERSION + 1}\ntitle: T\n`);
    expect(Array.isArray(r)).toBe(true);
    expect((r as { code: string }[])[0]?.code).toBe("newer-format");
  });

  it("reports broken YAML", () => {
    const r = readDiagram("grafical: 1\ntitle: [unclosed\n");
    expect((r as { code: string }[])[0]?.code).toBe("bad-yaml");
  });
});
