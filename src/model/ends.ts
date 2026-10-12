// Edge ends (DESIGN.md D28). An edge joins two nodes, or a node and a container,
// or two containers. A container is a group, drawn as its system box, a layer,
// drawn as a band across the diagram once an edge ends at it, or a lane (D32).
// The rules here are facts, decided from rows and order alone, so they are
// operation errors:
// - an end must exist, and a container end must hold at least one node;
// - neither end may lie inside the other, and a layer may not cross a column lane;
// - two lanes are never the ends of one edge: neighbouring lanes share a border;
// - an end that shares a row with a group meets the group's side, so nothing may
//   stand between them in that row.

import type { OpError } from "../errors.ts";
import { groupNodes } from "./groups.ts";
import { laneNodes, laneRun } from "./lanes.ts";
import { suggestIds } from "./suggest.ts";
import type { Diagram } from "./types.ts";

export type EndKind = "node" | "group" | "layer" | "lane";

export function endKind(d: Diagram, id: string): EndKind | undefined {
  if (d.layers.some((l) => l.nodes.some((n) => n.id === id))) return "node";
  if ((d.groups ?? []).some((g) => g.id === id)) return "group";
  if (d.layers.some((l) => l.id === id)) return "layer";
  if ((d.lanes ?? []).some((x) => x.id === id)) return "lane";
  return undefined;
}

/** Every id an edge may end at, for suggestions. */
export function endIds(d: Diagram): string[] {
  return [
    ...d.layers.flatMap((l) => l.nodes.map((n) => n.id)),
    ...(d.groups ?? []).map((g) => g.id),
    ...d.layers.map((l) => l.id),
    ...(d.lanes ?? []).map((x) => x.id),
  ];
}

/** The node ids an end holds: itself for a node, its nodes through every level for a group, its nodes for a layer or lane. */
export function endNodes(d: Diagram, id: string): string[] {
  const kind = endKind(d, id);
  if (kind === "node") return [id];
  if (kind === "group") return groupNodes(d, id).map((n) => n.id);
  if (kind === "layer") return d.layers.find((l) => l.id === id)?.nodes.map((n) => n.id) ?? [];
  if (kind === "lane") return laneNodes(d, id);
  return [];
}

/** The rows an end covers, first and last. Undefined for an empty container. */
export function endRows(d: Diagram, id: string): [number, number] | undefined {
  const kind = endKind(d, id);
  if (kind === "layer") {
    const r = d.layers.findIndex((l) => l.id === id);
    return (d.layers[r]?.nodes.length ?? 0) > 0 ? [r, r] : undefined;
  }
  const inside = new Set(endNodes(d, id));
  const rows: number[] = [];
  d.layers.forEach((l, r) => {
    if (l.nodes.some((n) => inside.has(n.id))) rows.push(r);
  });
  if (rows.length === 0) return undefined;
  return [rows[0] as number, rows[rows.length - 1] as number];
}

/**
 * Where an edge between ends a and b meets them: across rows (a's rows all above
 * or all below b's), or beside each other in a shared row, given as that row and
 * the order of the two nodes that face each other in it. Undefined when the ends
 * share rows but no row has them side by side with nothing between.
 */
export type Meeting = { kind: "across" } | { kind: "beside"; row: number; a: string; b: string };

