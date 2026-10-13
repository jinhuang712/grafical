// The SVG writer (DESIGN.md D13, D15). Fixed element and attribute order, no
// timestamps, numbers with at most 2 decimals. Pure: no Node APIs.
//
// Draw order: background, groups, edges and their labels, the dots where lines
// merge, nodes and their texts, title, subtitle, legend, footnote. Layer rows are
// not drawn (D7).
// Nodes come after edges so that ports look clean.

import type { PlacedText, Point, Rect, Scene, SceneEdge, SceneGroup, SceneNode } from "../scene.ts";
import { FONT_FAMILY } from "../text/faces.ts";
import { FRAME } from "../theme/geometry.ts";
import { hasHead, lineLook, PAINT, type Paint, STYLE_KIND } from "../theme/paint.ts";
import { meetOutline } from "../theme/shapes.ts";
import { markShape } from "./marks.ts";

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

function nodeShape(n: SceneNode, P: Paint): string[] {
  const p = P.node;
  const kind: { fill: string; stroke: string; dash?: string } = p.kinds[n.kind];
  const stroke = n.accent ? p.accent.stroke : kind.stroke;
  const fill = n.accent ? p.accent.fill : kind.fill;
  const sw = n.accent ? p.accent.strokeWidth : p.strokeWidth;
  if (n.kind === "store") return cylinder(n.rect, fill, stroke, sw);
  if (n.kind === "initial" || n.kind === "final") {
    // A start is a filled dot; an end is a ring around a smaller dot.
    const rad = n.rect.w / 2;
    const cx = num(n.rect.x + rad);
    const cy = num(n.rect.y + rad);
    const out = [
      `<circle cx="${cx}" cy="${cy}" r="${num(rad)}" fill="${fill}" stroke="${stroke}" stroke-width="${num(sw)}"/>`,
    ];
    if (n.kind === "final") {
      out.push(`<circle cx="${cx}" cy="${cy}" r="${num(rad - 5)}" fill="${stroke}"/>`);
    }
    return out;
  }
  if (n.kind === "decision") {
    const r = n.rect;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const d = `M${num(cx)} ${num(r.y)}L${num(r.x + r.w)} ${num(cy)}L${num(cx)} ${num(r.y + r.h)}L${num(r.x)} ${num(cy)}Z`;
    return [
      `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${num(sw)}"${dashAttr(kind.dash)}/>`,
    ];
  }
  // An actor and a terminal are pills; a state is rounder than a box (D34).
  const pill = n.kind === "actor" || n.kind === "terminal";
  const rx = pill ? n.rect.h / 2 : n.kind === "state" ? p.stateRadius : p.radius;
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

/** The head is a small filled triangle with its tip at `tip`, pointing along `dir`. */
function arrowHead(
  tip: Point,
  from: Point,
  fill: string,
  size: { length: number; halfWidth: number },
): { d: string; base: Point } | undefined {
  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return undefined;
  const ux = dx / len;
  const uy = dy / len;
  const l = Math.min(size.length, len);
  const bx = tip.x - ux * l;
  const by = tip.y - uy * l;
  const h = size.halfWidth;
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

/** Radius of the hop a line makes over another where the two cross (D33). */
const HOP = 4;

/** The x where one horizontal stretch of a line, at y, crosses another line's vertical stretch. */
interface Hop {
  y: number;
  xs: number[];
}

/**
 * Where each line's horizontal stretches cross another line's vertical one (D33).
 * The horizontal line hops there, so that a crossing never reads as a join.
 */
function hopsOf(edges: SceneEdge[]): Map<string, Hop[]> {
  const across: { id: string; y: number; lo: number; hi: number }[] = [];
  const down: { id: string; x: number; lo: number; hi: number }[] = [];
  for (const e of edges) {
    const pts = simplify(e.points);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1] as Point;
      const b = pts[i] as Point;
      if (a.x === b.x)
        down.push({ id: e.id, x: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) });
      else if (a.y === b.y)
        across.push({ id: e.id, y: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) });
    }
  }
  const out = new Map<string, Hop[]>();
  for (const h of across) {
    const xs = down
      .filter((v) => v.id !== h.id && v.x > h.lo && v.x < h.hi && h.y > v.lo && h.y < v.hi)
      .map((v) => v.x);
    if (xs.length === 0) continue;
    const list = out.get(h.id) ?? [];
    list.push({ y: h.y, xs: [...new Set(xs)].sort((a, b) => a - b) });
    out.set(h.id, list);
  }
  return out;
}

