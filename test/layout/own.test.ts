// Every attribute of a style may be set on the object itself (specs/decisions, "Every attribute of a style may be set
// on the object itself"): what an object holds beats the styles it marks, which beat what it follows and its type, and
// a margin it holds moves the picture as the same margin from a style does.

import { beforeAll, describe, expect, it } from "vitest";
import { layout } from "../../src/layout/index.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import { writeGrafical } from "../../src/model/grafical-format.ts";
import { applyOps, type Diagram, type Op, parseOp, readDiagram } from "../../src/model/index.ts";
import { renderSvg } from "../../src/render/svg.ts";
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
const refused = (d: Diagram, ...ops: object[]) => {
  const r = applyOps(d, ops as Op[]);
  return "errors" in r ? r.errors : [];
};

const BASE = go(
  null,
  { op: "diagram.set", title: "t" },
  { op: "layer.set", ids: ["a"] },
  { op: "layer.set", ids: ["b"] },
  { op: "node.set", ids: ["x"], layer: "a", label: "x" },
  { op: "node.set", ids: ["w"], layer: "a", label: "w", after: "x" },
  { op: "node.set", ids: ["y"], layer: "b", label: "y" },
  { op: "edge.set", ids: ["x-y"], from: "x", to: "y", label: "reads" },
  { op: "group.set", ids: ["g"], label: "G" },
  { op: "node.set", ids: ["y"], group: "g" },
  { op: "style.set", ids: ["blue"], fill: "#0000ff", color: "#0000ff", marginLeft: "40" },
);

const scene = (d: Diagram) => layout(d, m);
const node = (d: Diagram, id: string) => {
  const n = scene(d).nodes.find((x) => x.id === id);
  if (n === undefined) throw new Error(`no node ${id}`);
  return n;
};

describe("a look an object holds itself", () => {
  it("beats the styles it marks, which beat what it follows", () => {
    const styled = go(BASE, { op: "node.set", ids: ["x"], style: "blue" });
    expect(node(styled, "x").look?.fill).toBe("#0000ff");
    const own = go(styled, { op: "node.set", ids: ["x"], fill: "#ff0000" });
    expect(node(own, "x").look?.fill).toBe("#ff0000");
    // A follower takes the look of what it follows, its own values too, under its own styles.
    const follows = go(own, { op: "node.set", ids: ["w"], like: "x" });
    expect(node(follows, "w").look?.fill).toBe("#ff0000");
    const marks = go(
      follows,
      { op: "style.set", ids: ["green"], fill: "#00ff00" },
      {
        op: "node.set",
        ids: ["w"],
        style: "green",
      },
    );
    expect(node(marks, "w").look?.fill).toBe("#00ff00");
    // `-` gives the value back to the styles.
    const back = go(own, { op: "node.set", ids: ["x"], fill: "-" });
    expect(node(back, "x").look?.fill).toBe("#0000ff");
    expect(back.layers[0]?.nodes[0]?.fill).toBeUndefined();
  });

  it("colors an edge, and an edge's label, over the styles they mark", () => {
    const d = go(
      BASE,
      { op: "edge.set", ids: ["x-y"], style: "blue", color: "#123456" },
      { op: "label.set", ids: ["x-y"], style: "blue", fill: "#ffffff", color: "#654321" },
    );
    const e = scene(d).edges.find((x) => x.id === "x-y");
    expect(e?.look?.color).toBe("#123456");
    expect(e?.labelLook).toEqual({ fill: "#ffffff", color: "#654321" });
    // A label goes with its text: clearing the text takes its look away.
    const bare = go(d, { op: "edge.set", ids: ["x-y"], label: "-" });
    expect(bare.edges[0]?.labelLook).toBeUndefined();
  });

  it("is refused where the label is not an edge's with a text", () => {
    const errors = refused(BASE, { op: "label.set", ids: ["g"], fill: "#ffffff" });
    expect(errors[0]?.code).toBe("bad-value");
  });

  it("is a field only where it means something: an edge has no inside, a layer no look", () => {
    expect(Array.isArray(parseOp({ op: "edge.set", ids: ["x-y"], fill: "#000000" }, 0))).toBe(true);
    expect(Array.isArray(parseOp({ op: "layer.set", ids: ["a"], color: "#000000" }, 0))).toBe(true);
    const bad = parseOp({ op: "node.set", ids: ["x"], marginTop: "6" }, 0);
    expect(Array.isArray(bad) && bad[0]?.field).toBe("margin-top");
  });

  it("means one thing on every object: fill, border and width the inside and outline, color the ink", () => {
    const svg = (d: Diagram) => renderSvg(scene(d));
    const own = go(
      BASE,
      { op: "lane.set", ids: ["team"], label: "Team" },
      { op: "node.set", ids: ["x", "w"], lane: "team" },
      { op: "node.set", ids: ["x"], sublabel: "port", color: "#aa0000" },
      { op: "group.set", ids: ["g"], borderWidth: "3", color: "#00aa00" },
      { op: "lane.set", ids: ["team"], border: "#0000aa", borderWidth: "2", color: "#aa00aa" },
    );
    const text = svg(own);
    // A node's ink is its label and its sublabel alike.
    expect(text.match(/fill="#aa0000"/g)?.length).toBe(2);
    expect(text).toContain('stroke-width="3"');
    expect(text).toMatch(/fill="#00aa00"/);
    expect(text).toContain('stroke="#0000aa" stroke-width="2"');
    expect(text).toMatch(/fill="#aa00aa"/);
    // A style marked on them draws the same.
    const styled = go(
      BASE,
      { op: "lane.set", ids: ["team"], label: "Team" },
      { op: "node.set", ids: ["x", "w"], lane: "team" },
      { op: "node.set", ids: ["x"], sublabel: "port" },
      { op: "style.set", ids: ["ink"], color: "#aa0000" },
      { op: "style.set", ids: ["frame"], borderWidth: "3", color: "#00aa00" },
      { op: "style.set", ids: ["band"], border: "#0000aa", borderWidth: "2", color: "#aa00aa" },
      { op: "node.set", ids: ["x"], style: "ink" },
      { op: "group.set", ids: ["g"], style: "frame" },
      { op: "lane.set", ids: ["team"], style: "band" },
    );
    expect(svg(styled)).toBe(text);
  });
});

