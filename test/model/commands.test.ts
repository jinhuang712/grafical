import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  parseOp,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { catalogSyncGrouped as fx } from "../fixtures/catalog-sync-grouped.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function run(d: Diagram | null, ops: Op[]) {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
const ok = (d: Diagram | null, ops: Op[]) => run(d, ops).diagram;
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}
const node = (d: Diagram, id: string) => d.layers.flatMap((l) => l.nodes).find((n) => n.id === id);
const order = (d: Diagram, layer: string) =>
  d.layers.find((l) => l.id === layer)?.nodes.map((n) => n.id);
const edge = (d: Diagram, id: string) => d.edges.find((e) => e.id === id);
const roundTrips = (d: Diagram) => {
  const text = writeDiagram(d);
  expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
};

describe("diagram settings", () => {
  it("title and legend wording, round-tripped", () => {
    const d = ok(fx, [
      { op: "diagram.set", title: "New title" },
      { op: "legend.set", ids: ["style:dashed"], text: "Kafka message" },
    ]);
    expect(d).toMatchObject({ title: "New title" });
    expect(d.legend).toEqual({ dashed: "Kafka message" });
    const text = writeDiagram(d);
    expect(text).toContain('<legend> {\n  dashed: "Kafka message"\n}');
    roundTrips(d);
    const legend = layout(d, m).legend?.map((it) => it.label.runs.map((r) => r.text).join(""));
    expect(legend).toContain("Kafka message");
    const cleared = ok(d, [{ op: "legend.remove", ids: ["style:dashed"] }]);
    expect(cleared.legend).toBeUndefined();
  });
});

describe("layers", () => {
  it("rename, move", () => {
    const d = ok(fx, [
      { op: "layer.set", ids: ["deps"], label: "Outside" },
      { op: "layer.move", ids: ["sources"], after: "deps" },
    ]);
    expect(d.layers.map((l) => l.id)).toEqual(["entry", "topics", "work", "deps", "sources"]);
    expect(d.layers[3]?.label).toBe("Outside");
    // A layer moved between a group's layers: the node spans it, and its nodes stay beside the node (specs/decisions, "Layers unseen, groups as systems").
    const moved = ok(fx, [{ op: "layer.move", ids: ["deps"], before: "work" }]);
    expect(check(moved, layout(moved, m), m)).toEqual([]);
    expect(fail(fx, [{ op: "layer.move", ids: ["deps"] }])[0]?.code).toBe("missing-field");
    expect(fail(fx, [{ op: "layer.move", ids: ["deps"], before: "nope" }])[0]?.code).toBe(
      "unknown-layer",
    );
  });

  it("remove takes only an empty layer, and its edges go with it", () => {
    expect(fail(fx, [{ op: "layer.remove", ids: ["deps"] }])[0]?.code).toBe("layer-not-empty");
    const d = ok(fx, [
      { op: "layer.set", ids: ["spare"], label: "Spare" },
      { op: "node.set", ids: ["x"], layer: "spare", label: "x" },
      { op: "edge.set", ids: ["pipelines-spare"], from: "pipelines", to: "spare" },
    ]);
    const gone = run(d, [
      { op: "node.remove", ids: ["x"] },
      { op: "layer.remove", ids: ["spare"] },
    ]);
    expect(gone.diagram.layers.some((l) => l.id === "spare")).toBe(false);
    expect(gone.diagram.edges.some((e) => e.to === "spare")).toBe(false);
    expect(gone.changed).toContain("pipelines-spare");
  });

  it("split moves the second half, or from a node on, into a new layer below", () => {
    const half = ok(fx, [{ op: "layer.split", id: "deps", into: "deps2", label: "More" }]);
    expect(order(half, "deps")).toEqual(["geo", "postgres", "i18n"]);
    expect(order(half, "deps2")).toEqual(["inventory", "campaign"]);
    expect(half.layers.map((l) => l.id).slice(-2)).toEqual(["deps", "deps2"]);
    const from = ok(fx, [
      { op: "layer.split", id: "deps", into: "deps2", label: "More", from: "postgres" },
    ]);
    expect(order(from, "deps")).toEqual(["geo"]);
    const codes = (ops: Op[]) => fail(fx, ops)[0]?.code;
    expect(codes([{ op: "layer.split", id: "deps", into: "x", label: "X", from: "geo" }])).toBe(
      "bad-reference",
    );
    expect(codes([{ op: "layer.split", id: "deps", into: "x", label: "X", from: "relay" }])).toBe(
      "not-in-layer",
    );
    expect(codes([{ op: "layer.split", id: "deps", into: "work", label: "X" }])).toBe(
      "duplicate-id",
    );
  });
});

