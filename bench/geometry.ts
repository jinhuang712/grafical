// The separate geometry check (GOALS.md, "Mechanical defects"; EXPERIMENTS.md): mechanical
// defects found in a rendered SVG, from its shapes alone. It shares no code with
// grafical's checker and does not know what the shapes stand for, so it also
// catches what the renderer gets wrong. It reads flat SVG: rect, ellipse,
// circle, polygon, line, polyline, path and text, without transforms.
//
// What a shape is follows from geometry and paint:
// - a box is a closed shape with an outline that holds no other such shape: a
//   node, or a lane's header; one that holds others is a container (group, lane);
// - a closed shape without an outline, such as an arrowhead or the patch behind
//   a label, is left out;
// - a line is an open path with a stroke, unless it lies inside one box, like the
//   lid of a store's cylinder;
// - a box marked class="bar" is one a line may run across, as grafical marks a
//   bar that a line may pass (DESIGN.md, "A row with no box as one bar"); it is a box for every other test.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatReport, isReport, loadDiagram } from "../src/cli/pipeline.ts";
import { layout } from "../src/layout/index.ts";
import { renderSvg } from "../src/render/index.ts";
import { createMeasurer } from "../src/text/index.ts";
import type { Measurer } from "../src/text/types.ts";
import { RUNS } from "./run.ts";

export type GeometryCode =
  | "overflow"
  | "overlap"
  | "edge-through-node"
  | "label-collision"
  | "edge-overlap";

export interface GeometryDefect {
  code: GeometryCode;
  found: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Pt {
  x: number;
  y: number;
}
interface Shape extends Box {
  closed: boolean;
  outlined: boolean;
  tag: string;
  /** The corners of a closed shape with a slanted side, such as a diamond: tests use the outline, not the box. */
  poly?: Pt[];
  /** A bar that lines may run across. */
  bar?: true;
}
interface Line {
  index: number;
  points: Pt[];
  /** The dash pattern, empty for a solid line. */
  dash: string;
}
interface Text extends Box {
  text: string;
  anchor: Pt;
}

/** A line may end this far inside a box: an arrow meets a curved outline, such as a cylinder's lid. */
const PORT = 8;
/** Two lines must share at least this much length to count as one drawn over the other. */
const SHARED = 8;

const num = (s: string | undefined, d = 0) => (s === undefined ? d : Number.parseFloat(s));

function attrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1] as string] = m[2] as string;
  return out;
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** The points of a path's outline, curves taken as their end points, and whether it closes. */
function pathPoints(d: string): { points: Pt[]; closed: boolean } {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const points: Pt[] = [];
  let i = 0;
  let cmd = "";
  let at: Pt = { x: 0, y: 0 };
  let start: Pt = { x: 0, y: 0 };
  let closed = false;
  const take = () => Number.parseFloat(tokens[i++] ?? "0");
  while (i < tokens.length) {
    const t = tokens[i] as string;
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") {
        closed = true;
        points.push(start);
        at = start;
      }
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const base = rel ? at : { x: 0, y: 0 };
    let next: Pt;
    switch (cmd.toUpperCase()) {
      case "M":
      case "L":
      case "T":
        next = { x: base.x + take(), y: base.y + take() };
        if (cmd.toUpperCase() === "M") {
          start = next;
          cmd = rel ? "l" : "L";
        }
        break;
      case "H":
        next = { x: (rel ? at.x : 0) + take(), y: at.y };
        break;
      case "V":
        next = { x: at.x, y: (rel ? at.y : 0) + take() };
        break;
      case "Q":
      case "S":
        i += 2;
        next = { x: base.x + take(), y: base.y + take() };
        break;
      case "C":
        i += 4;
        next = { x: base.x + take(), y: base.y + take() };
        break;
      case "A":
        i += 5;
        next = { x: base.x + take(), y: base.y + take() };
        break;
      default:
        i++;
        continue;
    }
    points.push(next);
    at = next;
  }
  return { points, closed };
}

function bounds(points: Pt[]): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

const inside = (a: Box, b: Box, tol = 0.5) =>
  a.x >= b.x - tol &&
  a.y >= b.y - tol &&
  a.x + a.w <= b.x + b.w + tol &&
  a.y + a.h <= b.y + b.h + tol;
