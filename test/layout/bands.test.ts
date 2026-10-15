// Lines that end at a row: the row is drawn as a band across the content, so a line
// meets it straight past its other end, wherever that is clear.

import { beforeAll, describe, expect, it } from "vitest";
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
