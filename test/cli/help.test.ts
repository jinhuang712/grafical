import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { opCommands } from "../../src/cli/batch.ts";
import { GUIDES } from "../../src/cli/guides.ts";
import { PAGES } from "../../src/cli/help.ts";
import { build, wrongCommand } from "../../src/cli/main.ts";
import { DEFECT_CODES, ERROR_CODES } from "../../src/errors.ts";
import { writeDiagram } from "../../src/model/io.ts";
import { OP_NAMES, SCHEMAS } from "../../src/model/ops.ts";
import { EDGE_KINDS, NODE_KINDS } from "../../src/model/types.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";

// Each page runs the real command line.
vi.setConfig({ testTimeout: 60_000 });

const MAIN = join(import.meta.dirname, "../../src/cli/main.ts");
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-help-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const SRC = join(import.meta.dirname, "../../src");

/** Every TypeScript file of the engine, as text. */
function sources(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? sources(join(dir, e.name))
      : e.name.endsWith(".ts")
        ? [readFileSync(join(dir, e.name), "utf8")]
        : [],
  );
}

/** A command's page as commander prints it, read in this process. */
function page(c: Command): string {
  let out = "";
  c.configureOutput({ writeOut: (s) => (out += s), getOutHelpWidth: () => 80 });
  c.outputHelp();
  return out;
}

