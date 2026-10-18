// Line labels and the boxes around nodes: a group's or a lane's side is a line too, and no line's label lies across it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
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

describe("line labels and group sides", () => {
  // Found on 2026-10-15 in a C4 container diagram: the labels of two lines that leave the
  // system's group to the right lay across its side.
  it("keep a label off the side of a group its line leaves", () => {
    const file = join(import.meta.dirname, "../fixtures/big-bank.grafical.yaml");
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

  // The label of a line between two column lanes sat on their shared side.
  it("keep a label off the side of a column lane its line crosses", () => {
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

describe('a label no gutter holds (DESIGN.md, "The dirty work has edges")', () => {
  // Until 2026-10-17 the middle line stepped out of the crowd with four bends to carry its label.
  it("moves no line for it, and refuses it as label-blocked, naming the line across it", () => {
    const d = readDiagram(`grafical: 1
title: three
density: normal
layers:
  - {id: top, label: Top, nodes: [{id: a, label: Orders API}]}
  - {id: bottom, label: Bottom, nodes: [{id: b, label: Orders DB, kind: store}]}
edges:
  - {id: a->b, from: a, to: b, label: writes orders}
  - {id: a->b#2, from: a, to: b, label: reads stock}
  - {id: a->b#3, from: a, to: b, label: locks rows}
`) as Diagram;
    const s = layout(d, m);
    for (const e of s.edges) expect(e.points.length, e.id).toBe(2);
    expect(
      check(d, s, m).map((x) => [x.code, x.owner, ...x.elements, x.facts.is, x.facts.gutters]),
    ).toEqual([["label-blocked", "agent", "a->b#2", "a->b#3", "edge", ["top/bottom"]]]);
    // The engine never widens a box for its lines; the refusal names the size that holds the
    // label, tried by laying the diagram out with it (decided by the owner on 2026-10-17).
    expect(check(d, s, m)[0]?.facts.fix).toEqual(["node resize <file> a --size l"]);
    const wide = structuredClone(d);
    const a = wide.layers[0]?.nodes[0];
    if (a === undefined) throw new Error("a");
    a.size = "l";
    expect(check(wide, layout(wide, m), m)).toEqual([]);
  });

  // Found by the fuzz test at seeds 1126, 1719 and 4951 of 5,000 on 2026-10-18: a line from a row lane
  // to the row below is cut at the lane's border and keeps a 16 px stub, and the label, with no clear
  // place beside the stub or past its ends, lay across the border, an engine-owned text-crossing.
  it("refuses a label no place beside a line cut at a lane holds, naming the lanes across it", () => {
    const d = readDiagram(`grafical: 1
title: lanes
density: normal
lanes:
  - {id: shop, label: Shop}
  - {id: depot, label: Depot}
layers:
  - {id: top, label: Top, lane: shop, nodes: [{id: a, label: Cart}, {id: c, label: Pay}, {id: e, label: Ship}]}
  - {id: bottom, label: Bottom, lane: depot, nodes: [{id: b, label: Stock}]}
edges:
  - {id: a->b, from: a, to: b}
  - {id: a->b#2, from: a, to: b}
  - {id: a->b#3, from: a, to: b}
  - {id: c->b, from: c, to: b}
  - {id: c->b#2, from: c, to: b}
  - {id: e->b, from: e, to: b}
  - {id: e->b#2, from: e, to: b}
  - {id: e->b#3, from: e, to: b}
  - {id: shop->b, from: shop, to: b, label: picks}
`) as Diagram;
    const found = check(d, layout(d, m), m);
    expect(
      found.map((x) => [x.code, x.owner, ...x.elements, x.facts.gutters, x.facts.fix]),
    ).toEqual([
      [
        "label-blocked",
        "agent",
        "shop->b",
        "shop",
        "depot",
        ["top/bottom"],
        ["edge relabel <file> shop->b"],
      ],
    ]);
    const r = applyOps(d, [{ op: "edge.relabel", id: "shop->b" }]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(check(r.diagram, layout(r.diagram, m), m)).toEqual([]);
  });

  // Found by trying every fix a refusal suggests, on 2026-10-17: no larger box held this label,
  // and the refusal named nothing to run.
  it("where no larger box holds the label, its fix drops it, and grafical accepts that", () => {
    const add: Op = { op: "edge.add", from: "n4", to: "n2", label: "a long label for this line" };
    const checked = (ops: Op[]) => {
      const r = applyOps(generate(35, m).diagram, ops);
      if ("errors" in r) throw new Error(JSON.stringify(r.errors));
      return check(r.diagram, layout(r.diagram, m), m);
    };
    const found = checked([add]).filter((x) => x.code === "label-blocked");
    expect(found.map((x) => [x.elements[0], x.facts.fix])).toEqual([
      ["n4->n2", ["edge relabel <file> n4->n2"]],
    ]);
    expect(checked([add, { op: "edge.relabel", id: "n4->n2" }])).toEqual([]);
  });
});
