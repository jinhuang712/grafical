import { describe, expect, it } from "vitest";
import { diffDiagrams } from "../../src/model/diff.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";

const HASH = "a".repeat(64);

const base: Diagram = {
  grafical: 1,
  title: "T",
  layers: [
    {
      id: "l",
      label: "L",
      nodes: [
        { id: "x", label: "X", kind: "service" },
        { id: "q", label: "Q", kind: "decision" },
      ],
    },
  ],
  edges: [],
};

function run(ops: Op[], from: Diagram = base) {
  const r = applyOps(from, ops);
  if ("errors" in r) return r.errors;
  return r.diagram;
}

describe('mark --set (specs/decisions, "Marks of any kind")', () => {
  it("sets a text or emoji mark in a slot, and one slot holds one mark", () => {
    const d = run([
      { op: "mark.set", ids: ["x:top-left"], text: "⚠️" },
      { op: "mark.set", ids: ["x:top-left"], text: "P0" },
      { op: "mark.set", ids: ["x:left"], text: "!" },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.marks).toEqual({ "top-left": "P0", left: "!" });
  });

  it("keeps a file mark with its hash", () => {
    const d = run([
      { op: "mark.set", ids: ["x:top-right"], file: "warn.svg", sha256: HASH },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.marks?.["top-right"]).toEqual({ file: "warn.svg", sha256: HASH });
  });

  it("clears a slot, and drops the empty mapping", () => {
    const d = run([
      { op: "mark.set", ids: ["x:top-left"], text: "⚠️" },
      { op: "mark.remove", ids: ["x:top-left"] },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.marks).toBeUndefined();
  });

  it("refuses a text over 6 characters, and says the limit", () => {
    const e = run([{ op: "mark.set", ids: ["x:top-left"], text: "TOOLONG" }]);
    expect(e).toMatchObject([{ code: "mark-too-long", field: "text", facts: { max: 6 } }]);
  });

  it("counts an emoji as one character", () => {
    const d = run([{ op: "mark.set", ids: ["x:top-left"], text: "👨‍👩‍👧" }]);
    expect(Array.isArray(d)).toBe(false);
  });

  it("refuses a file whose hash the command line did not fill in", () => {
    const e = run([{ op: "mark.set", ids: ["x:top-left"], text: "warn.svg" }]);
    expect(e).toMatchObject([{ code: "mark-file-unread" }]);
  });

  it("gives a text mark a background by name or by hex, and keeps the hex", () => {
    const d = run([
      { op: "mark.set", ids: ["x:top-left"], text: "P0", bg: "red" },
      { op: "mark.set", ids: ["x:top-right"], text: "NEW", bg: "#F5C542" },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.marks).toEqual({
      "top-left": { text: "P0", bg: "#d1242f" },
      "top-right": { text: "NEW", bg: "#f5c542" },
    });
  });

  it("refuses a background that is no color, and lists the names", () => {
    const e = run([{ op: "mark.set", ids: ["x:top-left"], text: "P0", bg: "pink" }]);
    expect(e).toMatchObject([
      {
        code: "bad-value",
        field: "bg",
        facts: { allowed: ["red", "amber", "green", "blue", "purple", "gray", "dark", "#rrggbb"] },
      },
    ]);
  });

  it("refuses a background on an emoji or on a file", () => {
    expect(run([{ op: "mark.set", ids: ["x:top-left"], text: "⚠️", bg: "red" }])).toMatchObject([
      { code: "mark-style-on-picture", field: "bg" },
    ]);
    expect(
      run([{ op: "mark.set", ids: ["x:top-left"], file: "a.svg", sha256: HASH, bg: "red" }]),
    ).toMatchObject([{ code: "mark-style-on-picture", field: "bg" }]);
  });

  it("setting the slot again keeps its background, and --bg - drops it", () => {
    const d = run([
      { op: "mark.set", ids: ["x:top-left"], text: "P0", bg: "red" },
      { op: "mark.set", ids: ["x:top-left"], text: "P1" },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.marks).toEqual({ "top-left": { text: "P1", bg: "#d1242f" } });
    const plain = run([
      { op: "mark.set", ids: ["x:top-left"], text: "P0", bg: "red" },
      { op: "mark.set", ids: ["x:top-left"], bg: "-" },
    ]) as Diagram;
    expect(plain.layers[0]?.nodes[0]?.marks).toEqual({ "top-left": "P0" });
  });

  it("sets the text color, border, shape and size of a text mark, keeping only what is not default", () => {
    const d = run([
      {
        op: "mark.set",
        ids: ["x:top-left"],
        text: "P0",
        bg: "red",
        fg: "#FFFFFF",
        border: "dark",
        shape: "pill",
        size: "l",
      },
      // The defaults are left out of the file.
      { op: "mark.set", ids: ["x:top-right"], text: "v2", shape: "rounded", size: "m" },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.marks).toEqual({
      "top-left": {
        text: "P0",
        bg: "#d1242f",
        fg: "#ffffff",
        border: "#1f2328",
        shape: "pill",
        size: "l",
      },
      "top-right": "v2",
    });
  });

  it("gives a picture a size, and refuses every other style on it, naming the field", () => {
    const d = run([
      { op: "mark.set", ids: ["x:top-left"], text: "⚠️", size: "l" },
      { op: "mark.set", ids: ["x:top-right"], file: "a.svg", sha256: HASH, size: "s" },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.marks).toEqual({
      "top-left": { text: "⚠️", size: "l" },
      "top-right": { file: "a.svg", sha256: HASH, size: "s" },
    });
    for (const f of ["bg", "fg", "border", "shape"] as const) {
      const v = f === "shape" ? "pill" : "red";
      expect(run([{ op: "mark.set", ids: ["x:left"], text: "⚠️", [f]: v }])).toMatchObject([
        { code: "mark-style-on-picture", field: f, facts: { allowed: ["size"] } },
      ]);
    }
  });

  it("refuses a text or border color that is no color, naming the field", () => {
    for (const f of ["fg", "border"] as const) {
      expect(run([{ op: "mark.set", ids: ["x:top-left"], text: "P0", [f]: "pink" }])).toMatchObject(
        [{ code: "bad-value", field: f }],
      );
    }
  });

  it("round-trips a styled mark and a sized picture, with keys sorted, and diff rebuilds them", () => {
    const d = run([
      { op: "mark.set", ids: ["x:top-left"], text: "P0", bg: "red", border: "dark", size: "s" },
      { op: "mark.set", ids: ["x:top-right"], text: "🔥", size: "l" },
    ]) as Diagram;
    const text = writeDiagram(d);
    expect(text).toMatch(/bg: "#d1242f"\n\s+border: "#1f2328"\n\s+size: "s"\n\s+text: "P0"/);
    expect(readDiagram(text)).toEqual(d);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    expect(run(diffDiagrams(base, d))).toEqual(d);
  });

  it("refuses the left slot on a diamond, and names the slots that remain", () => {
    const e = run([{ op: "mark.set", ids: ["q:left"], text: "!" }]);
    expect(e).toMatchObject([
      {
        code: "bad-value",
        field: "id",
        facts: { allowed: ["top-left", "top-right", "bottom-left", "bottom-right"] },
      },
    ]);
  });

  it("refuses an unknown node and an unknown slot", () => {
    expect(run([{ op: "mark.set", ids: ["nope:left"], text: "!" }])).toMatchObject([
      { code: "unknown-node" },
    ]);
  });
});

describe("marks in the file", () => {
  const marked = run([
    { op: "mark.set", ids: ["x:top-left"], text: "⚠️" },
    { op: "mark.set", ids: ["x:bottom-right"], file: "a.png", sha256: HASH },
  ]) as Diagram;

  it("round-trips, with slots in a fixed order", () => {
    const text = writeDiagram(marked);
    expect(text).toContain("<mark> x-top-left {");
    expect(text.indexOf("top-left")).toBeLessThan(text.indexOf("bottom-right"));
    expect(readDiagram(text)).toEqual(marked);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });

  it("refuses a text over 6 characters in the file", () => {
    const text = writeDiagram(marked).replace("⚠️", "TOOLONG");
    const r = readDiagram(text);
    expect(Array.isArray(r) && r[0]?.code).toBe("mark-too-long");
  });

  it("refuses an unknown slot in the file", () => {
    const text = writeDiagram(marked).replace("slot: top-left", "slot: middle");
    const r = readDiagram(text);
    expect(Array.isArray(r) && r[0]?.code).toBe("unknown-field");
  });

  it("is reported by diff as operations that rebuild it", () => {
    const ops = diffDiagrams(base, marked);
    expect(ops).toEqual([
      { op: "mark.set", ids: ["x:top-left"], text: "⚠️" },
      { op: "mark.set", ids: ["x:bottom-right"], file: "a.png", sha256: HASH },
    ]);
    expect(run(ops)).toEqual(marked);
  });

  it("round-trips a text mark with a background, and diff rebuilds it", () => {
    const d = run([{ op: "mark.set", ids: ["x:top-right"], text: "P0", bg: "red" }]) as Diagram;
    const text = writeDiagram(d);
    expect(text).toMatch(/slot: top-right\n\s+bg: "#d1242f"\n\s+text: "P0"/);
    expect(readDiagram(text)).toEqual(d);
    expect(run(diffDiagrams(base, d))).toEqual(d);
  });

  it("refuses a background that is not #rrggbb in the file", () => {
    const d = run([{ op: "mark.set", ids: ["x:top-right"], text: "P0", bg: "red" }]) as Diagram;
    const r = readDiagram(writeDiagram(d).replace("#d1242f", "red"));
    expect(Array.isArray(r) && r[0]?.code).toBeDefined();
  });
});
