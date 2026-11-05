// The .grafical file holds the same facts as the YAML (specs/grafical-file.md).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGrafical, writeGrafical } from "../../src/model/grafical-format.ts";
import { type Diagram, readDiagram, writeDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { generate } from "../fuzz/gen.ts";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");
const yaml = readdirSync(FIXTURES).filter((f) => f.endsWith(".yaml"));

function roundTrip(d: Diagram) {
  const text = writeGrafical(d);
  const back = readDiagram(text);
  expect(Array.isArray(back), text.slice(0, 200)).toBe(false);
  expect(writeDiagram(back as Diagram)).toBe(writeDiagram(d));
  expect(writeGrafical(back as Diagram)).toBe(text);
}

describe("the .grafical file", () => {
  it("holds every fixture with nothing lost", () => {
    for (const f of yaml)
      roundTrip(readDiagram(readFileSync(join(FIXTURES, f), "utf8")) as Diagram);
  });

  it("holds random diagrams with nothing lost", async () => {
    const m = await createMeasurer();
    for (let seed = 1; seed <= 200; seed++) roundTrip(generate(seed, m).diagram);
  }, 60_000);

  it("takes any text", () => {
    const d = readDiagram(readFileSync(join(FIXTURES, yaml[0] as string), "utf8")) as Diagram;
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

  it("refuses what it cannot read, and a reference to nothing", () => {
    expect(Array.isArray(parseGrafical("<diagram> {\n  title\n}\n"))).toBe(true);
    expect(Array.isArray(parseGrafical("<diagram> {\n"))).toBe(true);
    expect(Array.isArray(parseGrafical("<diagram> {\n}\n\n<thing> x {\n}\n"))).toBe(true);
  });
});
