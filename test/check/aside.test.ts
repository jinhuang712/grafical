// Boxes beside every box they connect to (DESIGN.md D47): the engine counts one it placed
// as it counts a crossing, and one the agent placed by steps fails the write.

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { arrangementCost, asideBoxes, layout } from "../../src/layout/index.ts";
import type { Diagram, DiagramNode, Layer } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const box = (id: string, extra: Partial<DiagramNode> = {}): DiagramNode => ({
  id,
  label: id,
  kind: "service",
  size: "m",
  ...extra,
});

/** Two services side by side, and a store both use, placed by `store`. */
function diagram(store: DiagramNode, low: DiagramNode[] = []): Diagram {
  const d: Diagram = {
    grafical: 1,
    title: "T",
    density: "normal",
    layers: [
      { id: "top", label: "Top", nodes: [box("a"), box("b")] },
      { id: "low", label: "Low", nodes: low },
    ],
    edges: [
      { id: "a->db", from: "a", to: "db", kind: "call" },
      { id: "b->db", from: "b", to: "db", kind: "call" },
    ],
  };
  if (store.from !== undefined) d.nodes = [store];
  else d.layers[1]?.nodes.push(store);
  return d;
}

describe("a box beside every box it connects to (D47)", () => {
  it("fails the write when the agent placed it there by steps", () => {
    const aside = diagram(box("db", { kind: "store", from: "b", down: 1, right: 1 }));
    expect(asideBoxes(layout(aside, m))).toEqual([{ box: "db", users: ["a", "b"] }]);
    const found = check(aside, layout(aside, m), m);
    expect(found.map((d) => [d.code, d.owner, d.facts.nodes])).toEqual([
      ["box-aside", "agent", ["a", "b"]],
    ]);
    const under = diagram(box("db", { kind: "store", from: "a", down: 1 }));
    expect(check(under, layout(under, m), m)).toEqual([]);
  });

  it("counts like a crossing when the engine placed it, and never fails the write", () => {
    // db last in a row where p and q sit under a and b: right of both of its users.
    const last = diagram(box("db", { kind: "store" }), [box("p"), box("q")]);
    last.edges.push(
      { id: "a->p", from: "a", to: "p", kind: "call" },
      { id: "b->q", from: "b", to: "q", kind: "call" },
    );
    const between: Diagram = structuredClone(last);
    (between.layers[1] as Layer).nodes = [box("p"), box("db", { kind: "store" }), box("q")];
    const scene = layout(last, m);
    expect(asideBoxes(scene).map((x) => x.box)).toEqual(["db"]);
    expect(check(last, scene, m)).toEqual([]);
    expect(asideBoxes(layout(between, m))).toEqual([]);
    const [worse] = arrangementCost(last, m);
    const [better] = arrangementCost(between, m);
    expect(worse).toBeGreaterThan(better as number);
  });
});
