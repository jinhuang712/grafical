// A throwaway SVG writer, only for looking at layouts before the real renderer
// lands. It is not the product's look, and nothing depends on it.

import { Resvg } from "@resvg/resvg-js";
import type { PlacedText, Point, Scene } from "../../src/scene.ts";

const r2 = (n: number) => String(Math.round(n * 100) / 100);

function esc(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const NODE: Record<string, { fill: string; stroke: string; dash?: string }> = {
  service: { fill: "#ffffff", stroke: "#b8bec8" },
  store: { fill: "#f2f5f8", stroke: "#b8bec8" },
  queue: { fill: "#f7f6f1", stroke: "#b8bec8" },
  external: { fill: "#ffffff", stroke: "#a3a9b3", dash: "4 3" },
  actor: { fill: "#f4f4f5", stroke: "#b8bec8" },
};

const EDGE: Record<string, { stroke: string; dash?: string }> = {
  call: { stroke: "#5b6270" },
  async: { stroke: "#5b6270", dash: "5 4" },
  data: { stroke: "#8b93a1" },
};

export interface DebugOptions {
  /** Outline every text bbox, to see collisions. */
  boxes?: boolean;
}

export function debugSvg(s: Scene, opts: DebugOptions = {}): string {
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(s.width)}" height="${r2(s.height)}" viewBox="0 0 ${r2(s.width)} ${r2(s.height)}" font-family="Inter, Helvetica Neue, Helvetica, Arial, sans-serif">`,
  );
  out.push(`<rect width="${r2(s.width)}" height="${r2(s.height)}" fill="#ffffff"/>`);
  // Rows are not drawn (D7); groups are, behind everything else.
  const frame = frameParts(s);
  out.push(...frame.behind);
  const texts = [s.title];
  for (const e of s.edges) {
    const st = EDGE[e.kind] ?? { stroke: "#555" };
    const d = e.points.map((p, i) => `${i === 0 ? "M" : "L"}${r2(p.x)} ${r2(p.y)}`).join(" ");
    out.push(
      `<path d="${d}" fill="none" stroke="${st.stroke}" stroke-width="1"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""}/>`,
    );
    out.push(`<path d="${arrow(e.points)}" fill="${st.stroke}"/>`);
  }
  for (const n of s.nodes) {
    const st = NODE[n.kind] ?? { fill: "#fff", stroke: "#999" };
    const stroke = n.accent ? "#2f6fde" : st.stroke;
    const fill = n.accent ? "#eef4ff" : st.fill;
    out.push(
      `<rect x="${r2(n.rect.x + 0.5)}" y="${r2(n.rect.y + 0.5)}" width="${r2(n.rect.w - 1)}" height="${r2(n.rect.h - 1)}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""}/>`,
    );
    texts.push(...n.texts);
  }
  for (const e of s.edges) if (e.label) texts.push(e.label);
  for (const t of texts) {
    const colour =
      t.role === "node-sublabel" ? "#6b7280" : t.role === "edge-label" ? "#4b5260" : "#1f2430";
    for (const r of t.runs) {
      const weight = r.face.endsWith("600") ? 600 : 400;
      out.push(
        `<text x="${r2(r.x)}" y="${r2(r.y)}" font-size="${r.size}" font-weight="${weight}" fill="${colour}">${esc(r.text)}</text>`,
      );
    }
    if (opts.boxes) {
      const b = t.bbox;
      out.push(
        `<rect x="${r2(b.x)}" y="${r2(b.y)}" width="${r2(b.w)}" height="${r2(b.h)}" fill="none" stroke="#e5484d" stroke-width="0.5"/>`,
      );
    }
  }
  out.push(...frame.front);
  out.push("</svg>");
  return `${out.join("\n")}\n`;
}

function arrow(pts: Point[]): string {
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (tip === undefined || prev === undefined) return "";
  const dx = Math.sign(tip.x - prev.x);
  const dy = Math.sign(tip.y - prev.y);
  const len = 7;
  const half = 3.5;
  const bx = tip.x - dx * len;
  const by = tip.y - dy * len;
  return `M${r2(tip.x)} ${r2(tip.y)} L${r2(bx - dy * half)} ${r2(by + dx * half)} L${r2(bx + dy * half)} ${r2(by - dx * half)} Z`;
}

const FAMILY: Record<string, string> = {
  "inter-400": 'font-family="Inter" font-weight="400"',
  "inter-600": 'font-family="Inter" font-weight="600"',
  "noto-400": 'font-family="Noto Sans SC" font-weight="400"',
  "noto-600": 'font-family="Noto Sans SC" font-weight="600"',
};

function realText(t: PlacedText, fill: string): string[] {
  return t.runs.map(
    (r) =>
      `<text x="${r2(r.x)}" y="${r2(r.y)}" ${FAMILY[r.face] ?? ""} font-size="${r.size}" fill="${fill}" xml:space="preserve">${esc(r.text)}</text>`,
  );
}

/**
 * What the phase 1 renderer does not draw yet, in the target's paint: group
 * boxes and labels behind everything, and the subtitle, legend and footnote in
 * front. For viewing the layout through the real renderer before the phase 1b
 * renderer lands; nothing depends on it.
 */
export function frameParts(s: Scene): { behind: string[]; front: string[] } {
  const behind: string[] = [];
  for (const g of s.groups ?? []) {
    const r = g.rect;
    behind.push(
      `<rect x="${r2(r.x)}" y="${r2(r.y)}" width="${r2(r.w)}" height="${r2(r.h)}" rx="8" fill="#f5f6f8" stroke="#d5d9df" stroke-width="1"/>`,
      ...realText(g.label, "#4b525c"),
    );
  }
  const front: string[] = [];
  if (s.subtitle) front.push(...realText(s.subtitle, "#6b727c"));
  for (const it of s.legend ?? []) {
    const { x1, x2, y } = it.sample;
    const dash = it.style === "dashed" ? ' stroke-dasharray="5 3"' : "";
    front.push(
      `<path d="M${r2(x1)} ${r2(y)}L${r2(x2 - 7)} ${r2(y)}" fill="none" stroke="#6f7681" stroke-width="1.25"${dash}/>`,
      `<path d="M${r2(x2)} ${r2(y)}L${r2(x2 - 7)} ${r2(y + 3)}L${r2(x2 - 7)} ${r2(y - 3)}Z" fill="#6f7681"/>`,
      ...realText(it.label, "#6b727c"),
    );
  }
  if (s.note) front.push(...realText(s.note, "#6b727c"));
  return { behind, front };
}

export function debugPng(svg: string, zoom = 1.5): Buffer {
  return new Resvg(svg, {
    fitTo: { mode: "zoom", value: zoom },
    font: { loadSystemFonts: true, defaultFontFamily: "Helvetica" },
  })
    .render()
    .asPng();
}

/** The same SVG cropped to one region, to look at it up close. */
export function crop(svg: string, x: number, y: number, w: number, h: number): string {
  return svg.replace(
    /^<svg [^>]*?width="[^"]*" height="[^"]*" viewBox="[^"]*"/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"`,
  );
}
