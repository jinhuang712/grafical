import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { renderPng, renderSvg } from "../../src/render/index.ts";
import { escapeScene, groupedScene, mixedScene, tinyScene } from "./scenes.ts";

const sha = (d: string | Uint8Array): string => createHash("sha256").update(d).digest("hex");
const pixels = (png: Uint8Array): string => sha(PNG.sync.read(Buffer.from(png)).data);

// Pinned hashes. If the paint or the writer changes on purpose, update them.
const EXPECTED = {
  mixed: {
    svg: "ddf24026752c81c28c351529cc4cd7f133c2875032cc2e35391bb3cf78e70bf6",
    png: "c65fc21dc86c257554aeebbc7c5cec489d9377e01b442d82b12f73b86a69f453",
  },
  tiny: {
    svg: "d94079fdb03a36c371ffd7ec591b3c9f0913cd4a3b4675ce6a6113c61818707c",
    png: "fc6b4be4333c56e0a9850b48aa28016e984a512f5522508f523d6e17bcf75798",
  },
  grouped: {
    svg: "ef8e7013b6671cfbd351ae8c5b110acbc503d125555113889fd4ab447ef3494d",
    png: "160905ec33375f75b04e58bb39ec2cc6fd139b0e3924c3194d374320e100231e",
  },
  escape: {
    svg: "8fd21fe8b59a88bb37c573a42527d6a241ddda5ba0875a04f711390a35c59f12",
    png: "bc2cd0bf1d76548f470b56b161b96d0de06ec97bb2550ecceb80b7ff74599a21",
  },
};

describe("determinism", () => {
  const scenes = { mixed: mixedScene, grouped: groupedScene, tiny: tinyScene, escape: escapeScene };
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
    expect(svg).toContain("<desc>Groups: none. 5 nodes, 4 edges.</desc>");
    const at = (s: string): number => svg.indexOf(s);
    expect(at("<title>")).toBeLessThan(at('fill="#ffffff"/>'));
    expect(at("<path")).toBeLessThan(at("api-gateway"));
    expect(at("<path")).toBeLessThan(at("api-gateway"));
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

describe("the target look", () => {
  const svg = renderSvg(groupedScene());
  const at = (s: string): number => svg.indexOf(s);

  it("draws groups first, with an 8px radius, and never draws layer bands", () => {
    expect(svg).toContain(
      'rx="8" fill="#f5f6f8" stroke="#d5d9df" stroke-width="1"/>\n<text x="48" y="208"',
    );
    expect(at('rx="8"')).toBeLessThan(at("<path"));
    expect(svg.match(/rx="8"/g)).toHaveLength(2);
    expect(renderSvg(mixedScene())).not.toContain("Edge</text>");
  });

  it("writes the subtitle, the legend and the footnote", () => {
    expect(svg).toContain("Two Go services coupled");
    expect(svg).toContain(">Kafka message</text>");
    expect(svg).toContain(">Not shown: retries, metrics.</text>");
    expect(svg).toContain(
      '<path d="M801.9 36L822.9 36" fill="none" stroke="#6f7681" stroke-width="1.25" stroke-dasharray="5 3"/>',
    );
  });

  it("uses two line styles: solid for call and data, dashed for async", () => {
    const dashes = new Set(svg.match(/stroke-dasharray="[^"]*"/g));
    expect([...dashes].sort()).toEqual(['stroke-dasharray="4 3"', 'stroke-dasharray="5 3"']);
    const s = mixedScene();
    const data = s.edges.find((e) => e.kind === "data");
    expect(data).toBeDefined();
    const out = renderSvg({ ...s, edges: data ? [data] : [] });
    expect(out.match(/<path d="M236 248[^>]*>/)?.[0]).not.toContain("dasharray");
  });

  it("draws an optional edge dotted, and a link with no arrowhead (D33)", () => {
    const s = mixedScene();
    const data = s.edges.find((e) => e.kind === "data");
    expect(data).toBeDefined();
    if (data === undefined) return;
    const heads = (out: string): number => (out.match(/Z" fill="#6f7681"\/>/g) ?? []).length;
    const as = (kind: "data" | "optional" | "link") =>
      renderSvg({ ...s, edges: [{ ...data, kind }], legend: [] });
    expect(as("optional")).toContain('stroke-dasharray="1.5 2.5"');
    expect(heads(as("optional"))).toBe(heads(as("data")));
    expect(heads(as("link"))).toBe(heads(as("data")) - 1);
    const both = renderSvg({ ...s, edges: [{ ...data, both: true }], legend: [] });
    expect(heads(both)).toBe(heads(as("data")) + 1);
    const main = renderSvg({ ...s, edges: [{ ...data, main: true }], legend: [] });
    expect(main).toContain('stroke-width="2.5"');
    expect(as("data")).not.toContain('stroke-width="2.5"');
  });

  it("rounds corners and puts the arrowhead 7px long at the end", () => {
    expect(svg).toContain('<path d="M900 152L900 342Q900 348 894 348L807 348"');
    expect(svg).toContain('<path d="M800 348L807 345L807 351Z" fill="#6f7681"/>');
  });

  it("names the groups in the desc", () => {
    expect(svg).toContain("<desc>Groups: catalog-sync, catalog-api. 12 nodes");
  });
});
