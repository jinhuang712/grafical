// Regression: Haiku's own build of the public brief, replayed operation by
// operation the way the command line applies it, with the real measurer. In the
// phase 1 smoke test five of these writes failed on defects the engine owns.
// Now every write must leave a diagram without any defect.

import { describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { haikuCatalogSync } from "../fixtures/haiku-catalog-sync.ts";

describe("Haiku's catalog-sync build", () => {
  it("leaves no defect after any operation", async () => {
    const m = await createMeasurer();
    let d: Diagram | null = null;
    const problems: string[] = [];
    haikuCatalogSync.forEach((op, i) => {
      const res = applyOps(d, [op], m);
      if ("errors" in res) {
        problems.push(`#${i} ${op.op}: ${res.errors.map((e) => e.code).join(", ")}`);
        return;
      }
      d = res.diagram;
      for (const x of check(d, layout(d, m), m)) {
        problems.push(`#${i} ${op.op}: ${x.code} [${x.elements.join(", ")}] ${x.found}`);
      }
    });
    expect(problems).toEqual([]);
    // 21 edges added, one removed: every write went through.
    const final = d as Diagram | null;
    expect(final?.edges.length).toBe(20);
  }, 60_000);
});
