// The .grafical file (specs/grafical-file.md): objects as blocks with one attribute on each line. It holds the same
// facts as the model, so reading builds the plain object that validateDiagram checks, and nothing is half read.

import type { OpError } from "../errors.ts";
import { STEP_KEYS } from "./steps.ts";
import {
  type Diagram,
  LINE_STYLES,
  MARK_SLOTS,
  type Mark,
  SHAPE_KINDS,
  type Shape,
} from "./types.ts";

const quote = (s: string) => JSON.stringify(s);
const ref = (id: string) => `@${id}`;

type Attr = [string, string | string[] | undefined];

/** A block: its sort, its ID and its attributes, in the order given. A list takes one item on each line. */
function block(sort: string, id: string | undefined, attrs: Attr[]): string {
  const out = [`<${sort}>${id === undefined ? "" : ` ${id}`} {`];
  for (const [key, value] of attrs) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      out.push(`  ${key}:`, ...value.map((v) => `    ${v}`));
    } else out.push(`  ${key}: ${value}`);
  }
  out.push("}");
  return out.join("\n");
}

const opt = (v: string | undefined, f: (s: string) => string = ref) =>
  v === undefined ? undefined : f(v);
const flag = (v: boolean | undefined) => (v === true ? "true" : undefined);
const num = (v: number | undefined) => (v === undefined ? undefined : String(v));
const marks = (v: string[] | undefined) => (v === undefined ? undefined : v.map(ref).join(" "));

function markAttrs(m: Mark): Attr[] {
  if (typeof m === "string") return [["text", quote(m)]];
  if ("file" in m) {
    return [
      ["file", quote(m.file)],
      ["hash", quote(m.sha256)],
      ["size", m.size],
    ];
  }
  const o = m as unknown as Record<string, string | undefined>;
  return ["bg", "border", "fg", "shape", "size", "text"].map((k) => [
    k,
    o[k] === undefined ? undefined : quote(o[k] as string),
  ]);
}

