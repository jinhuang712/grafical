// Styles set spacing as CSS does (specs/decisions, "Styles set spacing as CSS does, and a later style wins"): the
// stylesheet gives the row gap, the column gap and the diagram's margin, and a style any region or node marks adds a
// margin of its own. Where two styles say one thing, the one defined later wins.

import { beforeAll, describe, expect, it } from "vitest";
import { layout } from "../../src/layout/index.ts";
import { writeGrafical } from "../../src/model/grafical-format.ts";
import { applyOps, type Diagram, type Op, parseOp, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { THEMES } from "../../src/theme/themes.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const go = (d: Diagram | null, ...ops: object[]) => {
  const r = applyOps(d, ops as Op[]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
};
const run = (d: Diagram, ...ops: object[]) => {
  const r = applyOps(d, ops as Op[]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
};

const layered = go(
  null,
  { op: "diagram.set", title: "t" },
  { op: "layer.set", ids: ["a"] },
  { op: "layer.set", ids: ["b"] },
  { op: "layer.set", ids: ["c"] },
  { op: "node.set", ids: ["x"], layer: "a", label: "x" },
  { op: "node.set", ids: ["w"], layer: "a", label: "w", after: "x" },
  { op: "node.set", ids: ["y"], layer: "b", label: "y" },
  { op: "node.set", ids: ["z"], layer: "c", label: "z" },
  { op: "edge.set", ids: ["x-y"], from: "x", to: "y" },
  { op: "edge.set", ids: ["y-z"], from: "y", to: "z" },
);
const rect = (d: Diagram, id: string) => {
  const r = layout(d, m).nodes.find((n) => n.id === id)?.rect;
  if (r === undefined) throw new Error(`no node ${id}`);
  return r;
};
const gapAcross = (d: Diagram, a: string, b: string) =>
  rect(d, b).x - (rect(d, a).x + rect(d, a).w);
const gapDown = (d: Diagram, a: string, b: string) => rect(d, b).y - (rect(d, a).y + rect(d, a).h);

describe("the stylesheet's spacing", () => {
  it("is the default's: a row gap of 40, a column gap of 32 and a margin of 32", () => {
    expect(THEMES.default?.space).toEqual({
      marginTop: 32,
      marginRight: 32,
      marginBottom: 32,
      marginLeft: 32,
      rowGap: 40,
      columnGap: 32,
    });
    expect(gapAcross(layered, "x", "w")).toBe(32);
    expect(rect(layered, "x").x).toBeGreaterThanOrEqual(32);
  });

  it("changes with a style the diagram marks", () => {
    const d = run(
      layered,
      { op: "style.set", ids: ["roomy"], rowGap: "80", columnGap: "64" },
      { op: "diagram.set", style: "roomy" },
    );
    expect(gapAcross(d, "x", "w")).toBe(64);
    expect(gapDown(d, "x", "y")).toBeGreaterThan(gapDown(layered, "x", "y"));
    expect(gapDown(d, "y", "z") - gapDown(layered, "y", "z")).toBe(40);
  });

  it("has the built-in styles compact and airy", () => {
    const compact = run(layered, { op: "diagram.set", style: "compact" });
    const airy = run(layered, { op: "diagram.set", style: "airy" });
    expect(gapAcross(compact, "x", "w")).toBe(24);
    expect(gapAcross(airy, "x", "w")).toBe(48);
  });
});

describe("a margin", () => {
  it("of a node adds to the column gap, and widens its column in every layer", () => {
    const d = run(
      layered,
      { op: "style.set", ids: ["wide"], marginRight: "16" },
      { op: "node.set", ids: ["x"], style: "wide" },
    );
    expect(gapAcross(d, "x", "w")).toBe(48);
  });

  it("of a layer adds to the gutters around it, the larger of two margins that meet", () => {
    const d = run(
      layered,
      { op: "style.set", ids: ["below"], marginBottom: "24" },
      { op: "style.set", ids: ["above"], marginTop: "8" },
      { op: "layer.set", ids: ["a"], style: "below" },
      { op: "node.set", ids: ["y"], style: "above" },
    );
    expect(gapDown(d, "x", "y") - gapDown(layered, "x", "y")).toBe(32);
    expect(gapDown(d, "y", "z")).toBe(gapDown(layered, "y", "z"));
  });

  it("of a group widens the gap beside it", () => {
    const base = go(
      layered,
      { op: "group.set", ids: ["g"], label: "g" },
      { op: "node.set", ids: ["x"], group: "g" },
      { op: "group.set", ids: ["h"], label: "h" },
      { op: "node.set", ids: ["w"], group: "h" },
    );
    const d = run(
      base,
      { op: "style.set", ids: ["apart"], marginRight: "24" },
      { op: "group.set", ids: ["g"], style: "apart" },
    );
    expect(gapAcross(d, "x", "w") - gapAcross(base, "x", "w")).toBe(24);
  });

  it("of a column parts its strip from the column beside it", () => {
    const base = go(
      layered,
      { op: "column.set", ids: ["p"] },
      { op: "column.set", ids: ["q"] },
      { op: "node.set", ids: ["x"], column: "p" },
      { op: "node.set", ids: ["w"], column: "q" },
    );
    const d = run(
      base,
      { op: "style.set", ids: ["apart"], marginLeft: "16" },
      { op: "column.set", ids: ["q"], style: "apart" },
    );
    expect(gapAcross(d, "x", "w") - gapAcross(base, "x", "w")).toBe(16);
  });
});

describe("two styles that say one thing", () => {
  it("the one defined later wins, and style --move changes which", () => {
    const d = run(
      layered,
      { op: "style.set", ids: ["one"], columnGap: "48" },
      { op: "style.set", ids: ["two"], columnGap: "64" },
      { op: "diagram.set", style: "two,one" },
    );
    expect(gapAcross(d, "x", "w")).toBe(64);
    const moved = run(d, { op: "style.move", ids: ["two"], before: "one" });
    expect(gapAcross(moved, "x", "w")).toBe(48);
  });
});

describe("spacing in the file", () => {
  it("takes pixels on the 4 px grid, never negative", () => {
    for (const bad of [6, -4, 404]) {
      expect(Array.isArray(parseOp({ op: "style.set", ids: ["s"], rowGap: String(bad) }, 0))).toBe(
        true,
      );
    }
  });

  it("survives a .grafical file", () => {
    const d = run(
      layered,
      { op: "style.set", ids: ["s"], marginTop: "4", rowGap: "48" },
      { op: "diagram.set", style: "s" },
      { op: "layer.set", ids: ["b"], style: "s" },
    );
    const back = readDiagram(writeGrafical(d));
    expect(back).toEqual(d);
  });
});
