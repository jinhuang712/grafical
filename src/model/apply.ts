// Applying operations (DESIGN.md D1, D3, D4, D5, D24). Pure and atomic: any
// error means the input diagram is untouched, and the first failing operation's
// errors are returned with its index.

import type { OpError } from "../errors.ts";
import * as layoutModule from "../layout/index.ts";
import type { Measurer } from "../text/types.ts";
import { edgeWidth } from "../theme/paint.ts";
import { STYLESHEET_SUFFIX, styleProblem, THEMES, themeOf } from "../theme/themes.ts";
import { endIds, endKind } from "./ends.ts";
import { groupChain, groupHeight, inGroup, innerGroups, MAX_GROUP_DEPTH } from "./groups.ts";
import { type LaneRun, laneRun, orderByLanes } from "./lanes.ts";
import { noteTargets, pruneNotes } from "./notes.ts";
import type {
  DiagramLegendOp,
  EdgeAddOp,
  LayerAddOp,
  NodeAddOp,
  NodeIconOp,
  NodeMoveOp,
  Op,
  Position,
} from "./ops.ts";
import {
  checkIntegrity,
  graphemes,
  isEmoji,
  isMarkFile,
  legendWeightProblem,
  MARK_TEXT_MAX,
  MAX_ACCENTS,
  markColor,
  markNameTooLong,
} from "./schema.ts";
import { closest } from "./suggest.ts";
import {
  DEFAULT_DENSITY,
  DEFAULT_EDGE_KIND,
  DEFAULT_MARK_SHAPE,
  DEFAULT_MARK_SIZE,
  DEFAULT_NODE_KIND,
  type Diagram,
  type DiagramNode,
  type Edge,
  FORMAT_VERSION,
  type Group,
  type Layer,
  type Legend,
  MARK_COLORS,
  MARK_SLOTS,
  type Mark,
  type MarkStyle,
  type Wall,
  weightKey,
} from "./types.ts";
import { pruneWalls, wallNames } from "./walls.ts";

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
  if ((d.walls ?? []).some((x) => x.id === id)) return "wall";
  if (d.layers.some((l) => l.nodes.some((n) => n.id === id))) return "node";
  if (d.edges.some((e) => e.id === id)) return "edge";
  return undefined;
}

function dupError(d: Diagram, id: string, i: number): OpError | undefined {
  const kind = unusedKind(d, id);
  if (kind === undefined) return undefined;
  let n = 2;
  while (unusedKind(d, `${id}-${n}`) !== undefined) n++;
  return {
    code: "duplicate-id",
    index: i,
    field: "id",
    found: id,
    facts: { is: kind, free: `${id}-${n}` },
  };
}

/** The style fields of a node.icon operation, in the order errors name them. */
const MARK_STYLE_FIELDS = ["bg", "fg", "border", "shape"] as const;

/**
 * The mark a node.icon operation sets, or its errors (D40). A style that holds its default
 * is left out, so the file shows only what was chosen. A picture, that is an emoji or a
 * file, takes a size and nothing else: it has its own colors and outline.
 */
function buildMark(op: NodeIconOp, icon: string, i: number): Mark | OpError[] {
  const bad = (code: string, field: string, found: string, facts?: OpError["facts"]): OpError[] => [
    { code, index: i, field, found, ...(facts === undefined ? {} : { facts }) },
  ];
  const size = op.size === undefined || op.size === DEFAULT_MARK_SIZE ? undefined : op.size;
  const picture = op.sha256 !== undefined || isEmoji(icon);
  if (op.sha256 === undefined && isMarkFile(icon)) {
    // The command line reads the file and fills in its hash before the operation gets here.
    return bad("mark-file-unread", "icon", icon, {
      fix: [`node icon <file> ${op.id} --slot ${op.slot} --icon ${icon}`],
    });
  }
  if (op.sha256 === undefined && graphemes(icon).length > MARK_TEXT_MAX) {
    return bad("mark-too-long", "icon", icon, { max: MARK_TEXT_MAX });
  }
  if (picture) {
    for (const f of MARK_STYLE_FIELDS) {
      const v = op[f];
      if (v !== undefined) {
        return bad("mark-style-on-picture", f, v, {
          allowed: ["size"],
          fix: [`node icon <file> ${op.id} --slot ${op.slot} --icon ${icon}`],
        });
      }
    }
    if (op.sha256 !== undefined) {
      return { file: icon, sha256: op.sha256, ...(size === undefined ? {} : { size }) };
    }
    return size === undefined ? icon : { text: icon, size };
  }
  const style: MarkStyle = {};
  for (const f of ["bg", "fg", "border"] as const) {
    const v = op[f];
    if (v === undefined) continue;
    const hex = markColor(v);
    if (hex === undefined) {
      return bad("bad-value", f, v, { allowed: [...Object.keys(MARK_COLORS), "#rrggbb"] });
    }
    style[f] = hex;
  }
  if (op.shape !== undefined && op.shape !== DEFAULT_MARK_SHAPE) style.shape = op.shape;
  if (size !== undefined) style.size = size;
  return Object.keys(style).length === 0 ? icon : { text: icon, ...style };
}

