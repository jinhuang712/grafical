// Themes and stylesheets (DESIGN.md D30). A theme is every value of the look:
// paint (colours, strokes, radii) and the type ramp. grafical ships a few built-in
// themes. A stylesheet file starts from one and overrides any of its values. A
// diagram names its theme or stylesheet; layout and rendering read the result.
//
// Layout stays pure: it never reads a file. The command line reads a diagram's
// stylesheet and hands it in with provideStylesheet() before laying out.

import { parse } from "yaml";
import { z } from "zod";
import type { OpError } from "../errors.ts";
import { yamlError } from "../model/io.ts";
import { getPath, show } from "../model/issues.ts";
import { closest } from "../model/suggest.ts";
import type { Diagram } from "../model/types.ts";
import type { TextRole } from "../scene.ts";
import type { TextStyle } from "../text/types.ts";
import { edgeWidth, PAINT, type Paint, WEIGHT_LEVEL, WEIGHT_MAX, WEIGHT_MIN } from "./paint.ts";
import { TYPE_RAMP } from "./type.ts";

export type TypeRamp = Record<TextRole, TextStyle>;

export interface Theme {
  /** A built-in theme's name, or the stylesheet path as the diagram names it. */
  name: string;
  paint: Paint;
  type: TypeRamp;
}

export const STYLESHEET_SUFFIX = ".grafical-style.yaml";
export const STYLESHEET_VERSION = 1;

const DARK: Paint = {
  background: "#0f1419",
  text: {
    title: "#e6e8eb",
    subtitle: "#9aa3ad",
    note: "#9aa3ad",
    legend: "#9aa3ad",
    groupLabel: "#c5cad1",
    groupLabelMuted: "#8b949e",
    laneLabel: "#c5cad1",
    nodeLabel: "#e6e8eb",
    nodeSublabel: "#9aa3ad",
    edgeLabel: "#c5cad1",
  },
  group: { fill: "#161b22", stroke: "#30363d", strokeWidth: 1, radius: 8 },
  nesting: "alternate",
  band: { fill: "#12171d", stroke: "#2a3038", strokeWidth: 1, radius: 8 },
  lane: { fill: "#0f1419", stroke: "#30363d", strokeWidth: 1, radius: 0, headFill: "#161b22" },
  node: {
    radius: 6,
    stateRadius: 14,
    strokeWidth: 1,
    kinds: {
      service: { fill: "#1c2128", stroke: "#444c56" },
      store: { fill: "#1a2029", stroke: "#444c56" },
      queue: { fill: "#2a2416", stroke: "#6b5a35" },
      external: { fill: "#1c2128", stroke: "#636e7b", dash: "4 3" },
      actor: { fill: "#1f242b", stroke: "#444c56" },
      state: { fill: "#1c2128", stroke: "#444c56" },
      terminal: { fill: "#262d36", stroke: "#636e7b" },
      decision: { fill: "#1c2128", stroke: "#444c56" },
      initial: { fill: "#adbac7", stroke: "#adbac7" },
      final: { fill: "#1c2128", stroke: "#adbac7" },
    },
    accent: { fill: "#132a4f", stroke: "#4c8dff", strokeWidth: 1.5 },
  },
  edge: {
    strokeWidth: 1.25,
    kinds: {
      call: { stroke: "#8b949e" },
      async: { stroke: "#8b949e", dash: "5 3" },
      data: { stroke: "#8b949e" },
      link: { stroke: "#8b949e" },
      optional: { stroke: "#8b949e", dash: "1.5 2.5" },
    },
    arrow: { length: 7, halfWidth: 3 },
    main: { strokeWidth: 2.5, arrow: { length: 9, halfWidth: 4 } },
    weights: { heavy: 4 },
    cornerRadius: 6,
    shape: "orthogonal",
    labelBackground: { fill: "#0f1419", padX: 3, padY: 1, radius: 2 },
  },
};

