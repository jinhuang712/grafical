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

/** Four layers: web, gateway, two services, two stores. */
const base: Op[] = [
  { op: "diagram.set", title: "Shop" },
  { op: "layer.set", ids: ["clients"], label: "Clients" },
  { op: "layer.set", ids: ["edge"], label: "Edge" },
  { op: "layer.set", ids: ["services"], label: "Services" },
  { op: "layer.set", ids: ["data"], label: "Data" },
  { op: "node.set", ids: ["web"], layer: "clients", label: "web shop", type: "actor", last: true },
  { op: "node.set", ids: ["gateway"], layer: "edge", label: "gateway", last: true },
  { op: "node.set", ids: ["orders"], layer: "services", label: "orders-api", last: true },
  { op: "node.set", ids: ["payments"], layer: "services", label: "payments-api", last: true },
  {
    op: "node.set",
    ids: ["ordersdb"],
    layer: "data",
    label: "orders db",
    type: "store",
    last: true,
  },
  { op: "node.set", ids: ["ledger"], layer: "data", label: "ledger", type: "store", last: true },
  { op: "edge.set", ids: ["web-gateway"], from: "web", to: "gateway" },
  { op: "edge.set", ids: ["gateway-orders"], from: "gateway", to: "orders" },
  { op: "edge.set", ids: ["orders-payments"], from: "orders", to: "payments", label: "charge" },
  { op: "edge.set", ids: ["orders-ordersdb"], from: "orders", to: "ordersdb", type: "data" },
  { op: "edge.set", ids: ["payments-ledger"], from: "payments", to: "ledger", type: "data" },
];
let shop: Diagram;
beforeAll(() => {
  shop = ok(null, base).diagram;
});

describe('lanes in the model (specs/decisions, "Lanes run one way")', () => {
  it("runs as layers when layers join, and the file keeps it", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.set", ids: ["customer"], label: "Customer" },
      { op: "layer.set", ids: ["clients"], lane: "customer" },
      { op: "lane.set", ids: ["platform"], label: "Platform team" },
      { op: "layer.set", ids: ["edge", "services"], lane: "platform" },
    ]);
    expect(d.layers.map((l) => l.lane)).toEqual(["customer", "platform", "platform", undefined]);
    const back = readDiagram(writeDiagram(d));
    expect(back).toEqual(d);
    expect(showDiagram(d)).toContain('lane platform "Platform team" (layers): edge, services');
  });

  it("runs as columns when nodes join, and keeps each layer in lane order", () => {
    const { diagram: d, changed } = ok(shop, [
      { op: "lane.set", ids: ["pay"], label: "Payments team" },
      { op: "node.set", ids: ["payments", "ledger"], lane: "pay" },
      { op: "lane.set", ids: ["ord"], label: "Orders team" },
      { op: "node.set", ids: ["orders", "ordersdb"], lane: "ord" },
    ]);
    // Lanes go left to right in list order: payments now comes first in its layers.
    expect(d.layers[2]?.nodes.map((n) => n.id)).toEqual(["payments", "orders"]);
    expect(d.layers[3]?.nodes.map((n) => n.id)).toEqual(["ledger", "ordersdb"]);
    expect(changed).toEqual(expect.arrayContaining(["payments", "ledger"]));
    expect(showDiagram(d)).toContain('lane pay "Payments team" (columns): payments, ledger');
  });

  it("refuses lanes that run both ways", () => {
    const { diagram: byLayers } = ok(shop, [
      { op: "lane.set", ids: ["platform"], label: "Platform" },
      { op: "layer.set", ids: ["edge"], lane: "platform" },
    ]);
    const e1 = fail(byLayers, [{ op: "node.set", ids: ["orders"], lane: "platform" }]);
    // The node's layer is what the lane could take instead.
    expect(e1[0]).toMatchObject({ code: "lane-mixed", facts: { is: "node", layer: "services" } });
    const { diagram: cols } = ok(shop, [
      { op: "lane.set", ids: ["ord"], label: "Orders" },
      { op: "node.set", ids: ["orders"], lane: "ord" },
    ]);
    const e2 = fail(cols, [{ op: "layer.set", ids: ["data"], lane: "ord" }]);
    expect(e2[0]).toMatchObject({ code: "lane-mixed" });
  });

  it("refuses a layer lane with a gap, and joins a layer added inside one", () => {
    const gap = fail(shop, [
      { op: "lane.set", ids: ["platform"], label: "Platform" },
      { op: "layer.set", ids: ["edge", "data"], lane: "platform" },
    ]);
    expect(gap[0]).toMatchObject({ code: "lane-gap", facts: { layer: "services" } });
    const { diagram: d } = ok(shop, [
      { op: "lane.set", ids: ["platform"], label: "Platform" },
      { op: "layer.set", ids: ["edge", "services"], lane: "platform" },
      { op: "layer.set", ids: ["mesh"], label: "Mesh", after: "edge" },
      { op: "node.set", ids: ["sidecar"], layer: "mesh", label: "sidecar" },
    ]);
    expect(d.layers.find((l) => l.id === "mesh")?.lane).toBe("platform");
  });

  it("keeps a group inside one lane, and its members join together", () => {
    const grouped = ok(shop, [
      { op: "group.set", ids: ["core"], label: "core" },
      { op: "node.set", ids: ["orders", "payments"], group: "core" },
    ]).diagram;
    const split = fail(grouped, [
      { op: "lane.set", ids: ["a"], label: "A" },
      { op: "node.set", ids: ["orders"], lane: "a" },
    ]);
    // It names the group's first node in another lane than its first node's, and that lane: here none yet.
    expect(split.find((e) => e.code === "group-across-lanes")?.facts).toEqual({
      node: "payments",
      lane: "none",
      lanes: ["a", "none"],
    });
    const { diagram: d } = ok(grouped, [
      { op: "lane.set", ids: ["a"], label: "A" },
      { op: "node.set", ids: ["orders", "payments"], lane: "a" },
    ]);
    const lanes = d.layers.flatMap((l) => l.nodes).filter((n) => n.lane === "a");
    expect(lanes.map((n) => n.id)).toEqual(["orders", "payments"]);
  });

  it("names unknown lanes and members, and lane ids clash with every other id", () => {
    const e1 = fail(shop, [{ op: "layer.set", ids: ["edge"], lane: "plaform" }]);
    expect(e1[0]).toMatchObject({ code: "unknown-lane", field: "lane" });
    // A node --set with an id no node has makes one, which needs a label.
    const e2 = fail(shop, [
      { op: "lane.set", ids: ["x"], label: "X" },
      { op: "node.set", ids: ["gatway"], lane: "x" },
    ]);
    expect(e2[0]).toMatchObject({ code: "missing-field", field: "label" });
    const e3 = fail(shop, [{ op: "lane.set", ids: ["orders"], label: "X" }]);
    expect(e3[0]).toMatchObject({ code: "duplicate-id" });
  });

  it("removes a lane with the edges that end at it, and its members stay", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.set", ids: ["pay"], label: "Payments" },
      { op: "node.set", ids: ["payments", "ledger"], lane: "pay" },
      { op: "edge.set", ids: ["gateway-pay"], from: "gateway", to: "pay", label: "refunds" },
    ]);
    const { diagram: after, changed } = ok(d, [{ op: "lane.remove", ids: ["pay"] }]);
    expect(after.lanes).toBeUndefined();
    expect(after.edges.some((e) => e.to === "pay")).toBe(false);
    expect(after.layers.flatMap((l) => l.nodes).some((n) => n.lane !== undefined)).toBe(false);
    expect(changed).toEqual(expect.arrayContaining(["pay", "gateway-pay", "payments", "ledger"]));
  });

  it("refuses an edge from a lane to its own member, between two lanes, and across a column lane", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.set", ids: ["pay"], label: "Payments" },
      { op: "node.set", ids: ["payments", "ledger"], lane: "pay" },
      { op: "lane.set", ids: ["ord"], label: "Orders" },
      { op: "node.set", ids: ["orders", "ordersdb"], lane: "ord" },
    ]);
    expect(
      fail(d, [{ op: "edge.set", ids: ["payments-pay"], from: "payments", to: "pay" }])[0]?.code,
    ).toBe("edge-inside");
    expect(fail(d, [{ op: "edge.set", ids: ["ord-pay"], from: "ord", to: "pay" }])[0]?.code).toBe(
      "lane-to-lane",
    );
    expect(
      fail(d, [{ op: "edge.set", ids: ["clients-pay"], from: "clients", to: "pay" }])[0]?.code,
    ).toBe("edge-inside");
  });
});

