// Applying operations (DESIGN.md D1, D3, D4, D5, D24). Pure and atomic: any
// error means the input diagram is untouched, and the first failing operation's
// errors are returned with its index.

import type { OpError } from "../errors.ts";
import * as layoutModule from "../layout/index.ts";
import type { Measurer } from "../text/types.ts";
import { styleProblem, THEMES } from "../theme/themes.ts";
import { endIds, endKind } from "./ends.ts";
import { type LaneRun, laneRun, orderByLanes } from "./lanes.ts";
import type { EdgeAddOp, LayerAddOp, NodeAddOp, NodeMoveOp, Op, Position } from "./ops.ts";
import { checkIntegrity, MAX_ACCENTS } from "./schema.ts";
import { suggestIds } from "./suggest.ts";
import {
  DEFAULT_DENSITY,
  DEFAULT_EDGE_KIND,
  DEFAULT_NODE_KIND,
  type Diagram,
  type DiagramNode,
  type Edge,
  FORMAT_VERSION,
  type Layer,
} from "./types.ts";

export type ApplyResult = { diagram: Diagram; changed: string[] } | { errors: OpError[] };

interface Pending {
  node: string;
}

interface State {
  d: Diagram;
  changed: string[];
  /** Nodes that wait for an engine-chosen slot (D24), in operation order. */
  pending: Pending[];
  /** Layers to reorder once the batch is applied (layer.tidy, diagram.tidy). */
  tidy: Set<string>;
}

function touch(s: State, ...ids: string[]) {
  for (const id of ids) if (!s.changed.includes(id)) s.changed.push(id);
}

function unusedKind(d: Diagram, id: string): string | undefined {
  if (d.layers.some((l) => l.id === id)) return "layer";
  if ((d.groups ?? []).some((g) => g.id === id)) return "group";
  if ((d.lanes ?? []).some((x) => x.id === id)) return "lane";
  if (d.layers.some((l) => l.nodes.some((n) => n.id === id))) return "node";
  if (d.edges.some((e) => e.id === id)) return "edge";
  return undefined;
}

function dupError(d: Diagram, id: string, i: number): OpError | undefined {
  const kind = unusedKind(d, id);
  if (kind === undefined) return undefined;
  return {
    code: "duplicate-id",
    index: i,
    field: "id",
    found: id,
    expected: "an id not used by any layer, group, lane, node or edge",
    suggestion: `${id} is already a ${kind}; choose another id`,
  };
}

function nodeIds(d: Diagram): string[] {
  return d.layers.flatMap((l) => l.nodes.map((n) => n.id));
}

function findNode(
  d: Diagram,
  id: string,
): { layer: Layer; index: number; node: DiagramNode } | undefined {
  for (const layer of d.layers) {
    const index = layer.nodes.findIndex((n) => n.id === id);
    const node = layer.nodes[index];
    if (node) return { layer, index, node };
  }
  return undefined;
}

function unknownNode(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-node",
    index: i,
    field,
    found: id,
    expected: "the id of an existing node",
    suggestion: suggestIds(id, nodeIds(d), "node"),
  };
}

function unknownLayer(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-layer",
    index: i,
    field,
    found: id,
    expected: "the id of an existing layer",
    suggestion: suggestIds(
      id,
      d.layers.map((l) => l.id),
      "layer",
    ),
  };
}

function unknownGroup(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-group",
    index: i,
    field,
    found: id,
    expected: "the id of an existing group",
    suggestion: suggestIds(
      id,
      (d.groups ?? []).map((g) => g.id),
      "group",
    ),
  };
}

/** The errors for listed nodes that do not exist. */
function missingNodes(d: Diagram, ids: readonly string[], i: number): OpError[] {
  return ids.filter((id) => !findNode(d, id)).map((id) => unknownNode(d, id, i, "nodes"));
}

function setGroup(s: State, ids: readonly string[], group: string | undefined) {
  for (const id of ids) {
    const at = findNode(s.d, id);
    if (!at || at.node.group === group) continue;
    if (group === undefined) delete at.node.group;
    else at.node.group = group;
    touch(s, id);
  }
}

function groupStep(s: State, op: Extract<Op, { op: `group.${string}` }>, i: number): OpError[] {
  const d = s.d;
  const groups = d.groups ?? [];
  if (op.op === "group.add") {
    const errors: OpError[] = [];
    const dup = dupError(d, op.id, i);
    if (dup) errors.push(dup);
    errors.push(...missingNodes(d, op.nodes ?? [], i));
    if (errors.length > 0) return errors;
    groups.push({ id: op.id, label: op.label });
    d.groups = groups;
    touch(s, op.id);
    setGroup(s, op.nodes ?? [], op.id);
    return [];
  }
  if (op.op === "group.leave") {
    const errors = missingNodes(d, op.nodes, i);
    if (errors.length > 0) return errors;
    setGroup(s, op.nodes, undefined);
    return [];
  }
  const key = op.op === "group.join" ? op.group : op.id;
  const field = op.op === "group.join" ? "group" : "id";
  const g = groups.find((x) => x.id === key);
  if (!g) return [unknownGroup(d, key, i, field)];
  if (op.op === "group.join") {
    const errors = missingNodes(d, op.nodes, i);
    if (errors.length > 0) return errors;
    setGroup(s, op.nodes, g.id);
  } else if (op.op === "group.rename") {
    g.label = op.label;
    touch(s, g.id);
  } else {
    const members = d.layers.flatMap((l) =>
      l.nodes.filter((n) => n.group === g.id).map((n) => n.id),
    );
    d.groups = groups.filter((x) => x.id !== g.id);
    touch(s, g.id);
    setGroup(s, members, undefined);
    // The edges that end at the group go with it, as a node's do (D28).
    const gone = d.edges.filter((e) => e.from === g.id || e.to === g.id);
    d.edges = d.edges.filter((e) => e.from !== g.id && e.to !== g.id);
    touch(s, ...gone.map((e) => e.id));
  }
  return [];
}

