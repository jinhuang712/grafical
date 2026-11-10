import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { opCommands } from "../../src/cli/diff.ts";
import { GUIDES } from "../../src/cli/guides.ts";
import { PAGES } from "../../src/cli/help.ts";
import { build, wrongCommand } from "../../src/cli/main.ts";
import { FILE_COMMANDS, NOUNS, surfaceText } from "../../src/cli/surface.ts";
import { DEFECT_CODES, ERROR_CODES, WARNING_CODES } from "../../src/errors.ts";
import { writeDiagram } from "../../src/model/io.ts";
import { OP_KEYS } from "../../src/model/issues.ts";
import { OP_NAMES } from "../../src/model/ops.ts";
import { EDGE_KINDS, NODE_KINDS } from "../../src/model/types.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";
import { typed } from "./argv.ts";

// Each page runs the real command line.
vi.setConfig({ testTimeout: 60_000 });

const MAIN = join(import.meta.dirname, "../../src/cli/main.ts");
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-help-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...typed(args)], { cwd: dir, encoding: "utf8" });
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

describe('help pages (specs/decisions, "One entry page, help where it is used")', () => {
  it("each page belongs to a command, shows its paragraph and sections, and fits a terminal", () => {
    build();
    for (const path of ["", ...Object.keys(PAGES)]) {
      const r = run(...(path === "" ? [] : path.split(" ")), "--help");
      expect(r.code, path).toBe(0);
      // The paragraph may be wrapped anew; its words and the sections are shown as written.
      const words = (s: string) => s.replace(/\s+/g, " ");
      const page = PAGES[path];
      if (page?.about !== undefined)
        expect(words(r.out), path).toContain(words(surfaceText(words(page.about))));
      if (page?.after !== undefined) expect(r.out, path).toContain(surfaceText(page.after.trim()));
      // Commands in an example may run long; the rest wraps at 80.
      const prose = r.out.split(/^Example/m)[0] ?? "";
      for (const line of prose.split("\n"))
        expect(line.length, `${path}: ${line}`).toBeLessThanOrEqual(80);
      // The paragraph is wrapped as full as each line holds: no word waits for a line the one before had room for.
      const lines = (r.out.split(/^(?:Arguments|Options|Commands):/m)[0] ?? "")
        .split("\n")
        .slice(1);
      for (const [k, line] of lines.entries()) {
        const next = lines[k + 1] ?? "";
        if (line === "" || next === "" || /^\s/.test(next)) continue;
        const word = next.split(" ")[0] ?? "";
        expect(line.length + 1 + word.length, `${path}: ${line} / ${word}`).toBeGreaterThan(80);
      }
    }
  });

  it("the entry page names every command as the command line takes it", () => {
    const entry = run("--help").out;
    const said = entry.replace(/\s+/g, " ");
    const verbs = new Map<string, Set<string>>();
    for (const name of OP_NAMES) {
      const [noun, verb] = name.split(".") as [string, string];
      verbs.set(noun, new Set([...(verbs.get(noun) ?? []), verb]));
    }
    // A noun and its verb as two words is a command it never takes, even across a line's end.
    for (const [noun, all] of verbs) {
      for (const verb of all)
        expect(said, `${noun} ${verb}`).not.toMatch(new RegExp(`\\b${noun} ${verb}\\b`));
    }
    // A command that reads a file names it first, with -f, and then a command that exists.
    for (const m of said.matchAll(/\bgrafical (\S+)( \S+)?( \S+)?( \S+)?/g)) {
      const [, first, , command, verb] = m.map((x) => x?.trim());
      if (first !== "-f") {
        expect([...NOUNS, ...FILE_COMMANDS], m[0]).not.toContain(first);
        continue;
      }
      if (FILE_COMMANDS.includes(command ?? "")) continue;
      expect(verbs.get(command ?? "")?.has((verb ?? "").replace(/^--/, "")), m[0]).toBe(true);
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

  it("every operation runs as one command", () => {
    const commands = opCommands(build());
    expect([...commands.keys()].sort()).toEqual([...OP_NAMES].sort());
  });

  it("every command names its arguments and options as its operation's fields", () => {
    for (const [op, c] of opCommands(build())) {
      const fields = OP_KEYS[op] ?? [];
      for (const a of c.registeredArguments.filter((a) => a.name() !== "file"))
        expect(fields, `${op} <${a.name()}>`).toContain(a.name());
      for (const o of c.options.filter((o) => !["json", "try"].includes(o.attributeName())))
        expect(fields, `${op} ${o.long}`).toContain(o.attributeName());
    }
  });

  it("every error and defect code listed is one grafical prints", () => {
    const src = sources()
      .filter((t) => !t.includes("export const ERROR_CODES"))
      .join("\n");
    for (const code of [...ERROR_CODES, ...DEFECT_CODES]) expect(src, code).toContain(`"${code}"`);
  });

  it('names every warning in check\'s Output (specs/decisions, "An answer says what happened, and a write reports only what it changed")', () => {
    const output = PAGES.check?.after?.split("Output:\n")[1]?.split("\n\n")[0] ?? "";
    for (const code of WARNING_CODES)
      expect(output, code).toMatch(new RegExp(`^ {4}${code} `, "m"));
  });

  it("lists every kind of node and edge", () => {
    const nodes = run("node", "set", "--help").out;
    for (const k of NODE_KINDS) expect(nodes).toMatch(new RegExp(`^ {2}${k} `, "m"));
    const edges = run("edge", "set", "--help").out;
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
    expect(wrong("help", "node")).toEqual(meant("help", "--help"));
    expect(wrong("help")).toEqual(meant("help", "--help"));
    expect(wrong("help", "node", "set")).toEqual(meant("help", "--help"));
    expect(wrong("help", "node set")).toEqual(meant("help", "--help"));
    expect(wrong("node", "help", "set")).toEqual(meant("help", "--help"));
    expect(wrong("diagram", "help", "set")).toEqual(meant("help", "--help"));
    expect(wrong("node set", "--help")).toEqual(meant("node set", "node --set"));
    expect(wrong("node.set", "--help")).toEqual(meant("node.set", "node --set"));
    // A misspelling near one command's name; a word near none.
    expect(wrong("nodee", "set", "--help")).toEqual(meant("nodee", "node"));
    expect(wrong("node", "se", "-h")).toEqual(meant("se", "set"));
    expect(wrong("nodee", "set", "d.grafical", "x")).toEqual(meant("nodee", "node"));
    expect(wrong("bogus")).toEqual(meant("bogus"));
    expect(wrong("bogus", "--help")).toEqual(meant("bogus"));
    expect(wrong("node", "bogus")).toEqual(meant("bogus"));
    // Commands it has, and the words a command takes, are commander's to read.
    expect(wrong("node", "set", "--help")).toBeUndefined();
    expect(wrong("node", "--help")).toBeUndefined();
    expect(wrong("note", "set", "help")).toBeUndefined();
    expect(wrong()).toBeUndefined();
    // The command line prints the block alone, in place of the entry page, as a usage error.
    expect(run("node set", "--help")).toEqual({
      code: 2,
      out: "",
      err: [
        "REFUSED",
        "<problems>",
        "  ERROR unknown-command",
        "    description: No command has the name.",
        '    source: grafical "node set" --help',
        "    detail:",
        "      found: node set",
        "      likely: node --set",
        "    next: -",
        "</problems>",
        "",
      ].join("\n"),
    });
  });
});

describe('guides (specs/decisions, "Help for the tool, guides for best practice")', () => {
  it("library lists the built-in stylesheets and finds them by a word", () => {
    const all = run("library");
    expect(all.code).toBe(0);
    expect(all.out.split("\n").filter((l) => l.startsWith("  stylesheet ")).length).toBe(3);
    expect(run("library", "dark").out).toBe(
      'OK\n<stylesheets>\n  stylesheet name=dark about="Light lines on a dark ground."\n</stylesheets>\n',
    );
    // A section with nothing in it is left out.
    expect(run("library", "neon").out).toBe("OK\n");
  });

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
    expect(r.err).toContain("  ERROR unknown-guide\n");
    expect(r.err).toContain("    detail:\n      found: flowchat\n      likely: flowchart, ");
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

describe('the counts in place of hints (specs/decisions, "Records over prose")', () => {
  /** The photo-sharing diagram, where an edge bends more than twice round the upload queue. */
  function photos(): string {
    writeFileSync(join(dir, "photos.grafical"), writeDiagram(edgeLooks));
    return "photos.grafical";
  }

  it("check prints the counts, and an edge bent more than twice as a warning, with no advice", () => {
    // The edge round the upload queue is a warning of what happened, with the commands that can change it, and the file
    // as its source (specs/decisions, "An answer says what happened, and a write reports only what it changed").
    const bent = [
      "  WARNING bent-edge",
      "    description: An edge bends more than twice, mostly because it skips layers.",
      "    source: already in the file",
      "    detail:",
      "      edge: api-photos",
      "      bends: 4",
      "      skip: 1",
      "    next: layer --move, node --move",
    ].join("\n");
    const out = run("check", photos()).out;
    expect(out).toMatch(
      /^OK\n<counts>\n {2}nodes=\d+ edges=\d+ crossings=\d+ bends=\d+ bent=1 .*\n<\/counts>\n<problems>\n/,
    );
    expect(out).toContain(`<problems>\n${bent}\n</problems>\n`);
    expect(out).not.toMatch(/^(hint|lines):/m);
    // A write that leaves it as it is says only that it is still there (specs/decisions, "A bent edge is reported and
    // never refused").
    expect(run("diagram", "set", photos(), "--subtitle", "Uploads").out).toBe(
      "WRITTEN\n<changes>\n  CHANGED diagram fields=subtitle\n</changes>\n<warnings>\n  new=0 cleared=0 total=1\n</warnings>\n",
    );
    expect(run("diagram", "improve", photos()).code).toBe(2);
    const json = JSON.parse(run("check", photos(), "--json").out);
    expect(json.counts.edges).toBe(edgeLooks.edges.length);
    expect(json.problems).toMatchObject([
      { kind: "WARNING", code: "bent-edge", detail: { edge: "api-photos", bends: 4, skip: 1 } },
    ]);
    expect(json.problems[0].source).toBe("already in the file");
    expect(json.hints).toBeUndefined();
    expect(json.bent).toBeUndefined();
  });
});

describe("what the help shows is what a caller types", () => {
  const pages = ["node --set", "edge --set", "label --set", "mark --set", "note --set"];

  it("gives every verb a usage line with its file first", () => {
    for (const page of pages) {
      const [noun, verb] = page.split(" ");
      const out = run(noun as string, verb as string, "--help").out;
      expect(out, page).toContain(`Usage: grafical -f <file> ${page}`);
    }
  });

  it("writes every example with its file first", () => {
    for (const page of [...pages, "diagram --set", "check"]) {
      const out = run(...(page.split(" ") as [string]), "--help").out;
      expect(out, page).not.toMatch(/^\s+grafical \S+\.grafical/m);
      expect(out, page).not.toMatch(/^\s+grafical [a-z]+ --\S+ \S+\.grafical/m);
      expect(out, page).not.toMatch(/\.grafical\.yaml/);
    }
  });

  it("names the verb a caller meant in the old form", () => {
    const r = spawnSync("node", [MAIN, "node", "set", "--help"], { cwd: dir, encoding: "utf8" });
    expect(r.stdout + r.stderr).toContain("likely: node --set");
  });
});
