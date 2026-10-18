// What caused a problem (DESIGN.md, "Refusals say what happened and which commands can change it"): the command line
// as typed, a batch's line and its operation as written, the batch line after which a problem of the whole diagram
// first appears, or what was already in the file.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { batchItems, commandLine } from "../../src/cli/source.ts";
import { writeDiagram } from "../../src/model/io.ts";
import type { Diagram } from "../../src/model/types.ts";

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
vi.setConfig({ testTimeout: 60_000 });

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-source-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

/** The source lines of a report. */
const sources = (out: string) =>
  out
    .split("\n")
    .filter((l) => l.startsWith("source: "))
    .map((l) => l.slice("source: ".length));

/** api and db in one row, under web. */
const shop: Diagram = {
  grafical: 1,
  title: "Shop",
  density: "normal",
  layers: [
    { id: "row-a", label: "A", nodes: [{ id: "web", label: "web", kind: "service" }] },
    {
      id: "row-b",
      label: "B",
      nodes: [
        { id: "api", label: "api", kind: "service" },
        { id: "db", label: "db", kind: "store" },
      ],
    },
  ],
  edges: [],
};

function fresh(name: string, d: Diagram = shop): string {
  writeFileSync(join(dir, name), writeDiagram(d));
  return name;
}

const LONG =
  "a label far too long for any box to hold on two lines of text at any size grafical has";

describe("source", () => {
  it("of a single command is the command line as typed, quoted where a shell needs it", () => {
    expect(commandLine(["node", "add", "d.grafical.yaml", "x", "--label", "order desk"])).toBe(
      'grafical node add d.grafical.yaml x --label "order desk"',
    );
    expect(commandLine(["edge", "step", "d.grafical.yaml", "a->b", "--n", "2"])).toBe(
      'grafical edge step d.grafical.yaml "a->b" --n 2',
    );
    const f = fresh("one.grafical.yaml");
    const r = run("node", "add", f, "cache", "--layer", "row-b", "--label", "cache");
    expect(sources(r.out)).toEqual([
      "grafical node add one.grafical.yaml cache --layer row-b --label cache",
    ]);
  });

  it("of a batch's operation is its line and its text as written, in flow form when written as a block", () => {
    const text = [
      "# a draft",
      "- {op: layer.add, id: row-c, label: C}",
      "- op: node.add",
      "  id: x",
      "  layer: row-c",
      "  label: X",
      "  nodes:",
      "    - a",
      "    - b",
      "- [1, 2]",
      "",
    ].join("\n");
    expect(batchItems(text)).toEqual([
      { line: 2, text: "{op: layer.add, id: row-c, label: C}" },
      { line: 3, text: "{op: node.add, id: x, layer: row-c, label: X, nodes: [a, b]}" },
      { line: 10, text: "[1, 2]" },
    ]);
    expect(batchItems("op: node.add\n")).toEqual([]);
    const f = fresh("batch.grafical.yaml");
    writeFileSync(
      join(dir, "dup.yaml"),
      "- op: node.add\n  id: x\n  layer: row-a\n  label: X\n  last: true\n- op: node.add\n  id: x\n  layer: row-a\n  label: X\n  last: true\n",
    );
    const r = run("apply", f, "dup.yaml");
    expect(r.code).toBe(1);
    expect(sources(r.out)).toEqual([
      "dup.yaml line 6: {op: node.add, id: x, layer: row-a, label: X, last: true}",
    ]);
    // --json keeps the operation's index as well.
    const j = JSON.parse(run("apply", f, "dup.yaml", "--json").out);
    expect(j.problems[0]).toMatchObject({ source: sources(r.out)[0], detail: { op: 1 } });
    // A line the YAML cannot read is its own source.
    writeFileSync(join(dir, "broken.yaml"), "- {op: node.add, id: y\n- {op: layer.add}\n");
    expect(sources(run("apply", f, "broken.yaml").out)[0]).toMatch(/^broken\.yaml line \d+: /);
  });

  it("of a problem of the whole diagram is the batch line after which it first appears", () => {
    const f = fresh("whole.grafical.yaml");
    writeFileSync(
      join(dir, "split.yaml"),
      [
        "- {op: node.add, id: cache, layer: row-b, label: cache, after: api}",
        "- {op: group.add, id: g, label: order desk, nodes: [api, db]}",
        "- {op: node.add, id: z, layer: row-a, label: z, last: true}",
        "",
      ].join("\n"),
    );
    const r = run("apply", f, "split.yaml");
    expect(r.out).toContain("error: group-split\n");
    expect(sources(r.out)).toEqual([
      "split.yaml line 2: {op: group.add, id: g, label: order desk, nodes: [api, db]}",
    ]);
    // Its index is that operation's, not the batch's last.
    expect(JSON.parse(run("apply", f, "split.yaml", "--json").out).problems[0].detail.op).toBe(1);
  });

  it("of a defect is the batch line after which it first appears and stays", () => {
    const f = fresh("defect.grafical.yaml");
    writeFileSync(
      join(dir, "long.yaml"),
      [
        "- {op: node.add, id: x, layer: row-a, label: x, last: true}",
        `- {op: node.rename, id: x, label: ${LONG}}`,
        "- {op: node.add, id: y, layer: row-a, label: y, last: true}",
        "",
      ].join("\n"),
    );
    const r = run("apply", f, "long.yaml");
    expect(r.out).toContain("defect: overflow\n");
    expect(new Set(sources(r.out))).toEqual(
      new Set([`long.yaml line 2: {op: node.rename, id: x, label: ${LONG}}`]),
    );
    // A defect the last line makes is found too.
    writeFileSync(
      join(dir, "last.yaml"),
      `- {op: node.add, id: x, layer: row-a, label: x, last: true}\n- {op: node.rename, id: x, label: ${LONG}}\n`,
    );
    expect(new Set(sources(run("apply", f, "last.yaml").out))).toEqual(
      new Set([`last.yaml line 2: {op: node.rename, id: x, label: ${LONG}}`]),
    );
  });

  it("of what the file had before the command is already in the file", () => {
    const bad = structuredClone(shop);
    const web = bad.layers[0]?.nodes[0];
    if (web === undefined) throw new Error("web");
    web.label = LONG;
    const f = fresh("had.grafical.yaml", bad);
    const before = readFileSync(join(dir, f), "utf8");
    const check = run("check", f);
    expect(check.code).toBe(1);
    expect(new Set(sources(check.out))).toEqual(new Set(["already in the file"]));
    // A write that does not touch it is refused for it, and names it as the file's.
    const write = run("diagram", "subtitle", f, "--text", "Orders");
    expect(write.code).toBe(1);
    expect(new Set(sources(write.out))).toEqual(new Set(["already in the file"]));
    expect(readFileSync(join(dir, f), "utf8")).toBe(before);
    // A file that cannot be read is the command's.
    expect(sources(run("show", "missing.grafical.yaml").out)).toEqual([
      "grafical show missing.grafical.yaml",
    ]);
  });
});
