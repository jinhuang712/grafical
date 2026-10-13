// Turns zod issues into OpErrors (DESIGN.md D5).

import type { z } from "zod";
import type { Facts, OpError } from "../errors.ts";
import { lineStyle } from "../theme/paint.ts";
import { closest } from "./suggest.ts";
import { EDGE_KINDS, type EdgeKind } from "./types.ts";

export const ID_NODE = "ID_NODE";
export const ID_EDGE = "ID_EDGE";

/** The characters an id may hold; an edge's id may also hold -> and #<n>. */
const ID_CHARS = ["a-z", "0-9", ".", "_", "-"];
const EDGE_ID_CHARS = [...ID_CHARS, "->", "#<n>"];

/** The id an agent most likely meant: lowercase, with other characters as hyphens. */
function likelyId(v: unknown, edge: boolean): string[] {
  if (typeof v !== "string") return [];
  const parts = edge ? v.split("->") : [v];
  const id = parts
    .map((p) =>
      p
        .toLowerCase()
        .replace(/[^a-z0-9._#-]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .join("->");
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
          code: cut && renamed === undefined ? "unquoted-text" : "unknown-field",
          index,
          field: f,
          found: key,
          facts: {
            allowed: known,
            ...(renamed !== undefined ? { likely: [renamed] } : cut ? {} : { likely: near }),
          },
        });
      }
    } else if (issue.code === "invalid_value") {
      const values = ((issue as { values?: unknown[] }).values ?? []).map(String);
      out.push({
        code: "bad-value",
        index,
        ...base,
        found: show(found),
        facts:
          field === "style" && leaf
            ? legendStyle(found, values)
            : field === "kind" || field?.endsWith(".kind")
              ? guessedKind(raw, path, found, values)
              : { allowed: values },
      });
    } else if (issue.message === ID_NODE || issue.message === ID_EDGE) {
      const edge = issue.message === ID_EDGE;
      out.push({
        code: "bad-id",
        index,
        ...base,
        found: show(found),
        facts: { allowed: edge ? EDGE_ID_CHARS : ID_CHARS, likely: likelyId(found, edge) },
      });
    } else if (issue.code === "invalid_union" || issue.message === "mark-too-long") {
      // A mark is a text or a file: a string that is refused is too long (D40).
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

/** Kinds agents guess, and the kind each most likely means, for boxes and for lines. */
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
): Facts {
  const op = getPath(raw, ["op"]);
  const lines = (typeof op === "string" && op.startsWith("edge.")) || path.includes("edges");
  const key = typeof found === "string" ? found.toLowerCase() : undefined;
  const guess = key === undefined ? undefined : lines ? EDGE_GUESS[key] : NODE_GUESS[key];
  if (guess === undefined) return { allowed: values };
  return { allowed: values, likely: typeof guess === "string" ? [guess] : guess };
}

/** Operation fields renamed for clarity, by `<op>.<old field>`, with their new name. */
const RENAMED: Record<string, string> = { "diagram.legend.line": "style" };

/**
 * A legend's style given as an edge kind, or with its wording: the legend names how lines
 * look, so say which look the kind is drawn in, or where the wording goes.
 */
function legendStyle(found: unknown, values: string[]): Facts {
  if (typeof found === "string" && (EDGE_KINDS as readonly string[]).includes(found)) {
    return { allowed: values, likely: [lineStyle(found as EdgeKind)] };
  }
  if (typeof found !== "string") return { allowed: values };
  return {
    allowed: values,
    fix: [`diagram legend <file> <style> --text ${JSON.stringify(found)}`],
  };
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
    return ["id", "label", "kind", "sublabel", "size", "accent", "align", "group", "icons"];
  if (last === undefined || typeof last === "number") {
    if (parent === "groups") return ["id", "label", "sublabel", "in"];
    if (parent === "layers") return ["id", "label", "nodes"];
    if (parent === "edges") return ["id", "from", "to", "kind", "label"];
  }
  return typeof op === "string" ? (OP_KEYS[op] ?? []) : [];
}

// Filled in by ops.ts, so that an unknown field in an operation lists the right fields.
export const OP_KEYS: Record<string, string[]> = {};
