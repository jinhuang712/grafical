import { describe, expect, it } from "vitest";
import { countCrossings } from "../../src/check/taste.ts";
import type { SceneEdge } from "../../src/scene.ts";

function edge(id: string, from: string, to: string, pts: [number, number][]): SceneEdge {
  return { id, from, to, kind: "call", points: pts.map(([x, y]) => ({ x, y })) };
}

describe("crossings", () => {
  const h = edge("h", "a", "b", [
    [0, 100],
    [200, 100],
  ]);
  const v = edge("v", "c", "d", [
    [100, 0],
    [100, 200],
  ]);
  it("counts a plus-shaped crossing", () => {
    expect(countCrossings([h, v])).toBe(1);
  });
  it("does not count a T-junction, a shared trunk or parallel edges", () => {
    const t = edge("t", "c", "d", [
      [100, 100],
      [100, 200],
    ]);
    expect(countCrossings([h, t])).toBe(0);
    const par = edge("p", "c", "d", [
      [0, 120],
      [200, 120],
    ]);
    expect(countCrossings([h, par])).toBe(0);
  });
});
