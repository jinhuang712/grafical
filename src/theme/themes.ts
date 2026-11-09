// Themes and stylesheets (specs/decisions, "Themes and stylesheets", "A stylesheet is a .grafical file, and the built-in ones form a library").
// A theme is every value of the look: paint (colours, strokes, radii) and the type ramp. The built-in themes are
// stylesheets in presets/, and a stylesheet an agent writes starts from one of them and overrides some of its values.
// A diagram names its stylesheet; layout and rendering read the result.
//
// Layout stays pure: it never reads a file of the diagram's. The command line reads a diagram's
// stylesheet and hands it in with provideStylesheet() before laying out.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { OpError } from "../errors.ts";
import { closest } from "../model/suggest.ts";
import type { Diagram } from "../model/types.ts";
import type { TextRole } from "../scene.ts";
import type { TextStyle } from "../text/types.ts";
import { edgeWidth, type Paint, WEIGHT_LEVEL } from "./paint.ts";
import { readSheet, type Sheet, themeFrom } from "./stylesheet.ts";

export type TypeRamp = Record<TextRole, TextStyle>;

export interface Theme {
  /** A built-in theme's name, or the stylesheet path as the diagram names it. */
  name: string;
  /** One line on what it looks like, for a built-in theme. */
  about?: string;
  paint: Paint;
  type: TypeRamp;
}

export const STYLESHEET_SUFFIX = ".grafical";

const PRESETS = fileURLToPath(new URL("./presets/", import.meta.url));

/** The built-in themes, each read from its stylesheet in presets/, a base before what builds on it. */
function presets(): Record<string, Theme> {
  const sheets = new Map<string, Sheet>();
  for (const f of readdirSync(PRESETS)
    .filter((x) => x.endsWith(STYLESHEET_SUFFIX))
    .sort()) {
    const s = readSheet(readFileSync(`${PRESETS}${f}`, "utf8"));
    if (Array.isArray(s)) throw new Error(`presets/${f}: ${JSON.stringify(s)}`);
    sheets.set(f.slice(0, -STYLESHEET_SUFFIX.length), s);
  }
  const out: Record<string, Theme> = {};
  const build = (name: string): Theme => {
    const done = out[name];
    if (done !== undefined) return done;
    const s = sheets.get(name) as Sheet;
    const base = s.base === undefined ? undefined : build(s.base);
    const t = themeFrom(s, base) as Theme;
    out[name] = {
      name,
      ...(s.about === undefined ? {} : { about: s.about }),
      paint: t.paint,
      type: t.type,
    };
    return out[name];
  };
  for (const name of [...sheets.keys()]) build(name);
  return out;
}

export const THEMES: Record<string, Theme> = presets();

export const DEFAULT_THEME = THEMES.default as Theme;
/** The default theme's paint and type ramp. */
export const PAINT: Paint = DEFAULT_THEME.paint;
export const TYPE_RAMP: TypeRamp = DEFAULT_THEME.type;

/** Why a diagram may not name this style, as an error code: undefined for a built-in stylesheet or a path to one, which may lie anywhere. */
export function styleProblem(style: string): "bad-value" | undefined {
  if (style in THEMES) return undefined;
  return style.endsWith(STYLESHEET_SUFFIX) ? undefined : "bad-value";
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

/** A stylesheet's text as a theme named `ref`, or an error for each block or value at fault. Its base is default unless it names a built-in one. */
export function parseStylesheet(text: string, ref: string): Theme | OpError[] {
  const s = readSheet(text);
  if (Array.isArray(s)) return s;
  const base = THEMES[s.base ?? "default"];
  if (base === undefined) {
    return [
      {
        code: "bad-stylesheet",
        index: 0,
        field: "stylesheet.base",
        found: s.base as string,
        facts: { allowed: Object.keys(THEMES) },
      },
    ];
  }
  const t = themeFrom(s, base) as Theme;
  return { name: ref, paint: t.paint, type: t.type };
}

/**
 * An error for each edge weight, and each width the legend names, that is a level the
 * diagram's stylesheet lacks (specs/decisions, "Edge weights", "A legend for widths and marks").
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
  // The legend may name a level only the stylesheet has (specs/decisions, "A legend for widths and marks").
  for (const key of Object.keys(d.legend?.weights ?? {})) {
    if (!WEIGHT_LEVEL.test(key) || key === "thin" || edgeWidth({ weight: key }, P) !== undefined) {
      continue;
    }
    errors.push({
      code: "unknown-weight",
      index,
      field: "legend.weights",
      found: key,
      facts: { near: closest(key, allowed), allowed },
    });
  }
  return errors;
}
