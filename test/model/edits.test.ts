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

function run(d: Diagram, ops: Op[]) {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
const ok = (d: Diagram, ops: Op[]) => run(d, ops).diagram;
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
  it("title, density and legend wording, round-tripped", () => {
    const d = ok(fx, [
      { op: "diagram.title", text: "New title" },
      { op: "diagram.density", density: "compact" },
      { op: "diagram.legend", style: "dashed", text: "Kafka message" },
    ]);
    expect(d).toMatchObject({ title: "New title", density: "compact" });
    expect(d.legend).toEqual({ dashed: "Kafka message" });
    expect(writeDiagram(d)).toMatch(
      /density: compact\nlegend:\n {2}dashed: Kafka message\nlayers:/,
    );
    roundTrips(d);
    const legend = layout(d, m).legend?.map((it) => it.label.runs.map((r) => r.text).join(""));
    expect(legend).toContain("Kafka message");
    const cleared = ok(d, [{ op: "diagram.legend", style: "dashed" }]);
    expect(cleared.legend).toBeUndefined();
  });
});

describe("layers", () => {
  it("rename, move", () => {
    const d = ok(fx, [
      { op: "layer.rename", id: "deps", label: "Outside" },
      { op: "layer.move", id: "sources", after: "deps" },
    ]);
    expect(d.layers.map((l) => l.id)).toEqual(["entry", "topics", "work", "deps", "sources"]);
    expect(d.layers[3]?.label).toBe("Outside");
    // A row moved between a group's rows: the box spans it, and its nodes stay beside the box (DESIGN.md, "Rows unseen, groups as systems").
    const moved = ok(fx, [{ op: "layer.move", id: "deps", before: "work" }]);
    expect(check(moved, layout(moved, m), m)).toEqual([]);
    expect(fail(fx, [{ op: "layer.move", id: "deps" }])[0]?.code).toBe("missing-field");
    expect(fail(fx, [{ op: "layer.move", id: "deps", before: "nope" }])[0]?.code).toBe(
      "unknown-layer",
    );
  });

  it("remove takes only an empty layer, and its edges go with it", () => {
    expect(fail(fx, [{ op: "layer.remove", id: "deps" }])[0]?.code).toBe("layer-not-empty");
    const d = ok(fx, [
      { op: "layer.add", id: "spare", label: "Spare" },
      { op: "node.add", id: "x", layer: "spare", label: "x" },
      { op: "edge.add", from: "pipelines", to: "spare" },
    ]);
    const gone = run(d, [
      { op: "node.remove", id: "x" },
      { op: "layer.remove", id: "spare" },
    ]);
    expect(gone.diagram.layers.some((l) => l.id === "spare")).toBe(false);
    expect(gone.diagram.edges.some((e) => e.to === "spare")).toBe(false);
    expect(gone.changed).toContain("pipelines->spare");
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
      { op: "node.describe", id: "geo", text: "regions" },
      { op: "node.describe", id: "i18n" },
      { op: "node.kind", id: "geo", kind: "service" },
      { op: "node.emphasize", id: "mongo", off: true },
      { op: "node.emphasize", id: "geo" },
      { op: "node.align", id: "geo", to: "admin" },
    ]);
    expect(node(d, "geo")).toMatchObject({ sublabel: "regions", kind: "service", accent: true });
    expect(node(d, "geo")?.align).toBe("admin");
    expect(node(d, "i18n")?.sublabel).toBeUndefined();
    expect(node(d, "mongo")?.accent).toBeUndefined();
    const cleared = ok(d, [{ op: "node.align", id: "geo" }]);
    expect(node(cleared, "geo")?.align).toBeUndefined();
    expect(fail(fx, [{ op: "node.align", id: "geo", to: "i18n" }])[0]?.code).toBe(
      "align-same-layer",
    );
  });

  it("swap trades places, in one layer or across two", () => {
    const one = ok(fx, [{ op: "node.swap", a: "geo", b: "campaign" }]);
    expect(order(one, "deps")).toEqual(["campaign", "postgres", "i18n", "inventory", "geo"]);
    const two = ok(fx, [{ op: "node.swap", a: "geo", b: "upstream" }]);
    expect(order(two, "sources")?.[0]).toBe("geo");
    expect(order(two, "deps")?.[0]).toBe("upstream");
    expect(fail(fx, [{ op: "node.swap", a: "geo", b: "geo" }])[0]?.code).toBe("bad-reference");
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
    expect(r.changed).toContain("pipelines->i18n");
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
      { op: "edge.relabel", id: "pipelines->mongo", label: "write" },
      { op: "edge.relabel", id: "service->mongo" },
      { op: "edge.kind", id: "pipelines->geo", kind: "data" },
      { op: "edge.reverse", id: "retry->line_topics" },
      { op: "edge.retarget", id: "callers->handlers", to: "catalog-api" },
    ]);
    expect(edge(d, "pipelines->mongo")?.label).toBe("write");
    expect(edge(d, "service->mongo")?.label).toBeUndefined();
    expect(edge(d, "pipelines->geo")?.kind).toBe("data");
    expect(edge(d, "retry->line_topics")).toMatchObject({ from: "line_topics", to: "retry" });
    expect(edge(d, "callers->handlers")).toMatchObject({ from: "callers", to: "catalog-api" });
    expect(fail(fx, [{ op: "edge.retarget", id: "callers->handlers" }])[0]?.code).toBe(
      "missing-field",
    );
    expect(
      fail(fx, [{ op: "edge.retarget", id: "callers->handlers", to: "nope" }])[0],
    ).toMatchObject({ code: "unknown-node", field: "to" });
  });

  it('emphasize draws edges thick, as the main path, and the legend names it once the agent does (DESIGN.md, "Lines meet any side")', () => {
    const d = ok(fx, [{ op: "edge.emphasize", edges: ["pipelines->mongo", "service->mongo"] }]);
    roundTrips(d);
    expect(edge(d, "pipelines->mongo")?.accent).toBe(true);
    expect(writeDiagram(d)).toContain("accent: true");
    const scene = layout(d, m);
    expect(scene.edges.filter((e) => e.width === 2.5).map((e) => e.id)).toEqual([
      "pipelines->mongo",
      "service->mongo",
    ]);
    expect(scene.legend).toEqual([]);
    const named = ok(d, [{ op: "diagram.legend", weight: "thick", text: "main path" }]);
    expect(layout(named, m).legend?.at(-1)).toMatchObject({
      width: 2.5,
      label: { runs: [{ text: "main path" }] },
    });
    const off = ok(d, [{ op: "edge.emphasize", edges: ["service->mongo"], off: true }]);
    expect(edge(off, "service->mongo")?.accent).toBeUndefined();
    expect(fail(fx, [{ op: "edge.emphasize", edges: ["nope"] }])[0]).toMatchObject({
      code: "unknown-edge",
      field: "edges",
    });
  });

  it('both draws arrowheads at both ends, and a link takes none (DESIGN.md, "Lines meet any side")', () => {
    const d = ok(fx, [
      { op: "edge.both", id: "pipelines->mongo" },
      { op: "edge.add", from: "handlers", to: "geo", both: true },
    ]);
    roundTrips(d);
    expect(edge(d, "pipelines->mongo")?.both).toBe(true);
    expect(edge(d, "handlers->geo")?.both).toBe(true);
    expect(writeDiagram(d)).toContain("both: true");
    const scene = layout(d, m);
    expect(scene.edges.find((e) => e.id === "pipelines->mongo")?.both).toBe(true);
    const off = ok(d, [{ op: "edge.both", id: "pipelines->mongo", off: true }]);
    expect(edge(off, "pipelines->mongo")?.both).toBeUndefined();
    const link = ok(fx, [{ op: "edge.kind", id: "pipelines->mongo", kind: "link" }]);
    expect(fail(link, [{ op: "edge.both", id: "pipelines->mongo" }])[0]?.code).toBe("both-on-link");
    expect(
      fail(fx, [{ op: "edge.add", from: "handlers", to: "geo", kind: "link", both: true }])[0],
    ).toMatchObject({ code: "both-on-link", field: "both" });
    expect(fail(d, [{ op: "edge.kind", id: "handlers->geo", kind: "link" }])[0]).toMatchObject({
      code: "both-on-link",
      field: "kind",
    });
  });
});

