// The diff of a random diagram from nothing, replayed one command line at a time through the write path, layout and
// checks included, as a shell runs `grafical diff` (specs/decisions, "One command is one write, and running it twice
// changes nothing"). A diagram with a defect the agent owns is left out: no write can make it, in any order.

import { describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { attempt, isReport } from "../../src/cli/pipeline.ts";
import { layout } from "../../src/layout/index.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import { writeDiagram } from "../../src/model/io.ts";
import type { Diagram } from "../../src/model/types.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { generate } from "./gen.ts";

const SEEDS = 60;

/**
 * The seeds whose replay is still refused on the way, by a group's title or an edge's label that an edge comes near
 * while fewer edges are drawn than in the end. No fixed order of the lines avoids them; the list may only shrink.
 */
const REFUSED = [33, 42, 56];

describe("diff replay", () => {
  it(
    `the diff of ${SEEDS} random diagrams replays line by line through every write's checks`,
    async () => {
      const m = await createMeasurer();
      const refused: number[] = [];
      for (let seed = 1; seed <= SEEDS; seed++) {
        const want = generate(seed, m).diagram;
        if (check(want, layout(want, m), m).some((x) => x.owner === "agent")) continue;
        let d: Diagram | null = null;
        let ok = true;
        for (const op of diffDiagrams(null, want)) {
          const r = attempt(d, op, { command: "replay" }, m);
          if (isReport(r)) {
            ok = false;
            break;
          }
          d = r.next;
        }
        if (!ok) refused.push(seed);
        else expect(writeDiagram(d as Diagram)).toBe(writeDiagram(want));
      }
      expect(refused).toEqual(REFUSED);
    },
    // Each seed lays out once for every line of its diff.
    SEEDS * 3_000,
  );
});
