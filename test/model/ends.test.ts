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
  { op: "edge.remove", ids: ["callers-handlers"] },
  { op: "edge.set", ids: ["callers-catalog-api"], from: "callers", to: "catalog-api" },
];
const toLayer: Op[] = [
  { op: "edge.remove", ids: ["pipelines-geo"] },
  { op: "edge.remove", ids: ["pipelines-i18n"] },
  { op: "edge.remove", ids: ["pipelines-postgres"] },
  { op: "edge.set", ids: ["pipelines-deps"], from: "pipelines", to: "deps", label: "calls" },
];

describe('edge ends at a container (specs/decisions, "Edges that end at containers")', () => {
  it("accepts a group or a layer as an end", () => {
    const d = ok(catalogSyncGrouped, [...toGroup, ...toLayer]);
    expect(d.edges.map((e) => e.id)).toContain("callers-catalog-api");
    expect(d.edges.map((e) => e.id)).toContain("pipelines-deps");
  });

  it("refuses an end inside the other, and an unknown one", () => {
    const inside = fail(catalogSyncGrouped, [
      { op: "edge.set", ids: ["handlers-catalog-api"], from: "handlers", to: "catalog-api" },
    ]);
    expect(inside[0]).toMatchObject({
      code: "edge-inside",
      facts: { ends: ["handlers", "catalog-api"] },
    });
    const across = fail(catalogSyncGrouped, [
      { op: "edge.set", ids: ["catalog-sync-work"], from: "catalog-sync", to: "work" },
    ]);
    expect(across[0]?.code).toBe("edge-inside");
    const unknown = fail(catalogSyncGrouped, [
      { op: "edge.set", ids: ["callers-catalog-apx"], from: "callers", to: "catalog-apx" },
    ]);
    expect(unknown[0]).toMatchObject({ code: "unknown-node", field: "to" });
    expect(unknown[0]?.facts?.near).toContain("catalog-api");
  });

  it("refuses a side meeting with a node between", () => {
    // retry sits left of line_topics in the topics layer, both in catalog-sync; an
    // outsider placed first in that layer has retry and line_topics between it and catalog-api.
    const d = ok(catalogSyncGrouped, [
      { op: "node.set", ids: ["probe"], layer: "topics", label: "probe", first: true },
    ]);
    const e = fail(d, [
      { op: "edge.set", ids: ["probe-catalog-api"], from: "probe", to: "catalog-api" },
    ]);
    expect(e[0]).toMatchObject({
      code: "edge-blocked",
      facts: { ends: ["probe", "catalog-api"], layer: "topics", nodes: ["retry", "line_topics"] },
    });
  });

  it("removing a group removes the edges that end at it", () => {
    const d = ok(catalogSyncGrouped, toGroup);
    const r = applyOps(d, [{ op: "group.remove", ids: ["catalog-api"] }]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.edges.some((e) => e.to === "catalog-api")).toBe(false);
    expect(r.changed).toContain("callers-catalog-api");
  });

  it("stops the edge at the group's node, and draws an ended layer as a band", () => {
    const d = ok(catalogSyncGrouped, [...toGroup, ...toLayer]);
    const scene = layout(d, m);
    const frame = scene.groups?.find((g) => g.id === "catalog-api")?.rect;
    const edge = scene.edges.find((e) => e.id === "callers-catalog-api");
    const tip = edge?.points[edge.points.length - 1];
    expect(edge?.to).toBe("catalog-api");
    expect(tip?.y).toBe(frame?.y);
    const band = scene.bands?.find((b) => b.id === "deps");
    expect(band?.label?.runs.map((r) => r.text).join("")).toBe("Stores and dependencies");
    const layerEdge = scene.edges.find((e) => e.id === "pipelines-deps");
    expect(layerEdge?.points[layerEdge.points.length - 1]?.y).toBe(band?.rect.y);
    expect(check(d, scene, m)).toEqual([]);
  });
});