describe("dots", () => {
  it('a start and an end keep their label in the file, and draw none (DESIGN.md, "Every layered diagram type")', () => {
    const d = ok(fx, [
      {
        op: "node.add",
        id: "begin",
        layer: "topics",
        label: "begin",
        kind: "initial",
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
    const d = ok(fx, [{ op: "group.describe", id: "catalog-sync", text: "write side" }]);
    roundTrips(d);
    const g = layout(d, m).groups?.find((x) => x.id === "catalog-sync");
    expect(g?.sublabel?.runs.map((r) => r.text).join("")).toBe("write side");
    expect(g?.sublabel?.bbox.x).toBeGreaterThan((g?.label.bbox.x ?? 0) + (g?.label.bbox.w ?? 0));
  });

  it("order puts a group's members before another group's, in every shared layer", () => {
    const d = ok(fx, [{ op: "group.order", id: "catalog-api", before: "catalog-sync" }]);
    const topics = order(d, "topics") ?? [];
    expect(topics.indexOf("handlers")).toBeLessThan(topics.indexOf("retry"));
    expect(fail(fx, [{ op: "group.order", id: "catalog-api" }])[0]?.code).toBe("missing-field");
  });
});

describe("parsing", () => {
  it("every new operation parses from a batch item", () => {
    const items = [
      { op: "diagram.title", text: "T" },
      { op: "diagram.density", density: "airy" },
      { op: "diagram.legend", style: "solid", text: "HTTP" },
      { op: "layer.rename", id: "a", label: "A" },
      { op: "layer.move", id: "a", last: true },
      { op: "layer.remove", id: "a" },
      { op: "layer.split", id: "a", into: "b", label: "B" },
      { op: "node.describe", id: "a", text: "t" },
      { op: "node.kind", id: "a", kind: "store" },
      { op: "node.emphasize", id: "a", off: true },
      { op: "node.align", id: "a", to: "b" },
      { op: "node.swap", a: "a", b: "b" },
      { op: "node.merge", nodes: ["a", "b"], id: "c", label: "C" },
      { op: "edge.relabel", id: "a->b", label: "x" },
      { op: "edge.kind", id: "a->b", kind: "async" },
      { op: "edge.both", id: "a->b", off: true },
      { op: "edge.emphasize", edges: ["a->b"] },
      { op: "edge.reverse", id: "a->b" },
      { op: "edge.retarget", id: "a->b", to: "c" },
      { op: "group.describe", id: "g", text: "t" },
      { op: "group.order", id: "g", after: "h" },
    ];
    for (const [k, item] of items.entries()) {
      const parsed = parseOp(item, k);
      expect(Array.isArray(parsed), JSON.stringify(item)).toBe(false);
    }
    expect((parseOp({ op: "diagram.legend", style: "wavy" }, 0) as OpError[])[0]?.code).toBe(
      "bad-value",
    );
  });
});
