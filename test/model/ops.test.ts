import { describe, expect, it } from "vitest";
import type { OpError } from "../../src/errors.ts";
import { applyOps, type Diagram, type Op, parseOp, writeDiagram } from "../../src/model/index.ts";
import { NODE_KINDS } from "../../src/model/types.ts";

const empty: Diagram = { grafical: 1, title: "T", layers: [], edges: [] };

function ok(d: Diagram | null, ops: Op[]) {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
function fail(d: Diagram | null, ops: Op[]): OpError[] {
  const r = applyOps(d, ops);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}

describe("refusals that say what was meant", () => {
  it("an edge kind given as a legend's line names the look it is drawn in", () => {
    const e = fail(empty, [{ op: "legend.set", ids: ["style:async"], text: "event" }]);
    expect(e[0]).toMatchObject({ code: "bad-value", field: "id", found: "async" });
    expect(e[0]?.facts?.likely).toEqual(["dashed"]);
    // A wording given as the style is a value it does not take; the record lists the styles and gives no command.
    const worded = fail(empty, [{ op: "legend.remove", ids: ["style:solid: request"] }]);
    expect(worded[0]).toMatchObject({ code: "bad-value", field: "id", found: "solid: request" });
    expect(worded[0]?.facts?.likely).toBeUndefined();
  });

  const typed = (op: object) => {
    const start = applyOps(null, [
      { op: "diagram.set", title: "t" },
      { op: "layer.set", ids: ["l"] },
      { op: "node.set", ids: ["a"], layer: "l", label: "A" },
      { op: "node.set", ids: ["b"], layer: "l", label: "B", last: true },
    ] as Op[]);
    if ("errors" in start) throw new Error("no start");
    const r = applyOps(start.diagram, [op as Op]);
    return "errors" in r ? r.errors : [];
  };

  it("a value a few letters off is answered with the allowed value it most likely means", () => {
    const e = typed({ op: "node.set", ids: ["a"], type: "servise" });
    expect(e[0]).toMatchObject({ code: "unknown-type", field: "type", found: "servise" });
    expect(e[0]?.facts?.likely).toEqual(["service"]);
    const far = parseOp({ op: "diagram.set", sizing: "loose" }, 0) as OpError[];
    expect(far[0]?.facts?.likely).toBeUndefined();
  });

  it("a guessed type is answered with the type it most likely means", () => {
    const start = typed({
      op: "node.set",
      ids: ["s"],
      layer: "l",
      label: "S",
      type: "start",
      last: true,
    });
    expect(start[0]?.facts?.likely).toEqual(["terminal", "initial"]);
    expect(start[0]?.facts?.allowed).toEqual(NODE_KINDS);
    const event = typed({ op: "edge.set", ids: ["a-b"], from: "a", to: "b", type: "event" });
    expect(event[0]?.facts?.likely).toEqual(["async"]);
    expect(event[0]?.facts?.allowed?.[0]).toBe("call");
    const style = typed({ op: "edge.set", ids: ["a-b"], from: "a", to: "b", type: "dashed" });
    expect(style[0]?.facts?.likely).toEqual(["async"]);
    const odd = typed({
      op: "node.set",
      ids: ["s"],
      layer: "l",
      label: "S",
      type: "blob",
      last: true,
    });
    expect(odd[0]?.facts?.allowed).toEqual(NODE_KINDS);
  });

  it("an unknown field is offered the closest names", () => {
    const typo = parseOp(
      { op: "node.set", ids: ["a"], layer: "top", label: "A", sublable: "x" },
      0,
    ) as OpError[];
    expect(typo[0]?.facts?.likely).toContain("sublabel");
  });

  it("a node given its layer's id is offered a free id", () => {
    const d = ok(empty, [{ op: "layer.set", ids: ["placed"], label: "Placed" }]);
    const e = fail(d.diagram, [
      { op: "node.set", ids: ["placed"], layer: "placed", label: "Placed" },
    ]);
    expect(e[0]?.code).toBe("duplicate-id");
    expect(e[0]?.facts).toEqual({ is: "layer", free: "placed-2" });
  });
});

const base: Diagram = ok(empty, [
  { op: "layer.set", ids: ["top"], label: "Top" },
  { op: "layer.set", ids: ["bottom"], label: "Bottom" },
  { op: "node.set", ids: ["a"], layer: "top", label: "A", last: true },
  { op: "node.set", ids: ["b"], layer: "top", label: "B", last: true },
  { op: "node.set", ids: ["c"], layer: "bottom", label: "C", type: "store" },
]).diagram;

const ids = (d: Diagram, layer: string) =>
  d.layers.find((l) => l.id === layer)?.nodes.map((n) => n.id);

describe("diagram --set", () => {
  it("creates a diagram from nothing", () => {
    const r = ok(null, [{ op: "diagram.set", title: "Hello" }]);
    expect(r.diagram).toEqual({ ...empty, title: "Hello" });
  });
  it("makes the file first, with a title, and then changes the diagram", () => {
    expect(fail(null, [{ op: "layer.set", ids: ["x"], label: "X" }])[0]?.code).toBe("no-diagram");
    expect(fail(null, [{ op: "diagram.set", subtitle: "X" }])[0]).toMatchObject({
      code: "missing-field",
      field: "title",
    });
    expect(ok(empty, [{ op: "diagram.set", title: "X" }]).diagram.title).toBe("X");
  });
});

describe("layer --set", () => {
  it("goes to the bottom by default, or before or after another layer", () => {
    const r = ok(base, [
      { op: "layer.set", ids: ["l1"], label: "L1" },
      { op: "layer.set", ids: ["l2"], label: "L2", before: "top" },
      { op: "layer.set", ids: ["l3"], label: "L3", after: "top" },
    ]);
    expect(r.diagram.layers.map((l) => l.id)).toEqual(["l2", "top", "l3", "bottom", "l1"]);
    expect(r.changed).toEqual(["l1", "l2", "l3"]);
  });
  it("rejects an unknown reference with suggestions", () => {
    const [e] = fail(base, [{ op: "layer.set", ids: ["x"], label: "X", before: "botom" }]);
    expect(e).toMatchObject({ code: "unknown-layer", field: "before", index: 0 });
    expect(e?.facts?.near).toEqual(["bottom", "top"]);
  });
  it("rejects a taken id", () => {
    expect(fail(base, [{ op: "layer.set", ids: ["a"], label: "X" }])[0]?.code).toBe("duplicate-id");
  });
});

describe("node --set", () => {
  it("honours positions", () => {
    const r = ok(base, [
      { op: "node.set", ids: ["f"], layer: "top", label: "F", first: true },
      { op: "node.set", ids: ["g"], layer: "top", label: "G", after: "a" },
      { op: "node.set", ids: ["h"], layer: "top", label: "H", before: "b" },
    ]);
    expect(ids(r.diagram, "top")).toEqual(["f", "a", "g", "h", "b"]);
  });
  it("stores kind, size, sublabel, emphasis and align", () => {
    const r = ok(base, [
      {
        op: "node.set",
        ids: ["n"],
        layer: "bottom",
        label: "N",
        type: "queue",
        size: "l",
        sublabel: ":9",
        emphasis: "on",
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
      emphasis: true,
      align: "a",
    });
  });
  it("rejects an unknown layer, with the closest ids", () => {
    const [e] = fail(base, [{ op: "node.set", ids: ["n"], layer: "tpo", label: "N" }]);
    expect(e).toMatchObject({ code: "unknown-layer", field: "layer", found: "tpo" });
    expect(e?.facts?.near).toEqual(["top", "bottom"]);
  });
  it("rejects a taken id, an align in the same layer, and a missing align", () => {
    expect(fail(base, [{ op: "node.set", ids: ["top"], layer: "top", label: "X" }])[0]?.code).toBe(
      "duplicate-id",
    );
    expect(
      fail(base, [{ op: "node.set", ids: ["n"], layer: "top", label: "X", align: "a" }])[0]?.code,
    ).toBe("align-same-layer");
    expect(
      fail(base, [{ op: "node.set", ids: ["n"], layer: "top", label: "X", align: "zz" }])[0]?.code,
    ).toBe("unknown-node");
  });
  it("rejects conflicting and misplaced positions", () => {
    expect(
      fail(base, [
        { op: "node.set", ids: ["n"], layer: "top", label: "X", first: true, last: true },
      ])[0]?.code,
    ).toBe("conflicting-position");
    expect(
      fail(base, [{ op: "node.set", ids: ["n"], layer: "top", label: "X", before: "c" }])[0]?.code,
    ).toBe("not-in-layer");
    expect(
      fail(base, [{ op: "node.set", ids: ["n"], layer: "top", label: "X", before: "zz" }])[0]?.code,
    ).toBe("unknown-node");
  });
  it("allows at most two emphases", () => {
    const acc = (id: string): Op => ({
      op: "node.set",
      ids: [id],
      layer: "top",
      label: id,
      emphasis: "on",
      last: true,
    });
    const e = fail(base, [acc("x1"), acc("x2"), acc("x3")]);
    expect(e[0]).toMatchObject({ code: "too-much-emphasis", index: 2 });
  });
});

describe("node --set, --move and --remove", () => {
  it("renames the label and keeps the id", () => {
    const r = ok(base, [{ op: "node.set", ids: ["a"], label: "Alpha" }]);
    expect(r.diagram.layers[0]?.nodes[0]).toMatchObject({ id: "a", label: "Alpha" });
    expect(r.changed).toEqual(["a"]);
    // A new id makes a node, which needs a layer.
    expect(fail(base, [{ op: "node.set", ids: ["q"], label: "Q" }])[0]).toMatchObject({
      code: "missing-field",
      field: "layer",
    });
  });
  it("moves within a layer and across layers", () => {
    const r = ok(base, [
      { op: "node.move", ids: ["b"], first: true },
      { op: "node.move", ids: ["a"], layer: "bottom", before: "c" },
    ]);
    expect(ids(r.diagram, "top")).toEqual(["b"]);
    expect(ids(r.diagram, "bottom")).toEqual(["a", "c"]);
  });
  it('refuses a move into a layer with nodes and no place (specs/decisions, "The agent states every order")', () => {
    expect(fail(base, [{ op: "node.move", ids: ["a"], layer: "bottom" }])[0]).toMatchObject({
      code: "missing-field",
      field: "place",
      facts: { layer: "bottom", nodes: ["c"], allowed: ["first", "last", "before", "after"] },
    });
  });
  it("needs a layer or a position", () => {
    expect(fail(base, [{ op: "node.move", ids: ["a"] }])[0]?.code).toBe("missing-field");
    expect(fail(base, [{ op: "node.move", ids: ["a"], layer: "nope" }])[0]?.code).toBe(
      "unknown-layer",
    );
    expect(fail(base, [{ op: "node.move", ids: ["a"], before: "a" }])[0]?.code).toBe(
      "bad-reference",
    );
  });
  it("refuses a move that puts a node in the layer of its align target", () => {
    const d = ok(base, [
      { op: "node.set", ids: ["n"], layer: "bottom", label: "N", align: "a", first: true },
    ]).diagram;
    expect(fail(d, [{ op: "node.move", ids: ["n"], layer: "top" }])[0]?.code).toBe(
      "align-same-layer",
    );
    expect(fail(d, [{ op: "node.move", ids: ["a"], layer: "bottom" }])[0]?.code).toBe(
      "align-same-layer",
    );
    // The refusal names the other node of the alignment; clearing it lets the move go.
    const up: Op = { op: "node.move", ids: ["n"], layer: "top", last: true };
    const down: Op = { op: "node.move", ids: ["a"], layer: "bottom", last: true };
    expect(fail(d, [up])[0]?.facts?.node).toBe("a");
    expect(fail(d, [down])[0]?.facts?.node).toBe("n");
    ok(d, [{ op: "node.set", ids: ["n"], align: "-" }, up]);
    ok(d, [{ op: "node.set", ids: ["n"], align: "-" }, down]);
  });
  it("removes a node together with its edges, and lists them", () => {
    const d = ok(base, [
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
      { op: "edge.set", ids: ["b-c"], from: "b", to: "c" },
      { op: "edge.set", ids: ["a-b"], from: "a", to: "b" },
    ]).diagram;
    const r = ok(d, [{ op: "node.remove", ids: ["c"] }]);
    expect(r.diagram.edges.map((e) => e.id)).toEqual(["a-b"]);
    expect(r.changed).toEqual(["c", "a-c", "b-c"]);
    expect(ids(r.diagram, "bottom")).toEqual([]);
  });
  it("clears an align that pointed at a removed node, and reports the node", () => {
    const d = ok(base, [
      { op: "node.set", ids: ["n"], layer: "bottom", label: "N", align: "a", first: true },
    ]).diagram;
    const r = ok(d, [{ op: "node.remove", ids: ["a"] }]);
    expect(r.changed).toEqual(["a", "n"]);
    expect(r.diagram.layers[1]?.nodes.find((n) => n.id === "n")?.align).toBeUndefined();
  });
});

describe("edge --set and --remove", () => {
  it("makes an edge with its id, and changes it when the id is taken by it", () => {
    const r = ok(base, [
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c" },
      { op: "edge.set", ids: ["a-c"], from: "a", to: "c", label: "again" },
      { op: "edge.set", ids: ["a-c-2"], from: "a", to: "c", type: "async" },
    ]);
    expect(r.diagram.edges.map((e) => e.id)).toEqual(["a-c", "a-c-2"]);
    expect(r.diagram.edges[0]).toMatchObject({ kind: "call", label: "again" });
    expect(r.diagram.edges[1]).toMatchObject({ kind: "async" });
    expect(fail(base, [{ op: "edge.set", ids: ["a-b"], from: "a" }])).toMatchObject([
      { code: "missing-field", field: "to" },
    ]);
  });
  it("takes any id, and refuses one another object holds", () => {
    const r = ok(base, [{ op: "edge.set", ids: ["mine"], from: "a", to: "c", label: "x" }]);
    expect(r.diagram.edges[0]).toMatchObject({ id: "mine", label: "x" });
    expect(fail(base, [{ op: "edge.set", ids: ["top"], from: "a", to: "c" }])[0]?.code).toBe(
      "duplicate-id",
    );
  });
  it("reports unknown endpoints with suggestions, one error per end", () => {
    const e = fail(base, [{ op: "edge.set", ids: ["aa-cc"], from: "aa", to: "cc" }]);
    expect(e.map((x) => x.field)).toEqual(["from", "to"]);
    expect(e[0]?.facts?.near).toEqual(["a", "b", "c"]);
  });
  it("removes an edge, and rejects an unknown one", () => {
    const d = ok(base, [{ op: "edge.set", ids: ["a-c"], from: "a", to: "c" }]).diagram;
    const r = ok(d, [{ op: "edge.remove", ids: ["a-c"] }]);
    expect(r.diagram.edges).toEqual([]);
    expect(r.changed).toEqual(["a-c"]);
    const [e] = fail(d, [{ op: "edge.remove", ids: ["a-d"] }]);
    expect(e).toMatchObject({ code: "unknown-edge", facts: { near: ["a-c"] } });
  });
});

describe("operations applied together", () => {
  it("is atomic: an error leaves the input untouched and names the operation index", () => {
    const before = writeDiagram(base);
    const r = applyOps(base, [
      { op: "node.set", ids: ["n"], layer: "top", label: "N", last: true },
      { op: "edge.set", ids: ["n-c"], from: "n", to: "c" },
      { op: "node.move", ids: ["ghost"], layer: "top", last: true },
      { op: "node.set", ids: ["z"], layer: "top", label: "Z", last: true },
    ]);
    expect(r).toHaveProperty("errors");
    expect((r as { errors: OpError[] }).errors[0]).toMatchObject({
      index: 2,
      code: "unknown-node",
    });
    expect(writeDiagram(base)).toBe(before);
  });
  it("does not change the input diagram on success", () => {
    const before = writeDiagram(base);
    ok(base, [{ op: "node.remove", ids: ["a"] }]);
    expect(writeDiagram(base)).toBe(before);
  });
  it("lists changed ids once, in order", () => {
    const r = ok(base, [
      { op: "node.set", ids: ["a"], label: "A1" },
      { op: "node.set", ids: ["b"], label: "B1" },
      { op: "node.set", ids: ["a"], label: "A2" },
    ]);
    expect(r.changed).toEqual(["a", "b"]);
  });
  it("lets a later operation use what an earlier one made", () => {
    const r = ok(empty, [
      { op: "layer.set", ids: ["l"], label: "L" },
      { op: "node.set", ids: ["x"], layer: "l", label: "X" },
      { op: "node.remove", ids: ["x"] },
    ]);
    expect(r.diagram.layers[0]?.nodes).toEqual([]);
  });
});

describe("parsing operations", () => {
  it("parses an operation", () => {
    const op = { op: "node.set", ids: ["n"], layer: "l", label: "N", type: "store" };
    expect(parseOp(op, 0)).toEqual(op);
  });
  it("reports an unknown op with the closest names", () => {
    const [e] = parseOp({ op: "node.st", ids: ["n"] }, 3) as OpError[];
    expect(e).toMatchObject({ code: "unknown-op", index: 3, found: "node.st" });
    expect(e?.facts?.likely).toContain("node.set");
  });
  it("reports bad values, missing and unknown fields", () => {
    const r = [
      { op: "diagram.set", sizing: "loose" },
      { op: "node.merge", id: "n2", nodes: ["a", "b"] },
      { op: "node.remove", ids: ["n"], extra: 1 },
      { op: "edge.set", ids: ["e"], bendAt: "0.3" },
    ].flatMap((raw, i) => parseOp(raw, i) as OpError[]);
    expect(r.map((e) => [e.index, e.code, e.field])).toEqual([
      [0, "bad-value", "sizing"],
      [1, "missing-field", "label"],
      [2, "unknown-field", "extra"],
      [3, "bad-value", "bend-at"],
    ]);
  });
  it("takes an edge id by the rule of every id, and offers the plain form of an arrow", () => {
    for (const id of ["a->b", "a-b#2"]) {
      const [e] = parseOp({ op: "edge.set", ids: [id], from: "a", to: "b" }, 0) as OpError[];
      expect(e, id).toMatchObject({ code: "bad-id", field: "id", found: id });
    }
    const [arrow] = parseOp({ op: "edge.set", ids: ["a->b"] }, 0) as OpError[];
    expect(arrow?.facts?.likely).toEqual(["a-b"]);
  });
  it("rejects coordinates", () => {
    const [e] = parseOp(
      { op: "node.set", ids: ["n"], layer: "l", label: "N", x: 10 },
      0,
    ) as OpError[];
    expect(e?.code).toBe("unknown-field");
  });
});
