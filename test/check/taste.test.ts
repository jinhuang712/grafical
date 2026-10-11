import { describe, expect, it } from "vitest";
import { countCrossings, measureTaste } from "../../src/check/taste.ts";
import type { Diagram, EdgeKind } from "../../src/model/types.ts";
import type { PlacedText, Scene, SceneEdge, SceneNode } from "../../src/scene.ts";
import { groupedScene } from "../render/scenes.ts";

const none: PlacedText = { role: "title", runs: [], bbox: { x: 0, y: 0, w: 0, h: 0 } };

function node(id: string, x: number, y: number, w = 100, h = 48): SceneNode {
  return { id, layer: "l", kind: "service", accent: false, rect: { x, y, w, h }, texts: [] };
}

function edge(
  id: string,
  from: string,
  to: string,
  pts: [number, number][],
  kind: EdgeKind = "call",
  label = false,
): SceneEdge {
  const e: SceneEdge = { id, from, to, kind, points: pts.map(([x, y]) => ({ x, y })) };
  if (label) e.label = { ...none, role: "edge-label" };
  return e;
}

function build(nodes: SceneNode[], edges: SceneEdge[], width = 800): [Diagram, Scene] {
  const scene: Scene = { width, height: 600, title: none, layers: [], nodes, edges };
  const diagram: Diagram = {
    grafical: 1,
    title: "T",
    density: "normal",
    layers: [
      {
        id: "l",
        label: "L",
        nodes: nodes.map((n) => ({ id: n.id, label: n.id, kind: "service", size: "m" })),
      },
    ],
    edges: edges.map((e) => ({ id: e.id, from: e.from, to: e.to, kind: e.kind })),
  };
  return [diagram, scene];
}

const report = (nodes: SceneNode[], edges: SceneEdge[], width?: number) =>
  measureTaste(...build(nodes, edges, width));

describe("the target picture", () => {
  it("passes every rule it can measure (it has 12 of 16 nodes)", () => {
    const s = groupedScene();
    const diagram: Diagram = {
      grafical: 1,
      title: "T",
      density: "normal",
      layers: [
        {
          id: "l",
          label: "L",
          nodes: s.nodes.map((n) => ({ id: n.id, label: n.id, kind: "service", size: "m" })),
        },
      ],
      edges: [],
    };
    const r = measureTaste(diagram, s);
    expect(r.canvasWidth).toEqual({ value: 1024, limit: 1024, ok: true });
    expect(r.nodeCount).toEqual({ value: 12, limit: 16, ok: true });
    expect(r.crossings.value).toBe(0);
    expect(r.maxBends.value).toBe(2);
    expect(r.corridorViolations.value).toBe(0);
    expect(r.lineStyles.value).toBe(2);
    expect(r.straightShare.value).toBeGreaterThanOrEqual(0.5);
    expect(r.ok).toBe(false); // 6 of 11 edges are labelled: over 40%
    expect(r.labelledShare.ok).toBe(false);
    expect(Object.entries(r).filter(([, v]) => typeof v === "object" && !v.ok)).toHaveLength(1);
  });
});

describe("canvas width and node count", () => {
  it("fails a canvas wider than 1024 px", () => {
    expect(report([node("a", 0, 0)], [], 1024).canvasWidth.ok).toBe(true);
    expect(report([node("a", 0, 0)], [], 1025).canvasWidth.ok).toBe(false);
  });
  it("fails more than 16 nodes", () => {
    const many = (n: number): SceneNode[] =>
      Array.from({ length: n }, (_, i) => node(`n${i}`, i * 10, 0));
    expect(report(many(16), []).nodeCount.ok).toBe(true);
    expect(report(many(17), []).nodeCount).toEqual({ value: 17, limit: 16, ok: false });
  });
});

describe("straight edges and bends", () => {
  const nodes = [node("a", 0, 0), node("b", 0, 200), node("c", 300, 200), node("d", 300, 0)];
  const straight = edge("s", "a", "b", [
    [50, 48],
    [50, 200],
  ]);
  const oneBend = edge("o", "a", "c", [
    [80, 48],
    [80, 120],
    [350, 120],
    [350, 200],
  ]);
  it("counts the share of single-segment edges, and ignores points inside a straight run", () => {
    const withMid = edge("m", "a", "b", [
      [50, 48],
      [50, 100],
      [50, 200],
    ]);
    const r = report(nodes, [withMid, oneBend]);
    expect(r.straightShare.value).toBe(0.5);
    expect(r.straightShare.ok).toBe(true);
    expect(report(nodes, [oneBend, oneBend, straight]).straightShare.value).toBeCloseTo(0.333, 2);
    expect(report(nodes, [oneBend, oneBend, straight]).straightShare.ok).toBe(false);
  });
  it("reports the most bends, and edges with more than 2", () => {
    const three = edge("t", "a", "d", [
      [20, 0],
      [20, -20],
      [200, -20],
      [200, 24],
      [300, 24],
    ]);
    const r = report(nodes, [straight, oneBend, three]);
    expect(r.maxBends).toEqual({ value: 3, limit: 2, ok: false });
    expect(r.edgesOverBendLimit).toEqual({ value: 1, limit: 0, ok: false });
    const fine = report(nodes, [straight, oneBend]);
    expect(fine.maxBends.value).toBe(2);
    expect(fine.maxBends.ok).toBe(true);
    expect(fine.edgesOverBendLimit.ok).toBe(true);
  });
});