describe("a margin an object holds itself", () => {
  const gap = (d: Diagram, a: string, b: string) =>
    node(d, b).rect.x - (node(d, a).rect.x + node(d, a).rect.w);

  it("moves a node as the same margin from a style does, and beats the style's", () => {
    const fromStyle = go(BASE, { op: "node.set", ids: ["w"], style: "blue" });
    const own = go(BASE, { op: "node.set", ids: ["w"], marginLeft: "40" });
    expect(gap(own, "x", "w")).toBe(gap(fromStyle, "x", "w"));
    expect(gap(own, "x", "w")).toBe(gap(BASE, "x", "w") + 40);
    const both = go(fromStyle, { op: "node.set", ids: ["w"], marginLeft: "8" });
    expect(gap(both, "x", "w")).toBe(gap(BASE, "x", "w") + 8);
  });

  it("spaces a layer, a group, a column and the diagram as a style does", () => {
    const down = (d: Diagram) => node(d, "y").rect.y - (node(d, "x").rect.y + node(d, "x").rect.h);
    const layer = go(BASE, { op: "layer.set", ids: ["b"], marginTop: "24" });
    const layerStyled = go(
      BASE,
      { op: "style.set", ids: ["top"], marginTop: "24" },
      { op: "layer.set", ids: ["b"], style: "top" },
    );
    expect(down(layer)).toBe(down(layerStyled));
    expect(down(layer)).toBeGreaterThan(down(BASE));
    const group = go(BASE, { op: "group.set", ids: ["g"], marginTop: "24" });
    const groupStyled = go(
      BASE,
      { op: "style.set", ids: ["top"], marginTop: "24" },
      { op: "group.set", ids: ["g"], style: "top" },
    );
    expect(down(group)).toBe(down(groupStyled));
    const column = go(
      BASE,
      { op: "column.set", ids: ["c"], marginRight: "40" },
      { op: "node.set", ids: ["x"], column: "c" },
    );
    expect(gap(column, "x", "w")).toBe(gap(BASE, "x", "w") + 40);
    const rows = go(BASE, { op: "diagram.set", rowGap: "80", marginLeft: "64" });
    expect(down(rows)).toBe(down(BASE) + 40);
    expect(node(rows, "x").rect.x).toBe(node(BASE, "x").rect.x + 32);
  });
});

