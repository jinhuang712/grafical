// Notes in the picture (DESIGN.md, "Notes as callouts or footnotes"): a callout card beside its target, or a
// numbered footnote where the agent says so; a card with no room is refused (DESIGN.md, "The dirty work has edges").

import { beforeAll, describe, expect, it } from "vitest";
import { drawing, drawingText } from "../../src/check/drawing.ts";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import type { Rect } from "../../src/scene.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { NOTE } from "../../src/theme/geometry.ts";
import { catalogSyncGrouped as fx } from "../fixtures/catalog-sync-grouped.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function ok(d: Diagram, ops: Op[]): Diagram {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}
const note = (on: string, text = "retries 5 times, then the DLQ", footnote = false): Op => ({
  op: "note.add",
  on,
  text,
  ...(footnote ? { footnote: true } : {}),
});
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe('notes in the picture (DESIGN.md, "Notes as callouts or footnotes")', () => {
  it("a note with room beside its target is a card, joined to it by a dotted line", () => {
    const d = ok(fx, [note("catalog-api", "owned by the storefront team")]);
    const scene = layout(d, m);
    const x = scene.notes?.[0];
    if (x?.card === undefined || x.link === undefined) throw new Error("no callout");
    expect(x.as).toBe("callout");
    const box = scene.groups?.find((g) => g.id === "catalog-api")?.rect as Rect;
    // The line runs from the card's side to the group's.
    expect([x.link.a.x, x.link.b.x].sort()).toEqual([x.card.x + x.card.w, box.x].sort());
    for (const n of scene.nodes) expect(overlaps(n.rect, x.card)).toBe(false);
    expect(check(d, scene, m)).toEqual([]);
  });

  it("a footnote is a number on its target, its text at the bottom", () => {
    const before = layout(fx, m);
    const d = ok(fx, [note("retry", undefined, true), note("service->mongo", undefined, true)]);
    const scene = layout(d, m);
    const byOn = new Map((scene.notes ?? []).map((x) => [x.on, x]));
    const retry = byOn.get("retry");
    if (retry?.mark === undefined || retry.key === undefined) throw new Error("no footnote");
    expect(retry.as).toBe("footnote");
    // Numbered in reading order: the retry topic sits above the line to MongoDB.
    expect(byOn.get("service->mongo")?.number).toBe(2);
    expect(retry.number).toBe(1);
    // The number sits on a corner of the box, and the list below the content.
    const box = scene.nodes.find((n) => n.id === "retry")?.rect as Rect;
    // Its digits just outside the box.
    const out = NOTE.badge - 2;
    const corners = [
      [box.x + box.w + out, box.y],
      [box.x - out, box.y],
      [box.x + box.w + out, box.y + box.h],
      [box.x - out, box.y + box.h],
    ];
    expect(corners).toContainEqual([retry.mark.x, retry.mark.y]);
    const lowest = Math.max(...scene.nodes.map((n) => n.rect.y + n.rect.h));
    expect(retry.text.bbox.y).toBeGreaterThan(lowest);
    expect(scene.height).toBeGreaterThan(before.height);
    expect(check(d, scene, m)).toEqual([]);
  });

  // Until 2026-10-17 such a card became a footnote by itself.
  it("a card with no place beside its target is refused, and never becomes a footnote", () => {
    const d = ok(fx, [note("retry")]);
    const scene = layout(d, m);
    expect(scene.notes?.[0]).toMatchObject({ on: "retry", as: "callout", blocked: true });
    const found = check(d, scene, m);
    expect(found.map((x) => [x.code, x.owner, x.elements[0], x.facts.is])).toEqual([
      ["label-blocked", "agent", "retry", "note"],
    ]);
  });

  it("a note longer than four lines is the agent's overflow", () => {
    const long =
      "retries five times with a growing delay, then parks the message in the dead letter queue for an operator, who replays it by hand once the cause is fixed";
    const d = ok(fx, [note("retry", long, true)]);
    expect(check(d, layout(d, m), m)).toMatchObject([
      { code: "overflow", owner: "agent", elements: ["retry"], field: "note", facts: { max: 4 } },
    ]);
  });

  it("show --drawn says how each note is drawn", () => {
    const d = ok(fx, [
      note("retry", undefined, true),
      note("catalog-api", "owned by the storefront team"),
    ]);
    const text = drawingText(drawing(d, layout(d, m)));
    expect(text).toContain("note on=retry as=footnote number=1 lines=1");
    expect(text).toContain("note on=catalog-api as=callout number=- lines=1");
  });
});
