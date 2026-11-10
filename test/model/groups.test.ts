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
  validateDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { nested } from "../fixtures/nested.ts";

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

const base: Diagram = ok(empty, [
  { op: "layer.set", ids: ["r1"], label: "R1" },
  { op: "layer.set", ids: ["r2"], label: "R2" },
  { op: "layer.set", ids: ["r3"], label: "R3" },
  { op: "node.set", ids: ["a"], layer: "r1", label: "A" },
  { op: "node.set", ids: ["b"], layer: "r2", label: "B" },
  { op: "node.set", ids: ["c"], layer: "r3", label: "C" },
]).diagram;

const groupOf = (d: Diagram, id: string) =>
  d.layers.flatMap((l) => l.nodes).find((n) => n.id === id)?.group;

describe("file format", () => {
  it("round-trips subtitle, note, groups and node group in a fixed key order", () => {
    const d = ok(base, [
      { op: "diagram.set", subtitle: "One sentence." },
      { op: "diagram.set", caption: "Not shown: x." },
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["a", "b"], group: "g" },
    ]).diagram;
    const text = writeDiagram(d);
    expect(text.indexOf("subtitle:")).toBeGreaterThan(text.indexOf("title:"));
    expect(text.indexOf("caption:")).toBeGreaterThan(text.indexOf("subtitle:"));
    expect(text.indexOf("<group> g {")).toBeGreaterThan(text.indexOf("<layer> r1 {"));
    expect(text.indexOf("<group> g {")).toBeLessThan(text.indexOf("<order> layers {"));
    expect(text).toMatch(
      /<node> a \{\n {2}type: @service\n {2}text: "A"\n {2}layer: @r1\n {2}group: @g\n/,
    );
    const back = readDiagram(text);
    expect(back).toEqual(d);
    expect(writeDiagram(back as Diagram)).toBe(text);
  });

  it("omits absent fields, so an old file stays byte-identical", () => {
    const text = writeDiagram(base);
    expect(text).not.toMatch(/subtitle|caption|groups|group:/);
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

  it('round-trips a group inside a group, with in after the label (specs/decisions, "Every layered diagram type")', () => {
    const text = writeDiagram(nested);
    expect(text).toContain("<group> vpc {\n  in: @region\n}");
    expect(readDiagram(text)).toEqual(nested);
  });

  it('rejects a group in a missing group, in itself, or four deep (specs/decisions, "Every layered diagram type")', () => {
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
      { op: "group.set", ids: ["g"], label: "G", sublabel: "write side" },
      { op: "node.set", ids: ["a"], group: "g" },
    ]);
    expect(d.diagram.groups?.[0]?.sublabel).toBe("write side");
  });

  it("rejects a group id that another element uses", () => {
    const clash = { ...structuredClone(base), groups: [{ id: "a", label: "X" }] };
    const r = validateDiagram(clash) as OpError[];
    expect(r.map((e) => e.code)).toContain("duplicate-id");
  });
});

