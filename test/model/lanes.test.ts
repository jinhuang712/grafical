import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { showDiagram } from "../../src/cli/show.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import { readDiagram, writeDiagram } from "../../src/model/io.ts";
import type { Rect, Scene } from "../../src/scene.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function ok(d: Diagram | null, ops: Op[]): { diagram: Diagram; changed: string[] } {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}

const inside = (a: Rect, b: Rect) =>
  a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rect = (s: Scene, id: string) => s.nodes.find((n) => n.id === id)?.rect as Rect;
const lane = (s: Scene, id: string) => s.lanes?.find((x) => x.id === id);

/** Four rows: web, gateway, two services, two stores. */
const base: Op[] = [
  { op: "diagram.new", title: "Shop" },
  { op: "layer.add", id: "clients", label: "Clients" },
  { op: "layer.add", id: "edge", label: "Edge" },
  { op: "layer.add", id: "services", label: "Services" },
  { op: "layer.add", id: "data", label: "Data" },
  { op: "node.add", id: "web", layer: "clients", label: "web shop", kind: "actor", last: true },
  { op: "node.add", id: "gateway", layer: "edge", label: "gateway", last: true },
  { op: "node.add", id: "orders", layer: "services", label: "orders-api", last: true },
  { op: "node.add", id: "payments", layer: "services", label: "payments-api", last: true },
  { op: "node.add", id: "ordersdb", layer: "data", label: "orders db", kind: "store", last: true },
  { op: "node.add", id: "ledger", layer: "data", label: "ledger", kind: "store", last: true },
  { op: "edge.add", from: "web", to: "gateway" },
  { op: "edge.add", from: "gateway", to: "orders" },
  { op: "edge.add", from: "orders", to: "payments", label: "charge" },
  { op: "edge.add", from: "orders", to: "ordersdb", kind: "data" },
  { op: "edge.add", from: "payments", to: "ledger", kind: "data" },
];
let shop: Diagram;
beforeAll(() => {
  shop = ok(null, base).diagram;
});

describe('lanes in the model (DESIGN.md, "Swimlanes run one way")', () => {
  it("runs as rows when layers join, and the file keeps it", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.add", id: "customer", label: "Customer", members: ["clients"] },
      { op: "lane.add", id: "platform", label: "Platform team", members: ["edge", "services"] },
    ]);
    expect(d.layers.map((l) => l.lane)).toEqual(["customer", "platform", "platform", undefined]);
    const back = readDiagram(writeDiagram(d));
    expect(back).toEqual(d);
    expect(showDiagram(d)).toContain('lane platform "Platform team" (rows): edge, services');
  });

  it("runs as columns when nodes join, and keeps each row in lane order", () => {
    const { diagram: d, changed } = ok(shop, [
      { op: "lane.add", id: "pay", label: "Payments team", members: ["payments", "ledger"] },
      { op: "lane.add", id: "ord", label: "Orders team", members: ["orders", "ordersdb"] },
    ]);
    // Lanes go left to right in list order: payments now comes first in its rows.
    expect(d.layers[2]?.nodes.map((n) => n.id)).toEqual(["payments", "orders"]);
    expect(d.layers[3]?.nodes.map((n) => n.id)).toEqual(["ledger", "ordersdb"]);
    expect(changed).toEqual(expect.arrayContaining(["payments", "ledger"]));
    expect(showDiagram(d)).toContain('lane pay "Payments team" (columns): payments, ledger');
  });

  it("refuses lanes that run both ways", () => {
    const { diagram: rows } = ok(shop, [
      { op: "lane.add", id: "platform", label: "Platform", members: ["edge"] },
    ]);
    const e1 = fail(rows, [{ op: "lane.join", lane: "platform", members: ["orders"] }]);
    // The node's row is what the lane could take instead.
    expect(e1[0]).toMatchObject({ code: "lane-mixed", facts: { is: "node", row: "services" } });
    const { diagram: cols } = ok(shop, [
      { op: "lane.add", id: "ord", label: "Orders", members: ["orders"] },
    ]);
    const e2 = fail(cols, [{ op: "lane.join", lane: "ord", members: ["data"] }]);
    expect(e2[0]).toMatchObject({ code: "lane-mixed" });
  });

  it("refuses a row lane with a gap, and joins a layer added inside one", () => {
    const gap = fail(shop, [
      { op: "lane.add", id: "platform", label: "Platform", members: ["edge", "data"] },
    ]);
    expect(gap[0]).toMatchObject({ code: "lane-gap", facts: { row: "services" } });
    const { diagram: d } = ok(shop, [
      { op: "lane.add", id: "platform", label: "Platform", members: ["edge", "services"] },
      { op: "layer.add", id: "mesh", label: "Mesh", after: "edge" },
      { op: "node.add", id: "sidecar", layer: "mesh", label: "sidecar" },
    ]);
    expect(d.layers.find((l) => l.id === "mesh")?.lane).toBe("platform");
  });

  it("keeps a group inside one lane, and a group joins with all its members", () => {
    const grouped = ok(shop, [
      { op: "group.add", id: "core", label: "core", nodes: ["orders", "payments"] },
    ]).diagram;
    const split = fail(grouped, [
      { op: "lane.add", id: "a", label: "A", members: ["orders"] },
      { op: "lane.add", id: "b", label: "B", members: ["payments"] },
    ]);
    // It names the group's first box in another lane than its first box's, and that lane.
    expect(split.find((e) => e.code === "group-across-lanes")?.facts).toEqual({
      node: "payments",
      lane: "b",
      lanes: ["a", "b"],
    });
    const { diagram: d } = ok(grouped, [
      { op: "lane.add", id: "a", label: "A", members: ["core"] },
    ]);
    const lanes = d.layers.flatMap((l) => l.nodes).filter((n) => n.lane === "a");
    expect(lanes.map((n) => n.id)).toEqual(["orders", "payments"]);
  });

  it("names unknown lanes and members, and lane ids clash with every other id", () => {
    const e1 = fail(shop, [{ op: "lane.join", lane: "plaform", members: ["edge"] }]);
    expect(e1[0]).toMatchObject({ code: "unknown-lane", field: "lane" });
    const e2 = fail(shop, [{ op: "lane.add", id: "x", label: "X", members: ["gatway"] }]);
    expect(e2[0]).toMatchObject({ code: "unknown-node", field: "members" });
    expect(e2[0]?.facts?.near).toContain("gateway");
    const e3 = fail(shop, [{ op: "lane.add", id: "orders", label: "X" }]);
    expect(e3[0]).toMatchObject({ code: "duplicate-id" });
  });

  it("removes a lane with the edges that end at it, and its members stay", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.add", id: "pay", label: "Payments", members: ["payments", "ledger"] },
      { op: "edge.add", from: "gateway", to: "pay", label: "refunds" },
    ]);
    const { diagram: after, changed } = ok(d, [{ op: "lane.remove", id: "pay" }]);
    expect(after.lanes).toBeUndefined();
    expect(after.edges.some((e) => e.to === "pay")).toBe(false);
    expect(after.layers.flatMap((l) => l.nodes).some((n) => n.lane !== undefined)).toBe(false);
    expect(changed).toEqual(expect.arrayContaining(["pay", "gateway->pay", "payments", "ledger"]));
  });

  it("refuses an edge from a lane to its own member, between two lanes, and across a column lane", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.add", id: "pay", label: "Payments", members: ["payments", "ledger"] },
      { op: "lane.add", id: "ord", label: "Orders", members: ["orders", "ordersdb"] },
    ]);
    expect(fail(d, [{ op: "edge.add", from: "payments", to: "pay" }])[0]?.code).toBe("edge-inside");
    expect(fail(d, [{ op: "edge.add", from: "ord", to: "pay" }])[0]?.code).toBe("lane-to-lane");
    expect(fail(d, [{ op: "edge.add", from: "clients", to: "pay" }])[0]?.code).toBe("edge-inside");
  });
});

