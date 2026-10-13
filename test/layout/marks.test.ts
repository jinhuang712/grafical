// Marks on nodes (DESIGN.md D40): corner marks take no room, the left mark takes a
// column of its box, and a mark that meets text is a defect.

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import type { Diagram, DiagramNode } from "../../src/model/types.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { MARK } from "../../src/theme/geometry.ts";
import { tiny } from "../fixtures/tiny.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function marked(id: string, icons: NonNullable<DiagramNode["icons"]>): Diagram {
  return {
    ...tiny,
    layers: tiny.layers.map((l) => ({
      ...l,
      nodes: l.nodes.map((n) => (n.id === id ? { ...n, icons } : n)),
    })),
  };
}

describe("marks in the layout", () => {
  it("a corner mark moves nothing: boxes, texts and lines stay where they were", () => {
    const before = layout(tiny, m);
    const after = layout(
      marked("api", {
        "top-left": "⚠️",
        "top-right": "P0",
        "bottom-left": "!",
        "bottom-right": "ok",
      }),
      m,
    );
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
    expect(after.edges).toEqual(before.edges);
    expect(after.nodes.map((n) => [n.id, n.rect, n.texts])).toEqual(
      before.nodes.map((n) => [n.id, n.rect, n.texts]),
    );
  });

  it("puts a corner mark over its corner, sticking out by the overhang", () => {
    const s = layout(marked("api", { "top-left": "⚠️", "bottom-right": "!" }), m);
    const api = s.nodes.find((n) => n.id === "api");
    const [tl, br] = api?.marks ?? [];
    expect(api?.marks?.map((x) => x.slot)).toEqual(["top-left", "bottom-right"]);
    expect(tl?.rect).toEqual({
      x: (api?.rect.x ?? 0) - MARK.overhang,
      y: (api?.rect.y ?? 0) - MARK.overhang,
      w: MARK.size,
      h: MARK.size,
    });
    expect((br?.rect.x ?? 0) + MARK.size).toBe(
      (api?.rect.x ?? 0) + (api?.rect.w ?? 0) + MARK.overhang,
    );
    expect((br?.rect.y ?? 0) + MARK.size).toBe(
      (api?.rect.y ?? 0) + (api?.rect.h ?? 0) + MARK.overhang,
    );
  });

  it("the left mark keeps the box and moves its text right by half its column", () => {
    const before = layout(tiny, m);
    const after = layout(marked("api", { left: "!" }), m);
    const was = before.nodes.find((n) => n.id === "api");
    const now = after.nodes.find((n) => n.id === "api");
    expect(now?.rect).toEqual(was?.rect);
    const x = (s: typeof was) => s?.texts[0]?.runs[0]?.x ?? 0;
    expect(x(now) - x(was)).toBeCloseTo(MARK.leftColumn / 2, 5);
    const left = now?.marks?.[0];
    expect(left?.slot).toBe("left");
    expect(left?.rect.x).toBeGreaterThanOrEqual((now?.rect.x ?? 0) + 8);
    expect((left?.rect.x ?? 0) + MARK.size).toBeLessThanOrEqual(now?.texts[0]?.bbox.x ?? 0);
  });
});

describe("marks in the checker", () => {
  it("passes a diagram whose marks sit clear of the text", () => {
    const d = marked("api", { "top-left": "⚠️", left: "P0" });
    expect(check(d, layout(d, m), m).filter((x) => x.code === "mark-covers")).toEqual([]);
  });

  it("reports a corner mark that covers a two-line label in a small box", () => {
    // The layout keeps corner marks clear of text in the boxes it draws, so the
    // scene is changed by hand: the mark is moved onto the label.
    const d = marked("api", { "top-left": "⚠️" });
    const scene = layout(d, m);
    const api = scene.nodes.find((n) => n.id === "api");
    const label = api?.texts[0]?.bbox;
    if (api?.marks?.[0] === undefined || label === undefined) throw new Error("no mark");
    api.marks[0].rect = { ...label, w: MARK.size, h: MARK.size };
    const defects = check(d, scene, m).filter((x) => x.code === "mark-covers");
    expect(defects).toMatchObject([
      { owner: "agent", elements: ["api"], found: "top-left", facts: { is: "label" } },
    ]);
  });

  it("reports a corner mark that covers another node", () => {
    const d = marked("api", { "top-left": "⚠️" });
    const scene = layout(d, m);
    const api = scene.nodes.find((n) => n.id === "api");
    const worker = scene.nodes.find((n) => n.id === "worker");
    if (api?.marks?.[0] === undefined || worker === undefined) throw new Error("no mark");
    api.marks[0].rect = { ...worker.rect, w: MARK.size, h: MARK.size };
    const defects = check(d, scene, m).filter((x) => x.code === "mark-covers");
    expect(defects).toMatchObject([{ elements: ["api", "worker"], facts: { is: "node" } }]);
  });

  it("reports a plain-text mark the bundled fonts cannot draw", () => {
    const d = marked("api", { "top-left": "ก" });
    const defects = check(d, layout(d, m), m);
    expect(defects).toMatchObject([{ code: "missing-glyph", elements: ["api"], field: "icon" }]);
  });
});