describe("a margin is room outside the object's own box", () => {
  const gap = (d: Diagram, a: string, b: string) =>
    node(d, b).rect.x - (node(d, a).rect.x + node(d, a).rect.w);
  const down = (d: Diagram, a: string, b: string) =>
    node(d, b).rect.y - (node(d, a).rect.y + node(d, a).rect.h);
  const three = go(
    null,
    { op: "diagram.set", title: "t" },
    { op: "layer.set", ids: ["a", "b", "c"] },
    { op: "node.set", ids: ["x"], layer: "a", label: "x" },
    { op: "node.set", ids: ["w"], layer: "a", label: "w", after: "x" },
    { op: "node.set", ids: ["y"], layer: "b", label: "y" },
    { op: "node.set", ids: ["z"], layer: "c", label: "z" },
    { op: "edge.set", ids: ["x-y"], from: "x", to: "y" },
    { op: "edge.set", ids: ["w-z"], from: "w", to: "z" },
  );

  it("a layer's left side: its first node's column moves, or the canvas side keeps the room", () => {
    // z sits under w, so its column has x to its left in layer a: the column moves.
    const pushed = go(three, { op: "layer.set", ids: ["c"], marginLeft: "40" });
    expect(gap(pushed, "x", "w")).toBe(gap(three, "x", "w") + 40);
    // y sits in the leftmost column: the canvas side keeps the room instead.
    const edge = go(three, { op: "layer.set", ids: ["b"], marginLeft: "48" });
    expect(node(edge, "y").rect.x - node(three, "y").rect.x).toBeGreaterThanOrEqual(48);
    expect(gap(edge, "x", "w")).toBe(gap(three, "x", "w"));
  });

  it("keeps its room from the canvas side, which is a neighbour too", () => {
    const left = (d: Diagram, id: string) => {
      const g = scene(d).groups?.find((x) => x.id === id);
      return g?.rect.x ?? node(d, id).rect.x;
    };
    const canvas = scene(three).width;
    // A group at the left edge.
    const framed = go(
      three,
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["x", "y"], group: "g" },
    );
    const roomy = go(framed, { op: "group.set", ids: ["g"], marginLeft: "32" });
    expect(left(roomy, "g")).toBe(left(framed, "g") + 32);
    expect(scene(roomy).width).toBe(scene(framed).width + 32);
    // A node outside every group, and a column's strip, at the left edge.
    const nodeRoom = go(three, { op: "node.set", ids: ["x"], marginLeft: "32" });
    expect(left(nodeRoom, "x")).toBe(left(three, "x") + 32);
    expect(scene(nodeRoom).width).toBe(canvas + 32);
    const strip = go(
      three,
      { op: "column.set", ids: ["p"], marginLeft: "32" },
      { op: "node.set", ids: ["x", "y"], column: "p" },
    );
    expect(left(strip, "x")).toBe(left(three, "x") + 32);
    // One that is not at the edge keeps its room from its neighbour, and the canvas stays as it was.
    const inner = go(three, { op: "node.set", ids: ["w"], marginLeft: "16" });
    expect(left(inner, "x")).toBe(left(three, "x"));
  });

  it("a column's: above its first layer as a group's, and between its strip and the next, never between its own nodes", () => {
    const top = go(
      three,
      { op: "column.set", ids: ["p"], marginTop: "24" },
      { op: "node.set", ids: ["y"], column: "p" },
    );
    expect(down(top, "x", "y")).toBe(down(three, "x", "y") + 24);
    const strip = go(
      three,
      { op: "column.set", ids: ["p", "q"] },
      { op: "node.set", ids: ["x", "w"], column: "p" },
      { op: "column.set", ids: ["p"], marginLeft: "40", marginRight: "40" },
    );
    expect(gap(strip, "x", "w")).toBe(gap(three, "x", "w"));
    const next = go(
      three,
      { op: "column.set", ids: ["p", "q"] },
      { op: "node.set", ids: ["x"], column: "p" },
      { op: "node.set", ids: ["w"], column: "q" },
      { op: "column.set", ids: ["p"], marginRight: "16" },
    );
    expect(gap(next, "x", "w")).toBe(gap(three, "x", "w") + 16);
  });

  it("a lane's that runs as layers: outside its band, never between its own layers", () => {
    const lanes = go(
      three,
      { op: "lane.set", ids: ["one"], label: "One" },
      { op: "lane.set", ids: ["two"], label: "Two" },
      { op: "layer.set", ids: ["a", "b"], lane: "one" },
      { op: "layer.set", ids: ["c"], lane: "two" },
    );
    const roomy = go(lanes, { op: "lane.set", ids: ["one"], marginBottom: "24", marginTop: "16" });
    expect(down(roomy, "x", "y")).toBe(down(lanes, "x", "y"));
    expect(down(roomy, "y", "z")).toBe(down(lanes, "y", "z") + 24);
    const band = (d: Diagram, id: string) => scene(d).lanes?.find((x) => x.id === id)?.rect;
    const one = band(roomy, "one");
    const two = band(roomy, "two");
    expect((two?.y ?? 0) - ((one?.y ?? 0) + (one?.h ?? 0))).toBe(24);
    expect((one?.y ?? 0) - (band(lanes, "one")?.y ?? 0)).toBe(16);
  });

  it("a lane's that runs as a column: between its band and the next, which no longer share a side", () => {
    const lanes = go(
      three,
      { op: "lane.set", ids: ["p"], label: "P" },
      { op: "lane.set", ids: ["q"], label: "Q" },
      { op: "node.set", ids: ["x", "y"], lane: "p" },
      { op: "node.set", ids: ["w", "z"], lane: "q" },
    );
    const parted = go(lanes, { op: "lane.set", ids: ["q"], marginLeft: "16" });
    const band = (d: Diagram, id: string) => scene(d).lanes?.find((x) => x.id === id)?.rect;
    const p = band(parted, "p");
    const q = band(parted, "q");
    expect((q?.x ?? 0) - ((p?.x ?? 0) + (p?.w ?? 0))).toBe(16);
    expect(gap(parted, "x", "w")).toBeGreaterThan(gap(lanes, "x", "w"));
  });
});

