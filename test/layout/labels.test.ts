// Edge labels and the frames around nodes: a group's or a lane's side is a line too, and no edge's label lies across it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { DESCRIPTIONS, defectBlock, kindsOf } from "../../src/cli/problems.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { lanesColumns } from "../fixtures/lanes.ts";
import { generate } from "../fuzz/gen.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe("edge labels and group sides", () => {
  // Found on 2026-10-15 in a C4 container diagram: the labels of two edges that leave the
  // system's group to the right lay across its side.
  it("keep a label off the side of a group its edge leaves", () => {
    const file = join(import.meta.dirname, "../fixtures/big-bank.grafical");
    const d = readDiagram(readFileSync(file, "utf8")) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m)).toEqual([]);
    const g = s.groups?.find((x) => x.id === "ibs")?.rect;
    if (g === undefined) throw new Error("ibs");
    for (const id of ["mobile->api", "api->mainframe"]) {
      const b = s.edges.find((e) => e.id === id)?.label?.bbox;
      if (b === undefined) throw new Error(id);
      expect(b.x + b.w <= g.x + g.w || b.x >= g.x + g.w, id).toBe(true);
    }
  });

  // The label of an edge between two column lanes sat on their shared side.
  it("keep a label off the side of a column lane its edge crosses", () => {
    const s = layout(lanesColumns, m);
    expect(check(lanesColumns, s, m)).toEqual([]);
    const b = s.edges.find((e) => e.id === "orders->payments")?.label?.bbox;
    if (b === undefined) throw new Error("orders->payments");
    for (const l of s.lanes ?? []) {
      for (const x of [l.rect.x, l.rect.x + l.rect.w]) {
        expect(x <= b.x || x >= b.x + b.w, l.id).toBe(true);
      }
    }
  });
});