describe("crossings", () => {
  const h = edge("h", "a", "b", [
    [0, 100],
    [200, 100],
  ]);
  const v = edge("v", "c", "d", [
    [100, 0],
    [100, 200],
  ]);
  it("counts a plus-shaped crossing", () => {
    expect(countCrossings([h, v])).toBe(1);
  });
  it("does not count a T-junction, a shared trunk or parallel lines", () => {
    const t = edge("t", "c", "d", [
      [100, 100],
      [100, 200],
    ]);
    expect(countCrossings([h, t])).toBe(0);
    const par = edge("p", "c", "d", [
      [0, 120],
      [200, 120],
    ]);
    expect(countCrossings([h, par])).toBe(0);
  });
  it("allows 1 crossing per 10 edges", () => {
    const nodes = [node("a", 0, 0)];
    const fillers = Array.from({ length: 8 }, (_, i) =>
      edge(`f${i}`, "a", "a", [
        [500 + i * 10, 0],
        [500 + i * 10, 50],
      ]),
    );
    expect(report(nodes, [h, v, ...fillers]).crossings).toEqual({ value: 1, limit: 1, ok: true });
    expect(report(nodes, [h, v, ...fillers.slice(1)]).crossings).toEqual({
      value: 1,
      limit: 0,
      ok: false,
    });
  });
});

describe("labels and line styles", () => {
  const nodes = [node("a", 0, 0)];
  const e = (id: string, kind: EdgeKind, label: boolean): SceneEdge =>
    edge(
      id,
      "a",
      "a",
      [
        [0, 0],
        [0, 10],
      ],
      kind,
      label,
    );
  it("limits the labelled share to 40%", () => {
    const four = [
      e("1", "call", true),
      e("2", "call", true),
      e("3", "call", false),
      e("4", "call", false),
      e("5", "call", false),
    ];
    expect(report(nodes, four).labelledShare).toEqual({ value: 0.4, limit: 0.4, ok: true });
    const half = [e("1", "call", true), e("2", "call", false)];
    expect(report(nodes, half).labelledShare.ok).toBe(false);
  });
  it("counts one style per look, and allows at most three", () => {
    expect(report(nodes, [e("1", "call", false), e("2", "data", false)]).lineStyles.value).toBe(1);
    expect(report(nodes, [e("1", "call", false), e("2", "async", false)]).lineStyles.value).toBe(2);
    expect(report(nodes, [e("1", "call", false), e("2", "async", false)]).lineStyles.ok).toBe(true);
    const four = [
      e("1", "call", false),
      e("2", "async", false),
      e("3", "optional", false),
      e("4", "link", false),
    ];
    expect(report(nodes, four).lineStyles.value).toBe(4);
    expect(report(nodes, four).lineStyles.ok).toBe(false);
  });
  it("has nothing to measure on an empty diagram", () => {
    const r = report(nodes, []);
    expect(r.ok).toBe(true);
    expect(r.straightShare.value).toBe(1);
  });
});

describe("corridors", () => {
  // Rows: a at y 0, mid row at y 120 (m1, m2), z at y 240.
  const nodes = [
    node("a", 0, 0),
    node("m1", 0, 120),
    node("m2", 300, 120),
    node("z", 0, 240),
    node("far", 600, 0),
    node("end", 600, 240),
  ];
  it("passes a vertical run in a column that is empty in every row it passes", () => {
    const ok = edge("ok", "far", "end", [
      [650, 48],
      [650, 240],
    ]);
    const between = edge("b", "a", "z", [
      [200, 48],
      [200, 240],
    ]);
    expect(report(nodes, [ok, between]).corridorViolations.value).toBe(0);
  });
  it("fails a vertical run that passes a row inside a node's column", () => {
    const bad = edge("bad", "far", "end", [
      [350, 48],
      [350, 240],
    ]);
    const r = report(nodes, [bad]);
    expect(r.corridorViolations).toEqual({ value: 1, limit: 0, ok: false });
    expect(r.ok).toBe(false);
  });
  it("ignores the rows that hold the edge's own ends, and horizontal runs", () => {
    const own = edge("own", "a", "m1", [
      [50, 48],
      [50, 120],
    ]);
    const side = edge("side", "m1", "m2", [
      [100, 144],
      [300, 144],
    ]);
    expect(report(nodes, [own, side]).corridorViolations.value).toBe(0);
  });
});