describe('help pages (DESIGN.md, "One entry page, help where it is used")', () => {
  it("each page belongs to a command, shows its paragraph and sections, and fits a terminal", () => {
    for (const path of ["", ...Object.keys(PAGES)]) {
      const r = run(...(path === "" ? [] : path.split(" ")), "--help");
      expect(r.code, path).toBe(0);
      // The paragraph may be wrapped anew; its words and the sections are shown as written.
      const words = (s: string) => s.replace(/\s+/g, " ");
      const page = PAGES[path];
      if (page?.about !== undefined) expect(words(r.out), path).toContain(words(page.about));
      if (page?.after !== undefined) expect(r.out, path).toContain(page.after.trim());
      // Commands and batch items in an example may run long; the rest wraps at 80.
      const prose = r.out.split(/^Example/m)[0] ?? "";
      for (const line of prose.split("\n"))
        expect(line.length, `${path}: ${line}`).toBeLessThanOrEqual(80);
    }
  });

  it("the entry page names every subcommand in its group's line", () => {
    const entry = run("--help").out.replace(/\s+/g, " ");
    for (const g of build().commands.filter((c) => c.commands.length > 0)) {
      // The line is the group's summary, as the entry page prints it: "rows: add, move, ...".
      const named = (g.description().split(": ")[1] ?? "").split(", ");
      expect(entry, g.name()).toContain(g.description());
      expect([...named].sort(), g.name()).toEqual(g.commands.map((c) => c.name()).sort());
    }
  });

  it("every command of an operation shows its line in a batch, with the fields it needs", () => {
    const commands = opCommands(build());
    expect([...commands.keys()].sort()).toEqual([...OP_NAMES].sort());
    for (const [op, c] of commands) {
      const text = page(c);
      const section = text.split("In a batch:\n")[1]?.split("\n\n")[0] ?? "";
      expect(section, op).toMatch(new RegExp(`^ {2}- \\{op: ${op.replace(".", "\\.")}[,}]`));
      const needed = (SCHEMAS[op] as z.ZodObject).safeParse({ op }).error?.issues ?? [];
      for (const issue of needed) {
        const field = String(issue.path[0]);
        expect(section, `${op} ${field}`).toContain(`${field}: `);
      }
      for (const line of section.split("\n"))
        expect(line.length, `${op}: ${line}`).toBeLessThanOrEqual(80);
    }
  });

  it("layer add needs no label: its batch line shows only the id", () => {
    const c = opCommands(build()).get("layer.add");
    if (c === undefined) throw new Error("no layer.add");
    expect(page(c)).toContain("  - {op: layer.add, id: <id>}\n");
  });

  it("every command names its arguments and options as its operation's fields", () => {
    for (const [op, c] of opCommands(build())) {
      const fields = Object.keys((SCHEMAS[op] as z.ZodObject).shape);
      for (const a of c.registeredArguments.filter((a) => a.name() !== "file"))
        expect(fields, `${op} <${a.name()}>`).toContain(a.name());
      for (const o of c.options.filter((o) => o.attributeName() !== "json"))
        expect(fields, `${op} ${o.long}`).toContain(o.attributeName());
    }
  });

  it("every error and defect code listed is one grafical prints", () => {
    const src = sources()
      .filter((t) => !t.includes("export const ERROR_CODES"))
      .join("\n");
    for (const code of [...ERROR_CODES, ...DEFECT_CODES]) expect(src, code).toContain(`"${code}"`);
  });

  it("lists every kind of node and edge", () => {
    const nodes = run("node", "add", "--help").out;
    for (const k of NODE_KINDS) expect(nodes).toMatch(new RegExp(`^ {2}${k} `, "m"));
    const edges = run("edge", "add", "--help").out;
    for (const k of EDGE_KINDS) expect(edges).toMatch(new RegExp(`^ {2}${k} `, "m"));
  });

  it("guides stand apart: the entry page names them once, and no page says to read one first", () => {
    const entry = run("--help").out;
    expect(entry.match(/grafical guide/g)).toHaveLength(1);
    for (const path of Object.keys(PAGES))
      expect(run(...path.split(" "), "--help").out).not.toMatch(/grafical guide/);
  });

  it("has one way to a page, --help: no page lists a help command", () => {
    const program = build();
    for (const c of [program, ...program.commands])
      expect(page(c), c.name()).not.toMatch(/^ +help \[command\]/m);
  });

  it("answers a command it has not with the word it most likely means, as a value", () => {
    const program = build();
    const wrong = (...args: string[]) => {
      const b = wrongCommand(program, args);
      return b === undefined ? undefined : { found: b.detail.found, likely: b.detail.likely };
    };
    const meant = (found: string, likely?: string) => ({
      found,
      likely: likely === undefined ? undefined : [likely],
    });
    // The ways an agent asked for a page in a real run, 2026-10-18.
    expect(wrong("help", "apply")).toEqual(meant("help", "--help"));
    expect(wrong("help")).toEqual(meant("help", "--help"));
    expect(wrong("help", "node", "add")).toEqual(meant("help", "--help"));
    expect(wrong("help", "node add")).toEqual(meant("help", "--help"));
    expect(wrong("node", "help", "add")).toEqual(meant("help", "--help"));
    expect(wrong("diagram", "help", "legend")).toEqual(meant("help", "--help"));
    expect(wrong("node add", "--help")).toEqual(meant("node add", "node add"));
    expect(wrong("node.add", "--help")).toEqual(meant("node.add", "node add"));
    // A misspelling near one command's name; a word near none.
    expect(wrong("nodee", "add", "--help")).toEqual(meant("nodee", "node"));
    expect(wrong("node", "ad", "-h")).toEqual(meant("ad", "add"));
    expect(wrong("nodee", "add", "d.grafical.yaml", "x")).toEqual(meant("nodee", "node"));
    expect(wrong("bogus")).toEqual(meant("bogus"));
    expect(wrong("bogus", "--help")).toEqual(meant("bogus"));
    expect(wrong("node", "bogus")).toEqual(meant("bogus"));
    // Commands it has, and the words a command takes, are commander's to read.
    expect(wrong("node", "add", "--help")).toBeUndefined();
    expect(wrong("node", "--help")).toBeUndefined();
    expect(wrong("group", "label", "d.grafical.yaml", "g", "top")).toBeUndefined();
    expect(wrong("diagram", "legend", "help")).toBeUndefined();
    expect(wrong()).toBeUndefined();
    // The command line prints the block alone, in place of the entry page, as a usage error.
    expect(run("node add", "--help")).toEqual({
      code: 2,
      out: "",
      err: [
        "failed changed=-",
        "",
        "error: unknown-command",
        "description: No command has the name.",
        'source: grafical "node add" --help',
        "detail:",
        "  found: node add",
        "  likely: node add",
        "next: -",
        "",
      ].join("\n"),
    });
  });
});

