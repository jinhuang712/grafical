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

  // Found by review on 2026-10-18: a prefix refused for another problem was read as one without the problem, and the
  // source named a later line.
  describe("never names a line that cannot be known", () => {
    const grocer = () =>
      readFileSync(join(import.meta.dirname, "../fixtures/grocer.grafical.yaml"), "utf8");
    const WORD = "Antidisestablishmentarianism";
    const big = (id: string, row: string) =>
      `- {op: node.add, id: ${id}, label: "${WORD} ${WORD} ${WORD} ${WORD}", layer: ${row}, last: true, size: s}`;
    const node = (id: string, row: string) =>
      `- {op: node.add, id: ${id}, label: ${id}, layer: ${row}, last: true}`;

    it("names the batch file when a prefix after the last one without the problem is refused for another", () => {
      writeFileSync(join(dir, "g7.grafical.yaml"), grocer());
      // Lines 3 to 6 split the group around picker-app, which line 7 joins to it: the label is too long from line 2 on.
      const b7 = [
        node("n1", "row-callers"),
        big("big", "row-callers"),
        "- {op: group.add, id: g, label: G, nodes: [customers, courier-app]}",
        node("n4", "row-edge"),
        node("n5", "row-edge"),
        node("n6", "row-edge"),
        "- {op: group.join, group: g, nodes: [picker-app]}",
        node("n8", "row-edge"),
      ];
      writeFileSync(join(dir, "b7.yaml"), `${b7.join("\n")}\n`);
      const r7 = run("apply", "g7.grafical.yaml", "b7.yaml");
      expect(r7.out).toMatch(/^defect: overflow$/m);
      // Whether the label is too long after lines 3 to 6 cannot be known, so no line can be named.
      expect(sources(r7.out)).toEqual(["b7.yaml"]);
      // Lines 3 to 6 draw a bar under row-callers that lines pass, which line 7 takes away: the group splits from
      // line 2 on.
      writeFileSync(join(dir, "g11.grafical.yaml"), grocer());
      const b11 = [
        "- {op: layer.add, id: row-wire, label: Bus, after: row-callers}",
        "- {op: group.add, id: g, label: G, nodes: [customers, courier-app]}",
        "- {op: layer.look, id: row-wire, look: box}",
        node("n4", "row-edge"),
        node("n5", "row-edge"),
        node("n6", "row-edge"),
        "- {op: layer.look, id: row-wire}",
        node("n8", "row-edge"),
      ];
      writeFileSync(join(dir, "b11.yaml"), `${b11.join("\n")}\n`);
      const r11 = run("apply", "g11.grafical.yaml", "b11.yaml");
      expect(r11.out).toMatch(/^error: group-split$/m);
      expect(sources(r11.out)).toEqual(["b11.yaml"]);
    });

    it("names the batch file with no line where no prefix can tell", () => {
      writeFileSync(join(dir, "gx.grafical.yaml"), grocer());
      // Every prefix that holds the long label also splits the group, until the last line joins picker-app to it.
      const bx = [
        "- {op: group.add, id: g, label: G, nodes: [customers, courier-app]}",
        big("big", "row-callers"),
        "- {op: group.join, group: g, nodes: [picker-app]}",
      ];
      writeFileSync(join(dir, "bx.yaml"), `${bx.join("\n")}\n`);
      const r = run("apply", "gx.grafical.yaml", "bx.yaml", "--json");
      expect(JSON.parse(r.out).problems).toMatchObject([
        { kind: "defect", code: "overflow", source: "bx.yaml" },
      ]);
    });

    it("gives each of many defects its line, or the batch file once the prefixes to try are spent", () => {
      writeFileSync(join(dir, "gm.grafical.yaml"), grocer());
      const rows = ["row-callers", "row-edge", "row-api", "row-svc"];
      const lines = Array.from({ length: 40 }, (_, i) =>
        i % 4 === 3 ? big(`n${i}`, rows[i % 4] as string) : node(`n${i}`, rows[i % 4] as string),
      );
      writeFileSync(join(dir, "many.yaml"), `${lines.join("\n")}\n`);
      const found = sources(run("apply", "gm.grafical.yaml", "many.yaml").out);
      expect(found).toHaveLength(10);
      for (const s of found) {
        if (s === "many.yaml") continue;
        const n = Number(s.match(/^many\.yaml line (\d+): /)?.[1]);
        expect(lines[n - 1], s).toContain(WORD);
        expect(s).toBe(`many.yaml line ${n}: ${lines[n - 1]?.slice(2)}`);
      }
      expect(found.filter((s) => s !== "many.yaml").length).toBeGreaterThan(0);
    });
  });

  it("of a warning: none, in text or in --json, as the outcome line names what the write changed", () => {
    // sync->geo bends three times and passes a row in this fixture, and other lines bend too
    // (DESIGN.md, "Every write prints every warning").
    const f = "bent.grafical.yaml";
    writeFileSync(
      join(dir, f),
      readFileSync(
        join(import.meta.dirname, "../fixtures/catalog-sync-help3.grafical.yaml"),
        "utf8",
      ),
    );
    expect(run("edge", "remove", f, "sync->geo").code).toBe(0);
    const add = run("edge", "add", f, "sync", "geo", "--label", "HTTP GET");
    expect(add.code).toBe(0);
    expect(add.out).toMatch(/^ok changed=sync->geo\n/);
    const warned = add.out.split("\n\n").filter((b) => b.startsWith("warning: "));
    expect(warned.some((b) => b.includes("  edge: sync->geo\n"))).toBe(true);
    for (const b of warned) expect(b).not.toMatch(/^source:/m);
    run("edge", "remove", f, "sync->geo");
    const json = JSON.parse(run("edge", "add", f, "sync", "geo", "--json").out);
    const warnings = json.problems.filter((x: { kind: string }) => x.kind === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    for (const w of warnings) expect(w.source).toBeUndefined();
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

  // Found by the second review on 2026-10-18: a stylesheet named on line 3 gave op 0, and a file or a batch that
  // cannot be read gave op 0 though no operation caused it.
  it("of a stylesheet an operation names gives that operation's index, and an error of the command none", () => {
    const f = fresh("sty.grafical.yaml");
    writeFileSync(
      join(dir, "sty.yaml"),
      "- {op: node.rename, id: web, label: Web}\n- {op: node.rename, id: api, label: API}\n- {op: diagram.style, style: missing.grafical-style.yaml}\n",
    );
    const sty = JSON.parse(run("apply", f, "sty.yaml", "--json").out);
    expect(sty.problems).toMatchObject([
      {
        code: "style-not-found",
        source: "sty.yaml line 3: {op: diagram.style, style: missing.grafical-style.yaml}",
        detail: { op: 2 },
      },
    ]);
    const missing = JSON.parse(run("apply", "nope.grafical.yaml", "sty.yaml", "--json").out);
    expect(missing.problems).toMatchObject([{ code: "file-not-found" }]);
    expect(missing.problems[0].detail.op).toBeUndefined();
    const unread = JSON.parse(run("apply", f, "nope.yaml", "--json").out);
    expect(unread.problems).toMatchObject([{ code: "batch-unreadable" }]);
    expect(unread.problems[0].detail.op).toBeUndefined();
  });

  // Found by the second review on 2026-10-18 (uw): a legend's weight that only a stylesheet had.
  it("of a weight the stylesheet a later line takes away is that line, which the legend's commands can change", () => {
    const f = fresh("uw.grafical.yaml");
    writeFileSync(
      join(dir, "w.grafical-style.yaml"),
      "grafical-style: 1\npaint:\n  edge:\n    weights: { critical: 6.5 }\n",
    );
    writeFileSync(
      join(dir, "uw.yaml"),
      "- {op: diagram.style, style: w.grafical-style.yaml}\n- {op: diagram.legend, weight: critical, text: Critical path}\n- {op: diagram.style, style: default}\n",
    );
    const r = JSON.parse(run("apply", f, "uw.yaml", "--json").out);
    expect(r.problems).toMatchObject([
      {
        code: "unknown-weight",
        source: "uw.yaml line 3: {op: diagram.style, style: default}",
        detail: { field: "legend.weights", found: "critical" },
        next: ["diagram style", "diagram legend"],
      },
    ]);
  });

  it("of an error already in the file gives --json no operation's index", () => {
    // A box between two members of a group in one row splits it, which only a write finds.
    const split = structuredClone(shop);
    const [api, db] = split.layers[1]?.nodes ?? [];
    if (api === undefined || db === undefined) throw new Error("row-b");
    split.layers[1]?.nodes.push({ id: "cache", label: "cache", kind: "store", group: "g" });
    api.group = "g";
    split.groups = [{ id: "g", label: "g" }];
    const f = fresh("split.grafical.yaml", split);
    writeFileSync(
      join(dir, "two.yaml"),
      "- {op: node.rename, id: web, label: Web}\n- {op: diagram.title, text: T}\n",
    );
    const r = JSON.parse(run("apply", f, "two.yaml", "--json").out);
    expect(r.problems).toMatchObject([
      { kind: "error", code: "group-split", source: "already in the file" },
    ]);
    expect(r.problems[0].detail.op).toBeUndefined();
    // An operation's own error keeps its index.
    writeFileSync(
      join(dir, "own.yaml"),
      "- {op: node.rename, id: web, label: Web}\n- {op: node.rename, id: nope, label: X}\n",
    );
    const own = JSON.parse(run("apply", fresh("own.grafical.yaml"), "own.yaml", "--json").out);
    expect(own.problems[0].detail.op).toBe(1);
  });
});