function unknownLane(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-lane",
    index: i,
    field,
    found: id,
    expected: "the id of an existing lane",
    suggestion: suggestIds(
      id,
      (d.lanes ?? []).map((x) => x.id),
      "lane",
    ),
  };
}

/**
 * What lane members stand for: layers when lanes run as rows, nodes when they run
 * as columns. A group stands for its layers or its nodes. While no lane has a
 * member, the first layer or node decides; groups alone mean columns (D32).
 */
function laneTargets(
  d: Diagram,
  members: readonly string[],
  i: number,
  lane: string,
): { run: LaneRun; layers: Layer[]; nodes: DiagramNode[] } | OpError[] {
  const errors: OpError[] = [];
  const layerIds = d.layers.map((l) => l.id);
  const groupIds = (d.groups ?? []).map((g) => g.id);
  let run = laneRun(d);
  for (const id of members) {
    if (run !== undefined) break;
    if (layerIds.includes(id)) run = "rows";
    else if (findNode(d, id)) run = "columns";
  }
  const settled = run ?? "columns";
  const layers: Layer[] = [];
  const nodes: DiagramNode[] = [];
  for (const id of members) {
    const layer = d.layers.find((l) => l.id === id);
    const node = findNode(d, id);
    if (groupIds.includes(id)) {
      for (const l of d.layers) {
        const mine = l.nodes.filter((n) => n.group === id);
        if (mine.length === 0) continue;
        if (settled === "rows") layers.push(l);
        else nodes.push(...mine);
      }
    } else if (layer !== undefined) {
      if (settled === "rows") layers.push(layer);
      else
        errors.push({
          code: "lane-mixed",
          index: i,
          field: "members",
          found: `${id} is a layer, and the lanes here run as columns`,
          expected: "nodes or groups: lanes that run as columns hold nodes",
          suggestion: `lane join <file> ${lane} ${layer.nodes.map((n) => n.id).join(" ") || "<node>"}`,
        });
    } else if (node !== undefined) {
      if (settled === "columns") nodes.push(node.node);
      else
        errors.push({
          code: "lane-mixed",
          index: i,
          field: "members",
          found: `${id} is a node, and the lanes here run as rows`,
          expected: "layers or groups: lanes that run as rows hold layers",
          suggestion: `lane join <file> ${lane} ${node.layer.id}`,
        });
    } else {
      errors.push({
        code: "unknown-node",
        index: i,
        field: "members",
        found: id,
        expected: "the id of a layer, node or group",
        suggestion: suggestIds(id, [...layerIds, ...nodeIds(d), ...groupIds], "id"),
      });
    }
  }
  return errors.length > 0 ? errors : { run: settled, layers, nodes };
}

/** Puts the targets in the lane, or out of every lane when `lane` is undefined. */
function setLane(s: State, t: { layers: Layer[]; nodes: DiagramNode[] }, lane: string | undefined) {
  for (const x of [...t.layers, ...t.nodes]) {
    if (x.lane === lane) continue;
    if (lane === undefined) delete x.lane;
    else x.lane = lane;
    touch(s, x.id);
  }
}

function laneStep(s: State, op: Extract<Op, { op: `lane.${string}` }>, i: number): OpError[] {
  const d = s.d;
  const lanes = d.lanes ?? [];
  if (op.op === "lane.add") {
    const dup = dupError(d, op.id, i);
    if (dup) return [dup];
    const t = op.members === undefined ? undefined : laneTargets(d, op.members, i, op.id);
    if (Array.isArray(t)) return t;
    lanes.push({ id: op.id, label: op.label });
    d.lanes = lanes;
    touch(s, op.id);
    if (t !== undefined) setLane(s, t, op.id);
    return [];
  }
  if (op.op === "lane.leave") {
    const t = laneTargets(d, op.members, i, "<lane>");
    if (Array.isArray(t)) return t;
    setLane(s, t, undefined);
    return [];
  }
  const key = op.op === "lane.join" ? op.lane : op.id;
  const lane = lanes.find((x) => x.id === key);
  if (!lane) return [unknownLane(d, key, i, op.op === "lane.join" ? "lane" : "id")];
  if (op.op === "lane.join") {
    const t = laneTargets(d, op.members, i, lane.id);
    if (Array.isArray(t)) return t;
    setLane(s, t, lane.id);
  } else if (op.op === "lane.rename") {
    lane.label = op.label;
    touch(s, lane.id);
  } else {
    d.lanes = lanes.filter((x) => x.id !== lane.id);
    touch(s, lane.id);
    for (const l of d.layers) {
      if (l.lane === lane.id) setLane(s, { layers: [l], nodes: [] }, undefined);
      setLane(s, { layers: [], nodes: l.nodes.filter((n) => n.lane === lane.id) }, undefined);
    }
    // The edges that end at the lane go with it, as a group's do (D28).
    const gone = d.edges.filter((e) => e.from === lane.id || e.to === lane.id);
    d.edges = d.edges.filter((e) => e.from !== lane.id && e.to !== lane.id);
    touch(s, ...gone.map((e) => e.id));
  }
  return [];
}