const overlap = (a: Box, b: Box, tol = 0.5) =>
  a.x < b.x + b.w - tol && a.x + a.w > b.x + tol && a.y < b.y + b.h - tol && a.y + a.h > b.y + tol;
const shrink = (b: Box, d: number): Box => ({
  x: b.x + d,
  y: b.y + d,
  w: b.w - 2 * d,
  h: b.h - 2 * d,
});
const at = (b: Box) =>
  `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}x${Math.round(b.h)}`;

/** Does a closed outline have a slanted side? Boxes, pills and cylinders do not. */
function slanted(points: Pt[]): boolean {
  return points.some((p, k) => {
    const q = points[(k + 1) % points.length] as Pt;
    return Math.abs(q.x - p.x) > 0.5 && Math.abs(q.y - p.y) > 0.5;
  });
}

/** Is p inside the convex outline, by more than `margin` from every side? */
function insideConvex(p: Pt, poly: Pt[], margin: number): boolean {
  let area = 0;
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k] as Pt;
    const b = poly[(k + 1) % poly.length] as Pt;
    area += a.x * b.y - b.x * a.y;
  }
  const turn = Math.sign(area);
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k] as Pt;
    const b = poly[(k + 1) % poly.length] as Pt;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const inward = (turn * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x))) / len;
    if (inward <= margin) return false;
  }
  return true;
}

/** Does the segment a-b run inside a shape: deeper than `port` into a box, or than 2 px into a slanted outline? */
function throughShape(a: Pt, b: Pt, s: Shape, port: number): boolean {
  if (s.poly === undefined) return crosses(a, b, shrink(s, port));
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let k = 0; k <= steps; k++) {
    const p = { x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps };
    if (insideConvex(p, s.poly, 2)) return true;
  }
  return false;
}

/** Does the text box lie inside a shape, its outline if it has a slanted side? */
function textInShape(t: Box, s: Shape): boolean {
  if (s.poly === undefined) return inside(t, s, 1);
  const corners = [
    { x: t.x, y: t.y },
    { x: t.x + t.w, y: t.y },
    { x: t.x, y: t.y + t.h },
    { x: t.x + t.w, y: t.y + t.h },
  ];
  return corners.every((p) => insideConvex(p, s.poly as Pt[], -1));
}

/** Does the segment a-b pass through the inside of r? Segments are axis-parallel or short. */
function crosses(a: Pt, b: Pt, r: Box): boolean {
  if (r.w <= 0 || r.h <= 0) return false;
  // Liang-Barsky clipping against the open box.
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - r.x],
    [dx, r.x + r.w - a.x],
    [-dy, a.y - r.y],
    [dy, r.y + r.h - a.y],
  ] as const) {
    if (p === 0) {
      if (q <= 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 >= t1) return false;
  }
  return t1 - t0 > 1e-9;
}

/** Length that two segments share when they lie on one line. */
function shared(a: Pt, b: Pt, c: Pt, d: Pt): number {
  if (a.y === b.y && c.y === d.y && Math.abs(a.y - c.y) < 0.5) {
    return (
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
      Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
    );
  }
  if (a.x === b.x && c.x === d.x && Math.abs(a.x - c.x) < 0.5) {
    return (
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
      Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
    );
  }
  return 0;
}

