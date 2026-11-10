// What every command answers
// (specs/decisions, "An answer says what happened, and a write reports only what it changed"): one word for what
// happened, then sections in a fixed order, each in a tag and indented, each left out when it is empty. A write says
// each object it made, changed or removed, found by comparing the diagram before and after it, and how the warnings
// moved. --json says the same answer, one key a section. Its records and blocks keep their own decisions
// (specs/decisions, "Records over prose") (specs/decisions, "Refusals say what happened and which commands can change it").

import type { Counts } from "../check/drawing.ts";
import type { Warning } from "../errors.ts";
import { diffDiagrams } from "../model/diff.ts";
import type { Op } from "../model/ops.ts";
import type { Diagram } from "../model/types.ts";
import { block, fields, record, section, type Value } from "../records.ts";
import { type Block, ordered } from "./problems.ts";

/** What happened: written, the same, tried, refused, or a read that answered. */
export type Outcome = "WRITTEN" | "UNCHANGED" | "TRIED" | "REFUSED" | "OK";

/** The sorts of object a change names, in the order the diagram file holds their blocks. */
const SORTS = [
  "diagram",
  "type",
  "style",
  "layer",
  "group",
  "lane",
  "column",
  "wall",
  "node",
  "edge",
  "label",
  "mark",
  "note",
  "legend",
] as const;
export type Sort = (typeof SORTS)[number];

/** One object a write touched. `by` names the object the command named that caused a change it did not name. */
export interface Change {
  action: "MADE" | "CHANGED" | "REMOVED";
  sort: Sort;
  /** None for the diagram. */
  id?: string;
  /** The flags whose value changed, `place` for a change of order or position. */
  fields?: string[];
  by?: string;
}

/** How a write moved the warnings: how many it brought, those it cleared, and how many there are after it. */
export interface WarningMoves {
  new: number;
  cleared: Warning[];
  total: number;
}

/** A section a read prints: its name, its lines as text, and its value as --json gives it. */
export interface Body {
  name: "diagram" | "object" | "drawing" | "stylesheets" | "address";
  lines: string[];
  json: unknown;
}

export interface Answer {
  outcome: Outcome;
  changes?: Change[];
  warnings?: WarningMoves;
  before?: Counts;
  after?: Counts;
  delta?: Record<string, number>;
  files?: string[];
  counts?: Counts;
  body?: Body;
  problems?: Block[];
}

/** The exit code an answer has: 1 when refused. A usage error's 2 is the caller's. */
export function exitOf(a: Answer): number {
  return a.outcome === "REFUSED" ? 1 : 0;
}

/** A change as one line: what was done, to which object, the flags whose value changed, and what caused it. */
function changeLine(c: Change): string {
  const head =
    c.sort === "diagram" ? `${c.action} diagram` : `${c.action} ${fields({ [c.sort]: c.id })}`;
  const rest: Record<string, Value> = {};
  if (c.fields !== undefined) rest.fields = c.fields;
  if (c.by !== undefined) rest.by = c.by;
  const tail = fields(rest);
  return tail === "" ? head : `${head} ${tail}`;
}

function signed(d: Record<string, number>): Record<string, Value> {
  return Object.fromEntries(Object.entries(d).map(([k, n]) => [k, n > 0 ? `+${n}` : String(n)]));
}

/** A warning gone after a write, as one line: its code and its facts. */
function clearedLine(w: Warning): string {
  return record(`CLEARED ${w.code}`, ordered(w.facts));
}

/** The answer as text: the word, then each section that has anything in it, in the fixed order. */
export function answerText(a: Answer): string {
  const out: string[] = [a.outcome];
  if (a.changes !== undefined && a.changes.length > 0) {
    out.push(...section("changes", a.changes.map(changeLine)));
  }
  if (a.warnings !== undefined) {
    const w = a.warnings;
    out.push(
      ...section("warnings", [
        fields({ new: w.new, cleared: w.cleared.length, total: w.total }),
        ...w.cleared.map(clearedLine),
      ]),
    );
  }
  if (a.before !== undefined) out.push(...section("before", [fields({ ...a.before })]));
  if (a.after !== undefined) out.push(...section("after", [fields({ ...a.after })]));
  if (a.delta !== undefined) out.push(...section("delta", [fields(signed(a.delta))]));
  if (a.files !== undefined && a.files.length > 0) out.push(...section("files", a.files));
  if (a.counts !== undefined) out.push(...section("counts", [fields({ ...a.counts })]));
  if (a.body !== undefined && a.body.lines.length > 0)
    out.push(...section(a.body.name, a.body.lines));
  if (a.problems !== undefined && a.problems.length > 0) {
    const lines: string[] = [];
    for (const [i, b] of a.problems.entries()) {
      if (i > 0) lines.push("");
      lines.push(...block(b));
    }
    out.push(...section("problems", lines));
  }
  return `${out.join("\n")}\n`;
}

/** A block as --json gives it: its parts, its kind in capitals as the text says it. */
function blockBody(b: Block): Record<string, unknown> {
  return {
    kind: b.kind.toUpperCase(),
    code: b.code,
    description: b.description,
    ...(b.source !== undefined ? { source: b.source } : {}),
    detail: b.detail,
    next: b.next,
  };
}

