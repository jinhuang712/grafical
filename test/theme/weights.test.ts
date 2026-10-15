import { beforeAll, describe, expect, it } from "vitest";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  parseOp,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { renderSvg } from "../../src/render/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { edgeWidth, lineLook, PAINT } from "../../src/theme/paint.ts";
import {
  parseStylesheet,
  provideStylesheet,
  type Theme,
  unknownWeights,
} from "../../src/theme/themes.ts";
import { catalogSyncGrouped as fx } from "../fixtures/catalog-sync-grouped.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const EDGE = "pipelines->mongo";
const OTHER = "service->mongo";

function ok(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}
const edge = (d: Diagram, id: string) => d.edges.find((e) => e.id === id);
const widthOf = (d: Diagram, id: string) => layout(d, m).edges.find((e) => e.id === id)?.width;

describe('edge weights (DESIGN.md, "Edge weights")', () => {
  it("a level or a width sets how thick an edge is drawn; thin is the default", () => {
    const d = ok(fx, [
      { op: "edge.weight", edges: [EDGE], weight: "heavy" },
      { op: "edge.weight", edges: [OTHER], weight: 3.5 },
    ]);
    expect(edge(d, EDGE)?.weight).toBe("heavy");
    expect(widthOf(d, EDGE)).toBe(4);
    expect(widthOf(d, OTHER)).toBe(3.5);
    expect(widthOf(fx, EDGE)).toBeUndefined();
    const text = writeDiagram(d);
    expect(text).toContain("weight: heavy");
    expect(text).toContain("weight: 3.5");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });

  it("without a weight, or at thin, the edge is thin again", () => {
    const heavy = ok(fx, [{ op: "edge.weight", edges: [EDGE], weight: "heavy" }]);
    expect(edge(ok(heavy, [{ op: "edge.weight", edges: [EDGE] }]), EDGE)?.weight).toBeUndefined();
    const thin = ok(heavy, [{ op: "edge.weight", edges: [EDGE], weight: "thin" }]);
    expect(writeDiagram(thin)).toBe(writeDiagram(fx));
  });

  it("the last one set is the look: emphasize and weight replace each other", () => {
    const heavy = ok(fx, [{ op: "edge.weight", edges: [EDGE], weight: "heavy" }]);
    const accent = ok(heavy, [{ op: "edge.emphasize", edges: [EDGE] }]);
    expect(edge(accent, EDGE)).toMatchObject({ accent: true });
    expect(edge(accent, EDGE)?.weight).toBeUndefined();
    const back = ok(accent, [{ op: "edge.weight", edges: [EDGE], weight: "heavy" }]);
    expect(edge(back, EDGE)?.accent).toBeUndefined();
    const off = ok(heavy, [{ op: "edge.emphasize", edges: [EDGE], off: true }]);
    expect(edge(off, EDGE)?.weight).toBeUndefined();
  });

  it("an old accent is the thick level", () => {
    const d = ok(fx, [{ op: "edge.emphasize", edges: [EDGE] }]);
    expect(widthOf(d, EDGE)).toBe(PAINT.edge.main.strokeWidth);
  });

  it("refuses an unknown level, a width out of range and an unknown edge", () => {
    expect(fail(fx, [{ op: "edge.weight", edges: [EDGE], weight: "huge" }])[0]).toMatchObject({
      code: "unknown-weight",
      field: "weight",
      found: "huge",
      facts: { allowed: ["thin", "thick", "heavy"] },
    });
    // The range is checked when an operation is parsed, as for every operation, and the
    // refusal names the levels and the limits.
    for (const weight of [20, 0.1, "Big"]) {
      const parsed = parseOp({ op: "edge.weight", edges: [EDGE], weight }, 0);
      expect(parsed).toEqual([
        {
          code: "bad-value",
          index: 0,
          field: "weight",
          found: String(weight),
          facts: { allowed: ["thin", "thick", "heavy"], min: 0.5, max: 8 },
        },
      ]);
    }
    expect(Array.isArray(parseOp({ op: "edge.weight", edges: [EDGE], weight: 8 }, 0))).toBe(false);
    const file = writeDiagram(ok(fx, [{ op: "edge.weight", edges: [EDGE], weight: 3 }]));
    expect(readDiagram(file.replace("weight: 3", "weight: 12"))).toMatchObject([
      { code: "bad-value", found: "12", facts: { min: 0.5, max: 8 } },
    ]);
    expect(fail(fx, [{ op: "edge.weight", edges: ["nope"] }])[0]).toMatchObject({
      code: "unknown-edge",
      field: "edges",
    });
  });

  it("a file that names a level its stylesheet lacks is refused when checked", () => {
    const d = { ...fx, edges: fx.edges.map((e) => (e.id === EDGE ? { ...e, weight: "huge" } : e)) };
    expect(unknownWeights(d)[0]).toMatchObject({ code: "unknown-weight", found: "huge" });
    expect(unknownWeights(fx)).toEqual([]);
  });

  it("the legend names a width heavier than thin once the agent names it", () => {
    const d = ok(fx, [{ op: "edge.weight", edges: [EDGE], weight: "heavy" }]);
    expect(layout(d, m).legend?.some((l) => l.width !== undefined)).toBe(false);
    const named = ok(d, [{ op: "diagram.legend", weight: "heavy", text: "critical" }]);
    // Drawn at the width it stands for (DESIGN.md, "A legend for widths and marks").
    expect(layout(named, m).legend?.at(-1)).toMatchObject({ width: 4 });
  });

  it("a heavier line grows its arrowhead by the same step, up to a limit", () => {
    const thin = lineLook(undefined, PAINT);
    const thick = lineLook(PAINT.edge.main.strokeWidth, PAINT);
    const heavy = lineLook(4, PAINT);
    const huge = lineLook(8, PAINT);
    expect(thin.arrow).toEqual(PAINT.edge.arrow);
    expect(thick.arrow).toEqual(PAINT.edge.main.arrow);
    expect(heavy.arrow.length).toBeGreaterThan(thick.arrow.length);
    expect(huge.arrow.length).toBe(12);
    expect(lineLook(0.5, PAINT)).toEqual({ strokeWidth: 0.5, arrow: PAINT.edge.arrow });
  });

  it("is drawn with that stroke width", () => {
    const d = ok(fx, [{ op: "edge.weight", edges: [EDGE], weight: 6 }]);
    expect(renderSvg(layout(d, m))).toContain('stroke-width="6"');
    expect(renderSvg(layout(fx, m))).not.toContain('stroke-width="6"');
  });

  it("the diff replays as weight operations", () => {
    const heavy = ok(fx, [
      { op: "edge.weight", edges: [EDGE], weight: "heavy" },
      { op: "edge.emphasize", edges: [OTHER] },
    ]);
    const ops = diffDiagrams(fx, heavy);
    expect(ops).toContainEqual({ op: "edge.weight", edges: [EDGE], weight: "heavy" });
    for (const [a, b] of [
      [fx, heavy],
      [heavy, fx],
    ] as const) {
      const r = applyOps(a, diffDiagrams(a, b));
      if ("errors" in r) throw new Error(JSON.stringify(r.errors));
      expect(writeDiagram(r.diagram)).toBe(writeDiagram(b));
    }
  });
});

