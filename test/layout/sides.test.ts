// Side turns (DESIGN.md, "Lines meet any side"): a line that leaves or enters a box by its side turns once.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { drawing } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe("side turns", () => {
  // Found by the owner on 2026-10-15 in a swimlane with a column per phase: each of these lines
  // bent twice, because another line already turned through the gap beside its target.
  it("share a gap of a row when their runs along the row keep apart", () => {
    const file = join(import.meta.dirname, "../fixtures/order-lanes.grafical.yaml");
    const d = readDiagram(readFileSync(file, "utf8")) as Diagram;
    const s = layout(d, m);
    const lines = drawing(d, s).lines;
    const of = (id: string) => lines.find((l) => l.id === id);
    expect(of("ship->receive")).toMatchObject({ leaves: "top", enters: "left", bends: 1 });
    expect(of("pay->close")).toMatchObject({ enters: "left", bends: 1 });
    // The lines already in those gaps keep their turns.
    expect(of("backorder->order")).toMatchObject({ enters: "right", bends: 1 });
    expect(of("invoice->pay")).toMatchObject({ leaves: "right", bends: 1 });
    expect(check(d, s, m)).toEqual([]);
  });
});
