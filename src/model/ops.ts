// Operations as data, one for each command (DESIGNS.md, "Operations are the only way a diagram changes",
// specs/decisions, "Operations over whole-file rewrites", "One command is one write, and running it twice changes
// nothing"). Each noun has `set`, which makes an object or changes the attributes it names, and `remove`, and some
// have `move` and a verb of their own. A field is a flag in camelCase and holds the flag's words as typed: `-` resets
// an attribute, a switch is `on` or `off`, and a list is comma separated. Each operation's schema checks the words
// against the value they stand for, and apply.ts carries the operation out. No operation takes a coordinate.

import { z } from "zod";
import type { OpError } from "../errors.ts";
import { issuesToErrors, OP_KEYS, show } from "./issues.ts";
import {
  idSuffix,
  lookFields,
  nodeId,
  shapeField,
  space,
  stepNumber,
  steps,
  text,
  weightValue,
} from "./schema.ts";
import { closest } from "./suggest.ts";
import {
  EDGE_BENDS,
  EDGE_SIDES,
  EDGE_STRETCHES,
  LABEL_ALIGNS,
  LABEL_PLACES,
  LAYER_LOOKS,
  MARK_SHAPES,
  MARK_SIZES,
  SIZE_STEPS,
  SIZINGS,
} from "./types.ts";

/** The words that reset an attribute. */
export const RESET = "-";

/** What a flag's words must be. */
interface Words {
  /** The value the words stand for, checked as the file's field is. */
  check: z.ZodType;
  /** `-` resets the attribute. */
  reset: boolean;
  /** Words that read as a number are the number. */
  number: boolean;
  /** The words are a comma-separated list, each item checked. */
  list: boolean;
  /** The words mark styles: `a,b`, `+a`, `-a` or `-` (specs/decisions, "Styles set spacing as CSS does, and a later style wins"). */
  marks: boolean;
}

const words = (check: z.ZodType, how: Partial<Omit<Words, "check">> = {}): Words => ({
  check,
  reset: how.reset ?? false,
  number: how.number ?? false,
  list: how.list ?? false,
  marks: how.marks ?? false,
});

const ID = words(nodeId);
const TEXT = words(text);
const ON_OFF = words(z.enum(["on", "off"]));
const STYLE = words(nodeId, { marks: true });
const STEP = words(steps, { number: true });
const resettable = (check: z.ZodType, number = false) => words(check, { reset: true, number });
const LIKE_NODE = resettable(nodeId);

/** A place among an object's kind: first, last, or before or after one of them. */
const PLACE = { first: z.boolean(), last: z.boolean(), before: ID, after: ID };
const STEPS = { from: ID, down: STEP, up: STEP, left: STEP, right: STEP };

/** An operation's fields: a flag's words, the ids it names, or a switch without words. */
type Field = Words | z.ZodType;

const isWords = (f: Field): f is Words => "check" in f && "marks" in f;

interface Spec {
  fields: Record<string, Field>;
  /** The flags it cannot leave out. */
  required: readonly string[];
  /** How each of its ids is checked, for an operation on many objects. */
  ids?: Words;
}

/** An operation on the objects its ids name. */
const many = <const F extends Record<string, Field>, const R extends readonly (keyof F)[] = []>(
  ids: Words,
  fields: F,
  required?: R,
) => ({ ids, fields, required: (required ?? []) as R });

/** An operation on one object, or on the whole diagram. */
const one = <const F extends Record<string, Field>, const R extends readonly (keyof F)[] = []>(
  fields: F,
  required?: R,
) => ({ fields, required: (required ?? []) as R });

