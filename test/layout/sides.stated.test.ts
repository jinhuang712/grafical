// An agent may state the side of a line (specs/decisions, "An agent may state the side of a line").

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { writeGrafical } from "../../src/model/grafical-format.ts";
import { applyOps, type Diagram, type Op, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const node = (id: string, layer: string, more: object = {}): Op =>
  ({ op: "node.add", id, layer, label: id, ...more }) as Op;

function build(ops: Op[]): Diagram {
  const r = applyOps(null, [
    { op: "diagram.new", title: "t" },
    { op: "layer.add", id: "a" },
    { op: "layer.add", id: "b" },
    ...ops,
  ] as Op[]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

const side = (id: string, sides: object): Op => ({ op: "edge.side", id, ...sides }) as Op;
const row = [node("x", "b"), node("y", "b", { after: "x" }), node("t", "a")];
const line = { op: "edge.add", from: "x", to: "y" } as Op;

describe("stated sides", () => {
  it("takes a line between neighbours round below or above", () => {
    const by = (s: object) => layout(build([...row, line, side("x->y", s)]), m).edges[0]?.points;
    const low = by({ out: "bottom", in: "bottom" }) ?? [];
    const high = by({ out: "top", in: "top" }) ?? [];
    const straight = layout(build([...row, line]), m).edges[0]?.points ?? [];
    expect(low.length).toBeGreaterThan(straight.length);
    expect(Math.max(...low.map((p) => p.y))).toBeGreaterThan(Math.max(...straight.map((p) => p.y)));
    expect(Math.min(...high.map((p) => p.y))).toBeLessThan(Math.min(...straight.map((p) => p.y)));
  });

  it("leaves by a side toward a target beside it", () => {
    const d = build([
      node("x", "a"),
      node("q", "b"),
      node("z", "b", { after: "q" }),
      { op: "edge.add", from: "x", to: "q" } as Op,
      { op: "edge.add", from: "x", to: "z" } as Op,
      side("x->z", { out: "right" }),
    ]);
    const s = layout(d, m);
    expect(check(d, s, m).filter((p) => p.code === "side-blocked")).toEqual([]);
    const [a, b] = s.edges.find((e) => e.id === "x->z")?.points ?? [];
    expect(a?.y).toBe(b?.y);
  });

  it("refuses a side it has no route by, and names the side it would draw", () => {
    const d = build([
      node("x", "a"),
      node("y", "b"),
      { op: "edge.add", from: "x", to: "y" } as Op,
      side("x->y", { out: "top" }),
    ]);
    const found = check(d, layout(d, m), m).filter((p) => p.code === "side-blocked");
    expect(found).toHaveLength(1);
    expect(found[0]?.facts).toEqual({ place: "out top", drawn: "bottom" });
  });

  it("keeps a side the change does not name, and with neither gives both back", () => {
    let d = build([...row, line, side("x->y", { out: "bottom" }), side("x->y", { in: "bottom" })]);
    expect(d.edges[0]).toMatchObject({ out: "bottom", in: "bottom" });
    const r = applyOps(d, [side("x->y", {})]);
    if ("errors" in r) throw new Error("refused");
    d = r.diagram;
    expect(d.edges[0]?.out).toBeUndefined();
    expect(d.edges[0]?.in).toBeUndefined();
  });

  it("keeps the sides in the file", () => {
    const d = build([...row, line, side("x->y", { out: "bottom", in: "bottom" })]);
    const back = readDiagram(writeGrafical(d));
    expect(Array.isArray(back) ? undefined : back.edges[0]).toMatchObject({
      out: "bottom",
      in: "bottom",
    });
  });
});
