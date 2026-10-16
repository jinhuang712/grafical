// Step badges (DESIGN.md, "Step badges ride the line"): each sits on its own line, clear of everything else, its
// text beside it; and the checker finds one that touches something.

import { beforeAll, describe, expect, it } from "vitest";
import { segmentsOf, toRect, toSegment } from "../../src/check/geometry.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import type { Diagram } from "../../src/model/types.ts";
import type { SceneBadge, SceneEdge } from "../../src/scene.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { STEP } from "../../src/theme/geometry.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { dense } from "../fixtures/dense.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";
import { flowchart } from "../fixtures/flowchart.ts";
import { lanesColumns, lanesRows } from "../fixtures/lanes.ts";
import { nested } from "../fixtures/nested.ts";
import { stateMachine } from "../fixtures/state-machine.ts";
import { steps } from "../fixtures/steps.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

/** The diagram with every line numbered in its order. */
const numbered = (d: Diagram): Diagram => ({
  ...d,
  edges: d.edges.map((e, i) => ({ ...e, step: Math.min(i + 1, 99) })),
});

const FIXTURES = {
  catalogSync,
  catalogSyncGrouped,
  dense,
  edgeLooks,
  flowchart,
  lanesColumns,
  lanesRows,
  nested,
  stateMachine,
};

const centre = (b: SceneBadge) => ({ x: b.x, y: b.y });

describe('step badges (DESIGN.md, "Step badges ride the line")', () => {
  for (const [name, d] of Object.entries(FIXTURES)) {
    it(`${name}, every line numbered: each badge on its line, its text beside it, nothing touched`, () => {
      const facts = numbered(d);
      const scene = layout(facts, m);
      const drawn = scene.edges.filter((e): e is SceneEdge & { step: SceneBadge } => !!e.step);
      expect(drawn.map((e) => e.id).sort()).toEqual(facts.edges.map((e) => e.id).sort());
      for (const e of drawn) {
        const fact = facts.edges.find((x) => x.id === e.id);
        expect(e.step.label.runs.map((r) => r.text).join("")).toBe(String(fact?.step));
        const on = Math.min(...segmentsOf(e.points).map((s) => toSegment(centre(e.step), s)));
        // On its line, or on its way into a group, a row or a lane it ends at.
        expect(on, e.id).toBeLessThan(STEP.r + STEP.arrowClear + 0.01);
        if (e.label) {
          expect(toRect(centre(e.step), e.label.bbox), e.id).toBeGreaterThanOrEqual(STEP.r);
        }
      }
      expect(check(facts, scene, m).filter((x) => x.code === "step-collision")).toEqual([]);
    });
  }

  it("draws no badge on a line with no number", () => {
    const scene = layout(catalogSyncGrouped, m);
    expect(scene.edges.some((e) => e.step !== undefined)).toBe(false);
  });

  it("finds a badge moved onto another line, a box and a label as step-collision, owned by the engine", () => {
    const scene = layout(steps, m);
    const a = scene.edges.find((e) => e.id === "gateway->checkout") as SceneEdge;
    const b = scene.edges.find((e) => e.id === "checkout->payments") as SceneEdge;
    const box = scene.nodes.find((n) => n.id === "checkout");
    if (a.step === undefined || b.label === undefined || box === undefined)
      throw new Error("fixture");
    const at = (x: number, y: number) => ({ ...(a.step as SceneBadge), x, y });
    const p = b.points[0] as { x: number; y: number };
    const q = b.points[1] as { x: number; y: number };
    const cases: [string, SceneBadge][] = [
      ["edge", at((p.x + q.x) / 2, p.y)],
      ["node", at(box.rect.x + box.rect.w / 2, box.rect.y + 4)],
      ["label", at(b.label.bbox.x + 2, b.label.bbox.y + 2)],
    ];
    for (const [is, badge] of cases) {
      const moved = {
        ...scene,
        edges: scene.edges.map((e) => (e === a ? { ...e, step: badge } : e)),
      };
      const found = check(steps, moved, m).filter((x) => x.code === "step-collision");
      expect(found.map((x) => x.facts?.is)).toContain(is);
      expect(found.every((x) => x.owner === "engine" && x.elements[0] === a.id)).toBe(true);
    }
  });
});
