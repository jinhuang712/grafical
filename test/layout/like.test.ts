// An object follows another's look (specs/decisions, "`like` follows an object's look and nothing else").

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

const BASE = [
  { op: "diagram.set", title: "t" },
  { op: "layer.set", ids: ["l"] },
  { op: "layer.set", ids: ["k"] },
  { op: "node.set", ids: ["a"], layer: "l", label: "A" },
  { op: "node.set", ids: ["b"], layer: "l", label: "B", last: true },
  { op: "node.set", ids: ["c"], layer: "k", label: "C" },
  { op: "style.set", ids: ["blue"], fill: "#0000ff" },
  { op: "style.set", ids: ["green"], fill: "#00ff00" },
  { op: "type.set", ids: ["red"], base: "service", fill: "#ff0000" },
  { op: "node.set", ids: ["a"], style: "blue" },
];

function build(ops: object[]): Diagram {
  const r = applyOps(null, [...BASE, ...ops] as Op[]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}
const fill = (d: Diagram, id: string) => layout(d, m).nodes.find((n) => n.id === id)?.look?.fill;
const refused = (ops: object[]) => {
  const r = applyOps(build([]), ops as Op[]);
  return "errors" in r ? r.errors[0] : undefined;
};

describe("a follower's look", () => {
  it("is the followed object's, and changes with it", () => {
    const d = build([{ op: "node.set", ids: ["b"], like: "a" }]);
    expect(fill(d, "b")).toBe("#0000ff");
    const r = applyOps(d, [{ op: "node.set", ids: ["a"], style: "green" }] as Op[]);
    if ("errors" in r) throw new Error("refused");
    expect(fill(r.diagram, "b")).toBe("#00ff00");
  });

  it("sits under its own styles and over its type", () => {
    const typed = [
      { op: "node.set", ids: ["b"], type: "red" },
      { op: "node.set", ids: ["b"], like: "a" },
    ];
    expect(fill(build(typed), "b")).toBe("#0000ff");
    const styled = [...typed, { op: "node.set", ids: ["b"], style: "green" }];
    expect(fill(build(styled), "b")).toBe("#00ff00");
  });

  it("passes down a chain", () => {
    const d = build([
      { op: "node.set", ids: ["b"], like: "a" },
      { op: "node.set", ids: ["c"], like: "b" },
    ]);
    expect(fill(d, "c")).toBe("#0000ff");
  });

  it("takes no shape and no place", () => {
    const d = build([
      { op: "node.set", ids: ["a"], type: "store" },
      { op: "node.set", ids: ["b"], like: "a" },
    ]);
    const nodes = layout(d, m).nodes;
    expect(nodes.find((n) => n.id === "b")?.kind).toBe("service");
    expect(nodes.find((n) => n.id === "b")?.layer).toBe("l");
  });

  it("reaches a group and a lane", () => {
    const d = build([
      { op: "group.set", ids: ["g1"], label: "G1" },
      { op: "node.set", ids: ["a"], group: "g1" },
      { op: "group.set", ids: ["g2"], label: "G2" },
      { op: "node.set", ids: ["c"], group: "g2" },
      { op: "group.set", ids: ["g1"], style: "blue" },
      { op: "group.set", ids: ["g2"], like: "g1" },
    ]);
    expect(layout(d, m).groups?.find((g) => g.id === "g2")?.look?.fill).toBe("#0000ff");
    const lanes = build([
      { op: "lane.set", ids: ["p"], label: "P" },
      { op: "lane.set", ids: ["q"], label: "Q" },
      { op: "lane.set", ids: ["p"], style: "blue" },
      { op: "lane.set", ids: ["q"], like: "p" },
      { op: "layer.set", ids: ["l"], lane: "p" },
      { op: "layer.set", ids: ["k"], lane: "q" },
    ]);
    expect(layout(lanes, m).lanes?.find((x) => x.id === "q")?.look?.fill).toBe("#0000ff");
  });

  it("takes an edge's look and its weight, and the edge's own weight wins", () => {
    const edges = [
      { op: "edge.set", ids: ["e1"], from: "a", to: "c" },
      { op: "edge.set", ids: ["e2"], from: "b", to: "c" },
      { op: "edge.set", ids: ["e1"], weight: "3" },
      { op: "edge.set", ids: ["e1"], style: "blue" },
      { op: "edge.set", ids: ["e2"], like: "e1" },
    ];
    const e2 = layout(build(edges), m).edges.find((e) => e.id === "e2");
    expect(e2?.look?.fill).toBe("#0000ff");
    expect(e2?.width).toBe(3);
    const own = build([...edges, { op: "edge.set", ids: ["e2"], weight: "2" }]);
    expect(layout(own, m).edges.find((e) => e.id === "e2")?.width).toBe(2);
  });
});

describe("following", () => {
  it("refuses a circle, also through a chain", () => {
    expect(refused([{ op: "node.set", ids: ["a"], like: "a" }])?.code).toBe("like-cycle");
    const e = refused([
      { op: "node.set", ids: ["a"], like: "b" },
      { op: "node.set", ids: ["b"], like: "c" },
      { op: "node.set", ids: ["c"], like: "a" },
    ]);
    expect(e).toMatchObject({ code: "like-cycle", facts: { chain: ["c", "a", "b", "c"] } });
  });

  it("refuses an object of another sort or none", () => {
    expect(refused([{ op: "node.set", ids: ["a"], like: "l" }])?.code).toBe("unknown-node");
    // An id no node has makes a node, which needs a label.
    expect(refused([{ op: "node.set", ids: ["z"], like: "a" }])?.code).toBe("missing-field");
  });

  it("lets go without a target, and when the target goes", () => {
    const d = build([{ op: "node.set", ids: ["b"], like: "a" }]);
    const off = applyOps(d, [{ op: "node.set", ids: ["b"], like: "-" }] as Op[]);
    if ("errors" in off) throw new Error("refused");
    expect(fill(off.diagram, "b")).toBeUndefined();
    const gone = applyOps(d, [{ op: "node.remove", ids: ["a"] }] as Op[]);
    if ("errors" in gone) throw new Error("refused");
    expect(fill(gone.diagram, "b")).toBeUndefined();
    expect(JSON.stringify(gone.diagram)).not.toContain('"like"');
  });
});

describe("the file", () => {
  const followed = () =>
    build([
      { op: "node.set", ids: ["b"], like: "a" },
      { op: "edge.set", ids: ["e1"], from: "a", to: "c" },
      { op: "edge.set", ids: ["e2"], from: "b", to: "c" },
      { op: "edge.set", ids: ["e2"], like: "e1" },
      { op: "group.set", ids: ["g1"], label: "G1" },
      { op: "node.set", ids: ["a"], group: "g1" },
      { op: "group.set", ids: ["g2"], label: "G2" },
      { op: "node.set", ids: ["c"], group: "g2" },
      { op: "group.set", ids: ["g2"], like: "g1" },
    ]);

  it("reads back what it wrote", () => {
    const text = writeGrafical(followed());
    expect(text).toContain("  like: @a\n");
    const back = readDiagram(text);
    if (Array.isArray(back)) throw new Error(JSON.stringify(back));
    expect(writeGrafical(back)).toBe(text);
  });

  it("refuses a circle or a name nothing holds", () => {
    const text = writeGrafical(build([{ op: "node.set", ids: ["b"], like: "a" }]));
    const circle = text.replace("  style: @blue\n", "  like: @b\n  style: @blue\n");
    expect(readDiagram(circle)).toMatchObject([{ code: "like-cycle" }, { code: "like-cycle" }]);
    const stray = text.replace("  like: @a\n", "  like: @nope\n");
    expect(readDiagram(stray)).toMatchObject([{ code: "unknown-node", field: "like" }]);
  });
});
