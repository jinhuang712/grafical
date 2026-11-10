// An edge steered by facts (specs/decisions, "An edge is steered by facts and never by coordinates").

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

const layered = (...layers: string[][]) =>
  layers.flatMap((ns, i) => [
    { op: "layer.set", ids: [`r${i}`] },
    ...ns.map((n, k) => ({
      op: "node.set",
      ids: [n],
      layer: `r${i}`,
      label: n.toUpperCase(),
      ...(k > 0 ? { last: true } : {}),
    })),
  ]);
function build(...ops: object[]): Diagram {
  const r = applyOps(null, [{ op: "diagram.set", title: "t" }, ...ops] as Op[]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}
const edge = (d: Diagram, id: string) => {
  const e = layout(d, m).edges.find((x) => x.id === id);
  if (e === undefined) throw new Error(id);
  return e;
};
const defects = (d: Diagram) => check(d, layout(d, m), m).map((x) => x.code);

describe("--with", () => {
  const tree = () =>
    build(
      { op: "layer.set", ids: ["r"] },
      { op: "node.set", ids: ["a"], layer: "r", label: "A" },
      { op: "node.set", ids: ["b"], from: "a", down: "1", right: "1", label: "B" },
      { op: "node.set", ids: ["c"], from: "b", down: "1", label: "C" },
      { op: "node.set", ids: ["d"], from: "c", down: "1", label: "D" },
      { op: "edge.set", ids: ["a-b"], from: "a", to: "b" },
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
      { op: "edge.set", ids: ["a-d"], from: "a", to: "d" },
      { op: "edge.set", ids: ["a-d"], in: "left" },
      { op: "edge.set", ids: ["a-c"], in: "left" },
      { op: "edge.set", ids: ["a-c"], with: "a-d" },
      { op: "edge.set", ids: ["a-b"], with: "a-d" },
    );

  it("draws a tree with one spine", () => {
    const d = tree();
    expect(defects(d)).toEqual([]);
    const spine = edge(d, "a-d").points[0];
    for (const id of ["a-b", "a-c", "a-d"]) {
      const { points } = edge(d, id);
      expect(points[0]).toEqual(spine);
      expect(points[1]?.x).toBe(spine?.x);
      expect(points.at(-2)?.y).toBe(points.at(-1)?.y);
    }
  });

  it("refuses a trunk with no end in common, or a circle", () => {
    const base = [...layered(["a", "b"], ["c", "d"])];
    const r = (...ops: object[]) => {
      const out = applyOps(
        build(
          ...base,
          { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
          { op: "edge.set", ids: ["b-d"], from: "b", to: "d" },
        ),
        ops as Op[],
      );
      return "errors" in out ? out.errors[0]?.code : "ok";
    };
    expect(r({ op: "edge.set", ids: ["a-c"], with: "b-d" })).toBe("no-trunk");
    expect(r({ op: "edge.set", ids: ["a-c"], with: "nope" })).toBe("unknown-edge");
  });

  it("lets go when the trunk goes", () => {
    const r = applyOps(tree(), [{ op: "edge.remove", ids: ["a-d"] }] as Op[]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.edges.find((e) => e.id === "a-c")?.with).toBeUndefined();
  });
});

describe("--straight", () => {
  it("refuses an edge that has a bend", () => {
    const d = build(
      ...layered(["a", "b"], ["c", "d"]),
      { op: "edge.set", ids: ["a-d"], from: "a", to: "d" },
      { op: "edge.set", ids: ["b-c"], from: "b", to: "c" },
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
      { op: "edge.set", ids: ["b-c"], straight: "on" },
    );
    expect(defects(d)).toContain("not-straight");
  });

  it("gives the stated edge its column first", () => {
    const ops = [
      ...layered(["a"], ["b", "c", "d"]),
      { op: "edge.set", ids: ["a-b"], from: "a", to: "b" },
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
      { op: "edge.set", ids: ["a-d"], from: "a", to: "d" },
    ];
    const d = build(...ops, { op: "edge.set", ids: ["a-d"], straight: "on" });
    const points = edge(d, "a-d").points;
    expect(points.at(0)?.x).toBe(points.at(-1)?.x);
    expect(points).toHaveLength(2);
    expect(defects(d)).toEqual([]);
  });
});

describe("--via", () => {
  const ops = [
    ...layered(["a"], ["b", "c"], ["d", "e"]),
    { op: "group.set", ids: ["g"], label: "G" },
    { op: "node.set", ids: ["b", "c"], group: "g" },
    { op: "edge.set", ids: ["a-e"], from: "a", to: "e" },
  ];

  it("takes the stated side of a group", () => {
    for (const side of ["left", "right"] as const) {
      const d = build(...ops, { op: "edge.set", ids: ["a-e"], via: `g:${side}` });
      expect(defects(d)).toEqual([]);
      const g = layout(d, m).groups?.find((x) => x.id === "g")?.rect;
      const xs = edge(d, "a-e")
        .points.filter((p) => p.y > (g?.y ?? 0) && p.y < (g?.y ?? 0) + (g?.h ?? 0))
        .map((p) => p.x);
      const level = edge(d, "a-e").points.map((p) => p.x);
      if (side === "left") expect(Math.min(...level, ...xs)).toBeLessThan(g?.x ?? 0);
      else expect(Math.max(...level, ...xs)).toBeGreaterThan((g?.x ?? 0) + (g?.w ?? 0));
    }
  });

  it("refuses an object no edge comes level with", () => {
    const d = build(
      ...layered(["a", "b"], ["c"], ["z"]),
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
      { op: "edge.set", ids: ["a-c"], via: "z:left" },
    );
    expect(defects(d)).toContain("via-blocked");
  });

  it("lets go when the object goes", () => {
    const r = applyOps(build(...ops, { op: "edge.set", ids: ["a-e"], via: "b:left" }), [
      { op: "edge.set", ids: ["b-c"], from: "b", to: "c" },
      { op: "node.remove", ids: ["b"] },
    ] as Op[]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.edges.find((e) => e.id === "a-e")?.via).toBeUndefined();
  });
});

describe("--bend and --stretch", () => {
  it("slides an edge's inner run, and refuses an edge with none", () => {
    const ops = [
      ...layered(["a", "x"], ["y", "b"]),
      { op: "edge.set", ids: ["a-b"], from: "a", to: "b" },
    ];
    const plain = edge(build(...ops), "a-b").points;
    const d = build(...ops, { op: "edge.set", ids: ["a-b"], bendAt: "0.75" });
    const was = plain[1]?.y as number;
    expect(defects(d)).toEqual([]);
    expect(edge(d, "a-b").points[1]?.y).not.toBe(was);
    const line = build(
      ...layered(["a"], ["b"]),
      { op: "edge.set", ids: ["a-b"], from: "a", to: "b" },
      { op: "edge.set", ids: ["a-b"], bendAt: "0.5" },
    );
    expect(defects(line)).toContain("bend-blocked");
  });

  it("reaches a detour further, and refuses an edge with none", () => {
    const ops = [
      ...layered(["a"], ["b"], ["c"]),
      { op: "edge.set", ids: ["a-b"], from: "a", to: "b" },
      { op: "edge.set", ids: ["b-c"], from: "b", to: "c" },
      { op: "edge.set", ids: ["c-a"], from: "c", to: "a" },
    ];
    const was = Math.min(...edge(build(...ops), "c-a").points.map((p) => p.x));
    const d = build(...ops, { op: "edge.set", ids: ["c-a"], stretch: "2" });
    expect(Math.min(...edge(d, "c-a").points.map((p) => p.x))).toBeLessThan(was);
    expect(defects(build(...ops, { op: "edge.set", ids: ["a-b"], stretch: "2" }))).toContain(
      "stretch-blocked",
    );
  });
});

describe("the file", () => {
  it("reads back every fact", () => {
    const d = build(
      ...layered(["a", "b"], ["c", "d"]),
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
      { op: "edge.set", ids: ["a-d"], from: "a", to: "d" },
      { op: "edge.set", ids: ["a-d"], via: "b:left" },
      { op: "edge.set", ids: ["a-c"], straight: "on" },
      { op: "edge.set", ids: ["a-d"], with: "a-c" },
      { op: "edge.set", ids: ["a-d"], bendAt: "0.5" },
      { op: "edge.set", ids: ["a-d"], stretch: "1.5" },
    );
    const text = writeGrafical(d);
    expect(text).toContain("  via: @b left\n");
    const back = readDiagram(text);
    if (Array.isArray(back)) throw new Error(JSON.stringify(back));
    expect(writeGrafical(back)).toBe(text);
  });
});