/** The answer as the object --json prints: the word as `outcome`, and one key for each section it has. */
export function answerJson(a: Answer): Record<string, unknown> {
  const out: Record<string, unknown> = { outcome: a.outcome };
  if (a.changes !== undefined && a.changes.length > 0) out.changes = a.changes;
  if (a.warnings !== undefined) {
    out.warnings = {
      new: a.warnings.new,
      cleared: a.warnings.cleared.map((w) => ({ code: w.code, ...ordered(w.facts) })),
      total: a.warnings.total,
    };
  }
  if (a.before !== undefined) out.before = a.before;
  if (a.after !== undefined) out.after = a.after;
  if (a.delta !== undefined) out.delta = a.delta;
  if (a.files !== undefined && a.files.length > 0) out.files = a.files;
  if (a.counts !== undefined) out.counts = a.counts;
  if (a.body !== undefined) out[a.body.name] = a.body.json;
  if (a.problems !== undefined && a.problems.length > 0) out.problems = a.problems.map(blockBody);
  return out;
}

/** The flag an operation's field is said with: bendAt is bend-at; a mark file's hash is its file. */
function flagOf(key: string): string {
  if (key === "sha256") return "file";
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** The flags of a sort that say where its object sits, which a write reports as `place`. */
const PLACING: Partial<Record<Sort, readonly string[]>> = {
  node: ["layer", "first", "last", "before", "after", "from", "up", "down", "left", "right"],
  layer: ["first", "last", "before", "after"],
  column: ["first", "last", "before", "after"],
};

/** One object as the commands that would make it say it: its flags and their values, and where it sits. */
interface Facts {
  flags: Map<string, string>;
}

const keyOf = (sort: string, id: string) => `${sort}\u0000${id}`;

/**
 * Every object of a diagram, by sort and id, as the commands that build it from nothing say it: the facts a write's
 * changes are found in. A place is left out here and compared apart, by order among the objects both diagrams hold.
 */
function factsOf(d: Diagram | null): Map<string, Facts> {
  const out = new Map<string, Facts>();
  if (d === null) return out;
  for (const op of diffDiagrams(null, d)) {
    const [noun, verb] = op.op.split(".") as [Sort, string];
    if (verb !== "set") continue;
    const raw = op as unknown as Record<string, unknown>;
    const ids = noun === "diagram" ? [""] : ((raw.ids as string[] | undefined) ?? []);
    for (const id of ids) {
      const k = keyOf(noun, id);
      const f = out.get(k) ?? { flags: new Map<string, string>() };
      for (const [key, v] of Object.entries(raw)) {
        if (key === "op" || key === "ids") continue;
        const flag = flagOf(key);
        if (PLACING[noun]?.includes(flag)) continue;
        f.flags.set(flag, JSON.stringify(v));
      }
      out.set(k, f);
    }
  }
  return out;
}

/** Each object of a sort that has an order, by sort and id: its place among the objects both diagrams hold. */
function placesOf(
  d: Diagram | null,
  common: (sort: Sort, id: string) => boolean,
): Map<string, string> {
  const out = new Map<string, string>();
  if (d === null) return out;
  const rank = (sort: Sort, ids: string[], where = "") => {
    const kept = ids.filter((id) => common(sort, id));
    for (const [i, id] of kept.entries()) out.set(keyOf(sort, id), `${where}${i}`);
  };
  rank(
    "layer",
    d.layers.map((l) => l.id),
  );
  for (const l of d.layers)
    rank(
      "node",
      l.nodes.map((n) => n.id),
      `${l.id}:`,
    );
  for (const n of d.nodes ?? []) {
    const steps = [n.up, n.down, n.left, n.right].map((x) => String(x ?? 0));
    out.set(keyOf("node", n.id), `from:${String(n.from)}:${steps.join(",")}`);
  }
  rank(
    "column",
    (d.columns ?? []).map((c) => c.id),
  );
  rank(
    "style",
    (d.styles ?? []).map((s) => s.id),
  );
  return out;
}

/** The ids a change of an object may come from: what it ends at, sits in or is on. */
function relatedOf(sort: Sort, id: string, flags: Map<string, string> | undefined): string[] {
  const out: string[] = [];
  const take = (flag: string) => {
    const v = flags?.get(flag);
    if (v === undefined) return;
    const parsed = JSON.parse(v) as unknown;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const x of list) if (typeof x === "string") out.push(...x.split(/[,:]/));
  };
  if (sort === "edge") ["from", "to"].forEach(take);
  if (sort === "node") ["group", "lane", "column", "align", "like"].forEach(take);
  if (sort === "group") take("in");
  if (sort === "layer") take("lane");
  if (sort === "wall") ["between", "and", "allow"].forEach(take);
  if (sort === "mark") out.push(id.split(":")[0] as string);
  if (sort === "note" || sort === "label") out.push(id);
  return out;
}

