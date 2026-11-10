// A stylesheet is a .grafical file of looks: one <stylesheet> block, then <type>, <style> and <weight>
// blocks that say every value of a theme (specs/decisions, "A stylesheet is a .grafical file, and the built-in ones form a library").
// The built-in themes are stylesheets too, and a stylesheet an agent writes starts from one of them.

import type { OpError } from "../errors.ts";
import { type Block, parseBlocks, value } from "../model/grafical-format.ts";
import { EDGE_KINDS, NODE_KINDS, type Style } from "../model/types.ts";
import { WEIGHT_LEVEL, WEIGHT_MAX, WEIGHT_MIN } from "./paint.ts";

/** What a value must be. */
type Kind = "color" | "size" | "width" | "dash" | "text-size" | "text-weight" | "nesting" | "space";

/** The most a margin or a gap may be, in pixels. */
export const SPACE_MAX = 400;

/**
 * The spacing attributes as the file writes them, with the field each sets (specs/decisions, "Styles set spacing as
 * CSS does, and a later style wins"). The diagram's type gives every one; a style may give any.
 */
export const SPACE_ATTRS = {
  "margin-top": "marginTop",
  "margin-right": "marginRight",
  "margin-bottom": "marginBottom",
  "margin-left": "marginLeft",
  "row-gap": "rowGap",
  "column-gap": "columnGap",
} as const;

/** What a style may say beside its spacing. */
export const STYLE_LOOKS = {
  fill: "fill",
  border: "border",
  "border-width": "borderWidth",
  color: "color",
} as const;

interface Attr {
  /** Where it lands in a theme: under `paint` or `type`. */
  path: string[];
  kind: Kind;
  /** A factor from the written value to the stored one: an arrowhead is written whole and stored by half. */
  scale?: number;
}

const a = (kind: Kind, ...path: string[]): Attr => ({ path, kind });

/** A text role's size and weight under two attribute names. */
function text(role: string, prefix = "text"): Record<string, Attr> {
  return {
    [`${prefix}-size`]: a("text-size", "type", role, "size"),
    [`${prefix}-weight`]: a("text-weight", "type", role, "weight"),
  };
}

function box(key: string): Record<string, Attr> {
  return {
    fill: a("color", "paint", key, "fill"),
    border: a("color", "paint", key, "stroke"),
    "border-width": a("size", "paint", key, "strokeWidth"),
    radius: a("size", "paint", key, "radius"),
  };
}

/** Text that stands alone: the title, the subtitle, notes and the legend. */
const WORDS = { title: "title", subtitle: "subtitle", note: "note", legend: "legend" } as const;

/** Dashed edges keep their dash, and a solid edge never takes one (DESIGNS.md, "Looks are free, while shape and dash follow the type"). */
const DASHED_EDGES = new Set(["async", "optional"]);

/** The attributes a block may hold, by its sort and ID. Undefined: no such block. */
export function attrsOf(sort: string, id: string | undefined): Record<string, Attr> | undefined {
  if (id === undefined) return undefined;
  if (sort === "type") {
    if (id === "diagram") {
      return {
        fill: a("color", "paint", "background"),
        muted: a("color", "paint", "text", "groupLabelMuted"),
        ...Object.fromEntries(
          Object.entries(SPACE_ATTRS).map(([name, key]) => [name, a("space", "space", key)]),
        ),
      };
    }
    if (id in WORDS) return { color: a("color", "paint", "text", id), ...text(id) };
    if (id === "group") {
      return {
        ...box("group"),
        color: a("color", "paint", "text", "groupLabel"),
        nesting: a("nesting", "paint", "nesting"),
        ...text("group-label"),
        ...text("group-sublabel", "sublabel"),
      };
    }
    if (id === "band") return { ...box("band"), ...text("layer-label") };
    if (id === "lane") {
      return {
        ...box("lane"),
        "head-fill": a("color", "paint", "lane", "headFill"),
        color: a("color", "paint", "text", "laneLabel"),
        ...text("lane-label"),
      };
    }
    if (id === "node") {
      return {
        radius: a("size", "paint", "node", "radius"),
        "border-width": a("size", "paint", "node", "strokeWidth"),
        color: a("color", "paint", "text", "nodeLabel"),
        "sublabel-color": a("color", "paint", "text", "nodeSublabel"),
        ...text("node-label"),
        ...text("node-sublabel", "sublabel"),
      };
    }
    if ((NODE_KINDS as readonly string[]).includes(id)) {
      return {
        fill: a("color", "paint", "node", "kinds", id, "fill"),
        border: a("color", "paint", "node", "kinds", id, "stroke"),
        dash: a("dash", "paint", "node", "kinds", id, "dash"),
        ...(id === "state" ? { radius: a("size", "paint", "node", "stateRadius") } : {}),
      };
    }
    if (id === "edge") {
      return {
        radius: a("size", "paint", "edge", "cornerRadius"),
        "label-color": a("color", "paint", "text", "edgeLabel"),
        "label-fill": a("color", "paint", "edge", "labelBackground", "fill"),
        "label-pad-x": a("size", "paint", "edge", "labelBackground", "padX"),
        "label-pad-y": a("size", "paint", "edge", "labelBackground", "padY"),
        "label-radius": a("size", "paint", "edge", "labelBackground", "radius"),
        ...text("edge-label"),
      };
    }
    if ((EDGE_KINDS as readonly string[]).includes(id)) {
      return {
        color: a("color", "paint", "edge", "kinds", id, "stroke"),
        ...(DASHED_EDGES.has(id) ? { dash: a("dash", "paint", "edge", "kinds", id, "dash") } : {}),
      };
    }
    return undefined;
  }
  if (sort === "style" && id === "emphasis") {
    return {
      fill: a("color", "paint", "node", "emphasis", "fill"),
      border: a("color", "paint", "node", "emphasis", "stroke"),
      "border-width": a("size", "paint", "node", "emphasis", "strokeWidth"),
    };
  }
  if (sort === "weight") {
    if (id === "thin" || id === "thick") {
      const at = id === "thin" ? ["paint", "edge"] : ["paint", "edge", "main"];
      return {
        width: { path: [...at, "strokeWidth"], kind: "width" },
        "arrow-length": { path: [...at, "arrow", "length"], kind: "size" },
        "arrow-width": { path: [...at, "arrow", "halfWidth"], kind: "size", scale: 0.5 },
      };
    }
    if (WEIGHT_LEVEL.test(id)) return { width: a("width", "paint", "edge", "weights", id) };
  }
  return undefined;
}

