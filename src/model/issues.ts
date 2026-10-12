// Turns zod issues into OpErrors (DESIGN.md D5).

import type { z } from "zod";
import type { OpError } from "../errors.ts";
import { allowed, closest } from "./suggest.ts";

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
        out.push({
          code: "unknown-field",
          index,
          field: f,
          found: key,
          expected: known.length ? `one of: ${known.join(", ")}` : "no extra fields",
          ...(near.length ? { suggestion: `did you mean: ${near.join(", ")}` } : {}),
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
        suggestion: allowed(values),
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

// The set of known keys of the object at `path`, found by its shape.
function knownKeys(raw: unknown, path: readonly PropertyKey[]): string[] {
  const last = path[path.length - 1];
  const parent = path[path.length - 2];
  if (path.length === 0)
    return ["grafical", "title", "subtitle", "note", "density", "layers", "groups", "edges"];
  if (parent === "nodes")
    return ["id", "label", "kind", "sublabel", "size", "accent", "align", "group"];
  if (last === undefined || typeof last === "number") {
    if (parent === "groups") return ["id", "label", "sublabel", "in"];
    if (parent === "layers") return ["id", "label", "nodes"];
    if (parent === "edges") return ["id", "from", "to", "kind", "label"];
  }
  const op = (raw as { op?: unknown } | null)?.op;
  return typeof op === "string" ? (OP_KEYS[op] ?? []) : [];
}

// Filled in by ops.ts, so that an unknown field in an operation lists the right fields.
export const OP_KEYS: Record<string, string[]> = {};
