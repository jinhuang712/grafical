import { describe, expect, it } from "vitest";
import type { Op } from "../../src/model/index.ts";
import { applyOps, type Diagram } from "../../src/model/index.ts";

const empty: Diagram = { grafical: 1, title: "T", density: "normal", layers: [], edges: [] };

const rows: Op[] = [
  { op: "layer.add", id: "top", label: "Top" },
  { op: "layer.add", id: "bot", label: "Bot" },
];

describe('order (DESIGN.md, "The agent states every order")', () => {
  it("takes the first box of an empty row without a place", () => {
    const r = applyOps(empty, [...rows, { op: "node.add", id: "a", layer: "top", label: "A" }]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.layers[0]?.nodes.map((n) => n.id)).toEqual(["a"]);
  });

  it("refuses a box added to a row with boxes and no place, naming what is there", () => {
    const r = applyOps(empty, [
      ...rows,
      { op: "node.add", id: "a", layer: "top", label: "A" },
      { op: "node.add", id: "b", layer: "top", label: "B" },
    ]);
    expect(r).toEqual({
      errors: [
        {
          code: "missing-field",
          index: 3,
          field: "first,last,before,after",
          found: "",
          facts: { row: "top", nodes: ["a"] },
        },
      ],
    });
  });

  it("puts a box where the agent says, and nowhere else", () => {
    const r = applyOps(empty, [
      ...rows,
      { op: "node.add", id: "a", layer: "top", label: "A" },
      { op: "node.add", id: "b", layer: "top", label: "B", before: "a" },
      { op: "node.add", id: "c", layer: "bot", label: "C" },
      { op: "edge.add", from: "a", to: "c" },
    ]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.layers[0]?.nodes.map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("refuses a move into a row with boxes and no place, and takes one into an empty row", () => {
    const base = applyOps(empty, [
      ...rows,
      { op: "node.add", id: "a", layer: "top", label: "A" },
      { op: "node.add", id: "b", layer: "top", label: "B", last: true },
      { op: "node.add", id: "c", layer: "bot", label: "C" },
    ]);
    if ("errors" in base) throw new Error(JSON.stringify(base.errors));
    const refused = applyOps(base.diagram, [{ op: "node.move", id: "a", layer: "bot" }]);
    expect("errors" in refused && refused.errors[0]?.code).toBe("missing-field");
    const moved = applyOps(base.diagram, [
      { op: "node.move", id: "c", layer: "top", after: "a" },
      { op: "node.move", id: "b", layer: "bot" },
    ]);
    if ("errors" in moved) throw new Error(JSON.stringify(moved.errors));
    expect(moved.diagram.layers.map((l) => l.nodes.map((n) => n.id))).toEqual([["a", "c"], ["b"]]);
  });
});
