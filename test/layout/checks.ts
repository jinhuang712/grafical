// Geometry checks on a scene, written as test helpers. The real checker (DESIGN.md, "Defects owned by who can fix them") is
// another module's job; these only keep the layout honest.

import type { Point, Rect, Scene, SceneEdge } from "../../src/scene.ts";
import { lineStyle } from "../../src/theme/paint.ts";

export interface Seg {
  a: Point;
  b: Point;
}

export function segments(points: Point[]): Seg[] {
  const out: Seg[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a !== undefined && b !== undefined) out.push({ a, b });
  }
  return out;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function inflate(r: Rect, d: number): Rect {
  return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
}

/** Does an axis-parallel segment pass through the open interior of a rectangle? */
export function segmentHitsRect(s: Seg, r: Rect): boolean {
  if (s.a.x === s.b.x) {
    const x = s.a.x;
    if (!(x > r.x && x < r.x + r.w)) return false;
    const lo = Math.min(s.a.y, s.b.y);
    const hi = Math.max(s.a.y, s.b.y);
    return Math.min(hi, r.y + r.h) - Math.max(lo, r.y) > 1e-9;
  }
  const y = s.a.y;
  if (!(y > r.y && y < r.y + r.h)) return false;
  const lo = Math.min(s.a.x, s.b.x);
  const hi = Math.max(s.a.x, s.b.x);
  return Math.min(hi, r.x + r.w) - Math.max(lo, r.x) > 1e-9;
}

/** Edges that share a source node and a line style may run together as a bus (DESIGN.md, "Our own gap router"). */
export function sameBus(a: SceneEdge, b: SceneEdge): boolean {
  return a.from === b.from && lineStyle(a.kind) === lineStyle(b.kind);
}

/** Unlabelled edges in one line style into one node may arrive through one port (DESIGN.md, "A target picture with measured rules" rule 4). */
export function sameFanIn(a: SceneEdge, b: SceneEdge): boolean {
  return (
    a.to === b.to &&
    lineStyle(a.kind) === lineStyle(b.kind) &&
    a.label === undefined &&
    b.label === undefined
  );
}

function near(p: Point, r: Rect, d: number): boolean {
  return p.x >= r.x - d && p.x <= r.x + r.w + d && p.y >= r.y - d && p.y <= r.y + r.h + d;
}

export interface Defects {
  notOrthogonal: string[];
  edgeThroughNode: string[];
  nodeOverlap: string[];
  labelCollisions: string[];
  /** Two unrelated edges drawn on top of each other. */
  edgeOverlap: string[];
  /** Two parallel lines of different edges closer than 4 px along some stretch. */
  closeParallel: string[];
  /** Two route ends on one node side closer than 12 px. */
  closePorts: string[];
  /** Text that leaves its box, or takes more lines than allowed. */
  overflow: string[];
}

