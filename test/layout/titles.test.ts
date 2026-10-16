// Where a group's label sits when the agent states it (DESIGN.md, "The agent states where a group's label sits").

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import {
  applyOps,
  type Diagram,
  type GroupTitle,
  type Op,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function ok(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}

// The booking diagram where the owner found the seated label in a weird spot, on 2026-10-16.
const booking = readDiagram(`grafical: 1
title: Booking
density: normal
layers:
  - {id: people, label: People, nodes: [{id: traveller, label: Traveller, kind: actor}, {id: hotel, label: Hotel staff, kind: actor}]}
  - {id: apps, label: Apps, nodes: [{id: web, label: Web app, group: app}, {id: mobile, label: Mobile app, group: app}, {id: portal, label: Partner portal, group: app}]}
  - {id: core, label: Core, nodes: [{id: api, label: Booking API, group: app}]}
  - {id: data, label: Data, nodes: [{id: db, label: Bookings, kind: store, group: app}]}
groups:
  - {id: app, label: Booking app, sublabel: software system}
edges:
  - {id: traveller->web, from: traveller, to: web}
  - {id: traveller->mobile, from: traveller, to: mobile}
  - {id: hotel->portal, from: hotel, to: portal}
  - {id: web->api, from: web, to: api}
  - {id: mobile->api, from: mobile, to: api}
  - {id: portal->api, from: portal, to: api}
  - {id: api->db, from: api, to: db}
`) as Diagram;

describe("a group's stated label place", () => {
  it("is set, kept in the file, cleared and refused when unknown", () => {
    const d = ok(booking, [{ op: "group.title", id: "app", at: "top-right" }]);
    expect(d.groups?.[0]?.titleAt).toBe("top-right");
    expect(writeDiagram(d)).toContain("titleAt: top-right");
    expect(readDiagram(writeDiagram(d))).toEqual(d);
    expect(ok(d, [{ op: "group.title", id: "app" }]).groups?.[0]?.titleAt).toBeUndefined();
    expect(fail(d, [{ op: "group.title", id: "apq", at: "top" }])[0]?.code).toBe("unknown-group");
    const wrong = readDiagram(writeDiagram(d).replace("titleAt: top-right", "titleAt: middle"));
    expect(wrong).toMatchObject([
      { code: "bad-value", found: "middle", facts: { allowed: ["top-left", "top", "top-right"] } },
    ]);
  });

  it("diffs as the operation that set it, and a copy keeps it", () => {
    const a = ok(booking, [{ op: "group.title", id: "app", at: "top" }]);
    for (const [x, y] of [
      [booking, a],
      [a, booking],
    ] as const) {
      const r = applyOps(x, diffDiagrams(x, y));
      if ("errors" in r) throw new Error(JSON.stringify(r.errors));
      expect(writeDiagram(r.diagram)).toBe(writeDiagram(y));
    }
    expect(diffDiagrams(booking, a)).toEqual([{ op: "group.title", id: "app", at: "top" }]);
  });

  for (const at of ["top-left", "top", "top-right"] as GroupTitle[]) {
    it(`sits at the ${at} of the head, and the lines into the first row keep their centres`, () => {
      const d = ok(booking, [{ op: "group.title", id: "app", at }]);
      const s = layout(d, m);
      expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
      const g = s.groups?.find((x) => x.id === "app");
      if (g === undefined) throw new Error("no group");
      const x = g.label.bbox.x;
      const end = (g.sublabel?.bbox.x ?? x) + (g.sublabel?.bbox.w ?? g.label.bbox.w);
      if (at === "top-left") expect(x - g.rect.x).toBeCloseTo(16, 0);
      if (at === "top-right") expect(g.rect.x + g.rect.w - end).toBeCloseTo(16, 0);
      if (at === "top") expect((x + end) / 2).toBeCloseTo(g.rect.x + g.rect.w / 2, 0);
      for (const [id, to] of [
        ["traveller->web", "web"],
        ["traveller->mobile", "mobile"],
        ["hotel->portal", "portal"],
      ]) {
        const e = s.edges.find((y) => y.id === id);
        const r = s.nodes.find((n) => n.id === to)?.rect;
        if (e === undefined || r === undefined) throw new Error(id);
        expect(e.points.at(-1)?.x, id).toBe(r.x + r.w / 2);
      }
    });
  }

  it("leaves a picture without one as it was", () => {
    const d = ok(booking, [{ op: "group.title", id: "app", at: "top" }]);
    const back = ok(d, [{ op: "group.title", id: "app" }]);
    expect(layout(back, m)).toEqual(layout(booking, m));
  });
});
