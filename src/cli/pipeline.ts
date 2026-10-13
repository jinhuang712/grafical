// The write path shared by every write command (DESIGN.md D14, D16):
// read, apply, lay out, check, and write only if nothing is wrong.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { advise } from "../check/advice.ts";
import { findHints, type Hint } from "../check/hints.ts";
import { check } from "../check/index.ts";
import type { Defect, OpError } from "../errors.ts";
import { type LineTrouble, layout, lineTrouble } from "../layout/index.ts";
import { applyOps } from "../model/apply.ts";
import type { Warning } from "../model/budget.ts";
import { readDiagram, writeDiagram } from "../model/io.ts";
import type { Op } from "../model/ops.ts";
import type { Diagram } from "../model/types.ts";
import { createMeasurer } from "../text/index.ts";
import type { Measurer } from "../text/types.ts";
import {
  parseStylesheet,
  provideStylesheet,
  styleProblem,
  stylesheetRefs,
} from "../theme/themes.ts";

export interface Report {
  ok: boolean;
  changed: string[];
  errors: OpError[];
  defects: Defect[];
  /** Non-blocking notes (D26). They never change the exit code. */
  warnings?: Warning[];
  /** What to improve: the lines that cross, and those that bend more than twice (D35). */
  lines?: LineTrouble;
  /** Moves measured to make the lines better, as commands (D35). The agent decides; grafical never applies them. */
  hints?: Hint[];
}

/**
 * What the engine tells the agent about its lines (D35): what to improve, and the
 * moves it measured, with the diagram's path in place of <file>, so each command
 * runs as printed.
 */
export function linesFeedback(
  d: Diagram,
  file: string,
  m: Measurer,
): { lines: LineTrouble; hints: Hint[] } {
  const path = /^[\w./-]+$/.test(file) ? file : `"${file}"`;
  return {
    lines: lineTrouble(d, m),
    hints: findHints(d, m).map((h) => ({ ...h, command: h.command.replaceAll("<file>", path) })),
  };
}

/** The `lines:` line: what crosses and what bends too much, the first few named. */
function linesText(t: LineTrouble): string | undefined {
  if (t.crossings.length === 0 && t.bent.length === 0) return undefined;
  const parts = [
    ...t.crossings.map(([a, b]) => `${a} crosses ${b}`),
    ...t.bent.map((x) => `${x.edge} bends ${x.bends} times`),
  ];
  const shown = parts.slice(0, 6).join("; ");
  const more = parts.length > 6 ? `; and ${parts.length - 6} more` : "";
  return `lines: ${t.points} crossing${t.points === 1 ? "" : "s"}, ${t.bent.length} line${t.bent.length === 1 ? "" : "s"} bending more than twice: ${shown}${more}`;
}

export function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function formatReport(r: Report): string {
  const out: string[] = [];
  if (r.ok) {
    out.push(r.changed.length > 0 ? `ok changed: ${r.changed.join(", ")}` : "ok");
  } else {
    out.push("failed, file unchanged");
  }
  for (const e of r.errors) {
    let s = `error op ${e.index} ${e.code}${e.field ? ` ${e.field}` : ""}: found ${oneLine(e.found)}; expected ${oneLine(e.expected)}`;
    if (e.suggestion) s += `; ${oneLine(e.suggestion)}`;
    out.push(s);
  }
  for (const w of r.warnings ?? []) {
    out.push(
      `warning ${w.code}: found ${oneLine(w.found)}; expected ${oneLine(w.expected)}; ${oneLine(w.suggestion)}`,
    );
  }
  for (const d of r.defects) {
    out.push(
      `defect ${d.code} [${d.elements.join(", ")}]: found ${oneLine(d.found)}; expected ${oneLine(d.expected)}; fix: ${oneLine(d.fix)}`,
    );
  }
  const lines = r.lines === undefined ? undefined : linesText(r.lines);
  if (lines !== undefined) out.push(lines);
  // A hint that puts a node among other kinds says so, for the agent to weigh.
  // A hint that changes what the rows say says how, for the agent to weigh.
  const unsafeNote = (h: Hint) =>
    h.ops.some((op) => op.op === "layer.move") ? "reorders rows" : "moves a node among other kinds";
  for (const h of r.hints ?? []) {
    const shown = h.fixes.slice(0, 3).join(", ");
    const more = h.fixes.length > 3 ? ` and ${h.fixes.length - 3} more` : "";
    const fixes = h.fixes.length > 0 ? ` (untangles ${shown}${more})` : "";
    out.push(`hint: ${h.gain}${fixes}: ${h.command}${h.safe ? "" : `   (${unsafeNote(h)})`}`);
  }
  return `${out.join("\n")}\n`;
}

