// The legend's words (specs/decisions, "A legend for widths and marks", "The legend says only what the agent named"): naming edge
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
  validateDiagram,
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
  { op: "edge.set", ids: ["pipelines-mongo"], weight: "thick" },
  { op: "edge.set", ids: ["service-mongo"], weight: "heavy" },
  { op: "edge.set", ids: ["pipelines-postgres"], weight: "3" },
]);

describe('the legend names edge widths (specs/decisions, "A legend for widths and marks")', () => {
  it("widths it does not name have no entry", () => {
    expect(entries(weighted).filter((x) => x.width !== undefined)).toEqual([]);
  });

  it("a named width has its own entry, and the entries go from the thinnest", () => {
    const d = ok(weighted, [
      { op: "legend.set", ids: ["weight:heavy"], text: "critical" },
      { op: "legend.set", ids: ["weight:3"], text: "writes" },
    ]);
    expect(entries(d).filter((x) => x.width !== undefined)).toEqual([
      { text: "writes", width: 3 },
      { text: "critical", width: 4 },
    ]);
    expect(d.legend?.weights).toEqual({ heavy: "critical", "3": "writes" });
  });

  it("a width named but not drawn has no entry until an edge has it", () => {
    const d = ok(fx, [{ op: "legend.set", ids: ["weight:heavy"], text: "critical" }]);
    expect(entries(d).some((x) => x.width !== undefined)).toBe(false);
    const drawn = ok(d, [{ op: "edge.set", ids: ["service-mongo"], weight: "heavy" }]);
    expect(entries(drawn).at(-1)).toEqual({ text: "critical", width: 4 });
  });

  it("without text, a width loses its entry", () => {
    const named = ok(weighted, [{ op: "legend.set", ids: ["weight:thick"], text: "writes" }]);
    const back = ok(named, [{ op: "legend.remove", ids: ["weight:thick"] }]);
    expect(back.legend).toBeUndefined();
    expect(writeDiagram(back)).toBe(writeDiagram(weighted));
  });

  it("the file keeps the names sorted, and reads them back", () => {
    const a = ok(weighted, [
      { op: "legend.set", ids: ["weight:thick"], text: "writes" },
      { op: "legend.set", ids: ["weight:3"], text: "copies" },
    ]);
    const b = ok(weighted, [
      { op: "legend.set", ids: ["weight:3"], text: "copies" },
      { op: "legend.set", ids: ["weight:thick"], text: "writes" },
    ]);
    const text = writeDiagram(a);
    expect(writeDiagram(b)).toBe(text);
    expect(text).toContain("weights:");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });

  it("diff gives back the operations that name a width", () => {
    const after = ok(weighted, [{ op: "legend.set", ids: ["weight:3"], text: "copies" }]);
    const ops = diffDiagrams(weighted, after);
    expect(ops).toEqual([{ op: "legend.set", ids: ["weight:3"], text: "copies" }]);
    expect(writeDiagram(ok(weighted, ops))).toBe(writeDiagram(after));
  });

  it("thin, a level the stylesheet lacks, and a width out of range are refused", () => {
    expect(fail(fx, [{ op: "legend.set", ids: ["weight:thin"], text: "x" }])[0]).toMatchObject({
      code: "bad-value",
      field: "id",
      facts: { allowed: ["thick", "heavy"], min: 0.5, max: 8 },
    });
    expect(fail(fx, [{ op: "legend.set", ids: ["weight:huge"], text: "x" }])[0]).toMatchObject({
      code: "unknown-weight",
      found: "huge",
    });
    for (const weight of [12, "Heavy"]) {
      expect(fail(fx, [{ op: "legend.set", ids: [`weight:${weight}`], text: "x" }])).toMatchObject([
        { code: "bad-value", field: "id", facts: { allowed: ["thick", "heavy"], max: 8 } },
      ]);
    }
    const file = { ...structuredClone(fx), legend: { weights: { thin: "x" } } };
    expect(validateDiagram(file)).toMatchObject([{ code: "bad-value", field: "legend.weights" }]);
  });

  it("an entry is named by its address: style:, weight: or mark:", () => {
    const allowed = ["style:<style>", "weight:<level>", "mark:<text>"];
    for (const id of ["solid", "color:red", "style:"]) {
      expect(fail(fx, [{ op: "legend.set", ids: [id], text: "x" }])[0]).toMatchObject({
        code: "bad-value",
        field: "id",
        found: id,
        facts: { allowed },
      });
    }
  });
});