describe("nodes", () => {
  it("describe, kind, emphasize and align", () => {
    const d = ok(fx, [
      { op: "node.set", ids: ["geo"], sublabel: "regions" },
      { op: "node.set", ids: ["i18n"], sublabel: "-" },
      { op: "node.set", ids: ["geo"], type: "service" },
      { op: "node.set", ids: ["mongo"], emphasis: "off" },
      { op: "node.set", ids: ["geo"], emphasis: "on" },
      { op: "node.set", ids: ["geo"], align: "admin" },
    ]);
    expect(node(d, "geo")).toMatchObject({ sublabel: "regions", kind: "service", emphasis: true });
    expect(node(d, "geo")?.align).toBe("admin");
    expect(node(d, "i18n")?.sublabel).toBeUndefined();
    expect(node(d, "mongo")?.emphasis).toBeUndefined();
    const cleared = ok(d, [{ op: "node.set", ids: ["geo"], align: "-" }]);
    expect(node(cleared, "geo")?.align).toBeUndefined();
    expect(fail(fx, [{ op: "node.set", ids: ["geo"], align: "i18n" }])[0]?.code).toBe(
      "align-same-layer",
    );
  });

  it("merge keeps every edge of the merged nodes, once, and reports them", () => {
    const r = run(fx, [
      { op: "node.merge", nodes: ["geo", "i18n"], id: "deps-svc", label: "geo, i18n" },
    ]);
    const d = r.diagram;
    expect(order(d, "deps")).toEqual(["deps-svc", "postgres", "inventory", "campaign"]);
    const into = d.edges.filter((e) => e.to === "deps-svc").map((e) => e.from);
    // pipelines called both: one edge now. service called i18n: kept.
    expect(into.sort()).toEqual(["pipelines", "service"]);
    expect(r.changed).toContain("pipelines-i18n");
    expect(node(d, "deps-svc")?.kind).toBe("external");
    // An id of a merged node may be reused.
    const reuse = ok(fx, [{ op: "node.merge", nodes: ["geo", "i18n"], id: "geo", label: "G" }]);
    expect(node(reuse, "geo")?.label).toBe("G");
    expect(
      fail(fx, [{ op: "node.merge", nodes: ["geo", "i18n"], id: "mongo", label: "x" }])[0]?.code,
    ).toBe("duplicate-id");
  });
});

