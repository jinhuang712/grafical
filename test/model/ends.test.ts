import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";

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

const toGroup: Op[] = [
  { op: "edge.remove", id: "callers->handlers" },
  { op: "edge.add", from: "callers", to: "catalog-api" },
];
const toLayer: Op[] = [
  { op: "edge.remove", id: "pipelines->geo" },
  { op: "edge.remove", id: "pipelines->i18n" },
  { op: "edge.remove", id: "pipelines->postgres" },
  { op: "edge.add", from: "pipelines", to: "deps", label: "calls" },
];

describe('edge ends at a container (DESIGN.md, "Lines that end at containers")', () => {
  it("accepts a group or a layer as an end", () => {
    const d = ok(catalogSyncGrouped, [...toGroup, ...toLayer]);
    expect(d.edges.map((e) => e.id)).toContain("callers->catalog-api");
    expect(d.edges.map((e) => e.id)).toContain("pipelines->deps");
  });

  it("refuses an end inside the other, and an unknown one", () => {
    const inside = fail(catalogSyncGrouped, [
      { op: "edge.add", from: "handlers", to: "catalog-api" },
    ]);
    expect(inside[0]?.code).toBe("edge-inside");
    const across = fail(catalogSyncGrouped, [{ op: "edge.add", from: "catalog-sync", to: "work" }]);
    expect(across[0]?.code).toBe("edge-inside");
    const unknown = fail(catalogSyncGrouped, [
      { op: "edge.add", from: "callers", to: "catalog-apx" },
    ]);
    expect(unknown[0]).toMatchObject({ code: "unknown-node", field: "to" });
    expect(unknown[0]?.facts?.near).toContain("catalog-api");
  });

  it("refuses a side meeting with a node between", () => {
    // retry sits left of line_topics in the topics row, both in catalog-sync; an
    // outsider placed first in that row has retry and line_topics between it and catalog-api.
    const d = ok(catalogSyncGrouped, [
      { op: "node.add", id: "probe", layer: "topics", label: "probe", first: true },
    ]);
    const e = fail(d, [{ op: "edge.add", from: "probe", to: "catalog-api" }]);
    expect(e[0]).toMatchObject({
      code: "edge-blocked",
      facts: { row: "topics", nodes: ["retry", "line_topics"] },
    });
  });

  it("removing a group removes the edges that end at it", () => {
    const d = ok(catalogSyncGrouped, toGroup);
    const r = applyOps(d, [{ op: "group.remove", id: "catalog-api" }]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.edges.some((e) => e.to === "catalog-api")).toBe(false);
    expect(r.changed).toContain("callers->catalog-api");
  });

  it("stops the line at the group's box, and draws an ended layer as a band", () => {
    const d = ok(catalogSyncGrouped, [...toGroup, ...toLayer]);
    const scene = layout(d, m);
    const box = scene.groups?.find((g) => g.id === "catalog-api")?.rect;
    const edge = scene.edges.find((e) => e.id === "callers->catalog-api");
    const tip = edge?.points[edge.points.length - 1];
    expect(edge?.to).toBe("catalog-api");
    expect(tip?.y).toBe(box?.y);
    const band = scene.bands?.find((b) => b.id === "deps");
    expect(band?.label?.runs.map((r) => r.text).join("")).toBe("Stores and dependencies");
    const layerEdge = scene.edges.find((e) => e.id === "pipelines->deps");
    expect(layerEdge?.points[layerEdge.points.length - 1]?.y).toBe(band?.rect.y);
    expect(check(d, scene, m)).toEqual([]);
  });
});

