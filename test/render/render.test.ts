import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { renderPng, renderSvg } from "../../src/render/index.ts";
import { escapeScene, mixedScene, tinyScene } from "./scenes.ts";

const sha = (d: string | Uint8Array): string => createHash("sha256").update(d).digest("hex");
const pixels = (png: Uint8Array): string => sha(PNG.sync.read(Buffer.from(png)).data);

// Pinned hashes. If the paint or the writer changes on purpose, update them.
const EXPECTED = {
  mixed: {
    svg: "2440390f05af2713d803810aee9a5bbd6ca7a69e64de91e6579b380f3a78642f",
    png: "69739fb65438fe189b77dc8bafe212994ade4966f7c07f5f4750b2bc22b62277",
  },
  tiny: {
    svg: "d76beb38ed8d5bad0783720c391264ad211e2498a2cf33e9e945ad1db19e265f",
    png: "fc6b4be4333c56e0a9850b48aa28016e984a512f5522508f523d6e17bcf75798",
  },
  escape: {
    svg: "d61e7141c77681203f0651aa8f565afc042eb455866520a75d0c844c03641c06",
    png: "bc2cd0bf1d76548f470b56b161b96d0de06ec97bb2550ecceb80b7ff74599a21",
  },
};

describe("determinism", () => {
  const scenes = { mixed: mixedScene, tiny: tinyScene, escape: escapeScene };
  for (const [name, build] of Object.entries(scenes)) {
    it(`${name}: the same scene gives the same SVG bytes and PNG pixels`, () => {
      const a = renderSvg(build());
      const b = renderSvg(build());
      expect(a).toBe(b);
      const key = name as keyof typeof EXPECTED;
      expect({ svg: sha(a), png: pixels(renderPng(a, 2)) }).toEqual(EXPECTED[key]);
      expect(pixels(renderPng(b, 2))).toBe(pixels(renderPng(a, 2)));
    });
  }
});

describe("text", () => {
  it("writes one <text> per run, with the family and weight of its face", () => {
    const svg = renderSvg(mixedScene());
    const texts = svg.match(/<text [^>]*>[^<]*<\/text>/g) ?? [];
    const scene = mixedScene();
    const runs = [
      ...scene.title.runs,
      ...scene.layers.flatMap((l) => l.label.runs),
      ...scene.edges.flatMap((e) => e.label?.runs ?? []),
      ...scene.nodes.flatMap((n) => n.texts.flatMap((t) => t.runs)),
    ];
    expect(texts).toHaveLength(runs.length);
    expect(svg).toContain(
      `<text x="32" y="40" font-family="Noto Sans SC" font-size="18" font-weight="600"`,
    );
    expect(svg).toContain(`font-family="Inter" font-size="18" font-weight="600"`);
    expect(svg).toContain(`font-family="Noto Sans SC" font-size="11" font-weight="400"`);
    expect(svg).toContain(`font-family="Inter" font-size="11" font-weight="400"`);
  });

  it("never writes a font stack", () => {
    const families = renderSvg(mixedScene()).match(/font-family="[^"]*"/g) ?? [];
    for (const f of families) expect(f).toMatch(/^font-family="(Inter|Noto Sans SC)"$/);
  });
});

describe("escaping and numbers", () => {
  it("escapes &, <, > and quotes in text and in the title", () => {
    const svg = renderSvg(escapeScene());
    expect(svg).toContain("R&amp;D &lt;&quot;core&quot;&gt; it&apos;s</text>");
    expect(svg).toContain("<title>R&amp;D &lt;&quot;core&quot;&gt; it&apos;s</title>");
    const mixed = renderSvg(mixedScene());
    expect(mixed).toContain("Mongo &amp; &lt;co&gt;");
    expect(mixed).not.toContain("Mongo & <co>");
  });

  it("rounds to 2 decimals without trailing zeros", () => {
    const svg = renderSvg(escapeScene());
    expect(svg).toContain('x="16.12" y="32.46"');
    expect(svg).not.toMatch(/\d\.\d{3,}/);
    expect(svg).not.toMatch(/\.\d*0["\s,]/);
  });
});

describe("structure", () => {
  it("has role img, a title and a desc, and draws in the fixed order", () => {
    const svg = renderSvg(mixedScene());
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>目录同步 catalog-sync 总览</title>");
    expect(svg).toContain("<desc>Layers: Edge, 核心 core, Data. 5 nodes, 4 edges.</desc>");
    const at = (s: string): number => svg.indexOf(s);
    expect(at("<title>")).toBeLessThan(at('fill="#ffffff"/>'));
    expect(at("Edge</text>")).toBeLessThan(at("<polyline"));
    expect(at("<polyline")).toBeLessThan(at("api-gateway"));
    expect(at("api-gateway")).toBeLessThan(at(">目录同步</text>"));
  });

  it("is free of timestamps and ends with a newline", () => {
    const svg = renderSvg(tinyScene());
    expect(svg.endsWith("</svg>\n")).toBe(true);
    expect(svg).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("scales the PNG", () => {
    const svg = renderSvg(tinyScene());
    expect(PNG.sync.read(Buffer.from(renderPng(svg, 1))).width).toBe(200);
    expect(PNG.sync.read(Buffer.from(renderPng(svg, 3))).width).toBe(600);
  });
});
