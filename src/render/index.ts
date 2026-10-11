// Render entry point (DESIGN.md D13). The stub writes a bare SVG without
// fonts. The real renderer replaces it.

import { Resvg } from "@resvg/resvg-js";
import type { Scene } from "../scene.ts";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderSvg(scene: Scene): string {
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">`,
  );
  out.push(`<rect width="${scene.width}" height="${scene.height}" fill="#ffffff"/>`);
  for (const n of scene.nodes) {
    out.push(
      `<rect x="${n.rect.x}" y="${n.rect.y}" width="${n.rect.w}" height="${n.rect.h}" fill="#ffffff" stroke="#333333"/>`,
    );
  }
  for (const e of scene.edges) {
    out.push(
      `<polyline points="${e.points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="#333333"/>`,
    );
  }
  for (const t of [
    scene.title,
    ...scene.layers.map((l) => l.label),
    ...scene.nodes.flatMap((n) => n.texts),
  ]) {
    for (const r of t.runs)
      out.push(`<text x="${r.x}" y="${r.y}" font-size="${r.size}">${esc(r.text)}</text>`);
  }
  out.push("</svg>");
  return `${out.join("\n")}\n`;
}

export function renderPng(svg: string, scale: number): Uint8Array {
  const png = new Resvg(svg, { fitTo: { mode: "zoom", value: scale } }).render().asPng();
  return new Uint8Array(png);
}
