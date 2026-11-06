// An agent sets a label's breaks and its alignment (specs/decisions, "An agent sets a label's breaks and its alignment").

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op, parseOps } from "../../src/model/index.ts";
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
