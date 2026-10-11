import { beforeAll, describe, expect, it } from "vitest";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, readDiagram, writeDiagram } from "../../src/model/index.ts";
import { renderSvg } from "../../src/render/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { PAINT } from "../../src/theme/paint.ts";
import {
  parseStylesheet,
  provideStylesheet,
  styleProblem,
  THEMES,
  type Theme,
  themeOf,
} from "../../src/theme/themes.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const SHEET = `grafical-style: 1
base: dark
paint:
  group: { fill: "#102030" }
  edge:
    kinds:
      async: { dash: "2 2" }
type:
  title: { size: 24 }
`;

describe("stylesheets (D30)", () => {
  it("start from a base theme and override any value", () => {
    const t = parseStylesheet(SHEET, "brand.grafical-style.yaml") as Theme;
    expect(Array.isArray(t)).toBe(false);
    expect(t.paint.group.fill).toBe("#102030");
    expect(t.paint.group.stroke).toBe(THEMES.dark?.paint.group.stroke);
    expect(t.paint.edge.kinds.async.dash).toBe("2 2");
    expect(t.type.title.size).toBe(24);
    expect(t.type.title.weight).toBe(600);
  });

  it("refuse unknown keys, bad colours and weights the fonts lack", () => {
    const errors = parseStylesheet(
      `grafical-style: 1
paint:
  group: { fill: red, shade: "#000000" }
  edge: { kinds: { call: { dash: "3 3" } } }
type:
  title: { weight: 700 }
`,
      "x.grafical-style.yaml",
    ) as string[];
    expect(Array.isArray(errors)).toBe(true);
    const text = errors.join("\n");
    expect(text).toContain("paint.group.fill: a colour like #1a2b3c");
    expect(text).toContain("shade");
    expect(text).toContain("paint.edge.kinds.call");
    expect(text).toContain("type.title.weight");
  });

  it("a diagram names a built-in theme or a stylesheet beside it", () => {
    expect(styleProblem("dark")).toBeUndefined();
    expect(styleProblem("brand.grafical-style.yaml")).toBeUndefined();
    expect(styleProblem("styles/brand.grafical-style.yaml")).toBeUndefined();
    expect(styleProblem("neon")).toContain("built-in theme");
    expect(styleProblem("../brand.grafical-style.yaml")).toContain("inside");
  });
});

describe("a themed diagram", () => {
  const styled = (style: string): Diagram => {
    const r = applyOps(catalogSyncGrouped, [{ op: "diagram.style", style }], m);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    return r.diagram;
  };

  it("round-trips its style and draws with the theme's paint", () => {
    const d = styled("dark");
    const text = writeDiagram(d);
    expect(text).toMatch(/density: normal\nstyle: dark\nlayers:/);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    const svg = renderSvg(layout(d, m));
    expect(svg).toContain(`fill="${THEMES.dark?.paint.background}"`);
    expect(svg).not.toContain(`fill="${PAINT.group.fill}"`);
  });

  it("lays out with the stylesheet's type sizes", () => {
    provideStylesheet(
      "brand.grafical-style.yaml",
      parseStylesheet(SHEET, "brand.grafical-style.yaml") as Theme,
    );
    const d = styled("brand.grafical-style.yaml");
    expect(themeOf(d).name).toBe("brand.grafical-style.yaml");
    const plain = layout(catalogSyncGrouped, m);
    const big = layout(d, m);
    expect(big.title.bbox.h).toBeGreaterThan(plain.title.bbox.h);
    expect(big.nodes[0]?.rect.y).toBeGreaterThan(plain.nodes[0]?.rect.y ?? 0);
  });

  it("the default theme draws exactly as before: no paint in the scene", () => {
    expect(layout(catalogSyncGrouped, m).paint).toBeUndefined();
  });

  it("refuses a style that is neither a theme nor a stylesheet file", () => {
    const r = applyOps(catalogSyncGrouped, [{ op: "diagram.style", style: "neon" }], m);
    expect("errors" in r && r.errors[0]?.code).toBe("bad-value");
  });
});