/** Grey on white, with stronger lines: for printing and for documents without colour. */
const PRINT: Paint = {
  background: "#ffffff",
  text: {
    title: "#111111",
    subtitle: "#444444",
    note: "#444444",
    legend: "#444444",
    groupLabel: "#222222",
    groupLabelMuted: "#555555",
    laneLabel: "#222222",
    nodeLabel: "#111111",
    nodeSublabel: "#444444",
    edgeLabel: "#333333",
  },
  group: { fill: "#f3f3f3", stroke: "#bdbdbd", strokeWidth: 1, radius: 6 },
  nesting: "alternate",
  band: { fill: "#fafafa", stroke: "#d0d0d0", strokeWidth: 1, radius: 6 },
  lane: { fill: "#ffffff", stroke: "#bdbdbd", strokeWidth: 1, radius: 0, headFill: "#eeeeee" },
  node: {
    radius: 4,
    stateRadius: 10,
    strokeWidth: 1.25,
    kinds: {
      service: { fill: "#ffffff", stroke: "#555555" },
      store: { fill: "#eeeeee", stroke: "#555555" },
      queue: { fill: "#f7f7f7", stroke: "#555555" },
      external: { fill: "#ffffff", stroke: "#777777", dash: "4 3" },
      actor: { fill: "#f7f7f7", stroke: "#555555" },
      state: { fill: "#ffffff", stroke: "#555555" },
      terminal: { fill: "#e6e6e6", stroke: "#333333" },
      decision: { fill: "#ffffff", stroke: "#555555" },
      initial: { fill: "#111111", stroke: "#111111" },
      final: { fill: "#ffffff", stroke: "#111111" },
    },
    accent: { fill: "#e6e6e6", stroke: "#111111", strokeWidth: 2 },
  },
  edge: {
    strokeWidth: 1.25,
    kinds: {
      call: { stroke: "#333333" },
      async: { stroke: "#333333", dash: "5 3" },
      data: { stroke: "#333333" },
      link: { stroke: "#333333" },
      optional: { stroke: "#333333", dash: "1.5 2.5" },
    },
    arrow: { length: 7, halfWidth: 3 },
    main: { strokeWidth: 2.5, arrow: { length: 9, halfWidth: 4 } },
    weights: { heavy: 4 },
    cornerRadius: 4,
    shape: "orthogonal",
    labelBackground: { fill: "#ffffff", padX: 3, padY: 1, radius: 2 },
  },
};

export const THEMES: Record<string, Theme> = {
  default: { name: "default", paint: PAINT, type: TYPE_RAMP },
  dark: { name: "dark", paint: DARK, type: TYPE_RAMP },
  print: { name: "print", paint: PRINT, type: TYPE_RAMP },
};

export const DEFAULT_THEME = THEMES.default as Theme;

/** Why a diagram may not name this style, as an error code: undefined for a built-in theme or a stylesheet inside its folder. */
export function styleProblem(style: string): "bad-value" | "outside-folder" | undefined {
  if (style in THEMES) return undefined;
  if (!style.endsWith(STYLESHEET_SUFFIX)) return "bad-value";
  if (style.startsWith("/") || style.split("/").includes("..")) return "outside-folder";
  return undefined;
}

// Stylesheets the command line has read, by the path the diagram names them by.
const provided = new Map<string, Theme>();

export function provideStylesheet(ref: string, theme: Theme): void {
  provided.set(ref, theme);
}

/** The theme a diagram names, or the default. A stylesheet must have been provided. */
export function themeOf(d: { style?: string }): Theme {
  if (d.style === undefined) return DEFAULT_THEME;
  return THEMES[d.style] ?? provided.get(d.style) ?? DEFAULT_THEME;
}

/** The styles a diagram and its operations name that are stylesheet files. */
export function stylesheetRefs(d: Diagram | null, named: (string | undefined)[]): string[] {
  const all = [d?.style, ...named].filter((s): s is string => s !== undefined && !(s in THEMES));
  return [...new Set(all)];
}

