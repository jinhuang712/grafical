// Where a group's label sits when the agent states it (specs/decisions, "The agent states where a group's label sits").

import { beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { check } from "../../src/check/index.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import { writeGrafical } from "../../src/model/grafical-format.ts";
import {
  applyOps,
  type Diagram,
  type GroupTitle,
  type Op,
  parseOps,
  readDiagram,
  validateDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

/** The plain object a file holds, checked as the schema checks it. */
const fromYaml = (text: string) => validateDiagram(parse(text));

/** The places tried for a blocked title, by the names the checks below read them by. */
const P: Record<string, GroupTitle> = {
  "top-left": { at: 0, side: "top", place: "inside" },
  top: { at: 0.5, side: "top", place: "inside" },
  "top-right": { at: 1, side: "top", place: "inside" },
  "bottom-left": { at: 0, side: "bottom", place: "inside" },
  bottom: { at: 0.5, side: "bottom", place: "inside" },
  "bottom-right": { at: 1, side: "bottom", place: "inside" },
  "outside-top": { at: 0.5, side: "top", place: "outside" },
  "outside-bottom": { at: 0.5, side: "bottom", place: "outside" },
  left: { at: 0.5, side: "left", place: "inside" },
  right: { at: 0.5, side: "right", place: "inside" },
  "outside-left": { at: 0.5, side: "left", place: "outside" },
  "outside-right": { at: 0.5, side: "right", place: "outside" },
};
const NAMES = Object.keys(P);
const words = (name: string) => `${P[name]?.at} ${P[name]?.side} ${P[name]?.place}`;

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
const booking = readDiagram(`<diagram> {
  format: 1
  title: "Booking"
  density: normal
}

<layer> people {
}

<layer> apps {
}

<layer> core {
}

<layer> data {
}

<group> app {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @people
    @apps
    @core
    @data
}

<order> people-order {
  of: @people
  axis: across
  items:
    @traveller
    @hotel
}

<order> apps-order {
  of: @apps
  axis: across
  items:
    @web
    @mobile
    @portal
}

<order> core-order {
  of: @core
  axis: across
  items:
    @api
}

<order> data-order {
  of: @data
  axis: across
  items:
    @db
}

<node> traveller {
  type: @actor
  text: "Traveller"
  layer: @people
}

<node> hotel {
  type: @actor
  text: "Hotel staff"
  layer: @people
}

<node> web {
  type: @service
  text: "Web app"
  layer: @apps
  group: @app
}

<node> mobile {
  type: @service
  text: "Mobile app"
  layer: @apps
  group: @app
}

<node> portal {
  type: @service
  text: "Partner portal"
  layer: @apps
  group: @app
}

<node> api {
  type: @service
  text: "Booking API"
  layer: @core
  group: @app
}

<node> db {
  type: @store
  text: "Bookings"
  layer: @data
  group: @app
}

<edge> traveller->web {
  from: @traveller
  to: @web
  type: @call
}

<edge> traveller->mobile {
  from: @traveller
  to: @mobile
  type: @call
}

<edge> hotel->portal {
  from: @hotel
  to: @portal
  type: @call
}

<edge> web->api {
  from: @web
  to: @api
  type: @call
}

<edge> mobile->api {
  from: @mobile
  to: @api
  type: @call
}

<edge> portal->api {
  from: @portal
  to: @api
  type: @call
}

<edge> api->db {
  from: @api
  to: @db
  type: @call
}

<label> people-label {
  on: @people
  text: "People"
}

<label> apps-label {
  on: @apps
  text: "Apps"
}

<label> core-label {
  on: @core
  text: "Core"
}

<label> data-label {
  on: @data
  text: "Data"
}

<label> app-label {
  on: @app
  text: "Booking app"
  sublabel: "software system"
}
`) as Diagram;

describe("a diagram's title at a fraction", () => {
  const go = (ops: object[]) => ok(booking, ops as Op[]);
  const title = (d: Diagram) => layout(d, m).title.bbox;

  it("sits across the picture, its own point meeting the width's, and a subtitle follows", () => {
    const d = go([
      { op: "diagram.subtitle", text: "Who books what" },
      { op: "diagram.label-at", at: 0.5 },
    ]);
    const s = layout(d, m);
    expect(s.title.bbox.x + s.title.bbox.w / 2).toBeCloseTo(s.width / 2, 0);
    const sub = s.subtitle?.bbox;
    expect((sub?.x ?? 0) + (sub?.w ?? 0) / 2).toBeCloseTo(s.width / 2, 0);
    expect(title(go([{ op: "diagram.label-at", at: 1 }])).x).toBeGreaterThan(s.title.bbox.x);
  });

  it("moves to the foot with its subtitle, and the content takes the head's room", () => {
    const top = layout(go([{ op: "diagram.subtitle", text: "Who books what" }]), m);
    const low = layout(
      go([
        { op: "diagram.subtitle", text: "Who books what" },
        { op: "diagram.label-at", at: 0, side: "bottom" },
      ]),
      m,
    );
    const lowest = Math.max(...low.nodes.map((n) => n.rect.y + n.rect.h));
    expect(low.title.bbox.y).toBeGreaterThan(lowest);
    expect(low.subtitle?.bbox.y).toBeGreaterThan(low.title.bbox.y);
    expect(Math.min(...low.nodes.map((n) => n.rect.y))).toBeLessThan(
      Math.min(...top.nodes.map((n) => n.rect.y)),
    );
  });

  it("clears with no fraction, diffs as its operation and survives a .grafical file", () => {
    const d = go([{ op: "diagram.label-at", at: 0.5, side: "bottom" }]);
    expect(ok(d, [{ op: "diagram.label-at" } as Op])).toEqual(booking);
    expect(diffDiagrams(booking, d)).toEqual([{ op: "diagram.label-at", at: 0.5, side: "bottom" }]);
    expect(diffDiagrams(d, booking)).toEqual([{ op: "diagram.label-at" }]);
    const back = readDiagram(writeGrafical(d));
    expect(Array.isArray(back) ? undefined : back.titleAt).toEqual(d.titleAt);
  });
});

describe("a layer's and a lane's label along its head", () => {
  const layered = (labelAt?: number) =>
    fromYaml(`grafical: 1
title: Rows
density: normal
lanes:
  - {id: l, label: Lane${labelAt === undefined ? "" : `, labelAt: ${labelAt}`}}
layers:
  - {id: a, label: Front, lane: l${labelAt === undefined ? "" : `, labelAt: ${labelAt}`}, look: band, nodes: [{id: x, label: X}, {id: y, label: Y}]}
  - {id: b, label: Back, lane: l, look: band, nodes: [{id: z, label: Z}]}
edges:
  - {id: x->z, from: x, to: z}
`) as Diagram;
  const band = (d: Diagram) => layout(d, m).bands?.find((b) => b.id === "a")?.label?.bbox;
  const lane = (d: Diagram) => layout(d, m).lanes?.find((x) => x.id === "l")?.label.bbox;

  it("moves a layer's label along its head", () => {
    const start = ok(layered(), [{ op: "layer.label-at", id: "a", at: 0 } as Op]);
    const end = ok(layered(), [{ op: "layer.label-at", id: "a", at: 1 } as Op]);
    expect(band(end)?.x).toBeGreaterThan(band(start)?.x ?? 0);
  });

  it("moves a layer lane's label down its head", () => {
    const end = ok(layered(), [{ op: "lane.label-at", id: "l", at: 1 } as Op]);
    expect(lane(end)?.y).toBeGreaterThan(lane(layered())?.y ?? 0);
    expect(ok(end, [{ op: "lane.label-at", id: "l" } as Op])).toEqual(layered());
  });

  it("refuses a layer with no label", () => {
    const d = ok(layered(), [{ op: "layer.add", id: "c" } as Op]);
    expect(fail(d, [{ op: "layer.label-at", id: "c", at: 0 } as Op])[0]?.code).toBe("bad-value");
  });

  it("survives a .grafical file and diffs as its operation", () => {
    const d = layered(0.5);
    const back = readDiagram(writeGrafical(d));
    expect(back).toEqual(d);
    expect(diffDiagrams(layered(), d)).toEqual([
      { op: "layer.label-at", id: "a", at: 0.5 },
      { op: "lane.label-at", id: "l", at: 0.5 },
    ]);
  });
});

describe("a group's stated label place", () => {
  it("is set, kept in the file, cleared and refused when unknown", () => {
    const d = ok(booking, [{ op: "group.label-at", id: "app", ...P["top-right"] }]);
    expect(d.groups?.[0]?.titleAt).toEqual(P["top-right"]);
    expect(writeDiagram(d)).toContain("  at: 1\n  side: top\n  place: inside");
    expect(readDiagram(writeDiagram(d))).toEqual(d);
    expect(ok(d, [{ op: "group.label-at", id: "app" }]).groups?.[0]?.titleAt).toBeUndefined();
    expect(fail(d, [{ op: "group.label-at", id: "apq", ...P.top }])[0]?.code).toBe("unknown-group");
    const wrong = readDiagram(writeDiagram(d).replace("side: top", "side: middle"));
    expect(wrong).toMatchObject([
      {
        code: "bad-value",
        found: "middle",
        facts: { allowed: ["top", "bottom", "left", "right"] },
      },
    ]);
  });

  it("diffs as the operation that set it, and a copy keeps it", () => {
    const a = ok(booking, [{ op: "group.label-at", id: "app", ...P.top }]);
    for (const [x, y] of [
      [booking, a],
      [a, booking],
    ] as const) {
      const r = applyOps(x, diffDiagrams(x, y));
      if ("errors" in r) throw new Error(JSON.stringify(r.errors));
      expect(writeDiagram(r.diagram)).toBe(writeDiagram(y));
    }
    expect(diffDiagrams(booking, a)).toEqual([{ op: "group.label-at", id: "app", ...P.top }]);
  });

  // Edges leave the last layer by the bottom, through the foot the label sits in.
  const below = readDiagram(`<diagram> {
  format: 1
  title: "Booking"
  density: normal
}

<layer> people {
}

<layer> apps {
}

<layer> core {
}

<layer> data {
}

<layer> ext {
}

<group> app {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @people
    @apps
    @core
    @data
    @ext
}

<order> people-order {
  of: @people
  axis: across
  items:
    @traveller
    @hotel
}

<order> apps-order {
  of: @apps
  axis: across
  items:
    @web
    @mobile
    @portal
}

<order> core-order {
  of: @core
  axis: across
  items:
    @api
}

<order> data-order {
  of: @data
  axis: across
  items:
    @cache
    @db
}

<order> ext-order {
  of: @ext
  axis: across
  items:
    @backup
    @audit
}

<node> traveller {
  type: @actor
  text: "Traveller"
  layer: @people
}

<node> hotel {
  type: @actor
  text: "Hotel staff"
  layer: @people
}

<node> web {
  type: @service
  text: "Web app"
  layer: @apps
  group: @app
}

<node> mobile {
  type: @service
  text: "Mobile app"
  layer: @apps
  group: @app
}

<node> portal {
  type: @service
  text: "Partner portal"
  layer: @apps
  group: @app
}

<node> api {
  type: @service
  text: "Booking API"
  layer: @core
  group: @app
}

<node> cache {
  type: @store
  text: "Cache"
  layer: @data
  group: @app
}

<node> db {
  type: @store
  text: "Bookings"
  layer: @data
  group: @app
}

<node> backup {
  type: @external
  text: "Backup vault"
  layer: @ext
}

<node> audit {
  type: @external
  text: "Audit log"
  layer: @ext
}

<edge> traveller->web {
  from: @traveller
  to: @web
  type: @call
}

<edge> traveller->mobile {
  from: @traveller
  to: @mobile
  type: @call
}

<edge> hotel->portal {
  from: @hotel
  to: @portal
  type: @call
}

<edge> web->api {
  from: @web
  to: @api
  type: @call
}

<edge> mobile->api {
  from: @mobile
  to: @api
  type: @call
}

<edge> portal->api {
  from: @portal
  to: @api
  type: @call
}

<edge> api->db {
  from: @api
  to: @db
  type: @call
}

<edge> api->cache {
  from: @api
  to: @cache
  type: @call
}

<edge> cache->backup {
  from: @cache
  to: @backup
  type: @call
}

<edge> db->audit {
  from: @db
  to: @audit
  type: @call
}

<label> people-label {
  on: @people
  text: "People"
}

<label> apps-label {
  on: @apps
  text: "Apps"
}

<label> core-label {
  on: @core
  text: "Core"
}

<label> data-label {
  on: @data
  text: "Data"
}

<label> ext-label {
  on: @ext
  text: "External"
}

<label> app-label {
  on: @app
  text: "Booking app"
  sublabel: "software system"
}
`) as Diagram;

  // Edges run into the group's one layer from both sides.
  const oneLayer = readDiagram(`<diagram> {
  format: 1
  title: "One row"
  density: normal
}

<layer> top {
}

<layer> row {
}

<group> svc {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @top
    @row
}

<order> top-order {
  of: @top
  axis: across
  items:
    @user
}

<order> row-order {
  of: @row
  axis: across
  items:
    @gw
    @api
    @db
    @pay
}

<node> user {
  type: @actor
  text: "User"
  layer: @top
}

<node> gw {
  type: @service
  text: "Gateway"
  layer: @row
}

<node> api {
  type: @service
  text: "Orders API"
  layer: @row
  group: @svc
}

<node> db {
  type: @store
  text: "Orders DB"
  layer: @row
  group: @svc
}

<node> pay {
  type: @service
  text: "Payments"
  layer: @row
}

<edge> user->gw {
  from: @user
  to: @gw
  type: @call
}

<edge> gw->api {
  from: @gw
  to: @api
  type: @call
}

<edge> api->db {
  from: @api
  to: @db
  type: @call
}

<edge> db->pay {
  from: @db
  to: @pay
  type: @call
}

<label> top-label {
  on: @top
  text: "Top"
}

<label> row-label {
  on: @row
  text: "Row"
}

<label> svc-label {
  on: @svc
  text: "Orders service"
}

<label> gw->api-label {
  on: @gw->api
  text: "routes"
}
`) as Diagram;

  for (const at of NAMES) {
    it(`sits exactly at ${at}`, () => {
      const d = ok(below, [{ op: "group.label-at", id: "app", ...P[at] }]);
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
      // Without a head, the frame's top is a padding away from the first layer.
      if (!at.startsWith("top")) expect(web.y - r.y).toBe(24);
    });
  }

  it("moves no edge and no node for its place: only its own room is added", () => {
    for (const [d0, id] of [
      [booking, "app"],
      [below, "app"],
      [oneLayer, "svc"],
    ] as const) {
      const at = (place: string) => layout(ok(d0, [{ op: "group.label-at", id, ...P[place] }]), m);
      const across = (place: string) => {
        const s = at(place);
        return {
          edges: s.edges.map((e) => e.points.map((p) => p.x)),
          nodes: s.nodes.map((n) => n.rect.x),
          group: s.groups?.map((g) => [g.rect.x, g.rect.w]),
        };
      };
      const first = across("top-left");
      for (const place of NAMES.filter((x) => !["left", "right"].includes(x))) {
        if (place.startsWith("outside-l") || place.startsWith("outside-r")) {
          const w = (s: ReturnType<typeof at>) => s.groups?.find((g) => g.id === id)?.rect.w;
          expect(w(at(place)), place).toBe(w(at("top-left")));
        } else {
          expect(across(place), place).toEqual(first);
        }
      }
    }
  });

  it("refuses a place an edge crosses, and names the places clear of every edge", () => {
    for (const [d0, id, at, edge] of [
      [booking, "app", "top", "traveller->mobile"],
      [booking, "app", "top-left", "traveller->web"],
      [below, "app", "bottom-right", "db->audit"],
      [oneLayer, "svc", "left", "gw->api"],
      [oneLayer, "svc", "outside-right", "db->pay"],
    ] as const) {
      const d = ok(d0, [{ op: "group.label-at", id, ...P[at] }]);
      const found = check(d, layout(d, m), m).filter((x) => x.owner === "agent");
      expect(
        found.map((x) => [x.code, x.elements, x.facts.place]),
        at,
      ).toEqual([["title-blocked", [id, edge], words(at)]]);
      const clear = found[0]?.facts.clear ?? [];
      expect(clear.length, at).toBeGreaterThan(0);
      for (const place of NAMES) {
        const e = ok(d0, [{ op: "group.label-at", id, ...P[place] }]);
        const blocked = check(e, layout(e, m), m).some((x) => x.code === "title-blocked");
        expect(blocked, place).toBe(!clear.includes(words(place)));
      }
    }
  });

  it("is clear where no edge comes near it, with no engine defect", () => {
    for (const [d0, id, at] of [
      [booking, "app", "bottom"],
      [below, "app", "bottom-left"],
      [below, "app", "left"],
      [below, "app", "outside-right"],
      [oneLayer, "svc", "top"],
      [oneLayer, "svc", "outside-bottom"],
    ] as const) {
      const d = ok(d0, [{ op: "group.label-at", id, ...P[at] }]);
      expect(check(d, layout(d, m), m), at).toEqual([]);
    }
  });

  it("outside a side, leaves no empty space past the other side", () => {
    for (const at of ["outside-left", "outside-right"]) {
      const s = layout(ok(below, [{ op: "group.label-at", id: "app", ...P[at] }]), m);
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

  it("sits at a fraction of its side, its own point meeting the side's", () => {
    const place = (at: number, side: GroupTitle["side"]) =>
      layout(
        ok(below, [{ op: "group.label-at", id: "app", at, side, place: "inside" }]),
        m,
      ).groups?.find((g) => g.id === "app");
    const first = place(0, "top");
    const third = place(0.25, "top");
    const last = place(1, "top");
    const [a, b, c] = [first, third, last].map((g) => g?.label.bbox.x ?? 0);
    expect(b).toBeCloseTo((a as number) + ((c as number) - (a as number)) / 4, 1);
    const high = place(0.1, "left")?.label.bbox.y ?? 0;
    const low = place(0.9, "left")?.label.bbox.y ?? 0;
    expect(high).toBeLessThan(low);
  });

  it("is refused past the ends of its side", () => {
    const ops = parseOps([{ op: "group.label-at", id: "app", at: 1.5 }]);
    expect(ops).toMatchObject([{ field: "at" }]);
  });

  it("leaves a picture without one as it was", () => {
    const d = ok(booking, [{ op: "group.label-at", id: "app", ...P.top }]);
    const back = ok(d, [{ op: "group.label-at", id: "app" }]);
    expect(layout(back, m)).toEqual(layout(booking, m));
  });
});