describe("the file", () => {
  const full = go(
    BASE,
    { op: "diagram.set", rowGap: "48", marginTop: "40" },
    { op: "layer.set", ids: ["a"], marginBottom: "8" },
    { op: "node.set", ids: ["x"], fill: "#ffeeee", border: "#cc0000", borderWidth: "2" },
    { op: "node.set", ids: ["x"], style: "blue", like: "w" },
    { op: "group.set", ids: ["g"], fill: "#eeeeff", marginLeft: "16" },
    { op: "edge.set", ids: ["x-y"], color: "#0969da", style: "blue" },
    { op: "label.set", ids: ["x-y"], fill: "#ffffff", borderWidth: "1" },
    { op: "lane.set", ids: ["team"], label: "Team", fill: "#fafafa" },
    { op: "column.set", ids: ["c"], marginLeft: "4" },
  );

  it("writes what an object holds before its like and its style, and reads it back byte for byte", () => {
    const text = writeGrafical(full);
    expect(text).toMatch(
      /<node> x \{[^}]*fill: #ffeeee\n {2}border: #cc0000\n {2}border-width: 2\n {2}like: @w\n {2}style: @blue\n\}/,
    );
    expect(text).toMatch(/<diagram> \{[^}]*margin-top: 40\n {2}row-gap: 48\n\}/);
    expect(text).toMatch(/<edge> x-y \{[^}]*color: #0969da\n {2}style: @blue\n\}/);
    expect(text).toMatch(/<label> x-y-label \{[^}]*fill: #ffffff\n {2}border-width: 1\n\}/);
    const back = readDiagram(text);
    if (Array.isArray(back)) throw new Error(JSON.stringify(back));
    expect(writeGrafical(back)).toBe(text);
  });

  it("refuses an attribute the sort does not hold", () => {
    const text = writeGrafical(full);
    const colored = text.replace("  color: #0969da\n", "  fill: #0969da\n");
    const r = readDiagram(colored);
    expect(Array.isArray(r) && r[0]?.code).toBe("unknown-field");
    const groupLabel = text.replace('  text: "G"\n', '  text: "G"\n  fill: #ffffff\n');
    const g = readDiagram(groupLabel);
    expect(Array.isArray(g) && g[0]?.code).toBe("unknown-field");
  });

  it("diff says each as a command, and the commands give the file again", () => {
    for (const [before, after] of [
      [null, full],
      [BASE, full],
      [full, BASE],
    ] as const) {
      const ops = diffDiagrams(before, after);
      let d: Diagram | null = before;
      for (const op of ops) d = go(d, op);
      expect(writeGrafical(d as Diagram)).toBe(writeGrafical(after));
    }
  });
});