describe("edges", () => {
  it("relabel, kind, reverse and retarget keep the id", () => {
    const d = ok(fx, [
      { op: "edge.set", ids: ["pipelines-mongo"], label: "write" },
      { op: "edge.set", ids: ["service-mongo"], label: "-" },
      { op: "edge.set", ids: ["pipelines-geo"], type: "data" },
      { op: "edge.set", ids: ["retry-line_topics"], from: "line_topics", to: "retry" },
      { op: "edge.set", ids: ["callers-handlers"], to: "catalog-api" },
    ]);
    expect(edge(d, "pipelines-mongo")?.label).toBe("write");
    expect(edge(d, "service-mongo")?.label).toBeUndefined();
    expect(edge(d, "pipelines-geo")?.kind).toBe("data");
    expect(edge(d, "retry-line_topics")).toMatchObject({ from: "line_topics", to: "retry" });
    expect(edge(d, "callers-handlers")).toMatchObject({ from: "callers", to: "catalog-api" });
    expect(run(fx, [{ op: "edge.set", ids: ["callers-handlers"] }]).changed).toEqual([]);
    expect(fail(fx, [{ op: "edge.set", ids: ["callers-handlers"], to: "nope" }])[0]).toMatchObject({
      code: "unknown-node",
      field: "to",
    });
  });

  it('the thick weight draws the main path, and the legend names it once the agent does (specs/decisions, "Edges meet any side")', () => {
    const d = ok(fx, [
      { op: "edge.set", ids: ["pipelines-mongo", "service-mongo"], weight: "thick" },
    ]);
    roundTrips(d);
    const scene = layout(d, m);
    expect(scene.edges.filter((e) => e.width === 2.5).map((e) => e.id)).toEqual([
      "pipelines-mongo",
      "service-mongo",
    ]);
    expect(scene.legend).toEqual([]);
    const named = ok(d, [{ op: "legend.set", ids: ["weight:thick"], text: "main path" }]);
    expect(layout(named, m).legend?.at(-1)).toMatchObject({
      width: 2.5,
      label: { runs: [{ text: "main path" }] },
    });
  });

  it('both draws arrowheads at both ends, and a link takes none (specs/decisions, "Edges meet any side")', () => {
    const d = ok(fx, [
      { op: "edge.set", ids: ["pipelines-mongo"], both: "on" },
      { op: "edge.set", ids: ["handlers-geo"], from: "handlers", to: "geo", both: "on" },
    ]);
    roundTrips(d);
    expect(edge(d, "pipelines-mongo")?.both).toBe(true);
    expect(edge(d, "handlers-geo")?.both).toBe(true);
    expect(writeDiagram(d)).toContain("both: true");
    const scene = layout(d, m);
    expect(scene.edges.find((e) => e.id === "pipelines-mongo")?.both).toBe(true);
    const off = ok(d, [{ op: "edge.set", ids: ["pipelines-mongo"], both: "off" }]);
    expect(edge(off, "pipelines-mongo")?.both).toBeUndefined();
    const link = ok(fx, [{ op: "edge.set", ids: ["pipelines-mongo"], type: "link" }]);
    expect(fail(link, [{ op: "edge.set", ids: ["pipelines-mongo"], both: "on" }])[0]?.code).toBe(
      "both-on-link",
    );
    expect(
      fail(fx, [
        {
          op: "edge.set",
          ids: ["handlers-geo"],
          from: "handlers",
          to: "geo",
          type: "link",
          both: "on",
        },
      ])[0],
    ).toMatchObject({ code: "both-on-link", field: "both" });
    expect(fail(d, [{ op: "edge.set", ids: ["handlers-geo"], type: "link" }])[0]).toMatchObject({
      code: "both-on-link",
      field: "type",
    });
  });

  it('step numbers an edge as the agent states it, and no number clears it (specs/decisions, "Step badges ride the edge")', () => {
    const d = ok(fx, [
      { op: "edge.set", ids: ["callers-handlers"], number: "1" },
      { op: "edge.set", ids: ["handlers-service"], number: "2" },
      { op: "edge.set", ids: ["service-mongo"], number: "2" },
    ]);
    roundTrips(d);
    expect(edge(d, "callers-handlers")?.step).toBe(1);
    // Two edges may share a number, and nothing is renumbered.
    expect(edge(d, "service-mongo")?.step).toBe(2);
    expect(writeDiagram(d)).toContain("number: 2");
    // The number stays through the edge's other changes.
    const kept = ok(d, [
      { op: "edge.set", ids: ["callers-handlers"], label: "GET" },
      { op: "edge.set", ids: ["callers-handlers"], from: "handlers", to: "callers" },
      { op: "edge.set", ids: ["callers-handlers"], type: "async" },
    ]);
    expect(edge(kept, "callers-handlers")?.step).toBe(1);
    const off = ok(d, [{ op: "edge.set", ids: ["service-mongo"], number: "-" }]);
    expect(edge(off, "service-mongo")?.step).toBeUndefined();
    for (const n of [0, 100, 1.5]) {
      expect(
        (parseOp({ op: "edge.set", ids: ["service-mongo"], number: String(n) }, 0) as OpError[])[0],
      ).toMatchObject({
        code: "bad-value",
        field: "number",
        facts: { min: 1, max: 99 },
      });
    }
    // An id no edge has makes an edge, which needs its ends.
    expect(fail(fx, [{ op: "edge.set", ids: ["nope"], number: "1" }])[0]).toMatchObject({
      code: "missing-field",
      field: "from",
    });
  });

  it("merging keeps two edges that differ only in their number", () => {
    const d = ok(fx, [
      { op: "edge.set", ids: ["g1"], from: "geo", to: "mongo" },
      { op: "edge.set", ids: ["g2"], from: "i18n", to: "mongo" },
      { op: "edge.set", ids: ["g1"], number: "4" },
      { op: "edge.set", ids: ["g2"], number: "5" },
      { op: "node.merge", nodes: ["geo", "i18n"], id: "deps-svc", label: "geo, i18n" },
    ]);
    expect(
      d.edges.filter((e) => e.from === "deps-svc" && e.to === "mongo").map((e) => e.step),
    ).toEqual([4, 5]);
  });
});

