// The legend's words (DESIGN.md, "A legend for widths and marks", "The legend says only what the agent named"): naming line
// styles, widths and marks, through the operation and the file.

import { describe, expect, it } from "vitest";
import { drawing, drawingText } from "../../src/check/drawing.ts";
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
import { createStubMeasurer } from "../../src/text/stub.ts";
import { catalogSyncGrouped as fx } from "../fixtures/catalog-sync-grouped.ts";

const m = createStubMeasurer();

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
/** The legend's entries as their words and sample widths. */
function entries(d: Diagram) {
  return (layout(d, m).legend ?? []).map((x) => ({
    text: x.label.runs.map((r) => r.text).join(""),
    width: x.width,
  }));
}

/** Two thick edges, one heavy and one 3 pixels wide. */
const weighted = ok(fx, [
  { op: "edge.weight", edges: ["pipelines->mongo"], weight: "thick" },
  { op: "edge.weight", edges: ["service->mongo"], weight: "heavy" },
  { op: "edge.weight", edges: ["pipelines->postgres"], weight: 3 },
]);

describe('the legend names line widths (DESIGN.md, "A legend for widths and marks")', () => {
  it("widths it does not name have no entry", () => {
    expect(entries(weighted).filter((x) => x.width !== undefined)).toEqual([]);
  });

  it("a named width has its own entry, and the entries go from the thinnest", () => {
    const d = ok(weighted, [
      { op: "diagram.legend", weight: "heavy", text: "critical" },
      { op: "diagram.legend", weight: 3, text: "writes" },
    ]);
    expect(entries(d).filter((x) => x.width !== undefined)).toEqual([
      { text: "writes", width: 3 },
      { text: "critical", width: 4 },
    ]);
    expect(d.legend?.weights).toEqual({ heavy: "critical", "3": "writes" });
  });

  it("a width named but not drawn has no entry until an edge has it", () => {
    const d = ok(fx, [{ op: "diagram.legend", weight: "heavy", text: "critical" }]);
    expect(entries(d).some((x) => x.width !== undefined)).toBe(false);
    const drawn = ok(d, [{ op: "edge.weight", edges: ["service->mongo"], weight: "heavy" }]);
    expect(entries(drawn).at(-1)).toEqual({ text: "critical", width: 4 });
  });

  it("without text, a width loses its entry", () => {
    const named = ok(weighted, [{ op: "diagram.legend", weight: "thick", text: "writes" }]);
    const back = ok(named, [{ op: "diagram.legend", weight: "thick" }]);
    expect(back.legend).toBeUndefined();
    expect(writeDiagram(back)).toBe(writeDiagram(weighted));
  });

  it("the file keeps the names sorted, and reads them back", () => {
    const a = ok(weighted, [
      { op: "diagram.legend", weight: "thick", text: "writes" },
      { op: "diagram.legend", weight: 3, text: "copies" },
    ]);
    const b = ok(weighted, [
      { op: "diagram.legend", weight: 3, text: "copies" },
      { op: "diagram.legend", weight: "thick", text: "writes" },
    ]);
    const text = writeDiagram(a);
    expect(writeDiagram(b)).toBe(text);
    expect(text).toContain("weights:");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });

  it("a width written 2.50 in a file is the edge's 2.5", () => {
    for (const key of ["2.50", '"2.50"']) {
      const text = writeDiagram(weighted).replace(
        /\nlayers:/,
        `\nlegend:\n  weights:\n    ${key}: copies\nlayers:`,
      );
      expect((readDiagram(text) as Diagram).legend?.weights).toEqual({ "2.5": "copies" });
    }
  });

  it("diff gives back the operations that name a width", () => {
    const after = ok(weighted, [{ op: "diagram.legend", weight: 3, text: "copies" }]);
    const ops = diffDiagrams(weighted, after);
    expect(ops).toEqual([{ op: "diagram.legend", weight: 3, text: "copies" }]);
    expect(writeDiagram(ok(weighted, ops))).toBe(writeDiagram(after));
  });

  it("thin, a level the stylesheet lacks, and a width out of range are refused", () => {
    expect(fail(fx, [{ op: "diagram.legend", weight: "thin", text: "x" }])[0]).toMatchObject({
      code: "bad-value",
      field: "weight",
      facts: { allowed: ["thick", "heavy"], min: 0.5, max: 8 },
    });
    expect(fail(fx, [{ op: "diagram.legend", weight: "huge", text: "x" }])[0]).toMatchObject({
      code: "unknown-weight",
      found: "huge",
    });
    for (const weight of [12, "Heavy"]) {
      expect(parseOp({ op: "diagram.legend", weight, text: "x" }, 0)).toMatchObject([
        { code: "bad-value", field: "weight", facts: { allowed: ["thick", "heavy"], max: 8 } },
      ]);
    }
    const file = writeDiagram(fx).replace(
      /\nlayers:/,
      "\nlegend:\n  weights:\n    thin: x\nlayers:",
    );
    expect(readDiagram(file)).toMatchObject([{ code: "bad-value", field: "legend.weights" }]);
  });

  it("an entry is named by exactly one of style, weight and mark", () => {
    expect(fail(fx, [{ op: "diagram.legend", text: "x" }])[0]).toMatchObject({
      code: "missing-field",
      facts: { allowed: ["style", "weight", "mark"] },
    });
    expect(
      fail(fx, [{ op: "diagram.legend", style: "solid", weight: "thick", text: "x" }])[0],
    ).toMatchObject({ code: "conflicting-fields", field: "style,weight" });
  });
});