/** The fields of a legend operation that name its entry; it names exactly one (D42). */
const LEGEND_TARGETS = ["style", "weight", "mark"] as const;

/** A map with one key set, or removed when the value is undefined; undefined when empty. */
function setWords<V>(
  words: Record<string, V> | undefined,
  key: string,
  value: V | undefined,
): Record<string, V> | undefined {
  const out = { ...(words ?? {}) };
  if (value === undefined) delete out[key];
  else out[key] = value;
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Sets one legend entry's words, leaves it out with hide, or with neither gives it back
 * its default (D42). A mark has no entry by default, so it cannot be left out.
 */
function setLegend(s: State, op: DiagramLegendOp, i: number): OpError[] {
  const named = LEGEND_TARGETS.filter((k) => op[k] !== undefined);
  const hide = op.hide === true;
  const clash = (a: string, b: string): OpError => ({
    code: "conflicting-fields",
    index: i,
    field: `${a},${b}`,
    found: `${a},${b}`,
    facts: { max: 1 },
  });
  if (named.length === 0) {
    return [
      {
        code: "missing-field",
        index: i,
        field: "style",
        found: "",
        facts: { allowed: [...LEGEND_TARGETS] },
      },
    ];
  }
  if (named.length > 1) return [clash(named[0] ?? "", named[1] ?? "")];
  if (hide && op.text !== undefined) return [clash("text", "hide")];
  if (hide && op.mark !== undefined) return [clash("mark", "hide")];
  // false leaves the entry out (D42).
  const value = hide ? false : op.text;
  const legend: Legend = { ...(s.d.legend ?? {}) };
  if (op.style !== undefined) {
    if (value === undefined) delete legend[op.style];
    else legend[op.style] = value;
  } else if (op.weight !== undefined) {
    const key = weightKey(op.weight);
    const P = themeOf(s.d).paint;
    const levels = ["thick", ...Object.keys(P.edge.weights)];
    const facts = legendWeightProblem(key, levels);
    if (facts !== undefined)
      return [{ code: "bad-value", index: i, field: "weight", found: key, facts }];
    if (typeof op.weight === "string" && edgeWidth({ weight: op.weight }, P) === undefined) {
      return [
        {
          code: "unknown-weight",
          index: i,
          field: "weight",
          found: key,
          facts: { near: closest(key, levels), allowed: levels },
        },
      ];
    }
    const weights = setWords(legend.weights, key, value);
    if (weights === undefined) delete legend.weights;
    else legend.weights = weights;
  } else if (op.mark !== undefined) {
    if (markNameTooLong(op.mark)) {
      return [
        {
          code: "mark-too-long",
          index: i,
          field: "mark",
          found: op.mark,
          facts: { max: MARK_TEXT_MAX },
        },
      ];
    }
    const marks = setWords(legend.marks, op.mark, op.text);
    if (marks === undefined) delete legend.marks;
    else legend.marks = marks;
  }
  if (Object.keys(legend).length > 0) s.d.legend = legend;
  else delete s.d.legend;
  touch(s, "legend");
  return [];
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
    facts: { near: closest(id, nodeIds(d)) },
  };
}

function unknownLayer(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-layer",
    index: i,
    field,
    found: id,
    facts: {
      near: closest(
        id,
        d.layers.map((l) => l.id),
      ),
    },
  };
}

