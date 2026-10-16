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
import { GROUP_TITLES } from "../../src/model/types.ts";
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
      {
        code: "bad-value",
        found: "middle",
        facts: { allowed: [...GROUP_TITLES] },
      },
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

  // Lines leave the last row by the bottom, through the foot the label sits in.
  const below = readDiagram(`grafical: 1
title: Booking
density: normal
layers:
  - {id: people, label: People, nodes: [{id: traveller, label: Traveller, kind: actor}, {id: hotel, label: Hotel staff, kind: actor}]}
  - {id: apps, label: Apps, nodes: [{id: web, label: Web app, group: app}, {id: mobile, label: Mobile app, group: app}, {id: portal, label: Partner portal, group: app}]}
  - {id: core, label: Core, nodes: [{id: api, label: Booking API, group: app}]}
  - {id: data, label: Data, nodes: [{id: cache, label: Cache, kind: store, group: app}, {id: db, label: Bookings, kind: store, group: app}]}
  - {id: ext, label: External, nodes: [{id: backup, label: Backup vault, kind: external}, {id: audit, label: Audit log, kind: external}]}
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
  - {id: api->cache, from: api, to: cache}
  - {id: cache->backup, from: cache, to: backup}
  - {id: db->audit, from: db, to: audit}
`) as Diagram;

  // Lines run into the group's one row from both sides.
  const oneRow = readDiagram(`grafical: 1
title: One row
density: normal
layers:
  - {id: top, label: Top, nodes: [{id: user, label: User, kind: actor}]}
  - {id: row, label: Row, nodes: [{id: gw, label: Gateway}, {id: api, label: Orders API, group: svc}, {id: db, label: Orders DB, kind: store, group: svc}, {id: pay, label: Payments}]}
groups:
  - {id: svc, label: Orders service}
edges:
  - {id: user->gw, from: user, to: gw}
  - {id: gw->api, from: gw, to: api, label: routes}
  - {id: api->db, from: api, to: db}
  - {id: db->pay, from: db, to: pay}
`) as Diagram;

  for (const at of GROUP_TITLES) {
    it(`sits exactly at ${at}`, () => {
      const d = ok(below, [{ op: "group.title", id: "app", at }]);
      const s = layout(d, m);
      const g = s.groups?.find((x) => x.id === "app");
      const web = s.nodes.find((n) => n.id === "web")?.rect;
      const db = s.nodes.find((n) => n.id === "db")?.rect;
      if (g === undefined || web === undefined || db === undefined) throw new Error("no group");
      const t = g.label.bbox;
      const end = (g.sublabel?.bbox.x ?? t.x) + (g.sublabel?.bbox.w ?? t.w);
      const r = g.rect;
      // Across: an inset from a side, the middle, or a gap outside a side.
      if (["top-left", "bottom-left", "left"].includes(at)) expect(t.x - r.x).toBeCloseTo(16, 0);
      if (["top-right", "bottom-right", "right"].includes(at)) {
        expect(r.x + r.w - end).toBeCloseTo(16, 0);
      }
      if (["top", "bottom", "outside-top", "outside-bottom"].includes(at)) {
        expect((t.x + end) / 2).toBeCloseTo(r.x + r.w / 2, 0);
      }
      if (at === "outside-left") expect(r.x - end).toBeCloseTo(12, 0);
      if (at === "outside-right") expect(t.x - (r.x + r.w)).toBeCloseTo(12, 0);
      // Down: in the head, in a foot, just outside the top or bottom, or at the middle height.
      if (at.startsWith("top")) {
        expect(t.y).toBeGreaterThan(r.y);
        expect(t.y + t.h).toBeLessThan(web.y);
      } else if (at.startsWith("bottom")) {
        expect(t.y).toBeGreaterThan(db.y + db.h);
        expect(t.y + t.h).toBeLessThan(r.y + r.h);
      } else if (at === "outside-top") {
        expect(t.y + t.h).toBeLessThan(r.y);
        expect(t.y).toBeGreaterThan(r.y - 40);
      } else if (at === "outside-bottom") {
        expect(t.y).toBeGreaterThan(r.y + r.h);
        expect(t.y + t.h).toBeLessThan(r.y + r.h + 40);
      } else {
        expect(t.y + t.h / 2).toBeCloseTo(r.y + r.h / 2, 0);
      }
      // Without a head, the box's top is a padding away from the first row.
      if (!at.startsWith("top")) expect(web.y - r.y).toBe(24);
    });
  }

  it("moves no line and no box for its place: only its own room is added", () => {
    for (const [d0, id] of [
      [booking, "app"],
      [below, "app"],
      [oneRow, "svc"],
    ] as const) {
      const at = (place: GroupTitle) => layout(ok(d0, [{ op: "group.title", id, at: place }]), m);
      const across = (place: GroupTitle) => {
        const s = at(place);
        return {
          lines: s.edges.map((e) => e.points.map((p) => p.x)),
          boxes: s.nodes.map((n) => n.rect.x),
          group: s.groups?.map((g) => [g.rect.x, g.rect.w]),
        };
      };
      const first = across("top-left");
      for (const place of GROUP_TITLES.filter((x) => !["left", "right"].includes(x))) {
        if (place.startsWith("outside-l") || place.startsWith("outside-r")) {
          const w = (s: ReturnType<typeof at>) => s.groups?.find((g) => g.id === id)?.rect.w;
          expect(w(at(place)), place).toBe(w(at("top-left")));
        } else {
          expect(across(place), place).toEqual(first);
        }
      }
    }
  });

  it("refuses a place a line crosses, and names the places clear of every line", () => {
    for (const [d0, id, at, line] of [
      [booking, "app", "top", "traveller->mobile"],
      [booking, "app", "top-left", "traveller->web"],
      [below, "app", "bottom-right", "db->audit"],
      [oneRow, "svc", "left", "gw->api"],
      [oneRow, "svc", "outside-right", "db->pay"],
    ] as const) {
      const d = ok(d0, [{ op: "group.title", id, at }]);
      const found = check(d, layout(d, m), m).filter((x) => x.owner === "agent");
      expect(
        found.map((x) => [x.code, x.elements, x.facts.place]),
        at,
      ).toEqual([["title-blocked", [id, line], at]]);
      const clear = found[0]?.facts.clear ?? [];
      expect(clear.length, at).toBeGreaterThan(0);
      for (const place of GROUP_TITLES) {
        const e = ok(d0, [{ op: "group.title", id, at: place }]);
        const blocked = check(e, layout(e, m), m).some((x) => x.code === "title-blocked");
        expect(blocked, place).toBe(!clear.includes(place));
      }
    }
  });

  it("is clear where no line comes near it, with no engine defect", () => {
    for (const [d0, id, at] of [
      [booking, "app", "bottom"],
      [below, "app", "bottom-left"],
      [below, "app", "left"],
      [below, "app", "outside-right"],
      [oneRow, "svc", "top"],
      [oneRow, "svc", "outside-bottom"],
    ] as const) {
      const d = ok(d0, [{ op: "group.title", id, at }]);
      expect(check(d, layout(d, m), m), at).toEqual([]);
    }
  });

  it("outside a side, leaves no empty space past the other side", () => {
    for (const at of ["outside-left", "outside-right"] as GroupTitle[]) {
      const s = layout(ok(below, [{ op: "group.title", id: "app", at }]), m);
      const g = s.groups?.find((x) => x.id === "app");
      if (g === undefined) throw new Error("no group");
      const t = g.label.bbox;
      const end = (g.sublabel?.bbox.x ?? t.x) + (g.sublabel?.bbox.w ?? t.w);
      const xs = [...s.nodes.map((n) => n.rect), g.rect].flatMap((r) => [r.x, r.x + r.w]);
      const left = Math.min(t.x, ...xs);
      const right = Math.max(end, ...xs);
      expect(Math.abs(left - (s.width - right)), at).toBeLessThanOrEqual(8);
    }
  });

  it("leaves a picture without one as it was", () => {
    const d = ok(booking, [{ op: "group.title", id: "app", at: "top" }]);
    const back = ok(d, [{ op: "group.title", id: "app" }]);
    expect(layout(back, m)).toEqual(layout(booking, m));
  });
});
