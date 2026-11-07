// The .grafical file holds the same facts as the YAML (specs/grafical-file.md).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGrafical, writeGrafical } from "../../src/model/grafical-format.ts";
import { type Diagram, readDiagram, writeDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { generate } from "../fuzz/gen.ts";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");
const saved = readdirSync(FIXTURES).filter((f) => f.endsWith(".grafical"));

function roundTrip(d: Diagram) {
  const text = writeGrafical(d);
  const back = readDiagram(text);
  expect(Array.isArray(back), text.slice(0, 200)).toBe(false);
  expect(writeDiagram(back as Diagram)).toBe(writeDiagram(d));
  expect(writeGrafical(back as Diagram)).toBe(text);
}

describe("the .grafical file", () => {
  it("holds every fixture with nothing lost", () => {
    for (const f of saved)
      roundTrip(readDiagram(readFileSync(join(FIXTURES, f), "utf8")) as Diagram);
  });

  it("holds random diagrams with nothing lost", async () => {
    const m = await createMeasurer();
    for (let seed = 1; seed <= 200; seed++) roundTrip(generate(seed, m).diagram);
  }, 60_000);

  it("takes any text", () => {
    const d = readDiagram(readFileSync(join(FIXTURES, saved[0] as string), "utf8")) as Diagram;
    d.title = 'a: "b" \n 中文 🚀 { } <node>';
    roundTrip(d);
  });

  it("refuses an order that leaves out a member or names a stranger", () => {
    const head = '<diagram> {\n  format: 1\n  title: "T"\n}\n\n<layer> a {\n}\n\n';
    const order = (items: string) =>
      `<order> layers {\n  of: @diagram\n  items:\n    @a\n}\n\n<order> a-order {\n  of: @a\n  items:\n${items}}\n\n`;
    const node = (id: string, layer: string) =>
      `<node> ${id} {\n  type: @service\n  text: "X"\n  layer: @${layer}\n}\n\n`;
    expect(Array.isArray(parseGrafical(head + order("    @x\n") + node("x", "a")))).toBe(false);
    expect(
      Array.isArray(parseGrafical(head + order("    @x\n") + node("x", "a") + node("y", "a"))),
    ).toBe(true);
    expect(Array.isArray(parseGrafical(head + order("    @x\n    @y\n") + node("x", "a")))).toBe(
      true,
    );
  });

  const FILE = [
    '<diagram> {\n  format: 1\n  title: "T"\n}\n\n<layer> a {\n}\n\n',
    "<order> layers {\n  of: @diagram\n  items:\n    @a\n}\n\n",
    "<order> a-order {\n  of: @a\n  items:\n    @node\n}\n\n",
    '<node> node {\n  type: @service\n  text: "X"\n  layer: @a\n}\n',
  ].join("");

  it("takes any word as an ID, and one set of facts gives one set of bytes", () => {
    const d = readDiagram(FILE);
    if (Array.isArray(d)) throw new Error(JSON.stringify(d));
    expect(d.layers[0]?.nodes[0]?.id).toBe("node");
    roundTrip(d);
  });

  it("refuses an unknown attribute, on any sort", () => {
    expect(parseGrafical(FILE.replace('text: "X"\n', 'text: "X"\n  colour: red\n'))).toMatchObject([
      { code: "unknown-field", field: "node", found: "colour" },
    ]);
    expect(
      Array.isArray(parseGrafical(FILE.replace("<layer> a {\n", "<layer> a {\n  fill: #fff\n"))),
    ).toBe(true);
  });

  it("refuses an attribute written twice, and a second diagram", () => {
    expect(
      Array.isArray(parseGrafical(FILE.replace('text: "X"\n', 'text: "X"\n  text: "Y"\n'))),
    ).toBe(true);
    expect(Array.isArray(parseGrafical(`${FILE}\n<diagram> {\n  title: "U"\n}\n`))).toBe(true);
  });

  it("refuses a reference to nothing", () => {
    const stray = (x: string) => readDiagram(FILE + x);
    expect(readDiagram(FILE.replace("layer: @a\n", "layer: @a\n  group: @nope\n"))).toMatchObject([
      { code: "unknown-group" },
    ]);
    expect(Array.isArray(stray('\n<label> l {\n  on: @nope\n  text: "L"\n}\n'))).toBe(true);
    expect(Array.isArray(stray("\n<mark> m {\n  on: @nope\n  slot: left\n}\n"))).toBe(true);
  });

  it("refuses what it cannot read", () => {
    expect(Array.isArray(parseGrafical("<diagram> {\n  title\n}\n"))).toBe(true);
    expect(Array.isArray(parseGrafical("<diagram> {\n"))).toBe(true);
    expect(Array.isArray(parseGrafical("<diagram> {\n}\n\n<thing> x {\n}\n"))).toBe(true);
  });
});
