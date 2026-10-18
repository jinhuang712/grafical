// The write path shared by every write command (DESIGN.md, "Defects owned by who can fix them", "Interfaces"):
// read, apply, lay out, check, and write only if nothing is wrong.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import { type Bent, bentLines, type Counts, countsText, drawing } from "../check/drawing.ts";
import { check } from "../check/index.ts";
import type { Defect, ErrorCode, Facts, OpError } from "../errors.ts";
import { layout } from "../layout/index.ts";
import { applyOps } from "../model/apply.ts";
import { readDiagram, writeDiagram, yamlError } from "../model/io.ts";
import { type Op, parseOps } from "../model/ops.ts";
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
import { batchItems, IN_FILE, itemSource, type Origin } from "./source.ts";

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

/** Errors given a source, those that have none yet. */
function sourced(errors: OpError[], source: (e: OpError) => string): OpError[] {
  return errors.map((e) => (e.source !== undefined ? e : { ...e, source: source(e) }));
}

/**
 * Reads and validates a diagram file. A problem of its text is already in the file; one of reading it is the
 * command's, and gets its source from the caller.
 */
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
  const inFile = (errors: OpError[]) => failure(sourced(errors, () => IN_FILE));
  const d = readDiagram(text);
  if (Array.isArray(d)) return inFile(d);
  const marks = loadMarks(file, d, setting);
  if (marks.length > 0) return inFile(marks);
  const styles = loadStyles(file, stylesheetRefs(d, []));
  if (styles !== undefined) return inFile(styles.errors);
  // The file is read before its stylesheet, so a weight level is checked here (DESIGN.md, "Edge weights").
  const weights = unknownWeights(d);
  return weights.length > 0 ? inFile(weights) : d;
}

/**
 * Reads the stylesheets a diagram names, relative to its folder, and hands them
 * to layout (DESIGN.md, "Themes and stylesheets"). Returns a report for the first one that is missing or wrong,
 * its errors with the source `sourceOf` gives the stylesheet. A style that is not a valid name is left for the
 * model to refuse.
 */
