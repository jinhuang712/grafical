// Regression: Haiku's own build of the public brief, replayed operation by
// operation the way the command line applies it, with the real measurer. In the
// phase 1 smoke test five of these writes failed on defects the engine owns. Now
// no write may leave a defect the engine owns (DESIGN.md, "Defects owned by who can fix them"), nor a line through text or a
// node inside a group it does not belong to.
//
// Since phase 1b boxes are 136 px wide (DESIGN.md, "A target picture with measured rules"), so one of Haiku's sublabels no
// longer fits on one line: that is an overflow, a defect the agent owns and would
// fix with a shorter sublabel. Those are counted, not failed.

import { describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { DEFECT_OWNER } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { haikuCatalogSync } from "../fixtures/haiku-catalog-sync.ts";
import { groupIntruders, textCrossings } from "./checks.ts";

describe("Haiku's catalog-sync build", () => {
  it("leaves no defect the engine owns after any operation", async () => {
    const m = await createMeasurer();
    let d: Diagram | null = null;
    const problems: string[] = [];
    const agent = new Set<string>();
    haikuCatalogSync.forEach((op, i) => {
      const res = applyOps(d, [op], m);
      if ("errors" in res) {
        problems.push(`#${i} ${op.op}: ${res.errors.map((e) => e.code).join(", ")}`);
        return;
      }
      d = res.diagram;
      const scene = layout(d, m);
      for (const x of check(d, scene, m)) {
        const line = `${x.code} [${x.elements.join(", ")}] ${x.found}`;
        if (DEFECT_OWNER[x.code] === "agent") agent.add(line);
        else problems.push(`#${i} ${op.op}: ${line}`);
      }
      for (const x of [...textCrossings(scene), ...groupIntruders(scene)]) {
        problems.push(`#${i} ${op.op}: ${x}`);
      }
    });
    console.log(`agent-owned defects on the way: ${[...agent].join("; ") || "none"}`);
    expect(problems).toEqual([]);
    // 21 edges added, one removed: every write went through.
    const final = d as Diagram | null;
    expect(final?.edges.length).toBe(20);
  }, 60_000);
});