function checkAlign(d: Diagram, nodeLayer: string, target: string, i: number): OpError | undefined {
  const at = findNode(d, target);
  if (!at) return unknownNode(d, target, i, "align");
  if (at.layer.id === nodeLayer) {
    return {
      code: "align-same-layer",
      index: i,
      field: "align",
      found: `${target} (layer ${nodeLayer})`,
      expected: "a node in another layer",
      suggestion: `${target} is in the same layer; align to a node in a different layer`,
    };
  }
  return undefined;
}

type Slot = { at: number } | { auto: true } | { error: OpError };

/** Where in `list` the position puts a node. `self` is not in `list`. */
function resolveSlot(
  d: Diagram,
  list: DiagramNode[],
  pos: Position,
  self: string,
  i: number,
  layerId: string,
): Slot {
  const set: string[] = [];
  if (pos.first === true) set.push("first");
  if (pos.last === true) set.push("last");
  if (pos.before !== undefined) set.push("before");
  if (pos.after !== undefined) set.push("after");
  if (set.length > 1) {
    return {
      error: {
        code: "conflicting-position",
        index: i,
        field: set.join(","),
        found: set.join(", "),
        expected: "at most one of first, last, before, after",
        suggestion: "keep one",
      },
    };
  }
  if (set.length === 0) return { auto: true };
  if (pos.first === true) return { at: 0 };
  if (pos.last === true) return { at: list.length };
  const field = pos.before !== undefined ? "before" : "after";
  const ref = (pos.before ?? pos.after) as string;
  if (ref === self) {
    return {
      error: {
        code: "bad-reference",
        index: i,
        field,
        found: ref,
        expected: "another node",
        suggestion: "a node cannot be placed relative to itself",
      },
    };
  }
  const idx = list.findIndex((n) => n.id === ref);
  if (idx < 0) {
    const elsewhere = findNode(d, ref);
    if (elsewhere) {
      return {
        error: {
          code: "not-in-layer",
          index: i,
          field,
          found: `${ref} (layer ${elsewhere.layer.id})`,
          expected: `a node in layer ${layerId}`,
          suggestion: `nodes in ${layerId}: ${list.map((n) => n.id).join(", ") || "(none)"}`,
        },
      };
    }
    return { error: unknownNode(d, ref, i, field) };
  }
  return { at: pos.before !== undefined ? idx : idx + 1 };
}

function addLayer(s: State, op: LayerAddOp, i: number): OpError[] {
  const d = s.d;
  const errors: OpError[] = [];
  const dup = dupError(d, op.id, i);
  if (dup) errors.push(dup);
  if (op.before !== undefined && op.after !== undefined) {
    errors.push({
      code: "conflicting-position",
      index: i,
      field: "before,after",
      found: "before, after",
      expected: "at most one of before, after",
      suggestion: "keep one",
    });
  }
  let at = d.layers.length;
  const ref = op.before ?? op.after;
  if (ref !== undefined && !(op.before !== undefined && op.after !== undefined)) {
    const idx = d.layers.findIndex((l) => l.id === ref);
    if (idx < 0) errors.push(unknownLayer(d, ref, i, op.before !== undefined ? "before" : "after"));
    else at = op.before !== undefined ? idx : idx + 1;
  }
  if (errors.length > 0) return errors;
  const layer: Layer = { id: op.id, label: op.label, nodes: [] };
  // A layer added inside a row lane's span joins the lane, so that the lane stays whole.
  const above = d.layers[at - 1]?.lane;
  if (above !== undefined && above === d.layers[at]?.lane) layer.lane = above;
  d.layers.splice(at, 0, layer);
  touch(s, op.id);
  return [];
}

function addNode(s: State, op: NodeAddOp, i: number): OpError[] {
  const d = s.d;
  const errors: OpError[] = [];
  const dup = dupError(d, op.id, i);
  if (dup) errors.push(dup);
  const layer = d.layers.find((l) => l.id === op.layer);
  if (!layer) errors.push(unknownLayer(d, op.layer, i, "layer"));
  if (layer && op.align !== undefined) {
    const e = checkAlign(d, layer.id, op.align, i);
    if (e) errors.push(e);
  }
  if (op.accent === true) {
    const count = d.layers.reduce((n, l) => n + l.nodes.filter((x) => x.accent).length, 0);
    if (count >= MAX_ACCENTS) {
      errors.push({
        code: "too-many-accents",
        index: i,
        field: "accent",
        found: `${count + 1} accented nodes`,
        expected: `at most ${MAX_ACCENTS}`,
        suggestion: "keep accent on the one or two nodes a reader should see first",
      });
    }
  }
  let slot: Slot = { auto: true };
  if (layer) {
    slot = resolveSlot(d, layer.nodes, op, op.id, i, layer.id);
    if ("error" in slot) errors.push(slot.error);
  }
  if (errors.length > 0 || !layer) return errors;
  const node: DiagramNode = { id: op.id, label: op.label, kind: op.kind ?? DEFAULT_NODE_KIND };
  if (op.size !== undefined) node.size = op.size;
  if (op.sublabel !== undefined) node.sublabel = op.sublabel;
  if (op.accent === true) node.accent = true;
  if (op.align !== undefined) node.align = op.align;
  if ("at" in slot) layer.nodes.splice(slot.at, 0, node);
  else {
    layer.nodes.push(node);
    s.pending.push({ node: op.id });
  }
  touch(s, op.id);
  return [];
}

