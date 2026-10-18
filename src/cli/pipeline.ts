// The write path shared by every write command (DESIGN.md, "Defects owned by who can fix them", "Interfaces"):
// read, apply, lay out, check, and write only if nothing is wrong.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import { type Counts, countsText, drawing, warningsOf } from "../check/drawing.ts";
import { check } from "../check/index.ts";
import type { Defect, ErrorCode, Facts, OpError, Warning } from "../errors.ts";
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
import { type Block, defectBlock, errorBlock, kindsOf, warningBlock } from "./problems.ts";
import { batchItems, IN_FILE, itemSource, type Origin, unlined } from "./source.ts";

export interface Report {
  ok: boolean;
  changed: string[];
  errors: OpError[];
  defects: Defect[];
  /** The drawing's counts (DESIGN.md, "Records over prose"): on apply, check and render, when nothing was refused. */
  counts?: Counts;
  /** What the drawing draws poorly: on every write, check and render (DESIGN.md, "Every write prints every warning"). */
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
  if (r.counts !== undefined) out.push(...(problems.length > 0 ? [""] : []), countsText(r.counts));
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
 * How many prefixes of a refused batch grafical applies, and how many of them it lays out, to find where the batch's
 * problems come from (GOALS.md, "Speed"). A problem whose line is not found within them has the batch file as its
 * source, with no line: never a line that is not known.
 */
const PREFIX_APPLIES = 16;
const PREFIX_LAYOUTS = 8;

/**
 * What a prefix of a batch says of a problem: there, not there, or unknown, when the prefix is refused for another
 * problem: the checks of a whole diagram stop at the first set that fails, and a refused diagram is not laid out. When
 * the prefixes to apply or lay out are spent, it is not asked.
 */
type Seen = "present" | "absent" | "unknown" | "spent";

/** Every value an operation names, in any of its fields. */
function namedIn(op: Op): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") out.add(v);
    else if (Array.isArray(v)) for (const x of v) walk(x);
    else if (v !== null && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) if (k !== "op") walk(x);
    }
  };
  walk(op);
  return out;
}

/**
 * The ids a problem is about: what an error found, a defect's elements, and the ids of its facts, with the two ends of
 * a line. A defect's found is a text, not an id.
 */
function idsOf(found: string | undefined, elements: readonly string[], f: Facts): string[] {
  const ids = [found, ...elements, f.node, f.group, f.edge, f.row, f.lane, f.wall, f.note];
  const all = [...ids, ...(f.nodes ?? []), ...(f.ends ?? [])].filter(
    (x): x is string => x !== undefined && x !== "",
  );
  return [...new Set(all.flatMap((id) => [id, ...id.split("->")]))];
}

/**
 * Where a problem of the diagram a batch makes comes from (DESIGN.md, "Refusals say what happened and which commands
 * can change it"): the number of operations after which it is not there and after which, one more, it is; 0 when the
 * diagram before the batch has it; undefined when no line can be known. It runs only on a refused write, so a write
 * that succeeds costs nothing more. grafical tries the first and the last operation that names what the problem is
 * about, just before and after each, then the batch less its last operation, then halves the range, as if what
 * appears stays. A prefix refused for another problem cannot tell, and the nearest one that can is tried in its place.
 * Each prefix is applied and laid out once for all the problems, within PREFIX_APPLIES and PREFIX_LAYOUTS.
 */
