import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { fits } from "../../src/layout/size.ts";
import {
  applyOps,
  type Diagram,
  type Op,
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
const empty: Diagram = { grafical: 1, title: "T", density: "normal", layers: [], edges: [] };

function ok(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

function one(label: string, extra: Partial<Extract<Op, { op: "node.add" }>> = {}): Diagram {
  return ok(empty, [
    { op: "layer.add", id: "r", label: "R" },
    { op: "node.add", id: "a", layer: "r", label, ...extra },
  ]);
}

const width = (d: Diagram) => layout(d, m).nodes[0]?.rect.w;
const overflow = (d: Diagram) =>
  check(d, layout(d, m), m).filter((x) => x.code === "overflow").length;

describe('auto size (DESIGN.md, "Boxes sized to their text")', () => {
  it("gives a node with no size a medium box, or a large one when its text needs it", () => {
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
    const short = ok(d, [{ op: "node.rename", id: "a", label: "API" }]);
    expect(width(short)).toBe(BOX.m.w);
  });

  it("node.resize sets a size, and without one hands it back to the engine", () => {
    const d = ok(one(LONG), [{ op: "node.resize", id: "a", size: "s" }]);
    expect(d.layers[0]?.nodes[0]?.size).toBe("s");
    expect(writeDiagram(d)).toContain("size: s");
    const back = ok(d, [{ op: "node.resize", id: "a" }]);
    expect(back.layers[0]?.nodes[0]?.size).toBeUndefined();
    expect(width(back)).toBe(BOX.l.w);
  });

  it("an explicit medium size round-trips", () => {
    const text = writeDiagram(one("API", { size: "m" }));
    expect(text).toContain("size: m");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });
});

describe('sizing fixed (DESIGN.md, "Boxes sized to their text")', () => {
  it("makes nodes with no size medium, as before, so that long text overflows", () => {
    const d = ok(one(LONG), [{ op: "diagram.sizing", mode: "fixed" }]);
    expect(width(d)).toBe(BOX.m.w);
    const found = check(d, layout(d, m), m).filter((x) => x.code === "overflow");
    expect(found.map((x) => x.elements)).toContainEqual(["a"]);
  });

  it("is written after density, and auto clears it", () => {
    const d = ok(one("API"), [{ op: "diagram.sizing", mode: "fixed" }]);
    const text = writeDiagram(d);
    expect(text).toMatch(/density: normal\nsizing: fixed\nlayers:/);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    const auto = ok(d, [{ op: "diagram.sizing", mode: "auto" }]);
    expect(writeDiagram(auto)).not.toContain("sizing");
  });

  it("diagram.new takes it", () => {
    const r = applyOps(null, [{ op: "diagram.new", title: "T", sizing: "fixed" }]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    expect(r.diagram.sizing).toBe("fixed");
  });
});
