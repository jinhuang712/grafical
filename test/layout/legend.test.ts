// The legend (DESIGN.md, "Looks", "Lines meet any side", "A legend for widths and marks"): what it lists and how it wraps.

import { describe, expect, it } from "vitest";
import { layout } from "../../src/layout/index.ts";
import type { Diagram } from "../../src/model/types.ts";
import type { Scene } from "../../src/scene.ts";
import { createStubMeasurer } from "../../src/text/stub.ts";
import { tiny } from "../fixtures/tiny.ts";

const m = createStubMeasurer();

/** The tiny diagram with a subtitle and the legend's words given. */
function tinyWith(legend: Diagram["legend"]): Diagram {
  const d: Diagram = { ...structuredClone(tiny), subtitle: "One order's path." };
  if (legend !== undefined) d.legend = legend;
  return d;
}

/** The legend's lines, top to bottom, each as the items on it. */
function legendLines(s: Scene) {
  const items = s.legend ?? [];
  const ys = [...new Set(items.map((x) => x.sample.y))].sort((a, b) => a - b);
  return ys.map((y) => items.filter((x) => x.sample.y === y));
}

describe('the legend (DESIGN.md, "A legend for widths and marks")', () => {
  it("stays on one line, level with the title, when it fits beside it", () => {
    const s = layout(tinyWith(undefined), m);
    const lines = legendLines(s);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.[0]?.sample.y).toBe(s.title.bbox.y + s.title.bbox.h / 2);
  });

  it("wraps under the title's right side, without widening the picture", () => {
    const short = layout(tinyWith(undefined), m);
    const s = layout(
      tinyWith({ solid: "a call over HTTPS, or a read", dashed: "an event on the orders topic" }),
      m,
    );
    const lines = legendLines(s);
    expect(lines).toHaveLength(2);
    expect(s.width).toBe(short.width);
    // Each line starts at the same left edge, right of the title.
    const starts = lines.map((l) => Math.min(...l.map((x) => x.sample.x1)));
    expect(new Set(starts).size).toBe(1);
    expect(starts[0]).toBeGreaterThan(s.title.bbox.x + s.title.bbox.w);
    for (const it of s.legend ?? []) {
      expect(it.label.bbox.x + it.label.bbox.w).toBeLessThanOrEqual(s.width - 32);
    }
    // The subtitle starts below the legend's last line.
    const last = lines.at(-1)?.[0];
    expect(last).toBeDefined();
    if (last === undefined || s.subtitle === undefined) return;
    expect(s.subtitle.bbox.y).toBeGreaterThan(last.label.bbox.y + last.label.bbox.h);
  });
});
