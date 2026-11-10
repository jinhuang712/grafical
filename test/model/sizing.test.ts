import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { fits } from "../../src/layout/size.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  type OpOf,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { BOX } from "../../src/theme/geometry.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const LONG = "upstream catalog projection worker pool";
const empty: Diagram = { grafical: 1, title: "T", layers: [], edges: [] };

function ok(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

function one(label: string, extra: Partial<OpOf<"node.set">> = {}): Diagram {
  return ok(empty, [
    { op: "layer.set", ids: ["r"], label: "R" },
    { op: "node.set", ids: ["a"], layer: "r", label, ...extra },
  ]);
}

const width = (d: Diagram) => layout(d, m).nodes[0]?.rect.w;
const overflow = (d: Diagram) =>
  check(d, layout(d, m), m).filter((x) => x.code === "overflow").length;

describe('auto size (specs/decisions, "Nodes sized to their text")', () => {
  it("gives a node with no size a medium node, or a large one when its text needs it", () => {
    expect(fits({ id: "a", label: LONG, kind: "service" }, "m", m)).toBe(false);
    expect(fits({ id: "a", label: LONG, kind: "service" }, "l", m)).toBe(true);
    expect(width(one("API"))).toBe(BOX.m.w);
    expect(width(one(LONG))).toBe(BOX.l.w);
    expect(overflow(one(LONG))).toBe(0);
  });

  it("keeps an explicit size, which may overflow", () => {
    const d = one(LONG, { size: "m" });
    expect(width(d)).toBe(BOX.m.w);
    expect(overflow(d)).toBeGreaterThan(0);
  });

  it("stores no size for an auto node, so a rename can shrink it again", () => {
    const d = one(LONG);
    expect(writeDiagram(d)).not.toContain("size:");
    const short = ok(d, [{ op: "node.set", ids: ["a"], label: "API" }]);
    expect(width(short)).toBe(BOX.m.w);
  });

  it("node.resize sets a size, and without one hands it back to the engine", () => {
    const d = ok(one(LONG), [{ op: "node.set", ids: ["a"], size: "s" }]);
    expect(d.layers[0]?.nodes[0]?.size).toBe("s");
    expect(writeDiagram(d)).toContain("size: s");
    const back = ok(d, [{ op: "node.set", ids: ["a"], size: "-" }]);
    expect(back.layers[0]?.nodes[0]?.size).toBeUndefined();
    expect(width(back)).toBe(BOX.l.w);
  });

  it("an explicit medium size round-trips", () => {
    const text = writeDiagram(one("API", { size: "m" }));
    expect(text).toContain("size: m");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });
});

describe('sizing fixed (specs/decisions, "Nodes sized to their text")', () => {
  it("makes nodes with no size medium, as before, so that long text overflows", () => {
    const d = ok(one(LONG), [{ op: "diagram.set", sizing: "fixed" }]);
    expect(width(d)).toBe(BOX.m.w);
    const found = check(d, layout(d, m), m).filter((x) => x.code === "overflow");
    expect(found.map((x) => x.elements)).toContainEqual(["a"]);
  });

  it("is written last in the diagram's block, and auto clears it", () => {
    const d = ok(one("API"), [{ op: "diagram.set", sizing: "fixed" }]);
    const text = writeDiagram(d);
    expect(text).toMatch(/title: "[^"]*"\n {2}sizing: fixed\n}/);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    const auto = ok(d, [{ op: "diagram.set", sizing: "auto" }]);
    expect(writeDiagram(auto)).not.toContain("sizing");
  });

  it("diagram --set takes it as it makes the file", () => {
    const r = applyOps(null, [{ op: "diagram.set", title: "T", sizing: "fixed" }]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.sizing).toBe("fixed");
  });
});
