// Lines that end at a row: the row is drawn as a band across the content, so a line
// meets it straight past its other end, wherever that is clear.

import { beforeAll, describe, expect, it } from "vitest";
import { drawing } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
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
    const t = b.label.bbox;
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
    expect(core.label.runs.map((r) => r.text).join("")).toBe("Core services");
    for (const id of ["booking", "payments"]) {
      const r = s.nodes.find((x) => x.id === id)?.rect;
      if (r === undefined) throw new Error(id);
      expect(core.rect.y).toBeLessThan(core.label.bbox.y);
      expect(core.label.bbox.y + core.label.bbox.h).toBeLessThan(r.y);
      expect(r.y + r.h).toBeLessThan(core.rect.y + core.rect.h);
    }
    // The bar: one bar in a box's look, its label in it, passed by the line that may.
    expect(bus).toMatchObject({ bar: true, box: true });
    expect(bus.rect.h).toBe(40);
    expect(bus.label.runs.map((r) => r.text).join("")).toBe("Event bus");
    const line = drawing(d, s).lines.find((l) => l.id === "booking->trips");
    expect(line?.passes).toEqual(["bus"]);
  });
});