const COLOR = /^#[0-9a-fA-F]{6}$/;
const DASH = /^\d+(\.\d+)?( \d+(\.\d+)?)*$/;

/** The value as stored, or undefined when it is not one of its kind. */
function check(kind: Kind, raw: unknown): unknown {
  switch (kind) {
    case "color":
      return typeof raw === "string" && COLOR.test(raw) ? raw : undefined;
    case "dash":
      return typeof raw === "string" && DASH.test(raw) ? raw : undefined;
    case "size":
      return typeof raw === "number" && raw >= 0 && raw <= 64 ? raw : undefined;
    case "width":
      return typeof raw === "number" && raw >= WEIGHT_MIN && raw <= WEIGHT_MAX ? raw : undefined;
    case "text-size":
      return typeof raw === "number" && raw >= 6 && raw <= 48 ? raw : undefined;
    case "text-weight":
      return raw === 400 || raw === 600 ? raw : undefined;
    case "nesting":
      return raw === "alternate" || raw === "shade" ? raw : undefined;
    case "space":
      return typeof raw === "number" && raw >= 0 && raw <= SPACE_MAX && raw % 4 === 0
        ? raw
        : undefined;
  }
}

/** A style's value as stored, or undefined when it is not one (specs/decisions, "Styles set spacing as CSS does, and a later style wins"). */
export function styleValue(name: string, raw: unknown): unknown {
  if (name in SPACE_ATTRS) return check("space", raw);
  if (name === "border-width") return check("width", raw);
  if (name in STYLE_LOOKS) return check("color", raw);
  return undefined;
}

/** What a stylesheet says: its header, every value it sets by path, and the styles it names in their order. */
export interface Sheet {
  base: string | undefined;
  about: string | undefined;
  values: { path: string[]; value: unknown }[];
  styles: Style[];
}

function fail(field: string, found: string, line: number): OpError {
  return { code: "bad-stylesheet", index: 0, field, found, facts: { line } };
}

/** A stylesheet's text as what it says, or an error for each block or value at fault. */
export function readSheet(text: string): Sheet | OpError[] {
  const blocks = parseBlocks(text);
  if (!Array.isArray(blocks)) return [{ ...blocks, code: "bad-stylesheet" }];
  const head = blocks[0];
  if (head === undefined || head.sort !== "stylesheet" || head.id !== undefined) {
    return [fail("stylesheet", head === undefined ? "-" : `<${head.sort}>`, head?.line ?? 1)];
  }
  const errors: OpError[] = [];
  const sheet: Sheet = { base: undefined, about: undefined, values: [], styles: [] };
  for (const [name, raw] of head.attrs) {
    const v = typeof raw === "string" ? value(raw) : raw;
    const line = head.at.get(name) ?? head.line;
    if (name === "format" && v === 1) continue;
    if (name === "base" && typeof v === "string") sheet.base = v;
    else if (name === "about" && typeof v === "string") sheet.about = v;
    else errors.push(fail(`stylesheet.${name}`, String(raw), line));
  }
  if (!head.attrs.has("format")) errors.push(fail("stylesheet.format", "-", head.line));
  const seen = new Set<string>();
  for (const b of blocks.slice(1)) errors.push(...readBlock(b, seen, sheet));
  return errors.length > 0 ? errors : sheet;
}