/**
 * A straight run of a route, hopping over the crossings on it. Crossings closer
 * than a hop share one wider hop, and a crossing too near the run's ends for a
 * hop is drawn plain.
 */
function straight(from: Point, to: Point, hops: Hop[]): string {
  const end = `L${num(to.x)} ${num(to.y)}`;
  const on = from.y === to.y ? hops.find((h) => h.y === from.y) : undefined;
  if (on === undefined) return end;
  const dir = Math.sign(to.x - from.x);
  const xs = on.xs
    .filter((x) => (x - from.x) * dir > HOP + 1 && (to.x - x) * dir > HOP + 1)
    .sort((a, b) => (a - b) * dir);
  let d = "";
  for (let k = 0; k < xs.length; ) {
    let last = k;
    while (
      last + 1 < xs.length &&
      Math.abs((xs[last + 1] as number) - (xs[last] as number)) < 2 * HOP + 2
    )
      last++;
    const a = (xs[k] as number) - dir * HOP;
    const b = (xs[last] as number) + dir * HOP;
    // Over the top: clockwise when running right, anticlockwise when running left.
    d += `L${num(a)} ${num(from.y)}A${num(Math.abs(b - a) / 2)} ${num(HOP)} 0 0 ${dir > 0 ? 1 : 0} ${num(b)} ${num(from.y)}`;
    k = last + 1;
  }
  return d + end;
}

/** What a curved corner keeps clear of: boxes and labels, and every line. */
interface Room {
  boxes: Rect[];
  lines: { id: string; a: Point; b: Point }[];
}

/** Least distance a curved corner keeps from a box, a label or another line (D33). */
const CURVE_CLEAR = 4;

/** Whether the stretch a-b runs along the stretch c-d for some length. */
function sameStretch(a: Point, b: Point, c: Point, d: Point): boolean {
  if (a.x === b.x && c.x === d.x && a.x === c.x)
    return (
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
        Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) >
      0.5
    );
  if (a.y === b.y && c.y === d.y && a.y === c.y)
    return (
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) >
      0.5
    );
  return false;
}

/**
 * Whether the corner at p, rounded from a to b, keeps clear of every box, label and
 * line, except the lines that run along its own two stretches, such as a trunk's.
 */
function clearCorner(
  id: string,
  prev: Point,
  p: Point,
  next: Point,
  a: Point,
  b: Point,
  room: Room,
): boolean {
  for (const t of [0.25, 0.5, 0.75]) {
    const u = 1 - t;
    const q = {
      x: u * u * a.x + 2 * u * t * p.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * p.y + t * t * b.y,
    };
    for (const r of room.boxes) {
      if (
        q.x > r.x - CURVE_CLEAR &&
        q.x < r.x + r.w + CURVE_CLEAR &&
        q.y > r.y - CURVE_CLEAR &&
        q.y < r.y + r.h + CURVE_CLEAR
      )
        return false;
    }
    for (const l of room.lines) {
      if (l.id === id || sameStretch(l.a, l.b, prev, p) || sameStretch(l.a, l.b, p, next)) continue;
      const x = Math.min(Math.max(q.x, Math.min(l.a.x, l.b.x)), Math.max(l.a.x, l.b.x));
      const y = Math.min(Math.max(q.y, Math.min(l.a.y, l.b.y)), Math.max(l.a.y, l.b.y));
      if (Math.hypot(q.x - x, q.y - y) < CURVE_CLEAR) return false;
    }
  }
  return true;
}

/**
 * A route as a path with corners rounded by a quadratic curve, hopping over
 * crossings. In the curved style a corner is as round as half of each of its two
 * stretches, halved while it would come near a box, a label or another line, and
 * never less round than the orthogonal style (D33).
 */
