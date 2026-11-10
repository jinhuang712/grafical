// `grafical -f <file> diff [<rev>]` (specs/decisions, "Git as the history"): how the file on disk differs from a git
// revision, as one command line per operation. Run in order on the revision's file, the lines give the file on disk.

import { spawnSync } from "node:child_process";
import { basename, dirname } from "node:path";
import type { Command } from "commander";
import { readDiagram } from "../model/io.ts";
import { OP_NAMES, type Op, type OpName } from "../model/ops.ts";
import type { Diagram } from "../model/types.ts";
import { failure, fileError, type Report } from "./pipeline.ts";
import { surfaceName } from "./surface.ts";

/** The diagram as the revision holds it, or null when the revision has no such file. */
export function atRevision(file: string, rev: string): Diagram | null | Report {
  const r = spawnSync("git", ["-C", dirname(file), "show", `${rev}:./${basename(file)}`], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
  });
  if (r.error !== undefined) {
    return fileError("not-in-git", file);
  }
  if (r.status !== 0) {
    const why = r.stderr ?? "";
    if (/not a git repository/i.test(why)) {
      return fileError("not-in-git", file);
    }
    if (/does not exist in|exists on disk, but not in/.test(why)) return null;
    return failure([
      {
        code: "bad-revision",
        index: -1,
        field: "rev",
        found: rev,
      },
    ]);
  }
  const d = readDiagram(r.stdout);
  if (Array.isArray(d)) {
    return failure(
      d.map((e) => ({
        ...e,
        index: -1,
        field: e.field === undefined ? "rev" : `${rev}:${e.field}`,
      })),
    );
  }
  return d;
}

/** The command each operation runs as: `noun.verb` is `noun --verb`. */
export function opCommands(program: Command): Map<OpName, Command> {
  const out = new Map<OpName, Command>();
  for (const c of program.commands) {
    for (const s of c.commands) {
      const name = `${c.name()}.${s.name()}`;
      if ((OP_NAMES as string[]).includes(name)) out.set(name as OpName, s);
    }
  }
  return out;
}

/** A word as a POSIX shell takes it back: as it is, or in single quotes. */
function shellWord(w: string): string {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(w) ? w : `'${w.replaceAll("'", "'\\''")}'`;
}

/** A value as the command line takes it: a list comma-separated, and a line break as \n, which the command reads back. */
function value(v: unknown): string {
  const text = Array.isArray(v) ? v.join(",") : String(v);
  return text.replaceAll("\n", "\\n");
}

/**
 * The words after the command's name that make the operation: its arguments, then its options, each named as the
 * operation's field. Undefined when a field has no argument or option to say it.
 */
function words(op: Op, c: Command): string[] | undefined {
  const fields: Record<string, unknown> = { ...op };
  delete fields.op;
  // The command line reads a mark file's hash itself.
  delete fields.sha256;
  const args: string[] = [];
  let missing = false;
  for (const a of c.registeredArguments) {
    if (a.name() === "file") continue;
    const key = a.name().replace(/-([a-z])/g, (_, x: string) => x.toUpperCase());
    const v = fields[key];
    delete fields[key];
    if (v === undefined) {
      if (a.required) return undefined;
      missing = true;
      continue;
    }
    // An optional argument left out cannot be followed by one given.
    if (missing) return undefined;
    if (a.variadic) {
      if (!Array.isArray(v)) return undefined;
      args.push(...v.map(value));
    } else args.push(value(v));
  }
  const options: string[] = [];
  for (const o of c.options) {
    const key = o.attributeName();
    const v = fields[key];
    if (v === undefined || key === "json" || key === "try") continue;
    delete fields[key];
    const flag = o.long as string;
    if (o.isBoolean()) {
      if (v === true) options.push(flag);
      else if (v !== false) return undefined;
    } else options.push(flag, value(v));
  }
  return Object.keys(fields).length > 0 ? undefined : [...args, ...options];
}

/**
 * The operations as command lines, one each, quoted for a POSIX shell: `grafical -f <file> node --add api ...`. An
 * operation no command can say is a bug of grafical, and throws.
 */
export function commandLines(ops: readonly Op[], file: string, program: Command): string[] {
  const commands = opCommands(program);
  return ops.map((op) => {
    const c = commands.get(op.op as OpName);
    const rest = c === undefined ? undefined : words(op, c);
    if (c === undefined || rest === undefined) {
      throw new Error(`no command says ${JSON.stringify(op)}`);
    }
    const name = c.parent?.parent === null ? c.name() : `${c.parent?.name()} ${c.name()}`;
    const head = surfaceName(name).split(" ");
    return ["grafical", "-f", file, ...head, ...rest].map(shellWord).join(" ");
  });
}