function unknownGroup(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-group",
    index: i,
    field,
    found: id,
    facts: {
      near: closest(
        id,
        (d.groups ?? []).map((g) => g.id),
      ),
    },
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

/** Sets the group a group sits in, or takes it out of every group (D34). */
function setParent(s: State, id: string, parent: string | undefined) {
  const g = s.d.groups?.find((x) => x.id === id);
  if (g === undefined || g.in === parent) return;
  if (parent === undefined) delete g.in;
  else g.in = parent;
  touch(s, id);
}

/** A group that would sit more than three deep, with what is inside it, or inside itself (D34). */
function nestError(
  d: Diagram,
  id: string,
  parent: string,
  i: number,
  field: string,
): OpError | undefined {
  const around = groupChain(d, parent);
  // The value at fault: the group it would sit in, or the group joining another.
  const found = field === "in" ? parent : id;
  if (around.includes(id)) {
    return {
      code: "group-cycle",
      index: i,
      field,
      found,
      facts: { chain: [id, ...around.slice(0, around.indexOf(id) + 1)] },
    };
  }
  const levels = around.length + groupHeight(d, id);
  if (levels <= MAX_GROUP_DEPTH) return undefined;
  return {
    code: "group-too-deep",
    index: i,
    field,
    found,
    facts: { count: levels, max: MAX_GROUP_DEPTH, chain: [id, ...around] },
  };
}

function groupStep(s: State, op: Extract<Op, { op: `group.${string}` }>, i: number): OpError[] {
  const d = s.d;
  const groups = d.groups ?? [];
  const isGroup = (id: string) => groups.some((x) => x.id === id);
  /** Ids that are neither a node nor a group. */
  const missing = (ids: readonly string[]) =>
    missingNodes(
      d,
      ids.filter((id) => !isGroup(id)),
      i,
    );
  if (op.op === "group.add") {
    const errors: OpError[] = [];
    const dup = dupError(d, op.id, i);
    if (dup) errors.push(dup);
    errors.push(...missingNodes(d, op.nodes ?? [], i));
    if (op.in !== undefined && !isGroup(op.in)) errors.push(unknownGroup(d, op.in, i, "in"));
    if (errors.length > 0) return errors;
    const deep = op.in === undefined ? undefined : nestError(d, op.id, op.in, i, "in");
    if (deep) return [deep];
    const group: Group = { id: op.id, label: op.label };
    if (op.sublabel !== undefined) group.sublabel = op.sublabel;
    if (op.in !== undefined) group.in = op.in;
    groups.push(group);
    d.groups = groups;
    touch(s, op.id);
    setGroup(s, op.nodes ?? [], op.id);
    return [];
  }
  if (op.op === "group.leave") {
    const errors = missing(op.nodes);
    if (errors.length > 0) return errors;
    // Out of every group, or one level out: into the group around the one it leaves.
    const outer = (g: string | undefined) =>
      op.up === true && g !== undefined ? groups.find((x) => x.id === g)?.in : undefined;
    for (const id of op.nodes) {
      if (isGroup(id)) setParent(s, id, outer(groups.find((x) => x.id === id)?.in));
      else setGroup(s, [id], outer(findNode(d, id)?.node.group));
    }
    return [];
  }
  const key = op.op === "group.join" ? op.group : op.id;
  const field = op.op === "group.join" ? "group" : "id";
  const g = groups.find((x) => x.id === key);
  if (!g) return [unknownGroup(d, key, i, field)];
  if (op.op === "group.join") {
    const errors = missing(op.nodes);
    if (errors.length > 0) return errors;
    for (const id of op.nodes) {
      if (!isGroup(id)) {
        setGroup(s, [id], g.id);
        continue;
      }
      const wrong = nestError(d, id, g.id, i, "nodes");
      if (wrong) return [wrong];
      setParent(s, id, g.id);
    }
  } else if (op.op === "group.rename") {
    g.label = op.label;
    touch(s, g.id);
  } else {
    // Its nodes and inner groups move into the group around it, or out of every group.
    const into = op.op === "group.remove" && op.out === true ? undefined : g.in;
    const members = d.layers.flatMap((l) =>
      l.nodes.filter((n) => n.group === g.id).map((n) => n.id),
    );
    for (const c of innerGroups(d, g.id)) setParent(s, c, into);
    d.groups = groups.filter((x) => x.id !== g.id);
    touch(s, g.id);
    setGroup(s, members, into);
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
    facts: {
      near: closest(
        id,
        (d.lanes ?? []).map((x) => x.id),
      ),
    },
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
        const mine = l.nodes.filter((n) => inGroup(d, n, id));
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
          found: id,
          facts: {
            is: "layer",
            run: "columns",
            fix: [`lane join <file> ${lane} ${layer.nodes.map((n) => n.id).join(" ") || "<node>"}`],
          },
        });
    } else if (node !== undefined) {
      if (settled === "columns") nodes.push(node.node);
      else
        errors.push({
          code: "lane-mixed",
          index: i,
          field: "members",
          found: id,
          facts: { is: "node", run: "rows", fix: [`lane join <file> ${lane} ${node.layer.id}`] },
        });
    } else {
      errors.push({
        code: "unknown-node",
        index: i,
        field: "members",
        found: id,
        facts: { near: closest(id, [...layerIds, ...nodeIds(d), ...groupIds]) },
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

/**
 * wall.add, wall.allow and wall.remove (D43). Ids that do not exist are refused here;
 * whether the sides lie above or beside each other, and which lines cross, is checked
 * once the whole batch is applied.
 */
function wallStep(s: State, op: Extract<Op, { op: `wall.${string}` }>, i: number): OpError[] {
  const d = s.d;
  const walls = d.walls ?? [];
  const sides = new Set([...nodeIds(d), ...(d.groups ?? []).map((g) => g.id)]);
  const names = wallNames(d);
  const unknown = (ids: readonly string[], field: string, among: Set<string>): OpError[] =>
    ids
      .filter((id) => !among.has(id))
      .map((id) => ({
        code: "unknown-node",
        index: i,
        field,
        found: id,
        facts: { near: closest(id, [...among]) },
      }));
  const unique = (ids: readonly string[]) => [...new Set(ids)];
  if (op.op === "wall.add") {
    const dup = dupError(d, op.id, i);
    if (dup) return [dup];
    const errors = [
      ...unknown(op.between, "between", sides),
      ...unknown(op.and, "and", sides),
      ...unknown(op.allow ?? [], "allow", names),
    ];
    if (errors.length > 0) return errors;
    const wall: Wall = { id: op.id, between: unique(op.between), and: unique(op.and) };
    if (op.allow !== undefined) wall.allow = unique(op.allow);
    if (op.label !== undefined) wall.label = op.label;
    d.walls = [...walls, wall];
    touch(s, op.id);
    return [];
  }
  const wall = walls.find((x) => x.id === op.id);
  if (!wall) {
    return [
      {
        code: "unknown-wall",
        index: i,
        field: "id",
        found: op.id,
        facts: {
          near: closest(
            op.id,
            walls.map((x) => x.id),
          ),
        },
      },
    ];
  }
  if (op.op === "wall.allow" && op.off === true) {
    const allow = (wall.allow ?? []).filter((id) => !op.allow.includes(id));
    if (allow.length > 0) wall.allow = allow;
    else delete wall.allow;
  } else if (op.op === "wall.allow") {
    const errors = unknown(op.allow, "allow", names);
    if (errors.length > 0) return errors;
    wall.allow = unique([...(wall.allow ?? []), ...op.allow]);
  } else if (walls.length > 1) d.walls = walls.filter((x) => x.id !== wall.id);
  else delete d.walls;
  touch(s, wall.id);
  return [];
}

/** note.add and note.remove (D44). A note is named by its target, which has one at most. */
function noteStep(s: State, op: Extract<Op, { op: `note.${string}` }>, i: number): OpError[] {
  const d = s.d;
  const targets = noteTargets(d);
  const notes = d.notes ?? [];
  const at = notes.findIndex((x) => x.on === op.on);
  if (op.op === "note.add") {
    if (!targets.includes(op.on)) {
      return [
        {
          code: "unknown-node",
          index: i,
          field: "on",
          found: op.on,
          facts: { near: closest(op.on, targets) },
        },
      ];
    }
    if (at >= 0) notes[at] = { on: op.on, text: op.text };
    else notes.push({ on: op.on, text: op.text });
    d.notes = notes;
  } else {
    if (at < 0) {
      const on = notes.map((x) => x.on);
      return [
        {
          code: "unknown-note",
          index: i,
          field: "on",
          found: op.on,
          facts: { near: closest(op.on, on) },
        },
      ];
    }
    notes.splice(at, 1);
    if (notes.length > 0) d.notes = notes;
    else delete d.notes;
  }
  touch(s, op.on);
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
      found: target,
      facts: { row: nodeLayer },
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
        found: set.join(","),
        facts: { max: 1 },
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
        facts: { node: self },
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
          found: ref,
          facts: { row: layerId, nodes: list.map((n) => n.id) },
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
      found: "before,after",
      facts: { max: 1 },
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
    if (count >= MAX_ACCENTS) errors.push(tooManyAccents(d, i, "accent", "true", count + 1));
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
        field: "layer,first,last,before,after",
        found: "",
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
        found: target.id,
        facts: { node: own as string },
      });
    }
    const clash = target.nodes.find((n) => n.align === op.id);
    if (clash) {
      errors.push({
        code: "align-same-layer",
        index: i,
        field: "layer",
        found: target.id,
        facts: { node: clash.id },
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
      facts: { near: closest(end, endIds(d)) },
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
  if (op.both === true && kind === "link") errors.push(bothOnLink(id, i, "both", "true"));
  if (errors.length > 0) return errors;
  const edge: Edge = { id, from: op.from, to: op.to, kind };
  if (op.label !== undefined) edge.label = op.label;
  if (op.both === true) edge.both = true;
  d.edges.push(edge);
  touch(s, id);
  return [];
}

/** A style that names no theme, or a stylesheet outside the diagram's folder (D30). */
export function badStyle(style: string, problem: string, i: number, field = "style"): OpError {
  return {
    code: problem,
    index: i,
    field,
    found: style,
    facts: { allowed: [...Object.keys(THEMES), `<name>${STYLESHEET_SUFFIX}`] },
  };
}

/** A link has no direction, so it takes no arrowheads at all (D33). */
function bothOnLink(id: string, i: number, field: string, found: string): OpError {
  return { code: "both-on-link", index: i, field, found, facts: { edge: id, kind: "link" } };
}

/** One accent more than grafical allows: the accented nodes, and the limit. */
function tooManyAccents(
  d: Diagram,
  i: number,
  field: string,
  found: string,
  count: number,
): OpError {
  const accented = d.layers.flatMap((l) => l.nodes.filter((x) => x.accent).map((x) => x.id));
  return {
    code: "too-many-accents",
    index: i,
    field,
    found,
    facts: {
      count,
      max: MAX_ACCENTS,
      nodes: accented,
      fix: [`node emphasize <file> ${accented[0] ?? "<id>"} --off`],
    },
  };
}

function unknownEdge(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-edge",
    index: i,
    field,
    found: id,
    facts: {
      near: closest(
        id,
        d.edges.map((e) => e.id),
      ),
    },
  };
}

function conflicting(i: number, set: string[]): OpError {
  return {
    code: "conflicting-position",
    index: i,
    field: set.join(","),
    found: set.join(","),
    facts: { max: 1 },
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
        found: "",
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
          facts: { row: op.id },
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
        found: op.id,
        facts: { count: layer.nodes.length, max: 0, nodes: layer.nodes.map((n) => n.id) },
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
        found: op.id,
        facts: { count: layer.nodes.length, min: 2, nodes: layer.nodes.map((n) => n.id) },
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
          found: op.from,
          facts: { row: op.id, nodes: layer.nodes.map((n) => n.id) },
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
          facts: { row: op.id, allowed: layer.nodes.slice(1).map((n) => n.id) },
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
        facts: { node: op.a },
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
  const twice = op.nodes.filter((id, k) => op.nodes.indexOf(id) !== k);
  if (twice.length > 0) {
    errors.push({
      code: "duplicate-id",
      index: i,
      field: "nodes",
      found: [...new Set(twice)].join(","),
      facts: { max: 1 },
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
    if (set.length > 1) return [conflicting(i, set)];
    return [{ code: "missing-field", index: i, field: "before,after", found: "" }];
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
        found: other,
        facts: { group: op.id },
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
    case "diagram.legend":
      return setLegend(s, op, i);
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
          if (count >= MAX_ACCENTS) return [tooManyAccents(d, i, "id", op.id, count + 1)];
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
    case "node.icon": {
      const at = findNode(d, op.id);
      if (!at) return [unknownNode(d, op.id, i, "id")];
      const n = at.node;
      if (
        op.icon !== undefined &&
        op.slot === "left" &&
        (n.kind === "decision" || n.kind === "initial" || n.kind === "final")
      ) {
        return [
          {
            code: "bad-value",
            index: i,
            field: "slot",
            found: op.slot,
            facts: { kind: n.kind, allowed: MARK_SLOTS.filter((x) => x !== "left") },
          },
        ];
      }
      if (op.icon === undefined) {
        if (n.icons !== undefined) delete n.icons[op.slot];
      } else {
        const mark = buildMark(op, op.icon, i);
        if (Array.isArray(mark)) return mark;
        n.icons = { ...n.icons, [op.slot]: mark };
      }
      if (n.icons !== undefined && Object.keys(n.icons).length === 0) delete n.icons;
      touch(s, op.id);
      return [];
    }
    case "edge.emphasize": {
      const missing = op.edges.filter((id) => !d.edges.some((e) => e.id === id));
      if (missing.length > 0) return missing.map((id) => unknownEdge(d, id, i, "edges"));
      for (const e of d.edges) {
        if (!op.edges.includes(e.id)) continue;
        // The old accent and a weight never both stay: the last one set is the edge's look (D41).
        delete e.weight;
        if (op.off === true) delete e.accent;
        else e.accent = true;
        touch(s, e.id);
      }
      return [];
    }
    case "edge.weight": {
      if (typeof op.weight === "string") {
        const P = themeOf(d).paint;
        if (edgeWidth({ weight: op.weight }, P) === undefined) {
          const allowed = ["thin", "thick", ...Object.keys(P.edge.weights)];
          return [
            {
              code: "unknown-weight",
              index: i,
              field: "weight",
              found: op.weight,
              facts: { near: closest(op.weight, allowed), allowed },
            },
          ];
        }
      }
      const missing = op.edges.filter((id) => !d.edges.some((e) => e.id === id));
      if (missing.length > 0) return missing.map((id) => unknownEdge(d, id, i, "edges"));
      for (const e of d.edges) {
        if (!op.edges.includes(e.id)) continue;
        delete e.accent;
        if (op.weight === undefined || op.weight === "thin") delete e.weight;
        else e.weight = op.weight;
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
        if (op.kind === "link" && e.both === true) return [bothOnLink(e.id, i, "kind", op.kind)];
        e.kind = op.kind;
      } else if (op.op === "edge.reverse") [e.from, e.to] = [e.to, e.from];
      else if (op.op === "edge.both") {
        if (op.off === true) delete e.both;
        else if (e.kind === "link") return [bothOnLink(e.id, i, "id", e.id)];
        else e.both = true;
      } else {
        if (op.from === undefined && op.to === undefined) {
          return [
            {
              code: "missing-field",
              index: i,
              field: "from,to",
              found: "",
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
            facts: { near: closest(end, endIds(d)) },
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
          facts: { fix: ["grafical new <file> --title <text>"] },
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
    case "wall.add":
    case "wall.allow":
    case "wall.remove":
      return wallStep(s, op, i);
    case "note.add":
    case "note.remove":
      return noteStep(s, op, i);
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
      if (idx < 0) return [unknownEdge(d, op.id, i, "id")];
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
    // The node stays in its row while its slot is chosen: chooseSlot counts it as removed.
    const raw = layoutModule.chooseSlot(s.d, at.layer.id, p.node, m);
    at.layer.nodes.splice(at.index, 1);
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
            found: first === undefined ? "" : first.op,
            facts: { fix: ["grafical new <file> --title <text>"] },
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
    const named = s.d.walls !== undefined || s.d.notes !== undefined;
    const before = named ? wallNames(s.d) : undefined;
    const errors = step(s, op, i);
    if (errors.length > 0) return { errors };
    // The walls forget what the operation removed (D43), and notes go with their targets (D44).
    if (before !== undefined) {
      const now = wallNames(s.d);
      const gone = new Set([...before].filter((id) => !now.has(id)));
      // A note's change is named by its target, which the operation already named.
      touch(s, ...pruneWalls(s.d, gone));
      pruneNotes(s.d, gone);
    }
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
        facts: p.facts,
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
        facts: p.facts,
      })),
    };
  }
  if (s.d.groups !== undefined && s.d.groups.length === 0) delete s.d.groups;
  if (s.d.lanes !== undefined && s.d.lanes.length === 0) delete s.d.lanes;
  return { diagram: s.d, changed: s.changed };
}
