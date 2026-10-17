import { describe, expect, it } from "vitest";
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
import { nested } from "../fixtures/nested.ts";

const empty: Diagram = { grafical: 1, title: "T", density: "normal", layers: [], edges: [] };

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

const base: Diagram = ok(empty, [
  { op: "layer.add", id: "r1", label: "R1" },
  { op: "layer.add", id: "r2", label: "R2" },
  { op: "layer.add", id: "r3", label: "R3" },
  { op: "node.add", id: "a", layer: "r1", label: "A" },
  { op: "node.add", id: "b", layer: "r2", label: "B" },
  { op: "node.add", id: "c", layer: "r3", label: "C" },
]).diagram;

const groupOf = (d: Diagram, id: string) =>
  d.layers.flatMap((l) => l.nodes).find((n) => n.id === id)?.group;

describe("file format", () => {
  it("round-trips subtitle, note, groups and node group in a fixed key order", () => {
    const d = ok(base, [
      { op: "diagram.subtitle", text: "One sentence." },
      { op: "diagram.note", text: "Not shown: x." },
      { op: "group.add", id: "g", label: "G", nodes: ["a", "b"] },
    ]).diagram;
    const text = writeDiagram(d);
    expect(text.indexOf("subtitle:")).toBeGreaterThan(text.indexOf("title:"));
    expect(text.indexOf("note:")).toBeGreaterThan(text.indexOf("subtitle:"));
    expect(text.indexOf("note:")).toBeLessThan(text.indexOf("density:"));
    expect(text.indexOf("groups:")).toBeGreaterThan(text.indexOf("layers:"));
    expect(text.indexOf("groups:")).toBeLessThan(text.indexOf("edges:"));
    expect(text).toMatch(/- id: a\n {8}label: A\n {8}kind: service\n {8}group: g\n/);
    const back = readDiagram(text);
    expect(back).toEqual(d);
    expect(writeDiagram(back as Diagram)).toBe(text);
  });

  it("omits absent fields, so an old file stays byte-identical", () => {
    const text = writeDiagram(base);
    expect(text).not.toMatch(/subtitle|note|groups|group:/);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });

  it("rejects a file whose node names a missing group", () => {
    const bad = structuredClone(base);
    const first = bad.layers[0]?.nodes[0];
    if (first) first.group = "nope";
    const r = readDiagram(writeDiagram(bad)) as OpError[];
    expect(r[0]?.code).toBe("unknown-group");
    expect(r[0]?.code).toBe("unknown-group");
  });

  it('round-trips a group inside a group, with in after the label (DESIGN.md, "Every layered diagram type")', () => {
    const text = writeDiagram(nested);
    expect(text).toContain("  - id: vpc\n    label: shop network\n    in: region\n");
    expect(readDiagram(text)).toEqual(nested);
  });

  it('rejects a group in a missing group, in itself, or four deep (DESIGN.md, "Every layered diagram type")', () => {
    const withGroups = (groups: NonNullable<Diagram["groups"]>) =>
      readDiagram(writeDiagram({ ...nested, groups })) as OpError[];
    const parents = (nested.groups ?? []).filter((g) => g.id !== "public" && g.id !== "private");
    expect(
      withGroups([
        ...parents,
        { id: "public", label: "P", in: "nope" },
        { id: "private", label: "Q" },
      ])[0]?.code,
    ).toBe("unknown-group");
    expect(
      withGroups([
        { id: "region", label: "R", in: "private" },
        { id: "vpc", label: "V", in: "region" },
        { id: "public", label: "P", in: "vpc" },
        { id: "private", label: "Q", in: "vpc" },
      ]).map((e) => e.code),
    ).toContain("group-cycle");
    expect(
      withGroups([...(nested.groups ?? []), { id: "rack", label: "rack", in: "private" }]).map(
        (e) => e.code,
      ),
    ).toEqual(["group-too-deep"]);
  });

  it("keeps the sublabel a group is added with", () => {
    const d = ok(base, [
      { op: "group.add", id: "g", label: "G", sublabel: "write side", nodes: ["a"] },
    ]);
    expect(d.diagram.groups?.[0]?.sublabel).toBe("write side");
  });

  it("rejects a group id that another element uses", () => {
    const text = `${writeDiagram(base).replace("edges: []", "groups:\n  - id: a\n    label: X\nedges: []")}`;
    const r = readDiagram(text) as OpError[];
    expect(r.map((e) => e.code)).toContain("duplicate-id");
  });
});

