// Swimlanes (DESIGN.md D32). A lane's members name it: layers, when lanes run as
// rows, or nodes, when lanes run as columns. The way lanes run follows from which
// members name them, so a diagram cannot hold both. Row lanes span neighbouring
// layers. Column lanes go left to right in list order and span the whole height;
// a node outside every lane sits right of them, or left when it comes first in
// its row, before the row's lane nodes. The engine keeps every row in that order.

import type { OpError } from "../errors.ts";
import { suggestIds } from "./suggest.ts";
import type { Diagram, Layer } from "./types.ts";

export type LaneRun = "rows" | "columns";

/** How the diagram's lanes run, or undefined while no layer or node names a lane. */
export function laneRun(d: Diagram): LaneRun | undefined {
  if (d.layers.some((l) => l.lane !== undefined)) return "rows";
  if (d.layers.some((l) => l.nodes.some((n) => n.lane !== undefined))) return "columns";
  return undefined;
}

/** The node ids a lane holds: the nodes of its layers, or its nodes. */
export function laneNodes(d: Diagram, id: string): string[] {
  return d.layers.flatMap((l) =>
    l.lane === id
      ? l.nodes.map((n) => n.id)
      : l.nodes.filter((n) => n.lane === id).map((n) => n.id),
  );
}

/**
 * Each node's place across, for column lanes: the index of its lane, -1 for a
 * node outside every lane that comes first in its row, and the number of lanes
 * for any other node outside every lane.
 */
export function laneRanks(d: Diagram): Map<string, number> {
  const ranks = new Map<string, number>();
  const lanes = (d.lanes ?? []).map((x) => x.id);
  for (const l of d.layers) {
    const first = l.nodes.findIndex((n) => n.lane !== undefined && lanes.includes(n.lane));
    l.nodes.forEach((n, k) => {
      const at = n.lane === undefined ? -1 : lanes.indexOf(n.lane);
      ranks.set(n.id, at >= 0 ? at : first >= 0 && k < first ? -1 : lanes.length);
    });
  }
  return ranks;
}

/**
 * Puts each row's nodes in lane order, keeping the order within a lane. Returns
 * the ids of the nodes that moved. Rows lanes change no order.
 */
export function orderByLanes(d: Diagram): string[] {
  if (laneRun(d) !== "columns") return [];
  const ranks = laneRanks(d);
  const moved: string[] = [];
  for (const l of d.layers) {
    const next = l.nodes
      .map((n, k) => ({ n, k }))
      .sort((a, b) => (ranks.get(a.n.id) ?? 0) - (ranks.get(b.n.id) ?? 0) || a.k - b.k)
      .map((x) => x.n);
    next.forEach((n, k) => {
      if (l.nodes[k] !== n) moved.push(n.id);
    });
    l.nodes = next;
  }
  return moved;
}

/** Lane rules: members name an existing lane, one way per diagram, row lanes touch, groups stay in one lane. */
export function checkLanes(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const ids = (d.lanes ?? []).map((x) => x.id);
  const unknown = (lane: string, field: string) =>
    errors.push({
      code: "unknown-lane",
      index,
      field,
      found: lane,
      expected: "the id of an existing lane",
      suggestion: suggestIds(lane, ids, "lane"),
    });
  d.layers.forEach((l, li) => {
    if (l.lane !== undefined && !ids.includes(l.lane)) unknown(l.lane, `layers[${li}].lane`);
    l.nodes.forEach((n, ni) => {
      if (n.lane !== undefined && !ids.includes(n.lane))
        unknown(n.lane, `layers[${li}].nodes[${ni}].lane`);
    });
  });
  const layer = d.layers.find((l) => l.lane !== undefined);
  const node = d.layers.flatMap((l) => l.nodes).find((n) => n.lane !== undefined);
  if (layer !== undefined && node !== undefined) {
    errors.push({
      code: "lane-mixed",
      index,
      field: "lanes",
      found: `layer ${layer.id} and node ${node.id} both lie in lanes`,
      expected:
        "lanes that hold layers (they run as rows) or nodes (they run as columns), one way per diagram",
      suggestion: `lane leave <file> ${node.id}, or lane leave <file> ${layer.id}`,
    });
    return errors;
  }
  if (layer !== undefined) errors.push(...rowGaps(d, index));
  errors.push(...groupsAcross(d, index));
  return errors;
}

function rowGaps(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  (d.lanes ?? []).forEach((lane, i) => {
    const rows = d.layers.flatMap((l, r) => (l.lane === lane.id ? [r] : []));
    if (rows.length === 0) return;
    const lo = rows[0] as number;
    const hi = rows[rows.length - 1] as number;
    const gaps = d.layers.slice(lo, hi + 1).filter((l) => l.lane !== lane.id);
    if (gaps.length === 0) return;
    const gap = gaps[0] as Layer;
    errors.push({
      code: "lane-gap",
      index,
      field: `lanes[${i}]`,
      found: `${lane.id} holds layers ${rows.map((r) => d.layers[r]?.id).join(", ")} but not ${gaps.map((l) => l.id).join(", ")}`,
      expected: "a lane that holds neighbouring layers",
      suggestion: `lane join <file> ${lane.id} ${gap.id}, or layer move the layers of ${lane.id} together`,
    });
  });
  return errors;
}

/** A group lies inside one lane, or outside every lane. */
function groupsAcross(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const rows = laneRun(d) === "rows";
  (d.groups ?? []).forEach((g, i) => {
    const lanes = new Set<string>();
    for (const l of d.layers) {
      for (const n of l.nodes) {
        if (n.group === g.id) lanes.add((rows ? l.lane : n.lane) ?? "");
      }
    }
    if (lanes.size < 2) return;
    const named = [...lanes].map((x) => (x === "" ? "outside every lane" : `lane ${x}`));
    const target = [...lanes].find((x) => x !== "") as string;
    errors.push({
      code: "group-across-lanes",
      index,
      field: `groups[${i}]`,
      found: `${g.id} has members ${named.join(" and ")}`,
      expected: "a group inside one lane, or outside every lane",
      suggestion: `lane join <file> ${target} ${g.id}, or lane leave <file> ${g.id}`,
    });
  });
  return errors;
}