describe('a layer with no node as one bar (specs/decisions, "A layer with no node as one bar")', () => {
  const base = readDiagram(`<diagram> {
  format: 1
  title: "bar"
}

<layer> apps {
}

<layer> gateway {
}

<layer> core {
}

<layer> stores {
}

<group> sys {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @apps
    @gateway
    @core
    @stores
}

<order> apps-order {
  of: @apps
  axis: across
  items:
    @rider
    @driver
}

<order> core-order {
  of: @core
  axis: across
  items:
    @booking
    @payments
}

<order> stores-order {
  of: @stores
  axis: across
  items:
    @trips
}

<node> rider {
  type: @actor
  text: "rider"
  layer: @apps
}

<node> driver {
  type: @actor
  text: "driver"
  layer: @apps
}

<node> booking {
  type: @service
  text: "booking"
  layer: @core
  group: @sys
}

<node> payments {
  type: @service
  text: "payments"
  layer: @core
}

<node> trips {
  type: @store
  text: "trips"
  layer: @stores
  group: @sys
}

<label> apps-label {
  on: @apps
  text: "Apps"
}

<label> gateway-label {
  on: @gateway
  text: "API gateway"
}

<label> core-label {
  on: @core
  text: "Core"
}

<label> stores-label {
  on: @stores
  text: "Stores"
}

<label> sys-label {
  on: @sys
  text: "booking"
}
`) as Diagram;
  const into: Op[] = [
    { op: "edge.set", ids: ["rider-gateway"], from: "rider", to: "gateway" },
    { op: "edge.set", ids: ["gateway-booking"], from: "gateway", to: "booking" },
    { op: "edge.set", ids: ["gateway-sys"], from: "gateway", to: "sys" },
  ];

  it("accepts a layer with no node as an end when the other end holds one", () => {
    const d = ok(base, into);
    expect(d.edges.map((e) => e.id)).toEqual(["rider-gateway", "gateway-booking", "gateway-sys"]);
  });

  it("refuses an edge between two layers with no node", () => {
    const errors = fail(base, [
      { op: "layer.set", ids: ["bundle"], label: "Bundle", after: "core" },
      { op: "edge.set", ids: ["gateway-bundle"], from: "gateway", to: "bundle" },
    ]);
    expect(errors[0]).toMatchObject({
      code: "bar-to-bar",
      found: "gateway-bundle",
      facts: { ends: ["gateway", "bundle"] },
    });
  });

  it("refuses a bar between the first and last layers of a group", () => {
    const errors = fail(base, [
      { op: "layer.set", ids: ["mid"], label: "Mid", after: "core" },
      { op: "edge.set", ids: ["rider-mid"], from: "rider", to: "mid" },
    ]);
    // The group's node covers every layer from its top layer to its bottom one, and the record names both
    // (specs/decisions, "Refusals say what happened and which commands can change it").
    expect(errors[0]).toMatchObject({
      code: "bar-in-group",
      facts: { layer: "mid", group: "sys", edge: "rider-mid", top: "core", bottom: "stores" },
    });
  });

  it("refuses an edge that passes a bar unless it may", () => {
    const d = ok(base, into);
    const passing = fail(d, [
      { op: "edge.set", ids: ["driver-payments"], from: "driver", to: "payments" },
    ]);
    expect(passing[0]).toMatchObject({
      code: "bar-crossed",
      found: "driver-payments",
      facts: { ends: ["driver", "payments"], layer: "gateway" },
    });
    const allowed = ok(d, [
      { op: "edge.set", ids: ["driver-payments"], from: "driver", to: "payments", pass: "on" },
    ]);
    expect(allowed.edges.find((e) => e.id === "driver-payments")?.pass).toBe(true);
    const off = fail(allowed, [{ op: "edge.set", ids: ["driver-payments"], pass: "off" }]);
    expect(off[0]?.code).toBe("bar-crossed");
    // The first edge to a layer makes it a bar: an edge that already passes it must say it may.
    const first = fail(
      ok(base, [{ op: "edge.set", ids: ["driver-payments"], from: "driver", to: "payments" }]),
      into,
    );
    expect(first[0]).toMatchObject({ code: "bar-crossed", found: "driver-payments" });
    const later = ok(base, [
      { op: "edge.set", ids: ["driver-payments"], from: "driver", to: "payments" },
    ]);
    expect(
      ok(later, [{ op: "edge.set", ids: ["driver-payments"], pass: "on" }, ...into]).edges,
    ).toHaveLength(4);
  });

  it("sets and clears a layer's look, and keeps it in the file", () => {
    const d = ok(base, [...into, { op: "layer.set", ids: ["gateway"], look: "band" }]);
    expect(d.layers[1]?.look).toBe("band");
    expect(writeDiagram(d)).toContain("look: band");
    expect(readDiagram(writeDiagram(d))).toEqual(d);
    expect(
      ok(d, [{ op: "layer.set", ids: ["gateway"], look: "-" }]).layers[1]?.look,
    ).toBeUndefined();
    expect(fail(d, [{ op: "layer.move", ids: ["gatewya"], first: true }])[0]?.code).toBe(
      "unknown-layer",
    );
  });

  it("diffs a look and an edge that may pass as the operations that made them", () => {
    const a = ok(base, [
      ...into,
      { op: "edge.set", ids: ["driver-payments"], from: "driver", to: "payments", pass: "on" },
    ]);
    const b = ok(a, [{ op: "layer.set", ids: ["gateway"], look: "band" }]);
    for (const [x, y] of [
      [base, a],
      [a, b],
      [b, a],
    ] as const) {
      const r = applyOps(x, diffDiagrams(x, y));
      if ("errors" in r) throw new Error(JSON.stringify(r.errors));
      expect(writeDiagram(r.diagram)).toBe(writeDiagram(y));
    }
    expect(diffDiagrams(a, b)).toEqual([{ op: "layer.set", ids: ["gateway"], look: "band" }]);
  });

  // specs/decisions, "A layer with a look is drawn".
  it("checks a layer with no node and a look as a bar, though no edge ends at it", () => {
    const passing = ok(base, [
      { op: "edge.set", ids: ["driver-payments"], from: "driver", to: "payments" },
    ]);
    const crossed = fail(passing, [{ op: "layer.set", ids: ["gateway"], look: "box" }]);
    expect(crossed[0]).toMatchObject({
      code: "bar-crossed",
      found: "driver-payments",
      facts: { layer: "gateway" },
    });
    const looked = ok(passing, [
      { op: "edge.set", ids: ["driver-payments"], pass: "on" },
      { op: "layer.set", ids: ["gateway"], look: "box" },
    ]);
    expect(looked.layers[1]?.look).toBe("box");
    expect(fail(looked, [{ op: "edge.set", ids: ["driver-payments"], pass: "off" }])[0]?.code).toBe(
      "bar-crossed",
    );
    // A layer with nodes is a band, which edges pass as any layer.
    expect(ok(passing, [{ op: "layer.set", ids: ["core"], look: "band" }]).layers[2]?.look).toBe(
      "band",
    );
    const inGroup = fail(base, [
      { op: "layer.set", ids: ["mid"], label: "Mid", after: "core" },
      { op: "layer.set", ids: ["mid"], look: "band" },
    ]);
    expect(inGroup).toEqual([
      expect.objectContaining({
        code: "bar-in-group",
        field: "layers[3].look",
        found: "mid",
        // No edge ends at the bar: the record names the layer, the group and the layers its frame covers.
        facts: { layer: "mid", group: "sys", top: "core", bottom: "stores" },
      }),
    ]);
    // A node placed by steps above the first layer adds a layer the file does not hold.
    const above = fail(base, [
      { op: "node.set", ids: ["boss"], label: "boss", from: "rider", up: "1" },
      { op: "layer.set", ids: ["mid"], label: "Mid", after: "core" },
      { op: "layer.set", ids: ["mid"], look: "band" },
    ]);
    expect(above[0]).toMatchObject({ code: "bar-in-group", field: "layers[3].look" });
  });

  it("diffs a look on a layer no edge ends at, with the edges that pass it", () => {
    const a = ok(base, [
      { op: "edge.set", ids: ["driver-payments"], from: "driver", to: "payments", pass: "on" },
      { op: "layer.set", ids: ["gateway"], look: "band" },
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
