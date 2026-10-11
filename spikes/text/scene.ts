import { createHash } from "node:crypto";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";
import type { Weight } from "./fonts.ts";
import { harfbuzzMeasurer } from "./measure.ts";
import { escapeXml, family, resvgOptions } from "./resvg.ts";
import { splitRuns } from "./runs.ts";

const measurer = harfbuzzMeasurer();
const n = (v: number): string => v.toFixed(2);

/** A label centred on (cx, cy): one `<text>` per font run, placed with measured advances. */
function label(text: string, cx: number, cy: number, size: number, weight: Weight): string {
  const total = measurer.measure(text, size, weight, "runs").advance;
  let x = cx - total / 2;
  const parts: string[] = [];
  for (const run of splitRuns(text, weight, "runs")) {
    parts.push(
      `<text x="${n(x)}" y="${n(cy + size * 0.35)}" font-family="${family[run.font]}" ` +
        `font-size="${size}" font-weight="${run.weight}" xml:space="preserve">${escapeXml(run.text)}</text>`,
    );
    x += measurer.measure(run.text, size, run.weight, "runs").advance;
  }
  return parts.join("");
}

function box(x: number, y: number, w: number, h: number, title: string, sub: string): string {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#f4f6fb" stroke="#3b5bdb" stroke-width="1.5"/>` +
    label(title, x + w / 2, y + h / 2 - 9, 14, 600) +
    label(sub, x + w / 2, y + h / 2 + 11, 12, 400)
  );
}

/** A small architecture sketch with Chinese and Latin labels, boxes and lines. */
export function sceneSvg(): string {
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="260" viewBox="0 0 560 260">`,
    `<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">` +
      `<path d="M0 0L10 5L0 10z" fill="#495057"/></marker></defs>`,
    `<rect width="560" height="260" fill="#ffffff"/>`,
    label("目录同步 catalog-sync", 280, 24, 14, 600),
    box(20, 60, 140, 56, "catalog-relay", "消息转发（Kafka）"),
    box(210, 60, 140, 56, "catalog-sync", "商品同步服务"),
    box(400, 60, 140, 56, "MongoDB", "写入 goods_item"),
    box(210, 170, 140, 56, "catalog-api", "读取接口（gRPC）"),
    `<path d="M160 88H208" stroke="#495057" stroke-width="1.5" fill="none" marker-end="url(#a)"/>`,
    `<path d="M350 88H398" stroke="#495057" stroke-width="1.5" fill="none" marker-end="url(#a)"/>`,
    `<path d="M470 116V198H352" stroke="#495057" stroke-width="1.5" fill="none" stroke-dasharray="5 3" marker-end="url(#a)"/>`,
    label("emit", 184, 78, 12, 400),
    label("去重", 374, 78, 12, 400),
    label("只读 read", 440, 214, 12, 400),
    `</svg>`,
  ];
  return parts.join("\n");
}

export const sha256 = (data: Uint8Array | string): string =>
  createHash("sha256").update(data).digest("hex");

/** Render the scene with only the bundled fonts. Returns the PNG file and its decoded pixels. */
export function renderScene(svg: string): {
  png: Buffer;
  pixels: Buffer;
  width: number;
  height: number;
} {
  const png = new Resvg(svg, resvgOptions()).render().asPng();
  const decoded = PNG.sync.read(png);
  return { png, pixels: decoded.data, width: decoded.width, height: decoded.height };
}
