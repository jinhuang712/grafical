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
  { op: "diagram.new", title: "t" },
  { op: "layer.add", id: "l" },
  { op: "layer.add", id: "k" },
  { op: "node.add", id: "a", layer: "l", label: "A" },
  { op: "node.add", id: "b", layer: "l", label: "B", last: true },
  { op: "node.add", id: "c", layer: "k", label: "C" },
  { op: "style.add", id: "blue", fill: "#0000ff" },
  { op: "style.add", id: "green", fill: "#00ff00" },
  { op: "type.add", id: "red", base: "service", fill: "#ff0000" },
  { op: "node.style", id: "a", styles: ["blue"] },
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
    const d = build([{ op: "node.like", id: "b", like: "a" }]);
    expect(fill(d, "b")).toBe("#0000ff");
    const r = applyOps(d, [{ op: "node.style", id: "a", styles: ["green"] }] as Op[]);
    if ("errors" in r) throw new Error("refused");
    expect(fill(r.diagram, "b")).toBe("#00ff00");
  });

  it("sits under its own styles and over its type", () => {
    const typed = [
      { op: "node.type", id: "b", type: "red" },
      { op: "node.like", id: "b", like: "a" },
    ];
    expect(fill(build(typed), "b")).toBe("#0000ff");
    const styled = [...typed, { op: "node.style", id: "b", styles: ["green"] }];
    expect(fill(build(styled), "b")).toBe("#00ff00");
  });

  it("passes down a chain", () => {
    const d = build([
      { op: "node.like", id: "b", like: "a" },
      { op: "node.like", id: "c", like: "b" },
    ]);
    expect(fill(d, "c")).toBe("#0000ff");
  });

  it("takes no shape and no place", () => {
    const d = build([
      { op: "node.type", id: "a", type: "store" },
      { op: "node.like", id: "b", like: "a" },
    ]);
    const nodes = layout(d, m).nodes;
    expect(nodes.find((n) => n.id === "b")?.kind).toBe("service");
    expect(nodes.find((n) => n.id === "b")?.layer).toBe("l");
  });

  it("reaches a group and a lane", () => {
    const d = build([
      { op: "group.add", id: "g1", label: "G1", nodes: ["a"] },
      { op: "group.add", id: "g2", label: "G2", nodes: ["c"] },
      { op: "group.style", id: "g1", styles: ["blue"] },
      { op: "group.like", id: "g2", like: "g1" },
    ]);
    expect(layout(d, m).groups?.find((g) => g.id === "g2")?.look?.fill).toBe("#0000ff");
    const lanes = build([
      { op: "lane.add", id: "p", label: "P" },
      { op: "lane.add", id: "q", label: "Q" },
      { op: "lane.style", id: "p", styles: ["blue"] },
      { op: "lane.like", id: "q", like: "p" },
      { op: "lane.join", lane: "p", members: ["l"] },
      { op: "lane.join", lane: "q", members: ["k"] },
    ]);
    expect(layout(lanes, m).lanes?.find((x) => x.id === "q")?.look?.fill).toBe("#0000ff");
  });

  it("takes an edge's look and its weight, and the edge's own weight wins", () => {
    const edges = [
      { op: "edge.add", id: "e1", from: "a", to: "c" },
      { op: "edge.add", id: "e2", from: "b", to: "c" },
      { op: "edge.weight", edges: ["e1"], weight: 3 },
      { op: "edge.style", id: "e1", styles: ["blue"] },
      { op: "edge.like", id: "e2", like: "e1" },
    ];
    const e2 = layout(build(edges), m).edges.find((e) => e.id === "e2");
    expect(e2?.look?.fill).toBe("#0000ff");
    expect(e2?.width).toBe(3);
    const own = build([...edges, { op: "edge.weight", edges: ["e2"], weight: 2 }]);
    expect(layout(own, m).edges.find((e) => e.id === "e2")?.width).toBe(2);
  });
});

describe("following", () => {
  it("refuses a circle, also through a chain", () => {
    expect(refused([{ op: "node.like", id: "a", like: "a" }])?.code).toBe("like-cycle");
    const e = refused([
      { op: "node.like", id: "a", like: "b" },
      { op: "node.like", id: "b", like: "c" },
      { op: "node.like", id: "c", like: "a" },
    ]);
    expect(e).toMatchObject({ code: "like-cycle", facts: { chain: ["c", "a", "b", "c"] } });
  });

  it("refuses an object of another sort or none", () => {
    expect(refused([{ op: "node.like", id: "a", like: "l" }])?.code).toBe("unknown-node");
    expect(refused([{ op: "node.like", id: "z", like: "a" }])?.code).toBe("unknown-node");
  });

  it("lets go without a target, and when the target goes", () => {
    const d = build([{ op: "node.like", id: "b", like: "a" }]);
    const off = applyOps(d, [{ op: "node.like", id: "b" }] as Op[]);
    if ("errors" in off) throw new Error("refused");
    expect(fill(off.diagram, "b")).toBeUndefined();
    const gone = applyOps(d, [{ op: "node.remove", id: "a" }] as Op[]);
    if ("errors" in gone) throw new Error("refused");
    expect(fill(gone.diagram, "b")).toBeUndefined();
    expect(JSON.stringify(gone.diagram)).not.toContain('"like"');
  });
});

describe("the file", () => {
  const followed = () =>
    build([
      { op: "node.like", id: "b", like: "a" },
      { op: "edge.add", id: "e1", from: "a", to: "c" },
      { op: "edge.add", id: "e2", from: "b", to: "c" },
      { op: "edge.like", id: "e2", like: "e1" },
      { op: "group.add", id: "g1", label: "G1", nodes: ["a"] },
      { op: "group.add", id: "g2", label: "G2", nodes: ["c"] },
      { op: "group.like", id: "g2", like: "g1" },
    ]);

  it("reads back what it wrote", () => {
    const text = writeGrafical(followed());
    expect(text).toContain("  like: @a\n");
    const back = readDiagram(text);
    if (Array.isArray(back)) throw new Error(JSON.stringify(back));
    expect(writeGrafical(back)).toBe(text);
  });

  it("refuses a circle or a name nothing holds", () => {
    const text = writeGrafical(build([{ op: "node.like", id: "b", like: "a" }]));
    const circle = text.replace("  style: @blue\n", "  like: @b\n  style: @blue\n");
    expect(readDiagram(circle)).toMatchObject([{ code: "like-cycle" }, { code: "like-cycle" }]);
    const stray = text.replace("  like: @a\n", "  like: @nope\n");
    expect(readDiagram(stray)).toMatchObject([{ code: "unknown-node", field: "like" }]);
  });
});
