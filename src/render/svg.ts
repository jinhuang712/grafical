// The SVG writer (DESIGN.md D13, D15). Fixed element and attribute order, no
// timestamps, numbers with at most 2 decimals. Pure: no Node APIs.
//
// Draw order: background, groups, edges and their labels, nodes and their
// texts, title, subtitle, legend, footnote. Layer rows are not drawn (D7).
// Nodes come after edges so that ports look clean.

import type { PlacedText, Point, Rect, Scene, SceneEdge, SceneGroup, SceneNode } from "../scene.ts";
import { FONT_FAMILY } from "../text/faces.ts";
import { FRAME } from "../theme/geometry.ts";
import { PAINT } from "../theme/paint.ts";

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
    const f = FONT_FAMILY[r.face];
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
  if (n.kind === "store") return cylinder(n.rect, fill, stroke, sw);
  const rx = n.kind === "actor" ? n.rect.h / 2 : p.radius;
  return [
    `<rect ${rectAttrs(n.rect)} rx="${num(rx)}" fill="${fill}" stroke="${stroke}" stroke-width="${num(sw)}"${dashAttr(kind.dash)}/>`,
  ];
}

/**
 * A store is a cylinder inside its box: straight sides, an elliptical lid seen
 * from a little above, and the curved front of its bottom. The lid's back edge
 * touches the box top and the bottom's front edge the box bottom, so lines meet
 * the shape where they meet the box at its middle.
 */
function cylinder(r: Rect, fill: string, stroke: string, sw: number): string[] {
  const ry = FRAME.storeLid;
  const hw = r.w / 2;
  const x0 = r.x;
  const x1 = r.x + r.w;
  const top = r.y + ry;
  const bottom = r.y + r.h - ry;
  const arc = (x: number, y: number, sweep: 0 | 1) =>
    `A${num(hw)} ${num(ry)} 0 0 ${sweep} ${num(x)} ${num(y)}`;
  const body =
    `M${num(x0)} ${num(top)}${arc(x1, top, 1)}L${num(x1)} ${num(bottom)}` +
    `${arc(x0, bottom, 1)}Z`;
  const lid = `M${num(x0)} ${num(top)}${arc(x1, top, 0)}`;
  return [
    `<path d="${body}" fill="${fill}" stroke="${stroke}" stroke-width="${num(sw)}"/>`,
    `<path d="${lid}" fill="none" stroke="${stroke}" stroke-width="${num(sw)}"/>`,
  ];
}

/**
 * How far below the box top (or above the box bottom) a store's outline lies at
 * x: the lid and the bottom are half-ellipses, so the outline leaves the box edge
 * away from the middle. 0 for every other kind.
 */
function outlineInset(n: SceneNode, x: number): number {
  if (n.kind !== "store") return 0;
  const ry = FRAME.storeLid;
  const hw = n.rect.w / 2;
  const d = Math.min(1, Math.abs(x - (n.rect.x + hw)) / hw);
  return ry - ry * Math.sqrt(1 - d * d);
}

/** The head is a small filled triangle with its tip at `tip`, pointing along `dir`. */
function arrowHead(tip: Point, from: Point, fill: string): { d: string; base: Point } | undefined {
  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return undefined;
  const ux = dx / len;
  const uy = dy / len;
  const l = Math.min(PAINT.edge.arrow.length, len);
  const bx = tip.x - ux * l;
  const by = tip.y - uy * l;
  const h = PAINT.edge.arrow.halfWidth;
  return {
    d:
      `<path d="M${num(tip.x)} ${num(tip.y)}L${num(bx - uy * h)} ${num(by + ux * h)}` +
      `L${num(bx + uy * h)} ${num(by - ux * h)}Z" fill="${fill}"/>`,
    base: { x: bx, y: by },
  };
}

/** Drops repeated points and points in the middle of a straight run. */
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    out.push({ x: p.x, y: p.y });
  }
  for (let i = out.length - 2; i > 0; i--) {
    const a = out[i - 1] as Point;
    const b = out[i] as Point;
    const c = out[i + 1] as Point;
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) out.splice(i, 1);
  }
  return out;
}

