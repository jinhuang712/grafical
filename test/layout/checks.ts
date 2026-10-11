// Geometry checks on a scene, written as test helpers. The real checker (D14) is
// another module's job; these only keep the layout honest.

import type { Point, Rect, Scene, SceneEdge } from "../../src/scene.ts";

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

/** Edges that share a source node and a kind may run together as a bus (D11). */
export function sameBus(a: SceneEdge, b: SceneEdge): boolean {
  return a.from === b.from && a.kind === b.kind;
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
      for (const l of s.layers) {
        if (segmentHitsRect(g, l.label.bbox))
          out.edgeThroughNode.push(`${e.id} x layer label ${l.id}`);
      }
    }
  }
  s.nodes.forEach((a, i) => {
    for (const b of s.nodes.slice(i + 1)) {
      if (rectsOverlap(a.rect, b.rect)) out.nodeOverlap.push(`${a.id} x ${b.id}`);
    }
  });

  // Labels: clear of nodes, other text, other edges, and their own line.
  const texts = [
    { id: "title", box: s.title.bbox },
    ...s.layers.map((l) => ({ id: `layer ${l.id}`, box: l.label.bbox })),
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
      // Bus members share their source port by design.
      if (shared && other && sameBus(shared, other) && a.at === b.at && shared.from === a.node)
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

/** Every defect the D14 list names, flattened, for assertions. */
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