function moveNode(s: State, op: NodeMoveOp, i: number): OpError[] {
  const d = s.d;
  const at = findNode(d, op.id);
  if (!at) return [unknownNode(d, op.id, i, "id")];
  const hasPos =
    op.first === true || op.last === true || op.before !== undefined || op.after !== undefined;
  if (op.layer === undefined && !hasPos) {
    return [
      {
        code: "missing-field",
        index: i,
        field: "layer",
        found: "(missing)",
        expected: "layer, or one of first, last, before, after",
      },
    ];
  }
  const target = op.layer === undefined ? at.layer : d.layers.find((l) => l.id === op.layer);
  if (!target) return [unknownLayer(d, op.layer as string, i, "layer")];
  const errors: OpError[] = [];
  if (target.id !== at.layer.id) {
    const own = at.node.align;
    const ownLayer = own === undefined ? undefined : findNode(d, own)?.layer.id;
    if (ownLayer === target.id) {
      errors.push({
        code: "align-same-layer",
        index: i,
        field: "layer",
        found: `${op.id} would share layer ${target.id} with ${own}`,
        expected: "a node whose align target is in another layer",
        suggestion: `${op.id} is aligned to ${own}; choose a different layer`,
      });
    }
    const clash = target.nodes.find((n) => n.align === op.id);
    if (clash) {
      errors.push({
        code: "align-same-layer",
        index: i,
        field: "layer",
        found: `${clash.id} in layer ${target.id} is aligned to ${op.id}`,
        expected: "no node in the target layer aligned to this node",
        suggestion: `choose a layer other than ${target.id}`,
      });
    }
  }
  const rest = target.nodes.filter((n) => n.id !== op.id);
  const slot = resolveSlot(d, rest, op, op.id, i, target.id);
  if ("error" in slot) errors.push(slot.error);
  if (errors.length > 0) return errors;
  at.layer.nodes.splice(at.index, 1);
  s.pending = s.pending.filter((p) => p.node !== op.id);
  if ("at" in slot) target.nodes.splice(slot.at, 0, at.node);
  else {
    target.nodes.push(at.node);
    s.pending.push({ node: op.id });
  }
  touch(s, op.id);
  return [];
}

function addEdge(s: State, op: EdgeAddOp, i: number): OpError[] {
  const d = s.d;
  const errors: OpError[] = [];
  for (const field of ["from", "to"] as const) {
    const end = op[field];
    if (endKind(d, end) !== undefined) continue;
    errors.push({
      code: "unknown-node",
      index: i,
      field,
      found: end,
      expected: "the id of an existing node, group, layer or lane",
      suggestion: suggestIds(end, endIds(d), "id"),
    });
  }
  let id = op.id;
  if (id !== undefined) {
    const dup = dupError(d, id, i);
    if (dup) errors.push(dup);
  } else {
    id = `${op.from}->${op.to}`;
    for (let n = 2; unusedKind(d, id) !== undefined; n++) id = `${op.from}->${op.to}#${n}`;
  }
  const kind = op.kind ?? DEFAULT_EDGE_KIND;
  if (op.both === true && kind === "link") errors.push(bothOnLink(id, i, "both"));
  if (errors.length > 0) return errors;
  const edge: Edge = { id, from: op.from, to: op.to, kind };
  if (op.label !== undefined) edge.label = op.label;
  if (op.both === true) edge.both = true;
  d.edges.push(edge);
  touch(s, id);
  return [];
}

function badStyle(style: string, problem: string, i: number): OpError {
  return {
    code: "bad-value",
    index: i,
    field: "style",
    found: style,
    expected: problem,
    suggestion: `one of ${Object.keys(THEMES).join(", ")}, or a stylesheet such as brand.grafical-style.yaml beside the diagram`,
  };
}

/** A link has no direction, so it takes no arrowheads at all (D33). */
function bothOnLink(id: string, i: number, field: string): OpError {
  return {
    code: "both-on-link",
    index: i,
    field,
    found: `edge ${id} is a link`,
    expected: "arrowheads only on a call, async, data or optional edge",
    suggestion: `leave out both, or give ${id} another kind first`,
  };
}

function unknownEdge(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-edge",
    index: i,
    field,
    found: id,
    expected: "the id of an existing edge",
    suggestion: suggestIds(
      id,
      d.edges.map((e) => e.id),
      "edge",
    ),
  };
}

function conflicting(i: number, set: string[]): OpError {
  return {
    code: "conflicting-position",
    index: i,
    field: set.join(","),
    found: set.join(", "),
    expected: "at most one of first, last, before, after",
    suggestion: "keep one",
  };
}

function moveLayer(s: State, op: Extract<Op, { op: "layer.move" }>, i: number): OpError[] {
  const d = s.d;
  const from = d.layers.findIndex((l) => l.id === op.id);
  if (from < 0) return [unknownLayer(d, op.id, i, "id")];
  const set: string[] = [];
  if (op.first === true) set.push("first");
  if (op.last === true) set.push("last");
  if (op.before !== undefined) set.push("before");
  if (op.after !== undefined) set.push("after");
  if (set.length !== 1) {
    if (set.length > 1) return [conflicting(i, set)];
    return [
      {
        code: "missing-field",
        index: i,
        field: "first,last,before,after",
        found: "(none)",
        expected: "one of first, last, before, after",
      },
    ];
  }
  const [layer] = d.layers.splice(from, 1) as [Layer];
  let at = op.first === true ? 0 : d.layers.length;
  const ref = op.before ?? op.after;
  if (ref !== undefined) {
    if (ref === op.id) {
      d.layers.splice(from, 0, layer);
      return [
        {
          code: "bad-reference",
          index: i,
          field: op.before !== undefined ? "before" : "after",
          found: ref,
          expected: "another layer",
          suggestion: "a layer cannot be placed relative to itself",
        },
      ];
    }
    const k = d.layers.findIndex((l) => l.id === ref);
    if (k < 0) {
      d.layers.splice(from, 0, layer);
      return [unknownLayer(d, ref, i, op.before !== undefined ? "before" : "after")];
    }
    at = op.before !== undefined ? k : k + 1;
  }
  d.layers.splice(at, 0, layer);
  touch(s, op.id);
  return [];
}