export function loadStyles(
  file: string,
  refs: string[],
  sourceOf?: (ref: string) => string,
): Report | undefined {
  const of = (ref: string, r: Report) =>
    sourceOf === undefined ? r : failure(sourced(r.errors, () => sourceOf(ref)));
  for (const ref of refs) {
    if (styleProblem(ref) !== undefined) continue;
    const path = join(dirname(file), ref);
    if (!existsSync(path)) {
      return of(ref, fileError("style-not-found", path));
    }
    const theme = parseStylesheet(readFileSync(path, "utf8"), ref);
    if (Array.isArray(theme)) return of(ref, failure(theme));
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
 * Lays out and checks a diagram as it is in its file, so that each defect is already in the file. Without `all`,
 * only the defects the agent can fix: engine-owned ones are the engine's to avoid, and only `check --all` reports
 * them (DESIGN.md, "Defects owned by who can fix them").
 */
export function inspect(d: Diagram, m: Measurer, all = false): Defect[] {
  const defects = check(d, layout(d, m), m).map((x) => ({ ...x, source: IN_FILE }));
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

/** What a diagram made by operations would be refused for: its errors, or the defects the agent owns. */
type Refusal = { errors: OpError[] } | { defects: Defect[] };

function refusal(base: Diagram | null, ops: readonly Op[], m: Measurer): Refusal {
  const result = applyOps(base, ops);
  if ("errors" in result) return { errors: result.errors };
  const weights = unknownWeights(result.diagram);
  if (weights.length > 0) return { errors: weights.map((e) => ({ ...e, whole: true })) };
  const defects = check(result.diagram, layout(result.diagram, m), m, false);
  return { defects: defects.filter((x) => x.owner === "agent") };
}

/** What makes two problems the same one in two diagrams: its code and what it is about. */
function errorKey(e: OpError): string {
  const f = e.facts ?? {};
  // A field of a whole diagram's error is a place in the file, which other operations move.
  return [
    e.code,
    e.whole ? "" : (e.field ?? ""),
    e.found,
    f.node,
    f.group,
    f.wall,
    f.edge,
    f.beside,
  ]
    .map((x) => x ?? "")
    .join("\u0000");
}

function defectKey(d: Defect): string {
  const pair = d.code === "wall-crossed" || (d.code === "mark-covers" && d.facts.is === "node");
  const about = d.elements.slice(0, pair ? 2 : 1);
  return [d.code, d.field ?? "", d.found ?? "", d.facts.is ?? "", ...about].join("\u0000");
}

/**
 * Where a problem of the diagram a batch makes comes from (DESIGN.md, "Refusals say what happened and which commands
 * can change it"): the number of operations after which it first appears and stays, or 0 when the diagram before the
 * batch has it. grafical applies prefixes of the batch, the batch less its last operation first, then halving the
 * range, as if what appears stays; it runs only on a refused write, so a write that succeeds costs nothing more.
 * Each prefix is laid out once for all the problems it is asked about.
 */
function locate(
  base: Diagram | null,
  ops: readonly Op[],
  m: Measurer,
  final: Refusal,
): { errorAt: (e: OpError) => number; defectAt: (d: Defect) => number } {
  const memo = new Map<number, Set<string>>();
  const keys = (r: Refusal) =>
    new Set("errors" in r ? r.errors.map(errorKey) : r.defects.map(defectKey));
  memo.set(ops.length, keys(final));
  const at = (k: number): Set<string> => {
    let found = memo.get(k);
    if (found === undefined) {
      // No diagram before a new file: nothing is in it.
      found = k === 0 && base === null ? new Set() : keys(refusal(base, ops.slice(0, k), m));
      memo.set(k, found);
    }
    return found;
  };
  const firstAt = (key: string): number => {
    if (at(0).has(key)) return 0;
    // It is there after every operation from `hi` on, and not after `lo`. A change's problem is most often its last
    // operation's, which is tried first; then the range halves.
    let lo = 0;
    let hi = ops.length;
    if (hi > 1 && !at(hi - 1).has(key)) lo = hi - 1;
    else if (hi > 1) hi -= 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (at(mid).has(key)) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  return { errorAt: (e) => firstAt(errorKey(e)), defectAt: (d) => firstAt(defectKey(d)) };
}

/**
 * Applies operations to the file's diagram in memory and checks the result, writing
 * nothing. With `create`, there is no file yet: the first operation is diagram.new,
 * and an existing file is refused. A refusal's problems carry their sources, from `origin`.
 */
async function plan(
  file: string,
  ops: Op[],
  create: boolean,
  origin: Origin,
): Promise<Planned | Report> {
  const command = () => origin.command;
  let base: Diagram | null = null;
  if (create) {
    if (existsSync(file)) {
      return failure(sourced(fileError("file-exists", file).errors, command));
    }
  } else {
    const loaded = loadDiagram(file, settingSlots(ops));
    if (isReport(loaded)) return failure(sourced(loaded.errors, command));
    base = loaded;
  }
  const named = ops.map((op) =>
    op.op === "diagram.style" || op.op === "diagram.new" ? op.style : undefined,
  );
  // A stylesheet an operation names is that operation's; the others are the file's.
  const styles = loadStyles(file, stylesheetRefs(base, named), (ref) =>
    named.includes(ref) ? itemSource(origin, named.indexOf(ref)) : IN_FILE,
  );
  if (styles !== undefined) return styles;
  const m = await createMeasurer();
  const bound = bindMarkOps(file, ops);
  if (bound.errors.length > 0) {
    return failure(sourced(bound.errors, (e) => itemSource(origin, e.index)));
  }
  const a = attempt(base, bound.ops, origin, m);
  return isReport(a) ? a : { base, ...a, m };
}

/**
 * Applies operations to a diagram in memory and checks the result, as a write does: the diagram it makes, or what it
 * would be refused for, each problem with its source from `origin`.
 */
export function attempt(
  base: Diagram | null,
  ops: readonly Op[],
  origin: Origin,
  m: Measurer,
): Report | { next: Diagram; changed: string[]; scene: Scene } {
  const result = applyOps(base, ops);
  const weights = "errors" in result ? [] : unknownWeights(result.diagram);
  if ("errors" in result || weights.length > 0) {
    const errors =
      "errors" in result ? result.errors : weights.map((e) => ({ ...e, whole: true as const }));
    const found = locate(base, ops, m, { errors });
    // An error of the whole diagram is the operation's after which it first appears.
    return failure(
      errors.map((e) => {
        if (e.whole === undefined) return { ...e, source: itemSource(origin, e.index) };
        const k = found.errorAt(e);
        return k === 0
          ? { ...e, source: IN_FILE }
          : { ...e, index: k - 1, source: itemSource(origin, k - 1) };
      }),
    );
  }
  const scene = layout(result.diagram, m);
  const defects = check(result.diagram, scene, m).filter((x) => x.owner === "agent");
  if (defects.length > 0) {
    const found = locate(base, ops, m, { defects });
    return {
      ok: false,
      changed: [],
      errors: [],
      defects: defects.map((d) => {
        const k = found.defectAt(d);
        return { ...d, source: k === 0 ? IN_FILE : itemSource(origin, k - 1) };
      }),
      kinds: kindsOf(result.diagram),
    };
  }
  return { next: result.diagram, changed: result.changed, scene };
}

/**
 * A batch file's operations and where each is in it, from its text, or the refusal to read them: a line the YAML
 * cannot read is its own source, and an operation that is not one is its line's.
 */
export function batchOps(
  batch: string,
  text: string,
  command: string,
): { ops: Op[]; origin: Origin } | Report {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (err) {
    const e = yamlError(text, err);
    return failure([{ ...e, source: `${batch} line ${e.facts?.line ?? 1}: ${e.found}` }]);
  }
  const origin: Origin = { command, batch: { file: batch, items: batchItems(text) } };
  const ops = parseOps(raw);
  if (ops.every((x) => !("code" in x))) return { ops: ops as Op[], origin };
  return failure((ops as OpError[]).map((e) => ({ ...e, source: itemSource(origin, e.index) })));
}

/**
 * Applies operations to the file's diagram and writes it, or refuses and writes nothing.
 * With `counts`, the report carries the drawing's counts (DESIGN.md, "Records over prose"), as apply's does.
 */
export async function runWrite(
  file: string,
  ops: Op[],
  origin: Origin,
  create = false,
  counts = false,
): Promise<Report> {
  const p = await plan(file, ops, create, origin);
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
  origin: Origin,
): Promise<Report | { report: Report; before: Counts; after: Counts }> {
  const p = await plan(file, ops, false, origin);
  if (isReport(p)) return p;
  const base = p.base as Diagram;
  return {
    report: { ok: true, changed: p.changed, errors: [], defects: [] },
    before: drawing(base, layout(base, p.m)).counts,
    after: drawing(p.next, p.scene).counts,
  };
}
