// The write path shared by every write command (DESIGNS.md, "The command line comes first, and the help is the agent's only reference", specs/decisions, "Defects owned by who can fix them"):
// read, apply, lay out, check, and write only if nothing is wrong.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type Counts, countsText, drawing, warningsOf } from "../check/drawing.ts";
import { check } from "../check/index.ts";
import type { Defect, ErrorCode, Facts, OpError, Warning } from "../errors.ts";
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
import { type Block, defectBlock, errorBlock, kindsOf, warningBlock } from "./problems.ts";
import { IN_FILE, type Origin } from "./source.ts";

export interface Report {
  ok: boolean;
  changed: string[];
  errors: OpError[];
  defects: Defect[];
  /** The drawing's counts (specs/decisions, "Records over prose"): on check and render, when nothing was refused. */
  counts?: Counts;
  /** What the drawing draws poorly: on every write, check and render (specs/decisions, "Every write prints every warning"). */
  warnings?: Warning[];
  /** What each id of the diagram the defects are found in names, so that their detail names each by its kind. */
  kinds?: ReadonlyMap<string, string>;
}

/** The report's problems as blocks: its errors, then its defects, then its warnings. */
export function blocks(r: Report): Block[] {
  const kinds = r.kinds ?? new Map<string, string>();
  return [
    ...r.errors.map(errorBlock),
    ...r.defects.map((d) => defectBlock(d, kinds)),
    ...(r.warnings ?? []).map(warningBlock),
  ];
}

/**
 * The report as text (specs/decisions, "Refusals say what happened and which commands can change it"): ok with the ids it
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
  if (r.counts !== undefined) out.push(...(problems.length > 0 ? [""] : []), countsText(r.counts));
  return `${out.join("\n")}\n`;
}

/** A block as --json gives it: its parts. */
export function blockBody(b: Block): Record<string, unknown> {
  return {
    kind: b.kind,
    code: b.code,
    description: b.description,
    ...(b.source !== undefined ? { source: b.source } : {}),
    detail: b.detail,
    next: b.next,
  };
}

