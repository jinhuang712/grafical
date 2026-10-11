import { describe, expect, it } from "vitest";
import { DIAMOND } from "../../src/theme/geometry.ts";
import { lineRoom, meetOutline, nodeBox, textInside } from "../../src/theme/shapes.ts";

describe("node shapes (D34)", () => {
  const r = { x: 0, y: 0, w: 184, h: 80 };

  it("lays a decision out in a larger box than a plain node", () => {
    expect(nodeBox("decision", "m")).toEqual(DIAMOND.m);
    expect(nodeBox("decision", "m").w).toBeGreaterThan(nodeBox("service", "m").w);
  });

  it("narrows a diamond's lines as its text block grows, and never a box's", () => {
    expect(lineRoom("decision", 184, 80, 17)).toBeGreaterThan(lineRoom("decision", 184, 80, 34));
    expect(lineRoom("service", 136, 56, 17)).toBe(lineRoom("service", 136, 56, 34));
  });

  it("keeps a decision's text inside the diamond, not merely inside its box", () => {
    expect(textInside("decision", r, { x: 52, y: 32, w: 80, h: 16 })).toBe(true);
    expect(textInside("decision", r, { x: 10, y: 6, w: 40, h: 16 })).toBe(false);
    expect(textInside("service", r, { x: 10, y: 6, w: 40, h: 16 })).toBe(true);
  });

  it("moves a line's end from the box onto the diamond's slanted side", () => {
    // Straight down into the top tip: the box and the diamond meet there.
    expect(meetOutline("decision", r, { x: 92, y: 0 }, { x: 92, y: -40 })).toEqual({ x: 92, y: 0 });
    // Halfway out from the middle, the outline is a quarter of the height in.
    expect(meetOutline("decision", r, { x: 46, y: 0 }, { x: 46, y: -40 })).toEqual({
      x: 46,
      y: 20,
    });
    // Into the right tip from the side.
    expect(meetOutline("decision", r, { x: 184, y: 40 }, { x: 240, y: 40 })).toEqual({
      x: 184,
      y: 40,
    });
    expect(meetOutline("service", r, { x: 46, y: 0 }, { x: 46, y: -40 })).toEqual({ x: 46, y: 0 });
  });
});
