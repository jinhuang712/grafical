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

/**
 * Says the diff of a and b as commands, and checks that running them on a one after another, each a write of its own
 * as an agent runs them, gives b, file for file.
 */
function replays(a: Diagram | null, b: Diagram): void {
  const ops = diffDiagrams(a, b);
  const r = applyOps(a, ops);
  if ("errors" in r) {
    const e = r.errors[0];
    throw new Error(
      `${JSON.stringify(ops[e?.index ?? 0])}: ${JSON.stringify(r.errors.slice(0, 3))}`,
    );
  }
  expect(writeDiagram(r.diagram)).toBe(writeDiagram(b));
}

/** Whether the diff of a and b, run one command at a time, gives b. */
function replaysOneByOne(a: Diagram | null, b: Diagram): boolean {
  const r = applyOps(a, diffDiagrams(a, b));
  return !("errors" in r) && writeDiagram(r.diagram) === writeDiagram(b);
}

describe('diff as operations (specs/decisions, "Git as the history")', () => {
  it("reports nothing for the same diagram", () => {
    expect(diffDiagrams(catalogSyncGrouped, structuredClone(catalogSyncGrouped))).toEqual([]);
  });

  it("says each change as the command that makes it", () => {
    const relabelled = edited(catalogSyncGrouped, [
      { op: "node.set", ids: ["relay"], label: "catalog relay" },
    ]);
    expect(diffDiagrams(catalogSyncGrouped, relabelled)).toEqual([
      { op: "node.set", ids: ["relay"], label: "catalog relay" },
    ]);
    const moved = edited(catalogSyncGrouped, [{ op: "node.move", ids: ["admin"], after: "relay" }]);
    expect(diffDiagrams(catalogSyncGrouped, moved)).toEqual([
      { op: "node.move", ids: ["admin"], after: "relay" },
    ]);
    const cleared = edited(catalogSyncGrouped, [
      { op: "edge.set", ids: ["relay-line_topics"], number: "2" },
    ]);
    expect(diffDiagrams(cleared, catalogSyncGrouped)).toEqual([
      { op: "edge.set", ids: ["relay-line_topics"], number: "-" },
    ]);
  });

  it("names exactly the operation that made a small change", () => {
    const cases: Op[] = [
      { op: "node.set", ids: ["relay"], label: "catalog relay" },
      { op: "node.move", ids: ["admin"], after: "relay" },
      { op: "edge.set", ids: ["relay-line_topics"], label: "per line" },
      { op: "group.set", ids: ["catalog-api"], label: "read side" },
      { op: "layer.set", ids: ["deps"], label: "Dependencies" },
      { op: "diagram.set", title: "Catalog" },
      { op: "edge.set", ids: ["relay-line_topics"], number: "2" },
    ];
    for (const op of cases) {
      expect(diffDiagrams(catalogSyncGrouped, edited(catalogSyncGrouped, [op]))).toEqual([op]);
    }
  });

  it('reports a step cleared, and an added edge with its step (specs/decisions, "Step badges ride the edge")', () => {
    const numbered = edited(catalogSyncGrouped, [
      { op: "edge.set", ids: ["relay-line_topics"], number: "2" },
    ]);
    expect(diffDiagrams(numbered, catalogSyncGrouped)).toEqual([
      { op: "edge.set", ids: ["relay-line_topics"], number: "-" },
    ]);
    const added = edited(catalogSyncGrouped, [
      { op: "edge.set", ids: ["admin-mongo"], from: "admin", to: "mongo" },
      { op: "edge.set", ids: ["admin-mongo"], number: "7" },
    ]);
    expect(diffDiagrams(catalogSyncGrouped, added)).toEqual([
      {
        op: "edge.set",
        ids: ["admin-mongo"],
        from: "admin",
        to: "mongo",
        type: "call",
        number: "7",
      },
    ]);
    replays(null, added);
  });

  it("reports an added edge and a removed node with its edges", () => {
    const added = edited(catalogSyncGrouped, [
      { op: "edge.set", ids: ["admin-mongo"], from: "admin", to: "mongo" },
    ]);
    expect(diffDiagrams(catalogSyncGrouped, added)).toEqual([
      { op: "edge.set", ids: ["admin-mongo"], from: "admin", to: "mongo", type: "call" },
    ]);
    const removed = edited(catalogSyncGrouped, [{ op: "node.remove", ids: ["geo"] }]);
    expect(diffDiagrams(catalogSyncGrouped, removed)).toEqual([
      { op: "edge.remove", ids: ["pipelines-geo"] },
      { op: "node.remove", ids: ["geo"] },
    ]);
  });

  it('replays groups that move between groups, and removed groups that held others (specs/decisions, "Every layered diagram type")', () => {
    const moved = edited(nested, [
      { op: "group.set", ids: ["public"], in: "region" },
      { op: "node.set", ids: ["api"], group: "vpc" },
    ]);
    const gone = edited(nested, [{ op: "group.remove", ids: ["vpc"] }]);
    for (const b of [moved, gone, catalogSyncGrouped]) {
      replays(nested, b);
      replays(b, nested);
    }
    replays(null, nested);
  });

  it("builds a diagram's types, styles, edge shape and title place from nothing", () => {
    const looked = edited(catalogSyncGrouped, [
      { op: "type.set", ids: ["db"], base: "store", fill: "#eeeeff" },
      { op: "style.set", ids: ["hot"], border: "#cc0000" },
      { op: "style.set", ids: ["roomy"], marginLeft: "16" },
      { op: "diagram.set", lines: "round", titleAt: "0.5", titleSide: "top" },
    ]);
    const ops = diffDiagrams(null, looked);
    expect(ops.filter((o) => o.op === "type.set" || o.op === "style.set")).toHaveLength(3);
    replays(null, looked);
  });

  // A diff between two random diagrams can pass through a diagram a write refuses, such as a lane with a gap or an
  // alignment its layers' order breaks, or lanes and columns can order a layer before a later command places a node in
  // it. Such pairs are counted, and the count may only fall.
  it(
    "replays to the same file, between any two diagrams and from nothing",
    () => {
      let gaps = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const a = generate(seed, m).diagram;
        const b = generate(seed + 5000, m).diagram;
        for (const [x, y] of [
          [a, b],
          [b, a],
          [null, b],
        ] as const) {
          if (!replaysOneByOne(x, y)) gaps++;
        }
        replays(null, b);
      }
      expect(gaps).toBeLessThanOrEqual(9);
    },
    // Each seed generates two diagrams and runs four diffs one command at a time, each a write of its own.
    40 * 5_000,
  );
});
