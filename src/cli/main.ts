#!/usr/bin/env node
// The grafical command line (DESIGNS.md, "The command line comes first, and the help is the agent's only reference"). Exit codes: 0 success, 1 an
// operation error or a defect, 2 a usage error.

import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Command, CommanderError } from "commander";
import {
  countsText,
  delta,
  deltaText,
  drawing,
  drawingText,
  warningsOf,
} from "../check/drawing.ts";
import type { Facts, UsageCode } from "../errors.ts";
import { USAGE_CODES } from "../errors.ts";
import { layout } from "../layout/index.ts";
import { diffDiagrams } from "../model/diff.ts";
import type { Op } from "../model/ops.ts";
import { parseOp } from "../model/ops.ts";
import { closest, editDistance } from "../model/suggest.ts";
import { block, record } from "../records.ts";
import { renderPng, renderSvg } from "../render/index.ts";
import { createMeasurer } from "../text/index.ts";
import { THEMES } from "../theme/themes.ts";
import { atRevision, commandLines, opCommands } from "./diff.ts";
import { GUIDES, guideList, guideNamed } from "./guides.ts";
import { PAGES, PROGRAM_ABOUT, PROGRAM_AFTER } from "./help.ts";
import { addNouns } from "./nouns.ts";
import {
  blockBody,
  emit,
  failure,
  fileErrors,
  inspect,
  isReport,
  loadDiagram,
  type Report,
  runWrite,
  tryWrite,
  writeAtomic,
} from "./pipeline.ts";
import { type Block, kindsOf, usageBlock } from "./problems.ts";
import { showDiagram, showObject } from "./show.ts";
import { commandLine, type Origin } from "./source.ts";
import { inward, learn, surfaceName, surfaceText } from "./surface.ts";
import { openWindow, startViewer, windowSize } from "./view.ts";

type Opts = Record<string, unknown>;

/** The words of the command line, after `grafical`, as main() was given them. */
let typed: readonly string[] = process.argv.slice(2);

/** A single command's origin: the command line as typed. */
const asTyped = (): Origin => ({ command: commandLine(typed) });

/** The report, each problem with a source: the command line where nothing else caused it. */
function own(r: Report): Report {
  const command = commandLine(typed);
  return {
    ...r,
    errors: r.errors.map((e) => (e.source !== undefined ? e : { ...e, source: command })),
    defects: r.defects.map((d) => (d.source !== undefined ? d : { ...d, source: command })),
  };
}

/** Prints the report, its problems with their sources, and sets the exit code. */
function say(r: Report, json: boolean, extra?: Record<string, unknown>, head?: string[]) {
  process.exitCode = emit(own(r), json, extra, head);
}

/** Runs an operation built from flags through the shared write path. */
async function write(file: string, raw: Record<string, unknown>, opts: Opts, create = false) {
  const op = parseOp(raw, 0);
  if (Array.isArray(op)) {
    say(failure(op), opts.json === true);
    return;
  }
  if (opts.try === true) {
    await tryOne(file, op, opts.json === true);
    return;
  }
  say(await runWrite(file, op, asTyped(), create), opts.json === true);
}

/**
 * A command with --try (FEATURES.md, "Trying a change"): the counts of the drawing before and after it, and the change
 * in each, with nothing written. A command it would refuse is refused as the write would refuse it.
 */
async function tryOne(file: string, op: Op, json: boolean) {
  const r = await tryWrite(file, op, asTyped());
  if (isReport(r)) {
    say(r, json);
  } else if (json) {
    const body = { ok: true, changed: r.report.changed, before: r.before, after: r.after };
    process.stdout.write(`${JSON.stringify({ ...body, delta: delta(r.before, r.after) })}\n`);
  } else {
    process.stdout.write(
      `${record("ok", { changed: r.report.changed, written: "no" })}\n${countsText(r.before, "before")}\n${countsText(r.after, "after")}\n${deltaText(delta(r.before, r.after))}\n`,
    );
  }
}

