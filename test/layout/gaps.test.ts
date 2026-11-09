// The gap between two regions takes a multiple (specs/decisions, "The gap between two regions may be magnified").

import { beforeAll, describe, expect, it } from "vitest";
import { layout } from "../../src/layout/index.ts";
import { writeGrafical } from "../../src/model/grafical-format.ts";
import { applyOps, type Diagram, type Op, parseOp, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const go = (d: Diagram | null, ...ops: object[]) => {
  const r = applyOps(d, ops as Op[]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
};

const layered = go(
  null,
  { op: "diagram.new", title: "t" },
  { op: "layer.add", id: "a" },
  { op: "layer.add", id: "b" },
  { op: "layer.add", id: "c" },
  { op: "node.add", id: "x", layer: "a", label: "x" },
  { op: "node.add", id: "w", layer: "a", label: "w", after: "x" },
  { op: "node.add", id: "y", layer: "b", label: "y" },
  { op: "node.add", id: "z", layer: "c", label: "z" },
  { op: "edge.add", from: "x", to: "y" },
  { op: "edge.add", from: "y", to: "z" },
);
const top = (d: Diagram, id: string) => layout(d, m).nodes.find((n) => n.id === id)?.rect.y ?? 0;
const left = (d: Diagram, id: string) => layout(d, m).nodes.find((n) => n.id === id)?.rect.x ?? 0;

describe("gap.between", () => {
  it("widens the gutter between two neighbouring layers and no other", () => {
    const d = go(layered, { op: "gap.between", a: "a", b: "b", magnified: 2 });
    const was = top(layered, "y") - top(layered, "x");
    expect(top(d, "y") - top(d, "x")).toBeGreaterThan(was);
    expect(top(d, "z") - top(d, "y")).toBe(top(layered, "z") - top(layered, "y"));
  });

  it("takes either order and goes back with no multiple", () => {
    const d = go(layered, { op: "gap.between", a: "a", b: "b", magnified: 2 });
    const same = go(d, { op: "gap.between", a: "b", b: "a", magnified: 1.5 });
    expect(same.gaps).toHaveLength(1);
    expect(go(d, { op: "gap.between", a: "b", b: "a" })).toEqual(layered);
  });

  it("refuses regions that are not neighbours of one kind", () => {
    for (const [a, b] of [
      ["a", "c"],
      ["a", "a"],
      ["a", "x"],
      ["a", "nope"],
    ]) {
      const r = applyOps(layered, [{ op: "gap.between", a, b, magnified: 2 } as Op]);
      expect("errors" in r ? r.errors[0]?.code : "written").toBe("not-neighbours");
    }
  });

  it("names the multiples it takes", () => {
    const ops = parseOp({ op: "gap.between", a: "a", b: "b", magnified: 3 }, 0);
    expect(ops).toMatchObject([{ code: "bad-value", facts: { allowed: ["1.25", "1.5", "2"] } }]);
  });

  it("goes when its layer goes", () => {
    const d = go(layered, { op: "gap.between", a: "b", b: "c", magnified: 2 });
    expect(
      go(d, { op: "node.remove", id: "z" }, { op: "layer.remove", id: "c" }).gaps,
    ).toBeUndefined();
  });

  it("widens the gap between two columns", () => {
    const base = go(
      layered,
      { op: "column.add", id: "p" },
      { op: "column.add", id: "q" },
      { op: "column.join", column: "p", members: ["x"] },
      { op: "column.join", column: "q", members: ["w"] },
    );
    const d = go(base, { op: "gap.between", a: "p", b: "q", magnified: 2 });
    expect(left(d, "w") - left(d, "x")).toBeGreaterThan(left(base, "w") - left(base, "x"));
  });

  it("widens the gap between two groups, side by side and stacked", () => {
    const base = go(
      layered,
      { op: "group.add", id: "g", label: "g", nodes: ["x"] },
      { op: "group.add", id: "h", label: "h", nodes: ["w"] },
      { op: "group.add", id: "j", label: "j", nodes: ["y"] },
    );
    const across = go(base, { op: "gap.between", a: "g", b: "h", magnified: 2 });
    expect(left(across, "w") - left(across, "x")).toBeGreaterThan(
      left(base, "w") - left(base, "x"),
    );
    const down = go(base, { op: "gap.between", a: "g", b: "j", magnified: 2 });
    expect(top(down, "y") - top(down, "x")).toBeGreaterThan(top(base, "y") - top(base, "x"));
  });

  it("survives a .grafical file", () => {
    const d = go(layered, { op: "gap.between", a: "a", b: "b", magnified: 1.25 });
    const back = readDiagram(writeGrafical(d));
    expect(Array.isArray(back) ? undefined : back.gaps).toEqual(d.gaps);
  });
});