describe('weights in a stylesheet (DESIGN.md, "Edge weights")', () => {
  const sheet = (body: string) =>
    parseStylesheet(`grafical-style: 1\npaint:\n  edge:\n${body}`, "w.grafical-style.yaml");

  it("retunes heavy, adds levels, and keeps the presets", () => {
    const t = sheet("    weights: { heavy: 5, critical: 6.5 }\n") as Theme;
    expect(t.paint.edge.weights).toEqual({ heavy: 5, critical: 6.5 });
    expect(edgeWidth({ weight: "critical" }, t.paint)).toBe(6.5);
    expect(edgeWidth({ weight: "thick" }, t.paint)).toBe(PAINT.edge.main.strokeWidth);
  });

  it("sets thin and thick where they always were", () => {
    const t = sheet("    strokeWidth: 1\n    main: { strokeWidth: 3 }\n") as Theme;
    expect(edgeWidth({}, t.paint)).toBe(1);
    expect(edgeWidth({ accent: true }, t.paint)).toBe(3);
  });

  it("refuses thin and thick as names, bad names and widths out of range", () => {
    const errors = (body: string) => sheet(body) as OpError[];
    expect(errors("    weights: { thick: 3 }\n")[0]).toMatchObject({ code: "bad-stylesheet" });
    expect(errors("    weights: { Big: 3 }\n")[0]).toMatchObject({ code: "bad-stylesheet" });
    expect(errors("    weights: { big: 12 }\n")[0]).toMatchObject({ code: "bad-stylesheet" });
  });

  it("a diagram may name a level its stylesheet adds", () => {
    const t = sheet("    weights: { critical: 6.5 }\n") as Theme;
    provideStylesheet("w.grafical-style.yaml", t);
    const styled = ok(fx, [
      { op: "diagram.style", style: "w.grafical-style.yaml" },
      { op: "edge.weight", edges: [EDGE], weight: "critical" },
    ]);
    expect(unknownWeights(styled)).toEqual([]);
    expect(widthOf(styled, EDGE)).toBe(6.5);
    // Back to the default theme, the level is gone.
    const plain = { ...styled };
    delete plain.style;
    expect(unknownWeights(plain)[0]).toMatchObject({ code: "unknown-weight", found: "critical" });
  });
});
