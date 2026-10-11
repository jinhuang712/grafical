import { describe, expect, it } from "vitest";
import { compare, measurers, summarize } from "./compare.ts";
import { labels } from "./labels.ts";

// Each test renders 160 labels at 8x with resvg. macOS runners need more than the 5 s default.
const SLOW = 120_000;

describe("D12 text measurement spike", () => {
  it("uses 40 labels", () => {
    expect(labels).toHaveLength(40);
    expect(new Set(labels).size).toBe(40);
  });

  for (const measurer of measurers()) {
    describe(measurer.name, () => {
      it(
        "matches the widths resvg draws within 1 px when grafical sets the fonts",
        () => {
          const s = summarize(compare(measurer, "runs", "runs"));
          console.log(measurer.name, "runs/runs", s);
          expect(s.n).toBe(160); // 40 labels x 2 sizes x 2 weights
          expect(s.maxAdvance).toBeLessThanOrEqual(1);
          expect(s.maxInkWidth).toBeLessThanOrEqual(1);
          expect(s.maxInkLeft).toBeLessThanOrEqual(1);
          expect(s.maxInkRight).toBeLessThanOrEqual(1);
          expect(s.maxPixelWidth).toBeLessThanOrEqual(1);
        },
        SLOW,
      );

      it(
        "shows that resvg's own font fallback is not Inter-first (the trap)",
        () => {
          const s = summarize(compare(measurer, "runs", "stack"));
          console.log(measurer.name, "runs/stack", s);
          expect(s.maxInkWidth).toBeGreaterThan(1);
        },
        SLOW,
      );
    });
  }
});