/** Each operation, by name, in the order the help lists the nouns. */
const SPECS = {
  "diagram.set": one({
    title: TEXT,
    subtitle: resettable(text),
    caption: resettable(text),
    stylesheet: resettable(text),
    style: STYLE,
    sizing: resettable(z.enum(SIZINGS)),
    lines: resettable(z.enum(["square", "round"])),
    titleAt: resettable(z.number().min(0).max(1), true),
    titleSide: resettable(z.enum(["top", "bottom"])),
  }),
  "layer.set": many(ID, {
    label: resettable(text),
    look: resettable(z.enum(LAYER_LOOKS)),
    lane: resettable(nodeId),
    style: STYLE,
    ...PLACE,
  }),
  "layer.move": many(ID, PLACE),
  "layer.split": one({ id: ID, into: ID, label: TEXT, from: ID }, ["id", "into"]),
  "layer.remove": many(ID, {}),
  "node.set": many(ID, {
    label: TEXT,
    sublabel: resettable(text),
    type: resettable(nodeId),
    size: resettable(z.enum(SIZE_STEPS)),
    emphasis: ON_OFF,
    align: resettable(nodeId),
    group: resettable(nodeId),
    lane: resettable(nodeId),
    column: resettable(nodeId),
    style: STYLE,
    like: LIKE_NODE,
    layer: ID,
    ...PLACE,
    ...STEPS,
  }),
  "node.move": many(ID, { layer: ID, ...PLACE, ...STEPS }),
  "node.merge": one(
    { id: ID, nodes: z.array(nodeId).min(2), label: TEXT, sublabel: TEXT, type: ID },
    ["id", "nodes", "label"],
  ),
  "node.remove": many(ID, {}),
  "edge.set": many(ID, {
    from: ID,
    to: ID,
    label: resettable(text),
    type: resettable(nodeId),
    weight: resettable(weightValue, true),
    both: ON_OFF,
    pass: ON_OFF,
    out: resettable(z.enum(EDGE_SIDES)),
    in: resettable(z.enum(EDGE_SIDES)),
    via: resettable(text),
    straight: ON_OFF,
    with: resettable(nodeId),
    bendAt: resettable(z.literal(EDGE_BENDS), true),
    stretch: resettable(z.literal(EDGE_STRETCHES), true),
    number: resettable(stepNumber, true),
    style: STYLE,
    like: resettable(nodeId),
  }),
  "edge.remove": many(ID, {}),
  "group.set": many(ID, {
    label: TEXT,
    sublabel: resettable(text),
    in: resettable(nodeId),
    style: STYLE,
    like: LIKE_NODE,
  }),
  "group.move": many(ID, { before: ID, after: ID }),
  "group.copy": one(
    {
      id: ID,
      into: ID,
      label: TEXT,
      suffix: words(idSuffix),
      before: ID,
      after: ID,
      outside: z.boolean(),
    },
    ["id", "into", "label", "suffix"],
  ),
  "group.remove": many(ID, { out: z.boolean() }),
  "lane.set": many(ID, { label: TEXT, style: STYLE, like: LIKE_NODE }),
  "lane.remove": many(ID, {}),
  "column.set": many(ID, { style: STYLE, ...PLACE }),
  "column.move": many(ID, PLACE),
  "column.remove": many(ID, {}),
  "wall.set": many(ID, {
    between: words(nodeId, { list: true }),
    and: words(nodeId, { list: true }),
    allow: words(z.string(), { list: true, reset: true }),
    label: resettable(text),
  }),
  "wall.remove": many(ID, {}),
  "note.set": many(ID, {
    text: TEXT,
    footnote: ON_OFF,
    align: resettable(z.enum(LABEL_ALIGNS)),
  }),
  "note.remove": many(ID, {}),
  "label.set": many(TEXT, {
    style: STYLE,
    align: resettable(z.enum(LABEL_ALIGNS)),
    at: resettable(z.number().min(0).max(1), true),
    side: resettable(z.enum(EDGE_SIDES)),
    place: resettable(z.enum(LABEL_PLACES)),
    seat: resettable(z.enum(["on", "beside"])),
  }),
  "mark.set": many(TEXT, {
    text: TEXT,
    file: TEXT,
    bg: resettable(text),
    fg: resettable(text),
    border: resettable(text),
    shape: resettable(z.enum(MARK_SHAPES)),
    size: resettable(z.enum(MARK_SIZES)),
    /** The file's hash, which the command line reads before the operation is applied. */
    sha256: words(z.string().regex(/^[0-9a-f]{64}$/)),
  }),
  "mark.remove": many(TEXT, {}),
  "legend.set": many(TEXT, { text: TEXT }, ["text"]),
  "legend.remove": many(TEXT, {}),
  "type.set": many(ID, {
    base: ID,
    shape: resettable(shapeField),
    fill: resettable(lookFields.fill),
    border: resettable(lookFields.border),
    borderWidth: resettable(lookFields.borderWidth, true),
    color: resettable(lookFields.color),
  }),
  "type.remove": many(ID, {}),
  "style.set": many(ID, {
    fill: resettable(lookFields.fill),
    border: resettable(lookFields.border),
    borderWidth: resettable(lookFields.borderWidth, true),
    color: resettable(lookFields.color),
    marginTop: resettable(space, true),
    marginRight: resettable(space, true),
    marginBottom: resettable(space, true),
    marginLeft: resettable(space, true),
    rowGap: resettable(space, true),
    columnGap: resettable(space, true),
  }),
  "style.move": many(ID, { before: ID, after: ID }),
  "style.remove": many(ID, {}),
};

export type OpName = keyof typeof SPECS;
export const OP_NAMES = Object.keys(SPECS) as OpName[];

/** What an operation's field holds: words, ids, or a switch without words. */
type Value<F> = F extends Words ? string : F extends z.ZodType ? z.output<F> : never;

type SpecOf<N extends OpName> = (typeof SPECS)[N];
type Needed<N extends OpName> = SpecOf<N>["required"][number];