function roundedPath(pts: Point[], P: Paint, hops: Hop[] = [], room?: Room, id = ""): string {
  const first = pts[0] as Point;
  let d = `M${num(first.x)} ${num(first.y)}`;
  let at = first;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i] as Point;
    const prev = pts[i - 1] as Point;
    const next = pts[i + 1];
    if (!next) {
      d += straight(at, p, hops);
      break;
    }
    const inLen = Math.hypot(p.x - prev.x, p.y - prev.y);
    const outLen = Math.hypot(next.x - p.x, next.y - p.y);
    const ends = (r: number): [Point, Point] => [
      { x: p.x - ((p.x - prev.x) / inLen) * r, y: p.y - ((p.y - prev.y) / inLen) * r },
      { x: p.x + ((next.x - p.x) / outLen) * r, y: p.y + ((next.y - p.y) / outLen) * r },
    ];
    let r = Math.min(P.edge.cornerRadius, inLen / 2, outLen / 2);
    if (P.edge.shape === "curved" && room !== undefined) {
      let round = Math.min(inLen / 2, outLen / 2);
      while (round > r && !clearCorner(id, prev, p, next, ...ends(round), room)) round /= 2;
      if (round > r) r = round;
    }
    const [{ x: ax, y: ay }, { x: bx, y: by }] = ends(r);
    d += `${straight(at, { x: ax, y: ay }, hops)}Q${num(p.x)} ${num(p.y)} ${num(bx)} ${num(by)}`;
    at = { x: bx, y: by };
  }
  return d;
}

/** Whether p lies on the route. */
function onRoute(pts: Point[], p: Point): boolean {
  return pts.some((a, i) => {
    const b = pts[i + 1];
    if (b === undefined) return false;
    if (a.x === b.x) return p.x === a.x && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
    return p.y === a.y && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x);
  });
}

/** Whether the straight stretch s-t runs along the route for some length. */
function alongRoute(pts: Point[], s: Point, t: Point): boolean {
  return pts.some((a, i) => {
    const b = pts[i + 1];
    if (b === undefined) return false;
    if (s.x === t.x && a.x === b.x && a.x === s.x)
      return (
        Math.min(Math.max(a.y, b.y), Math.max(s.y, t.y)) -
          Math.max(Math.min(a.y, b.y), Math.min(s.y, t.y)) >
        0.5
      );
    if (s.y === t.y && a.y === b.y && a.y === s.y)
      return (
        Math.min(Math.max(a.x, b.x), Math.max(s.x, t.x)) -
          Math.max(Math.min(a.x, b.x), Math.min(s.x, t.x)) >
        0.5
      );
    return false;
  });
}

/**
 * Where a line leaves another it ran along, or joins one: a merge on purpose,
 * such as the branch of a trunk, which a dot marks (D33).
 */
function joinsOf(edges: SceneEdge[]): { at: Point; edge: SceneEdge }[] {
  const routes = edges.map((e) => ({ e, pts: simplify(e.points) }));
  const out = new Map<string, { at: Point; edge: SceneEdge }>();
  for (const b of routes) {
    for (let i = 1; i < b.pts.length - 1; i++) {
      const p = b.pts[i] as Point;
      const before = b.pts[i - 1] as Point;
      const after = b.pts[i + 1] as Point;
      for (const a of routes) {
        if (a === b || !onRoute(a.pts, p)) continue;
        if (alongRoute(a.pts, before, p) !== alongRoute(a.pts, p, after))
          out.set(`${p.x},${p.y}`, { at: p, edge: b.e });
      }
    }
  }
  return [...out.values()];
}

/** Moves a route's end from its box's side onto the drawn outline (D34). */
function ontoOutline(end: Point, next: Point, n: SceneNode | undefined): Point {
  return n === undefined ? end : meetOutline(n.kind, n.rect, end, next);
}

