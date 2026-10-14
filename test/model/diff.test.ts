import { beforeAll, describe, expect, it, vi } from "vitest";
import { diffDiagrams } from "../../src/model/diff.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import { writeDiagram } from "../../src/model/io.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { nested } from "../fixtures/nested.ts";
import { generate } from "../fuzz/gen.ts";

// Lays out many random diagrams: slower CI machines need more than the default 5 s.
vi.setConfig({ testTimeout: 60_000 });

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function edited(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

/** Applies the diff of a and b to a, and checks that it gives b, file for file. */
function replays(a: Diagram | null, b: Diagram): void {
  const r = applyOps(a, diffDiagrams(a, b));
  if ("errors" in r) throw new Error(JSON.stringify(r.errors.slice(0, 3)));
  expect(writeDiagram(r.diagram)).toBe(writeDiagram(b));
}

describe('diff as operations (DESIGN.md, "Git as the history")', () => {
  it("reports nothing for the same diagram", () => {
    expect(diffDiagrams(catalogSyncGrouped, structuredClone(catalogSyncGrouped))).toEqual([]);
  });

  it("names exactly the operation that made a small change", () => {
    const cases: Op[] = [
      { op: "node.rename", id: "relay", label: "catalog relay" },
      { op: "node.move", id: "admin", after: "relay" },
      { op: "edge.relabel", id: "relay->line_topics", label: "per line" },
      { op: "group.rename", id: "catalog-api", label: "read side" },
      { op: "layer.rename", id: "deps", label: "Dependencies" },
      { op: "diagram.title", text: "Catalog" },
    ];
    for (const op of cases) {
      expect(diffDiagrams(catalogSyncGrouped, edited(catalogSyncGrouped, [op]))).toEqual([op]);
    }
  });

  it("reports an added edge and a removed node with its edges", () => {
    const added = edited(catalogSyncGrouped, [{ op: "edge.add", from: "admin", to: "mongo" }]);
    expect(diffDiagrams(catalogSyncGrouped, added)).toEqual([
      { op: "edge.add", from: "admin", to: "mongo", kind: "call" },
    ]);
    const removed = edited(catalogSyncGrouped, [{ op: "node.remove", id: "geo" }]);
    expect(diffDiagrams(catalogSyncGrouped, removed)).toEqual([
      { op: "edge.remove", id: "pipelines->geo" },
      { op: "node.remove", id: "geo" },
    ]);
  });

  it('replays groups that move between groups, and removed groups that held others (DESIGN.md, "Every layered diagram type")', () => {
    const moved = edited(nested, [
      { op: "group.join", group: "region", nodes: ["public"] },
      { op: "group.leave", nodes: ["api"], up: true },
    ]);
    const gone = edited(nested, [{ op: "group.remove", id: "vpc" }]);
    for (const b of [moved, gone, catalogSyncGrouped]) {
      replays(nested, b);
      replays(b, nested);
    }
    replays(null, nested);
  });

  it("replays to the same file, between any two diagrams and from nothing", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const a = generate(seed, m).diagram;
      const b = generate(seed + 5000, m).diagram;
      replays(a, b);
      replays(b, a);
      replays(null, b);
    }
  });
});
