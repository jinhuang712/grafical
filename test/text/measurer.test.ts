import { Resvg } from "@resvg/resvg-js";
import { beforeAll, describe, expect, it } from "vitest";
import { createMeasurer, FONT_FAMILY, FONT_FILES, type Measurer } from "../../src/text/index.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const LABELS = [
  "Catalog Sync",
  "商品同步服务",
  "读取接口（gRPC）",
  "m报",
  "Kafka 消息队列",
  "AVATAR To Wave",
  "「商品」与“报价”：快照",
  "/v1/catalog-sync/admin/correction/resync",
  "price_snapshot_v2",
  "同步→校验→发布",
  "Order Service (v2)",
  "写入 MySQL 主库",
  "TTL = 30s，过期重建",
  "…… 等待重试……",
  "Redis Cluster",
  "API 网关",
  "supplier-adapter",
  "库存 / 价格 / 内容",
  "gRPC: GetSku()",
  "Type Me, Wave Yo",
  "100% 成功率",
  "a,b;c.d:e",
  "事件总线 Event Bus",
  "商品中心",
  "Search Index 搜索索引",
  "cron */5 * * * *",
  "https://example.com/a?b=1",
  "副本 ×3",
  "v1.2.3-rc.1",
  "Wi-Fi AVA 同步完成！",
  "≤ 10 条/秒",
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function bbox(text: string, size: number, face: keyof typeof FONT_FAMILY, anchor: string) {
  const { family, weight } = FONT_FAMILY[face];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="60" viewBox="0 0 900 60">` +
    `<text xml:space="preserve" x="450" y="35" font-family="${family}" font-size="${size}" ` +
    `font-weight="${weight}" text-anchor="${anchor}">${esc(text)}</text></svg>`;
  const r = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      fontFiles: Object.values(FONT_FILES),
      defaultFontFamily: "Inter",
    },
  });
  return r.getBBox();
}

/** What resvg draws for one run: the shift of its ink between the two anchors. */
function resvgAdvance(text: string, size: number, face: keyof typeof FONT_FAMILY): number | null {
  const start = bbox(text, size, face, "start");
  const end = bbox(text, size, face, "end");
  if (!start || !end) return null;
  return start.x - end.x;
}

describe("accuracy against resvg", () => {
  it("every run advance is within 1 px", () => {
    let checked = 0;
    let worst = 0;
    for (const size of [11, 12, 13, 18]) {
      for (const weight of [400, 600] as const) {
        for (const label of LABELS) {
          const line = m.measure(label, { size, weight });
          let sum = 0;
          for (const run of line.runs) {
            sum += run.width;
            if (run.text.trim() === "") continue;
            const drawn = resvgAdvance(run.text, size, run.face);
            if (drawn === null) continue;
            const diff = Math.abs(drawn - run.width);
            worst = Math.max(worst, diff);
            expect(diff, `${label} @${size}/${weight} run "${run.text}"`).toBeLessThanOrEqual(1);
            checked++;
          }
          expect(line.width).toBeCloseTo(sum, 6);
        }
      }
    }
    expect(LABELS.length).toBeGreaterThanOrEqual(30);
    expect(checked).toBeGreaterThan(300);
    console.log(`resvg accuracy: ${checked} runs, worst difference ${worst.toFixed(5)} px`);
  });
});

describe("face selection", () => {
  it("splits m报 into an Inter run and a Noto run", () => {
    const line = m.measure("m报", { size: 13, weight: 400 });
    expect(line.runs.map((r) => [r.text, r.face])).toEqual([
      ["m", "inter-400"],
      ["报", "noto-400"],
    ]);
    expect(line.runs[1]?.dx).toBeCloseTo(line.runs[0]?.width ?? 0, 6);
  });

  it("follows the weight and merges neighbours that share a face", () => {
    const line = m.measure("Order 订单 No.", { size: 13, weight: 600 });
    expect(line.runs.map((r) => r.face)).toEqual(["inter-600", "noto-600", "inter-600"]);
    expect(line.runs[0]?.text).toBe("Order ");
  });

  it("returns an empty line for an empty string", () => {
    expect(m.measure("", { size: 13, weight: 400 })).toEqual({ runs: [], width: 0 });
  });

  it("caches without sharing mutable results", () => {
    const a = m.measure("Cache me", { size: 12, weight: 400 });
    const b = m.measure("Cache me", { size: 12, weight: 400 });
    expect(a).toEqual(b);
    (a.runs[0] as { dx: number }).dx = 99;
    expect(m.measure("Cache me", { size: 12, weight: 400 }).runs[0]?.dx).toBe(0);
  });
});

describe("metrics", () => {
  it("is the same for every text and a multiple of 4", () => {
    for (const size of [11, 12, 13, 18]) {
      for (const weight of [400, 600] as const) {
        const x = m.metrics({ size, weight });
        expect(x.lineHeight % 4).toBe(0);
        expect(x.lineHeight).toBeGreaterThanOrEqual(x.ascent + x.descent);
        expect(x.lineHeight).toBeLessThan(x.ascent + x.descent + 4);
        expect(x.ascent).toBeGreaterThan(size * 0.9);
        expect(x.descent).toBeGreaterThan(0);
      }
    }
  });
});

const W = { size: 13, weight: 400 } as const;
const texts = (lines: { runs: { text: string }[] }[]) =>
  lines.map((l) => l.runs.map((r) => r.text).join(""));
const w = (s: string) => m.measure(s, W).width;

describe("wrapping", () => {
  it("returns [] for an empty string", () => {
    expect(m.wrap("", W, 100)).toEqual([]);
  });

  it("keeps a fitting label on one line", () => {
    expect(texts(m.wrap("Catalog Sync", W, 200))).toEqual(["Catalog Sync"]);
  });

  it("breaks at spaces and trims the line ends", () => {
    const max = w("gamma delta") + 1;
    const lines = m.wrap("alpha beta gamma delta", W, max);
    expect(texts(lines)).toEqual(["alpha beta", "gamma delta"]);
    for (const l of lines) expect(l.width).toBeLessThanOrEqual(max);
  });

  it("breaks Chinese text between characters", () => {
    const lines = m.wrap("商品同步服务读取接口", W, 13 * 5.5);
    expect(texts(lines)).toEqual(["商品同步服", "务读取接口"]);
  });

  it("breaks a long path after slashes and hyphens", () => {
    const path = "/v1/catalog-sync/admin/correction/resync";
    const lines = m.wrap(path, W, w("/v1/catalog-sync/") + 1);
    expect(texts(lines).join("")).toBe(path);
    expect(lines.length).toBeGreaterThan(1);
    expect(texts(lines)[0]).toBe("/v1/catalog-sync/");
    for (const l of lines) expect(l.width).toBeLessThanOrEqual(w("/v1/catalog-sync/") + 1);
    for (const t of texts(lines)) expect(t).not.toBe("/");
  });

  it("breaks after underscores", () => {
    expect(texts(m.wrap("price_snapshot_v2", W, w("price_snapshot_") + 1))).toEqual([
      "price_snapshot_",
      "v2",
    ]);
  });

  it("keeps a word wider than maxWidth whole", () => {
    const lines = m.wrap("tiny supercalifragilistic tiny", W, 40);
    expect(texts(lines)).toEqual(["tiny", "supercalifragilistic", "tiny"]);
    expect(lines[1]?.width).toBeGreaterThan(40);
  });

  it("never starts a line with closing punctuation", () => {
    // Width allows exactly 4 characters, so the natural break falls before ，。
    const lines = m.wrap("商品同步，。服务", W, 13 * 4.2);
    for (const t of texts(lines)) expect(t).not.toMatch(/^[，。：；）」”,.]/u);
    expect(texts(lines).join("")).toBe("商品同步，。服务");
    expect(lines.length).toBeGreaterThan(1);
  });

  it("never starts a line with a Latin comma or period", () => {
    const lines = m.wrap("alpha beta, gamma", W, w("alpha beta") + 0.5);
    for (const t of texts(lines)) expect(t).not.toMatch(/^[,.]/);
    expect(texts(lines).join(" ")).toBe("alpha beta, gamma");
    expect(texts(lines)[0]).not.toBe("alpha beta");
  });

  it("never ends a line with opening punctuation", () => {
    const lines = m.wrap("读取接口（gRPC）服务", W, 13 * 4.2);
    for (const t of texts(lines)) expect(t).not.toMatch(/[（「“(]$/u);
    expect(texts(lines).join("")).toBe("读取接口（gRPC）服务");
  });

  it("keeps closing quotes with the text before them", () => {
    const lines = m.wrap("「商品」与“报价”：快照", W, 13 * 3.2);
    for (const t of texts(lines)) {
      expect(t).not.toMatch(/^[」”：]/u);
      expect(t).not.toMatch(/[「“]$/u);
    }
  });

  it("honours explicit newlines", () => {
    expect(texts(m.wrap("a\nb", W, 100))).toEqual(["a", "b"]);
  });

  it("each wrapped line has consistent run offsets", () => {
    for (const l of m.wrap("读取 Redis 缓存 then fall back to MySQL 主库", W, 90)) {
      let pen = 0;
      for (const r of l.runs) {
        expect(r.dx).toBeCloseTo(pen, 6);
        pen += r.width;
      }
      expect(l.width).toBeCloseTo(pen, 6);
    }
  });
});

describe("missing glyphs", () => {
  it("reports characters no bundled font has, once each, in order", () => {
    // U+20000 is CJK Extension B. The emoji is outside both fonts.
    const rare = "\u{20000}";
    expect(m.missingGlyphs(`a${rare}b😀${rare}c😀`)).toEqual([rare, "😀"]);
  });

  it("reports nothing for covered text", () => {
    expect(m.missingGlyphs("Catalog 商品，≤ ✓ →")).toEqual([]);
    expect(m.missingGlyphs("")).toEqual([]);
  });

  it("measures a missing character with the Noto notdef advance", () => {
    const line = m.measure("\u{20000}", { size: 100, weight: 400 });
    expect(line.runs).toHaveLength(1);
    expect(line.runs[0]?.face).toBe("noto-400");
    expect(line.width).toBeGreaterThan(0);
  });
});

describe("speed", () => {
  it("measures 1,000 labels", () => {
    const words = ["Catalog", "同步", "Order", "服务", "gRPC", "读取", "cache", "队列"];
    const labels: string[] = [];
    for (let i = 0; i < 1000; i++) {
      labels.push(`${words[i % 8]} ${words[(i * 3 + 1) % 8]} ${i}`);
    }
    const t0 = performance.now();
    for (const l of labels) m.measure(l, { size: 13, weight: 600 });
    const cold = performance.now() - t0;
    const t1 = performance.now();
    for (const l of labels) m.measure(l, { size: 13, weight: 600 });
    const warm = performance.now() - t1;
    console.log(
      `measure 1000 labels: ${cold.toFixed(1)} ms cold, ${warm.toFixed(1)} ms cached; ` +
        `50 labels cached ~${((warm * 50) / 1000).toFixed(2)} ms`,
    );
  });
});
