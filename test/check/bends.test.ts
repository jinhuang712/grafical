// Lines bent for no reason (DESIGN.md, "Who chose is punished"): between boxes in neighbouring rows, when one
// x would have served both ends, the line runs straight, and a bend is an engine defect.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import type { PlacedText, Scene, SceneEdge, SceneNode } from "../../src/scene.ts";
import { createMeasurer, createStubMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const label: PlacedText = {
  role: "node-label",
  runs: [],
  bbox: { x: 0, y: 0, w: 0, h: 0 },
};
const box = (id: string, layer: string, x: number, y: number): SceneNode => ({
  id,
  layer,
  kind: "service",
  accent: false,
  rect: { x, y, w: 160, h: 48 },
  texts: [],
});
const line = (id: string, from: string, to: string, pts: [number, number][]): SceneEdge => ({
  id,
  from,
  to,
  kind: "call",
  points: pts.map(([x, y]) => ({ x, y })),
});
const scene = (edges: SceneEdge[]): Scene => ({
  width: 400,
  height: 300,
  title: label,
  layers: [
    { id: "top", band: { x: 0, y: 40, w: 400, h: 48 }, label },
    { id: "low", band: { x: 0, y: 200, w: 400, h: 48 }, label },
  ],
  nodes: [box("a", "top", 40, 40), box("b", "low", 60, 200)],
  edges,
});
const diagram: Diagram = {
  grafical: 1,
  title: "T",
  density: "normal",
  layers: [
    { id: "top", label: "Top", nodes: [{ id: "a", label: "a", kind: "service", size: "m" }] },
    { id: "low", label: "Low", nodes: [{ id: "b", label: "b", kind: "service", size: "m" }] },
  ],
  edges: [{ id: "a->b", from: "a", to: "b", kind: "call" }],
};

describe('lines bent for no reason (DESIGN.md, "Who chose is punished")', () => {
  it("are an engine defect when one x would have served both ends", () => {
    const bent = line("a->b", "a", "b", [
      [150, 88],
      [150, 140],
      [130, 140],
      [130, 200],
    ]);
    const found = check(diagram, scene([bent]), createStubMeasurer());
    expect(found.map((d) => [d.code, d.owner, d.elements])).toEqual([
      ["needless-bend", "engine", ["a->b"]],
    ]);
    const straight = line("a->b", "a", "b", [
      [140, 88],
      [140, 200],
    ]);
    expect(check(diagram, scene([straight]), createStubMeasurer())).toEqual([]);
    // A port outside the other box's side cannot meet it straight: no defect.
    const wide = line("a->b", "a", "b", [
      [52, 88],
      [52, 140],
      [80, 140],
      [80, 200],
    ]);
    expect(check(diagram, scene([wide]), createStubMeasurer())).toEqual([]);
  });

  it("run straight between a busy box and the box under it", () => {
    // The public brief's draft: catalog-sync has eight lines on its bottom side, two of
    // them to and from its retry topic right under it.
    const file = join(import.meta.dirname, "../fixtures/catalog-sync-help3.grafical.yaml");
    const d = readDiagram(readFileSync(file, "utf8")) as Diagram;
    const s = layout(d, m);
    for (const id of ["sync->retry-topic", "retry-topic->sync"]) {
      expect(s.edges.find((e) => e.id === id)?.points.length, id).toBe(2);
    }
    expect(check(d, s, m)).toEqual([]);
  });
});
