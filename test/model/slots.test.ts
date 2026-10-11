import { describe, expect, it, vi } from "vitest";
import type { Diagram } from "../../src/model/index.ts";

const calls: { edges: string[]; layer: string; node: string; layerNodes: string[] }[] = [];

vi.mock("../../src/layout/index.ts", () => ({
  validateAlignments: () => [],
  validateGroups: () => [],
  layout: () => {
    throw new Error("not used");
  },
  chooseSlot: (d: Diagram, layerId: string, nodeId: string) => {
    calls.push({
      edges: d.edges.map((e) => e.id),
      layer: layerId,
      node: nodeId,
      layerNodes: d.layers.find((l) => l.id === layerId)?.nodes.map((n) => n.id) ?? [],
    });
    return 0;
  },
}));

const { applyOps } = await import("../../src/model/index.ts");
const { createStubMeasurer } = await import("../../src/text/index.ts");

describe("slot choice (D24)", () => {
  it("runs after every operation, so later edges count, and applies the slot it returns", () => {
    calls.length = 0;
    const d: Diagram = { grafical: 1, title: "T", density: "normal", layers: [], edges: [] };
    const r = applyOps(
      d,
      [
        { op: "layer.add", id: "l", label: "L" },
        { op: "node.add", id: "x", layer: "l", label: "X", last: true },
        { op: "node.add", id: "y", layer: "l", label: "Y" },
        { op: "edge.add", from: "x", to: "y" },
        { op: "node.add", id: "z", layer: "l", label: "Z" },
        { op: "node.remove", id: "z" },
      ],
      createStubMeasurer(),
    );
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    // Only y waits for a slot: z was removed. The node is absent from its layer when asked.
    expect(calls).toEqual([{ edges: ["x->y"], layer: "l", node: "y", layerNodes: ["x"] }]);
    expect(r.diagram.layers[0]?.nodes.map((n) => n.id)).toEqual(["y", "x"]);
  });

  it("a later explicit position cancels the wait", () => {
    calls.length = 0;
    const d: Diagram = { grafical: 1, title: "T", density: "normal", layers: [], edges: [] };
    const r = applyOps(
      d,
      [
        { op: "layer.add", id: "l", label: "L" },
        { op: "node.add", id: "x", layer: "l", label: "X" },
        { op: "node.move", id: "x", first: true },
      ],
      createStubMeasurer(),
    );
    expect("errors" in r).toBe(false);
    expect(calls).toEqual([]);
  });
});
