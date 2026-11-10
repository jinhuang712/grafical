// Turns zod issues into OpErrors (DESIGNS.md, "Every write is checked, and each defect has an owner").

import type { z } from "zod";
import type { Facts, OpError } from "../errors.ts";
import { WEIGHT_MAX, WEIGHT_MIN } from "../theme/paint.ts";
import { closest, editDistance } from "./suggest.ts";
import { STEP_NUMBER_MAX } from "./types.ts";

export const ID_NODE = "ID_NODE";
/** A group copy's suffix: the characters of an id, and it may start with any of them. */
export const ID_SUFFIX = "ID_SUFFIX";
/** An edge weight that is neither a level name nor a width within the limits (specs/decisions, "Edge weights"). */
export const WEIGHT = "WEIGHT";
/** A step number that is not a whole number within the limits (specs/decisions, "Step badges ride the edge"). */
export const STEP_NUMBER = "STEP_NUMBER";

/** The characters an id may hold. */
const ID_CHARS = ["a-z", "0-9", ".", "_", "-"];

/** The id an agent most likely meant: lowercase, with other characters as hyphens. A suffix keeps its hyphens at the ends. */
function likelyId(v: unknown, suffix = false): string[] {
  if (typeof v !== "string") return [];
  const lower = v
    .toLowerCase()
    .replace(/->/g, "-")
    .replace(/[^a-z0-9._-]+/g, "-");
  const id = suffix ? lower : lower.replace(/^-+|-+$/g, "");
  return id === "" || id === v ? [] : [id];
}

export function show(v: unknown): string {
  if (v === undefined) return "";
  const s = typeof v === "string" ? v : (JSON.stringify(v) ?? String(v));
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

export function getPath(raw: unknown, path: readonly PropertyKey[]): unknown {
  let cur: unknown = raw;
  for (const key of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<PropertyKey, unknown>)[key];
  }
  return cur;
}

/** `layers[0].nodes[1].kind`. */
export function fieldName(path: readonly PropertyKey[]): string {
  let out = "";
  for (const key of path) {
    if (typeof key === "number") out += `[${key}]`;
    else out += out === "" ? String(key) : `.${String(key)}`;
  }
  return out;
}

function expectedType(issue: z.core.$ZodIssue): string | undefined {
  const e = (issue as { expected?: unknown }).expected;
  return typeof e === "string" ? e : undefined;
}

/**
 * `raw` is the whole input the schema was run on, `index` the operation index.
 * With `leaf` set, the field is only the last path segment (for operations).
 */
export function issuesToErrors(
  issues: readonly z.core.$ZodIssue[],
  raw: unknown,
  index: number,
  leaf = false,
  known: Record<string, string[]> = OP_KEYS,
): OpError[] {
  const out: OpError[] = [];
  for (const issue of issues) {
    const path = issue.path;
    const field = leaf
      ? path.length
        ? String(path[path.length - 1])
        : undefined
      : fieldName(path);
    const base = field === undefined || field === "" ? {} : { field };
    const found = getPath(raw, path);
    if (issue.code === "unrecognized_keys") {
      const keys = (issue as { keys: string[] }).keys;
      const fields = knownKeys(raw, path, known);
      for (const key of keys) {
        out.push({
          code: "unknown-field",
          index,
          field: leaf ? key : fieldName([...path, key]),
          found: key,
          facts: {
            allowed: fields,
            likely: closest(key, fields, 2),
          },
        });
      }
    } else if (issue.code === "invalid_value") {
      const values = ((issue as { values?: unknown[] }).values ?? []).map(String);
      const facts =
        field === "kind" || field?.endsWith(".kind")
          ? guessedKind(raw, path, found, values)
          : { allowed: values };
      out.push({
        code: "bad-value",
        index,
        ...base,
        found: show(found),
        facts: facts.likely === undefined ? { ...facts, ...nearValue(found, values) } : facts,
      });
    } else if (issue.message === ID_NODE || issue.message === ID_SUFFIX) {
      out.push({
        code: "bad-id",
        index,
        ...base,
        found: show(found),
        facts: {
          allowed: ID_CHARS,
          likely: likelyId(found, issue.message === ID_SUFFIX),
        },
      });
    } else if (issue.message === WEIGHT) {
      // The stylesheet's own levels are checked once it is read; these are the built-in ones.
      out.push({
        code: "bad-value",
        index,
        ...base,
        found: show(found),
        facts: {
          allowed: ["thin", "thick", "heavy"],
          min: WEIGHT_MIN,
          max: WEIGHT_MAX,
        },
      });
    } else if (issue.message === STEP_NUMBER) {
      out.push({
        code: "bad-value",
        index,
        ...base,
        found: show(found),
        facts: { min: 1, max: STEP_NUMBER_MAX },
      });
    } else if (issue.code === "invalid_union" || issue.message === "mark-too-long") {
      // A mark is a text or a file: a string that is refused is too long (specs/decisions, "Marks of any kind").
      out.push(
        typeof found === "string"
          ? { code: "mark-too-long", index, ...base, found: show(found), facts: { max: 6 } }
          : {
              code: "bad-mark",
              index,
              ...base,
              found: show(found),
              facts: { allowed: ["text", "file"], type: "string" },
            },
      );
    } else if (issue.code === "invalid_type") {
      const type = expectedType(issue);
      out.push({
        code: found === undefined ? "missing-field" : "bad-type",
        index,
        ...base,
        found: show(found),
        ...(type !== undefined ? { facts: { type } } : {}),
      });
    } else if (issue.code === "too_small") {
      out.push({ code: "empty-value", index, ...base, found: show(found), facts: { min: 1 } });
    } else {
      out.push({ code: "invalid", index, ...base, found: show(found) });
    }
  }
  return out;
}