describe("dots", () => {
  it('a start and an end keep their label in the file, and draw none (specs/decisions, "Every layered diagram type")', () => {
    const d = ok(fx, [
      {
        op: "node.set",
        ids: ["begin"],
        layer: "topics",
        label: "begin",
        type: "initial",
        size: "l",
        first: true,
      },
    ]);
    roundTrips(d);
    expect(node(d, "begin")).toMatchObject({ label: "begin", kind: "initial" });
    const dot = layout(d, m).nodes.find((n) => n.id === "begin");
    expect(dot?.rect.w).toBe(24);
    expect(dot?.texts).toEqual([]);
  });
});

describe("groups", () => {
  it("describe adds a quieter second label, drawn after the label", () => {
    const d = ok(fx, [{ op: "group.set", ids: ["catalog-sync"], sublabel: "write side" }]);
    roundTrips(d);
    const g = layout(d, m).groups?.find((x) => x.id === "catalog-sync");
    expect(g?.sublabel?.runs.map((r) => r.text).join("")).toBe("write side");
    expect(g?.sublabel?.bbox.x).toBeGreaterThan((g?.label.bbox.x ?? 0) + (g?.label.bbox.w ?? 0));
  });

  it("order puts a group's members before another group's, in every shared layer", () => {
    const d = ok(fx, [{ op: "group.move", ids: ["catalog-api"], before: "catalog-sync" }]);
    const topics = order(d, "topics") ?? [];
    expect(topics.indexOf("handlers")).toBeLessThan(topics.indexOf("retry"));
    expect(fail(fx, [{ op: "group.move", ids: ["catalog-api"] }])[0]?.code).toBe("missing-field");
  });

  // A network with two zones, each a subnet per layer holding one node: a zone has no node of its own.
  const layerIds = ["public", "app", "data"];
  const zone = (z: string): Op[] => [
    { op: "group.set", ids: [`az-${z}`], label: `Zone ${z}`, in: "vpc" },
    ...layerIds.flatMap((r): Op[] => [
      { op: "node.set", ids: [`${r}-${z}`], layer: r, label: `${r} ${z}`, last: true },
      { op: "group.set", ids: [`${r}-net-${z}`], label: "Subnet", in: `az-${z}` },
      { op: "node.set", ids: [`${r}-${z}`], group: `${r}-net-${z}` },
    ]),
  ];
  const zones = ok(null, [
    { op: "diagram.set", title: "Zones" },
    ...layerIds.map((r): Op => ({ op: "layer.set", ids: [r], label: r })),
    { op: "group.set", ids: ["vpc"], label: "VPC" },
    ...zone("a"),
    ...zone("b"),
  ]);

  it("order moves the nodes of a group's inner groups too", () => {
    const { diagram: d, changed } = run(zones, [
      { op: "group.move", ids: ["az-b"], before: "az-a" },
    ]);
    expect(layerIds.map((r) => order(d, r))).toEqual(layerIds.map((r) => [`${r}-b`, `${r}-a`]));
    expect(changed).toEqual(["public-b", "app-b", "data-b"]);
  });

  it("order moves a group's own nodes and its inner groups' as one block", () => {
    // Zone A holds a bastion of its own beside its public subnet, after the network's own load balancer.
    const mixed = ok(zones, [
      { op: "node.set", ids: ["lb"], layer: "public", label: "LB", first: true, group: "vpc" },
      {
        op: "node.set",
        ids: ["bastion"],
        layer: "public",
        label: "Bastion",
        after: "lb",
        group: "az-a",
      },
    ]);
    expect(order(mixed, "public")).toEqual(["lb", "bastion", "public-a", "public-b"]);
    const moved = ok(mixed, [{ op: "group.move", ids: ["az-a"], after: "az-b" }]);
    expect(order(moved, "public")).toEqual(["lb", "public-b", "bastion", "public-a"]);
    expect(order(moved, "app")).toEqual(["app-b", "app-a"]);
    const before = ok(mixed, [{ op: "group.move", ids: ["az-b"], before: "az-a" }]);
    expect(order(before, "public")).toEqual(["lb", "public-b", "bastion", "public-a"]);
  });

  it("order refuses a group beside itself or a group around or inside it", () => {
    for (const [id, before] of [
      ["az-a", "az-a"],
      ["az-a", "app-net-a"],
      ["app-net-a", "vpc"],
    ] as const) {
      expect(fail(zones, [{ op: "group.move", ids: [id], before: before }])).toEqual([
        { code: "bad-reference", index: 0, field: "before", found: before, facts: { group: id } },
      ]);
    }
  });
});