/** The diagram as a .grafical file. Blocks run in the file's fixed order, one set of facts giving one set of bytes. */
export function writeGrafical(d: Diagram): string {
  const blocks: string[] = [];
  blocks.push(
    block("diagram", undefined, [
      ["format", String(d.grafical)],
      ["title", quote(d.title)],
      ["subtitle", opt(d.subtitle, quote)],
      ["caption", opt(d.note, quote)],
      ["style", opt(d.style, quote)],
      ["density", d.density],
      ["lines", d.lines],
      ["sizing", d.sizing === "fixed" ? "fixed" : undefined],
    ]),
  );
  for (const s of d.types ?? []) {
    blocks.push(
      block("type", s.id, [
        ["base", ref(s.base)],
        ["shape", s.shape],
        ["fill", s.fill],
        ["border", s.border],
        ["border-width", num(s.borderWidth)],
        ["color", s.color],
      ]),
    );
  }
  for (const s of d.styles ?? []) {
    blocks.push(
      block("style", s.id, [
        ["fill", s.fill],
        ["border", s.border],
        ["border-width", num(s.borderWidth)],
        ["color", s.color],
      ]),
    );
  }
  for (const l of d.layers) {
    blocks.push(
      block("layer", l.id, [
        ["lane", opt(l.lane)],
        ["look", l.look],
      ]),
    );
  }
  for (const g of d.groups ?? [])
    blocks.push(
      block("group", g.id, [
        ["in", opt(g.in)],
        ["style", marks(g.style)],
      ]),
    );
  for (const l of d.lanes ?? []) blocks.push(block("lane", l.id, [["style", marks(l.style)]]));
  for (const c of d.columns ?? []) blocks.push(block("column", c.id, []));
  for (const w of d.walls ?? []) {
    blocks.push(
      block("wall", w.id, [
        ["between", w.between.map(ref)],
        ["and", w.and.map(ref)],
        ["allow", w.allow !== undefined && w.allow.length > 0 ? w.allow.map(quote) : undefined],
      ]),
    );
  }
  if (d.layers.length > 0) {
    blocks.push(
      block("order", "layers", [
        ["of", "@diagram"],
        ["axis", "down"],
        ["items", d.layers.map((l) => ref(l.id))],
      ]),
    );
  }
  for (const l of d.layers) {
    if (l.nodes.length === 0) continue;
    blocks.push(
      block("order", `${l.id}-order`, [
        ["of", ref(l.id)],
        ["axis", "across"],
        ["items", l.nodes.map((n) => ref(n.id))],
      ]),
    );
  }
  const nodes = [
    ...d.layers.flatMap((l) => l.nodes.map((n) => ({ n, layer: l.id as string | undefined }))),
    ...(d.nodes ?? []).map((n) => ({ n, layer: undefined })),
  ];
  for (const { n, layer } of nodes) {
    blocks.push(
      block("node", n.id, [
        ["type", ref(n.type ?? n.kind)],
        ["text", quote(n.label)],
        ["sublabel", opt(n.sublabel, quote)],
        ["text-align", n.labelAlign],
        ["layer", opt(layer)],
        ["group", opt(n.group)],
        ["lane", opt(n.lane)],
        ["column", opt(n.column)],
        ["align", opt(n.align)],
        ["from", opt(n.from)],
        ...STEP_KEYS.map((k): Attr => [k, num(n[k])]),
        ["size", n.size],
        ["emphasis", flag(n.accent)],
        ["style", marks(n.style)],
      ]),
    );
  }
  for (const e of d.edges) {
    blocks.push(
      block("edge", e.id, [
        ["from", ref(e.from)],
        ["to", ref(e.to)],
        ["type", ref(e.type ?? e.kind)],
        ["out", e.out],
        ["in", e.in],
        ["weight", e.weight === undefined ? undefined : String(e.weight)],
        ["both", flag(e.both)],
        ["pass", flag(e.pass)],
        ["emphasis", flag(e.accent)],
        ["number", num(e.step)],
        ["style", marks(e.style)],
      ]),
    );
  }
  const label = (
    id: string,
    on: string,
    text: string,
    sub?: string,
    place?: string,
    seat?: string,
    align?: string,
  ) =>
    block("label", `${id}-label`, [
      ["on", ref(on)],
      ["text", quote(text)],
      ["sublabel", opt(sub, quote)],
      ["place", place],
      ["seat", seat],
      ["align", align],
    ]);
  for (const l of d.layers) if (l.label !== undefined) blocks.push(label(l.id, l.id, l.label));
  for (const g of d.groups ?? []) {
    blocks.push(label(g.id, g.id, g.label, g.sublabel, g.titleAt));
  }
  for (const l of d.lanes ?? []) {
    blocks.push(label(l.id, l.id, l.label, undefined, undefined, undefined, l.labelAlign));
  }
  for (const w of d.walls ?? []) {
    if (w.label === undefined) continue;
    blocks.push(label(w.id, w.id, w.label, undefined, undefined, undefined, w.labelAlign));
  }
  for (const e of d.edges) {
    if (e.label !== undefined) {
      blocks.push(label(e.id, e.id, e.label, undefined, undefined, e.seat, e.labelAlign));
    }
  }
  for (const { n } of nodes) {
    for (const slot of MARK_SLOTS) {
      const m = n.icons?.[slot];
      if (m === undefined) continue;
      blocks.push(
        block("mark", `${n.id}-${slot}`, [["on", ref(n.id)], ["slot", slot], ...markAttrs(m)]),
      );
    }
  }
  (d.notes ?? []).forEach((n, i) => {
    blocks.push(
      block("note", `note-${i + 1}`, [
        ["on", ref(n.on)],
        ["text", quote(n.text)],
        ["footnote", flag(n.footnote)],
      ]),
    );
  });
  if (d.legend !== undefined && Object.keys(d.legend).length > 0) {
    const sorted = (o: Record<string, string> | undefined) =>
      Object.entries(o ?? {})
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => `${quote(k)} ${quote(v)}`);
    const weights = sorted(d.legend.weights);
    const marks = sorted(d.legend.marks);
    blocks.push(
      block("legend", undefined, [
        ...LINE_STYLES.map((s): Attr => [s, opt(d.legend?.[s], quote)]),
        ["weights", weights.length > 0 ? weights : undefined],
        ["marks", marks.length > 0 ? marks : undefined],
      ]),
    );
  }
  return `${blocks.join("\n\n")}\n`;
}

interface Block {
  sort: string;
  id: string | undefined;
  line: number;
  attrs: Map<string, string | string[]>;
}

/** A line the form cannot read, as the refusal of a file. */
function bad(text: string, line: number): OpError {
  return {
    code: "bad-yaml",
    index: 0,
    found: (text.split("\n")[line - 1] ?? "").trim(),
    facts: { line },
  };
}

function parseBlocks(text: string): Block[] | OpError {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  let at: Block | undefined;
  let list: string[] | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (line.trim() === "") continue;
    if (at === undefined) {
      const m = /^<([a-z]+)>(?: (\S+))? \{$/.exec(line);
      if (m === null) return bad(text, i + 1);
      at = { sort: m[1] as string, id: m[2], line: i + 1, attrs: new Map() };
      list = undefined;
      continue;
    }
    if (line === "}") {
      blocks.push(at);
      at = undefined;
      continue;
    }
    if (line.startsWith("    ") && list !== undefined) {
      list.push(line.slice(4));
      continue;
    }
    const m = /^ {2}([a-zA-Z-]+):(?: (.*))?$/.exec(line);
    if (m === null) return bad(text, i + 1);
    if (m[2] === undefined) {
      list = [];
      at.attrs.set(m[1] as string, list);
    } else {
      list = undefined;
      at.attrs.set(m[1] as string, m[2]);
    }
  }
  if (at !== undefined) return bad(text, at.line);
  return blocks;
}

