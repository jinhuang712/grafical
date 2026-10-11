// The write path shared by every write command (DESIGN.md D14, D16):
// read, apply, lay out, check, and write only if nothing is wrong.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { advise } from "../check/advice.ts";
import { check } from "../check/index.ts";
import type { Defect, OpError } from "../errors.ts";
import { layout } from "../layout/index.ts";
import { applyOps } from "../model/apply.ts";
import type { Warning } from "../model/budget.ts";
import { readDiagram, writeDiagram } from "../model/io.ts";
import type { Op } from "../model/ops.ts";
import type { Diagram } from "../model/types.ts";
import { createMeasurer } from "../text/index.ts";
import type { Measurer } from "../text/types.ts";

export interface Report {
  ok: boolean;
  changed: string[];
  errors: OpError[];
  defects: Defect[];
  /** Non-blocking notes (D26). They never change the exit code. */
  warnings?: Warning[];
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
  return Array.isArray(d) ? failure(d) : d;
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
export async function runWrite(file: string, ops: Op[], create = false): Promise<Report> {
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
  const m = await createMeasurer();
  const result = applyOps(base, ops, m);
  if ("errors" in result) return failure(result.errors);
  const defects = inspect(result.diagram, m);
  if (defects.length > 0) return { ok: false, changed: [], errors: [], defects };
  writeAtomic(file, writeDiagram(result.diagram));
  return {
    ok: true,
    changed: result.changed,
    errors: [],
    defects: [],
    warnings: advise(result.diagram, layout(result.diagram, m)),
  };
}