function removeLayer(s: State, op: Extract<Op, { op: "layer.remove" }>, i: number): OpError[] {
  const d = s.d;
  const k = d.layers.findIndex((l) => l.id === op.id);
  const layer = d.layers[k];
  if (layer === undefined) return [unknownLayer(d, op.id, i, "id")];
  if (layer.nodes.length > 0) {
    return [
      {
        code: "layer-not-empty",
        index: i,
        field: "id",
        found: `layer ${op.id} holds ${layer.nodes.map((n) => n.id).join(", ")}`,
        expected: "an empty layer",
        suggestion: `node move or node remove its nodes first, or layer.split to reshape it`,
      },
    ];
  }
  d.layers.splice(k, 1);
  touch(s, op.id);
  const gone = d.edges.filter((e) => e.from === op.id || e.to === op.id);
  d.edges = d.edges.filter((e) => e.from !== op.id && e.to !== op.id);
  touch(s, ...gone.map((e) => e.id));
  return [];
}

function splitLayer(s: State, op: Extract<Op, { op: "layer.split" }>, i: number): OpError[] {
  const d = s.d;
  const k = d.layers.findIndex((l) => l.id === op.id);
  const layer = d.layers[k];
  if (layer === undefined) return [unknownLayer(d, op.id, i, "id")];
  const dup = dupError(d, op.into, i);
  if (dup) return [{ ...dup, field: "into" }];
  if (layer.nodes.length < 2) {
    return [
      {
        code: "layer-too-small",
        index: i,
        field: "id",
        found: `layer ${op.id} holds ${layer.nodes.length} node${layer.nodes.length === 1 ? "" : "s"}`,
        expected: "a layer of two or more nodes",
        suggestion: "add nodes first, or layer.add a new layer and node move into it",
      },
    ];
  }
  let at = Math.ceil(layer.nodes.length / 2);
  if (op.from !== undefined) {
    at = layer.nodes.findIndex((n) => n.id === op.from);
    if (at < 0) {
      const elsewhere = findNode(d, op.from);
      if (!elsewhere) return [unknownNode(d, op.from, i, "from")];
      return [
        {
          code: "not-in-layer",
          index: i,
          field: "from",
          found: `${op.from} (layer ${elsewhere.layer.id})`,
          expected: `a node in layer ${op.id}`,
          suggestion: `nodes in ${op.id}: ${layer.nodes.map((n) => n.id).join(", ")}`,
        },
      ];
    }
    if (at === 0) {
      return [
        {
          code: "bad-reference",
          index: i,
          field: "from",
          found: op.from,
          expected: `a node of ${op.id} other than its first, so that both layers keep a node`,
          suggestion: `from: ${layer.nodes[1]?.id}`,
        },
      ];
    }
  }
  const moved = layer.nodes.splice(at);
  const into: Layer = { id: op.into, label: op.label, nodes: moved };
  if (layer.lane !== undefined) into.lane = layer.lane;
  d.layers.splice(k + 1, 0, into);
  touch(s, op.into, ...moved.map((n) => n.id));
  return [];
}

function swapNodes(s: State, op: Extract<Op, { op: "node.swap" }>, i: number): OpError[] {
  const d = s.d;
  const a = findNode(d, op.a);
  const b = findNode(d, op.b);
  const errors: OpError[] = [];
  if (!a) errors.push(unknownNode(d, op.a, i, "a"));
  if (!b) errors.push(unknownNode(d, op.b, i, "b"));
  if (errors.length > 0 || !a || !b) return errors;
  if (op.a === op.b) {
    return [
      {
        code: "bad-reference",
        index: i,
        field: "b",
        found: op.b,
        expected: "another node",
        suggestion: "a node cannot swap with itself",
      },
    ];
  }
  a.layer.nodes[a.index] = b.node;
  b.layer.nodes[b.index] = a.node;
  s.pending = s.pending.filter((p) => p.node !== op.a && p.node !== op.b);
  touch(s, op.a, op.b);
  return [];
}

