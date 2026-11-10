import { describe, expect, it } from "vitest";
import type { Op } from "../../src/model/index.ts";
import { applyOps, type Diagram } from "../../src/model/index.ts";

const empty: Diagram = { grafical: 1, title: "T", layers: [], edges: [] };

const layerOps: Op[] = [
  { op: "layer.set", ids: ["top"], label: "Top" },
  { op: "layer.set", ids: ["bot"], label: "Bot" },
];

describe('order (specs/decisions, "The agent states every order")', () => {
  it("takes the first node of an empty layer without a place", () => {
    const r = applyOps(empty, [
      ...layerOps,
      { op: "node.set", ids: ["a"], layer: "top", label: "A" },
    ]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.layers[0]?.nodes.map((n) => n.id)).toEqual(["a"]);
  });

  it("refuses a node added to a layer with nodes and no place, naming what is there", () => {
    const r = applyOps(empty, [
      ...layerOps,
      { op: "node.set", ids: ["a"], layer: "top", label: "A" },
      { op: "node.set", ids: ["b"], layer: "top", label: "B" },
    ]);
    expect(r).toEqual({
      errors: [
        {
          code: "missing-field",
          index: 3,
          field: "place",
          found: "",
          facts: { layer: "top", nodes: ["a"], allowed: ["first", "last", "before", "after"] },
        },
      ],
    });
  });

  it("puts a node where the agent says, and nowhere else", () => {
    const r = applyOps(empty, [
      ...layerOps,
      { op: "node.set", ids: ["a"], layer: "top", label: "A" },
      { op: "node.set", ids: ["b"], layer: "top", label: "B", before: "a" },
      { op: "node.set", ids: ["c"], layer: "bot", label: "C" },
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
    ]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.layers[0]?.nodes.map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("refuses a move into a layer with nodes and no place, and takes one into an empty layer", () => {
    const base = applyOps(empty, [
      ...layerOps,
      { op: "node.set", ids: ["a"], layer: "top", label: "A" },
      { op: "node.set", ids: ["b"], layer: "top", label: "B", last: true },
      { op: "node.set", ids: ["c"], layer: "bot", label: "C" },
    ]);
    if ("errors" in base) throw new Error(JSON.stringify(base.errors));
    const refused = applyOps(base.diagram, [{ op: "node.move", ids: ["a"], layer: "bot" }]);
    expect("errors" in refused && refused.errors[0]?.code).toBe("missing-field");
    const moved = applyOps(base.diagram, [
      { op: "node.move", ids: ["c"], layer: "top", after: "a" },
      { op: "node.move", ids: ["b"], layer: "bot" },
    ]);
    if ("errors" in moved) throw new Error(JSON.stringify(moved.errors));
    expect(moved.diagram.layers.map((l) => l.nodes.map((n) => n.id))).toEqual([["a", "c"], ["b"]]);
  });
});