/** The objects a command names: what it makes, changes, moves or removes by name. */
function namedOf(op: Op): { sort: Sort; id: string }[] {
  const raw = op as unknown as Record<string, unknown>;
  const [noun] = op.op.split(".") as [Sort];
  if (noun === "diagram") return [{ sort: "diagram", id: "" }];
  const ids = [
    ...((raw.ids as string[] | undefined) ?? []),
    ...(typeof raw.id === "string" ? [raw.id] : []),
    ...(typeof raw.into === "string" ? [raw.into] : []),
    ...((raw.nodes as string[] | undefined) ?? []),
  ];
  return ids.map((id) => ({ sort: noun, id }));
}

/**
 * What a write did to each object, found by comparing the diagram before it with the diagram after it: made, changed
 * with the flags whose value changed, or removed. A change of an object the command did not name says which named
 * object caused it.
 */
export function changesOf(before: Diagram | null, after: Diagram, op: Op): Change[] {
  const was = factsOf(before);
  const now = factsOf(after);
  const both = (sort: Sort, id: string) => was.has(keyOf(sort, id)) && now.has(keyOf(sort, id));
  const placeWas = placesOf(before, both);
  const placeNow = placesOf(after, both);
  const named = namedOf(op);
  // A label is on its owner, so a change of the label of an object the command names is named too.
  const isNamed = (sort: Sort, id: string) =>
    named.some((n) => n.id === id && (n.sort === sort || sort === "label"));
  const owners = new Map<string, Change["action"]>();
  const out: Change[] = [];
  const keys = [...new Set([...was.keys(), ...now.keys()])];
  const none: Facts = { flags: new Map() };
  for (const k of keys) {
    const [sort, id] = k.split("\u0000") as [Sort, string];
    // A label is there as long as its owner is: one that takes its first look, or loses its last, is changed.
    const label = sort === "label";
    const a = was.get(k) ?? (label ? none : undefined);
    const b = now.get(k) ?? (label ? none : undefined);
    let change: Change | undefined;
    if (a === undefined) change = { action: "MADE", sort, id };
    else if (b === undefined) change = { action: "REMOVED", sort, id };
    else {
      const flags = [...new Set([...a.flags.keys(), ...b.flags.keys()])].filter(
        (f) => a.flags.get(f) !== b.flags.get(f),
      );
      if (placeWas.get(k) !== placeNow.get(k)) flags.push("place");
      if (flags.length > 0) change = { action: "CHANGED", sort, id, fields: flags.sort() };
    }
    if (change === undefined) continue;
    if (!label) owners.set(id, change.action);
    out.push(change);
  }
  const kept = out.filter(
    // A label goes with the object it is on: an owner made or removed says it.
    (c) =>
      c.sort !== "label" ||
      owners.get(c.id as string) === undefined ||
      owners.get(c.id as string) === "CHANGED",
  );
  // A change the command did not name comes from a named object it relates to, or from one that a change it relates
  // to came from, as an edge of a copied node comes from the copy; else from the command's first object.
  const said = (n: { sort: Sort; id: string }) =>
    n.sort === "diagram" ? "diagram" : `${n.sort}:${n.id}`;
  const unnamed = kept.filter((c) => !isNamed(c.sort, c.id as string));
  const relatedTo = new Map(
    unnamed.map((c) => {
      const k = keyOf(c.sort, c.id as string);
      return [c, relatedOf(c.sort, c.id as string, (now.get(k) ?? was.get(k))?.flags)] as const;
    }),
  );
  const causeOf = new Map<string, string>();
  for (const c of unnamed) {
    const cause = named.find((n) => relatedTo.get(c)?.includes(n.id));
    if (cause !== undefined) causeOf.set(c.id as string, said(cause));
  }
  for (const c of unnamed) {
    const through = relatedTo.get(c)?.find((id) => causeOf.has(id));
    const first = named[0];
    const by =
      causeOf.get(c.id as string) ??
      (through === undefined ? undefined : causeOf.get(through)) ??
      (first === undefined ? undefined : said(first));
    if (by !== undefined) c.by = by;
  }
  for (const c of kept) if (c.sort === "diagram") delete c.id;
  return kept.sort((x, y) => {
    const s = SORTS.indexOf(x.sort) - SORTS.indexOf(y.sort);
    return s !== 0 ? s : (x.id ?? "") < (y.id ?? "") ? -1 : (x.id ?? "") > (y.id ?? "") ? 1 : 0;
  });
}

/** A warning's identity: its code and its facts. */
const warningKey = (w: Warning) => `${w.code}\u0000${JSON.stringify(ordered(w.facts))}`;

/** How the warnings moved across a write: those it brought, those it cleared, and how many there are after it. */
export function warningMoves(
  before: Warning[],
  after: Warning[],
): { added: Warning[]; moves: WarningMoves } {
  const was = new Set(before.map(warningKey));
  const now = new Set(after.map(warningKey));
  const added = after.filter((w) => !was.has(warningKey(w)));
  const cleared = before.filter((w) => !now.has(warningKey(w)));
  return { added, moves: { new: added.length, cleared, total: after.length } };
}