export function emit(report: Report, json: boolean, extra: Record<string, unknown> = {}): number {
  if (json) {
    const body = {
      ok: report.ok,
      changed: report.changed,
      errors: report.errors,
      defects: report.defects,
      warnings: report.warnings ?? [],
      lines: report.lines ?? { points: 0, crossings: [], bent: [] },
      hints: report.hints ?? [],
      ...extra,
    };
    process.stdout.write(`${JSON.stringify(body)}\n`);
  } else {
    process.stdout.write(formatReport(report));
  }
  return report.ok ? 0 : 1;
}

export function failure(errors: OpError[]): Report {
  return { ok: false, changed: [], errors, defects: [] };
}

export function fileError(
  code: string,
  file: string,
  expected: string,
  suggestion?: string,
): Report {
  return failure([
    {
      code,
      index: 0,
      field: "file",
      found: file,
      expected,
      ...(suggestion ? { suggestion } : {}),
    },
  ]);
}

/** Reads and validates a diagram file. */
export function loadDiagram(file: string): Diagram | Report {
  if (!existsSync(file)) {
    return fileError(
      "file-not-found",
      file,
      "an existing diagram file",
      "create it first: grafical new <file> --title <text>",
    );
  }
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    return fileError("file-unreadable", file, "a readable file", String(err));
  }
  const d = readDiagram(text);
  if (Array.isArray(d)) return failure(d);
  return loadStyles(file, stylesheetRefs(d, [])) ?? d;
}

/**
 * Reads the stylesheets a diagram names, relative to its folder, and hands them
 * to layout (D30). Returns a report for the first one that is missing or wrong.
 * A style that is not a valid name is left for the model to refuse.
 */
export function loadStyles(file: string, refs: string[]): Report | undefined {
  for (const ref of refs) {
    if (styleProblem(ref) !== undefined) continue;
    const path = join(dirname(file), ref);
    if (!existsSync(path)) {
      return fileError(
        "style-not-found",
        path,
        "the stylesheet the diagram names",
        `create ${ref} beside the diagram, or grafical diagram style <file> default`,
      );
    }
    const theme = parseStylesheet(readFileSync(path, "utf8"), ref);
    if (Array.isArray(theme)) {
      return fileError("bad-stylesheet", path, "a valid stylesheet", theme.join("; "));
    }
    provideStylesheet(ref, theme);
  }
  return undefined;
}

export function isReport(x: Diagram | Report): x is Report {
  return "ok" in x;
}

export function writeAtomic(file: string, content: string | Uint8Array) {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, file);
}

/**
 * Lays out and checks a diagram. Without `all`, only the defects the agent can
 * fix: engine-owned ones are the engine's to avoid, and only `check --all`
 * reports them (D14).
 */
export function inspect(d: Diagram, m: Measurer, all = false): Defect[] {
  const defects = check(d, layout(d, m), m);
  return all ? defects : defects.filter((x) => x.owner === "agent");
}

/**
 * Applies operations to the file's diagram. With `create`, there is no file
 * yet: the first operation is diagram.new, and an existing file is refused.
 */
export async function runWrite(
  file: string,
  ops: Op[],
  create = false,
  hints = false,
): Promise<Report> {
  let base: Diagram | null = null;
  if (create) {
    if (existsSync(file)) {
      return fileError(
        "file-exists",
        file,
        "a path that does not exist yet",
        "choose another file name; grafical new never overwrites",
      );
    }
  } else {
    const loaded = loadDiagram(file);
    if (isReport(loaded)) return loaded;
    base = loaded;
  }
  const named = ops.map((op) =>
    op.op === "diagram.style" || op.op === "diagram.new" ? op.style : undefined,
  );
  const styles = loadStyles(file, stylesheetRefs(base, named));
  if (styles !== undefined) return styles;
  const m = await createMeasurer();
  const result = applyOps(base, ops, m);
  if ("errors" in result) return failure(result.errors);
  const defects = inspect(result.diagram, m);
  if (defects.length > 0) return { ok: false, changed: [], errors: [], defects };
  writeAtomic(file, writeDiagram(result.diagram));
  const report: Report = {
    ok: true,
    changed: result.changed,
    errors: [],
    defects: [],
    warnings: advise(result.diagram, layout(result.diagram, m)),
  };
  if (hints) Object.assign(report, linesFeedback(result.diagram, file, m));
  return report;
}
