// An edge carries its label (specs/decisions, "An edge's label sits on its edge").

import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
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
  ({ op: "node.set", ids: [id], layer, label: id, ...more }) as Op;

function build(ops: Op[]): Diagram {
  const r = applyOps(null, [
    { op: "diagram.set", title: "t" },
    { op: "layer.set", ids: ["a"] },
    { op: "layer.set", ids: ["b"] },
    ...ops,
  ] as Op[]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

/** Two nodes far apart, so that the edge turns and its long run carries the label. */
const turning = [
  node("x", "a"),
  node("pad", "a", { after: "x" }),
  node("far", "a", { after: "pad" }),
  node("left", "b"),
  node("y", "b", { after: "left" }),
  node("z", "b", { after: "y" }),
  { op: "edge.set", ids: ["x-z"], from: "x", to: "z", label: "goes" } as Op,
];

describe("labels on edges", () => {
  it("goes onto its edge where the gutter saw no room but a run leaves its height clear", () => {
    const d = readDiagram(readFileSync("test/fixtures/big-bank.grafical", "utf8")) as Diagram;
    const e = layout(d, m).edges.find((x) => x.id === "customer-spa");
    const box = e?.label?.bbox;
    expect((box?.x ?? 0) + (box?.w ?? 0) / 2).toBeCloseTo(e?.points[0]?.x ?? 0, 0);
  });

  it("sits on the long run of an edge that turns, with the run through its middle", () => {
    const e = layout(build(turning), m).edges[0];
    const box = e?.label?.bbox;
    const runs = (e?.points ?? []).slice(1).filter((p, i) => p.y === e?.points[i]?.y);
    expect(box).toBeDefined();
    expect(runs).toHaveLength(1);
    expect(Math.abs((box?.y ?? 0) + (box?.h ?? 0) / 2 - (runs[0]?.y ?? 0))).toBeLessThanOrEqual(1);
  });

  it("sits at the middle of a straight edge, up and down", () => {
    const d = build([
      node("x", "a"),
      node("y", "b"),
      { op: "edge.set", ids: ["x-y"], from: "x", to: "y", label: "goes" } as Op,
    ]);
    const e = layout(d, m).edges[0];
    const [a, b] = [e?.points[0], e?.points[1]];
    const box = e?.label?.bbox;
    const mid = ((a?.y ?? 0) + (b?.y ?? 0)) / 2;
    expect(Math.abs((box?.y ?? 0) + (box?.h ?? 0) / 2 - mid)).toBeLessThanOrEqual(1);
  });

  it("sits beside the edge when the agent takes it off, and comes back", () => {
    const off = build([...turning, { op: "label.set", ids: ["x-z"], seat: "beside" } as Op]);
    expect(off.edges[0]?.seat).toBe("beside");
    const e = layout(off, m).edges[0];
    const y = e?.points.slice(1).find((p, i) => p.y === e?.points[i]?.y)?.y ?? 0;
    const box = e?.label?.bbox;
    expect((box?.y ?? 0) + (box?.h ?? 0)).toBeLessThanOrEqual(y);
    const r = applyOps(off, [{ op: "label.set", ids: ["x-z"], seat: "on" } as Op]);
    expect("errors" in r ? "refused" : r.diagram.edges[0]?.seat).toBeUndefined();
  });

  it("refuses a seat on an edge with no label, and clearing a label clears its seat", () => {
    const d = build([...turning, { op: "label.set", ids: ["x-z"], seat: "beside" } as Op]);
    const r = applyOps(d, [{ op: "edge.set", ids: ["x-z"], label: "-" } as Op]);
    expect("errors" in r ? "refused" : r.diagram.edges[0]?.seat).toBeUndefined();
    const again = applyOps("errors" in r ? d : r.diagram, [
      { op: "label.set", ids: ["x-z"], seat: "beside" } as Op,
    ]);
    expect("errors" in again).toBe(true);
  });

  it("keeps the seat in the file", () => {
    const d = build([...turning, { op: "label.set", ids: ["x-z"], seat: "beside" } as Op]);
    const text = writeGrafical(d);
    expect(text).toMatch(/seat:? beside/);
    const back = readDiagram(text);
    expect(Array.isArray(back) ? undefined : back.edges[0]?.seat).toBe("beside");
  });
});