describe("group operations", () => {
  it("group --set, with nodes that join it, and without", () => {
    const r = ok(base, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["a", "b"], group: "g" },
      { op: "group.set", ids: ["empty"], label: "Empty" },
    ]);
    expect(r.diagram.groups).toEqual([
      { id: "g", label: "G" },
      { id: "empty", label: "Empty" },
    ]);
    expect(groupOf(r.diagram, "a")).toBe("g");
    expect(r.changed).toEqual(["g", "a", "b", "empty"]);
    expect(base.groups).toBeUndefined();
  });

  it("group --set refuses a taken id, and a node joins only once made", () => {
    expect(fail(base, [{ op: "group.set", ids: ["a"], label: "G" }])[0]?.code).toBe("duplicate-id");
    const e = fail(base, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["zz"], group: "g" },
    ]);
    // An id no node has makes a node, which needs a label.
    expect(e[0]).toMatchObject({ code: "missing-field", field: "label" });
  });

  it("node --set --group moves a node between groups, and - frees it", () => {
    const d1 = ok(base, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["a"], group: "g" },
      { op: "group.set", ids: ["h"], label: "H" },
    ]).diagram;
    const d2 = ok(d1, [{ op: "node.set", ids: ["a", "b"], group: "h" }]).diagram;
    expect(groupOf(d2, "a")).toBe("h");
    expect(groupOf(d2, "b")).toBe("h");
    const d3 = ok(d2, [{ op: "node.set", ids: ["a", "c"], group: "-" }]);
    expect(groupOf(d3.diagram, "a")).toBeUndefined();
    expect(d3.changed).toEqual(["a"]);
    expect(fail(d1, [{ op: "node.set", ids: ["a"], group: "x" }])[0]).toMatchObject({
      code: "unknown-group",
      field: "group",
    });
    expect(fail(d1, [{ op: "node.set", ids: ["zz"], group: "-" }])[0]?.code).toBe("missing-field");
  });

  it("a new label and group --remove keep the members", () => {
    const d1 = ok(base, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["a", "b"], group: "g" },
    ]).diagram;
    const d2 = ok(d1, [{ op: "group.set", ids: ["g"], label: "New" }]).diagram;
    expect(d2.groups?.[0]?.label).toBe("New");
    const d3 = ok(d2, [{ op: "group.remove", ids: ["g"] }]);
    expect(d3.diagram.groups).toBeUndefined();
    expect(groupOf(d3.diagram, "a")).toBeUndefined();
    expect(d3.changed).toEqual(["g", "a", "b"]);
    expect(fail(d1, [{ op: "group.remove", ids: ["zz"] }])[0]?.code).toBe("unknown-group");
    const made = ok(d1, [{ op: "group.set", ids: ["zz"], label: "x" }]).diagram;
    expect(made.groups?.map((g) => g.id)).toEqual(["g", "zz"]);
  });

  it("a group's frame spans a layer it has no member in, and that layer's nodes sit beside it (specs/decisions, \"Layers unseen, groups as systems\")", async () => {
    const d = ok(base, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["a", "c"], group: "g" },
    ]).diagram;
    const real = await createMeasurer();
    const s = layout(d, real);
    const frame = s.groups?.find((x) => x.id === "g")?.rect;
    const b = s.nodes.find((n) => n.id === "b")?.rect;
    if (frame === undefined || b === undefined) throw new Error("missing box");
    // b's layer lies within the frame's height, and b outside its width.
    expect(b.y).toBeGreaterThan(frame.y);
    expect(b.y + b.h).toBeLessThan(frame.y + frame.h);
    expect(b.x >= frame.x + frame.w || b.x + b.w <= frame.x).toBe(true);
    expect(check(d, s, real)).toEqual([]);
    // A member may leave the middle layer too.
    const d2 = ok(d, [{ op: "node.set", ids: ["b"], group: "g" }]).diagram;
    expect(
      groupOf(ok(d2, [{ op: "node.set", ids: ["b"], group: "-" }]).diagram, "b"),
    ).toBeUndefined();
  });

  it('group-split: a non-member between members in one layer is refused by the layout (specs/decisions, "Layers unseen, groups as systems")', () => {
    const withLayer = ok(empty, [
      { op: "layer.set", ids: ["r"], label: "R" },
      { op: "node.set", ids: ["x"], layer: "r", label: "X", last: true },
      { op: "node.set", ids: ["y"], layer: "r", label: "Y", last: true },
      { op: "node.set", ids: ["z"], layer: "r", label: "Z", last: true },
    ]).diagram;
    const e = fail(withLayer, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["x", "z"], group: "g" },
    ]);
    // No field of the operation is at fault: the facts say which node stands between which members.
    expect(e[0]).toEqual({
      code: "group-split",
      index: 1,
      found: "",
      facts: { node: "y", layer: "r", group: "g", between: ["x", "z"] },
      whole: true,
      // The groups' check runs third, after the integrity and the alignments of the whole diagram.
      stage: 3,
    });
    // Joining the node in between, or grouping neighbours, is fine.
    ok(withLayer, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["x", "y", "z"], group: "g" },
    ]);
    ok(withLayer, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["x", "y"], group: "g" },
    ]);
  });

  it("group-split: a node placed by steps between members is named, and may join or take a layer", () => {
    // c hangs right of y; swapping x and y puts c between the group's members.
    const withLayer = ok(empty, [
      { op: "layer.set", ids: ["r"], label: "R" },
      { op: "node.set", ids: ["x"], layer: "r", label: "X", last: true },
      { op: "node.set", ids: ["y"], layer: "r", label: "Y", last: true },
      { op: "node.set", ids: ["z"], layer: "r", label: "Z", last: true },
      { op: "node.set", ids: ["c"], label: "C", from: "y", right: "1" },
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["x", "y"], group: "g" },
    ]).diagram;
    const swap: Op = { op: "node.move", ids: ["x"], layer: "r", after: "y" };
    const e = fail(withLayer, [swap]);
    expect(e[0]).toMatchObject({
      code: "group-split",
      facts: { node: "c", layer: "r", group: "g", between: ["y", "x"] },
    });
    // Joining the group, or taking a place in the layer beside it, before the swap, is a change grafical accepts.
    ok(withLayer, [{ op: "node.set", ids: ["c"], group: "g" }, swap]);
    ok(withLayer, [{ op: "node.move", ids: ["c"], layer: "r", first: true }, swap]);
    ok(withLayer, [{ op: "node.move", ids: ["c"], layer: "r", last: true }, swap]);
  });

  it("group-split in nested groups names the innermost group around the node", () => {
    const withLayer = ok(empty, [
      { op: "layer.set", ids: ["r"], label: "R" },
      { op: "node.set", ids: ["a"], layer: "r", label: "A", last: true },
      { op: "node.set", ids: ["b"], layer: "r", label: "B", last: true },
      { op: "node.set", ids: ["x"], layer: "r", label: "X", last: true },
      { op: "node.set", ids: ["d"], layer: "r", label: "D", last: true },
      { op: "group.set", ids: ["outer"], label: "Outer" },
      { op: "node.set", ids: ["a"], group: "outer" },
    ]).diagram;
    const made: Op = { op: "group.set", ids: ["inner"], label: "Inner", in: "outer" };
    const inner: Op[] = [made, { op: "node.set", ids: ["b", "d"], group: "inner" }];
    const e = fail(withLayer, inner);
    // Joining the outer group alone, or a place between a and b, would leave x inside the inner one.
    expect(e[0]).toMatchObject({
      code: "group-split",
      facts: { node: "x", layer: "r", group: "inner", between: ["b", "d"] },
    });
    ok(withLayer, [made, { op: "node.set", ids: ["b", "x", "d"], group: "inner" }]);
    ok(withLayer, [{ op: "node.move", ids: ["x"], layer: "r", before: "a" }, ...inner]);
    ok(withLayer, [{ op: "node.move", ids: ["x"], layer: "r", after: "d" }, ...inner]);
  });

  it("node.remove keeps the group, even empty", () => {
    const d1 = ok(base, [
      { op: "group.set", ids: ["g"], label: "G" },
      { op: "node.set", ids: ["a"], group: "g" },
    ]).diagram;
    const d2 = ok(d1, [{ op: "node.remove", ids: ["a"] }]).diagram;
    expect(d2.groups).toEqual([{ id: "g", label: "G" }]);
  });

  it("parses operation items, and reports an empty id list", () => {
    expect(parseOp({ op: "node.set", ids: ["a"], group: "g" }, 0)).toEqual({
      op: "node.set",
      ids: ["a"],
      group: "g",
    });
    expect((parseOp({ op: "node.set", ids: [], group: "-" }, 0) as OpError[])[0]?.code).toBe(
      "empty-value",
    );
    expect(
      (parseOp({ op: "group.set", ids: ["g"], label: "x", lable: "x" }, 0) as OpError[])[0]?.code,
    ).toBe("unknown-field");
  });
});