/** The line stops at the arrowhead's base, if its kind has one (D8, D33). */
function edgeShapes(
  e: SceneEdge,
  nodes: Map<string, SceneNode>,
  P: Paint,
  hops: Hop[] = [],
  room?: Room,
): string[] {
  const paint = P.edge;
  const kind: { stroke: string; dash?: string } = paint.kinds[e.kind];
  const look = lineLook(e.width, P);
  const pts = simplify(e.points);
  if (pts.length < 2) return [];
  pts[0] = ontoOutline(pts[0] as Point, pts[1] as Point, nodes.get(e.from));
  const last = pts.length - 1;
  pts[last] = ontoOutline(pts[last] as Point, pts[last - 1] as Point, nodes.get(e.to));
  const tip = pts[pts.length - 1] as Point;
  const head = hasHead(e.kind)
    ? arrowHead(tip, pts[pts.length - 2] as Point, kind.stroke, look.arrow)
    : undefined;
  if (head) pts[pts.length - 1] = head.base;
  // A two-way edge gets a second head at its start (D33).
  const tail =
    e.both === true && hasHead(e.kind)
      ? arrowHead(pts[0] as Point, pts[1] as Point, kind.stroke, look.arrow)
      : undefined;
  if (tail) pts[0] = tail.base;
  const out = [
    `<path d="${roundedPath(pts, P, hops, room, e.id)}" fill="none" stroke="${kind.stroke}" stroke-width="${num(look.strokeWidth)}"${dashAttr(kind.dash)}/>`,
  ];
  if (head) out.push(head.d);
  if (tail) out.push(tail.d);
  return out;
}

function legendShapes(scene: Scene, P: Paint): string[] {
  const out: string[] = [];
  const paint = P.edge;
  const stroke = paint.kinds.call.stroke;
  for (const item of scene.legend ?? []) {
    const { x1, x2, y } = item.sample;
    const look = lineLook(item.width, P);
    const head = hasHead(STYLE_KIND[item.style])
      ? arrowHead({ x: x2, y }, { x: x1, y }, stroke, look.arrow)
      : undefined;
    const end = head ? head.base.x : x2;
    const dash = paint.kinds[STYLE_KIND[item.style]].dash;
    out.push(
      `<path d="M${num(x1)} ${num(y)}L${num(end)} ${num(y)}" fill="none" stroke="${stroke}" stroke-width="${num(look.strokeWidth)}"${dashAttr(dash)}/>`,
    );
    if (head) out.push(head.d);
    out.push(...texts(item.label, P.text.legend));
  }
  return out;
}

/** A colour a share of the way from one #rrggbb colour to another. */
function mix(from: string, to: string, share: number): string {
  const channel = (c: string, k: number) => Number.parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16);
  const hex = [0, 1, 2].map((k) => {
    const v = Math.round(channel(from, k) + (channel(to, k) - channel(from, k)) * share);
    return v.toString(16).padStart(2, "0");
  });
  return `#${hex.join("")}`;
}

/**
 * A box inside a box is told apart by its fill (D34): the group fill and the
 * background take turns by depth, or each level is a third of the way nearer the
 * border colour.
 */
function groupFill(g: SceneGroup, P: Paint): string {
  const depth = g.depth ?? 1;
  if (P.nesting === "shade") return mix(P.group.fill, P.group.stroke, (depth - 1) / 3);
  return depth % 2 === 0 ? P.background : P.group.fill;
}

function groupShapes(g: SceneGroup, P: Paint): string[] {
  const p = P.group;
  const out = [
    `<rect ${rectAttrs(g.rect)} rx="${num(p.radius)}" fill="${groupFill(g, P)}" stroke="${p.stroke}" stroke-width="${num(p.strokeWidth)}"/>`,
  ];
  for (const r of g.label.runs) {
    const light = FONT_FAMILY[r.face].weight < 600;
    out.push(
      ...texts({ ...g.label, runs: [r] }, light ? P.text.groupLabelMuted : P.text.groupLabel),
    );
  }
  if (g.sublabel) out.push(...texts(g.sublabel, P.text.groupLabelMuted));
  return out;
}

