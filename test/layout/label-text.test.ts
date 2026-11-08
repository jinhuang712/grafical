// An agent sets a label's breaks and its alignment (specs/decisions, "An agent sets a label's breaks and its alignment").

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { writeGrafical } from "../../src/model/grafical-format.ts";
import { applyOps, type Diagram, type Op, parseOps, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function build(ops: Op[]): Diagram {
  const r = applyOps(null, [
    { op: "diagram.new", title: "t" },
    { op: "layer.add", id: "a" },
    { op: "layer.add", id: "b" },
    { op: "node.add", id: "x", layer: "a", label: "Order\nservice" },
    { op: "node.add", id: "y", layer: "b", label: "y" },
    ...ops,
  ] as Op[]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

const baselines = (runs: { y: number }[] = []) => new Set(runs.map((r) => r.y)).size;

describe("a stated break", () => {
  it("keeps a node's label on the lines the agent stated", () => {
    const n = layout(build([]), m).nodes[0];
    expect(baselines(n?.texts[0]?.runs)).toBe(2);
  });

  it("keeps an edge's label on the lines the agent stated, with room for them", () => {
    const one = build([{ op: "edge.add", from: "x", to: "y", label: "reads writes" } as Op]);
    const two = build([{ op: "edge.add", from: "x", to: "y", label: "reads\nwrites" } as Op]);
    const a = layout(one, m).edges[0]?.label;
    const b = layout(two, m).edges[0]?.label;
    expect(baselines(a?.runs)).toBe(1);
    expect(baselines(b?.runs)).toBe(2);
    expect(b?.bbox.h).toBeGreaterThan(a?.bbox.h ?? 0);
    expect(b?.bbox.w).toBeLessThan(a?.bbox.w ?? 0);
  });

  it("reads a backslash and an n from a shell as a break", () => {
    const ops = parseOps([{ op: "edge.add", from: "x", to: "y", label: "reads\\nwrites" }]);
    expect(Array.isArray(ops) ? (ops[0] as { label?: string }).label : "").toBe("reads\nwrites");
  });

  it("is not a missing glyph on a text that wraps", () => {
    const d = build([{ op: "edge.add", from: "x", to: "y", label: "reads\nwrites" } as Op]);
    expect(check(d, layout(d, m), m).filter((f) => f.code === "missing-glyph")).toEqual([]);
  });

  it("is refused on a title, which is one line", () => {
    const d = { ...build([]), title: "one\ntwo" };
    expect(check(d, layout(d, m), m).map((f) => f.code)).toContain("missing-glyph");
  });
});

describe("label.align", () => {
  const go = (d: Diagram, ...ops: object[]) => {
    const r = applyOps(d, ops as Op[]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    return r.diagram;
  };
  const edge = { op: "edge.add", from: "x", to: "y", label: "reads\nand writes" };
  const lefts = (runs: { x: number }[] = []) => runs.map((r) => r.x);

  it("lines up a node's label and sublabel at one side of the node", () => {
    const d = build([{ op: "node.sublabel", id: "y", text: "keeps" } as Op]);
    const plain = layout(d, m).nodes[1];
    const left = layout(go(d, { op: "label.align", id: "y", align: "left" }), m).nodes[1];
    const right = layout(go(d, { op: "label.align", id: "y", align: "right" }), m).nodes[1];
    const [name, sub] = left?.texts ?? [];
    expect(name?.bbox.x).toBe(sub?.bbox.x);
    expect(name?.bbox.x).toBeLessThan(plain?.texts[0]?.bbox.x ?? 0);
    const [rn, rs] = right?.texts ?? [];
    expect((rn?.bbox.x ?? 0) + (rn?.bbox.w ?? 0)).toBeCloseTo(
      (rs?.bbox.x ?? 0) + (rs?.bbox.w ?? 0),
    );
  });

  it("lines up an edge label's lines and keeps its box", () => {
    const d = build([edge as Op]);
    const plain = layout(d, m).edges[0]?.label;
    const left = layout(go(d, { op: "label.align", id: "x->y", align: "left" }), m).edges[0]?.label;
    expect(new Set(lefts(left?.runs)).size).toBe(1);
    expect(left?.bbox).toEqual(plain?.bbox);
  });

  it("writes nothing for center on a node, and refuses what has no label to line up", () => {
    const d = build([edge as Op]);
    const back = go(
      d,
      { op: "label.align", id: "x", align: "left" },
      { op: "label.align", id: "x", align: "center" },
    );
    expect(back).toEqual(d);
    const r = applyOps(build([]), [{ op: "label.align", id: "a", align: "left" } as Op]);
    expect("errors" in r ? r.errors[0]?.code : "written").toBe("bad-value");
  });

  it("goes with the label when the label goes", () => {
    const d = go(build([edge as Op]), { op: "label.align", id: "x->y", align: "right" });
    expect(go(d, { op: "edge.label", id: "x->y" }).edges[0]?.labelAlign).toBeUndefined();
  });

  it("lines up a card's lines, and refuses a footnote", () => {
    const d = build([{ op: "note.add", on: "x", text: "one\na longer line" } as Op]);
    const left = layout(d, m).notes?.[0];
    const right = layout(go(d, { op: "note.align", on: "x", align: "right" }), m).notes?.[0];
    expect(new Set(lefts(left?.text?.runs)).size).toBe(1);
    expect(new Set(lefts(right?.text?.runs)).size).toBe(2);
    // A card's width is rounded up, so the right edge lands under 1 px past the left form's.
    expect(right?.card).toEqual(left?.card);
    expect(right?.text?.bbox.w).toBeCloseTo(left?.text?.bbox.w ?? 0);
    const foot = build([{ op: "note.add", on: "x", text: "n", footnote: true } as Op]);
    const r = applyOps(foot, [{ op: "note.align", on: "x", align: "right" } as Op]);
    expect("errors" in r ? r.errors[0]?.code : "written").toBe("bad-value");
  });

  it("keeps a note's alignment when its text changes", () => {
    const d = go(
      build([{ op: "note.add", on: "x", text: "n" } as Op]),
      { op: "note.align", on: "x", align: "center" },
      { op: "note.add", on: "x", text: "m" },
    );
    expect(d.notes?.[0]).toEqual({ on: "x", text: "m", labelAlign: "center" });
    const back = readDiagram(writeGrafical(d));
    expect(Array.isArray(back) ? undefined : back.notes?.[0]?.labelAlign).toBe("center");
  });

  it("survives a .grafical file", () => {
    const d = go(
      build([edge as Op]),
      { op: "label.align", id: "x->y", align: "right" },
      { op: "label.align", id: "y", align: "left" },
    );
    const back = readDiagram(writeGrafical(d));
    if (Array.isArray(back)) throw new Error(JSON.stringify(back));
    expect(back.edges[0]?.labelAlign).toBe("right");
    expect(back.layers[1]?.nodes[0]?.labelAlign).toBe("left");
  });
});

describe("label.style", () => {
  const styled = build([
    { op: "style.add", id: "hot", fill: "#ffe0e0", border: "#c00000", color: "#800000" } as Op,
    { op: "edge.add", from: "x", to: "y", label: "pays" } as Op,
  ]);
  const go = (d: Diagram, ...ops: object[]) => {
    const r = applyOps(d, ops as Op[]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    return r.diagram;
  };

  it("gives an edge's label the style's fill, border and color", () => {
    const d = go(styled, { op: "label.style", id: "x->y", styles: ["hot"] });
    expect(layout(d, m).edges[0]?.labelLook).toMatchObject({
      fill: "#ffe0e0",
      border: "#c00000",
      color: "#800000",
    });
    expect(layout(styled, m).edges[0]?.labelLook).toBeUndefined();
  });

  it("clears with none, with its label and with its style", () => {
    const d = go(styled, { op: "label.style", id: "x->y", styles: ["hot"] });
    expect(go(d, { op: "label.style", id: "x->y" })).toEqual(styled);
    expect(go(d, { op: "edge.label", id: "x->y" }).edges[0]?.labelStyle).toBeUndefined();
    expect(go(d, { op: "style.remove", id: "hot" }).edges[0]?.labelStyle).toBeUndefined();
  });

  it("refuses an unknown style and what has no edge's label", () => {
    const codes = (op: object) => {
      const r = applyOps(styled, [op as Op]);
      return "errors" in r ? r.errors[0]?.code : "written";
    };
    expect(codes({ op: "label.style", id: "x->y", styles: ["cold"] })).toBe("unknown-style");
    expect(codes({ op: "label.style", id: "x", styles: ["hot"] })).toBe("bad-value");
  });

  it("survives a .grafical file", () => {
    const d = go(styled, { op: "label.style", id: "x->y", styles: ["hot"] });
    const back = readDiagram(writeGrafical(d));
    expect(Array.isArray(back) ? undefined : back.edges[0]?.labelStyle).toEqual(["hot"]);
  });
});
