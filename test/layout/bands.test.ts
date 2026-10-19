// Lines that end at a row: the row is drawn as a band across the content, so a line
// meets it straight past its other end, wherever that is clear.

import { beforeAll, describe, expect, it } from "vitest";
import { drawing } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, readDiagram, writeDiagram } from "../../src/model/index.ts";
import type { Point } from "../../src/scene.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const node = (id: string, kind = "service") => `{id: ${id}, label: ${id}, kind: ${kind}}`;

function bends(points: Point[]): number {
  let n = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    const c = points[i + 1] as Point;
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) !== 0) n++;
  }
  return n;
}

describe("lines that end at a band", () => {
  // Found on 2026-10-16, drawing the owner's dispatch diagram with the gateway as a band:
  // the rider app's line turned toward the gateway's box inside the band before it met
  // the band, and the band's line to the payments API left from the socket's box.
  it("meet the band straight past the other end", () => {
    const d = readDiagram(`grafical: 1
title: band
density: normal
layers:
  - {id: apps, label: Apps, nodes: [${node("rider", "actor")}, ${node("ops", "actor")}, ${node("driver", "actor")}]}
  - {id: gateway, label: Gateway, nodes: [${node("socket")}]}
  - {id: core, label: Core, nodes: [${node("booking")}, ${node("matcher")}, ${node("payments")}]}
edges:
  - {id: rider->gateway, from: rider, to: gateway}
  - {id: driver->socket, from: driver, to: socket}
  - {id: gateway->booking, from: gateway, to: booking}
  - {id: gateway->payments, from: gateway, to: payments}
  - {id: matcher->socket, from: matcher, to: socket}
`) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    for (const id of ["rider->gateway", "gateway->booking", "gateway->payments"]) {
      const e = s.edges.find((x) => x.id === id);
      if (e === undefined) throw new Error(id);
      expect(bends(e.points), id).toBe(0);
    }
  });
});

describe('a row with no box as one bar (DESIGN.md, "A row with no box as one bar")', () => {
  const bar = (look = "") =>
    readDiagram(`grafical: 1
title: bar
density: normal
layers:
  - {id: apps, label: Apps, nodes: [${node("rider", "actor")}, ${node("driver", "actor")}]}
  - {id: gateway, label: API gateway${look}, nodes: []}
  - {id: core, label: Core, nodes: [${node("booking")}, ${node("matcher")}, ${node("payments")}]}
edges:
  - {id: rider->gateway, from: rider, to: gateway}
  - {id: driver->gateway, from: driver, to: gateway}
  - {id: gateway->booking, from: gateway, to: booking}
  - {id: gateway->payments, from: gateway, to: payments}
  - {id: driver->matcher, from: driver, to: matcher, pass: true}
`) as Diagram;

  it("draws one bar 40 px high across the content, in a box's look, its label in it", () => {
    const s = layout(bar(), m);
    const b = s.bands?.find((x) => x.id === "gateway");
    if (b === undefined) throw new Error("no bar");
    expect(b).toMatchObject({ bar: true, box: true });
    expect(b.rect.h).toBe(40);
    for (const n of s.nodes) {
      expect(b.rect.x).toBeLessThan(n.rect.x);
      expect(b.rect.x + b.rect.w).toBeGreaterThan(n.rect.x + n.rect.w);
    }
    const t = b.label?.bbox;
    if (t === undefined) throw new Error("no label");
    expect(t.y).toBeGreaterThan(b.rect.y);
    expect(t.y + t.h).toBeLessThan(b.rect.y + b.rect.h);
    expect(layout(bar(", look: band"), m).bands?.[0]?.box).toBeUndefined();
  });

  it("meets each line straight past its other end, at the bar's top or bottom", () => {
    const d = bar();
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    const r = s.bands?.[0]?.rect;
    if (r === undefined) throw new Error("no bar");
    for (const [id, y] of [
      ["rider->gateway", r.y],
      ["driver->gateway", r.y],
      ["gateway->booking", r.y + r.h],
      ["gateway->payments", r.y + r.h],
    ] as const) {
      const e = s.edges.find((x) => x.id === id);
      if (e === undefined) throw new Error(id);
      expect(bends(e.points), id).toBe(0);
      const end = id.startsWith("gateway") ? e.points[0] : e.points[e.points.length - 1];
      expect(end?.y, id).toBe(y);
    }
  });

  it("names the bar among the rows a line that may pass it passes", () => {
    const d = bar();
    const line = drawing(d, layout(d, m)).lines.find((l) => l.id === "driver->matcher");
    expect(line?.passes).toEqual(["gateway"]);
  });

  // Found on 2026-10-19, redrawing a microservices diagram: the bar's name took the first stretch no line
  // ended at, and the line that passed the bar there went round the name with four bends.
  it("seats its label clear of the lines that pass it, which run straight", () => {
    const d = readDiagram(`grafical: 1
title: bus
density: normal
layers:
  - {id: services, nodes: [${node("orders")}, ${node("billing")}, ${node("shipping")}]}
  - {id: bus, label: Message-oriented middleware, nodes: []}
  - id: stores
    nodes:
      - {id: orders-db, label: orders-db, kind: store, align: orders}
      - {id: shipping-db, label: shipping-db, kind: store, align: shipping}
edges:
  - {id: billing->bus, from: billing, to: bus}
  - {id: orders->orders-db, from: orders, to: orders-db, pass: true}
  - {id: shipping->shipping-db, from: shipping, to: shipping-db, pass: true}
`) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    const b = s.bands?.find((x) => x.id === "bus");
    const t = b?.label?.bbox;
    if (b === undefined || t === undefined) throw new Error("no label");
    for (const e of s.edges) {
      if (e.id !== "billing->bus") expect(bends(e.points), e.id).toBe(0);
      // Every line that meets or crosses the bar keeps 16 px from its label.
      for (let i = 1; i < e.points.length; i++) {
        const p = e.points[i - 1] as Point;
        const q = e.points[i] as Point;
        if (Math.max(p.y, q.y) < b.rect.y || Math.min(p.y, q.y) > b.rect.y + b.rect.h) continue;
        const near = Math.max(t.x - Math.max(p.x, q.x), Math.min(p.x, q.x) - (t.x + t.w));
        expect(near, e.id).toBeGreaterThanOrEqual(16);
      }
    }
  });
});