describe('a row with no box as one bar (DESIGN.md, "A row with no box as one bar")', () => {
  const base = readDiagram(`grafical: 1
title: bar
density: normal
layers:
  - {id: apps, label: Apps, nodes: [{id: rider, label: rider, kind: actor}, {id: driver, label: driver, kind: actor}]}
  - {id: gateway, label: API gateway, nodes: []}
  - {id: core, label: Core, nodes: [{id: booking, label: booking, kind: service, group: sys}, {id: payments, label: payments, kind: service}]}
  - {id: stores, label: Stores, nodes: [{id: trips, label: trips, kind: store, group: sys}]}
groups:
  - {id: sys, label: booking}
`) as Diagram;
  const into: Op[] = [
    { op: "edge.add", from: "rider", to: "gateway" },
    { op: "edge.add", from: "gateway", to: "booking" },
    { op: "edge.add", from: "gateway", to: "sys" },
  ];

  it("accepts a row with no box as an end when the other end holds one", () => {
    const d = ok(base, into);
    expect(d.edges.map((e) => e.id)).toEqual([
      "rider->gateway",
      "gateway->booking",
      "gateway->sys",
    ]);
  });

  it("refuses a line between two rows with no box", () => {
    const errors = fail(base, [
      { op: "layer.add", id: "bus", label: "Bus", after: "core" },
      { op: "edge.add", from: "gateway", to: "bus" },
    ]);
    expect(errors[0]).toMatchObject({ code: "bar-to-bar", found: "gateway->bus" });
  });

  it("refuses a bar between the first and last rows of a group", () => {
    const errors = fail(base, [
      { op: "layer.add", id: "mid", label: "Mid", after: "core" },
      { op: "edge.add", from: "rider", to: "mid" },
    ]);
    expect(errors[0]).toMatchObject({ code: "bar-in-group", facts: { group: "sys", row: "mid" } });
  });

  it("refuses a line that passes a bar unless it may", () => {
    const d = ok(base, into);
    const passing = fail(d, [{ op: "edge.add", from: "driver", to: "payments" }]);
    expect(passing[0]).toMatchObject({
      code: "bar-crossed",
      found: "driver->payments",
      facts: { row: "gateway" },
    });
    const allowed = ok(d, [{ op: "edge.add", from: "driver", to: "payments", pass: true }]);
    expect(allowed.edges.find((e) => e.id === "driver->payments")?.pass).toBe(true);
    const off = fail(allowed, [{ op: "edge.pass", id: "driver->payments", off: true }]);
    expect(off[0]?.code).toBe("bar-crossed");
    // The first line to a row makes it a bar: a line that already passes it must say it may.
    const first = fail(ok(base, [{ op: "edge.add", from: "driver", to: "payments" }]), into);
    expect(first[0]).toMatchObject({ code: "bar-crossed", found: "driver->payments" });
    const later = ok(base, [{ op: "edge.add", from: "driver", to: "payments" }]);
    expect(ok(later, [...into, { op: "edge.pass", id: "driver->payments" }]).edges).toHaveLength(4);
  });

  it("sets and clears a row's look, and keeps it in the file", () => {
    const d = ok(base, [...into, { op: "layer.look", id: "gateway", look: "band" }]);
    expect(d.layers[1]?.look).toBe("band");
    expect(writeDiagram(d)).toContain("look: band");
    expect(readDiagram(writeDiagram(d))).toEqual(d);
    expect(ok(d, [{ op: "layer.look", id: "gateway" }]).layers[1]?.look).toBeUndefined();
    expect(fail(d, [{ op: "layer.look", id: "gatewya", look: "box" }])[0]?.code).toBe(
      "unknown-layer",
    );
  });

  it("diffs a look and a line that may pass as the operations that made them", () => {
    const a = ok(base, [...into, { op: "edge.add", from: "driver", to: "payments", pass: true }]);
    const b = ok(a, [{ op: "layer.look", id: "gateway", look: "band" }]);
    for (const [x, y] of [
      [base, a],
      [a, b],
      [b, a],
    ] as const) {
      const r = applyOps(x, diffDiagrams(x, y));
      if ("errors" in r) throw new Error(JSON.stringify(r.errors));
      expect(writeDiagram(r.diagram)).toBe(writeDiagram(y));
    }
    expect(diffDiagrams(a, b)).toEqual([{ op: "layer.look", id: "gateway", look: "band" }]);
  });

  // DESIGN.md, "A row with a look is drawn".
  it("checks a row with no box and a look as a bar, though no line ends at it", () => {
    const passing = ok(base, [{ op: "edge.add", from: "driver", to: "payments" }]);
    const crossed = fail(passing, [{ op: "layer.look", id: "gateway", look: "box" }]);
    expect(crossed[0]).toMatchObject({
      code: "bar-crossed",
      found: "driver->payments",
      facts: { row: "gateway" },
    });
    const looked = ok(passing, [
      { op: "layer.look", id: "gateway", look: "box" },
      { op: "edge.pass", id: "driver->payments" },
    ]);
    expect(looked.layers[1]?.look).toBe("box");
    expect(fail(looked, [{ op: "edge.pass", id: "driver->payments", off: true }])[0]?.code).toBe(
      "bar-crossed",
    );
    // A row with boxes is a band, which lines pass as any row.
    expect(ok(passing, [{ op: "layer.look", id: "core", look: "band" }]).layers[2]?.look).toBe(
      "band",
    );
    const inGroup = fail(base, [
      { op: "layer.add", id: "mid", label: "Mid", after: "core" },
      { op: "layer.look", id: "mid", look: "band" },
    ]);
    expect(inGroup).toEqual([
      expect.objectContaining({
        code: "bar-in-group",
        field: "layers[3].look",
        found: "mid",
        facts: { group: "sys", row: "mid" },
      }),
    ]);
    // A box placed by steps above the first row adds a row the file does not hold.
    const above = fail(base, [
      { op: "node.add", id: "boss", label: "boss", from: "rider", up: 1 },
      { op: "layer.add", id: "mid", label: "Mid", after: "core" },
      { op: "layer.look", id: "mid", look: "band" },
    ]);
    expect(above[0]).toMatchObject({ code: "bar-in-group", field: "layers[3].look" });
  });

  it("diffs a look on a row no line ends at, with the lines that pass it", () => {
    const a = ok(base, [
      { op: "edge.add", from: "driver", to: "payments", pass: true },
      { op: "layer.look", id: "gateway", look: "band" },
    ]);
    for (const [x, y] of [
      [base, a],
      [a, base],
    ] as const) {
      const r = applyOps(x, diffDiagrams(x, y));
      if ("errors" in r) throw new Error(JSON.stringify(r.errors));
      expect(writeDiagram(r.diagram)).toBe(writeDiagram(y));
    }
  });
});