describe('groups inside groups (specs/decisions, "Every layered diagram type")', () => {
  const parentOf = (d: Diagram, id: string) => d.groups?.find((g) => g.id === id)?.in;
  const groupOfNode = (d: Diagram, id: string) =>
    d.layers.flatMap((l) => l.nodes).find((n) => n.id === id)?.group;

  it("adds a group inside another, and refuses a fourth level or a missing parent", () => {
    const d = ok(nested, [
      { op: "group.set", ids: ["zone"], label: "zone b", in: "region" },
    ]).diagram;
    expect(parentOf(d, "zone")).toBe("region");
    expect(
      fail(nested, [{ op: "group.set", ids: ["rack"], label: "rack", in: "private" }])[0]?.code,
    ).toBe("group-too-deep");
    expect(
      fail(nested, [{ op: "group.set", ids: ["rack"], label: "rack", in: "nope" }])[0],
    ).toMatchObject({
      code: "unknown-group",
      field: "in",
    });
  });

  it("moves a group, with everything in it, by --in", () => {
    const joined = ok(nested, [{ op: "group.set", ids: ["public"], in: "region" }]).diagram;
    expect(parentOf(joined, "public")).toBe("region");
    expect(groupOfNode(joined, "lb")).toBe("public");
    const left = ok(nested, [{ op: "group.set", ids: ["public"], in: "-" }]).diagram;
    expect(parentOf(left, "public")).toBeUndefined();
    const up = ok(nested, [{ op: "group.set", ids: ["public"], in: "region" }]).diagram;
    expect(parentOf(up, "public")).toBe("region");
    expect(fail(nested, [{ op: "group.set", ids: ["vpc"], in: "public" }])[0]?.code).toBe(
      "group-cycle",
    );
    const zone = ok(nested, [
      { op: "group.set", ids: ["zone"], label: "zone b", in: "region" },
    ]).diagram;
    expect(fail(zone, [{ op: "group.set", ids: ["vpc"], in: "zone" }])[0]?.code).toBe(
      "group-too-deep",
    );
  });

  it("takes a node out of every group, or one level out into the group around", () => {
    expect(
      groupOfNode(ok(nested, [{ op: "node.set", ids: ["api"], group: "-" }]).diagram, "api"),
    ).toBeUndefined();
    expect(
      groupOfNode(ok(nested, [{ op: "node.set", ids: ["api"], group: "vpc" }]).diagram, "api"),
    ).toBe("vpc");
  });

  it("moves a removed group's nodes and inner groups into the group around it, or out of every group", () => {
    const d = ok(nested, [{ op: "group.remove", ids: ["vpc"] }]).diagram;
    expect(parentOf(d, "public")).toBe("region");
    expect(parentOf(d, "private")).toBe("region");
    const p = ok(nested, [{ op: "group.remove", ids: ["private"] }]).diagram;
    expect(groupOfNode(p, "api")).toBe("vpc");
    const out = ok(nested, [{ op: "group.remove", ids: ["private"], out: true }]).diagram;
    expect(groupOfNode(out, "api")).toBeUndefined();
    const all = ok(nested, [{ op: "group.remove", ids: ["vpc"], out: true }]).diagram;
    expect(parentOf(all, "public")).toBeUndefined();
  });
});

describe("the diagram's subtitle and caption", () => {
  it("set, replace and clear", () => {
    const d1 = ok(base, [{ op: "diagram.set", subtitle: "Hello." }]).diagram;
    expect(d1.subtitle).toBe("Hello.");
    const d2 = ok(d1, [{ op: "diagram.set", caption: "Not shown: x." }]).diagram;
    expect(d2.caption).toBe("Not shown: x.");
    const d3 = ok(d2, [
      { op: "diagram.set", subtitle: "-" },
      { op: "diagram.set", caption: "-" },
    ]).diagram;
    expect(d3.subtitle).toBeUndefined();
    expect(d3.caption).toBeUndefined();
    expect(writeDiagram(d3)).toBe(writeDiagram(base));
  });

  it("diagram --set takes them as it makes the file", () => {
    const d = ok(null, [{ op: "diagram.set", title: "T", subtitle: "S", caption: "N" }]).diagram;
    expect(d).toMatchObject({ subtitle: "S", caption: "N" });
  });
});