describe('a label no gutter holds (specs/decisions, "An edge never moves for its label")', () => {
  // Until 2026-10-17 the middle edge stepped out of the crowd with four bends to carry its label.
  it("moves no edge for it, and refuses it as label-blocked, naming the edge across it", () => {
    const d = readDiagram(`<diagram> {
  format: 1
  title: "five"
  density: normal
}

<layer> top {
}

<layer> bottom {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @top
    @bottom
}

<order> top-order {
  of: @top
  axis: across
  items:
    @a
}

<order> bottom-order {
  of: @bottom
  axis: across
  items:
    @b
}

<node> a {
  type: @service
  text: "Orders API"
  layer: @top
}

<node> b {
  type: @store
  text: "Orders DB"
  layer: @bottom
}

<edge> a->b {
  from: @a
  to: @b
  type: @call
}

<edge> a->b#2 {
  from: @a
  to: @b
  type: @call
}

<edge> a->b#3 {
  from: @a
  to: @b
  type: @call
}

<edge> a->b#4 {
  from: @a
  to: @b
  type: @call
}

<edge> a->b#5 {
  from: @a
  to: @b
  type: @call
}

<label> top-label {
  on: @top
  text: "Top"
}

<label> bottom-label {
  on: @bottom
  text: "Bottom"
}

<label> a->b-label {
  on: @a->b
  text: "writes orders"
}

<label> a->b#2-label {
  on: @a->b#2
  text: "reads stock"
}

<label> a->b#3-label {
  on: @a->b#3
  text: "locks rows"
}

<label> a->b#4-label {
  on: @a->b#4
  text: "audits changes"
}

<label> a->b#5-label {
  on: @a->b#5
  text: "retries failed"
}
`) as Diagram;
    const s = layout(d, m);
    for (const e of s.edges) expect(e.points.length, e.id).toBe(2);
    expect(
      check(d, s, m).map((x) => [x.code, x.owner, ...x.elements, x.facts.is, x.facts.gutters]),
    ).toEqual([["label-blocked", "agent", "a->b#4", "a->b#5", "edge", ["top/bottom"]]]);
    // The engine never widens a node for its edges; the agent does (decided by the owner on
    // 2026-10-17), and the refusal names node size among the commands that can change it.
    const [blocked] = check(d, s, m);
    if (blocked === undefined) throw new Error("no refusal");
    expect(defectBlock(blocked, kindsOf(d)).next).toContain("node --size");
    const wide = structuredClone(d);
    const a = wide.layers[0]?.nodes[0];
    if (a === undefined) throw new Error("a");
    a.size = "l";
    expect(check(wide, layout(wide, m), m)).toEqual([]);
  });

  // Found by the fuzz test at seeds 1126, 1719 and 4951 of 5,000 on 2026-10-18: an edge from a layer lane
  // to the layer below is cut at the lane's border and keeps a 16 px stub, and the label, with no clear
  // place beside the stub or past its ends, lay across the border, an engine-owned text-crossing.
  it("refuses a label no place beside an edge cut at a lane holds, naming the lanes across it", () => {
    const d = readDiagram(`<diagram> {
  format: 1
  title: "lanes"
  density: normal
}

<layer> top {
  lane: @shop
}

<layer> bottom {
  lane: @depot
}

<lane> shop {
}

<lane> depot {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @top
    @bottom
}

<order> top-order {
  of: @top
  axis: across
  items:
    @a
    @c
    @e
}

<order> bottom-order {
  of: @bottom
  axis: across
  items:
    @b
}

<node> a {
  type: @service
  text: "Cart"
  layer: @top
}

<node> c {
  type: @service
  text: "Pay"
  layer: @top
}

<node> e {
  type: @service
  text: "Ship"
  layer: @top
}

<node> b {
  type: @service
  text: "Stock"
  layer: @bottom
}

<edge> a->b {
  from: @a
  to: @b
  type: @call
}

<edge> a->b#2 {
  from: @a
  to: @b
  type: @call
}

<edge> a->b#3 {
  from: @a
  to: @b
  type: @call
}

<edge> c->b {
  from: @c
  to: @b
  type: @call
}

<edge> c->b#2 {
  from: @c
  to: @b
  type: @call
}

<edge> e->b {
  from: @e
  to: @b
  type: @call
}

<edge> e->b#2 {
  from: @e
  to: @b
  type: @call
}

<edge> e->b#3 {
  from: @e
  to: @b
  type: @call
}

<edge> shop->b {
  from: @shop
  to: @b
  type: @call
}

<label> top-label {
  on: @top
  text: "Top"
}

<label> bottom-label {
  on: @bottom
  text: "Bottom"
}

<label> shop-label {
  on: @shop
  text: "Shop"
}

<label> depot-label {
  on: @depot
  text: "Depot"
}

<label> shop->b-label {
  on: @shop->b
  text: "picks"
}
`) as Diagram;
    const found = check(d, layout(d, m), m);
    // The block names the edge, the lanes across its label and the gaps it tried, and the commands that can change
    // it, edge label among them (specs/decisions, "Refusals say what happened and which commands can change it").
    expect(found.map((x) => defectBlock(x, kindsOf(d)))).toEqual([
      {
        kind: "defect",
        code: "label-blocked",
        description: DESCRIPTIONS["label-blocked"],
        detail: {
          owner: "agent",
          is: "edge",
          edge: "shop->b",
          lanes: ["shop", "depot"],
          gutters: ["top/bottom"],
        },
        next: ["layer --move", "node --size", "node --move", "edge --label", "edge --number"],
      },
    ]);
    const r = applyOps(d, [{ op: "edge.label", id: "shop->b" }]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(check(r.diagram, layout(r.diagram, m), m)).toEqual([]);
  });

  // Found by trying every fix a refusal suggested, on 2026-10-17: no larger node held this label.
  it("where no larger node holds the label, it names the command that drops it, and grafical accepts that", () => {
    const add: Op = { op: "edge.add", from: "n4", to: "n2", label: "a long label for this line" };
    const checked = (ops: Op[]) => {
      const r = applyOps(generate(35, m).diagram, ops);
      if ("errors" in r) throw new Error(JSON.stringify(r.errors));
      return check(r.diagram, layout(r.diagram, m), m);
    };
    const found = checked([add]).filter((x) => x.code === "label-blocked");
    expect(found.map((x) => x.elements[0])).toEqual(["n4->n2"]);
    const r = applyOps(generate(35, m).diagram, [add]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(found.map((x) => defectBlock(x, kindsOf(r.diagram)).next)).toEqual([
      ["layer --move", "node --size", "node --move", "edge --label", "edge --number"],
    ]);
    expect(checked([add, { op: "edge.label", id: "n4->n2" }])).toEqual([]);
  });
});
