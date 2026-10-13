// Turns zod issues into OpErrors (DESIGN.md D5).

import type { z } from "zod";
import type { OpError } from "../errors.ts";
import { lineStyle } from "../theme/paint.ts";
import { allowed, closest } from "./suggest.ts";
import { EDGE_KINDS, type EdgeKind } from "./types.ts";

export const ID_NODE = "ID_NODE";
export const ID_EDGE = "ID_EDGE";

export const ID_PATTERN_TEXT =
  "lowercase letters, digits, '.', '_' or '-', starting with a letter or digit";
export const EDGE_ID_PATTERN_TEXT = `${ID_PATTERN_TEXT}; may contain '->' and '#<n>'`;

export function show(v: unknown): string {
  if (v === undefined) return "(missing)";
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

function expectedType(issue: z.core.$ZodIssue): string {
  const e = (issue as { expected?: unknown }).expected;
  return typeof e === "string" ? `a ${e}` : "a valid value";
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
      const known = knownKeys(raw, path);
      for (const key of keys) {
        const f = leaf ? key : fieldName([...path, key]);
        const near = closest(key, known, 2);
        const value = getPath(raw, [...path, key]);
        const renamed = leaf ? RENAMED[`${String(getPath(raw, ["op"]))}.${key}`] : undefined;
        // YAML ends unquoted text at a comma or a colon, and the rest becomes a key.
        const cut = value === null || /\s/.test(key);
        out.push({
          code: "unknown-field",
          index,
          field: f,
          found: key,
          expected: known.length ? `one of: ${known.join(", ")}` : "no extra fields",
          ...(renamed !== undefined
            ? { suggestion: `${key} -> ${renamed}` }
            : cut
              ? {
                  suggestion: `text cut at "," or ":" before ${key}: quote it`,
                }
              : near.length
                ? { suggestion: `did you mean: ${near.join(", ")}` }
                : {}),
        });
      }
    } else if (issue.code === "invalid_value") {
      const values = ((issue as { values?: unknown[] }).values ?? []).map(String);
      out.push({
        code: "bad-value",
        index,
        ...base,
        found: show(found),
        expected: "a known value",
        suggestion:
          field === "style" && leaf
            ? legendStyle(found, values)
            : field === "kind" || field?.endsWith(".kind")
              ? guessedKind(raw, path, found, values)
              : allowed(values),
      });
    } else if (issue.message === ID_NODE || issue.message === ID_EDGE) {
      const text = issue.message === ID_NODE ? ID_PATTERN_TEXT : EDGE_ID_PATTERN_TEXT;
      out.push({
        code: "bad-id",
        index,
        ...base,
        found: show(found),
        expected: text,
        suggestion: "use lowercase, such as relay or order-db",
      });
    } else if (issue.code === "invalid_type") {
      out.push({
        code: found === undefined ? "missing-field" : "bad-type",
        index,
        ...base,
        found: show(found),
        expected: expectedType(issue),
      });
    } else if (issue.code === "too_small") {
      out.push({
        code: "empty-value",
        index,
        ...base,
        found: show(found),
        expected: "a non-empty text",
      });
    } else {
      out.push({
        code: "invalid",
        index,
        ...base,
        found: show(found),
        expected: issue.message,
      });
    }
  }
  return out;
}

/** Kinds agents guess, and the kind each most likely means, for boxes and for lines. */
const NODE_GUESS: Record<string, string> = {
  start: "initial (state machine), terminal (flowchart)",
  end: "final (state machine), terminal (flowchart)",
  process: "service",
  step: "service",
  task: "service",
  app: "service",
  database: "store",
  db: "store",
  cache: "store",
  topic: "queue",
  stream: "queue",
  user: "actor",
  person: "actor",
  question: "decision",
  condition: "decision",
};
const EDGE_GUESS: Record<string, string> = {
  request: "call",
  sync: "call",
  message: "async",
  event: "async",
  flow: "data",
  sometimes: "optional",
  relation: "link",
  // How the lines of a kind look, given as the kind.
  solid: "call",
  dashed: "async",
  dotted: "optional",
  plain: "link",
};

function guessedKind(
  raw: unknown,
  path: readonly PropertyKey[],
  found: unknown,
  values: string[],
): string {
  const op = getPath(raw, ["op"]);
  const lines = (typeof op === "string" && op.startsWith("edge.")) || path.includes("edges");
  const guess =
    typeof found === "string" ? (lines ? EDGE_GUESS : NODE_GUESS)[found.toLowerCase()] : undefined;
  return guess === undefined ? allowed(values) : `${found} -> ${guess}; ${allowed(values)}`;
}

/** Operation fields renamed for clarity, by `<op>.<old field>`, with their new name. */
const RENAMED: Record<string, string> = { "diagram.legend.line": "style" };

/**
 * A legend's style given as an edge kind, or with its wording: the legend names how lines
 * look, so say which look the kind is drawn in, or where the wording goes.
 */
function legendStyle(found: unknown, values: string[]): string {
  if (found === undefined) return allowed(values);
  if (typeof found === "string" && (EDGE_KINDS as readonly string[]).includes(found)) {
    const style = lineStyle(found as EdgeKind);
    return `${found} -> ${style}`;
  }
  return `${allowed(values)}; the wording goes in text`;
}

// The set of known keys of the object at `path`, found by its shape.
function knownKeys(raw: unknown, path: readonly PropertyKey[]): string[] {
  const last = path[path.length - 1];
  const parent = path[path.length - 2];
  const op = (raw as { op?: unknown } | null)?.op;
  if (path.length === 0 && typeof op === "string") return OP_KEYS[op] ?? [];
  if (path.length === 0)
    return ["grafical", "title", "subtitle", "note", "density", "layers", "groups", "edges"];
  if (parent === "nodes")
    return ["id", "label", "kind", "sublabel", "size", "accent", "align", "group"];
  if (last === undefined || typeof last === "number") {
    if (parent === "groups") return ["id", "label", "sublabel", "in"];
    if (parent === "layers") return ["id", "label", "nodes"];
    if (parent === "edges") return ["id", "from", "to", "kind", "label"];
  }
  return typeof op === "string" ? (OP_KEYS[op] ?? []) : [];
}

// Filled in by ops.ts, so that an unknown field in an operation lists the right fields.
export const OP_KEYS: Record<string, string[]> = {};