export function defects(s: Scene): Defects {
  const out: Defects = {
    notOrthogonal: [],
    edgeThroughNode: [],
    nodeOverlap: [],
    labelCollisions: [],
    edgeOverlap: [],
    closeParallel: [],
    closePorts: [],
    overflow: [],
  };
  for (const e of s.edges) {
    if (segments(e.points).some((g) => g.a.x !== g.b.x && g.a.y !== g.b.y)) {
      out.notOrthogonal.push(e.id);
    }
    for (const g of segments(e.points)) {
      for (const n of s.nodes)
        if (segmentHitsRect(g, n.rect)) out.edgeThroughNode.push(`${e.id} x ${n.id}`);
    }
  }
  s.nodes.forEach((a, i) => {
    for (const b of s.nodes.slice(i + 1)) {
      if (rectsOverlap(a.rect, b.rect)) out.nodeOverlap.push(`${a.id} x ${b.id}`);
    }
  });

  // Labels: clear of nodes, other text, other edges, and their own line. Rows
  // are not drawn (DESIGN.md, "Rows unseen, groups as systems"), so their labels do not count.
  const texts = [
    { id: "title", box: s.title.bbox },
    ...(s.groups ?? []).map((g) => ({ id: `group ${g.id}`, box: g.label.bbox })),
    ...s.nodes.flatMap((n) => n.texts.map((t, i) => ({ id: `node ${n.id}#${i}`, box: t.bbox }))),
  ];
  const labelled = s.edges.filter((e) => e.label !== undefined);
  labelled.forEach((e, i) => {
    const box = e.label?.bbox;
    if (box === undefined) return;
    for (const n of s.nodes)
      if (rectsOverlap(box, n.rect)) out.labelCollisions.push(`${e.id} label x node ${n.id}`);
    for (const t of texts)
      if (rectsOverlap(box, t.box)) out.labelCollisions.push(`${e.id} label x ${t.id}`);
    for (const o of labelled.slice(i + 1)) {
      const ob = o.label?.bbox;
      if (ob !== undefined && rectsOverlap(inflate(box, 1), ob)) {
        out.labelCollisions.push(`${e.id} label x ${o.id} label`);
      }
    }
    for (const o of s.edges) {
      const grow = o.id === e.id ? 1 : 2;
      if (segments(o.points).some((g) => segmentHitsRect(g, inflate(box, grow)))) {
        out.labelCollisions.push(`${e.id} label x ${o.id === e.id ? "its own line" : o.id}`);
      }
    }
  });

  // Edge on edge, and lines that nearly touch.
  const rects = new Map(s.nodes.map((n) => [n.id, n.rect]));
  const all = s.edges.flatMap((e) => segments(e.points).map((g) => ({ e, g })));
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    if (p === undefined) continue;
    for (let k = i + 1; k < all.length; k++) {
      const q = all[k];
      if (q === undefined || q.e.id === p.e.id) continue;
      const pv = p.g.a.x === p.g.b.x;
      const qv = q.g.a.x === q.g.b.x;
      if (pv !== qv) continue;
      const d = pv ? Math.abs(p.g.a.x - q.g.a.x) : Math.abs(p.g.a.y - q.g.a.y);
      if (d >= 4) continue;
      const [p0, p1] = pv ? sorted(p.g.a.y, p.g.b.y) : sorted(p.g.a.x, p.g.b.x);
      const [q0, q1] = pv ? sorted(q.g.a.y, q.g.b.y) : sorted(q.g.a.x, q.g.b.x);
      const overlap = Math.min(p1, q1) - Math.max(p0, q0);
      if (overlap <= 1) continue;
      if (sameBus(p.e, q.e)) continue;
      // A fan-in's lines share the last stretch into their node, as the checker
      // allows for any stretch that ends at a shared node.
      if (d === 0 && sameFanIn(p.e, q.e)) {
        const r = rects.get(p.e.to);
        const lo = pv ? Math.max(p0, q0) : Math.max(p0, q0);
        const hi = Math.min(p1, q1);
        const a = pv ? { x: p.g.a.x, y: lo } : { x: lo, y: p.g.a.y };
        const b = pv ? { x: p.g.a.x, y: hi } : { x: hi, y: p.g.a.y };
        if (r !== undefined && (near(a, r, 4) || near(b, r, 4))) continue;
      }
      const pair = `${p.e.id} = ${q.e.id}`;
      if (d === 0) {
        if (!out.edgeOverlap.includes(pair)) out.edgeOverlap.push(pair);
      } else if (!out.closeParallel.includes(pair)) out.closeParallel.push(pair);
    }
  }

  // Route ends on one node side.
  const ends: { node: string; side: string; at: number; id: string }[] = [];
  const nodes = new Map(s.nodes.map((n) => [n.id, n.rect]));
  for (const e of s.edges) {
    const first = e.points[0];
    const last = e.points[e.points.length - 1];
    for (const [p, id] of [
      [first, e.from],
      [last, e.to],
    ] as const) {
      const r = nodes.get(id);
      if (p === undefined || r === undefined) continue;
      const side =
        p.y === r.y
          ? "top"
          : p.y === r.y + r.h
            ? "bottom"
            : p.x === r.x
              ? "left"
              : p.x === r.x + r.w
                ? "right"
                : "none";
      if (side === "none") out.edgeThroughNode.push(`${e.id} does not end on ${id}`);
      ends.push({ node: id, side, at: side === "top" || side === "bottom" ? p.x : p.y, id: e.id });
    }
  }
  ends.forEach((a, i) => {
    for (const b of ends.slice(i + 1)) {
      if (a.node !== b.node || a.side !== b.side || a.id === b.id) continue;
      const shared = s.edges.find((x) => x.id === a.id);
      const other = s.edges.find((x) => x.id === b.id);
      // Bus members share their source port by design, fan-in members their target port.
      if (shared && other && sameBus(shared, other) && a.at === b.at && shared.from === a.node)
        continue;
      if (shared && other && sameFanIn(shared, other) && a.at === b.at && shared.to === a.node)
        continue;
      if (Math.abs(a.at - b.at) < 12)
        out.closePorts.push(`${a.id} ~ ${b.id} on ${a.node} ${a.side}`);
    }
  });

  for (const n of s.nodes) {
    const inner = { x: n.rect.x + 4, y: n.rect.y + 2, w: n.rect.w - 8, h: n.rect.h - 4 };
    n.texts.forEach((t, i) => {
      const b = t.bbox;
      const inside =
        b.x >= inner.x - 1e-6 &&
        b.y >= inner.y - 1e-6 &&
        b.x + b.w <= inner.x + inner.w + 1e-6 &&
        b.y + b.h <= inner.y + inner.h + 1e-6;
      if (!inside) out.overflow.push(`${n.id} text ${i} leaves its box`);
      const lines = new Set(t.runs.map((r) => r.y)).size;
      if (lines > (i === 0 ? 2 : 1)) out.overflow.push(`${n.id} text ${i} takes ${lines} lines`);
    });
  }
  return out;
}