/** A value as the plain object holds it: a reference's ID, text, a number or a word. */
function value(v: string): unknown {
  if (v.startsWith("@")) return v.slice(1);
  if (v.startsWith('"')) return JSON.parse(v);
  if (v === "true") return true;
  if (/^-?[0-9]+(\.[0-9]+)?$/.test(v)) return Number(v);
  return v;
}

const list = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v.map((x) => value(x) as string) : undefined;

/** An object's styles, a later one over an earlier one. */
function styles(b: Block, o: Record<string, unknown>): void {
  const v = b.attrs.get("style");
  if (typeof v === "string") o.style = v.split(" ").map((x) => x.slice(1));
}

/** The kind that draws a type: its shape's, or its base's. */
function kindOf(types: Block[], id: string): string {
  const seen = new Set<string>();
  let at = id;
  for (;;) {
    const b = types.find((x) => x.id === at);
    if (b === undefined || seen.has(at)) return at;
    seen.add(at);
    const shape = b.attrs.get("shape");
    if (typeof shape === "string") return SHAPE_KINDS[shape as Shape] ?? at;
    at = value(b.attrs.get("base") as string) as string;
  }
}

/** An object's type: `kind` for the kind that draws it, and `type` when an agent defined it. */
function typed(b: Block, types: Block[], o: Record<string, unknown>): void {
  const v = b.attrs.get("type");
  if (typeof v !== "string") return;
  const id = value(v) as string;
  o.kind = kindOf(types, id);
  if (types.some((x) => x.id === id)) o.type = id;
}

function take(b: Block, map: Record<string, string>, o: Record<string, unknown>): void {
  for (const [key, field] of Object.entries(map)) {
    const v = b.attrs.get(key);
    if (typeof v === "string") o[field] = value(v);
  }
}