function mergeNodes(s: State, op: Extract<Op, { op: "node.merge" }>, i: number): OpError[] {
  const d = s.d;
  const errors = missingNodes(d, op.nodes, i);
  if (new Set(op.nodes).size !== op.nodes.length) {
    errors.push({
      code: "duplicate-id",
      index: i,
      field: "nodes",
      found: op.nodes.join(", "),
      expected: "each node once",
      suggestion: "list each node to merge once",
    });
  }
  if (!op.nodes.includes(op.id)) {
    const dup = dupError(d, op.id, i);
    if (dup) errors.push(dup);
  }
  if (errors.length > 0) return errors;
  const parts = op.nodes.map((id) => findNode(d, id)?.node as DiagramNode);
  const first = findNode(d, op.nodes[0] as string);
  if (!first) return [];
  const node: DiagramNode = { id: op.id, label: op.label, kind: op.kind ?? first.node.kind };
  if (op.sublabel !== undefined) node.sublabel = op.sublabel;
  if (parts.some((p) => p.accent === true)) node.accent = true;
  if (first.node.group !== undefined) node.group = first.node.group;
  if (first.node.lane !== undefined) node.lane = first.node.lane;
  first.layer.nodes[first.index] = node;
  const merged = new Set(op.nodes);
  for (const id of op.nodes.slice(1)) {
    const at = findNode(d, id);
    if (at) at.layer.nodes.splice(at.index, 1);
  }
  s.pending = s.pending.filter((p) => !merged.has(p.node));
  touch(s, op.id, ...op.nodes);
  // Alignments to a merged node are dropped, and the nodes reported.
  for (const l of d.layers) {
    for (const n of l.nodes) {
      if (n.align !== undefined && merged.has(n.align)) {
        delete n.align;
        touch(s, n.id);
      }
    }
  }
  // The new node keeps every edge of the merged ones. Edges between them go, and
  // edges that become the same (ends, kind and label) are kept once.
  const seen = new Set<string>();
  const kept: Edge[] = [];
  for (const e of d.edges) {
    const from = merged.has(e.from) ? op.id : e.from;
    const to = merged.has(e.to) ? op.id : e.to;
    if (from === op.id && to === op.id && (merged.has(e.from) || merged.has(e.to))) {
      touch(s, e.id);
      continue;
    }
    const key = `${from}\u0000${to}\u0000${e.kind}\u0000${e.label ?? ""}`;
    if (seen.has(key)) {
      touch(s, e.id);
      continue;
    }
    seen.add(key);
    if (from !== e.from || to !== e.to) {
      touch(s, e.id);
      kept.push({ ...e, from, to });
    } else kept.push(e);
  }
  d.edges = kept;
  return [];
}

function orderGroup(s: State, op: Extract<Op, { op: "group.order" }>, i: number): OpError[] {
  const d = s.d;
  const groups = d.groups ?? [];
  if (!groups.some((g) => g.id === op.id)) return [unknownGroup(d, op.id, i, "id")];
  const set: string[] = [];
  if (op.before !== undefined) set.push("before");
  if (op.after !== undefined) set.push("after");
  if (set.length !== 1) {
    if (set.length > 1) return [{ ...conflicting(i, set), expected: "one of before, after" }];
    return [
      {
        code: "missing-field",
        index: i,
        field: "before,after",
        found: "(none)",
        expected: "one of before, after",
      },
    ];
  }
  const other = (op.before ?? op.after) as string;
  const field = op.before !== undefined ? "before" : "after";
  if (!groups.some((g) => g.id === other)) return [unknownGroup(d, other, i, field)];
  let shared = false;
  for (const l of d.layers) {
    const mine = l.nodes.filter((n) => n.group === op.id);
    if (mine.length === 0 || !l.nodes.some((n) => n.group === other)) continue;
    shared = true;
    const rest = l.nodes.filter((n) => n.group !== op.id);
    const theirs = rest.map((n, k) => (n.group === other ? k : -1)).filter((k) => k >= 0);
    const at =
      op.before !== undefined ? (theirs[0] as number) : (theirs[theirs.length - 1] as number) + 1;
    const next = [...rest.slice(0, at), ...mine, ...rest.slice(at)];
    if (next.some((n, k) => n !== l.nodes[k])) touch(s, ...mine.map((n) => n.id));
    l.nodes = next;
  }
  if (!shared) {
    return [
      {
        code: "no-shared-layer",
        index: i,
        field,
        found: `${op.id} and ${other} have no layer in common`,
        expected: "two groups with members in at least one same layer",
        suggestion: `node move the members of ${op.id} instead`,
      },
    ];
  }
  return [];
}