/** The report as the JSON object `--json` prints. */
export function reportBody(report: Report): Record<string, unknown> {
  return {
    ok: report.ok,
    changed: report.changed,
    problems: blocks(report).map(blockBody),
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

/** A file that cannot be had, which no operation causes: its error has no operation's index. */
export function fileError(code: ErrorCode, file: string, facts?: Facts): Report {
  return failure([{ code, index: -1, field: "file", found: file, ...(facts ? { facts } : {}) }]);
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
  // The file is read before its stylesheet, so a weight level is checked here (specs/decisions, "Edge weights").
  const weights = unknownWeights(d);
  return weights.length > 0 ? inFile(weights) : d;
}

/**
 * Reads the stylesheets a diagram names, relative to its folder, and hands them
 * to layout (specs/decisions, "Themes and stylesheets"). Returns a report for the first one that is missing or wrong,
 * its errors with the source and the operation's index `sourceOf` gives the stylesheet. A style that is not a valid
 * name is left for the model to refuse.
 */
export function loadStyles(
  file: string,
  refs: string[],
  sourceOf?: (ref: string) => { source: string; index: number },
): Report | undefined {
  const of = (ref: string, r: Report) =>
    sourceOf === undefined ? r : failure(r.errors.map((e) => ({ ...e, ...sourceOf(ref) })));
  for (const ref of refs) {
    if (styleProblem(ref) !== undefined) continue;
    const path = resolve(dirname(file), ref);
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

/** What every write would refuse in the file as it is: the checks of a whole diagram, with no operation applied. */
export function fileErrors(d: Diagram): Report | undefined {
  const r = applyOps(d, []);
  return "errors" in r ? failure(sourced(r.errors, () => IN_FILE)) : undefined;
}

/**
 * Lays out and checks a diagram as it is in its file, so that each defect is already in the file. Without `all`,
 * only the defects the agent can fix: engine-owned ones are the engine's to avoid, and only `check --all` reports
 * them (specs/decisions, "Defects owned by who can fix them").
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

/**
 * The facts that name what a problem is about, which its block prints: two problems are the same only when these
 * are, so that the edge a source names never contradicts the detail.
 */
const ABOUT: readonly (keyof Facts)[] = [
  "is",
  "node",
  "layer",
  "group",
  "edge",
  "edges",
  "ends",
  "lane",
  "wall",
  "note",
  "nodes",
  "layers",
  "groups",
  "lanes",
  "between",
  "across",
  "covers",
  "beside",
  "chain",
  "top",
  "bottom",
  "place",
];

function about(f: Facts): string[] {
  return ABOUT.map((k) => {
    const v = f[k];
    return Array.isArray(v) ? v.join(",") : String(v ?? "");
  });
}

/** What makes two problems the same one in two diagrams: its code and what it is about. */
export function errorKey(e: OpError): string {
  // A field of a whole diagram's error is a place in the file, which other operations move.
  return [e.code, e.whole ? "" : (e.field ?? ""), e.found, ...about(e.facts ?? {})].join("\u0000");
}

export function defectKey(d: Defect): string {
  return [d.code, d.field ?? "", d.found ?? "", d.elements.join(","), ...about(d.facts)].join(
    "\u0000",
  );
}

/** The check of a whole diagram that finds an edge weight its stylesheet lacks: after those of applyOps. */
const WEIGHTS = 5;

/**
 * What the file says of a problem: there, not there, or unknown, when the file is refused for another problem: the
 * checks of a whole diagram stop at the first set that fails, and a refused diagram is not laid out.
 */
type Seen = "present" | "absent" | "unknown";

/**
 * Whether a problem of the diagram a write makes was already in the file (specs/decisions, "Refusals say what happened
 * and which commands can change it"). It runs only on a refused write, so a write that succeeds costs nothing more,
 * and the file is checked once for all the problems. A file refused for another problem cannot tell, unless a later
 * check refused it after the one that finds this problem passed.
 */
function inFile(
  base: Diagram | null,
  m: Measurer,
): { error: (e: OpError) => Seen; defect: (d: Defect) => Seen } {
  // The file refused: its errors, and the check that found them, 0 for an operation's own.
  type Applied = { errors: Set<string>; stage: number } | { diagram: Diagram | null };
  let applied: Applied | undefined;
  let defects: Set<string> | undefined;
  const file = (): Applied => {
    if (applied !== undefined) return applied;
    // No diagram before a new file: nothing is in it.
    if (base === null) applied = { diagram: null };
    else {
      const r = applyOps(base, []);
      const weights = "errors" in r ? [] : unknownWeights(r.diagram);
      if ("errors" in r)
        applied = { errors: new Set(r.errors.map(errorKey)), stage: r.errors[0]?.stage ?? 0 };
      else if (weights.length > 0)
        applied = {
          errors: new Set(weights.map((e) => errorKey({ ...e, whole: true }))),
          stage: WEIGHTS,
        };
      else applied = { diagram: r.diagram };
    }
    return applied;
  };
  const seen = (key: string, defect: boolean, stage: number | undefined): Seen => {
    const a = file();
    if ("errors" in a) {
      if (a.errors.has(key)) return "present";
      // Refused by a later check, the file passed the one that finds this problem.
      return !defect && stage !== undefined && stage < a.stage ? "absent" : "unknown";
    }
    if (!defect || a.diagram === null) return "absent";
    if (defects === undefined) {
      const d = a.diagram;
      const all = check(d, layout(d, m), m, false).filter((x) => x.owner === "agent");
      defects = new Set(all.map(defectKey));
    }
    return defects.has(key) ? "present" : "absent";
  };
  return {
    error: (e) => seen(errorKey(e), false, e.stage),
    defect: (d) => seen(defectKey(d), true, undefined),
  };
}

/**
 * Applies an operation to the file's diagram in memory and checks the result, writing
 * nothing. With `create`, there is no file yet: the operation is diagram.new,
 * and an existing file is refused. A refusal's problems carry their sources, from `origin`.
 */
async function plan(
  file: string,
  op: Op,
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
    const loaded = loadDiagram(file, settingSlots([op]));
    if (isReport(loaded)) return failure(sourced(loaded.errors, command));
    base = loaded;
  }
  const named = op.op === "diagram.style" || op.op === "diagram.new" ? op.style : undefined;
  // A stylesheet the operation names is the command's; the others are the file's.
  const styles = loadStyles(file, stylesheetRefs(base, [named]), (ref) =>
    ref === named ? { source: origin.command, index: 0 } : { source: IN_FILE, index: -1 },
  );
  if (styles !== undefined) return styles;
  const m = await createMeasurer();
  const bound = bindMarkOps(file, [op]);
  if (bound.errors.length > 0) {
    return failure(sourced(bound.errors, () => origin.command));
  }
  const a = attempt(base, bound.ops[0] as Op, origin, m);
  return isReport(a) ? a : { base, ...a, m };
}

/**
 * Applies an operation to a diagram in memory and checks the result, as a write does: the diagram it makes, or what it
 * would be refused for, each problem with its source: the command, or the file when the file already had it.
 */
export function attempt(
  base: Diagram | null,
  op: Op,
  origin: Origin,
  m: Measurer,
): Report | { next: Diagram; changed: string[]; scene: Scene } {
  const result = applyOps(base, [op]);
  const weights = "errors" in result ? [] : unknownWeights(result.diagram);
  if ("errors" in result || weights.length > 0) {
    const errors =
      "errors" in result
        ? result.errors
        : weights.map((e) => ({ ...e, whole: true as const, stage: WEIGHTS }));
    const was = inFile(base, m);
    // An error of the whole diagram is the file's when the file already had it, else the command's. One that cannot be
    // told is no operation's: it has no index.
    return failure(
      errors.map((e) => {
        if (e.whole === undefined) return { ...e, source: origin.command };
        const s = was.error(e);
        if (s === "present") return { ...e, source: IN_FILE };
        return { ...e, index: s === "absent" ? 0 : -1, source: origin.command };
      }),
    );
  }
  const scene = layout(result.diagram, m);
  const defects = check(result.diagram, scene, m).filter((x) => x.owner === "agent");
  if (defects.length > 0) {
    const was = inFile(base, m);
    return {
      ok: false,
      changed: [],
      errors: [],
      defects: defects.map((d) => ({
        ...d,
        source: was.defect(d) === "present" ? IN_FILE : origin.command,
      })),
      kinds: kindsOf(result.diagram),
    };
  }
  return { next: result.diagram, changed: result.changed, scene };
}

/** Applies an operation to the file's diagram and writes it, or refuses and writes nothing. */
export async function runWrite(
  file: string,
  op: Op,
  origin: Origin,
  create = false,
): Promise<Report> {
  const p = await plan(file, op, create, origin);
  if (isReport(p)) return p;
  writeAtomic(file, writeDiagram(p.next));
  const dr = drawing(p.next, p.scene);
  return {
    ok: true,
    changed: p.changed,
    errors: [],
    defects: [],
    warnings: warningsOf(dr, p.next),
  };
}

/**
 * What a command would do, with --try (specs/decisions, "Records over prose"): the counts of the drawing before and
 * after it, with nothing written. The agent decides what to try; grafical measures.
 */
export async function tryWrite(
  file: string,
  op: Op,
  origin: Origin,
): Promise<Report | { report: Report; before: Counts; after: Counts }> {
  const p = await plan(file, op, false, origin);
  if (isReport(p)) return p;
  const base = p.base as Diagram;
  return {
    report: { ok: true, changed: p.changed, errors: [], defects: [] },
    before: drawing(base, layout(base, p.m)).counts,
    after: drawing(p.next, p.scene).counts,
  };
}
