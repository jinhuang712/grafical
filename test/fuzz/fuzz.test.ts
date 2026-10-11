// The engine owns four defects (DESIGN.md D14): no valid diagram may show one.
// Random diagrams from fixed seeds, laid out with the real measurer and judged by
// the real checker. FUZZ_SEEDS=5000 pnpm test test/fuzz runs a larger set;
// node test/fuzz/run.ts and node test/fuzz/show.ts <seed> help find out why.

import { describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { failures } from "./fuzz.ts";
import { generate } from "./gen.ts";

const seeds = Number(process.env.FUZZ_SEEDS ?? 500);

describe("fuzz", () => {
  it(
    `${seeds} random diagrams have no engine-owned defect`,
    async () => {
      const m = await createMeasurer();
      const found: string[] = [];
      let nodes = 0;
      let edges = 0;
      for (let seed = 1; seed <= seeds; seed++) {
        const { diagram } = generate(seed, m);
        nodes += diagram.layers.reduce((s, l) => s + l.nodes.length, 0);
        edges += diagram.edges.length;
        for (const x of failures(check(diagram, layout(diagram, m), m))) {
          found.push(`seed ${seed}: ${x.code} [${x.elements.join(", ")}] ${x.found}`);
        }
      }
      console.log(
        `${seeds} diagrams, ${(nodes / seeds).toFixed(1)} nodes and ${(edges / seeds).toFixed(1)} edges on average`,
      );
      expect(found).toEqual([]);
    },
    Math.max(60_000, seeds * 100),
  );

  it("generates the same diagram from the same seed", async () => {
    const m = await createMeasurer();
    expect(JSON.stringify(generate(42, m).diagram)).toEqual(
      JSON.stringify(generate(42, m).diagram),
    );
  });
});
