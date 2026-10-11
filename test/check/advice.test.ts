import { beforeAll, describe, expect, it } from "vitest";
import { advise, CROWDED_LAYER } from "../../src/check/advice.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function build(ops: Op[]): Diagram {
  const r = applyOps(null, [{ op: "diagram.new", title: "T" }, ...ops], m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}
const codes = (d: Diagram) => advise(d, layout(d, m)).map((w) => w.code);

describe("warnings (D29)", () => {
  it("the target look has none", () => {
    expect(codes(catalogSyncGrouped)).toEqual([]);
  });

  it("a crowded layer, which also makes the picture too wide", () => {
    const ops: Op[] = [{ op: "layer.add", id: "row", label: "Row" }];
    for (let i = 0; i <= CROWDED_LAYER + 1; i++) {
      ops.push({ op: "node.add", id: `n${i}`, layer: "row", label: `Node ${i}`, last: true });
    }
    const d = build(ops);
    const ws = advise(d, layout(d, m));
    expect(ws.map((w) => w.code)).toEqual(["too-wide", "crowded-layer"]);
    expect(ws[0]?.suggestion).toContain("layer split <file> row");
  });

  it("a main path of more than a third of the edges, and more than three (D33)", () => {
    const ids = catalogSyncGrouped.edges.map((e) => e.id);
    const third = Math.floor(ids.length / 3);
    const ok = applyOps(
      catalogSyncGrouped,
      [{ op: "edge.emphasize", edges: ids.slice(0, third) }],
      m,
    );
    const many = applyOps(
      catalogSyncGrouped,
      [{ op: "edge.emphasize", edges: ids.slice(0, third + 1) }],
      m,
    );
    if ("errors" in ok || "errors" in many) throw new Error("expected the edges to exist");
    expect(codes(ok.diagram)).toEqual([]);
    expect(codes(many.diagram)).toEqual(["too-many-main-edges"]);
  });

  it("a group of one node", () => {
    const d = build([
      { op: "layer.add", id: "row", label: "Row" },
      { op: "node.add", id: "a", layer: "row", label: "A" },
      { op: "group.add", id: "g", label: "G", nodes: ["a"] },
    ]);
    expect(codes(d)).toEqual(["lonely-group"]);
  });

  it("an edge whose line threads between the nodes of a layer it does not connect", () => {
    const d = build([
      { op: "layer.add", id: "top", label: "Top" },
      { op: "layer.add", id: "mid", label: "Mid" },
      { op: "layer.add", id: "bot", label: "Bot" },
      { op: "node.add", id: "a", layer: "top", label: "A" },
      { op: "node.add", id: "b1", layer: "mid", label: "B1", last: true },
      { op: "node.add", id: "b2", layer: "mid", label: "B2", last: true },
      { op: "node.add", id: "b3", layer: "mid", label: "B3", last: true },
      { op: "node.add", id: "c", layer: "bot", label: "C" },
      { op: "edge.add", from: "a", to: "c" },
    ]);
    // The engine takes this line round the row, in open space: no warning.
    expect(codes(d)).toEqual([]);
    // Drawn between b1 and b2 instead, it threads through the row: a warning.
    const scene = layout(d, m);
    const at = (id: string) => scene.nodes.find((n) => n.id === id)?.rect;
    const b1 = at("b1");
    const b2 = at("b2");
    const top = at("a");
    const bottom = at("c");
    if (!b1 || !b2 || !top || !bottom) throw new Error("missing node");
    const x = (b1.x + b1.w + b2.x) / 2;
    const threaded = {
      ...scene,
      edges: scene.edges.map((e) => ({
        ...e,
        points: [
          { x, y: top.y + top.h },
          { x, y: bottom.y },
        ],
      })),
    };
    const ws = advise(d, threaded);
    expect(ws.map((w) => w.code)).toEqual(["edge-crosses-layer"]);
    expect(ws[0]?.found).toBe("a->c passes mid");
  });
});