export function meeting(d: Diagram, a: string, b: string): Meeting | undefined {
  const ra = endRows(d, a);
  const rb = endRows(d, b);
  if (ra === undefined || rb === undefined) return undefined;
  if (ra[1] < rb[0] || rb[1] < ra[0]) return { kind: "across" };
  const inA = new Set(endNodes(d, a));
  const inB = new Set(endNodes(d, b));
  const lo = Math.max(ra[0], rb[0]);
  const hi = Math.min(ra[1], rb[1]);
  for (let r = lo; r <= hi; r++) {
    const nodes = d.layers[r]?.nodes ?? [];
    const ia = nodes.map((n, k) => (inA.has(n.id) ? k : -1)).filter((k) => k >= 0);
    const ib = nodes.map((n, k) => (inB.has(n.id) ? k : -1)).filter((k) => k >= 0);
    if (ia.length === 0 || ib.length === 0) continue;
    const aLeft = Math.max(...ia) < Math.min(...ib);
    const [l, rr] = aLeft ? [Math.max(...ia), Math.min(...ib)] : [Math.max(...ib), Math.min(...ia)];
    if (rr - l !== 1) continue;
    const na = nodes[aLeft ? l : rr]?.id as string;
    const nb = nodes[aLeft ? rr : l]?.id as string;
    return { kind: "beside", row: r, a: na, b: nb };
  }
  return undefined;
}

/** The rules for each edge's two ends. `index` goes on every error. */
export function checkEnds(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const ids = endIds(d);
  d.edges.forEach((e, ei) => {
    let known = true;
    for (const end of ["from", "to"] as const) {
      const id = e[end];
      const kind = endKind(d, id);
      if (kind === undefined) {
        known = false;
        errors.push({
          code: "unknown-node",
          index,
          field: `edges[${ei}].${end}`,
          found: id,
          expected: "the id of an existing node, group, layer or lane",
          suggestion: suggestIds(id, ids, "id"),
        });
      } else if (kind !== "node" && endRows(d, id) === undefined) {
        known = false;
        errors.push({
          code: "empty-container",
          index,
          field: `edges[${ei}].${end}`,
          found: `${kind} ${id} holds no node`,
          expected: "a group, layer or lane with at least one node",
          suggestion: `add a node to ${id} first, or edge remove <file> ${e.id}`,
        });
      }
    }
    if (!known) return;
    const fromKind = endKind(d, e.from);
    const toKind = endKind(d, e.to);
    if (fromKind === "node" && toKind === "node") return;
    if (fromKind === "lane" && toKind === "lane") {
      errors.push({
        code: "lane-to-lane",
        index,
        field: `edges[${ei}]`,
        found: `${e.id} joins two lanes, ${e.from} and ${e.to}`,
        expected: "an edge between a lane and a node, group or layer",
        suggestion: `edge retarget <file> ${e.id} so that one end is a node of its lane`,
      });
      return;
    }
    const a = new Set(endNodes(d, e.from));
    const b = endNodes(d, e.to);
    const shared = b.filter((n) => a.has(n));
    // A row lane covers whole rows, as a layer does. A layer crosses every column lane.
    const rowLike = (k: EndKind | undefined) =>
      k === "layer" || (k === "lane" && laneRun(d) === "rows");
    const crossing =
      (fromKind === "layer" || toKind === "layer") &&
      (fromKind === "lane" || toKind === "lane") &&
      laneRun(d) === "columns";
    const layerAndRows =
      crossing ||
      ((rowLike(fromKind) || rowLike(toKind)) &&
        (() => {
          const ra = endRows(d, e.from) as [number, number];
          const rb = endRows(d, e.to) as [number, number];
          return !(ra[1] < rb[0] || rb[1] < ra[0]);
        })());
    if (shared.length > 0 || layerAndRows) {
      errors.push({
        code: "edge-inside",
        index,
        field: `edges[${ei}]`,
        found: `${e.id} joins ${e.from} and ${e.to}, and one lies inside or across the other`,
        expected: "an edge between ends that neither contain nor overlap each other",
        suggestion: `edge remove <file> ${e.id}, and connect a member to something outside its container instead`,
      });
      return;
    }
    if (meeting(d, e.from, e.to) === undefined) {
      errors.push({
        code: "edge-blocked",
        index,
        field: `edges[${ei}]`,
        found: `${e.from} and ${e.to} share a row, with other nodes between them in every row they share`,
        expected:
          "a node or group that sits right beside the group it connects to, in a row they share",
        suggestion: `node move <file> <node> so the two sit side by side, or connect ${e.from} to a member of ${e.to}`,
      });
    }
  });
  return errors;
}
