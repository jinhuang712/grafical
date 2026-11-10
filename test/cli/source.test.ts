// What caused a problem (specs/decisions, "Refusals say what happened and which commands can change it"): the command line
// as typed, or what was already in the file.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { commandLine } from "../../src/cli/source.ts";
import { writeDiagram } from "../../src/model/io.ts";
import type { Diagram } from "../../src/model/types.ts";
import { typed } from "./argv.ts";

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
vi.setConfig({ testTimeout: 60_000 });

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-source-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...typed(args)], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

/** The source lines of an answer. */
const sources = (out: string) =>
  out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("source: "))
    .map((l) => l.slice("source: ".length));

/** api and db in one layer, under web. */
const shop: Diagram = {
  grafical: 1,
  title: "Shop",
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
    expect(commandLine(["node", "--set", "x", "--label", "order desk"])).toBe(
      'grafical node --set x --label "order desk"',
    );
    expect(commandLine(["edge", "--set", "a-b", "--label", "it's"])).toBe(
      `grafical edge --set a-b --label "it's"`,
    );
    const f = fresh("one.grafical");
    const r = run("node", "set", f, "cache", "--layer", "row-b", "--label", "cache");
    expect(sources(r.out)).toEqual([
      "grafical -f one.grafical node --set cache --layer row-b --label cache",
    ]);
  });

  it("of a problem of the whole diagram the command makes is the command", () => {
    const f = fresh("whole.grafical");
    expect(
      run("node", "set", f, "cache", "--layer", "row-b", "--label", "cache", "--after", "api").code,
    ).toBe(0);
    expect(run("group", "set", f, "g", "--label", "order desk").code).toBe(0);
    const r = run("node", "set", f, "api,db", "--group", "g");
    expect(r.out).toContain("  ERROR group-split\n");
    expect(sources(r.out)).toEqual(["grafical -f whole.grafical node --set api,db --group g"]);
  });

  it("of a defect the command makes is the command", () => {
    const f = fresh("defect.grafical");
    const r = run("node", "set", f, "web", "--label", LONG);
    expect(r.out).toContain("  DEFECT overflow\n");
    expect(new Set(sources(r.out))).toEqual(
      new Set([`grafical -f defect.grafical node --set web --label "${LONG}"`]),
    );
  });

  it("of a warning a write brings is the command, in text and in --json", () => {
    // sync-geo bends three times and passes a layer in this fixture, and other edges bend too: a write prints only the
    // warnings it brought (specs/decisions, "An answer says what happened, and a write reports only what it changed").
    const f = "bent.grafical";
    writeFileSync(
      join(dir, f),
      readFileSync(join(import.meta.dirname, "../fixtures/catalog-sync-help3.grafical"), "utf8"),
    );
    expect(run("edge", "remove", f, "sync-geo").code).toBe(0);
    const add = run(
      "edge",
      "set",
      f,
      "sync-geo",
      "--from",
      "sync",
      "--to",
      "geo",
      "--label",
      "HTTP GET",
    );
    expect(add.code).toBe(0);
    expect(add.out).toMatch(
      /^WRITTEN\n<changes>\n {2}MADE edge=sync-geo\n<\/changes>\n<warnings>\n/,
    );
    const command =
      'grafical -f bent.grafical edge --set sync-geo --from sync --to geo --label "HTTP GET"';
    const warned = add.out.split("\n\n").filter((b) => b.includes("WARNING "));
    expect(warned.some((b) => b.includes("      edge: sync-geo\n"))).toBe(true);
    expect(new Set(sources(add.out))).toEqual(new Set([command]));
    // The warnings of the other edges were there before the write, so it does not print them.
    const all = run("check", f).out;
    expect(sources(all).length).toBeGreaterThan(sources(add.out).length);
    run("edge", "remove", f, "sync-geo");
    const json = JSON.parse(
      run("edge", "set", f, "sync-geo", "--from", "sync", "--to", "geo", "--json").out,
    );
    const warnings = json.problems.filter((x: { kind: string }) => x.kind === "WARNING");
    expect(warnings.length).toBe(json.warnings.new);
    expect(warnings.length).toBeGreaterThan(0);
    for (const w of warnings)
      expect(w.source).toBe(
        "grafical -f bent.grafical edge --set sync-geo --from sync --to geo --json",
      );
  });

  it("of what the file had before the command is already in the file", () => {
    const bad = structuredClone(shop);
    const web = bad.layers[0]?.nodes[0];
    if (web === undefined) throw new Error("web");
    web.label = LONG;
    const f = fresh("had.grafical", bad);
    const before = readFileSync(join(dir, f), "utf8");
    const check = run("check", f);
    expect(check.code).toBe(1);
    expect(new Set(sources(check.out))).toEqual(new Set(["already in the file"]));
    // A write that does not touch it is refused for it, and names it as the file's.
    const write = run("diagram", "set", f, "--subtitle", "Orders");
    expect(write.code).toBe(1);
    expect(new Set(sources(write.out))).toEqual(new Set(["already in the file"]));
    expect(readFileSync(join(dir, f), "utf8")).toBe(before);
    // A file that cannot be read is the command's.
    expect(sources(run("show", "missing.grafical").out)).toEqual([
      "grafical -f missing.grafical show",
    ]);
  });

  it("of a stylesheet the command names is the command, and of a file it cannot read too", () => {
    const f = fresh("sty.grafical");
    const sty = JSON.parse(
      run("diagram", "set", f, "--stylesheet", "missing.grafical", "--json").out,
    );
    expect(sty.problems).toMatchObject([
      {
        code: "style-not-found",
        source: "grafical -f sty.grafical diagram --set --stylesheet missing.grafical --json",
      },
    ]);
    const missing = JSON.parse(
      run("node", "set", "nope.grafical", "x", "--label", "X", "--json").out,
    );
    expect(missing.problems).toMatchObject([{ code: "file-not-found" }]);
  });

  // Found by the second review on 2026-10-18 (uw): a legend's weight that only a stylesheet had.
  it("of a weight the stylesheet a command takes away is that command, which the legend's commands can change", () => {
    const f = fresh("uw.grafical");
    writeFileSync(
      join(dir, "w.grafical"),
      "<stylesheet> {\n  format: 1\n}\n\n<weight> critical {\n  width: 6.5\n}\n",
    );
    expect(run("diagram", "set", f, "--stylesheet", "w.grafical").code).toBe(0);
    expect(run("legend", "set", f, "weight:critical", "--text", "Critical path").code).toBe(0);
    const r = JSON.parse(run("diagram", "set", f, "--stylesheet", "default", "--json").out);
    expect(r.problems).toMatchObject([
      {
        code: "unknown-weight",
        source: "grafical -f uw.grafical diagram --set --stylesheet default --json",
        detail: { field: "legend.weights", found: "critical" },
        next: ["diagram --set", "legend --set"],
      },
    ]);
  });

  it("of an error already in the file is the file's", () => {
    // A node between two members of a group in one layer splits it, which only a write finds.
    const split = structuredClone(shop);
    const [api, db] = split.layers[1]?.nodes ?? [];
    if (api === undefined || db === undefined) throw new Error("row-b");
    split.layers[1]?.nodes.push({ id: "cache", label: "cache", kind: "store", group: "g" });
    api.group = "g";
    split.groups = [{ id: "g", label: "g" }];
    const f = fresh("split.grafical", split);
    const r = JSON.parse(run("node", "set", f, "web", "--label", "Web", "--json").out);
    expect(r.problems).toMatchObject([
      { kind: "ERROR", code: "group-split", source: "already in the file" },
    ]);
    // check says what every write would say of the file, and draws nothing from it.
    const check = run("check", f, "--json");
    expect(check.code).toBe(1);
    const report = JSON.parse(check.out);
    expect(report.outcome).toBe("REFUSED");
    expect(report.counts).toBeUndefined();
    expect(report.problems).toMatchObject([
      { kind: "ERROR", code: "group-split", source: "already in the file" },
    ]);
  });
});