describe("parsing", () => {
  it("every new operation parses from its fields", () => {
    const items = [
      { op: "diagram.set", title: "T" },
      { op: "legend.set", ids: ["style:solid"], text: "HTTP" },
      { op: "layer.set", ids: ["a"], label: "A" },
      { op: "layer.move", ids: ["a"], last: true },
      { op: "layer.remove", ids: ["a"] },
      { op: "layer.split", id: "a", into: "b", label: "B" },
      { op: "node.set", ids: ["a"], sublabel: "t" },
      { op: "node.set", ids: ["a"], type: "store" },
      { op: "node.set", ids: ["a"], emphasis: "off" },
      { op: "node.set", ids: ["a"], align: "b" },
      { op: "node.merge", nodes: ["a", "b"], id: "c", label: "C" },
      { op: "edge.set", ids: ["a-b"], label: "x" },
      { op: "edge.set", ids: ["a-b"], type: "async" },
      { op: "edge.set", ids: ["a-b"], both: "off" },
      { op: "edge.set", ids: ["a-b"], weight: "thick" },
      { op: "edge.set", ids: ["a-b"], to: "c" },
      { op: "group.set", ids: ["g"], sublabel: "t" },
      { op: "group.move", ids: ["g"], after: "h" },
      {
        op: "group.copy",
        id: "g",
        into: "h",
        label: "H",
        suffix: "-2",
        before: "g",
        outside: true,
      },
    ];
    for (const [k, item] of items.entries()) {
      const parsed = parseOp(item, k);
      expect(Array.isArray(parsed), JSON.stringify(item)).toBe(false);
    }
    expect(fail(fx, [{ op: "legend.remove", ids: ["style:wavy"] }])[0]?.code).toBe("bad-value");
  });
});