/** A named style of a stylesheet, which a diagram may mark as one of its own. */
function readStyle(b: Block, sheet: Sheet): OpError[] {
  const name = `style ${b.id}`;
  const style: Record<string, unknown> = { id: b.id };
  const errors: OpError[] = [];
  for (const [key, raw] of b.attrs) {
    const field =
      (SPACE_ATTRS as Record<string, string>)[key] ?? (STYLE_LOOKS as Record<string, string>)[key];
    const v = typeof raw === "string" ? styleValue(key, value(raw)) : undefined;
    if (field === undefined || v === undefined) {
      errors.push(fail(`${name}.${key}`, String(raw), b.at.get(key) ?? b.line));
      continue;
    }
    style[field] = v;
  }
  sheet.styles.push(style as unknown as Style);
  return errors;
}

function readBlock(b: Block, seen: Set<string>, sheet: Sheet): OpError[] {
  const name = `${b.sort} ${b.id ?? ""}`.trim();
  if (b.sort === "style" && b.id !== undefined && b.id !== "emphasis" && !seen.has(name)) {
    seen.add(name);
    return readStyle(b, sheet);
  }
  const attrs = attrsOf(b.sort, b.id);
  if (attrs === undefined || seen.has(name))
    return [fail(name, `<${b.sort}> ${b.id ?? ""}`.trim(), b.line)];
  seen.add(name);
  const errors: OpError[] = [];
  for (const [key, raw] of b.attrs) {
    const line = b.at.get(key) ?? b.line;
    const attr = attrs[key];
    const v =
      attr === undefined || typeof raw !== "string" ? undefined : check(attr.kind, value(raw));
    if (attr === undefined || v === undefined) {
      errors.push(fail(`${name}.${key}`, String(raw), line));
      continue;
    }
    sheet.values.push({
      path: attr.path,
      value: attr.scale === undefined ? v : (v as number) * attr.scale,
    });
  }
  return errors;
}

/** Every path a full stylesheet sets: the built-in default says each one. */
export function everyPath(): string[][] {
  const ids: [string, string][] = [
    ...["diagram", ...Object.keys(WORDS), "group", "band", "lane", "node", "edge"].map(
      (id) => ["type", id] as [string, string],
    ),
    ...NODE_KINDS.map((id) => ["type", id] as [string, string]),
    ...EDGE_KINDS.map((id) => ["type", id] as [string, string]),
    ["style", "emphasis"],
    ["weight", "thin"],
    ["weight", "thick"],
  ];
  return ids.flatMap(([sort, id]) =>
    Object.values(attrsOf(sort, id) ?? {})
      .filter((x) => x.kind !== "dash")
      .map((x) => x.path),
  );
}

function put(o: Record<string, unknown>, path: string[], v: unknown): void {
  let at = o;
  for (const k of path.slice(0, -1)) {
    if (typeof at[k] !== "object" || at[k] === null) at[k] = {};
    at = at[k] as Record<string, unknown>;
  }
  at[path[path.length - 1] as string] = v;
}

function got(o: unknown, path: string[]): unknown {
  return path.reduce<unknown>((x, k) => (x as Record<string, unknown> | undefined)?.[k], o);
}

/** What a theme is made of. */
export interface ThemeParts {
  paint: unknown;
  type: unknown;
  space: unknown;
  styles: Style[];
}

/**
 * A theme's paint, type ramp, spacing and styles from what a stylesheet says, over its base's. With no base it must
 * say every value, as the built-in default does. A style of the sheet takes the place of its base's of the same name.
 */
export function themeFrom(sheet: Sheet, base: ThemeParts | undefined): ThemeParts {
  const out: Record<string, unknown> =
    base === undefined
      ? {}
      : {
          paint: structuredClone(base.paint),
          type: structuredClone(base.type),
          space: structuredClone(base.space),
        };
  for (const v of sheet.values) put(out, v.path, v.value);
  if (base === undefined) {
    const missing = everyPath().find((p) => got(out, p) === undefined);
    if (missing !== undefined) throw new Error(`the stylesheet leaves ${missing.join(".")} unsaid`);
  }
  const styles = [...(base?.styles ?? [])];
  for (const st of sheet.styles) {
    const at = styles.findIndex((x) => x.id === st.id);
    if (at >= 0) styles[at] = st;
    else styles.push(st);
  }
  return { paint: out.paint, type: out.type, space: out.space, styles };
}
