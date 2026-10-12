import { beforeAll, describe, expect, it, vi } from "vitest";
import { findHints } from "../../src/check/hints.ts";
import { check } from "../../src/check/index.ts";
import { arrangementCost, layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";
import { stateMachine } from "../fixtures/state-machine.ts";
import { generate } from "../fuzz/gen.ts";

// Each search lays out up to 200 arrangements.
vi.setConfig({ testTimeout: 120_000 });

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

/** Applies a hint and returns the cost before and after. */
function applied(d: Diagram, ops: Parameters<typeof applyOps>[1]) {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return { before: arrangementCost(d, m), after: arrangementCost(r.diagram, m), d: r.diagram };
}
const lower = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return (a[i] ?? 0) < (b[i] ?? 0);
  return false;
};

describe("hints (D35)", () => {
  it("names the rearrangement that straightens the photo-sharing lines", () => {
    const [h] = findHints(edgeLooks, m);
    expect(h?.command).toBe("grafical node move <file> uploads --layer entry");
    expect(h?.gain).toBe("lines with more than two bends 2 -> 0, bends 8 -> 2");
  });

  it("removes the state machine's crossing", () => {
    const [h] = findHints(stateMachine, m);
    expect(h?.gain).toContain("crossings 1 -> 0");
    if (h === undefined) return;
    const { before, after } = applied(stateMachine, h.ops);
    expect(lower(after, before)).toBe(true);
  });

  it("has nothing to say about the target look", () => {
    expect(findHints(catalogSyncGrouped, m)).toEqual([]);
  });

  it("on random diagrams: each hint applies, lowers the cost, leaves no defect, and repeats exactly", () => {
    const problems: string[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const d = generate(seed, m).diagram;
      const hints = findHints(d, m);
      expect(findHints(d, m)).toEqual(hints);
      for (const h of hints) {
        const { before, after, d: next } = applied(d, h.ops);
        if (!lower(after, before))
          problems.push(`seed ${seed}: ${h.command} does not lower the cost`);
        const defects = check(next, layout(next, m), m);
        if (defects.length > 0)
          problems.push(`seed ${seed}: ${h.command} leaves ${defects[0]?.code}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