/** The file's objects as the plain object of a diagram, for validateDiagram to check. */
export function parseGrafical(text: string): Record<string, unknown> | OpError[] {
  const blocks = parseBlocks(text);
  if (!Array.isArray(blocks)) return [blocks];
  const of = (sort: string) => blocks.filter((b) => b.sort === sort);
  const known = [
    "diagram",
    "type",
    "style",
    "layer",
    "group",
    "lane",
    "column",
    "wall",
    "order",
    "node",
    "edge",
    "label",
    "mark",
    "note",
    "legend",
  ];
  const stray = blocks.find((b) => !known.includes(b.sort));
  if (stray !== undefined) return [bad(text, stray.line)];
  const types = of("type");
  const root = of("diagram")[0];
  if (root === undefined) return [bad(text, 1)];
  const out: Record<string, unknown> = {};
  take(
    root,
    {
      format: "grafical",
      title: "title",
      subtitle: "subtitle",
      caption: "note",
      style: "style",
      density: "density",
      lines: "lines",
      sizing: "sizing",
    },
    out,
  );

  const labels = new Map(of("label").map((b) => [value(b.attrs.get("on") as string) as string, b]));
  const named = (id: string, o: Record<string, unknown>, place?: string) => {
    const b = labels.get(id);
    if (b === undefined) return;
    take(
      b,
      {
        text: "label",
        sublabel: "sublabel",
        align: "labelAlign",
        ...(place === undefined ? {} : { place }),
      },
      o,
    );
  };
  const marks = new Map<string, Record<string, unknown>>();
  for (const b of of("mark")) {
    const on = value(b.attrs.get("on") as string) as string;
    const slot = b.attrs.get("slot") as string;
    const o: Record<string, unknown> = {};
    take(
      b,
      {
        file: "file",
        hash: "sha256",
        bg: "bg",
        border: "border",
        fg: "fg",
        shape: "shape",
        size: "size",
        text: "text",
      },
      o,
    );
    const keys = Object.keys(o);
    const icons = marks.get(on) ?? {};
    icons[slot] = keys.length === 1 && keys[0] === "text" ? o.text : o;
    marks.set(on, icons);
  }
  const node = (b: Block) => {
    const o: Record<string, unknown> = { id: b.id };
    take(
      b,
      {
        text: "label",
        sublabel: "sublabel",
        "text-align": "labelAlign",
        group: "group",
        lane: "lane",
        column: "column",
        align: "align",
        from: "from",
        size: "size",
        emphasis: "accent",
        ...Object.fromEntries(STEP_KEYS.map((k) => [k, k])),
      },
      o,
    );
    typed(b, types, o);
    styles(b, o);
    const icons = marks.get(b.id as string);
    if (icons !== undefined) o.icons = icons;
    return o;
  };
  const nodes = of("node");
  const byId = new Map(nodes.map((b) => [b.id as string, b]));
  const orders = new Map(
    of("order").map((b) => [
      value(b.attrs.get("of") as string) as string,
      list(b.attrs.get("items")) ?? [],
    ]),
  );
  const layerBlocks = new Map(of("layer").map((b) => [b.id as string, b]));
  const ids = orders.get("diagram") ?? [];
  out.layers = ids.map((id) => {
    const b = layerBlocks.get(id);
    const o: Record<string, unknown> = { id };
    if (b !== undefined) take(b, { lane: "lane", look: "look" }, o);
    named(id, o);
    o.nodes = (orders.get(id) ?? []).map((n) => {
      const nb = byId.get(n);
      return nb === undefined ? { id: n } : node(nb);
    });
    return o;
  });
  // An order names every member of its region and nothing else (specs/grafical-file.md, "Position as a relation").
  for (const b of nodes) {
    const layer = b.attrs.get("layer");
    if (typeof layer !== "string") continue;
    const items = orders.get(value(layer) as string) ?? [];
    if (!items.includes(b.id as string)) return [bad(text, b.line)];
  }
  for (const [id, items] of orders) {
    if (id === "diagram") continue;
    for (const item of items) {
      const b = byId.get(item);
      const layer = b?.attrs.get("layer");
      if (typeof layer !== "string" || value(layer) !== id) return [bad(text, 1)];
    }
  }
  const placed = nodes.filter((b) => !b.attrs.has("layer"));
  if (placed.length > 0) out.nodes = placed.map(node);
  out.groups = of("group").map((b) => {
    const o: Record<string, unknown> = { id: b.id };
    take(b, { in: "in" }, o);
    styles(b, o);
    named(b.id as string, o, "titleAt");
    return o;
  });
  out.lanes = of("lane").map((b) => {
    const o: Record<string, unknown> = { id: b.id };
    styles(b, o);
    named(b.id as string, o);
    return o;
  });
  out.columns = of("column").map((b) => ({ id: b.id }));
  out.walls = of("wall").map((b) => {
    const o: Record<string, unknown> = {
      id: b.id,
      between: list(b.attrs.get("between")),
      and: list(b.attrs.get("and")),
    };
    const allow = list(b.attrs.get("allow"));
    if (allow !== undefined) o.allow = allow;
    named(b.id as string, o);
    return o;
  });
  out.notes = of("note").map((b) => {
    const o: Record<string, unknown> = {};
    take(b, { on: "on", text: "text", footnote: "footnote" }, o);
    return o;
  });
  out.edges = of("edge").map((b) => {
    const o: Record<string, unknown> = { id: b.id };
    take(
      b,
      {
        from: "from",
        to: "to",
        weight: "weight",
        both: "both",
        pass: "pass",
        emphasis: "accent",
        number: "step",
        out: "out",
        in: "in",
      },
      o,
    );
    typed(b, types, o);
    styles(b, o);
    named(b.id as string, o);
    const seat = labels.get(b.id as string)?.attrs.get("seat");
    if (seat !== undefined) o.seat = seat;
    return o;
  });
  out.types = types.map((b) => {
    const o: Record<string, unknown> = { id: b.id };
    take(
      b,
      {
        base: "base",
        shape: "shape",
        fill: "fill",
        border: "border",
        "border-width": "borderWidth",
        color: "color",
      },
      o,
    );
    return o;
  });
  out.styles = of("style").map((b) => {
    const o: Record<string, unknown> = { id: b.id };
    take(b, { fill: "fill", border: "border", "border-width": "borderWidth", color: "color" }, o);
    return o;
  });
  const legend = of("legend")[0];
  if (legend !== undefined) {
    const o: Record<string, unknown> = {};
    take(legend, Object.fromEntries(LINE_STYLES.map((s) => [s, s])), o);
    for (const key of ["weights", "marks"]) {
      const lines = legend.attrs.get(key);
      if (!Array.isArray(lines)) continue;
      o[key] = Object.fromEntries(
        lines.map((l) => {
          const m = /^("(?:[^"\\]|\\.)*") (.*)$/.exec(l) as RegExpExecArray;
          return [JSON.parse(m[1] as string), JSON.parse(m[2] as string)];
        }),
      );
    }
    out.legend = o;
  }
  return out;
}
