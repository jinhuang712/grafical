// Walls in the picture (DESIGN.md D43): space where they run, a dashed divider when
// labelled, and a line through one that it does not allow.

import { beforeAll, describe, expect, it } from "vitest";
import { drawing, drawingText } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import type { Rect } from "../../src/scene.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { WALL } from "../../src/theme/geometry.ts";
import { catalogSyncGrouped as fx } from "../fixtures/catalog-sync-grouped.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function ok(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

const net = (label?: string): Op => ({
  op: "wall.add",
  id: "net",
  between: ["upstream", "callers"],
  and: ["catalog-sync", "catalog-api"],
  allow: ["relay", "handlers"],
  ...(label === undefined ? {} : { label }),
});

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe("a wall across (D43)", () => {
  it("is space below the upper side's lowest row, as long as the sides' boxes", () => {
    const before = layout(fx, m);
    const scene = layout(ok(fx, [net()]), m);
    const wall = scene.walls?.[0];
    expect(wall).toMatchObject({ id: "net", run: "across", rect: { h: WALL.space } });
    if (wall === undefined) throw new Error("no wall");
    const node = (s: typeof scene, id: string) => s.nodes.find((n) => n.id === id)?.rect as Rect;
    // The row above keeps its place; the rows below move down by the wall's space.
    expect(node(scene, "upstream").y).toBe(node(before, "upstream").y);
    expect(node(scene, "relay").y - node(before, "relay").y).toBeGreaterThanOrEqual(WALL.space);
    expect(wall.rect.y).toBeGreaterThanOrEqual(
      node(scene, "upstream").y + node(scene, "upstream").h,
    );
    // Nothing is placed in it: no box, and no group's box or label.
    for (const n of scene.nodes) expect(overlaps(n.rect, wall.rect)).toBe(false);
    for (const g of scene.groups ?? []) {
      expect(overlaps(g.rect, wall.rect)).toBe(false);
      expect(overlaps(g.label.bbox, wall.rect)).toBe(false);
    }
    // From the leftmost box of either side to the rightmost, and a reach past them.
    const groups = (scene.groups ?? []).filter(
      (g) => g.id === "catalog-sync" || g.id === "catalog-api",
    );
    const left = Math.min(node(scene, "upstream").x, ...groups.map((g) => g.rect.x));
    expect(wall.rect.x).toBe(left - WALL.reach);
    // Without a label it draws nothing.
    expect(wall.line).toBeUndefined();
    expect(wall.label).toBeUndefined();
  });

  it("with a label draws a dashed divider through its middle, the label clear of lines", () => {
    const d = ok(fx, [net("private network")]);
    const scene = layout(d, m);
    const wall = scene.walls?.[0];
    if (wall?.line === undefined || wall.label === undefined) throw new Error("no divider");
    const mid = wall.rect.y + wall.rect.h / 2;
    expect(wall.line).toEqual({
      a: { x: wall.rect.x, y: mid },
      b: { x: wall.rect.x + wall.rect.w, y: mid },
    });
    expect(wall.label.bbox.y + wall.label.bbox.h).toBeLessThanOrEqual(mid);
    expect(wall.label.bbox.y).toBeGreaterThanOrEqual(wall.rect.y);
    expect(check(d, scene, m)).toEqual([]);
  });

  it("reports a line that passes through it, unless it allows the line", () => {
    const d = ok(fx, [
      net(),
      { op: "node.add", id: "ops", layer: "sources", label: "ops console", before: "callers" },
      { op: "edge.add", from: "ops", to: "geo" },
    ]);
    // The line ends at neither side, so only the drawing finds it.
    const found = check(d, layout(d, m), m).filter((x) => x.code === "wall-crossed");
    expect(found).toEqual([
      {
        code: "wall-crossed",
        owner: "agent",
        elements: ["ops->geo", "net"],
        facts: { fix: ["wall allow <file> net ops->geo", "edge remove <file> ops->geo"] },
      },
    ]);
    const allowed = ok(d, [{ op: "wall.allow", id: "net", allow: ["ops"] }]);
    expect(check(allowed, layout(allowed, m), m)).toEqual([]);
  });

  it("show --drawn names how long and thick it is, and the lines through it", () => {
    const d = ok(fx, [net()]);
    const dr = drawing(d, layout(d, m));
    expect(dr.walls).toEqual([
      expect.objectContaining({
        id: "net",
        run: "across",
        space: WALL.space,
        lines: ["callers->handlers", "upstream->relay"],
      }),
    ]);
    expect(drawingText(dr)).toMatch(
      /\nwall id=net run=across length=\d+ space=48 lines=callers->handlers,upstream->relay\n/,
    );
  });
});
