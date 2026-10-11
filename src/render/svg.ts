// The SVG writer (DESIGN.md D13, D15). Fixed element and attribute order, no
// timestamps, numbers with at most 2 decimals. Pure: no Node APIs.
//
// Draw order: background, layer bands and labels, edges and labels, nodes and
// their texts, title. Nodes come after edges so that ports look clean.

import type { PlacedText, Point, Rect, Scene, SceneEdge, SceneNode } from "../scene.ts";
import { PAINT } from "../theme/paint.ts";
import { FACE_FONT } from "./faces.ts";

/** At most 2 decimals, no trailing zeros, never "-0". */
export function num(v: number): string {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? "0" : String(r);
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: strips characters XML cannot hold
const XML_ILLEGAL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

export function escapeXml(s: string): string {
  return s
    .replace(XML_ILLEGAL, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plain(t: PlacedText): string {
  return t.runs.map((r) => r.text).join("");
}

function texts(t: PlacedText, fill: string): string[] {
  return t.runs.map((r) => {
    const f = FACE_FONT[r.face];
    return (
      `<text x="${num(r.x)}" y="${num(r.y)}" font-family="${f.family}" font-size="${num(r.size)}" ` +
      `font-weight="${f.weight}" fill="${fill}" xml:space="preserve">${escapeXml(r.text)}</text>`
    );
  });
}

function rectAttrs(r: Rect): string {
  return `x="${num(r.x)}" y="${num(r.y)}" width="${num(r.w)}" height="${num(r.h)}"`;
}

function dashAttr(dash: string | undefined): string {
  return dash ? ` stroke-dasharray="${dash}"` : "";
}

function nodeShape(n: SceneNode): string[] {
  const p = PAINT.node;
  const kind: { fill: string; stroke: string; dash?: string } = p.kinds[n.kind];
  const stroke = n.accent ? p.accent.stroke : kind.stroke;
  const fill = n.accent ? p.accent.fill : kind.fill;
  const sw = n.accent ? p.accent.strokeWidth : p.strokeWidth;
  const rx = n.kind === "actor" ? n.rect.h / 2 : p.radius;
  const out = [
    `<rect ${rectAttrs(n.rect)} rx="${num(rx)}" fill="${fill}" stroke="${stroke}" stroke-width="${num(sw)}"${dashAttr(kind.dash)}/>`,
  ];
  if (n.kind === "store") {
    const a = p.storeArc;
    const y = n.rect.y + a.inset;
    const x0 = n.rect.x + 1;
    const x1 = n.rect.x + n.rect.w - 1;
    const cx = n.rect.x + n.rect.w / 2;
    out.push(
      `<path d="M${num(x0)} ${num(y)}Q${num(cx)} ${num(y + a.sag * 2)} ${num(x1)} ${num(y)}" fill="none" stroke="${n.accent ? stroke : a.stroke}" stroke-width="${num(p.strokeWidth)}"/>`,
    );
  }
  return out;
}

/** The polyline stops at the arrowhead's base, and the head is a small filled triangle. */
function edgeShapes(e: SceneEdge): string[] {
  const paint = PAINT.edge;
  const kind: { stroke: string; dash?: string } = paint.kinds[e.kind];
  const pts: Point[] = e.points.map((p) => ({ x: p.x, y: p.y }));
  const out: string[] = [];
  const tip = pts[pts.length - 1];
  let prev: Point | undefined;
  for (let i = pts.length - 2; i >= 0; i--) {
    const q = pts[i] as Point;
    if (tip && (q.x !== tip.x || q.y !== tip.y)) {
      prev = q;
      break;
    }
  }
  let head = "";
  if (tip && prev) {
    const dx = tip.x - prev.x;
    const dy = tip.y - prev.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const l = Math.min(paint.arrow.length, len);
    const bx = tip.x - ux * l;
    const by = tip.y - uy * l;
    const h = paint.arrow.halfWidth;
    head =
      `<path d="M${num(tip.x)} ${num(tip.y)}L${num(bx - uy * h)} ${num(by + ux * h)}` +
      `L${num(bx + uy * h)} ${num(by - ux * h)}Z" fill="${kind.stroke}"/>`;
    tip.x = bx;
    tip.y = by;
  }
  const d = pts.map((p) => `${num(p.x)},${num(p.y)}`).join(" ");
  out.push(
    `<polyline points="${d}" fill="none" stroke="${kind.stroke}" stroke-width="${num(paint.strokeWidth)}" stroke-linejoin="round"${dashAttr(kind.dash)}/>`,
  );
  if (head) out.push(head);
  return out;
}

export function renderSvg(scene: Scene): string {
  const w = num(scene.width);
  const h = num(scene.height);
  const out: string[] = [];
  const title = plain(scene.title) || "Diagram";
  const layerNames = scene.layers.map((l) => plain(l.label)).join(", ");
  const nodeWord = scene.nodes.length === 1 ? "node" : "nodes";
  const edgeWord = scene.edges.length === 1 ? "edge" : "edges";
  const desc =
    `Layers: ${layerNames || "none"}. ` +
    `${scene.nodes.length} ${nodeWord}, ${scene.edges.length} ${edgeWord}.`;

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">`,
    `<title>${escapeXml(title)}</title>`,
    `<desc>${escapeXml(desc)}</desc>`,
    `<rect width="${w}" height="${h}" fill="${PAINT.background}"/>`,
  );

  for (const l of scene.layers) {
    out.push(
      `<rect ${rectAttrs(l.band)} rx="${num(PAINT.band.radius)}" fill="${PAINT.band.fill}"/>`,
      ...texts(l.label, PAINT.text.layerLabel),
    );
  }

  const lb = PAINT.edge.labelBackground;
  for (const e of scene.edges) {
    out.push(...edgeShapes(e));
    if (e.label) {
      const b = e.label.bbox;
      const bg: Rect = {
        x: b.x - lb.padX,
        y: b.y - lb.padY,
        w: b.w + 2 * lb.padX,
        h: b.h + 2 * lb.padY,
      };
      out.push(
        `<rect ${rectAttrs(bg)} rx="${num(lb.radius)}" fill="${lb.fill}"/>`,
        ...texts(e.label, PAINT.text.edgeLabel),
      );
    }
  }

  for (const n of scene.nodes) {
    out.push(...nodeShape(n));
    for (const t of n.texts) {
      out.push(
        ...texts(t, t.role === "node-sublabel" ? PAINT.text.nodeSublabel : PAINT.text.nodeLabel),
      );
    }
  }

  out.push(...texts(scene.title, PAINT.text.title));
  out.push("</svg>");
  return `${out.join("\n")}\n`;
}