export function renderSvg(scene: Scene): string {
  // The scene carries its theme's paint (D30); a scene without one is the default theme.
  const P = scene.paint ?? PAINT;
  const w = num(scene.width);
  const h = num(scene.height);
  const out: string[] = [];
  const title = plain(scene.title) || "Diagram";
  const groups = scene.groups ?? [];
  const groupNames = groups.map((g) => g.label.runs[0]?.text ?? g.id).join(", ");
  const nodeWord = scene.nodes.length === 1 ? "node" : "nodes";
  const edgeWord = scene.edges.length === 1 ? "edge" : "edges";
  const lanes = scene.lanes ?? [];
  const laneNames = lanes.map((x) => plain(x.label) || x.id).join(", ");
  const desc =
    (lanes.length > 0 ? `Lanes: ${laneNames}. ` : "") +
    `Groups: ${groupNames || "none"}. ` +
    `${scene.nodes.length} ${nodeWord}, ${scene.edges.length} ${edgeWord}.`;

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">`,
    `<title>${escapeXml(title)}</title>`,
    `<desc>${escapeXml(desc)}</desc>`,
    `<rect width="${w}" height="${h}" fill="${P.background}"/>`,
  );

  // Lanes lie behind everything else (D32); lanes side by side share a border.
  const lp = P.lane;
  const lane = `stroke="${lp.stroke}" stroke-width="${num(lp.strokeWidth)}"`;
  for (const x of lanes) {
    out.push(
      `<rect ${rectAttrs(x.rect)} rx="${num(lp.radius)}" fill="${lp.fill}" ${lane}/>`,
      `<rect ${rectAttrs(x.head)} rx="${num(lp.radius)}" fill="${lp.headFill}" ${lane}/>`,
      ...texts(x.label, P.text.laneLabel),
    );
  }
  const bp = P.band;
  for (const b of scene.bands ?? []) {
    out.push(
      `<rect ${rectAttrs(b.rect)} rx="${num(bp.radius)}" fill="${bp.fill}" stroke="${bp.stroke}" stroke-width="${num(bp.strokeWidth)}"/>`,
      ...texts(b.label, P.text.groupLabelMuted),
    );
  }
  for (const g of groups) out.push(...groupShapes(g, P));

  const lb = P.edge.labelBackground;
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  const hops = hopsOf(scene.edges);
  const room: Room | undefined =
    P.edge.shape === "curved"
      ? {
          boxes: [
            ...scene.nodes.map((n) => n.rect),
            ...scene.edges.flatMap((e) => (e.label ? [e.label.bbox] : [])),
          ],
          lines: scene.edges.flatMap((e) => {
            const pts = simplify(e.points);
            return pts.slice(1).map((b, i) => ({ id: e.id, a: pts[i] as Point, b }));
          }),
        }
      : undefined;
  for (const e of scene.edges) {
    out.push(...edgeShapes(e, byId, P, hops.get(e.id), room));
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
      // The innermost box the label sits in: boxes come outer first.
      const inGroup = groups.findLast(
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
      const inLane = lanes.some(
        (x) =>
          cx >= x.rect.x &&
          cx <= x.rect.x + x.rect.w &&
          cy >= x.rect.y &&
          cy <= x.rect.y + x.rect.h,
      );
      const behind = inGroup
        ? groupFill(inGroup, P)
        : inBand
          ? P.band.fill
          : inLane
            ? P.lane.fill
            : lb.fill;
      out.push(
        `<rect ${rectAttrs(bg)} rx="${num(lb.radius)}" fill="${behind}"/>`,
        ...texts(e.label, P.text.edgeLabel),
      );
    }
  }

  for (const j of joinsOf(scene.edges)) {
    const r = lineLook(j.edge.width, P).strokeWidth + 1.5;
    out.push(
      `<circle cx="${num(j.at.x)}" cy="${num(j.at.y)}" r="${num(r)}" fill="${P.edge.kinds[j.edge.kind].stroke}"/>`,
    );
  }

  for (const n of scene.nodes) {
    out.push(...nodeShape(n, P));
    for (const t of n.texts) {
      out.push(...texts(t, t.role === "node-sublabel" ? P.text.nodeSublabel : P.text.nodeLabel));
    }
    for (const m of n.marks ?? []) out.push(...markShape(m));
  }

  out.push(...texts(scene.title, P.text.title));
  if (scene.subtitle) out.push(...texts(scene.subtitle, P.text.subtitle));
  out.push(...legendShapes(scene, P));
  if (scene.note) out.push(...texts(scene.note, P.text.note));
  out.push("</svg>");
  return `${out.join("\n")}\n`;
}
