import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { opCommands } from "../../src/cli/batch.ts";
import { PAGES } from "../../src/cli/help.ts";
import { build } from "../../src/cli/main.ts";
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

  it("has no guide command any more", () => {
    const r = run("guide");
    expect(r.code).toBe(2);
    expect(r.err).toContain("code=unknown-command");
  });
});

describe('the counts in place of hints (DESIGN.md, "Records over prose")', () => {
  /** The photo-sharing diagram, where a line bends more than twice round the upload queue. */
  function photos(): string {
    writeFileSync(join(dir, "photos.grafical.yaml"), writeDiagram(edgeLooks));
    return "photos.grafical.yaml";
  }

  it("check prints the counts, and no hint, warning or advice", () => {
    const out = run("check", photos()).out;
    // The line round the upload queue is reported as a record, a fact and no warning.
    expect(out).toMatch(
      /^ok\nbent line=api->photos bends=4 skip=\d+\ncounts nodes=\d+ lines=\d+ crossings=\d+ bends=\d+ bent=1 /,
    );
    expect(out).not.toMatch(/^(hint|warning|lines):/m);
    // Every write reports it too, a single command as a batch (DESIGN.md, "The dirty work has edges").
    expect(run("diagram", "subtitle", photos(), "--text", "Uploads").out).toBe(
      "ok changed=subtitle\nbent line=api->photos bends=4 skip=1\n",
    );
    expect(run("diagram", "improve", photos()).code).toBe(2);
    const json = JSON.parse(run("check", photos(), "--json").out);
    expect(json.counts.lines).toBe(edgeLooks.edges.length);
    expect(json.hints).toBeUndefined();
    expect(json.warnings).toBeUndefined();
  });
});