describe('lanes in the picture (specs/decisions, "Lanes run one way")', () => {
  it("draws layer lanes as bands with a header on the left, around their layers only", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.set", ids: ["customer"], label: "Customer" },
      { op: "layer.set", ids: ["clients"], lane: "customer" },
      { op: "lane.set", ids: ["platform"], label: "Platform team" },
      { op: "layer.set", ids: ["edge", "services"], lane: "platform" },
    ]);
    const s = layout(d, m);
    expect(check(d, s, m)).toEqual([]);
    const customer = lane(s, "customer");
    const platform = lane(s, "platform");
    expect(customer?.run).toBe("layers");
    expect(inside(rect(s, "web"), customer?.rect as Rect)).toBe(true);
    for (const id of ["gateway", "orders", "payments"]) {
      expect(inside(rect(s, id), platform?.rect as Rect)).toBe(true);
    }
    // The data layer lies in no lane.
    expect(overlaps(rect(s, "ledger"), platform?.rect as Rect)).toBe(false);
    // The two lanes meet at one border, and the header is left of every node.
    const c = customer?.rect as Rect;
    expect(c.y + c.h).toBe(platform?.rect.y);
    const head = customer?.head as Rect;
    for (const n of s.nodes) expect(head.x + head.w).toBeLessThan(n.rect.x);
  });

  it("draws column lanes side by side, in list order, with free nodes outside", () => {
    const { diagram: d } = ok(shop, [
      { op: "lane.set", ids: ["ord"], label: "Orders team" },
      { op: "node.set", ids: ["orders", "ordersdb"], lane: "ord" },
      { op: "lane.set", ids: ["pay"], label: "Payments team" },
      { op: "node.set", ids: ["payments", "ledger"], lane: "pay" },
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
      { op: "lane.set", ids: ["platform"], label: "Platform team" },
      { op: "layer.set", ids: ["services", "data"], lane: "platform" },
      { op: "edge.remove", ids: ["gateway-orders"] },
      {
        op: "edge.set",
        ids: ["gateway-platform"],
        from: "gateway",
        to: "platform",
        label: "routes",
      },
    ]);
    const s = layout(d, m);
    expect(check(d, s, m)).toEqual([]);
    const e = s.edges.find((x) => x.id === "gateway-platform");
    const tip = e?.points[e.points.length - 1];
    expect(tip?.y).toBe(lane(s, "platform")?.rect.y);
    expect(e?.label).toBeDefined();
  });

  it("draws a diagram without lanes exactly as before", () => {
    const s = layout(shop, m);
    expect(s.lanes).toBeUndefined();
  });
});