// The stylesheet schema mirrors a theme: every key optional, every value checked.
const COLOR = z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: "a colour like #1a2b3c" });
const DASH = z
  .string()
  .regex(/^\d+(\.\d+)?( \d+(\.\d+)?)*$/, { message: "a dash pattern like 4 3" });
const SIZE = z.number().min(0).max(64);

const SHAPE = z.enum(["orthogonal", "curved"]);
const NESTING = z.enum(["alternate", "shade"]);

// More weight levels: a name and a width. thin and thick are set by edge.strokeWidth and
// edge.main.strokeWidth, so they are not names here (D41).
const WEIGHTS = z.record(
  z
    .string()
    .regex(WEIGHT_LEVEL, { message: "a level name like heavy" })
    .refine((k) => k !== "thin" && k !== "thick", {
      message: "a level other than thin and thick: set those in edge.strokeWidth and edge.main",
    }),
  z.number().min(WEIGHT_MIN).max(WEIGHT_MAX),
);

function partial(example: unknown, path: string[]): z.ZodType {
  if (path.join(".") === "edge.weights") return WEIGHTS;
  if (path.join(".") === "edge.shape") return SHAPE;
  if (path.join(".") === "nesting") return NESTING;
  if (typeof example === "number") return SIZE;
  if (typeof example === "string") return example.startsWith("#") ? COLOR : DASH;
  const entries = Object.entries(example as Record<string, unknown>);
  const shape: Record<string, z.ZodType> = {};
  for (const [k, v] of entries) shape[k] = partial(v, [...path, k]).optional();
  // Any node kind may take a dashed border; only async and optional edges have a dash pattern (D8, D33).
  if (path.length === 3 && path[0] === "node" && path[1] === "kinds") shape.dash = DASH.optional();
  return z.strictObject(shape);
}

const RAMP_SCHEMA = z.strictObject(
  Object.fromEntries(
    Object.keys(TYPE_RAMP).map((role) => [
      role,
      z
        .strictObject({
          size: z.number().min(6).max(48).optional(),
          weight: z.union([z.literal(400), z.literal(600)]).optional(),
        })
        .optional(),
    ]),
  ),
);

const SHEET_SCHEMA = z.strictObject({
  "grafical-style": z.number().int().min(1).max(STYLESHEET_VERSION),
  base: z.enum(Object.keys(THEMES) as [string, ...string[]]).optional(),
  paint: partial(PAINT, []).optional(),
  type: RAMP_SCHEMA.optional(),
});

function merge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null || typeof over !== "object") {
    return (over === undefined ? base : over) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    out[k] = merge((base as Record<string, unknown>)[k], v);
  }
  return out as T;
}

/** A stylesheet's text as a theme named `ref`, or an error for each field at fault. */
export function parseStylesheet(text: string, ref: string): Theme | OpError[] {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (err) {
    return [yamlError(text, err)];
  }
  const r = SHEET_SCHEMA.safeParse(raw);
  if (!r.success) {
    return r.error.issues.map((i) => ({
      code: "bad-stylesheet",
      index: 0,
      field: i.path.join("."),
      found: show(getPath(raw, i.path)),
    }));
  }
  const base = THEMES[r.data.base ?? "default"] as Theme;
  return {
    name: ref,
    paint: merge(base.paint, r.data.paint),
    type: merge(base.type, r.data.type),
  };
}

/**
 * An error for each edge whose weight names a level the diagram's stylesheet lacks (D41).
 * Run after the stylesheet is provided, because the file is read before its stylesheet.
 */
export function unknownWeights(d: Diagram, index = 0): OpError[] {
  const P = themeOf(d).paint;
  const allowed = ["thin", "thick", ...Object.keys(P.edge.weights)];
  const errors: OpError[] = [];
  d.edges.forEach((e, i) => {
    if (typeof e.weight !== "string" || edgeWidth(e, P) !== undefined) return;
    errors.push({
      code: "unknown-weight",
      index,
      field: `edges[${i}].weight`,
      found: e.weight,
      facts: { edge: e.id, near: closest(e.weight, allowed), allowed },
    });
  });
  return errors;
}
