// Line labels and the boxes around nodes: a group's or a lane's side is a line too, and no line's label lies across it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { lanesColumns } from "../fixtures/lanes.ts";

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
  });
});