/** A warning on two nodes of the work layer, and a red P0 badge on the relay above them. */
const marked = ok(fx, [
  { op: "mark.set", ids: ["pipelines:top-left"], text: "⚠️" },
  { op: "mark.set", ids: ["service:top-left"], text: "⚠️" },
  { op: "mark.set", ids: ["relay:top-right"], text: "P0", bg: "red" },
]);
const markEntries = (d: Diagram) => (layout(d, m).legend ?? []).filter((x) => x.mark !== undefined);

describe('the legend names marks (specs/decisions, "A legend for widths and marks")', () => {
  it("a mark is in the legend only once it is named, and once for each name", () => {
    expect(markEntries(marked)).toEqual([]);
    const d = ok(marked, [
      { op: "legend.set", ids: ["mark:⚠️"], text: "needs an owner" },
      { op: "legend.set", ids: ["mark:P0"], text: "paged 24/7" },
    ]);
    const marks = markEntries(d);
    // Layers top to bottom: the relay's badge comes first.
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
    const d = ok(marked, [{ op: "legend.set", ids: ["mark:⚠️"], text: "needs an owner" }]);
    const text = writeDiagram(d);
    expect(text).toContain("marks:");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    const ops = diffDiagrams(marked, d);
    expect(ops).toEqual([{ op: "legend.set", ids: ["mark:⚠️"], text: "needs an owner" }]);
    const back = ok(d, [{ op: "legend.remove", ids: ["mark:⚠️"] }]);
    expect(writeDiagram(back)).toBe(writeDiagram(marked));
  });

  it("a name longer than any mark is refused", () => {
    expect(fail(fx, [{ op: "legend.set", ids: ["mark:warning"], text: "x" }])[0]).toMatchObject({
      code: "mark-too-long",
      field: "id",
      facts: { max: 6 },
    });
    expect(ok(fx, [{ op: "legend.set", ids: ["mark:marks/lock.svg"], text: "x" }]).legend).toEqual({
      marks: { "marks/lock.svg": "x" },
    });
  });
});

describe('the legend says only what the agent named (specs/decisions, "The legend says only what the agent named")', () => {
  const styles = (d: Diagram) => (layout(d, m).legend ?? []).map((x) => x.style);

  it("a diagram that names nothing draws no legend", () => {
    expect(layout(fx, m).legend).toEqual([]);
    expect(layout(weighted, m).legend).toEqual([]);
  });

  it("a named edge style has an entry, and without text it goes", () => {
    const d = ok(fx, [{ op: "legend.set", ids: ["style:dashed"], text: "event" }]);
    expect(styles(d)).toEqual(["dashed"]);
    const text = writeDiagram(d);
    expect(text).toContain('dashed: "event"');
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    expect(diffDiagrams(fx, d)).toEqual([
      { op: "legend.set", ids: ["style:dashed"], text: "event" },
    ]);
    const back = ok(d, [{ op: "legend.remove", ids: ["style:dashed"] }]);
    expect(writeDiagram(back)).toBe(writeDiagram(fx));
  });

  it("hide is refused", () => {
    expect(parseOp({ op: "legend.remove", ids: ["style:solid"], hide: true }, 0)).toMatchObject([
      { code: "unknown-field", field: "hide" },
    ]);
  });

  it("show --drawn lists each style and width the picture draws, and each named mark", () => {
    const d = ok(marked, [
      { op: "edge.set", ids: ["pipelines-mongo"], weight: "thick" },
      { op: "legend.set", ids: ["weight:thick"], text: "writes" },
      { op: "legend.set", ids: ["mark:P0"], text: "paged at night" },
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
    const file = { ...structuredClone(fx), legend: { plain: 5 } };
    expect(validateDiagram(file)).toEqual([
      expect.objectContaining({
        code: "bad-type",
        field: "legend.plain",
        facts: { type: "string" },
      }),
    ]);
  });
});
