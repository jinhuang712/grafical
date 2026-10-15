// A group's label sits in its head where the lines into its first row keep their centres.

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe("group label seats", () => {
  // Found by the owner on 2026-10-16 in a booking C4 diagram: the label "Booking app
  // software system" was wider than the room between the lines into the group's first
  // row, so the traveller's line into the web app was pushed to the box's left edge.
  it("make room between two lines rather than push a line off centre", () => {
    const d = readDiagram(`grafical: 1
title: seats
density: normal
layers:
  - {id: people, label: People, nodes: [{id: traveller, label: Traveller, kind: actor}, {id: hotel, label: Hotel staff, kind: actor}]}
  - {id: apps, label: Apps, nodes: [{id: web, label: Web app, group: app}, {id: mobile, label: Mobile app, group: app}, {id: portal, label: Partner portal, group: app}]}
groups:
  - {id: app, label: Booking app, sublabel: software system}
edges:
  - {id: traveller->web, from: traveller, to: web}
  - {id: traveller->mobile, from: traveller, to: mobile}
  - {id: hotel->portal, from: hotel, to: portal}
`) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    for (const [id, to] of [
      ["traveller->web", "web"],
      ["hotel->portal", "portal"],
    ]) {
      const e = s.edges.find((x) => x.id === id);
      const r = s.nodes.find((n) => n.id === to)?.rect;
      if (e === undefined || r === undefined) throw new Error(id);
      expect(e.points.at(-1)?.x, id).toBe(r.x + r.w / 2);
    }
  });
});