describe("group operations", () => {
  it("group.add with nodes, and without", () => {
    const r = ok(base, [
      { op: "group.add", id: "g", label: "G", nodes: ["a", "b"] },
      { op: "group.add", id: "empty", label: "Empty" },
    ]);
    expect(r.diagram.groups).toEqual([
      { id: "g", label: "G" },
      { id: "empty", label: "Empty" },
    ]);
    expect(groupOf(r.diagram, "a")).toBe("g");
    expect(r.changed).toEqual(["g", "a", "b", "empty"]);
    expect(base.groups).toBeUndefined();
  });

  it("group.add refuses a taken id and an unknown node", () => {
    expect(fail(base, [{ op: "group.add", id: "a", label: "G" }])[0]?.code).toBe("duplicate-id");
    const e = fail(base, [{ op: "group.add", id: "g", label: "G", nodes: ["zz"] }]);
    expect(e[0]).toMatchObject({ code: "unknown-node", field: "nodes" });
  });

  it("group.join moves a node between groups, group.leave frees it", () => {
    const d1 = ok(base, [
      { op: "group.add", id: "g", label: "G", nodes: ["a"] },
      { op: "group.add", id: "h", label: "H" },
    ]).diagram;
    const d2 = ok(d1, [{ op: "group.join", group: "h", nodes: ["a", "b"] }]).diagram;
    expect(groupOf(d2, "a")).toBe("h");
    expect(groupOf(d2, "b")).toBe("h");
    const d3 = ok(d2, [{ op: "group.leave", nodes: ["a", "c"] }]);
    expect(groupOf(d3.diagram, "a")).toBeUndefined();
    expect(d3.changed).toEqual(["a"]);
    expect(fail(d1, [{ op: "group.join", group: "x", nodes: ["a"] }])[0]).toMatchObject({
      code: "unknown-group",
      field: "group",
    });
    expect(fail(d1, [{ op: "group.leave", nodes: ["zz"] }])[0]?.code).toBe("unknown-node");
  });

  it("group.rename and group.remove keep the members", () => {
    const d1 = ok(base, [{ op: "group.add", id: "g", label: "G", nodes: ["a", "b"] }]).diagram;
    const d2 = ok(d1, [{ op: "group.rename", id: "g", label: "New" }]).diagram;
    expect(d2.groups?.[0]?.label).toBe("New");
    const d3 = ok(d2, [{ op: "group.remove", id: "g" }]);
    expect(d3.diagram.groups).toBeUndefined();
    expect(groupOf(d3.diagram, "a")).toBeUndefined();
    expect(d3.changed).toEqual(["g", "a", "b"]);
    expect(fail(d1, [{ op: "group.remove", id: "zz" }])[0]?.code).toBe("unknown-group");
    expect(fail(d1, [{ op: "group.rename", id: "zz", label: "x" }])[0]?.code).toBe("unknown-group");
  });

  it("a group's box spans a row it has no member in, and that row's nodes sit beside it (DESIGN.md, \"Rows unseen, groups as systems\")", async () => {
    const d = ok(base, [{ op: "group.add", id: "g", label: "G", nodes: ["a", "c"] }]).diagram;
    const real = await createMeasurer();
    const s = layout(d, real);
    const box = s.groups?.find((x) => x.id === "g")?.rect;
    const b = s.nodes.find((n) => n.id === "b")?.rect;
    if (box === undefined || b === undefined) throw new Error("missing box");
    // b's row lies within the box's height, and b outside its width.
    expect(b.y).toBeGreaterThan(box.y);
    expect(b.y + b.h).toBeLessThan(box.y + box.h);
    expect(b.x >= box.x + box.w || b.x + b.w <= box.x).toBe(true);
    expect(check(d, s, real)).toEqual([]);
    // A member may leave the middle row too.
    const d2 = ok(d, [{ op: "group.join", group: "g", nodes: ["b"] }]).diagram;
    expect(groupOf(ok(d2, [{ op: "group.leave", nodes: ["b"] }]).diagram, "b")).toBeUndefined();
  });

  it('group-split: a non-member between members in one row is refused by the layout (DESIGN.md, "Rows unseen, groups as systems")', () => {
    const row = ok(empty, [
      { op: "layer.add", id: "r", label: "R" },
      { op: "node.add", id: "x", layer: "r", label: "X", last: true },
      { op: "node.add", id: "y", layer: "r", label: "Y", last: true },
      { op: "node.add", id: "z", layer: "r", label: "Z", last: true },
    ]).diagram;
    const e = fail(row, [{ op: "group.add", id: "g", label: "G", nodes: ["x", "z"] }]);
    expect(e[0]).toMatchObject({ code: "group-split", field: "group" });
    expect(e[0]).toMatchObject({ found: "y", facts: { group: "g", row: "r" } });
    // The node in between either joins, or goes out to one side of the members.
    expect(e[0]?.facts?.fix).toEqual([
      "group join <file> g y",
      "node move <file> y --before x",
      "node move <file> y --after z",
    ]);
    // Joining the node in between, or grouping neighbours, is fine.
    ok(row, [{ op: "group.add", id: "g", label: "G", nodes: ["x", "y", "z"] }]);
    ok(row, [{ op: "group.add", id: "g", label: "G", nodes: ["x", "y"] }]);
  });

  it("group-split: a box placed by steps is told to take the row with --layer, beside a member in it", () => {
    // c hangs right of y; swapping x and y puts c between the group's members.
    const row = ok(empty, [
      { op: "layer.add", id: "r", label: "R" },
      { op: "node.add", id: "x", layer: "r", label: "X", last: true },
      { op: "node.add", id: "y", layer: "r", label: "Y", last: true },
      { op: "node.add", id: "z", layer: "r", label: "Z", last: true },
      { op: "node.add", id: "c", label: "C", from: "y", right: 1 },
      { op: "group.add", id: "g", label: "G", nodes: ["x", "y"] },
    ]).diagram;
    const swap: Op = { op: "node.swap", a: "x", b: "y" };
    const e = fail(row, [swap]);
    expect(e[0]).toMatchObject({ code: "group-split", found: "c" });
    expect(e[0]?.facts?.fix).toEqual([
      "group join <file> g c",
      "node move <file> c --layer r --before y",
      "node move <file> c --layer r --after x",
    ]);
    // Each fix, after the swap, is a change grafical accepts.
    ok(row, [swap, { op: "group.join", group: "g", nodes: ["c"] }]);
    ok(row, [swap, { op: "node.move", id: "c", layer: "r", before: "y" }]);
    ok(row, [swap, { op: "node.move", id: "c", layer: "r", after: "x" }]);
  });

  it("group-split in nested groups: join the innermost around the box, or go out past the outermost", () => {
    const row = ok(empty, [
      { op: "layer.add", id: "r", label: "R" },
      { op: "node.add", id: "a", layer: "r", label: "A", last: true },
      { op: "node.add", id: "b", layer: "r", label: "B", last: true },
      { op: "node.add", id: "x", layer: "r", label: "X", last: true },
      { op: "node.add", id: "d", layer: "r", label: "D", last: true },
      { op: "group.add", id: "outer", label: "Outer", nodes: ["a"] },
    ]).diagram;
    const inner: Op = {
      op: "group.add",
      id: "inner",
      label: "Inner",
      nodes: ["b", "d"],
      in: "outer",
    };
    const e = fail(row, [inner]);
    expect(e[0]).toMatchObject({ code: "group-split", found: "x" });
    // Joining the outer group alone, or a place between a and b, would leave x inside the inner one.
    expect(e[0]?.facts?.fix).toEqual([
      "group join <file> inner x",
      "node move <file> x --before a",
      "node move <file> x --after d",
    ]);
    ok(row, [inner, { op: "group.join", group: "inner", nodes: ["x"] }]);
    ok(row, [inner, { op: "node.move", id: "x", layer: "r", before: "a" }]);
    ok(row, [inner, { op: "node.move", id: "x", layer: "r", after: "d" }]);
  });

  it("node.remove keeps the group, even empty", () => {
    const d1 = ok(base, [{ op: "group.add", id: "g", label: "G", nodes: ["a"] }]).diagram;
    const d2 = ok(d1, [{ op: "node.remove", id: "a" }]).diagram;
    expect(d2.groups).toEqual([{ id: "g", label: "G" }]);
  });

  it("parses batch items, and reports an empty node list", () => {
    expect(parseOp({ op: "group.join", group: "g", nodes: ["a"] }, 0)).toEqual({
      op: "group.join",
      group: "g",
      nodes: ["a"],
    });
    expect((parseOp({ op: "group.leave", nodes: [] }, 0) as OpError[])[0]?.code).toBe(
      "empty-value",
    );
    expect(
      (parseOp({ op: "group.add", id: "g", label: "x", lable: "x" }, 0) as OpError[])[0]?.code,
    ).toBe("unknown-field");
  });
});

