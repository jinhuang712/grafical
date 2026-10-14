// The legend's words (DESIGN.md, "A legend for widths and marks"): naming line widths, through the operation and the file.

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
  it("widths it does not name share one main path entry, drawn at the thinnest", () => {
    expect(entries(weighted).filter((x) => x.width !== undefined)).toEqual([
      { text: "main path", width: 2.5 },
    ]);
  });

  it("a named width has its own entry, and the entries go from the thinnest", () => {
    const d = ok(weighted, [
      { op: "diagram.legend", weight: "heavy", text: "critical" },
      { op: "diagram.legend", weight: 3, text: "writes" },
    ]);
    expect(entries(d).filter((x) => x.width !== undefined)).toEqual([
      { text: "main path", width: 2.5 },
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

  it("without text, a width goes back to the default words", () => {
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

describe('the legend leaves entries out (DESIGN.md, "A legend for widths and marks")', () => {
  const styles = (d: Diagram) => (layout(d, m).legend ?? []).map((x) => x.style);

  it("hide leaves a line style out, and without it the entry comes back", () => {
    expect(styles(fx)).toContain("dashed");
    const d = ok(fx, [{ op: "diagram.legend", style: "dashed", hide: true }]);
    expect(styles(d)).not.toContain("dashed");
    const text = writeDiagram(d);
    expect(text).toContain("dashed: false");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    expect(diffDiagrams(fx, d)).toEqual([{ op: "diagram.legend", style: "dashed", hide: true }]);
    const back = ok(d, [{ op: "diagram.legend", style: "dashed" }]);
    expect(writeDiagram(back)).toBe(writeDiagram(fx));
  });

  it("a width left out has no entry, and is not in the shared main path", () => {
    const d = ok(weighted, [{ op: "diagram.legend", weight: "thick", hide: true }]);
    // The heavy and the 3 pixel lines still share main path, now drawn at 3.
    expect(entries(d).filter((x) => x.width !== undefined)).toEqual([
      { text: "main path", width: 3 },
    ]);
  });

  it("hide takes no text, and a mark is left out by not naming it", () => {
    expect(
      fail(fx, [{ op: "diagram.legend", style: "solid", text: "x", hide: true }])[0],
    ).toMatchObject({ code: "conflicting-fields", field: "text,hide" });
    expect(fail(fx, [{ op: "diagram.legend", mark: "P0", hide: true }])[0]).toMatchObject({
      code: "conflicting-fields",
      field: "mark,hide",
    });
  });

  it("show --drawn lists each entry the legend draws, in its order", () => {
    const d = ok(marked, [
      { op: "edge.weight", edges: ["pipelines->mongo"], weight: "thick" },
      { op: "diagram.legend", weight: "thick", text: "writes" },
      { op: "diagram.legend", mark: "P0", text: "paged at night" },
      { op: "diagram.legend", style: "dashed", hide: true },
    ]);
    const dr = drawing(d, layout(d, m));
    expect(dr.legend.slice(1)).toEqual([
      { style: "solid", width: 2.5, mark: null, text: "writes" },
      { style: null, width: null, mark: "P0", text: "paged at night" },
    ]);
    expect(dr.legend[0]).toMatchObject({ style: "solid", width: null, mark: null });
    expect(drawingText(dr)).toContain('legend style=- width=- mark=P0 text="paged at night"');
  });

  it("a file's entry holds words or false", () => {
    const file = writeDiagram(fx).replace(/\nlayers:/, "\nlegend:\n  plain: 5\nlayers:");
    expect(readDiagram(file)).toMatchObject([
      { code: "bad-type", field: "legend.plain", facts: { type: "string", allowed: ["false"] } },
    ]);
  });
});
