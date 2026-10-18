// The write path shared by every write command (DESIGN.md, "Defects owned by who can fix them", "Interfaces"):
// read, apply, lay out, check, and write only if nothing is wrong.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type Bent, bentLines, type Counts, countsText, drawing } from "../check/drawing.ts";
import { check } from "../check/index.ts";
import type { Defect, ErrorCode, Facts, OpError } from "../errors.ts";
import { layout } from "../layout/index.ts";
import { applyOps } from "../model/apply.ts";
import { readDiagram, writeDiagram } from "../model/io.ts";
import type { Op } from "../model/ops.ts";
import type { Diagram } from "../model/types.ts";
import { block, record } from "../records.ts";
import type { Scene } from "../scene.ts";
import { createMeasurer } from "../text/index.ts";
import type { Measurer } from "../text/types.ts";
import {
  parseStylesheet,
  provideStylesheet,
  styleProblem,
  stylesheetRefs,
  unknownWeights,
} from "../theme/themes.ts";
import { bindMarkOps, loadMarks, settingSlots } from "./marks.ts";
import { type Block, defectBlock, errorBlock, kindsOf } from "./problems.ts";

export interface Report {
  ok: boolean;
  changed: string[];
  errors: OpError[];
  defects: Defect[];
  /** The drawing's counts (DESIGN.md, "Records over prose"): on apply, check and render, when nothing was refused. */
  counts?: Counts;
  /** The lines drawn with more than two bends: on every write, check and render (DESIGN.md, "The dirty work has edges"). */
  bent?: Bent[];
  /** What each id of the diagram the defects are found in names, so that their detail names each by its kind. */
  kinds?: ReadonlyMap<string, string>;
}

/** The report's problems as blocks: its errors, then its defects. */
export function blocks(r: Report): Block[] {
  const kinds = r.kinds ?? new Map<string, string>();
  return [...r.errors.map(errorBlock), ...r.defects.map((d) => defectBlock(d, kinds))];
}

/**
 * The report as text (DESIGN.md, "Refusals say what happened and which commands can change it"): ok with the ids it
 * changed, or failed, and the records of `head`; then a block for each problem, a blank line before each; then the
 * records of the drawing. A refused change writes nothing.
 */
export function formatReport(r: Report, head: string[] = []): string {
  const out = [
    r.ok
      ? r.changed.length > 0
        ? record("ok", { changed: r.changed })
        : "ok"
      : record("failed", { changed: [] }),
    ...head,
  ];
  const problems = blocks(r);
  for (const b of problems) out.push("", block(b));
  const tail = [
    ...(r.bent ?? []).map((b) => record("bent", { ...b })),
    ...(r.counts !== undefined ? [countsText(r.counts)] : []),
  ];
  if (problems.length > 0 && tail.length > 0) out.push("");
  out.push(...tail);
  return `${out.join("\n")}\n`;
}

/** A block as --json gives it: its parts, with the operation's index first in its detail. */
export function blockBody(b: Block): Record<string, unknown> {
  return {
    kind: b.kind,
    code: b.code,
    description: b.description,
    ...(b.source !== undefined ? { source: b.source } : {}),
    detail: { ...(b.op !== undefined ? { op: b.op } : {}), ...b.detail },
    next: b.next,
  };
}

/** The report as the JSON object `--json` prints. */
export function reportBody(report: Report): Record<string, unknown> {
  return {
    ok: report.ok,
    changed: report.changed,
    problems: blocks(report).map(blockBody),
    ...(report.bent !== undefined ? { bent: report.bent } : {}),
    ...(report.counts !== undefined ? { counts: report.counts } : {}),
  };
}

export function emit(
  report: Report,
  json: boolean,
  extra: Record<string, unknown> = {},
  head: string[] = [],
): number {
  if (json) {
    process.stdout.write(`${JSON.stringify({ ...reportBody(report), ...extra })}\n`);
  } else {
    process.stdout.write(formatReport(report, head));
  }
  return report.ok ? 0 : 1;
}

export function failure(errors: OpError[]): Report {
  return { ok: false, changed: [], errors, defects: [] };
}

export function fileError(code: ErrorCode, file: string, facts?: Facts): Report {
  return failure([{ code, index: 0, field: "file", found: file, ...(facts ? { facts } : {}) }]);
}

/** Reads and validates a diagram file. */
export function loadDiagram(file: string, setting: Set<string> = new Set()): Diagram | Report {
  if (!existsSync(file)) {
    return fileError("file-not-found", file);
  }
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return fileError("file-unreadable", file);
  }
  const d = readDiagram(text);
  if (Array.isArray(d)) return failure(d);
  const marks = loadMarks(file, d, setting);
  if (marks.length > 0) return failure(marks);
  const styles = loadStyles(file, stylesheetRefs(d, []));
  if (styles !== undefined) return styles;
  // The file is read before its stylesheet, so a weight level is checked here (DESIGN.md, "Edge weights").
  const weights = unknownWeights(d);
  return weights.length > 0 ? failure(weights) : d;
}

/**
 * Reads the stylesheets a diagram names, relative to its folder, and hands them
 * to layout (DESIGN.md, "Themes and stylesheets"). Returns a report for the first one that is missing or wrong.
 * A style that is not a valid name is left for the model to refuse.
 */
export function loadStyles(file: string, refs: string[]): Report | undefined {
  for (const ref of refs) {
    if (styleProblem(ref) !== undefined) continue;
    const path = join(dirname(file), ref);
    if (!existsSync(path)) {
      return fileError("style-not-found", path);
    }
    const theme = parseStylesheet(readFileSync(path, "utf8"), ref);
    if (Array.isArray(theme)) return failure(theme);
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
 * reports them (DESIGN.md, "Defects owned by who can fix them").
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
      return fileError("file-exists", file);
    }
  } else {
    const loaded = loadDiagram(file, settingSlots(ops));
    if (isReport(loaded)) return loaded;
    base = loaded;
  }
  const named = ops.map((op) =>
    op.op === "diagram.style" || op.op === "diagram.new" ? op.style : undefined,
  );
  const styles = loadStyles(file, stylesheetRefs(base, named));
  if (styles !== undefined) return styles;
  const m = await createMeasurer();
  const bound = bindMarkOps(file, ops);
  if (bound.errors.length > 0) return failure(bound.errors);
  const result = applyOps(base, bound.ops);
  if ("errors" in result) return failure(result.errors);
  const weights = unknownWeights(result.diagram);
  if (weights.length > 0) return failure(weights);
  const scene = layout(result.diagram, m);
  const defects = check(result.diagram, scene, m).filter((x) => x.owner === "agent");
  if (defects.length > 0) {
    return { ok: false, changed: [], errors: [], defects, kinds: kindsOf(result.diagram) };
  }
  return { base, next: result.diagram, changed: result.changed, m, scene };
}

/**
 * Applies operations to the file's diagram and writes it, or refuses and writes nothing.
 * With `counts`, the report carries the drawing's counts (DESIGN.md, "Records over prose"), as apply's does.
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
  const dr = drawing(p.next, p.scene);
  return {
    ok: true,
    changed: p.changed,
    errors: [],
    defects: [],
    bent: bentLines(dr.lines),
    ...(counts ? { counts: dr.counts } : {}),
  };
}

/**
 * What a batch would do (DESIGN.md, "Records over prose"): the counts of the drawing before and after it, with
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