describe('a row with a look (DESIGN.md, "A row with a look is drawn")', () => {
  const rows = (core = "", bus = "") =>
    readDiagram(`grafical: 1
title: looks
density: normal
layers:
  - {id: apps, label: Apps, nodes: [${node("rider", "actor")}, ${node("driver", "actor")}]}
  - {id: core, label: Core services${core}, nodes: [${node("booking")}, ${node("payments")}]}
  - {id: bus, label: Event bus${bus}, nodes: []}
  - {id: stores, label: Stores, nodes: [${node("trips", "store")}]}
edges:
  - {id: rider->booking, from: rider, to: booking}
  - {id: driver->payments, from: driver, to: payments}
  - {id: booking->trips, from: booking, to: trips, pass: true}
`) as Diagram;

  it("is drawn though no line ends at it, with its label; a row with none is not", () => {
    expect(layout(rows(), m).bands).toBeUndefined();
    const d = rows(", look: band", ", look: box");
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    expect(s.bands?.map((b) => b.id)).toEqual(["core", "bus"]);
    const [core, bus] = s.bands ?? [];
    if (core === undefined || bus === undefined) throw new Error("no band");
    // The band: around its boxes, its label in its head above them.
    expect(core).not.toHaveProperty("bar");
    expect(core).not.toHaveProperty("box");
    expect(core.label?.runs.map((r) => r.text).join("")).toBe("Core services");
    for (const id of ["booking", "payments"]) {
      const r = s.nodes.find((x) => x.id === id)?.rect;
      if (r === undefined) throw new Error(id);
      expect(core.rect.y).toBeLessThan(core.label?.bbox.y ?? 0);
      expect((core.label?.bbox.y ?? 0) + (core.label?.bbox.h ?? 0)).toBeLessThan(r.y);
      expect(r.y + r.h).toBeLessThan(core.rect.y + core.rect.h);
    }
    // The bar: one bar in a box's look, its label in it, passed by the line that may.
    expect(bus).toMatchObject({ bar: true, box: true });
    expect(bus.rect.h).toBe(40);
    expect(bus.label?.runs.map((r) => r.text).join("")).toBe("Event bus");
    const line = drawing(d, s).lines.find((l) => l.id === "booking->trips");
    expect(line?.passes).toEqual(["bus"]);
  });

  it("draws no name for a drawn row without a label, and the file keeps it so", () => {
    const d0 = rows(", look: band", ", look: box");
    const r = applyOps(d0, [
      { op: "layer.add", id: "spare", after: "bus" },
      { op: "layer.look", id: "spare", look: "band" },
      { op: "node.add", id: "cache", layer: "spare", label: "cache", first: true },
    ]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    const d = r.diagram;
    expect(d.layers.find((l) => l.id === "spare")).not.toHaveProperty("label");
    expect(readDiagram(writeDiagram(d))).toEqual(d);
    const s = layout(d, m);
    expect(check(d, s, m).filter((x) => x.owner === "engine")).toEqual([]);
    const spare = s.bands?.find((b) => b.id === "spare");
    expect(spare).toBeDefined();
    expect(spare).not.toHaveProperty("label");
    // The row with a name still shows it.
    expect(s.bands?.find((b) => b.id === "core")?.label).toBeDefined();
    // A bar without a label is drawn as a bar, with no name in it.
    const bare = readDiagram(
      writeDiagram(d).replace("  - id: bus\n    label: Event bus\n", "  - id: bus\n"),
    ) as Diagram;
    const bs = layout(bare, m);
    const bus = bs.bands?.find((b) => b.id === "bus");
    expect(bus).toMatchObject({ bar: true, box: true });
    expect(bus).not.toHaveProperty("label");
    expect(check(bare, bs, m).filter((x) => x.owner === "engine")).toEqual([]);
  });
});
