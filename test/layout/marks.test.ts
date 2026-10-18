// Marks on nodes (DESIGN.md, "Marks of any kind"): corner marks take no room, the left mark takes a
// column of its box, and a mark that meets text is a defect.

import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { defectBlock, kindsOf } from "../../src/cli/problems.ts";
import { layout } from "../../src/layout/index.ts";
import type { Diagram, DiagramNode } from "../../src/model/types.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { MARK, MARK_STEP } from "../../src/theme/geometry.ts";
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

  it("makes a text badge as wide as its text, growing away from its corner", () => {
    // Found on a real picture: NEW overflowed a 20 px square.
    const s = layout(
      marked("api", {
        "top-left": "P0",
        "top-right": { text: "NEW", bg: "#f5c542" },
        left: { text: "v2.1", bg: "#0969da" },
      }),
      m,
    );
    const api = s.nodes.find((n) => n.id === "api");
    const at = (slot: string) => api?.marks?.find((x) => x.slot === slot)?.rect;
    const text = (t: string) => m.measure(t, { size: 11, weight: 600 }).width;
    expect(at("top-right")?.w).toBeGreaterThanOrEqual(text("NEW") + 2 * MARK_STEP.m.padX);
    expect(at("top-right")?.w).toBeGreaterThan(MARK_STEP.m.h);
    // The right edge stays where a square would put it; the left corner's left edge too.
    const r = api?.rect;
    expect((at("top-right")?.x ?? 0) + (at("top-right")?.w ?? 0)).toBe(
      (r?.x ?? 0) + (r?.w ?? 0) + MARK_STEP.m.h / 2,
    );
    expect(at("top-left")?.x).toBe((r?.x ?? 0) - MARK_STEP.m.h / 2);
    // One short text still gets a square; a wider left badge pushes the label further right.
    expect(at("top-left")?.w).toBeGreaterThanOrEqual(text("P0") + 2 * MARK_STEP.m.padX);
    expect(at("left")?.w).toBeGreaterThan(MARK_STEP.m.h);
    const left = at("left");
    expect((left?.x ?? 0) + (left?.w ?? 0)).toBeLessThanOrEqual(api?.texts[0]?.bbox.x ?? 0);
  });

  it("sizes a mark by its step: small is shorter, large is taller, and a picture stays square", () => {
    const s = layout(
      marked("api", {
        "top-left": { text: "P0", size: "s" },
        "top-right": { text: "P0", size: "l" },
        "bottom-left": { text: "⚠️", size: "l" },
        "bottom-right": "P0",
      }),
      m,
    );
    const marks = s.nodes.find((n) => n.id === "api")?.marks ?? [];
    const rect = (slot: string) => marks.find((x) => x.slot === slot)?.rect;
    expect(rect("top-left")?.h).toBe(MARK_STEP.s.h);
    expect(rect("top-right")?.h).toBe(MARK_STEP.l.h);
    expect(rect("bottom-right")?.h).toBe(MARK_STEP.m.h);
    expect(rect("bottom-left")).toMatchObject({ w: MARK_STEP.l.h, h: MARK_STEP.l.h });
    // A larger step makes the badge wider too, for the same text.
    expect(rect("top-right")?.w).toBeGreaterThan(rect("top-left")?.w ?? 0);
    // A bottom corner mark still sticks out of the bottom edge by half its height.
    const api = s.nodes.find((n) => n.id === "api")?.rect;
    expect((rect("bottom-left")?.y ?? 0) + MARK_STEP.l.h).toBe(
      (api?.y ?? 0) + (api?.h ?? 0) + MARK_STEP.l.h / 2,
    );
  });

  it("centres a picture on its corner at every size, so the corner stays covered", () => {
    // Found on a real picture: a large warning sat mostly inside the box, over the label.
    for (const size of ["s", "m", "l"] as const) {
      const s = layout(
        marked("api", {
          "top-left": { text: "⚠️", size },
          "bottom-right": { text: "🔥", size },
        }),
        m,
      );
      const api = s.nodes.find((n) => n.id === "api");
      const [tl, br] = api?.marks ?? [];
      const r = api?.rect;
      const centre = (x?: { x: number; y: number; w: number; h: number }) => ({
        x: (x?.x ?? 0) + (x?.w ?? 0) / 2,
        y: (x?.y ?? 0) + (x?.h ?? 0) / 2,
      });
      expect(centre(tl?.rect)).toEqual({ x: r?.x, y: r?.y });
      expect(centre(br?.rect)).toEqual({
        x: (r?.x ?? 0) + (r?.w ?? 0),
        y: (r?.y ?? 0) + (r?.h ?? 0),
      });
    }
  });

  it("puts a corner mark over its corner, centred on it", () => {
    const s = layout(marked("api", { "top-left": "⚠️", "bottom-right": "!" }), m);
    const api = s.nodes.find((n) => n.id === "api");
    const [tl, br] = api?.marks ?? [];
    expect(api?.marks?.map((x) => x.slot)).toEqual(["top-left", "bottom-right"]);
    expect(tl?.rect).toEqual({
      x: (api?.rect.x ?? 0) - MARK_STEP.m.h / 2,
      y: (api?.rect.y ?? 0) - MARK_STEP.m.h / 2,
      w: MARK_STEP.m.h,
      h: MARK_STEP.m.h,
    });
    expect((br?.rect.x ?? 0) + MARK_STEP.m.h).toBe(
      (api?.rect.x ?? 0) + (api?.rect.w ?? 0) + MARK_STEP.m.h / 2,
    );
    expect((br?.rect.y ?? 0) + MARK_STEP.m.h).toBe(
      (api?.rect.y ?? 0) + (api?.rect.h ?? 0) + MARK_STEP.m.h / 2,
    );
  });

  it("the left mark keeps the box and moves its text right by half its column", () => {
    const before = layout(tiny, m);
    const after = layout(marked("api", { left: "!" }), m);
    const was = before.nodes.find((n) => n.id === "api");
    const now = after.nodes.find((n) => n.id === "api");
    expect(now?.rect).toEqual(was?.rect);
    const x = (s: typeof was) => s?.texts[0]?.runs[0]?.x ?? 0;
    expect(x(now) - x(was)).toBeCloseTo((MARK_STEP.m.h + MARK.leftGap) / 2, 5);
    const left = now?.marks?.[0];
    expect(left?.slot).toBe("left");
    expect(left?.rect.x).toBeGreaterThanOrEqual((now?.rect.x ?? 0) + 8);
    expect((left?.rect.x ?? 0) + MARK_STEP.m.h).toBeLessThanOrEqual(now?.texts[0]?.bbox.x ?? 0);
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
    api.marks[0].rect = { ...label, w: MARK_STEP.m.h, h: MARK_STEP.m.h };
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
    api.marks[0].rect = { ...worker.rect, w: MARK_STEP.m.h, h: MARK_STEP.m.h };
    const defects = check(d, scene, m).filter((x) => x.code === "mark-covers");
    expect(defects).toMatchObject([{ elements: ["api", "worker"], facts: { is: "node" } }]);
  });

  it("lets a corner mark meet a text's line box without touching its ink (a store with two lines)", () => {
    // Found by an agent on a real diagram: the label's box ended 0.4 px under the mark.
    const d: Diagram = {
      grafical: 1,
      title: "R",
      density: "normal",
      layers: [
        {
          id: "row",
          label: "Store",
          nodes: [
            {
              id: "mongo",
              label: "MongoDB catalog",
              kind: "store",
              sublabel: "goods_*, DLQ, retry",
              icons: { "top-left": "⚠️", "top-right": "P0" },
            },
          ],
        },
      ],
      edges: [],
    };
    expect(check(d, layout(d, m), m).filter((x) => x.code === "mark-covers")).toEqual([]);
  });

  it("names the commands that can change a covered label: a larger box, or another slot", () => {
    const d = marked("api", { "top-left": "⚠️" });
    const scene = layout(d, m);
    const api = scene.nodes.find((n) => n.id === "api");
    const label = api?.texts[0]?.bbox;
    if (api?.marks?.[0] === undefined || label === undefined) throw new Error("no mark");
    api.marks[0].rect = { ...label, w: MARK_STEP.m.h, h: MARK_STEP.m.h };
    const [defect] = check(d, scene, m).filter((x) => x.code === "mark-covers");
    if (defect === undefined) throw new Error("no defect");
    expect(defectBlock(defect, kindsOf(d))).toMatchObject({
      detail: { owner: "agent", field: "icon", found: "top-left", is: "label", node: ["api"] },
      next: ["node resize", "node icon"],
    });
  });

  it("reports a plain-text mark the bundled fonts cannot draw", () => {
    const d = marked("api", { "top-left": "ก" });
    const defects = check(d, layout(d, m), m);
    expect(defects).toMatchObject([{ code: "missing-glyph", elements: ["api"], field: "icon" }]);
  });
});
