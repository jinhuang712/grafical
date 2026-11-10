// Nodes beside every node they connect to (specs/decisions, "Who chose is punished"): the engine counts one it placed
// as it counts a crossing, and one the agent placed by steps fails the write.

import { beforeAll, describe, expect, it } from "vitest";
import { drawing, warningsOf } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { arrangementCost, asideNodes, layout } from "../../src/layout/index.ts";
import type { Diagram, DiagramNode, Layer } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const makeNode = (id: string, extra: Partial<DiagramNode> = {}): DiagramNode => ({
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
    layers: [
      { id: "top", label: "Top", nodes: [makeNode("a"), makeNode("b")] },
      { id: "low", label: "Low", nodes: low },
    ],
    edges: [
      { id: "a-db", from: "a", to: "db", kind: "call" },
      { id: "b-db", from: "b", to: "db", kind: "call" },
    ],
  };
  if (store.from !== undefined) d.nodes = [store];
  else d.layers[1]?.nodes.push(store);
  return d;
}

const asides = (d: Diagram) =>
  warningsOf(drawing(d, layout(d, m)), d).filter((w) => w.code === "node-aside");

describe('a node beside every node it connects to (specs/decisions, "A node beside its neighbours is a warning")', () => {
  it("warns and never fails the write when the agent placed it there by steps", () => {
    const aside = diagram(makeNode("db", { kind: "store", from: "b", down: 1, right: 1 }));
    expect(asideNodes(layout(aside, m))).toEqual([{ node: "db", users: ["a", "b"] }]);
    expect(check(aside, layout(aside, m), m)).toEqual([]);
    expect(asides(aside)).toEqual([
      { code: "node-aside", facts: { node: "db", nodes: ["a", "b"] } },
    ]);
    const under = diagram(makeNode("db", { kind: "store", from: "a", down: 1 }));
    expect(asides(under)).toEqual([]);
  });

  it("warns the same in a layer, and counts like a crossing", () => {
    // db last in a layer where p and q sit under a and b: right of both of its users.
    const last = diagram(makeNode("db", { kind: "store" }), [makeNode("p"), makeNode("q")]);
    last.edges.push(
      { id: "a-p", from: "a", to: "p", kind: "call" },
      { id: "b-q", from: "b", to: "q", kind: "call" },
    );
    const between: Diagram = structuredClone(last);
    (between.layers[1] as Layer).nodes = [
      makeNode("p"),
      makeNode("db", { kind: "store" }),
      makeNode("q"),
    ];
    const scene = layout(last, m);
    expect(asideNodes(scene).map((x) => x.node)).toEqual(["db"]);
    expect(check(last, scene, m)).toEqual([]);
    expect(asides(last).map((w) => w.facts.node)).toEqual(["db"]);
    expect(asideNodes(layout(between, m))).toEqual([]);
    const [worse] = arrangementCost(last, m);
    const [better] = arrangementCost(between, m);
    expect(worse).toBeGreaterThan(better as number);
  });
});