/** Reads an SVG's shapes, lines and texts. */
export function readSvg(
  svg: string,
  m: Measurer,
): { shapes: Shape[]; lines: Line[]; texts: Text[]; size: Box } {
  const root = attrs(svg.match(/<svg\b([^>]*)>/)?.[1] ?? "");
  const size: Box = { x: 0, y: 0, w: num(root.width), h: num(root.height) };
  const shapes: Shape[] = [];
  const lines: Line[] = [];
  const texts: Text[] = [];
  const re =
    /<(rect|ellipse|circle|polygon|polyline|line|path|text)\b([^>]*?)(?:\/>|>([^<]*)<\/\1>)/g;
  for (const m2 of svg.matchAll(re)) {
    const tag = m2[1] as string;
    const a = attrs(m2[2] ?? "");
    const outlined = a.stroke !== undefined && a.stroke !== "none" && num(a["stroke-width"], 1) > 0;
    const filled = a.fill !== "none";
    if (tag === "text") {
      const style = {
        size: num(a["font-size"], 12),
        weight: num(a["font-weight"], 400) as 400 | 600,
      };
      const text = unescapeXml(m2[3] ?? "");
      const metrics = m.metrics(style);
      const w = m.measure(text, style).width;
      const x0 = num(a.x);
      const anchor = a["text-anchor"];
      const x = anchor === "middle" ? x0 - w / 2 : anchor === "end" ? x0 - w : x0;
      const y = num(a.y);
      texts.push({
        text,
        x,
        y: y - metrics.ascent,
        w,
        h: metrics.ascent + metrics.descent,
        anchor: { x: x0, y },
      });
      continue;
    }
    let box: Box;
    let points: Pt[] = [];
    let closed = true;
    if (tag === "rect") box = { x: num(a.x), y: num(a.y), w: num(a.width), h: num(a.height) };
    else if (tag === "ellipse" || tag === "circle") {
      const rx = num(a.rx ?? a.r);
      const ry = num(a.ry ?? a.r);
      box = { x: num(a.cx) - rx, y: num(a.cy) - ry, w: 2 * rx, h: 2 * ry };
    } else if (tag === "line") {
      points = [
        { x: num(a.x1), y: num(a.y1) },
        { x: num(a.x2), y: num(a.y2) },
      ];
      closed = false;
      box = bounds(points);
    } else if (tag === "polygon" || tag === "polyline") {
      const ns = (a.points ?? "").match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      for (let k = 0; k + 1 < ns.length; k += 2)
        points.push({ x: ns[k] as number, y: ns[k + 1] as number });
      closed = tag === "polygon";
      box = bounds(points);
    } else {
      const p = pathPoints(a.d ?? "");
      points = p.points;
      closed = p.closed && filled;
      if (points.length === 0) continue;
      box = bounds(points);
    }
    if (closed) {
      const shape: Shape = { ...box, closed, outlined, tag };
      if (a.class === "bar") shape.bar = true;
      if (points.length >= 3 && slanted(points)) shape.poly = points;
      shapes.push(shape);
    } else if (outlined)
      lines.push({ index: lines.length, points, dash: a["stroke-dasharray"] ?? "" });
  }
  return { shapes, lines, texts, size };
}

