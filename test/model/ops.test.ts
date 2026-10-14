import { describe, expect, it } from "vitest";
import type { OpError } from "../../src/errors.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  parseOp,
  parseOps,
  writeDiagram,
} from "../../src/model/index.ts";
import { NODE_KINDS } from "../../src/model/types.ts";
import { createStubMeasurer } from "../../src/text/index.ts";

const m = createStubMeasurer();

const empty: Diagram = { grafical: 1, title: "T", density: "normal", layers: [], edges: [] };

function ok(d: Diagram | null, ops: Op[]) {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
function fail(d: Diagram | null, ops: Op[]): OpError[] {
  const r = applyOps(d, ops, m);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}

describe("refusals that say how to fix them", () => {
  it("an edge kind given as a legend's line names the look it is drawn in", () => {
    const e = parseOp({ op: "diagram.legend", style: "async", text: "event" }, 0) as OpError[];
    expect(e[0]).toMatchObject({ code: "bad-value", field: "style" });
    expect(e[0]?.facts?.likely).toEqual(["dashed"]);
    const worded = parseOp({ op: "diagram.legend", style: "solid: request" }, 0) as OpError[];
    expect(worded[0]?.facts?.fix).toEqual([
      'diagram legend <file> <style> --text "solid: request"',
    ]);
  });

  it("a guessed kind is answered with the kind it most likely means", () => {
    const start = parseOp(
      { op: "node.add", id: "s", layer: "l", label: "S", kind: "start" },
      0,
    ) as OpError[];
    expect(start[0]?.facts?.likely).toEqual(["terminal", "initial"]);
    expect(start[0]?.facts?.allowed).toEqual(NODE_KINDS);
    const event = parseOp({ op: "edge.add", from: "a", to: "b", kind: "event" }, 0) as OpError[];
    expect(event[0]?.facts?.likely).toEqual(["async"]);
    expect(event[0]?.facts?.allowed?.[0]).toBe("call");
    const style = parseOp({ op: "edge.add", from: "a", to: "b", kind: "dashed" }, 0) as OpError[];
    expect(style[0]?.facts?.likely).toEqual(["async"]);
    const odd = parseOp(
      { op: "node.add", id: "s", layer: "l", label: "S", kind: "blob" },
      0,
    ) as OpError[];
    expect(odd[0]?.facts?.allowed).toEqual(NODE_KINDS);
    expect(odd[0]?.facts?.likely).toBeUndefined();
  });

  it("the legend's old field name line is refused with its new name", () => {
    const e = parseOp({ op: "diagram.legend", line: "dashed", text: "event" }, 0) as OpError[];
    const old = e.find((x) => x.code === "unknown-field");
    expect(old?.facts?.likely).toEqual(["style"]);
  });

  it("text cut at a comma is named as such, and other fields come from the operation", () => {
    const cut = parseOps([
      { op: "node.add", id: "a", layer: "top", label: "A", sublabel: "x", dedupe: null },
    ]) as OpError[];
    expect(cut[0]).toMatchObject({ code: "unquoted-text", found: "dedupe" });
    expect(cut[0]?.facts?.allowed).toContain("sublabel");
    const typo = parseOps([
      { op: "node.add", id: "a", layer: "top", label: "A", sublable: "x" },
    ]) as OpError[];
    expect(typo[0]?.facts?.likely).toContain("sublabel");
  });

  it("a node given its row's id is offered a free id", () => {
    const d = ok(empty, [{ op: "layer.add", id: "placed", label: "Placed" }]);
    const e = fail(d.diagram, [{ op: "node.add", id: "placed", layer: "placed", label: "Placed" }]);
    expect(e[0]?.code).toBe("duplicate-id");
    expect(e[0]?.facts).toEqual({ is: "layer", free: "placed-2" });
  });
});

const base: Diagram = ok(empty, [
  { op: "layer.add", id: "top", label: "Top" },
  { op: "layer.add", id: "bottom", label: "Bottom" },
  { op: "node.add", id: "a", layer: "top", label: "A", last: true },
  { op: "node.add", id: "b", layer: "top", label: "B", last: true },
  { op: "node.add", id: "c", layer: "bottom", label: "C", kind: "store" },
]).diagram;

const ids = (d: Diagram, layer: string) =>
  d.layers.find((l) => l.id === layer)?.nodes.map((n) => n.id);

describe("diagram.new", () => {
  it("creates a diagram from nothing", () => {
    const r = ok(null, [{ op: "diagram.new", title: "Hello", density: "airy" }]);
    expect(r.diagram).toEqual({ ...empty, title: "Hello", density: "airy" });
  });
  it("needs to be first, and only when there is no diagram", () => {
    expect(fail(null, [{ op: "layer.add", id: "x", label: "X" }])[0]?.code).toBe("no-diagram");
    expect(fail(empty, [{ op: "diagram.new", title: "X" }])[0]?.code).toBe("not-allowed");
  });
});

describe("layer.add", () => {
  it("goes to the bottom by default, or before or after another layer", () => {
    const r = ok(base, [
      { op: "layer.add", id: "l1", label: "L1" },
      { op: "layer.add", id: "l2", label: "L2", before: "top" },
      { op: "layer.add", id: "l3", label: "L3", after: "top" },
    ]);
    expect(r.diagram.layers.map((l) => l.id)).toEqual(["l2", "top", "l3", "bottom", "l1"]);
    expect(r.changed).toEqual(["l1", "l2", "l3"]);
  });
  it("rejects an unknown reference with suggestions", () => {
    const [e] = fail(base, [{ op: "layer.add", id: "x", label: "X", before: "botom" }]);
    expect(e).toMatchObject({ code: "unknown-layer", field: "before", index: 0 });
    expect(e?.facts?.near).toEqual(["bottom", "top"]);
  });
  it("rejects a taken id", () => {
    expect(fail(base, [{ op: "layer.add", id: "a", label: "X" }])[0]?.code).toBe("duplicate-id");
  });
});

describe("node.add", () => {
  it("honours positions", () => {
    const r = ok(base, [
      { op: "node.add", id: "f", layer: "top", label: "F", first: true },
      { op: "node.add", id: "g", layer: "top", label: "G", after: "a" },
      { op: "node.add", id: "h", layer: "top", label: "H", before: "b" },
    ]);
    expect(ids(r.diagram, "top")).toEqual(["f", "a", "g", "h", "b"]);
  });
  it("stores kind, size, sublabel, accent and align", () => {
    const r = ok(base, [
      {
        op: "node.add",
        id: "n",
        layer: "bottom",
        label: "N",
        kind: "queue",
        size: "l",
        sublabel: ":9",
        accent: true,
        align: "a",
        first: true,
      },
    ]);
    expect(r.diagram.layers[1]?.nodes.find((n) => n.id === "n")).toEqual({
      id: "n",
      label: "N",
      kind: "queue",
      size: "l",
      sublabel: ":9",
      accent: true,
      align: "a",
    });
  });
  it("slots a node without a position last (stub), after all operations", () => {
    const r = ok(base, [
      { op: "node.add", id: "n", layer: "top", label: "N" },
      { op: "edge.add", from: "n", to: "c" },
    ]);
    expect(ids(r.diagram, "top")).toEqual(["a", "b", "n"]);
  });
  it("slots a lone node where its line crosses least, not last (D24)", () => {
    const d = ok(null, [
      { op: "diagram.new", title: "T" },
      { op: "layer.add", id: "top", label: "Top" },
      { op: "layer.add", id: "low", label: "Low" },
      ...["a", "b", "c"].map(
        (id): Op => ({ op: "node.add", id, layer: "top", label: id, last: true }),
      ),
      ...["p", "q"].map((id): Op => ({ op: "node.add", id, layer: "low", label: id, last: true })),
      { op: "edge.add", from: "a", to: "p" },
      { op: "edge.add", from: "c", to: "q" },
    ]).diagram;
    // Last, a->n would cross c->q.
    const r = ok(d, [
      { op: "node.add", id: "n", layer: "low", label: "N" },
      { op: "edge.add", from: "a", to: "n" },
    ]);
    expect(ids(r.diagram, "low")).toEqual(["p", "n", "q"]);
  });
  it("rejects an unknown layer, with the closest ids", () => {
    const [e] = fail(base, [{ op: "node.add", id: "n", layer: "tpo", label: "N" }]);
    expect(e).toMatchObject({ code: "unknown-layer", field: "layer", found: "tpo" });
    expect(e?.facts?.near).toEqual(["top", "bottom"]);
  });
  it("rejects a taken id, an align in the same layer, and a missing align", () => {
    expect(fail(base, [{ op: "node.add", id: "a", layer: "top", label: "X" }])[0]?.code).toBe(
      "duplicate-id",
    );
    expect(
      fail(base, [{ op: "node.add", id: "n", layer: "top", label: "X", align: "a" }])[0]?.code,
    ).toBe("align-same-layer");
    expect(
      fail(base, [{ op: "node.add", id: "n", layer: "top", label: "X", align: "zz" }])[0]?.code,
    ).toBe("unknown-node");
  });
  it("rejects conflicting and misplaced positions", () => {
    expect(
      fail(base, [
        { op: "node.add", id: "n", layer: "top", label: "X", first: true, last: true },
      ])[0]?.code,
    ).toBe("conflicting-position");
    expect(
      fail(base, [{ op: "node.add", id: "n", layer: "top", label: "X", before: "c" }])[0]?.code,
    ).toBe("not-in-layer");
    expect(
      fail(base, [{ op: "node.add", id: "n", layer: "top", label: "X", before: "zz" }])[0]?.code,
    ).toBe("unknown-node");
  });
  it("allows at most two accents", () => {
    const acc = (id: string): Op => ({ op: "node.add", id, layer: "top", label: id, accent: true });
    const e = fail(base, [acc("x1"), acc("x2"), acc("x3")]);
    expect(e[0]).toMatchObject({ code: "too-many-accents", index: 2 });
  });
});

describe("node.rename, node.move, node.remove", () => {
  it("renames the label and keeps the id", () => {
    const r = ok(base, [{ op: "node.rename", id: "a", label: "Alpha" }]);
    expect(r.diagram.layers[0]?.nodes[0]).toMatchObject({ id: "a", label: "Alpha" });
    expect(r.changed).toEqual(["a"]);
    expect(fail(base, [{ op: "node.rename", id: "q", label: "Q" }])[0]?.code).toBe("unknown-node");
  });
  it("moves within a layer and across layers", () => {
    const r = ok(base, [
      { op: "node.move", id: "b", first: true },
      { op: "node.move", id: "a", layer: "bottom", before: "c" },
    ]);
    expect(ids(r.diagram, "top")).toEqual(["b"]);
    expect(ids(r.diagram, "bottom")).toEqual(["a", "c"]);
  });
  it("moves across layers without a position, and the engine slots it", () => {
    const r = ok(base, [{ op: "node.move", id: "a", layer: "bottom" }]);
    expect(ids(r.diagram, "bottom")).toEqual(["c", "a"]);
  });
  it("needs a layer or a position", () => {
    expect(fail(base, [{ op: "node.move", id: "a" }])[0]?.code).toBe("missing-field");
    expect(fail(base, [{ op: "node.move", id: "a", layer: "nope" }])[0]?.code).toBe(
      "unknown-layer",
    );
    expect(fail(base, [{ op: "node.move", id: "a", before: "a" }])[0]?.code).toBe("bad-reference");
  });
  it("refuses a move that puts a node in the layer of its align target", () => {
    const d = ok(base, [
      { op: "node.add", id: "n", layer: "bottom", label: "N", align: "a", first: true },
    ]).diagram;
    expect(fail(d, [{ op: "node.move", id: "n", layer: "top" }])[0]?.code).toBe("align-same-layer");
    expect(fail(d, [{ op: "node.move", id: "a", layer: "bottom" }])[0]?.code).toBe(
      "align-same-layer",
    );
  });
  it("removes a node together with its edges, and lists them", () => {
    const d = ok(base, [
      { op: "edge.add", from: "a", to: "c" },
      { op: "edge.add", from: "b", to: "c" },
      { op: "edge.add", from: "a", to: "b" },
    ]).diagram;
    const r = ok(d, [{ op: "node.remove", id: "c" }]);
    expect(r.diagram.edges.map((e) => e.id)).toEqual(["a->b"]);
    expect(r.changed).toEqual(["c", "a->c", "b->c"]);
    expect(ids(r.diagram, "bottom")).toEqual([]);
  });
  it("clears an align that pointed at a removed node, and reports the node", () => {
    const d = ok(base, [
      { op: "node.add", id: "n", layer: "bottom", label: "N", align: "a", first: true },
    ]).diagram;
    const r = ok(d, [{ op: "node.remove", id: "a" }]);
    expect(r.changed).toEqual(["a", "n"]);
    expect(r.diagram.layers[1]?.nodes.find((n) => n.id === "n")?.align).toBeUndefined();
  });
});

describe("edge.add and edge.remove", () => {
  it("defaults the id to from->to and adds #2, #3 for repeats", () => {
    const r = ok(base, [
      { op: "edge.add", from: "a", to: "c" },
      { op: "edge.add", from: "a", to: "c", label: "again" },
      { op: "edge.add", from: "a", to: "c", kind: "async" },
    ]);
    expect(r.diagram.edges.map((e) => e.id)).toEqual(["a->c", "a->c#2", "a->c#3"]);
    expect(r.diagram.edges[2]).toMatchObject({ kind: "async" });
    expect(r.diagram.edges[0]?.kind).toBe("call");
  });
  it("takes an explicit id and rejects a taken one", () => {
    const r = ok(base, [{ op: "edge.add", from: "a", to: "c", id: "mine", label: "x" }]);
    expect(r.diagram.edges[0]).toMatchObject({ id: "mine", label: "x" });
    expect(fail(r.diagram, [{ op: "edge.add", from: "a", to: "c", id: "mine" }])[0]?.code).toBe(
      "duplicate-id",
    );
    expect(fail(base, [{ op: "edge.add", from: "a", to: "c", id: "top" }])[0]?.code).toBe(
      "duplicate-id",
    );
  });
  it("reports unknown endpoints with suggestions, one error per end", () => {
    const e = fail(base, [{ op: "edge.add", from: "aa", to: "cc" }]);
    expect(e.map((x) => x.field)).toEqual(["from", "to"]);
    expect(e[0]?.facts?.near).toEqual(["a", "b", "c"]);
  });
  it("removes an edge, and rejects an unknown one", () => {
    const d = ok(base, [{ op: "edge.add", from: "a", to: "c" }]).diagram;
    const r = ok(d, [{ op: "edge.remove", id: "a->c" }]);
    expect(r.diagram.edges).toEqual([]);
    expect(r.changed).toEqual(["a->c"]);
    const [e] = fail(d, [{ op: "edge.remove", id: "a->d" }]);
    expect(e).toMatchObject({ code: "unknown-edge", facts: { near: ["a->c"] } });
  });
});

describe("batches", () => {
  it("is atomic: an error leaves the input untouched and names the operation index", () => {
    const before = writeDiagram(base);
    const r = applyOps(
      base,
      [
        { op: "node.add", id: "n", layer: "top", label: "N" },
        { op: "edge.add", from: "n", to: "c" },
        { op: "node.rename", id: "ghost", label: "G" },
        { op: "node.add", id: "z", layer: "top", label: "Z" },
      ],
      m,
    );
    expect(r).toHaveProperty("errors");
    expect((r as { errors: OpError[] }).errors[0]).toMatchObject({
      index: 2,
      code: "unknown-node",
    });
    expect(writeDiagram(base)).toBe(before);
  });
  it("does not change the input diagram on success", () => {
    const before = writeDiagram(base);
    ok(base, [{ op: "node.remove", id: "a" }]);
    expect(writeDiagram(base)).toBe(before);
  });
  it("lists changed ids once, in order", () => {
    const r = ok(base, [
      { op: "node.rename", id: "a", label: "A1" },
      { op: "node.rename", id: "b", label: "B1" },
      { op: "node.rename", id: "a", label: "A2" },
    ]);
    expect(r.changed).toEqual(["a", "b"]);
  });
  it("lets a later operation use what an earlier one made", () => {
    const r = ok(empty, [
      { op: "layer.add", id: "l", label: "L" },
      { op: "node.add", id: "x", layer: "l", label: "X" },
      { op: "node.remove", id: "x" },
    ]);
    expect(r.diagram.layers[0]?.nodes).toEqual([]);
  });
});

describe("parsing operations", () => {
  it("parses a batch of items", () => {
    const r = parseOps([
      { op: "node.add", id: "n", layer: "l", label: "N", kind: "store" },
      { op: "edge.add", from: "a", to: "b" },
    ]);
    expect(r).toEqual([
      { op: "node.add", id: "n", layer: "l", label: "N", kind: "store" },
      { op: "edge.add", from: "a", to: "b" },
    ]);
  });
  it("reports an unknown op with the closest names", () => {
    const [e] = parseOp({ op: "node.ad", id: "n" }, 3) as OpError[];
    expect(e).toMatchObject({ code: "unknown-op", index: 3, found: "node.ad" });
    expect(e?.facts?.likely).toContain("node.add");
  });
  it("reports bad values, missing and unknown fields with the item's index", () => {
    const r = parseOps([
      { op: "node.add", id: "n", layer: "l", label: "N", kind: "db" },
      { op: "node.add", id: "n2", label: "N" },
      { op: "node.remove", id: "n", extra: 1 },
    ]) as OpError[];
    expect(r.map((e) => [e.index, e.code, e.field])).toEqual([
      [0, "bad-value", "kind"],
      [1, "missing-field", "layer"],
      [2, "unknown-field", "extra"],
    ]);
    expect(r[0]?.facts).toMatchObject({ likely: ["store"], allowed: NODE_KINDS });
  });
  it("rejects a batch that is not a list, and coordinates", () => {
    expect((parseOps({ op: "x" }) as OpError[])[0]?.code).toBe("bad-batch");
    const [e] = parseOp({ op: "node.add", id: "n", layer: "l", label: "N", x: 10 }, 0) as OpError[];
    expect(e?.code).toBe("unknown-field");
  });
});