/** A warning on two nodes of the work row, and a red P0 badge on the relay above them. */
const marked = ok(fx, [
  { op: "node.icon", id: "pipelines", slot: "top-left", icon: "⚠️" },
  { op: "node.icon", id: "service", slot: "top-left", icon: "⚠️" },
  { op: "node.icon", id: "relay", slot: "top-right", icon: "P0", bg: "red" },
]);
const markEntries = (d: Diagram) => (layout(d, m).legend ?? []).filter((x) => x.mark !== undefined);

describe('the legend names marks (DESIGN.md, "A legend for widths and marks")', () => {
  it("a mark is in the legend only once it is named, and once for each name", () => {
    expect(markEntries(marked)).toEqual([]);
    const d = ok(marked, [
      { op: "diagram.legend", mark: "⚠️", text: "needs an owner" },
      { op: "diagram.legend", mark: "P0", text: "paged 24/7" },
    ]);
    const marks = markEntries(d);
    // Rows top to bottom: the relay's badge comes first.
    expect(marks.map((x) => x.label.runs.map((r) => r.text).join(""))).toEqual([
      "paged 24/7",
      "needs an owner",
    ]);
    // Drawn at the small size, styled as on the node.
    expect(marks.map((x) => x.mark?.mark)).toEqual([
      { text: "P0", bg: "#d1242f", size: "s" },
      { text: "⚠️", size: "s" },
    ]);
    expect(marks.every((x) => x.mark?.rect.h === 16 && x.style === undefined)).toBe(true);
  });

  it("the words stay in the file, and without text the mark leaves the legend", () => {
    const d = ok(marked, [{ op: "diagram.legend", mark: "⚠️", text: "needs an owner" }]);
    const text = writeDiagram(d);
    expect(text).toContain("marks:");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    const ops = diffDiagrams(marked, d);
    expect(ops).toEqual([{ op: "diagram.legend", mark: "⚠️", text: "needs an owner" }]);
    const back = ok(d, [{ op: "diagram.legend", mark: "⚠️" }]);
    expect(writeDiagram(back)).toBe(writeDiagram(marked));
  });

  it("a name longer than any mark is refused", () => {
    expect(fail(fx, [{ op: "diagram.legend", mark: "warning", text: "x" }])[0]).toMatchObject({
      code: "mark-too-long",
      field: "mark",
      facts: { max: 6 },
    });
    expect(ok(fx, [{ op: "diagram.legend", mark: "icons/lock.svg", text: "x" }]).legend).toEqual({
      marks: { "icons/lock.svg": "x" },
    });
  });
});

describe('the legend says only what the agent named (DESIGN.md, "The legend says only what the agent named")', () => {
  const styles = (d: Diagram) => (layout(d, m).legend ?? []).map((x) => x.style);

  it("a diagram that names nothing draws no legend", () => {
    expect(layout(fx, m).legend).toEqual([]);
    expect(layout(weighted, m).legend).toEqual([]);
  });

  it("a named line style has an entry, and without text it goes", () => {
    const d = ok(fx, [{ op: "diagram.legend", style: "dashed", text: "event" }]);
    expect(styles(d)).toEqual(["dashed"]);
    const text = writeDiagram(d);
    expect(text).toContain("dashed: event");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    expect(diffDiagrams(fx, d)).toEqual([{ op: "diagram.legend", style: "dashed", text: "event" }]);
    const back = ok(d, [{ op: "diagram.legend", style: "dashed" }]);
    expect(writeDiagram(back)).toBe(writeDiagram(fx));
  });

  it("hide is refused, and a file's false is read as no words", () => {
    expect(parseOp({ op: "diagram.legend", style: "solid", hide: true }, 0)).toMatchObject([
      { code: "unknown-field", field: "hide" },
    ]);
    const file = writeDiagram(fx).replace(
      /\nlayers:/,
      "\nlegend:\n  dashed: false\n  weights:\n    thick: false\nlayers:",
    );
    const d = readDiagram(file) as Diagram;
    expect(d.legend).toBeUndefined();
    expect(writeDiagram(d)).toBe(writeDiagram(fx));
  });

  it("show --drawn lists each style and width the picture draws, and each named mark", () => {
    const d = ok(marked, [
      { op: "edge.weight", edges: ["pipelines->mongo"], weight: "thick" },
      { op: "diagram.legend", weight: "thick", text: "writes" },
      { op: "diagram.legend", mark: "P0", text: "paged at night" },
    ]);
    const dr = drawing(d, layout(d, m));
    const none = { weight: null, width: null, mark: null, text: null };
    expect(dr.legend).toEqual([
      { ...none, style: "solid" },
      { ...none, style: "dashed" },
      { ...none, style: "solid", weight: "thick", width: 2.5, text: "writes" },
      { ...none, style: null, mark: "P0", text: "paged at night" },
    ]);
    // The ⚠️ marks are not named, so they are not listed.
    const text = drawingText(dr);
    expect(text).toContain("legend style=dashed weight=- width=- mark=- text=-");
    expect(text).toContain('legend style=- weight=- width=- mark=P0 text="paged at night"');
  });

  it("a file's entry holds words", () => {
    const file = writeDiagram(fx).replace(/\nlayers:/, "\nlegend:\n  plain: 5\nlayers:");
    expect(readDiagram(file)).toEqual([
      expect.objectContaining({
        code: "bad-type",
        field: "legend.plain",
        facts: { type: "string" },
      }),
    ]);
  });
});
