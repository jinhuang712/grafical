// What a drawing draws poorly, as warnings (DESIGN.md, "Every write prints every warning"): each is a place that one
// of the counts counts, or a box with no lines, or a pair of lines that cross, and names what it is about.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { drawing, warningsOf } from "../../src/check/drawing.ts";
import { WARNING_CODES, type Warning, type WarningCode } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { e, n } from "../fixtures/build.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { dense } from "../fixtures/dense.ts";
import { generate } from "../fuzz/gen.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function fixture(name: string): Diagram {
  const d = readDiagram(
    readFileSync(join(import.meta.dirname, `../fixtures/${name}.grafical.yaml`), "utf8"),
  );
  if (Array.isArray(d)) throw new Error(name);
  return d;
}

/** Two boxes joined by a line, and one box with none. */
const alone: Diagram = {
  grafical: 1,
  title: "Alone",
  density: "normal",
  layers: [
    { id: "top", label: "Top", nodes: [n("a", "A", "service", "m")] },
    { id: "low", label: "Low", nodes: [n("b", "B", "service", "m"), n("c", "C", "store", "m")] },
  ],
  edges: [e("a", "b", "call")],
};

/** The facts each warning gives, by its code. */
const KEYS: Record<WarningCode, string[]> = {
  "bent-line": ["edge", "bends", "skip"],
  "passing-row": ["edge", "rows"],
  "line-across-group": ["edge", "groups"],
  "tight-lines": ["edges", "over"],
  "crowded-label": ["edge"],
  "lonely-box": ["node"],
  crossing: ["edges"],
};

describe('warnings (DESIGN.md, "Every write prints every warning")', () => {
  it("are the places the counts count, each naming what it is about, in the order of their codes", () => {
    const diagrams = [
      fixture("dispatch"),
      fixture("catalog-sync-help3"),
      catalogSync,
      dense,
      alone,
      ...[3, 4, 44].map((seed) => generate(seed, m).diagram),
    ];
    const seen = new Set<string>();
    for (const d of diagrams) {
      const dr = drawing(d, layout(d, m));
      const w = warningsOf(dr);
      const of = (code: WarningCode) => w.filter((x) => x.code === code);
      expect(of("bent-line").length, d.title).toBe(dr.counts.bent);
      expect(of("passing-row").length, d.title).toBe(dr.counts.passing);
      expect(of("line-across-group").length, d.title).toBe(dr.counts.across);
      expect(of("tight-lines").length, d.title).toBe(dr.counts.tight);
      expect(of("crowded-label").length, d.title).toBe(dr.counts.crowded);
      expect(of("lonely-box").length, d.title).toBe(dr.boxes.filter((b) => b.lines === 0).length);
      // One warning per pair of lines that cross, however often they cross.
      const pairs = dr.lines.reduce((s, l) => s + l.crosses.length, 0) / 2;
      expect(of("crossing").length, d.title).toBe(pairs);
      expect(pairs, d.title).toBeLessThanOrEqual(dr.counts.crossings);
      const groups = new Set((d.groups ?? []).map((g) => g.id));
      for (const x of w) {
        seen.add(x.code);
        expect(Object.keys(x.facts), `${d.title} ${x.code}`).toEqual(KEYS[x.code]);
        if (x.code === "line-across-group") {
          expect(x.facts.groups?.length).toBeGreaterThan(0);
          for (const g of x.facts.groups ?? []) expect(groups).toContain(g);
        }
        if (x.code === "tight-lines") expect(x.facts.over).toBeGreaterThan(100);
        if (x.code === "crossing" || x.code === "tight-lines") {
          const [a, b] = x.facts.edges ?? [];
          expect(a !== undefined && b !== undefined && a < b, `${x.code} ${a} ${b}`).toBe(true);
        }
      }
      const order = w.map((x: Warning) => WARNING_CODES.indexOf(x.code));
      expect(order, d.title).toEqual([...order].sort((a, b) => a - b));
    }
    expect([...seen].sort()).toEqual([...WARNING_CODES].sort());
  });

  it("name a box with no lines", () => {
    const w = warningsOf(drawing(alone, layout(alone, m)));
    expect(w).toEqual([{ code: "lonely-box", facts: { node: "c" } }]);
  });

  it("name the groups a line runs through that hold neither of its ends", () => {
    const d = fixture("dispatch");
    const w = warningsOf(drawing(d, layout(d, m))).filter((x) => x.code === "line-across-group");
    expect(w.map((x) => `${x.facts.edge} ${x.facts.groups?.join(",")}`)).toEqual([
      "events->notify-svc booking",
      "events->payments-api matching",
    ]);
  });
});
