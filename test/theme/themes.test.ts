import { beforeAll, describe, expect, it } from "vitest";
import { PAGES } from "../../src/cli/help.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, readDiagram, writeDiagram } from "../../src/model/index.ts";
import { renderSvg } from "../../src/render/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import {
  PAINT,
  parseStylesheet,
  provideStylesheet,
  stylesheetProblem,
  THEMES,
  type Theme,
  themeOf,
} from "../../src/theme/themes.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const SHEET = `<stylesheet> {
  format: 1
  base: dark
}

<type> group {
  fill: #102030
}

<type> async {
  dash: "2 2"
}

<type> title {
  text-size: 24
}
`;

describe('stylesheets (specs/decisions, "Themes and stylesheets")', () => {
  it("start from a base theme and override any value", () => {
    const t = parseStylesheet(SHEET, "brand.grafical") as Theme;
    expect(Array.isArray(t)).toBe(false);
    expect(t.paint.group.fill).toBe("#102030");
    expect(t.paint.group.stroke).toBe(THEMES.dark?.paint.group.stroke);
    expect(t.paint.edge.kinds.async.dash).toBe("2 2");
    expect(t.type.title.size).toBe(24);
    expect(t.type.title.weight).toBe(600);
  });

  it("start from default when they name no base", () => {
    const t = parseStylesheet("<stylesheet> {\n  format: 1\n}\n", "x.grafical") as Theme;
    expect(t.paint).toEqual(THEMES.default?.paint);
  });

  it("refuse unknown blocks and attributes, bad colours and weights the fonts lack", () => {
    const errors = parseStylesheet(
      `<stylesheet> {
  format: 1
}

<type> group {
  fill: red
  shade: #000000
}

<type> call {
  dash: "3 3"
}

<type> title {
  text-weight: 700
}

<type> widget {
  fill: #000000
}
`,
      "x.grafical",
    ) as OpError[];
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.every((e) => e.code === "bad-stylesheet")).toBe(true);
    const at = (field: string) => errors.find((e) => e.field === field);
    expect(at("type group.fill")?.found).toBe("red");
    expect(at("type group.shade")).toBeDefined();
    expect(at("type call.dash")).toBeDefined();
    expect(at("type title.text-weight")?.found).toBe("700");
    expect(at("type widget")).toBeDefined();
  });

  it("refuse a base that is no built-in theme", () => {
    const errors = parseStylesheet("<stylesheet> {\n  format: 1\n  base: neon\n}\n", "x.grafical");
    expect((errors as OpError[])[0]).toMatchObject({
      code: "bad-stylesheet",
      field: "stylesheet.base",
    });
  });

  it('tell nested frames apart by alternating fills or by shades, and nothing else (specs/decisions, "Every layered diagram type")', () => {
    const sheet = (nesting: string) =>
      parseStylesheet(
        `<stylesheet> {\n  format: 1\n}\n\n<type> group {\n  nesting: ${nesting}\n}\n`,
        "x.grafical",
      );
    expect((sheet("shade") as Theme).paint.nesting).toBe("shade");
    expect((sheet("stripes") as OpError[])[0]).toMatchObject({
      code: "bad-stylesheet",
      field: "type group.nesting",
      found: "stripes",
    });
    expect(THEMES.default?.paint.nesting).toBe("alternate");
  });

  it("a diagram names a built-in theme or a stylesheet beside it", () => {
    expect(stylesheetProblem("dark")).toBeUndefined();
    expect(stylesheetProblem("brand.grafical")).toBeUndefined();
    expect(stylesheetProblem("styles/brand.grafical")).toBeUndefined();
    expect(stylesheetProblem("neon")).toBe("bad-value");
    expect(stylesheetProblem("../looks/brand.grafical")).toBeUndefined();
  });

  it("the example in library's help is a stylesheet", () => {
    const after = PAGES.library?.after ?? "";
    const from = after.indexOf("  <stylesheet> {");
    const to = after.indexOf("\nIts blocks:");
    const text = after
      .slice(from, to)
      .split("\n")
      .map((l) => l.slice(2))
      .join("\n");
    const t = parseStylesheet(text, "x.grafical") as Theme;
    expect(Array.isArray(t)).toBe(false);
    expect(t.paint.edge.weights.critical).toBe(6);
  });

  it("each built-in theme says what it looks like", () => {
    expect(Object.keys(THEMES).sort()).toEqual(["dark", "default", "print"]);
    expect(Object.values(THEMES).every((t) => (t.about ?? "").length > 0)).toBe(true);
  });
});

describe("a themed diagram", () => {
  const styled = (style: string): Diagram => {
    const r = applyOps(catalogSyncGrouped, [{ op: "diagram.set", stylesheet: style }]);
    if ("errors" in r) throw new Error(JSON.stringify(r.errors));
    return r.diagram;
  };

  it("round-trips its style and draws with the theme's paint", () => {
    const d = styled("dark");
    const text = writeDiagram(d);
    expect(text).toMatch(/stylesheet: "dark"\n}/);
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    const svg = renderSvg(layout(d, m));
    expect(svg).toContain(`fill="${THEMES.dark?.paint.background}"`);
    expect(svg).not.toContain(`fill="${PAINT.group.fill}"`);
  });

  it("lays out with the stylesheet's type sizes", () => {
    provideStylesheet("brand.grafical", parseStylesheet(SHEET, "brand.grafical") as Theme);
    const d = styled("brand.grafical");
    expect(themeOf(d).name).toBe("brand.grafical");
    const plain = layout(catalogSyncGrouped, m);
    const big = layout(d, m);
    expect(big.title.bbox.h).toBeGreaterThan(plain.title.bbox.h);
    expect(big.nodes[0]?.rect.y).toBeGreaterThan(plain.nodes[0]?.rect.y ?? 0);
  });

  it("the default theme draws exactly as before: no paint in the scene", () => {
    expect(layout(catalogSyncGrouped, m).paint).toBeUndefined();
  });

  it("refuses a style that is neither a theme nor a stylesheet file", () => {
    const r = applyOps(catalogSyncGrouped, [{ op: "diagram.set", stylesheet: "neon" }]);
    expect("errors" in r && r.errors[0]?.code).toBe("bad-value");
  });
});
