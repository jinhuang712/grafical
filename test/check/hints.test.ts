import { beforeAll, describe, expect, it, vi } from "vitest";
import { findHints } from "../../src/check/hints.ts";
import { check } from "../../src/check/index.ts";
import { arrangementCost, layout, lineTrouble } from "../../src/layout/index.ts";
import { applyOps, type Diagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { e, n } from "../fixtures/build.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";
import { stateMachine } from "../fixtures/state-machine.ts";
import { generate } from "../fuzz/gen.ts";

/** Two rows of two services whose lines cross; swapping the lower two uncrosses them. */
const crossed: Diagram = {
  grafical: 1,
  title: "Crossed",
  density: "normal",
  layers: [
    {
      id: "top",
      label: "Top",
      nodes: [n("a1", "A one", "service", "m"), n("a2", "A two", "service", "m")],
    },
    {
      id: "bottom",
      label: "Bottom",
      nodes: [n("b1", "B one", "service", "m"), n("b2", "B two", "service", "m")],
    },
  ],
  edges: [e("a1", "b2", "call"), e("a2", "b1", "call")],
};

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
  it("names the rearrangement that straightens the photo-sharing lines, and the line it untangles", () => {
    const h = findHints(edgeLooks, m).find((x) => x.command.includes("uploads --layer entry"));
    expect(h?.command).toBe("grafical node move <file> uploads --layer entry");
    expect(h?.gain).toBe("lines with more than two bends 1 -> 0, bends 6 -> 2");
    expect(h?.fixes).toEqual(["api->photos"]);
  });

  it("puts safe hints first, and keeps a place for a larger fix that is not", () => {
    const hints = findHints(edgeLooks, m);
    // The queue would join the API's row: shown last, and marked for the agent to weigh.
    expect(hints.map((h) => h.safe)).toEqual([true, true, false]);
    expect(hints[2]?.command).toBe("grafical node move <file> uploads --layer entry");
    expect(findHints(crossed, m)[0]?.safe).toBe(true);
    expect(findHints(edgeLooks, m, 3, true).every((h) => h.safe)).toBe(true);
  });

  it("tries rows moved up or down, and marks them as reordering rows", () => {
    // A message row between the services and the store they share: moving it fixes lines.
    const between: Diagram = {
      grafical: 1,
      title: "Between",
      density: "normal",
      layers: [
        {
          id: "row-svc",
          label: "Services",
          nodes: [n("a", "A", "service", "m"), n("b", "B", "service", "m")],
        },
        { id: "row-msg", label: "Messages", nodes: [n("q", "Q", "queue", "m")] },
        { id: "row-db", label: "Stores", nodes: [n("db", "DB", "store", "m")] },
      ],
      edges: [
        e("a", "db", "call"),
        e("b", "db", "call"),
        e("a", "q", "async"),
        e("q", "b", "async"),
      ],
    };
    const rows = findHints(between, m, 10).filter((h) =>
      h.ops.some((op) => op.op === "layer.move"),
    );
    for (const h of rows) expect(h.safe).toBe(false);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("finds no crossing in the state machine: its router avoids the one a hint once removed", () => {
    expect(lineTrouble(stateMachine, m).crossings).toEqual([]);
    expect(findHints(stateMachine, m).some((h) => h.gain.includes("crossings"))).toBe(false);
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