/** One operation: its name, the ids it names, and its flags. */
export type OpOf<N extends OpName> = { op: N } & (SpecOf<N> extends { ids: Words }
  ? { ids: string[] }
  : unknown) & {
    -readonly [K in keyof SpecOf<N>["fields"] as K extends Needed<N> ? K : never]: Value<
      SpecOf<N>["fields"][K]
    >;
  } & {
    -readonly [K in keyof SpecOf<N>["fields"] as K extends Needed<N> ? never : K]?: Value<
      SpecOf<N>["fields"][K]
    >;
  };

export type Op = { [N in OpName]: OpOf<N> }[OpName];

/** The schema of an operation's shape: which fields it takes, and of what type. */
function shape(name: string, s: Spec): z.ZodType {
  const fields: Record<string, z.ZodType> = { op: z.literal(name) };
  if (s.ids !== undefined) fields.ids = z.array(z.string()).min(1);
  for (const [k, f] of Object.entries(s.fields)) {
    const t = isWords(f) ? z.string() : f;
    fields[k] = s.required.includes(k) ? t : t.optional();
  }
  return z.strictObject(fields);
}

const SHAPES = Object.fromEntries(
  Object.entries(SPECS).map(([name, s]) => [name, shape(name, s as Spec)]),
) as Record<OpName, z.ZodType>;

for (const [name, schema] of Object.entries(SHAPES)) {
  OP_KEYS[name] = Object.keys((schema as z.ZodObject).shape);
}

/** A field as its flag: bendAt is bend-at. */
export const flagOf = (field: string) => field.replace(/[A-Z]/g, (x) => `-${x.toLowerCase()}`);

/** Words that read as a number, as the number; other words as they are, for the check to refuse. */
export const numberOf = (v: string): number | string =>
  /^-?[0-9]+(\.[0-9]+)?$/.test(v) ? Number(v) : v;

/** A comma-separated list, with no empty item. */
export const listOf = (v: string): string[] =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x !== "");

/** The errors of one value of a field, named by the field. */
function checkOne(w: Words, field: string, v: string, index: number): OpError[] {
  const r = w.check.safeParse(w.number ? numberOf(v) : v);
  if (r.success) return [];
  const issues = r.error.issues.map((x) => ({ ...x, path: [field] }));
  return issuesToErrors(issues, { [field]: v }, index, true);
}

/** The errors of a field's words. */
function checkWords(w: Words, field: string, v: string, index: number): OpError[] {
  if (w.reset && v === RESET) return [];
  if (w.marks) {
    if (v === RESET) return [];
    const items = listOf(v);
    const signed = items.filter((x) => x.startsWith("+") || x.startsWith("-"));
    if (items.length === 0 || (signed.length > 0 && signed.length < items.length)) {
      return [
        { code: "bad-value", index, field, found: v, facts: { allowed: ["a,b", "+a", "-a", "-"] } },
      ];
    }
    return items.flatMap((x) => checkOne(w, field, signed.length > 0 ? x.slice(1) : x, index));
  }
  if (w.list) {
    const items = listOf(v);
    if (items.length === 0)
      return [{ code: "empty-value", index, field, found: v, facts: { min: 1 } }];
    return items.flatMap((x) => checkOne(w, field, x, index));
  }
  return checkOne(w, field, v, index);
}

/** A shell's "a\\nb" stays two characters, and a text holds no backslash-n by intent. */
const TEXTS = ["label", "sublabel", "text", "title", "subtitle", "caption"];

/** Parses one operation, reporting errors with the operation's index and its fields named as flags. */
export function parseOp(raw: unknown, index: number): Op | OpError[] {
  const name = (raw as { op?: unknown } | null)?.op;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw) || typeof name !== "string") {
    return [{ code: "bad-op", index, field: "op", found: show(raw), facts: { allowed: OP_NAMES } }];
  }
  if (!(name in SPECS)) {
    return [
      {
        code: "unknown-op",
        index,
        field: "op",
        found: name,
        facts: { likely: closest(name, OP_NAMES, 2) },
      },
    ];
  }
  const s = SPECS[name as OpName] as Spec;
  const parsed = SHAPES[name as OpName].safeParse(raw);
  const named = (errors: OpError[]) =>
    errors.map((e) => (e.field === undefined ? e : { ...e, field: flagOf(e.field) }));
  if (!parsed.success) return named(issuesToErrors(parsed.error.issues, raw, index, true));
  const op = Object.fromEntries(
    Object.entries(parsed.data as Record<string, unknown>).filter(([, v]) => v !== undefined),
  );
  const errors: OpError[] = [];
  if (s.ids !== undefined) {
    for (const id of op.ids as string[]) errors.push(...checkWords(s.ids, "id", id, index));
  }
  for (const [k, f] of Object.entries(s.fields)) {
    const v = op[k];
    if (typeof v === "string" && isWords(f)) errors.push(...checkWords(f, k, v, index));
  }
  if (errors.length > 0) return named(errors);
  for (const k of TEXTS) {
    const v = op[k];
    if (typeof v === "string") op[k] = v.replaceAll("\\n", "\n");
  }
  return op as Op;
}
