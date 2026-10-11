// Edges that end at a container (DESIGN.md D28). The router knows only nodes, so
// each container end is routed to a node of the container that faces the other
// end, and the route is then cut where it meets the container's box. A group is
// met at its top or bottom when the other end lies above or below all its rows,
// and at its side when the two share a row: then the facing node is the member
// beside the other end. A layer, drawn as a band, is met at its top or bottom.
// A lane (D32) is met like a group: at its border across rows, or at its side.

import { endKind, endNodes, endRows, meeting } from "../model/ends.ts";
import type { Diagram, Edge } from "../model/types.ts";
import type { Point, Rect } from "../scene.ts";
import { centreX, type PNode } from "./place.ts";

export interface ContainerEnd {
  /** The group, layer or lane id. */
  id: string;
  kind: "group" | "layer" | "lane";
  /** The row whose nodes face the other end, and may stand in for the container. */
  row: number;
  /** Whether the other end lies across rows, or beside in a shared row. */
  across: boolean;
}

export interface EndPlan {
  /** The diagram's edges, with each container end replaced by its stand-in node. */
  edges: Edge[];
  /** Container ends by edge id. */
  ends: Map<string, { from?: ContainerEnd; to?: ContainerEnd }>;
  /** Layers that an edge ends at: they are drawn as bands. */
  bands: Set<string>;
}

function median<T>(xs: T[]): T | undefined {
  return xs[Math.floor((xs.length - 1) / 2)];
}

/** The facing row's nodes of a container, in order. */
function facing(d: Diagram, end: ContainerEnd): string[] {
  const inside = new Set(endNodes(d, end.id));
  return (d.layers[end.row]?.nodes ?? []).filter((n) => inside.has(n.id)).map((n) => n.id);
}

/**
 * Stand-ins for every container end, before placement: the middle node of the
 * facing row, or for a side meeting the member beside the other end. Edges the
 * model refused never reach the layout, so every end here is valid (D28).
 */
export function planEnds(d: Diagram): EndPlan {
  const ends = new Map<string, { from?: ContainerEnd; to?: ContainerEnd }>();
  const bands = new Set<string>();
  const edges = d.edges.map((e) => {
    const fk = endKind(d, e.from);
    const tk = endKind(d, e.to);
    if (fk === "node" && tk === "node") return e;
    const meet = meeting(d, e.from, e.to);
    const rf = endRows(d, e.from);
    const rt = endRows(d, e.to);
    if (meet === undefined || rf === undefined || rt === undefined) return e;
    const out: Edge = { ...e };
    const plan: { from?: ContainerEnd; to?: ContainerEnd } = {};
    for (const side of ["from", "to"] as const) {
      const id = e[side];
      const kind = side === "from" ? fk : tk;
      if (kind !== "group" && kind !== "layer" && kind !== "lane") continue;
      if (kind === "layer") bands.add(id);
      const own = side === "from" ? rf : rt;
      const other = side === "from" ? rt : rf;
      let end: ContainerEnd;
      if (meet.kind === "beside") {
        end = { id, kind, row: meet.row, across: false };
        out[side] = side === "from" ? meet.a : meet.b;
      } else {
        const below = own[0] > other[1];
        end = { id, kind, row: below ? own[0] : own[1], across: true };
        out[side] = median(facing(d, end)) ?? id;
      }
      plan[side] = end;
    }
    ends.set(e.id, plan);
    return out;
  });
  return { edges, ends, bands };
}

/**
 * After placement, each end met across rows takes the node of its facing row
 * nearest the other end, so that the line can come straight. Ties go to the
 * first in order. Returns the edges for routing.
 */
export function refineEnds(d: Diagram, plan: EndPlan, nodes: Map<string, PNode>): Edge[] {
  return plan.edges.map((e) => {
    const p = plan.ends.get(e.id);
    if (p === undefined) return e;
    const out: Edge = { ...e };
    for (const side of ["from", "to"] as const) {
      const end = p[side];
      if (end === undefined || !end.across) continue;
      const other = nodes.get(side === "from" ? e.to : e.from);
      if (other === undefined) continue;
      const x = centreX(other);
      let best: string | undefined;
      let bestD = Number.POSITIVE_INFINITY;
      for (const id of facing(d, end)) {
        const n = nodes.get(id);
        if (n === undefined) continue;
        const dist = Math.abs(centreX(n) - x);
        if (dist < bestD - 1e-6) {
          best = id;
          bestD = dist;
        }
      }
      if (best !== undefined) out[side] = best;
    }
    return out;
  });
}

const inside = (p: Point, r: Rect) =>
  p.x > r.x + 1e-6 && p.x < r.x + r.w - 1e-6 && p.y > r.y + 1e-6 && p.y < r.y + r.h - 1e-6;

/**
 * The route cut where it first enters the box, walking from its start. The
 * route is orthogonal, so the cut is where one segment crosses the box's border.
 */
function cutAtEntry(points: Point[], box: Rect): Point[] {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    if (inside(a, box)) return points.slice(0, i);
    const enters =
      a.x === b.x
        ? a.x > box.x &&
          a.x < box.x + box.w &&
          Math.min(a.y, b.y) < box.y + box.h &&
          Math.max(a.y, b.y) > box.y
        : a.y > box.y &&
          a.y < box.y + box.h &&
          Math.min(a.x, b.x) < box.x + box.w &&
          Math.max(a.x, b.x) > box.x;
    if (!enters) continue;
    const at: Point =
      a.x === b.x
        ? { x: a.x, y: b.y > a.y ? box.y : box.y + box.h }
        : { x: b.x > a.x ? box.x : box.x + box.w, y: a.y };
    return [...points.slice(0, i), at];
  }
  return points;
}

/** The route cut at the source's box (start) or the target's box (end). */
export function cutRoute(points: Point[], box: Rect, at: "start" | "end"): Point[] {
  if (at === "end") return cutAtEntry(points, box);
  return cutAtEntry([...points].reverse(), box).reverse();
}
