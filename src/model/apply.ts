// Applying operations (DESIGN.md D1, D3, D4, D5, D24). Pure and atomic: any
// error means the input diagram is untouched, and the first failing operation's
// errors are returned with its index.

import type { OpError } from "../errors.ts";
import * as layoutModule from "../layout/index.ts";
import type { Measurer } from "../text/types.ts";
import type { EdgeAddOp, LayerAddOp, NodeAddOp, NodeMoveOp, Op, Position } from "./ops.ts";
import { checkIntegrity, MAX_ACCENTS } from "./schema.ts";
import { suggestIds } from "./suggest.ts";
import {
  DEFAULT_DENSITY,
  DEFAULT_EDGE_KIND,
  DEFAULT_NODE_KIND,
  DEFAULT_SIZE,
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
}

function touch(s: State, ...ids: string[]) {
  for (const id of ids) if (!s.changed.includes(id)) s.changed.push(id);
}

function unusedKind(d: Diagram, id: string): string | undefined {
  if (d.layers.some((l) => l.id === id)) return "layer";
  if ((d.groups ?? []).some((g) => g.id === id)) return "group";
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
    expected: "an id not used by any layer, group, node or edge",
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
  d.layers.splice(at, 0, { id: op.id, label: op.label, nodes: [] });
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
  const node: DiagramNode = {
    id: op.id,
    label: op.label,
    kind: op.kind ?? DEFAULT_NODE_KIND,
    size: op.size ?? DEFAULT_SIZE,
  };
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
  if (!findNode(d, op.from)) errors.push(unknownNode(d, op.from, i, "from"));
  if (!findNode(d, op.to)) errors.push(unknownNode(d, op.to, i, "to"));
  let id = op.id;
  if (id !== undefined) {
    const dup = dupError(d, id, i);
    if (dup) errors.push(dup);
  } else {
    id = `${op.from}->${op.to}`;
    for (let n = 2; unusedKind(d, id) !== undefined; n++) id = `${op.from}->${op.to}#${n}`;
  }
  if (errors.length > 0) return errors;
  const edge: Edge = { id, from: op.from, to: op.to, kind: op.kind ?? DEFAULT_EDGE_KIND };
  if (op.label !== undefined) edge.label = op.label;
  d.edges.push(edge);
  touch(s, id);
  return [];
}

function step(s: State, op: Op, i: number): OpError[] {
  const d = s.d;
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
    case "group.add":
    case "group.join":
    case "group.leave":
    case "group.rename":
    case "group.remove":
      return groupStep(s, op, i);
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
  const s: State = { d: start, changed: [], pending: [] };
  for (let i = from; i < ops.length; i++) {
    const op = ops[i] as Op;
    const errors = step(s, op, i);
    if (errors.length > 0) return { errors };
  }
  placePending(s, m);
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
  // Rows with a gap between members are caught earlier, as group-gap (schema.ts).
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
  return { diagram: s.d, changed: s.changed };
}