/** The mechanical defects of a rendered SVG. */
export function checkSvg(svg: string, m: Measurer): GeometryDefect[] {
  const { shapes, lines, texts, size } = readSvg(svg, m);
  const out: GeometryDefect[] = [];
  const outlined = shapes.filter((s) => s.outlined && !(s.w >= size.w - 1 && s.h >= size.h - 1));
  const boxes = outlined.filter(
    (s) => !outlined.some((o) => o !== s && inside(o, s) && !inside(s, o)),
  );
  const isBox = new Set(boxes);
  // A line inside one box draws part of it.
  const drawn = lines.filter((l) => !boxes.some((b) => inside(bounds(l.points), b, 1)));

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i] as Shape;
      const b = boxes[j] as Shape;
      if (overlap(a, b, 1))
        out.push({ code: "overlap", found: `boxes at ${at(a)} and ${at(b)} overlap` });
    }
  }
  for (const l of drawn) {
    for (let k = 1; k < l.points.length; k++) {
      const p = l.points[k - 1] as Pt;
      const q = l.points[k] as Pt;
      for (const b of boxes) {
        if (b.bar !== true && throughShape(p, q, b, PORT)) {
          out.push({
            code: "edge-through-node",
            found: `line ${l.index} passes through the box at ${at(b)}`,
          });
        }
      }
    }
  }
  for (const t of texts) {
    const home = boxes
      .filter(
        (b) =>
          t.anchor.x > b.x && t.anchor.x < b.x + b.w && t.anchor.y > b.y && t.anchor.y < b.y + b.h,
      )
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (home !== undefined && !textInShape(t, home)) {
      out.push({
        code: "overflow",
        found: `text "${t.text}" at ${at(t)} runs out of its box at ${at(home)}`,
      });
    }
    for (const b of boxes) {
      if (b === home || !isBox.has(b)) continue;
      if (overlap(t, b, 1))
        out.push({
          code: "label-collision",
          found: `text "${t.text}" at ${at(t)} overlaps the box at ${at(b)}`,
        });
    }
    for (const l of drawn) {
      for (let k = 1; k < l.points.length; k++) {
        if (crosses(l.points[k - 1] as Pt, l.points[k] as Pt, shrink(t, 0.5))) {
          out.push({
            code: "label-collision",
            found: `line ${l.index} crosses text "${t.text}" at ${at(t)}`,
          });
          break;
        }
      }
    }
  }
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i] as Text;
      const b = texts[j] as Text;
      if (overlap(a, b, 1))
        out.push({ code: "label-collision", found: `texts "${a.text}" and "${b.text}" overlap` });
    }
  }
  // Two lines drawn over each other, except a bus or a fan-in: lines of one style
  // that leave one point, or reach one point, share a trunk on purpose.
  for (let i = 0; i < drawn.length; i++) {
    for (let j = i + 1; j < drawn.length; j++) {
      const a = drawn[i] as Line;
      const b = drawn[j] as Line;
      const same = (p: Pt, q: Pt) => Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5;
      const ends = (l: Line) => [l.points[0] as Pt, l.points[l.points.length - 1] as Pt];
      const [sa, ea] = ends(a);
      const [sb, eb] = ends(b);
      if (a.dash === b.dash && (same(sa as Pt, sb as Pt) || same(ea as Pt, eb as Pt))) continue;
      let most = 0;
      for (let k = 1; k < a.points.length; k++) {
        for (let n = 1; n < b.points.length; n++) {
          most = Math.max(
            most,
            shared(
              a.points[k - 1] as Pt,
              a.points[k] as Pt,
              b.points[n - 1] as Pt,
              b.points[n] as Pt,
            ),
          );
        }
      }
      if (most >= SHARED)
        out.push({
          code: "edge-overlap",
          found: `lines ${a.index} and ${b.index} share ${Math.round(most)} px`,
        });
    }
  }
  return out;
}

/** What the check found in one step's picture, written beside it as geometry.json. */
export interface StepGeometry {
  /** "grafical": the step's diagram file, rendered again. "svg": an SVG the agent made. */
  source: "grafical" | "svg";
  defects: GeometryDefect[];
  /** Why the picture could not be checked. */
  error?: string;
}

/**
 * GOALS.md, "Mechanical defects" for a round: checks every step's picture and writes geometry.json
 * beside it. A grafical step's diagram file is rendered again; another arm's
 * step is checked only if the agent made an SVG.
 */
export async function checkRound(round: string): Promise<Map<string, StepGeometry>> {
  const m = await createMeasurer();
  const out = new Map<string, StepGeometry>();
  const top = join(RUNS, round);
  for (const chain of readdirSync(top).sort()) {
    const steps = join(top, chain, "steps");
    if (!existsSync(steps)) continue;
    for (const step of readdirSync(steps).sort()) {
      const dir = join(steps, step);
      const own = readdirSync(dir)
        .filter((f) => f.endsWith(".grafical.yaml"))
        .sort();
      const file = join(
        dir,
        own.includes("diagram.grafical.yaml")
          ? "diagram.grafical.yaml"
          : (own[0] ?? "diagram.grafical.yaml"),
      );
      const drawn = join(dir, "diagram.svg");
      let result: StepGeometry;
      if (existsSync(file)) {
        const d = loadDiagram(file);
        result = isReport(d)
          ? { source: "grafical", defects: [], error: formatReport(d).trim() }
          : { source: "grafical", defects: checkSvg(renderSvg(layout(d, m)), m) };
      } else if (existsSync(drawn)) {
        result = { source: "svg", defects: checkSvg(readFileSync(drawn, "utf8"), m) };
      } else continue;
      writeFileSync(join(dir, "geometry.json"), `${JSON.stringify(result, null, 2)}\n`);
      out.set(`${chain}/${step}`, result);
    }
  }
  return out;
}
