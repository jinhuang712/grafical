// The write path shared by every write command (DESIGN.md D14, D16):
// read, apply, lay out, check, and write only if nothing is wrong.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type Counts, countsText, drawing } from "../check/drawing.ts";
import { check } from "../check/index.ts";
import type { Defect, OpError } from "../errors.ts";
import { layout } from "../layout/index.ts";
import { applyOps } from "../model/apply.ts";
import { readDiagram, writeDiagram } from "../model/io.ts";
import type { Op } from "../model/ops.ts";
import type { Diagram } from "../model/types.ts";
import { record } from "../records.ts";
import type { Scene } from "../scene.ts";
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
  /** The drawing's counts (D37): on apply, check and render, when nothing was refused. */
  counts?: Counts;
}

export function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * The report as records (D37): ok with the ids it changed, or failed, then a record
 * for each error and defect, then the counts. A refused change writes nothing.
 */
export function formatReport(r: Report): string {
  const out: string[] = [];
  if (r.ok) out.push(r.changed.length > 0 ? record("ok", { changed: r.changed }) : "ok");
  else out.push(record("failed", { changed: [] }));
  for (const e of r.errors) {
    out.push(
      record("error", {
        op: e.index,
        code: e.code,
        field: e.field,
        found: oneLine(e.found),
        expected: oneLine(e.expected),
        ...(e.suggestion ? { suggestion: oneLine(e.suggestion) } : {}),
      }),
    );
  }
  for (const d of r.defects) {
    out.push(
      record("defect", {
        code: d.code,
        owner: d.owner,
        elements: d.elements,
        found: oneLine(d.found),
        expected: oneLine(d.expected),
        fix: oneLine(d.fix),
      }),
    );
  }
  if (r.counts !== undefined) out.push(countsText(r.counts));
  return `${out.join("\n")}\n`;
}

export function emit(report: Report, json: boolean, extra: Record<string, unknown> = {}): number {
  if (json) {
    const body = {
      ok: report.ok,
      changed: report.changed,
      errors: report.errors,
      defects: report.defects,
      ...(report.counts !== undefined ? { counts: report.counts } : {}),
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

export function isReport<T extends object>(x: T | Report): x is Report {
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

/** A change grafical would accept: the diagram before and after it, and what it changed. */
interface Planned {
  base: Diagram | null;
  next: Diagram;
  changed: string[];
  m: Measurer;
  scene: Scene;
}

/**
 * Applies operations to the file's diagram in memory and checks the result, writing
 * nothing. With `create`, there is no file yet: the first operation is diagram.new,
 * and an existing file is refused.
 */
async function plan(file: string, ops: Op[], create: boolean): Promise<Planned | Report> {
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
  const scene = layout(result.diagram, m);
  const defects = check(result.diagram, scene, m).filter((x) => x.owner === "agent");
  if (defects.length > 0) return { ok: false, changed: [], errors: [], defects };
  return { base, next: result.diagram, changed: result.changed, m, scene };
}

/**
 * Applies operations to the file's diagram and writes it, or refuses and writes nothing.
 * With `counts`, the report carries the drawing's counts (D37), as apply's does.
 */
export async function runWrite(
  file: string,
  ops: Op[],
  create = false,
  counts = false,
): Promise<Report> {
  const p = await plan(file, ops, create);
  if (isReport(p)) return p;
  writeAtomic(file, writeDiagram(p.next));
  return {
    ok: true,
    changed: p.changed,
    errors: [],
    defects: [],
    ...(counts ? { counts: drawing(p.next, p.scene).counts } : {}),
  };
}

/**
 * What a batch would do (D37): the counts of the drawing before and after it, with
 * nothing written. The agent decides what to try; grafical measures.
 */
export async function tryWrite(
  file: string,
  ops: Op[],
): Promise<Report | { report: Report; before: Counts; after: Counts }> {
  const p = await plan(file, ops, false);
  if (isReport(p)) return p;
  const base = p.base as Diagram;
  return {
    report: { ok: true, changed: p.changed, errors: [], defects: [] },
    before: drawing(base, layout(base, p.m)).counts,
    after: drawing(p.next, p.scene).counts,
  };
}