/** The newer operations: diagram settings, layers, node and edge edits, group order. */
function editStep(s: State, op: Op, i: number): OpError[] | undefined {
  const d = s.d;
  switch (op.op) {
    case "diagram.title":
      d.title = op.text;
      touch(s, "title");
      return [];
    case "diagram.density":
      d.density = op.density;
      touch(s, "density");
      return [];
    case "diagram.legend": {
      const legend = { ...(d.legend ?? {}) };
      if (op.text === undefined) delete legend[op.line];
      else legend[op.line] = op.text;
      if (Object.keys(legend).length > 0) d.legend = legend;
      else delete d.legend;
      touch(s, "legend");
      return [];
    }
    case "diagram.style": {
      if (op.style === undefined) delete d.style;
      else {
        const problem = styleProblem(op.style);
        if (problem !== undefined) return [badStyle(op.style, problem, i)];
        d.style = op.style;
      }
      touch(s, "style");
      return [];
    }
    case "diagram.tidy":
      for (const l of d.layers) s.tidy.add(l.id);
      return [];
    case "layer.rename": {
      const layer = d.layers.find((l) => l.id === op.id);
      if (!layer) return [unknownLayer(d, op.id, i, "id")];
      layer.label = op.label;
      touch(s, op.id);
      return [];
    }
    case "layer.move":
      return moveLayer(s, op, i);
    case "layer.remove":
      return removeLayer(s, op, i);
    case "layer.tidy":
      if (!d.layers.some((l) => l.id === op.id)) return [unknownLayer(d, op.id, i, "id")];
      s.tidy.add(op.id);
      return [];
    case "layer.split":
      return splitLayer(s, op, i);
    case "node.describe":
    case "node.kind":
    case "node.emphasize":
    case "node.align": {
      const at = findNode(d, op.id);
      if (!at) return [unknownNode(d, op.id, i, "id")];
      const n = at.node;
      if (op.op === "node.describe") {
        if (op.text === undefined) delete n.sublabel;
        else n.sublabel = op.text;
      } else if (op.op === "node.kind") n.kind = op.kind;
      else if (op.op === "node.emphasize") {
        if (op.off === true) delete n.accent;
        else if (n.accent !== true) {
          const count = d.layers.reduce((c, l) => c + l.nodes.filter((x) => x.accent).length, 0);
          if (count >= MAX_ACCENTS) {
            return [
              {
                code: "too-many-accents",
                index: i,
                field: "id",
                found: `${count + 1} accented nodes`,
                expected: `at most ${MAX_ACCENTS}`,
                suggestion: "node emphasize <id> --off on another node first",
              },
            ];
          }
          n.accent = true;
        }
      } else if (op.to === undefined) delete n.align;
      else {
        const e = checkAlign(d, at.layer.id, op.to, i);
        if (e) return [{ ...e, field: "to" }];
        n.align = op.to;
      }
      touch(s, op.id);
      return [];
    }
    case "edge.emphasize": {
      const missing = op.edges.filter((id) => !d.edges.some((e) => e.id === id));
      if (missing.length > 0) return missing.map((id) => unknownEdge(d, id, i, "edges"));
      for (const e of d.edges) {
        if (!op.edges.includes(e.id)) continue;
        if (op.off === true) delete e.accent;
        else e.accent = true;
        touch(s, e.id);
      }
      return [];
    }
    case "node.swap":
      return swapNodes(s, op, i);
    case "node.merge":
      return mergeNodes(s, op, i);
    case "edge.relabel":
    case "edge.kind":
    case "edge.reverse":
    case "edge.both":
    case "edge.retarget": {
      const e = d.edges.find((x) => x.id === op.id);
      if (!e) return [unknownEdge(d, op.id, i, "id")];
      if (op.op === "edge.relabel") {
        if (op.label === undefined) delete e.label;
        else e.label = op.label;
      } else if (op.op === "edge.kind") {
        if (op.kind === "link" && e.both === true) return [bothOnLink(e.id, i, "kind")];
        e.kind = op.kind;
      } else if (op.op === "edge.reverse") [e.from, e.to] = [e.to, e.from];
      else if (op.op === "edge.both") {
        if (op.off === true) delete e.both;
        else if (e.kind === "link") return [bothOnLink(e.id, i, "id")];
        else e.both = true;
      } else {
        if (op.from === undefined && op.to === undefined) {
          return [
            {
              code: "missing-field",
              index: i,
              field: "from,to",
              found: "(none)",
              expected: "from, to or both",
            },
          ];
        }
        const errors: OpError[] = [];
        for (const field of ["from", "to"] as const) {
          const end = op[field];
          if (end === undefined || endKind(d, end) !== undefined) continue;
          errors.push({
            code: "unknown-node",
            index: i,
            field,
            found: end,
            expected: "the id of an existing node, group, layer or lane",
            suggestion: suggestIds(end, endIds(d), "id"),
          });
        }
        if (errors.length > 0) return errors;
        if (op.from !== undefined) e.from = op.from;
        if (op.to !== undefined) e.to = op.to;
      }
      touch(s, op.id);
      return [];
    }
    case "group.describe": {
      const g = (d.groups ?? []).find((x) => x.id === op.id);
      if (!g) return [unknownGroup(d, op.id, i, "id")];
      if (op.text === undefined) delete g.sublabel;
      else g.sublabel = op.text;
      touch(s, op.id);
      return [];
    }
    case "group.order":
      return orderGroup(s, op, i);
    default:
      return undefined;
  }
}

function step(s: State, op: Op, i: number): OpError[] {
  const d = s.d;
  const edited = editStep(s, op, i);
  if (edited !== undefined) return edited;
  switch (op.op) {
    case "diagram.new":
      return [
        {
          code: "not-allowed",
          index: i,
          field: "op",
          found: op.op,
          expected: "an existing diagram to change",
          suggestion: "diagram.new only creates a file: use grafical new",
        },
      ];
    case "diagram.subtitle":
    case "diagram.note": {
      const field = op.op === "diagram.subtitle" ? "subtitle" : "note";
      if (op.text === undefined) delete d[field];
      else d[field] = op.text;
      touch(s, field);
      return [];
    }
    case "diagram.sizing":
      if (op.mode === "fixed") d.sizing = "fixed";
      else delete d.sizing;
      touch(s, "sizing");
      return [];
    case "group.add":
    case "group.join":
    case "group.leave":
    case "group.rename":
    case "group.remove":
      return groupStep(s, op, i);
    case "lane.add":
    case "lane.join":
    case "lane.leave":
    case "lane.rename":
    case "lane.remove":
      return laneStep(s, op, i);
    case "layer.add":
      return addLayer(s, op, i);
    case "node.add":
      return addNode(s, op, i);
    case "node.move":
      return moveNode(s, op, i);
    case "edge.add":
      return addEdge(s, op, i);
    case "node.rename": {
      const at = findNode(d, op.id);
      if (!at) return [unknownNode(d, op.id, i, "id")];
      at.node.label = op.label;
      touch(s, op.id);
      return [];
    }
    case "node.resize": {
      const at = findNode(d, op.id);
      if (!at) return [unknownNode(d, op.id, i, "id")];
      if (op.size === undefined) delete at.node.size;
      else at.node.size = op.size;
      touch(s, op.id);
      return [];
    }
    case "node.remove": {
      const at = findNode(d, op.id);
      if (!at) return [unknownNode(d, op.id, i, "id")];
      at.layer.nodes.splice(at.index, 1);
      s.pending = s.pending.filter((p) => p.node !== op.id);
      touch(s, op.id);
      const gone = d.edges.filter((e) => e.from === op.id || e.to === op.id);
      d.edges = d.edges.filter((e) => e.from !== op.id && e.to !== op.id);
      touch(s, ...gone.map((e) => e.id));
      // An alignment to a removed node is dropped, and the node is reported.
      for (const l of d.layers) {
        for (const n of l.nodes) {
          if (n.align === op.id) {
            delete n.align;
            touch(s, n.id);
          }
        }
      }
      return [];
    }
    case "edge.remove": {
      const idx = d.edges.findIndex((e) => e.id === op.id);
      if (idx < 0) {
        return [
          {
            code: "unknown-edge",
            index: i,
            field: "id",
            found: op.id,
            expected: "the id of an existing edge",
            suggestion: suggestIds(
              op.id,
              d.edges.map((e) => e.id),
              "edge",
            ),
          },
        ];
      }
      d.edges.splice(idx, 1);
      touch(s, op.id);
      return [];
    }
    default:
      // Every other operation is handled by editStep above.
      return [];
  }
}

