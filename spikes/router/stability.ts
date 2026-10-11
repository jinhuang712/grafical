// Condition 2: add one edge, route again, and diff every other edge's route.
// D10 allows a change only for edges attached to anything that moved, and for edges
// that share a gap with the changed edge. Gaps are classified from the geometry, the
// same way for both routers.

import { type Point, type Routes, segments } from "./geom.js";
import type { EdgeLabel } from "./labels.js";
import type { Diagram, Edge } from "./model.js";
import type { Placement } from "./place.js";

/**
 * The gaps a route passes through. "G<i>" is the gutter below layer i ("G-1" above the
 * first layer). "V<i>.<k>" is the gap before node k in layer i (k = node count: after the
 * last node). Space directly above or below a node counts as the neighbouring gutter.
 */
export function gapsOf(p: Placement, pts: Point[]): Set<string> {
  const out = new Set<string>();
  for (const s of segments(pts)) {
    const len = Math.abs(s.b.x - s.a.x) + Math.abs(s.b.y - s.a.y);
    const steps = Math.max(1, Math.ceil(len / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      out.add(classify(p, s.a.x + (s.b.x - s.a.x) * t, s.a.y + (s.b.y - s.a.y) * t));
    }
  }
  return out;
}

/** Points every pixel along a route, each with its gap. */
function samples(p: Placement, pts: Point[]): { key: string; gap: string }[] {
  const out: { key: string; gap: string }[] = [];
  for (const s of segments(pts)) {
    const len = Math.abs(s.b.x - s.a.x) + Math.abs(s.b.y - s.a.y);
    const steps = Math.max(1, Math.round(len));
    for (let i = 0; i < steps; i++) {
      const x = s.a.x + ((s.b.x - s.a.x) * i) / steps;
      const y = s.a.y + ((s.b.y - s.a.y) * i) / steps;
      out.push({ key: `${Math.round(x)},${Math.round(y)}`, gap: classify(p, x, y) });
    }
  }
  return out;
}

function classify(p: Placement, x: number, y: number): string {
  const first = p.layers[0];
  if (first !== undefined && y < first.rowTop) return "G-1";
  for (const l of p.layers) {
    if (y < l.rowTop) return `G${l.index - 1}`;
    if (y <= l.rowBottom) {
      for (const n of l.nodes) {
        if (x >= n.x && x <= n.x + n.w) {
          if (y <= n.y) return `G${l.index - 1}`;
          if (y >= n.y + n.h) return `G${l.index}`;
          return `inside ${n.id}`;
        }
      }
      const k = l.nodes.findIndex((n) => x < n.x);
      return `V${l.index}.${k < 0 ? l.nodes.length : k}`;
    }
  }
  return `G${p.layers.length - 1}`;
}

export interface StabilityResult {
  added: string;
  addedGaps: string[];
  moved: string[];
  changedRoutes: string[];
  changedLabels: string[];
  /** Changed routes that D10 does not allow. */
  routeViolations: string[];
  /** Changed labels whose edge D10 does not allow to change. */
  labelViolations: string[];
  /** Stricter than D10: changed routes that also changed outside the added edge's gaps. */
  changedOutsideSharedGaps: string[];
}

export interface Layout {
  placement: Placement;
  routes: Routes;
  labels: EdgeLabel[];
}

export function diffAfterAdd(
  before: Layout,
  after: Layout,
  base: Diagram,
  added: Edge,
): StabilityResult {
  const moved: string[] = [];
  for (const [id, n] of before.placement.nodes) {
    const m = after.placement.nodes.get(id);
    if (m === undefined || m.x !== n.x || m.y !== n.y || m.w !== n.w || m.h !== n.h) moved.push(id);
  }
  const addedGaps = gapsOf(after.placement, after.routes.get(added.id) ?? []);
  const label = (ls: EdgeLabel[], id: string) => {
    const l = ls.find((x) => x.edgeId === id);
    return l === undefined ? "none" : `${l.x},${l.y},${l.mode}`;
  };
  const changedRoutes: string[] = [];
  const changedLabels: string[] = [];
  const routeViolations: string[] = [];
  const labelViolations: string[] = [];
  const changedOutsideSharedGaps: string[] = [];
  const outside = (pl: Placement, pts: Point[]) =>
    samples(pl, pts)
      .filter((q) => !addedGaps.has(q.gap))
      .map((q) => q.key)
      .join(" ");
  for (const edge of base.edges) {
    const a = before.routes.get(edge.id) ?? [];
    const b = after.routes.get(edge.id) ?? [];
    const routeChanged = JSON.stringify(a) !== JSON.stringify(b);
    const labelChanged = label(before.labels, edge.id) !== label(after.labels, edge.id);
    if (!routeChanged && !labelChanged) continue;
    const attachedToMoved = moved.includes(edge.from) || moved.includes(edge.to);
    const gaps = new Set([...gapsOf(before.placement, a), ...gapsOf(after.placement, b)]);
    const shares = [...gaps].some((g) => addedGaps.has(g));
    const allowed = attachedToMoved || shares;
    if (routeChanged) {
      changedRoutes.push(edge.id);
      if (!allowed) routeViolations.push(edge.id);
      if (outside(before.placement, a) !== outside(after.placement, b)) {
        changedOutsideSharedGaps.push(edge.id);
      }
    }
    if (labelChanged) {
      changedLabels.push(edge.id);
      if (!allowed) labelViolations.push(edge.id);
    }
  }
  return {
    added: added.id,
    addedGaps: [...addedGaps].sort(),
    moved,
    changedRoutes,
    changedLabels,
    routeViolations,
    labelViolations,
    changedOutsideSharedGaps,
  };
}
