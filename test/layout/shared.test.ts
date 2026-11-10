import { beforeAll, describe, expect, it } from "vitest";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

// Two systems side by side, each with two nodes in a layer, and one store below
// that both use: the shape of a write side and a read side coupled by a database.
const ops: Op[] = [
  { op: "diagram.set", title: "Shared store" },
  { op: "layer.set", ids: ["core"], label: "Core" },
  { op: "layer.set", ids: ["store"], label: "Store" },
  { op: "node.set", ids: ["a1"], layer: "core", label: "a1", last: true },
  { op: "node.set", ids: ["a2"], layer: "core", label: "a2", last: true },
  { op: "node.set", ids: ["b1"], layer: "core", label: "b1", last: true },
  { op: "node.set", ids: ["b2"], layer: "core", label: "b2", last: true },
  { op: "node.set", ids: ["db"], layer: "store", label: "db", type: "store" },
  { op: "group.set", ids: ["write"], label: "write side" },
  { op: "node.set", ids: ["a1", "a2"], group: "write" },
  { op: "group.set", ids: ["read"], label: "read side" },
  { op: "node.set", ids: ["b1", "b2"], group: "read" },
  { op: "edge.set", ids: ["a1-db"], from: "a1", to: "db", label: "persist" },
  { op: "edge.set", ids: ["b2-db"], from: "b2", to: "db", label: "read" },
];

describe('a node that two groups use (specs/decisions, "Layout computed again on every change")', () => {
  it("sits in a column between the two groups, not under either", () => {
    const r = applyOps(null, ops);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    const d: Diagram = r.diagram;
    const scene = layout(d, m);
    const frame = (id: string) => scene.groups?.find((g) => g.id === id)?.rect;
    const db = scene.nodes.find((n) => n.id === "db")?.rect;
    const left = frame("write");
    const right = frame("read");
    if (db === undefined || left === undefined || right === undefined) throw new Error("missing");
    const mid = db.x + db.w / 2;
    expect(mid).toBeGreaterThan(left.x + left.w);
    expect(mid).toBeLessThan(right.x);
  });
});
