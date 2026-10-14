import { beforeAll, describe, expect, it } from "vitest";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

// Two systems side by side, each with two nodes in a row, and one store below
// that both use: the shape of a write side and a read side coupled by a database.
const ops: Op[] = [
  { op: "diagram.new", title: "Shared store" },
  { op: "layer.add", id: "core", label: "Core" },
  { op: "layer.add", id: "store", label: "Store" },
  { op: "node.add", id: "a1", layer: "core", label: "a1", last: true },
  { op: "node.add", id: "a2", layer: "core", label: "a2", last: true },
  { op: "node.add", id: "b1", layer: "core", label: "b1", last: true },
  { op: "node.add", id: "b2", layer: "core", label: "b2", last: true },
  { op: "node.add", id: "db", layer: "store", label: "db", kind: "store" },
  { op: "group.add", id: "write", label: "write side", nodes: ["a1", "a2"] },
  { op: "group.add", id: "read", label: "read side", nodes: ["b1", "b2"] },
  { op: "edge.add", from: "a1", to: "db", label: "persist" },
  { op: "edge.add", from: "b2", to: "db", label: "read" },
];

describe('a node that two groups use (DESIGN.md, "Layout computed again on every change")', () => {
  it("sits in a column between the two groups, not under either", () => {
    const r = applyOps(null, ops, m);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    const d: Diagram = r.diagram;
    const scene = layout(d, m);
    const box = (id: string) => scene.groups?.find((g) => g.id === id)?.rect;
    const db = scene.nodes.find((n) => n.id === "db")?.rect;
    const left = box("write");
    const right = box("read");
    if (db === undefined || left === undefined || right === undefined) throw new Error("missing");
    const mid = db.x + db.w / 2;
    expect(mid).toBeGreaterThan(left.x + left.w);
    expect(mid).toBeLessThan(right.x);
  });
});
