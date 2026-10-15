// The engine owns six defects (DESIGN.md, "Defects owned by who can fix them"): no valid diagram may show one.
// Random diagrams from fixed seeds, laid out with the real measurer and judged by
// the real checker. FUZZ_SEEDS=5000 pnpm test test/fuzz runs a larger set;
// node test/fuzz/run.ts and node test/fuzz/show.ts <seed> help find out why.

import { describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { failures, geometryFailures } from "./fuzz.ts";
import { generate } from "./gen.ts";

const seeds = Number(process.env.FUZZ_SEEDS ?? 500);
/**
 * Seeds past the usual 500 that once failed, kept so that CI runs them: a line
 * through an outer label stacked above an inner one (DESIGN.md, "Every layered diagram type"); a wall's label with no
 * place along its line clear of the lines that cross it (DESIGN.md, "Walls as space"); the label of a line to a lane
 * across the top of a group's box; a label moved beside a line that runs straight on into a band, across
 * the other line between the same box and band.
 */
const FAILED = [512, 590, 649, 700, 1051, 1303, 1606, 1701, 2453];

describe("fuzz", () => {
  it(
    `${seeds} random diagrams have no engine-owned defect`,
    async () => {
      const m = await createMeasurer();
      const found: string[] = [];
      let nodes = 0;
      let edges = 0;
      let groups = 0;
      let lanes = 0;
      let walls = 0;
      const all = [
        ...Array.from({ length: seeds }, (_, i) => i + 1),
        ...FAILED.filter((x) => x > seeds),
      ];
      for (const seed of all) {
        const { diagram } = generate(seed, m);
        nodes += diagram.layers.reduce((s, l) => s + l.nodes.length, 0);
        edges += diagram.edges.length;
        groups += diagram.groups?.length ?? 0;
        lanes += diagram.lanes?.length ?? 0;
        walls += diagram.walls?.length ?? 0;
        const scene = layout(diagram, m);
        for (const x of [...failures(check(diagram, scene, m)), ...geometryFailures(scene)]) {
          found.push(`seed ${seed}: ${x.code} [${x.elements.join(", ")}] ${x.found}`);
        }
      }
      console.log(
        `${all.length} diagrams, ${(nodes / all.length).toFixed(1)} nodes, ${(edges / all.length).toFixed(1)} edges, ${(groups / all.length).toFixed(1)} groups, ${(lanes / all.length).toFixed(1)} lanes and ${(walls / all.length).toFixed(2)} walls on average`,
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