function newDiagram(op: Extract<Op, { op: "diagram.new" }>): Diagram {
  const d: Diagram = {
    grafical: FORMAT_VERSION,
    title: op.title,
    density: op.density ?? DEFAULT_DENSITY,
    layers: [],
    edges: [],
  };
  if (op.sizing === "fixed") d.sizing = "fixed";
  if (op.style !== undefined) d.style = op.style;
  if (op.subtitle !== undefined) d.subtitle = op.subtitle;
  if (op.note !== undefined) d.note = op.note;
  return d;
}

/**
 * Once all operations are applied, nodes without a position take the engine's
 * slot (D24): each in turn, then all of them together, so that a node added early
 * in a batch can still move for the edges added after it.
 */
function placePending(s: State, m: Measurer) {
  const ids: string[] = [];
  for (const p of s.pending) {
    const at = findNode(s.d, p.node);
    if (!at) continue;
    ids.push(p.node);
    at.layer.nodes.splice(at.index, 1);
    const raw = layoutModule.chooseSlot(s.d, at.layer.id, p.node, m);
    const slot = Math.max(0, Math.min(at.layer.nodes.length, Math.trunc(raw)));
    at.layer.nodes.splice(slot, 0, at.node);
  }
  s.pending = [];
  if (ids.length >= 2) s.d = layoutModule.orderTogether(s.d, ids, m);
}

/** layer.tidy and diagram.tidy: the named layers reordered once, together (D24). */
function tidyLayers(s: State, m: Measurer) {
  if (s.tidy.size === 0) return;
  const ids = s.d.layers.filter((l) => s.tidy.has(l.id)).flatMap((l) => l.nodes.map((n) => n.id));
  const before = new Map(s.d.layers.flatMap((l) => l.nodes.map((n, k) => [n.id, k] as const)));
  s.d = layoutModule.orderTogether(s.d, ids, m);
  for (const l of s.d.layers) {
    l.nodes.forEach((n, k) => {
      if (before.get(n.id) !== k) touch(s, n.id);
    });
  }
  s.tidy.clear();
}

/**
 * `diagram` is null only for `diagram.new`, which must be the single first
 * operation. Nothing is changed in the input. D24: nodes added or moved
 * without a position are slotted after every operation has been applied.
 */
export function applyOps(diagram: Diagram | null, ops: readonly Op[], m: Measurer): ApplyResult {
  const first = ops[0];
  let start: Diagram;
  let from = 0;
  if (diagram === null) {
    if (first === undefined || first.op !== "diagram.new") {
      return {
        errors: [
          {
            code: "no-diagram",
            index: 0,
            found: first === undefined ? "(no operations)" : first.op,
            expected: "diagram.new as the first operation when there is no diagram",
            suggestion: "create the file first: grafical new <file> --title <text>",
          },
        ],
      };
    }
    start = newDiagram(first);
    from = 1;
  } else start = structuredClone(diagram);
  const s: State = { d: start, changed: [], pending: [], tidy: new Set() };
  for (let i = from; i < ops.length; i++) {
    const op = ops[i] as Op;
    const errors = step(s, op, i);
    if (errors.length > 0) return { errors };
  }
  placePending(s, m);
  tidyLayers(s, m);
  // Column lanes keep each row in lane order (D32).
  touch(s, ...orderByLanes(s.d));
  const last = Math.max(0, ops.length - 1);
  const broken = checkIntegrity(s.d, last);
  if (broken.length > 0) return { errors: broken };
  // An alignment that cannot hold with the order of its layers is an operation error (D10).
  const problems = layoutModule.validateAlignments(s.d);
  if (problems.length > 0) {
    return {
      errors: problems.map((p) => ({
        code: p.code,
        index: last,
        field: "align",
        found: p.found,
        expected: p.expected,
        suggestion: p.suggestion,
      })),
    };
  }
  // A group the engine cannot box without a non-member inside is an operation error (D7).
  // A row between members that holds none is boxed over, its nodes beside the box.
  const groupProblems = layoutModule.validateGroups(s.d);
  if (groupProblems.length > 0) {
    return {
      errors: groupProblems.map((p) => ({
        code: p.code,
        index: last,
        field: "group",
        found: p.found,
        expected: p.expected,
        suggestion: p.suggestion,
      })),
    };
  }
  if (s.d.groups !== undefined && s.d.groups.length === 0) delete s.d.groups;
  if (s.d.lanes !== undefined && s.d.lanes.length === 0) delete s.d.lanes;
  return { diagram: s.d, changed: s.changed };
}