function locate(
  base: Diagram | null,
  ops: readonly Op[],
  m: Measurer,
  final: Refusal,
): {
  errorAt: (e: OpError) => number | undefined;
  defectAt: (d: Defect) => number | undefined;
} {
  const n = ops.length;
  type Applied = { errors: Set<string> } | { diagram: Diagram | null };
  const applied = new Map<number, Applied>();
  const defectsAt = new Map<number, Set<string>>();
  if ("errors" in final) applied.set(n, { errors: new Set(final.errors.map(errorKey)) });
  else defectsAt.set(n, new Set(final.defects.map(defectKey)));
  let applies = 0;
  let layouts = 0;
  const apply = (k: number): Applied | undefined => {
    const known = applied.get(k);
    if (known !== undefined) return known;
    let a: Applied;
    // No diagram before a new file: nothing is in it.
    if (k === 0 && base === null) a = { diagram: null };
    else {
      if (applies >= PREFIX_APPLIES) return undefined;
      applies++;
      const r = applyOps(base, ops.slice(0, k));
      const weights = "errors" in r ? [] : unknownWeights(r.diagram);
      if ("errors" in r) a = { errors: new Set(r.errors.map(errorKey)) };
      else if (weights.length > 0)
        a = { errors: new Set(weights.map((e) => errorKey({ ...e, whole: true }))) };
      else a = { diagram: r.diagram };
    }
    applied.set(k, a);
    return a;
  };
  const seen = (k: number, key: string, defect: boolean): Seen => {
    const known = defect ? defectsAt.get(k) : undefined;
    if (known !== undefined) return known.has(key) ? "present" : "absent";
    const a = apply(k);
    if (a === undefined) return "spent";
    if ("errors" in a) return a.errors.has(key) ? "present" : "unknown";
    if (!defect || a.diagram === null) return "absent";
    if (layouts >= PREFIX_LAYOUTS) return "spent";
    layouts++;
    const d = a.diagram;
    const found = check(d, layout(d, m), m, false).filter((x) => x.owner === "agent");
    defectsAt.set(k, new Set(found.map(defectKey)));
    return defectsAt.get(k)?.has(key) ? "present" : "absent";
  };
  const named = ops.map(namedIn);
  const firstAt = (key: string, defect: boolean, ids: readonly string[]): number | undefined => {
    const s0 = seen(0, key, defect);
    if (s0 === "present") return 0;
    if (s0 !== "absent") return undefined;
    // It is not there after `lo` operations, and is there after `hi`.
    let lo = 0;
    let hi = n;
    const settle = (k: number): Seen => {
      const s = seen(k, key, defect);
      if (s === "present") hi = k;
      else if (s === "absent") lo = k;
      return s;
    };
    // The first operation that names what the problem is about, and the last, are most often its cause: each is tried
    // with the prefix just before it.
    const names = (x: Set<string>) => ids.some((id) => x.has(id));
    const suspects = [named.findIndex(names) + 1, named.findLastIndex(names) + 1];
    for (const k of suspects.filter((x) => x > 0).flatMap((x) => [x, x - 1])) {
      if (k > lo && k < hi && settle(k) === "spent") return undefined;
    }
    // Else a change's problem is most often its last operation's, which is tried next; then the range halves.
    let first = true;
    while (hi - lo > 1) {
      const mid = first ? hi - 1 : (lo + hi) >> 1;
      first = false;
      const near = [mid];
      for (let k = mid - 1; k > lo; k--) near.push(k);
      for (let k = mid + 1; k < hi; k++) near.push(k);
      let told = false;
      for (const k of near) {
        const s = settle(k);
        if (s === "spent") return undefined;
        if (s !== "unknown") {
          told = true;
          break;
        }
      }
      if (!told) return undefined;
    }
    return hi;
  };
  return {
    errorAt: (e) => firstAt(errorKey(e), false, idsOf(e.found, [], e.facts ?? {})),
    defectAt: (d) => firstAt(defectKey(d), true, idsOf(undefined, d.elements, d.facts)),
  };
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
    // An error of the whole diagram is the operation's after which it first appears. One whose line cannot be known is
    // no operation's: it has no index.
    return failure(
      errors.map((e) => {
        if (e.whole === undefined) return { ...e, source: itemSource(origin, e.index) };
        const k = found.errorAt(e);
        if (k === undefined) return { ...e, index: -1, source: unlined(origin) };
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
        const source =
          k === undefined ? unlined(origin) : k === 0 ? IN_FILE : itemSource(origin, k - 1);
        return { ...d, source };
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
    warnings: warningsOf(dr, p.next),
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