/** A route as a path with corners rounded by a quadratic curve. */
function roundedPath(pts: Point[]): string {
  const first = pts[0] as Point;
  let d = `M${num(first.x)} ${num(first.y)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i] as Point;
    const prev = pts[i - 1] as Point;
    const next = pts[i + 1];
    if (!next) {
      d += `L${num(p.x)} ${num(p.y)}`;
      break;
    }
    const inLen = Math.hypot(p.x - prev.x, p.y - prev.y);
    const outLen = Math.hypot(next.x - p.x, next.y - p.y);
    const r = Math.min(PAINT.edge.cornerRadius, inLen / 2, outLen / 2);
    const ax = p.x - ((p.x - prev.x) / inLen) * r;
    const ay = p.y - ((p.y - prev.y) / inLen) * r;
    const bx = p.x + ((next.x - p.x) / outLen) * r;
    const by = p.y + ((next.y - p.y) / outLen) * r;
    d += `L${num(ax)} ${num(ay)}Q${num(p.x)} ${num(p.y)} ${num(bx)} ${num(by)}`;
  }
  return d;
}

/**
 * Moves an end that meets a store's top or bottom side onto its curved outline.
 * `next` is the route's point beside the end.
 */
function ontoOutline(end: Point, next: Point, n: SceneNode | undefined): Point {
  if (n === undefined || end.x !== next.x) return end;
  const inset = outlineInset(n, end.x);
  if (inset === 0) return end;
  if (Math.abs(end.y - n.rect.y) < 0.01 && next.y < end.y) return { x: end.x, y: end.y + inset };
  const bottom = n.rect.y + n.rect.h;
  if (Math.abs(end.y - bottom) < 0.01 && next.y > end.y) return { x: end.x, y: end.y - inset };
  return end;
}

/** The line stops at the arrowhead's base. Only solid and dashed exist (D8). */
function edgeShapes(e: SceneEdge, nodes: Map<string, SceneNode>): string[] {
  const paint = PAINT.edge;
  const kind: { stroke: string; dash?: string } = paint.kinds[e.kind];
  const pts = simplify(e.points);
  if (pts.length < 2) return [];
  pts[0] = ontoOutline(pts[0] as Point, pts[1] as Point, nodes.get(e.from));
  const last = pts.length - 1;
  pts[last] = ontoOutline(pts[last] as Point, pts[last - 1] as Point, nodes.get(e.to));
  const tip = pts[pts.length - 1] as Point;
  const head = arrowHead(tip, pts[pts.length - 2] as Point, kind.stroke);
  if (head) pts[pts.length - 1] = head.base;
  const out = [
    `<path d="${roundedPath(pts)}" fill="none" stroke="${kind.stroke}" stroke-width="${num(paint.strokeWidth)}"${dashAttr(kind.dash)}/>`,
  ];
  if (head) out.push(head.d);
  return out;
}

function legendShapes(scene: Scene): string[] {
  const out: string[] = [];
  const paint = PAINT.edge;
  const stroke = paint.kinds.call.stroke;
  for (const item of scene.legend ?? []) {
    const { x1, x2, y } = item.sample;
    const head = arrowHead({ x: x2, y }, { x: x1, y }, stroke);
    const end = head ? head.base.x : x2;
    const dash = item.style === "dashed" ? paint.legendDash : undefined;
    out.push(
      `<path d="M${num(x1)} ${num(y)}L${num(end)} ${num(y)}" fill="none" stroke="${stroke}" stroke-width="${num(paint.strokeWidth)}"${dashAttr(dash)}/>`,
    );
    if (head) out.push(head.d);
    out.push(...texts(item.label, PAINT.text.legend));
  }
  return out;
}

function groupShapes(g: SceneGroup): string[] {
  const p = PAINT.group;
  const out = [
    `<rect ${rectAttrs(g.rect)} rx="${num(p.radius)}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${num(p.strokeWidth)}"/>`,
  ];
  for (const r of g.label.runs) {
    const light = FONT_FAMILY[r.face].weight < 600;
    out.push(
      ...texts(
        { ...g.label, runs: [r] },
        light ? PAINT.text.groupLabelMuted : PAINT.text.groupLabel,
      ),
    );
  }
  if (g.sublabel) out.push(...texts(g.sublabel, PAINT.text.groupLabelMuted));
  return out;
}

export function renderSvg(scene: Scene): string {
  const w = num(scene.width);
  const h = num(scene.height);
  const out: string[] = [];
  const title = plain(scene.title) || "Diagram";
  const groups = scene.groups ?? [];
  const groupNames = groups.map((g) => g.label.runs[0]?.text ?? g.id).join(", ");
  const nodeWord = scene.nodes.length === 1 ? "node" : "nodes";
  const edgeWord = scene.edges.length === 1 ? "edge" : "edges";
  const desc =
    `Groups: ${groupNames || "none"}. ` +
    `${scene.nodes.length} ${nodeWord}, ${scene.edges.length} ${edgeWord}.`;

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">`,
    `<title>${escapeXml(title)}</title>`,
    `<desc>${escapeXml(desc)}</desc>`,
    `<rect width="${w}" height="${h}" fill="${PAINT.background}"/>`,
  );

  const bp = PAINT.band;
  for (const b of scene.bands ?? []) {
    out.push(
      `<rect ${rectAttrs(b.rect)} rx="${num(bp.radius)}" fill="${bp.fill}" stroke="${bp.stroke}" stroke-width="${num(bp.strokeWidth)}"/>`,
      ...texts(b.label, PAINT.text.groupLabelMuted),
    );
  }
  for (const g of groups) out.push(...groupShapes(g));

  const lb = PAINT.edge.labelBackground;
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  for (const e of scene.edges) {
    out.push(...edgeShapes(e, byId));
    if (e.label) {
      const b = e.label.bbox;
      const bg: Rect = {
        x: b.x - lb.padX,
        y: b.y - lb.padY,
        w: b.w + 2 * lb.padX,
        h: b.h + 2 * lb.padY,
      };
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const inGroup = groups.find(
        (g) =>
          cx >= g.rect.x &&
          cx <= g.rect.x + g.rect.w &&
          cy >= g.rect.y &&
          cy <= g.rect.y + g.rect.h,
      );
      const inBand = (scene.bands ?? []).some(
        (b) =>
          cx >= b.rect.x &&
          cx <= b.rect.x + b.rect.w &&
          cy >= b.rect.y &&
          cy <= b.rect.y + b.rect.h,
      );
      const behind = inGroup ? PAINT.group.fill : inBand ? PAINT.band.fill : lb.fill;
      out.push(
        `<rect ${rectAttrs(bg)} rx="${num(lb.radius)}" fill="${behind}"/>`,
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
  if (scene.subtitle) out.push(...texts(scene.subtitle, PAINT.text.subtitle));
  out.push(...legendShapes(scene));
  if (scene.note) out.push(...texts(scene.note, PAINT.text.note));
  out.push("</svg>");
  return `${out.join("\n")}\n`;
}