describe('groups inside groups (DESIGN.md, "Every layered diagram type")', () => {
  const parentOf = (d: Diagram, id: string) => d.groups?.find((g) => g.id === id)?.in;
  const groupOfNode = (d: Diagram, id: string) =>
    d.layers.flatMap((l) => l.nodes).find((n) => n.id === id)?.group;

  it("adds a group inside another, and refuses a fourth level or a missing parent", () => {
    const d = ok(nested, [{ op: "group.add", id: "zone", label: "zone b", in: "region" }]).diagram;
    expect(parentOf(d, "zone")).toBe("region");
    expect(
      fail(nested, [{ op: "group.add", id: "rack", label: "rack", in: "private" }])[0]?.code,
    ).toBe("group-too-deep");
    expect(
      fail(nested, [{ op: "group.add", id: "rack", label: "rack", in: "nope" }])[0],
    ).toMatchObject({
      code: "unknown-group",
      field: "in",
    });
  });

  it("moves a group, with everything in it, by join and leave", () => {
    const joined = ok(nested, [{ op: "group.join", group: "region", nodes: ["public"] }]).diagram;
    expect(parentOf(joined, "public")).toBe("region");
    expect(groupOfNode(joined, "lb")).toBe("public");
    const left = ok(nested, [{ op: "group.leave", nodes: ["public"] }]).diagram;
    expect(parentOf(left, "public")).toBeUndefined();
    const up = ok(nested, [{ op: "group.leave", nodes: ["public"], up: true }]).diagram;
    expect(parentOf(up, "public")).toBe("region");
    expect(fail(nested, [{ op: "group.join", group: "public", nodes: ["vpc"] }])[0]?.code).toBe(
      "group-cycle",
    );
    const zone = ok(nested, [
      { op: "group.add", id: "zone", label: "zone b", in: "region" },
    ]).diagram;
    expect(fail(zone, [{ op: "group.join", group: "zone", nodes: ["vpc"] }])[0]?.code).toBe(
      "group-too-deep",
    );
  });

  it("takes a node out of every group, or one level out with up", () => {
    expect(
      groupOfNode(ok(nested, [{ op: "group.leave", nodes: ["api"] }]).diagram, "api"),
    ).toBeUndefined();
    expect(
      groupOfNode(ok(nested, [{ op: "group.leave", nodes: ["api"], up: true }]).diagram, "api"),
    ).toBe("vpc");
  });

  it("moves a removed group's nodes and inner groups into the group around it, or out of every group", () => {
    const d = ok(nested, [{ op: "group.remove", id: "vpc" }]).diagram;
    expect(parentOf(d, "public")).toBe("region");
    expect(parentOf(d, "private")).toBe("region");
    const p = ok(nested, [{ op: "group.remove", id: "private" }]).diagram;
    expect(groupOfNode(p, "api")).toBe("vpc");
    const out = ok(nested, [{ op: "group.remove", id: "private", out: true }]).diagram;
    expect(groupOfNode(out, "api")).toBeUndefined();
    const all = ok(nested, [{ op: "group.remove", id: "vpc", out: true }]).diagram;
    expect(parentOf(all, "public")).toBeUndefined();
  });
});

describe("diagram.subtitle and diagram.note", () => {
  it("set, replace and clear", () => {
    const d1 = ok(base, [{ op: "diagram.subtitle", text: "Hello." }]).diagram;
    expect(d1.subtitle).toBe("Hello.");
    const d2 = ok(d1, [{ op: "diagram.note", text: "Not shown: x." }]).diagram;
    expect(d2.note).toBe("Not shown: x.");
    const d3 = ok(d2, [{ op: "diagram.subtitle" }, { op: "diagram.note" }]).diagram;
    expect(d3.subtitle).toBeUndefined();
    expect(d3.note).toBeUndefined();
    expect(writeDiagram(d3)).toBe(writeDiagram(base));
  });

  it("diagram.new takes them", () => {
    const d = ok(null, [{ op: "diagram.new", title: "T", subtitle: "S", note: "N" }]).diagram;
    expect(d).toMatchObject({ subtitle: "S", note: "N" });
  });
});
