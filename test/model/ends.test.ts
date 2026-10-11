import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function ok(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops, m);
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

describe("edge ends at a container (D28)", () => {
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
    expect(unknown[0]?.suggestion).toContain("catalog-api");
  });

  it("refuses a side meeting with a node between", () => {
    // retry sits left of line_topics in the topics row, both in catalog-sync; an
    // outsider placed first in that row has retry and line_topics between it and catalog-api.
    const d = ok(catalogSyncGrouped, [
      { op: "node.add", id: "probe", layer: "topics", label: "probe", first: true },
    ]);
    const e = fail(d, [{ op: "edge.add", from: "probe", to: "catalog-api" }]);
    expect(e[0]?.code).toBe("edge-blocked");
  });

  it("removing a group removes the edges that end at it", () => {
    const d = ok(catalogSyncGrouped, toGroup);
    const r = applyOps(d, [{ op: "group.remove", id: "catalog-api" }], m);
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
    expect(band?.label.runs.map((r) => r.text).join("")).toBe("Stores and dependencies");
    const layerEdge = scene.edges.find((e) => e.id === "pipelines->deps");
    expect(layerEdge?.points[layerEdge.points.length - 1]?.y).toBe(band?.rect.y);
    expect(check(d, scene, m)).toEqual([]);
  });
});