describe('lanes in the picture (DESIGN.md, "Swimlanes run one way")', () => {
  it("draws row lanes as bands with a header on the left, around their rows only", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.add", id: "customer", label: "Customer", members: ["clients"] },
      { op: "lane.add", id: "platform", label: "Platform team", members: ["edge", "services"] },
    ]);
    const s = layout(d, m);
    expect(check(d, s, m)).toEqual([]);
    const customer = lane(s, "customer");
    const platform = lane(s, "platform");
    expect(customer?.run).toBe("rows");
    expect(inside(rect(s, "web"), customer?.rect as Rect)).toBe(true);
    for (const id of ["gateway", "orders", "payments"]) {
      expect(inside(rect(s, id), platform?.rect as Rect)).toBe(true);
    }
    // The data row lies in no lane.
    expect(overlaps(rect(s, "ledger"), platform?.rect as Rect)).toBe(false);
    // The two lanes meet at one border, and the header is left of every node.
    const c = customer?.rect as Rect;
    expect(c.y + c.h).toBe(platform?.rect.y);
    const head = customer?.head as Rect;
    for (const n of s.nodes) expect(head.x + head.w).toBeLessThan(n.rect.x);
  });

  it("draws column lanes side by side, in list order, with free nodes outside", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.add", id: "ord", label: "Orders team", members: ["orders", "ordersdb"] },
      { op: "lane.add", id: "pay", label: "Payments team", members: ["payments", "ledger"] },
    ]);
    const s = layout(d, m);
    expect(check(d, s, m)).toEqual([]);
    const ord = lane(s, "ord")?.rect as Rect;
    const pay = lane(s, "pay")?.rect as Rect;
    expect(lane(s, "ord")?.run).toBe("columns");
    expect(ord.x + ord.w).toBe(pay.x);
    expect(inside(rect(s, "orders"), ord) && inside(rect(s, "ordersdb"), ord)).toBe(true);
    expect(inside(rect(s, "payments"), pay) && inside(rect(s, "ledger"), pay)).toBe(true);
    for (const id of ["web", "gateway"]) {
      expect(overlaps(rect(s, id), ord) || overlaps(rect(s, id), pay)).toBe(false);
    }
    // A header on top of each lane, above every node.
    for (const n of s.nodes) expect(lane(s, "ord")?.head.y).toBeLessThan(n.rect.y);
  });

  it("ends an edge to a lane at the lane's border", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.add", id: "platform", label: "Platform team", members: ["services", "data"] },
      { op: "edge.remove", id: "gateway->orders" },
      { op: "edge.add", from: "gateway", to: "platform", label: "routes" },
    ]);
    const s = layout(d, m);
    expect(check(d, s, m)).toEqual([]);
    const e = s.edges.find((x) => x.id === "gateway->platform");
    const tip = e?.points[e.points.length - 1];
    expect(tip?.y).toBe(lane(s, "platform")?.rect.y);
    expect(e?.label).toBeDefined();
  });

  it("draws a diagram without lanes exactly as before", () => {
    const s = layout(shop, m);
    expect(s.lanes).toBeUndefined();
  });
});
