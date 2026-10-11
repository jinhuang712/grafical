import { describe, expect, it } from "vitest";
import { check, type Diagram, layout, renderPng, renderSvg } from "../src/index.ts";
import { createStubMeasurer } from "../src/text/index.ts";

const tiny: Diagram = {
  grafical: 1,
  title: "Tiny",
  density: "normal",
  layers: [
    { id: "top", label: "Top", nodes: [{ id: "a", label: "A", kind: "service", size: "m" }] },
    { id: "bottom", label: "Bottom", nodes: [{ id: "b", label: "B", kind: "store", size: "m" }] },
  ],
  edges: [{ id: "a->b", from: "a", to: "b", kind: "call" }],
};

describe("pipeline", () => {
  it("lays out, checks and renders a diagram end to end", () => {
    const m = createStubMeasurer();
    const scene = layout(tiny, m);
    expect(scene.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(check(tiny, scene, m)).toEqual([]);
    const svg = renderSvg(scene);
    expect(svg.startsWith("<svg")).toBe(true);
    const png = renderPng(svg, 1);
    expect(Array.from(png.slice(1, 4))).toEqual([0x50, 0x4e, 0x47]);
  });
});