/** An allowed value a few letters from the one found, as its likely meaning: servise is service. */
function nearValue(found: unknown, values: string[]): Facts {
  if (typeof found !== "string") return {};
  const [near] = closest(found, values, 1);
  if (near === undefined) return {};
  return editDistance(found, near) <= Math.max(1, Math.floor(found.length / 3))
    ? { likely: [near] }
    : {};
}

/** Kinds agents guess, and the kind each most likely means, for nodes and for edges. */
const NODE_GUESS: Record<string, string[]> = {
  // A flowchart's Start and End are terminals; a state machine's are initial and final.
  start: ["terminal", "initial"],
  end: ["terminal", "final"],
  process: ["service"],
  step: ["service"],
  task: ["service"],
  app: ["service"],
  database: ["store"],
  db: ["store"],
  cache: ["store"],
  topic: ["queue"],
  stream: ["queue"],
  user: ["actor"],
  person: ["actor"],
  question: ["decision"],
  condition: ["decision"],
};
const EDGE_GUESS: Record<string, string> = {
  request: "call",
  sync: "call",
  message: "async",
  event: "async",
  flow: "data",
  sometimes: "optional",
  relation: "link",
  // How the edges of a kind look, given as the kind.
  solid: "call",
  dashed: "async",
  dotted: "optional",
  plain: "link",
};

/** What an unknown type likely meant: a guess agents make, or a built-in or own name a few letters off. */
export function likelyType(
  found: string,
  kinds: readonly string[],
  own: string[],
  edge: boolean,
): string[] {
  const guess = (edge ? EDGE_GUESS : NODE_GUESS)[found.toLowerCase()];
  if (guess !== undefined) return typeof guess === "string" ? [guess] : guess;
  return closest(found, [...kinds, ...own], 1);
}

function guessedKind(
  raw: unknown,
  path: readonly PropertyKey[],
  found: unknown,
  values: string[],
): Facts {
  const op = getPath(raw, ["op"]);
  const onEdge = (typeof op === "string" && op.startsWith("edge.")) || path.includes("edges");
  const key = typeof found === "string" ? found.toLowerCase() : undefined;
  const guess = key === undefined ? undefined : onEdge ? EDGE_GUESS[key] : NODE_GUESS[key];
  if (guess === undefined) return { allowed: values };
  return { allowed: values, likely: typeof guess === "string" ? [guess] : guess };
}

// The set of known keys of the object at `path`, found by its shape.
function knownKeys(
  raw: unknown,
  path: readonly PropertyKey[],
  keys: Record<string, string[]>,
): string[] {
  const last = path[path.length - 1];
  const parent = path[path.length - 2];
  const op = (raw as { op?: unknown } | null)?.op;
  if (path.length === 0 && typeof op === "string") return keys[op] ?? [];
  if (path.length === 0)
    return ["grafical", "title", "subtitle", "note", "layers", "groups", "edges"];
  if (parent === "nodes")
    return ["id", "label", "kind", "sublabel", "size", "emphasis", "align", "group", "marks"];
  if (last === undefined || typeof last === "number") {
    if (parent === "groups") return ["id", "label", "sublabel", "in"];
    if (parent === "layers") return ["id", "label", "nodes"];
    if (parent === "edges") return ["id", "from", "to", "kind", "label"];
  }
  return typeof op === "string" ? (keys[op] ?? []) : [];
}

// Filled in by ops.ts, so that an unknown field in an operation lists the right fields.
export const OP_KEYS: Record<string, string[]> = {};
