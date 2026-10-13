import { describe, expect, it } from "vitest";
import { diffDiagrams } from "../../src/model/diff.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { createStubMeasurer } from "../../src/text/index.ts";

const m = createStubMeasurer();
const HASH = "a".repeat(64);

const base: Diagram = {
  grafical: 1,
  title: "T",
  density: "normal",
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
  const r = applyOps(from, ops, m);
  if ("errors" in r) return r.errors;
  return r.diagram;
}

describe("node.icon (D40)", () => {
  it("sets a text or emoji mark in a slot, and one slot holds one mark", () => {
    const d = run([
      { op: "node.icon", id: "x", slot: "top-left", icon: "⚠️" },
      { op: "node.icon", id: "x", slot: "top-left", icon: "P0" },
      { op: "node.icon", id: "x", slot: "left", icon: "!" },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.icons).toEqual({ "top-left": "P0", left: "!" });
  });

  it("keeps a file mark with its hash", () => {
    const d = run([
      { op: "node.icon", id: "x", slot: "top-right", icon: "warn.svg", sha256: HASH },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.icons?.["top-right"]).toEqual({ file: "warn.svg", sha256: HASH });
  });

  it("clears a slot, and drops the empty mapping", () => {
    const d = run([
      { op: "node.icon", id: "x", slot: "top-left", icon: "⚠️" },
      { op: "node.icon", id: "x", slot: "top-left" },
    ]) as Diagram;
    expect(d.layers[0]?.nodes[0]?.icons).toBeUndefined();
  });

  it("refuses a text over 3 characters, and says the limit", () => {
    const e = run([{ op: "node.icon", id: "x", slot: "top-left", icon: "TOOLONG" }]);
    expect(e).toMatchObject([{ code: "mark-too-long", field: "icon", facts: { max: 3 } }]);
  });

  it("counts an emoji as one character", () => {
    const d = run([{ op: "node.icon", id: "x", slot: "top-left", icon: "👨‍👩‍👧" }]);
    expect(Array.isArray(d)).toBe(false);
  });

  it("refuses a file whose hash the command line did not fill in", () => {
    const e = run([{ op: "node.icon", id: "x", slot: "top-left", icon: "warn.svg" }]);
    expect(e).toMatchObject([{ code: "mark-file-unread" }]);
  });

  it("refuses the left slot on a diamond, and names the slots that remain", () => {
    const e = run([{ op: "node.icon", id: "q", slot: "left", icon: "!" }]);
    expect(e).toMatchObject([
      {
        code: "bad-value",
        field: "slot",
        facts: { allowed: ["top-left", "top-right", "bottom-left", "bottom-right"] },
      },
    ]);
  });

  it("refuses an unknown node and an unknown slot", () => {
    expect(run([{ op: "node.icon", id: "nope", slot: "left", icon: "!" }])).toMatchObject([
      { code: "unknown-node" },
    ]);
  });
});

describe("marks in the file", () => {
  const marked = run([
    { op: "node.icon", id: "x", slot: "top-left", icon: "⚠️" },
    { op: "node.icon", id: "x", slot: "bottom-right", icon: "a.png", sha256: HASH },
  ]) as Diagram;

  it("round-trips, with slots in a fixed order", () => {
    const text = writeDiagram(marked);
    expect(text).toContain("icons:");
    expect(text.indexOf("top-left")).toBeLessThan(text.indexOf("bottom-right"));
    expect(readDiagram(text)).toEqual(marked);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
  });

  it("refuses a text over 3 characters in the file", () => {
    const text = writeDiagram(marked).replace("⚠️", "TOOLONG");
    const r = readDiagram(text);
    expect(Array.isArray(r) && r[0]?.code).toBe("mark-too-long");
  });

  it("refuses an unknown slot in the file", () => {
    const text = writeDiagram(marked).replace("top-left", "middle");
    const r = readDiagram(text);
    expect(Array.isArray(r) && r[0]?.code).toBe("unknown-field");
  });

  it("is reported by diff as operations that rebuild it", () => {
    const ops = diffDiagrams(base, marked);
    expect(ops).toEqual([
      { op: "node.icon", id: "x", slot: "top-left", icon: "⚠️" },
      { op: "node.icon", id: "x", slot: "bottom-right", icon: "a.png", sha256: HASH },
    ]);
    expect(run(ops)).toEqual(marked);
  });
});