describe('guides (DESIGN.md, "Help for the tool, guides for best practice")', () => {
  it("grafical guide lists every guide, and prints each whole, at 80 columns", () => {
    const list = run("guide");
    expect(list.code).toBe(0);
    for (const [name, g] of Object.entries(GUIDES)) {
      expect(list.out, name).toMatch(new RegExp(`^ {4}${name} +${g.about}$`, "m"));
      const r = run("guide", name);
      expect(r.code, name).toBe(0);
      expect(r.out, name).toBe(`${g.text}\n`);
    }
    for (const text of [list.out, ...Object.values(GUIDES).map((g) => g.text)])
      for (const line of text.split("\n")) expect(line.length, line).toBeLessThanOrEqual(80);
  });

  it("finds a guide by another name for its kind, and refuses a name that is none", () => {
    expect(run("guide", "cloud").out).toBe(`${GUIDES.infrastructure?.text}\n`);
    const r = run("guide", "flowchat");
    expect(r.code).toBe(2);
    expect(r.err).toContain("error: unknown-guide\n");
    expect(r.err).toContain("detail:\n  found: flowchat\n  likely: flowchart, ");
  });

  it("names only kinds and guides that exist", () => {
    const kinds = new Set<string>([...NODE_KINDS, ...EDGE_KINDS]);
    for (const [name, g] of Object.entries(GUIDES)) {
      for (const [, k] of g.text.matchAll(/\bkinds? ([a-z]+)/g))
        expect(kinds, `${name}: kind ${k}`).toContain(k);
      for (const [, other] of g.text.matchAll(/grafical guide ([a-z-]+)/g))
        expect(Object.keys(GUIDES), `${name}: ${other}`).toContain(other);
    }
  });
});

describe('the counts in place of hints (DESIGN.md, "Records over prose")', () => {
  /** The photo-sharing diagram, where a line bends more than twice round the upload queue. */
  function photos(): string {
    writeFileSync(join(dir, "photos.grafical.yaml"), writeDiagram(edgeLooks));
    return "photos.grafical.yaml";
  }

  it("check prints the counts, and a line bent more than twice as a warning, with no advice", () => {
    // The line round the upload queue is a warning of what happened, with the commands that can change it, and no
    // source: the outcome line names what a write changed (DESIGN.md, "Refusals say what happened and which commands
    // can change it").
    const bent = [
      "warning: bent-line",
      "description: A line bends more than twice, mostly because it skips rows.",
      "detail:",
      "  edge: api->photos",
      "  bends: 4",
      "  skip: 1",
      "next: layer move, node move",
    ].join("\n");
    const out = run("check", photos()).out;
    expect(out.startsWith(`ok\n\n${bent}\n\ncounts nodes=`)).toBe(true);
    expect(out).toMatch(/^counts nodes=\d+ lines=\d+ crossings=\d+ bends=\d+ bent=1 /m);
    expect(out).not.toMatch(/^(hint|lines):/m);
    // Every write reports it too, a single command as a batch (DESIGN.md, "The dirty work has edges").
    expect(run("diagram", "subtitle", photos(), "--text", "Uploads").out).toBe(
      `ok changed=subtitle\n\n${bent}\n`,
    );
    expect(run("diagram", "improve", photos()).code).toBe(2);
    const json = JSON.parse(run("check", photos(), "--json").out);
    expect(json.counts.lines).toBe(edgeLooks.edges.length);
    expect(json.problems).toMatchObject([
      { kind: "warning", code: "bent-line", detail: { edge: "api->photos", bends: 4, skip: 1 } },
    ]);
    expect(json.problems[0].source).toBeUndefined();
    expect(json.hints).toBeUndefined();
    expect(json.bent).toBeUndefined();
  });
});