function sorted(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

/** Every defect the DESIGN.md, "Defects owned by who can fix them" list names, flattened, for assertions. */
export function mechanical(d: Defects): string[] {
  return [
    ...d.notOrthogonal.map((x) => `not orthogonal: ${x}`),
    ...d.edgeThroughNode.map((x) => `edge through node: ${x}`),
    ...d.nodeOverlap.map((x) => `node overlap: ${x}`),
    ...d.labelCollisions.map((x) => `label collision: ${x}`),
    ...d.edgeOverlap.map((x) => `edge overlap: ${x}`),
    ...d.closeParallel.map((x) => `close parallel: ${x}`),
    ...d.closePorts.map((x) => `close ports: ${x}`),
    ...d.overflow.map((x) => `overflow: ${x}`),
  ];
}

/**
 * Lines that cross text (DESIGN.md, "A target picture with measured rules" rule 8, DESIGN.md, "Defects owned by who can fix them"): a segment through the box of a node's
 * text, another edge's label, a group's label, the title, subtitle, footnote or a
 * legend label. Like the checker, a line may graze a text box by 2 px.
 */
export function textCrossings(s: Scene): string[] {
  const texts: { id: string; box: Rect; owner?: string }[] = [
    { id: "title", box: s.title.bbox },
    ...s.nodes.flatMap((n) => n.texts.map((t, i) => ({ id: `node ${n.id}#${i}`, box: t.bbox }))),
    ...(s.groups ?? []).map((g) => ({ id: `group ${g.id}`, box: g.label.bbox })),
    ...(s.legend ?? []).map((it, i) => ({ id: `legend ${i}`, box: it.label.bbox })),
  ];
  if (s.subtitle) texts.push({ id: "subtitle", box: s.subtitle.bbox });
  if (s.note) texts.push({ id: "note", box: s.note.bbox });
  for (const e of s.edges) {
    if (e.label) texts.push({ id: `label of ${e.id}`, box: e.label.bbox, owner: e.id });
  }
  const out: string[] = [];
  for (const e of s.edges) {
    for (const t of texts) {
      if (t.owner === e.id) continue;
      const box = inflate(t.box, -2);
      if (box.w <= 0 || box.h <= 0) continue;
      if (segments(e.points).some((g) => segmentHitsRect(g, box))) out.push(`${e.id} x ${t.id}`);
    }
  }
  return out;
}

/** Nodes inside a group's box that are not its members (DESIGN.md, "Rows unseen, groups as systems", "Defects owned by who can fix them"). */
export function groupIntruders(s: Scene): string[] {
  const out: string[] = [];
  for (const g of s.groups ?? []) {
    for (const n of s.nodes) {
      if (!g.members.includes(n.id) && rectsOverlap(n.rect, g.rect)) out.push(`${n.id} in ${g.id}`);
    }
  }
  return out;
}

/** The measured rules of DESIGN.md, "A target picture with measured rules", as the checker measures them. */
export interface Taste {
  width: number;
  height: number;
  /** Pairs of edges that cross at least once. */
  crossings: number;
  bends: number;
  /** Edges that are one straight segment, as a share of all edges. */
  straight: number;
  maxBends: number;
  /** Edges with more than 2 bends. */
  overBends: number;
  labelled: number;
  /** Vertical segments that pass a row without either end in it, inside a node's x span. */
  corridorViolations: number;
}

function merged(points: Point[]): Seg[] {
  const out: Seg[] = [];
  for (const g of segments(points)) {
    if (g.a.x === g.b.x && g.a.y === g.b.y) continue;
    const last = out[out.length - 1];
    const v = (x: Seg) => x.a.x === x.b.x;
    if (last !== undefined && v(last) === v(g)) last.b = g.b;
    else out.push({ a: g.a, b: g.b });
  }
  return out;
}

export function taste(s: Scene): Taste {
  const segs = s.edges.map((e) => merged(e.points));
  const between = (x: number, a: number, b: number) =>
    x > Math.min(a, b) + 1e-6 && x < Math.max(a, b) - 1e-6;
  const cross = (p: Seg[], q: Seg[]) =>
    p.some((a) =>
      q.some((b) => {
        const av = a.a.x === a.b.x;
        const bv = b.a.x === b.b.x;
        if (av === bv) return false;
        const [h, v] = av ? [b, a] : [a, b];
        return between(v.a.x, h.a.x, h.b.x) && between(h.a.y, v.a.y, v.b.y);
      }),
    );
  let crossings = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (cross(segs[i] as Seg[], segs[j] as Seg[])) crossings++;
    }
  }
  const bends = segs.map((x) => Math.max(0, x.length - 1));
  const byRow = new Map<string, { top: number; bottom: number; rects: Rect[]; ids: string[] }>();
  for (const n of s.nodes) {
    const r = byRow.get(n.layer) ?? { top: n.rect.y, bottom: 0, rects: [], ids: [] };
    r.top = Math.min(r.top, n.rect.y);
    r.bottom = Math.max(r.bottom, n.rect.y + n.rect.h);
    r.rects.push(n.rect);
    r.ids.push(n.id);
    byRow.set(n.layer, r);
  }
  let corridorViolations = 0;
  s.edges.forEach((e, i) => {
    for (const row of byRow.values()) {
      if (row.ids.includes(e.from) || row.ids.includes(e.to)) continue;
      const hit = (segs[i] ?? []).some((g) => {
        if (g.a.x !== g.b.x) return false;
        const lo = Math.min(g.a.y, g.b.y);
        const hi = Math.max(g.a.y, g.b.y);
        if (hi <= row.top + 2 || lo >= row.bottom - 2) return false;
        return row.rects.some((r) => g.a.x > r.x - 1e-6 && g.a.x < r.x + r.w + 1e-6);
      });
      if (hit) corridorViolations++;
    }
  });
  const total = s.edges.length;
  return {
    width: s.width,
    height: s.height,
    crossings,
    bends: bends.reduce((a, b) => a + b, 0),
    straight: total === 0 ? 1 : bends.filter((b) => b === 0).length / total,
    maxBends: Math.max(0, ...bends),
    overBends: bends.filter((b) => b > 2).length,
    labelled: total === 0 ? 0 : s.edges.filter((e) => e.label).length / total,
    corridorViolations,
  };
}
