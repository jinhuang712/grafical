// Geometric checks for condition 1, plus readability measures that are not conditions.

import {
  inflate,
  isOrthogonal,
  length,
  type Routes,
  rectsOverlap,
  segmentHitsRect,
  segments,
} from "./geom.js";
import type { Labelled } from "./labels.js";
import type { Diagram } from "./model.js";
import type { Placement } from "./place.js";

export interface Report {
  /** Condition 1: an edge segment through the interior of a node box. */
  edgeThroughNode: string[];
  /** Condition 1: a label over a node, a layer label, another label or another edge. */
  labelCollisions: string[];
  /** Condition 1: a label that found no place at all. */
  unplacedLabels: string[];
  /** Not a condition: an edge over a layer label. */
  edgeThroughHeader: string[];
  notOrthogonal: string[];
  /** Readability: two edges with no common end drawn on top of each other. */
  sharedSegments: string[];
  /** Two edges from or to the same node that share a stretch, like a bus. */
  bundled: string[];
  crossings: number;
  bends: number;
  length: number;
}

export function check(d: Diagram, p: Placement, routes: Routes, lab: Labelled): Report {
  const ends = new Map(d.edges.map((e) => [e.id, [e.from, e.to]]));
  const common = (a: string, b: string) =>
    (ends.get(a) ?? []).some((n) => (ends.get(b) ?? []).includes(n));
  const r: Report = {
    edgeThroughNode: [],
    labelCollisions: [],
    unplacedLabels: [...lab.unplaced],
    edgeThroughHeader: [],
    notOrthogonal: [],
    sharedSegments: [],
    bundled: [],
    crossings: 0,
    bends: 0,
    length: 0,
  };
  const nodes = [...p.nodes.values()];
  for (const [id, pts] of routes) {
    if (!isOrthogonal(pts)) r.notOrthogonal.push(id);
    r.bends += Math.max(0, pts.length - 2);
    r.length += length(pts);
    for (const s of segments(pts)) {
      for (const n of nodes) if (segmentHitsRect(s, n)) r.edgeThroughNode.push(`${id} x ${n.id}`);
      for (const l of p.layers)
        if (segmentHitsRect(s, l.header)) r.edgeThroughHeader.push(`${id} x ${l.id}`);
    }
  }
  for (const [i, l] of lab.labels.entries()) {
    for (const n of nodes)
      if (rectsOverlap(l, n)) r.labelCollisions.push(`${l.edgeId} label x node ${n.id}`);
    for (const h of p.layers) {
      if (rectsOverlap(l, h.header)) r.labelCollisions.push(`${l.edgeId} label x layer ${h.id}`);
    }
    for (const o of lab.labels.slice(i + 1)) {
      if (rectsOverlap(l, o)) r.labelCollisions.push(`${l.edgeId} label x ${o.edgeId} label`);
    }
    for (const [id, pts] of routes) {
      if (id === l.edgeId) continue;
      if (segments(pts).some((s) => segmentHitsRect(s, inflate(l, -0.5)))) {
        r.labelCollisions.push(`${l.edgeId} label x ${id}`);
      }
    }
  }
  // Crossings and shared segments between pairs of edges.
  const all = [...routes].flatMap(([id, pts]) => segments(pts).map((s) => ({ id, s })));
  const shared = new Set<string>();
  const bundled = new Set<string>();
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    if (a === undefined) continue;
    for (let k = i + 1; k < all.length; k++) {
      const b = all[k];
      if (b === undefined || a.id === b.id) continue;
      const av = a.s.a.x === a.s.b.x;
      const bv = b.s.a.x === b.s.b.x;
      if (av === bv) {
        const same = av ? a.s.a.x === b.s.a.x : a.s.a.y === b.s.a.y;
        if (!same) continue;
        const [a0, a1] = av ? sorted(a.s.a.y, a.s.b.y) : sorted(a.s.a.x, a.s.b.x);
        const [b0, b1] = av ? sorted(b.s.a.y, b.s.b.y) : sorted(b.s.a.x, b.s.b.x);
        if (Math.min(a1, b1) - Math.max(a0, b0) > 4) {
          const pair = [a.id, b.id].sort().join(" = ");
          if (common(a.id, b.id)) bundled.add(pair);
          else shared.add(pair);
        }
        continue;
      }
      const v = av ? a.s : b.s;
      const h = av ? b.s : a.s;
      const [hx0, hx1] = sorted(h.a.x, h.b.x);
      const [vy0, vy1] = sorted(v.a.y, v.b.y);
      if (v.a.x > hx0 && v.a.x < hx1 && h.a.y > vy0 && h.a.y < vy1) r.crossings++;
    }
  }
  r.sharedSegments = [...shared].sort();
  r.bundled = [...bundled].sort();
  return r;
}

function sorted(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export function condition1(r: Report): boolean {
  return (
    r.edgeThroughNode.length === 0 &&
    r.labelCollisions.length === 0 &&
    r.unplacedLabels.length === 0
  );
}