function renderName(file: string): string {
  const base = basename(file).replace(/\.grafical$/, "");
  return join(dirname(file), base);
}

/**
 * A page's paragraph as the agent reads it: its words in the command line's form, one line a paragraph, so that the
 * help wraps it at 80 columns as it prints it.
 */
const paragraph = (text: string) => surfaceText(text.replace(/(\S)\n(?=\S)/g, "$1 "));

/**
 * Gives each command its help page (specs/decisions, "One entry page, help where it is used"): the one-line description
 * stays the summary in its parent's list, and the page's paragraph and its sections show on its own help.
 */
function attachHelp(parent: Command, path: string[] = []): void {
  for (const c of parent.commands) {
    const at = [...path, c.name()];
    const page = PAGES[at.join(" ")];
    if (page?.about !== undefined) c.summary(c.description()).description(paragraph(page.about));
    if (page?.after !== undefined) c.addHelpText("after", page.after.trimEnd());
    attachHelp(c, at);
  }
}

/** The command line, every command and its help; the tests read it too. */
export function build(): Command {
  const program = new Command("grafical");
  program
    .exitOverride()
    .configureOutput({
      writeOut: (s) => process.stdout.write(surfaceText(s)),
      writeErr: (s) => process.stderr.write(s),
      // The same help on every terminal, so that it is the same text for every agent.
      getOutHelpWidth: () => 80,
      getErrHelpWidth: () => 80,
      // The parser's sentence is replaced by a record in main().
      outputError: () => {},
    })
    .showHelpAfterError(false)
    .addHelpText("after", PROGRAM_AFTER.trimEnd());

  const json = (c: Command): Command => c.option("--json", "print the report as JSON");

  addNouns(program, write, json);

  json(
    program
      .command("show")
      .description("print a compact view of a diagram, or one object and what refers to it")
      .argument("<file>")
      .argument("[id]", "an object: its facts and what refers to it")
      .option("--drawn", "how it is drawn: each node, edge and group, as facts and counts"),
  ).action(async (file: string, id: string | undefined, opts: Opts) => {
    const d = loadDiagram(file);
    if (isReport(d)) {
      say(d, opts.json === true);
    } else if (id !== undefined) {
      const text = showObject(d, id);
      if (text === undefined) throw usage("unknown-command", { found: id });
      process.stdout.write(text);
    } else if (opts.drawn === true) {
      const dr = drawing(d, layout(d, await createMeasurer()));
      process.stdout.write(
        opts.json === true
          ? `${JSON.stringify({ ok: true, drawing: dr }, (k, v) => (k === "composition" ? undefined : v))}\n`
          : drawingText(dr),
      );
    } else if (opts.json === true) {
      process.stdout.write(`${JSON.stringify({ ok: true, diagram: d })}\n`);
    } else {
      process.stdout.write(showDiagram(d));
    }
  });

  json(
    program
      .command("diff")
      .description("changes since a revision, as command lines")
      .argument("<file>")
      .argument("[rev]", "a git revision", "HEAD"),
  ).action((file: string, rev: string, opts: Opts) => {
    const now = loadDiagram(file);
    if (isReport(now)) {
      say(now, opts.json === true);
      return;
    }
    const was = atRevision(file, rev);
    if (was !== null && isReport(was)) {
      say(was, opts.json === true);
      return;
    }
    const lines = commandLines(diffDiagrams(was, now), file, program);
    if (opts.json === true) {
      process.stdout.write(`${JSON.stringify({ ok: true, commands: lines })}\n`);
    } else {
      process.stdout.write(lines.length > 0 ? `${lines.join("\n")}\n` : "# no changes\n");
    }
  });

  json(
    program
      .command("check")
      .description("the defects you can fix, the warnings, and the counts")
      .argument("<file>")
      .option("--all", "also report engine-owned defects, which are engine bugs"),
  ).action(async (file: string, opts: Opts) => {
    const d = loadDiagram(file);
    if (isReport(d)) {
      say(d, opts.json === true);
      return;
    }
    const refused = fileErrors(d);
    if (refused !== undefined) {
      say(refused, opts.json === true);
      return;
    }
    const m = await createMeasurer();
    const defects = inspect(d, m, opts.all === true);
    const dr = drawing(d, layout(d, m));
    say(
      {
        ok: defects.length === 0,
        changed: [],
        errors: [],
        defects,
        warnings: warningsOf(dr, d),
        counts: dr.counts,
        kinds: kindsOf(d),
      },
      opts.json === true,
    );
  });

  json(
    program
      .command("render")
      .description("write SVG and PNG")
      .argument("<file>")
      .option("--svg [out]", "write only the SVG: to <out>, or beside the file")
      .option("--png [out]", "write only the PNG: to <out>, or beside the file")
      .option("--scale <n>", "PNG scale, 1 to 4", "2"),
  ).action(async (file: string, opts: Opts) => {
    const scale = Number(opts.scale);
    if (!Number.isFinite(scale) || scale < 1 || scale > 4) {
      throw usage("bad-scale", { field: "--scale", found: String(opts.scale) }, { min: 1, max: 4 });
    }
    const d = loadDiagram(file);
    if (isReport(d)) {
      say(d, opts.json === true);
      return;
    }
    const m = await createMeasurer();
    const scene = layout(d, m);
    const defects = inspect(d, m);
    const both = opts.svg === undefined && opts.png === undefined;
    const files: string[] = [];
    const svg = renderSvg(scene);
    if (both || opts.svg !== undefined) {
      const out = typeof opts.svg === "string" ? opts.svg : `${renderName(file)}.svg`;
      writeAtomic(out, svg);
      files.push(out);
    }
    if (both || opts.png !== undefined) {
      const out = typeof opts.png === "string" ? opts.png : `${renderName(file)}.png`;
      writeAtomic(out, renderPng(svg, scale));
      files.push(out);
    }
    const dr = drawing(d, scene);
    const report = {
      ok: defects.length === 0,
      changed: [],
      errors: [],
      defects,
      warnings: warningsOf(dr, d),
      counts: dr.counts,
      kinds: kindsOf(d),
    };
    const wrote = files.map((f) => record("wrote", { file: f }));
    say(report, opts.json === true, { files }, wrote);
  });

  program
    .command("view")
    .description("a live window, redrawn on every change")
    .argument("<file>")
    .option("--port <n>", "the local port to serve on; default: a free one")
    .option("--no-open", "print the address instead of opening a window")
    .action(async (file: string, opts: Opts) => {
      const port = Number(opts.port ?? 0);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw usage(
          "bad-port",
          { field: "--port", found: String(opts.port) },
          { min: 0, max: 65535 },
        );
      }
      // The file need not exist yet: the window can open before the agent starts drawing.
      if (!existsSync(dirname(file))) {
        throw usage("no-folder", { field: "file", found: dirname(file) });
      }
      const viewer = await startViewer(file, port);
      process.stdout.write(`${record("viewing", { file, url: viewer.url, stop: "ctrl-c" })}\n`);
      if (opts.open !== false) openWindow(viewer.url, windowSize(viewer.size()));
      await new Promise<void>((resolve) => {
        process.once("SIGINT", resolve);
        process.once("SIGTERM", resolve);
      });
      await viewer.close();
    });

  // Best practice apart from the help, for an agent that wants it (specs/decisions, "Help for the tool, guides for best
  // practice").
  program
    .command("guide")
    .description("how common kinds of diagram are usually drawn, if you want it")
    .argument("[name]", "a guide; without one, the list of them")
    .action((name: string | undefined) => {
      if (name === undefined) {
        process.stdout.write(`${guideList()}\n`);
        return;
      }
      const guide = guideNamed(name);
      if (guide === undefined) {
        throw usage(
          "unknown-guide",
          { found: name },
          { likely: closest(name, Object.keys(GUIDES), 2) },
        );
      }
      process.stdout.write(`${guide.text}\n`);
    });

  program
    .command("library")
    .description(
      "the built-in stylesheets a diagram may name, or those whose name or look holds a word",
    )
    .argument("[word]", "a word to search for")
    .action((word: string | undefined) => {
      const w = word?.toLowerCase();
      const found = Object.values(THEMES).filter(
        (t) => w === undefined || `${t.name} ${t.about ?? ""}`.toLowerCase().includes(w),
      );
      const q = (s: string) => (/[\s"=]/.test(s) ? JSON.stringify(s) : s);
      const lines = found.map((t) => `stylesheet name=${q(t.name)} about=${q(t.about ?? "-")}`);
      process.stdout.write(`${lines.length > 0 ? lines.join("\n") : "stylesheet -"}\n`);
    });

  // Every command that writes may be tried first: with --try it writes nothing and prints the counts before and after.
  for (const [, c] of opCommands(program)) {
    c.option("--try", "print the counts before and after, and write nothing");
  }
  // The help says commands as the command line takes them, so it learns their names first.
  learn(program.commands.flatMap((c) => c.commands.map((s) => `${c.name()} ${s.name()}`)));
  program.description(paragraph(PROGRAM_ABOUT));
  attachHelp(program);
  // A command's page is <command> --help, the one way to it: commander's own help command would be a second, which
  // takes one word and prints the entry page for a wrong one.
  for (const c of [program, ...program.commands]) c.helpCommand(false);
  return program;
}

/** A command line grafical cannot read: exit 2, with its block in place of anything else. */
class UsageError extends CommanderError {
  readonly problem: Block;
  constructor(problem: Block) {
    super(2, "grafical.usage", problem.code);
    this.problem = problem;
  }
}

function usage(code: UsageCode, given: { field?: string; found?: string }, facts?: Facts) {
  return new UsageError(usageBlock(code, given, facts));
}

/** A usage error as grafical prints it: failed, then its block (specs/decisions, "Refusals say what happened and which commands can change it"). */
function usageText(b: Block): string {
  return `${record("failed", { changed: [] })}\n\n${block(b)}\n`;
}

/** Prints a usage error: with --json the object of any refusal on standard output, else its text on standard error. */
function sayUsage(b: Block, words: readonly string[]) {
  const end = words.indexOf("--");
  const json = (end < 0 ? words : words.slice(0, end)).includes("--json");
  if (json) {
    const body = { ok: false, changed: [], problems: [blockBody(b)] };
    process.stdout.write(`${JSON.stringify(body)}\n`);
  } else process.stderr.write(usageText(b));
}

/** The arguments a command takes, as its usage names them: <file>, [at], <nodes...>. */
function takes(c: Command): string[] {
  return c.registeredArguments
    .filter((a) => a.name() !== "file")
    .map((a) => {
      const name = `${a.name()}${a.variadic ? "..." : ""}`;
      return a.required ? `<${name}>` : `[${name}]`;
    });
}

/**
 * The parser's refusal as a block: its code in kebab case, and what its sentence names. A missing argument or option
 * is the field; extra arguments are what was found, with the arguments the command takes.
 */
function parserError(err: CommanderError, program: Command, args: string[]): Block {
  const code = err.code
    .slice("commander.".length)
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`) as UsageCode;
  const quoted = /'([^']*)'/.exec(err.message)?.[1];
  switch (code) {
    case "missing-argument":
      return usageBlock(code, { field: quoted ?? "" });
    case "option-missing-argument":
    case "missing-mandatory-option-value":
      return usageBlock(code, {
        field: (quoted ?? "").split(/[\s,]+/).find((w) => w.startsWith("--")) ?? quoted ?? "",
      });
    case "excess-arguments": {
      const [command] = follow(
        program,
        args.filter((a) => !a.startsWith("-")),
      );
      const m = /Expected (\d+) arguments? but got \d+: (.*)\.$/.exec(err.message);
      const extra = m === null ? [] : (m[2] ?? "").split(", ").slice(Number(m[1]));
      return usageBlock(code, { found: extra }, { takes: takes(command) });
    }
    case "unknown-option": {
      const likely = /Did you mean (\S+?)\?/.exec(err.message)?.[1];
      return usageBlock(
        code,
        { found: quoted ?? "" },
        likely === undefined ? {} : { likely: [likely] },
      );
    }
    default:
      return usageBlock(USAGE_CODES.includes(code) ? code : "unknown-command", {
        found: quoted ?? "",
      });
  }
}

/** The commands the words name below a command, as far as they name one, and the last of them. */
function follow(from: Command, words: string[]): [Command, string[]] {
  let at = from;
  const path: string[] = [];
  for (const w of words) {
    const next = at.commands.find((c) => c.name() === w || c.aliases().includes(w));
    if (next === undefined) break;
    at = next;
    path.push(w);
  }
  return [at, path];
}

/**
 * A word where a command belongs that names none, as a block that gives the word it most likely means as a value
 * (specs/decisions, "Refusals say what happened and which commands can change it"): "help" means --help, "node set" or
 * node.set is two names in one word, and nodee a misspelling. Undefined when the command line names commands only;
 * commander reads the rest. Commander would print the entry page for a wrong name with --help, and say nothing of
 * what was meant.
 */
export function wrongCommand(program: Command, args: string[]): Block | undefined {
  // The program and its groups take no option with a value, so every other word up to a command is a command's name.
  const words = args.filter((a) => !a.startsWith("-"));
  const [at, path] = follow(program, words);
  const word = words[path.length];
  if (at.commands.length === 0 || word === undefined) return undefined;
  let likely: string | undefined;
  const parts = word.split(/[\s.]+/);
  const named = follow(at, parts)[1];
  if (word === "help") likely = "--help";
  else if (parts.length > 1 && named.length === parts.length) likely = surfaceName(named.join(" "));
  else {
    const [near] = closest(
      word,
      at.commands.map((c) => c.name()),
      1,
    );
    if (near !== undefined && editDistance(word, near) <= Math.max(1, Math.floor(word.length / 3)))
      likely = near;
  }
  return usageBlock(
    "unknown-command",
    { found: word },
    likely === undefined ? {} : { likely: [likely] },
  );
}

async function main(argv: string[]) {
  typed = argv.slice(2);
  const program = build();
  try {
    const words = inward(typed);
    if (!Array.isArray(words)) {
      const code = words.field === "verb" ? "unknown-command" : "missing-argument";
      const facts = words.likely === undefined ? undefined : { likely: [words.likely] };
      throw usage(code, words, facts);
    }
    const wrong = wrongCommand(program, words);
    if (wrong !== undefined) throw new UsageError(wrong);
    await program.parseAsync(words, { from: "user" });
  } catch (err) {
    if (err instanceof CommanderError) {
      if (err.code === "commander.helpDisplayed" || err.code === "commander.version") {
        process.exitCode = 0;
        return;
      }
      // A usage error is a block too (specs/decisions, "Refusals say what happened and which commands can change it"),
      // in place of commander's sentence.
      const words = argv.slice(2);
      const source = commandLine(words);
      const inner = inward(words);
      if (err instanceof UsageError) sayUsage({ ...err.problem, source }, words);
      else if (err.code.startsWith("commander.") && err.code !== "commander.help") {
        const read = Array.isArray(inner) ? inner : words;
        sayUsage({ ...parserError(err, program, read), source }, words);
      }
      process.exitCode = 2;
      return;
    }
    throw err;
  }
}

// Run only as the command, not when a test imports the command line to read it.
if (import.meta.main) await main(process.argv);
