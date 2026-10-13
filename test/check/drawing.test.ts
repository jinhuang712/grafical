import { beforeAll, describe, expect, it } from "vitest";
import { drawing, drawingText } from "../../src/check/drawing.ts";
import { layout } from "../../src/layout/index.ts";
import type { Diagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { e, n } from "../fixtures/build.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

/** Two rows of two services whose lines cross. */
const crossed: Diagram = {
  grafical: 1,
  title: "Crossed",
  density: "normal",
  layers: [
    {
      id: "top",
      label: "Top",
      nodes: [n("a1", "A one", "service", "m"), n("a2", "A two", "service", "m")],
    },
    {
      id: "bottom",
      label: "Bottom",
      nodes: [n("b1", "B one", "service", "m"), n("b2", "B two", "service", "m")],
    },
  ],
  edges: [e("a1", "b2", "call"), e("a2", "b1", "call")],
};

/** A line from the top row to the bottom one, past the box in the middle row. */
const skipping: Diagram = {
  grafical: 1,
  title: "Skipping",
  density: "normal",
  layers: [
    { id: "top", label: "Top", nodes: [n("a", "A", "service", "m")] },
    {
      id: "mid",
      label: "Middle",
      nodes: [n("m1", "M one", "service", "m"), n("m2", "M two", "service", "m")],
    },
    { id: "low", label: "Low", nodes: [n("z", "Z", "store", "m")] },
  ],
  edges: [e("a", "m1", "call"), e("a", "m2", "call"), e("m1", "z", "call"), e("a", "z", "call")],
};

describe("the drawing as facts (D37)", () => {
  it("names each box's row, place and lines by side, and each line's sides and crossings", () => {
    const dr = drawing(crossed, layout(crossed, m));
    expect(dr.counts).toMatchObject({ nodes: 4, lines: 2, crossings: 1, busiest: { lines: 1 } });
    expect(dr.boxes.map((b) => `${b.id} ${b.row} ${b.place}/${b.of}`)).toEqual([
      "a1 top 1/2",
      "a2 top 2/2",
      "b1 bottom 1/2",
      "b2 bottom 2/2",
    ]);
    expect(dr.boxes.find((b) => b.id === "a1")?.sides).toEqual({ bottom: 1 });
    const line = dr.lines.find((l) => l.id === "a1->b2");
    expect(line).toMatchObject({
      leaves: "bottom",
      enters: "top",
      crosses: ["a2->b1"],
      passes: [],
    });
  });

  it("counts the lines at a box, and names a row a line passes without meeting it", () => {
    const dr = drawing(skipping, layout(skipping, m));
    expect(dr.counts.busiest).toEqual({ id: "a", lines: 3 });
    // A drawn picture where a->z runs down through the middle row, between m1 and m2.
    const box = (id: string, layer: string, x: number, y: number) => ({
      id,
      layer,
      kind: "service" as const,
      accent: false,
      rect: { x, y, w: 100, h: 50 },
      texts: [],
    });
    const scene = {
      ...layout(skipping, m),
      nodes: [
        box("a", "top", 100, 0),
        box("m1", "mid", 0, 100),
        box("m2", "mid", 200, 100),
        box("z", "low", 100, 200),
      ],
      edges: [
        {
          id: "a->z",
          from: "a",
          to: "z",
          kind: "call" as const,
          points: [
            { x: 150, y: 50 },
            { x: 150, y: 200 },
          ],
        },
      ],
    };
    const line = drawing(skipping, scene).lines[0];
    expect(line).toMatchObject({
      leaves: "bottom",
      enters: "top",
      bends: 0,
      length: 150,
      passes: ["mid"],
    });
    expect(drawing(skipping, scene).counts.passing).toBe(1);
  });

  it("is the same records every time, key=value only, with no judgement in it", () => {
    const a = drawingText(drawing(crossed, layout(crossed, m)));
    expect(drawingText(drawing(crossed, layout(crossed, m)))).toBe(a);
    const lines = a.trimEnd().split("\n");
    expect(lines[0]).toMatch(/^counts nodes=4 lines=2 crossings=1 bends=\d+ width=\d+ height=\d+ /);
    expect(lines).toContain(
      "box id=a1 row=top place=1 of=2 width=" +
        `${drawing(crossed, layout(crossed, m)).boxes[0]?.width} height=56 sides=bottom:1`,
    );
    // Every field is key=value: a record is its name, then fields with no spaces in them.
    for (const l of lines) expect(l).toMatch(/^[a-z]+( [a-z]+=[^ =]+)+$/);
    expect(a).not.toMatch(/too|should|better|warning|hint/i);
  });
});
