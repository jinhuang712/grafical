// Applying operations (DESIGN.md, "Operations over whole-file rewrites", "Operations", "Checking and failure", "The agent states every order"). Pure and atomic: any
// error means the input diagram is untouched, and the first failing operation's
// errors are returned with its index.

import type { ErrorCode, OpError } from "../errors.ts";
import * as layoutModule from "../layout/index.ts";
import { edgeWidth } from "../theme/paint.ts";
import { STYLESHEET_SUFFIX, styleProblem, THEMES, themeOf } from "../theme/themes.ts";
import { orderByColumns } from "./columns.ts";
import { endIds, endKind } from "./ends.ts";
import {
  groupChain,
  groupHeight,
  groupNodes,
  inGroup,
  innerGroups,
  MAX_GROUP_DEPTH,
} from "./groups.ts";
import { type LaneRun, laneRun, orderByLanes } from "./lanes.ts";
import { noteTargets, pruneNotes } from "./notes.ts";
import type {
  DiagramLegendOp,
  EdgeAddOp,
  GroupCopyOp,
  LayerAddOp,
  NodeAddOp,
  NodeIconOp,
  NodeMoveOp,
  Op,
  Position,
  Steps,
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
import { everyNode, STEP_KEYS, stepChain, steppedFrom } from "./steps.ts";
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
  type Note,
  type Wall,
  weightKey,
} from "./types.ts";
import { pruneWalls, wallNames } from "./walls.ts";

export type ApplyResult = { diagram: Diagram; changed: string[] } | { errors: OpError[] };

interface State {
  d: Diagram;
  changed: string[];
}

function touch(s: State, ...ids: string[]) {
  for (const id of ids) if (!s.changed.includes(id)) s.changed.push(id);
}

function unusedKind(d: Diagram, id: string): string | undefined {
  if (d.layers.some((l) => l.id === id)) return "layer";
  if ((d.groups ?? []).some((g) => g.id === id)) return "group";
  if ((d.lanes ?? []).some((x) => x.id === id)) return "lane";
  if ((d.walls ?? []).some((x) => x.id === id)) return "wall";
  if ((d.columns ?? []).some((x) => x.id === id)) return "column";
  if (everyNode(d).some((n) => n.id === id)) return "node";
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
 * The mark a node.icon operation sets, or its errors (DESIGN.md, "Marks of any kind"). A style that holds its default
 * is left out, so the file shows only what was chosen. A picture, that is an emoji or a
 * file, takes a size and nothing else: it has its own colors and outline.
 */
function buildMark(op: NodeIconOp, icon: string, i: number): Mark | OpError[] {
  const bad = (
    code: ErrorCode,
    field: string,
    found: string,
    facts?: OpError["facts"],
  ): OpError[] => [{ code, index: i, field, found, ...(facts === undefined ? {} : { facts }) }];
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

/** The fields of a legend operation that name its entry; it names exactly one (DESIGN.md, "A legend for widths and marks"). */
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
 * Sets one legend entry's words, or without text takes them away, and with them the entry
 * (DESIGN.md, "A legend for widths and marks", "The legend says only what the agent named").
 */
function setLegend(s: State, op: DiagramLegendOp, i: number): OpError[] {
  const named = LEGEND_TARGETS.filter((k) => op[k] !== undefined);
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
  const legend: Legend = { ...(s.d.legend ?? {}) };
  if (op.style !== undefined) {
    if (op.text === undefined) delete legend[op.style];
    else legend[op.style] = op.text;
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
    const weights = setWords(legend.weights, key, op.text);
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
  return everyNode(d).map((n) => n.id);
}

/** Where a node is: its row, or none for a box placed by steps (DESIGN.md, "Steps from another box"), and the list that holds it. */
interface Found {
  layer?: Layer;
  list: DiagramNode[];
  index: number;
  node: DiagramNode;
}

function findNode(d: Diagram, id: string): Found | undefined {
  for (const layer of d.layers) {
    const index = layer.nodes.findIndex((n) => n.id === id);
    const node = layer.nodes[index];
    if (node) return { layer, list: layer.nodes, index, node };
  }
  const list = d.nodes ?? [];
  const index = list.findIndex((n) => n.id === id);
  const node = list[index];
  return node ? { list, index, node } : undefined;
}

/** Takes a node out of the list that holds it; the steps list goes when it empties. */
function unlist(d: Diagram, at: Found) {
  at.list.splice(at.index, 1);
  if (d.nodes !== undefined && d.nodes.length === 0) delete d.nodes;
}

/** A fact about where a box is, on a box placed by steps (DESIGN.md, "Steps from another box"): it goes back to a row first. */
function stepped(id: string, i: number, field: string, found: string): OpError {
  return {
    code: "conflicting-position",
    index: i,
    field,
    found,
    facts: { node: id, fix: [`node move <file> ${id} --layer <row>`] },
  };
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

/** Sets the group a group sits in, or takes it out of every group (DESIGN.md, "Every layered diagram type"). */
function setParent(s: State, id: string, parent: string | undefined) {
  const g = s.d.groups?.find((x) => x.id === id);
  if (g === undefined || g.in === parent) return;
  if (parent === undefined) delete g.in;
  else g.in = parent;
  touch(s, id);
}

/** A group that would sit more than three deep, with what is inside it, or inside itself (DESIGN.md, "Every layered diagram type"). */
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
    const members = everyNode(d)
      .filter((n) => n.group === g.id)
      .map((n) => n.id);
    for (const c of innerGroups(d, g.id)) setParent(s, c, into);
    d.groups = groups.filter((x) => x.id !== g.id);
    touch(s, g.id);
    setGroup(s, members, into);
    // The edges that end at the group go with it, as a node's do (DESIGN.md, "Lines that end at containers").
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
 * member, the first layer or node decides; groups alone mean columns (DESIGN.md, "Swimlanes run one way").
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
      if (node.layer === undefined) errors.push(stepped(id, i, "members", id));
      else if (settled === "columns") nodes.push(node.node);
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
    // The edges that end at the lane go with it, as a group's do (DESIGN.md, "Lines that end at containers").
    const gone = d.edges.filter((e) => e.from === lane.id || e.to === lane.id);
    d.edges = d.edges.filter((e) => e.from !== lane.id && e.to !== lane.id);
    touch(s, ...gone.map((e) => e.id));
  }
  return [];
}

/**
 * wall.add, wall.allow, wall.relabel and wall.remove (DESIGN.md, "Walls as space"). Ids that do not exist are refused here;
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
  } else if (op.op === "wall.relabel") {
    if (op.label === undefined) delete wall.label;
    else wall.label = op.label;
  } else if (walls.length > 1) d.walls = walls.filter((x) => x.id !== wall.id);
  else delete d.walls;
  touch(s, wall.id);
  return [];
}

/**
 * column.add, column.join, column.leave and column.remove (DESIGN.md, "Columns beside rows"). Members are nodes, or
 * groups that bring their nodes. Rows are put in column order once the batch is applied.
 */
function columnStep(s: State, op: Extract<Op, { op: `column.${string}` }>, i: number): OpError[] {
  const d = s.d;
  const columns = d.columns ?? [];
  const ids = columns.map((c) => c.id);
  const unknownColumn = (id: string, field: string): OpError => ({
    code: "unknown-column",
    index: i,
    field,
    found: id,
    facts: { near: closest(id, ids) },
  });
  const members = (list: readonly string[], field: string): DiagramNode[] | OpError[] => {
    const nodes: DiagramNode[] = [];
    const errors: OpError[] = [];
    const groups = (d.groups ?? []).map((g) => g.id);
    for (const id of list) {
      const at = findNode(d, id);
      if (at?.layer === undefined && at !== undefined) errors.push(stepped(id, i, field, id));
      else if (at) nodes.push(at.node);
      // A group brings the nodes of its rows; a box placed by steps follows no column.
      else if (groups.includes(id)) nodes.push(...groupNodes(d, id).filter((n) => !n.from));
      else {
        errors.push({
          code: "unknown-node",
          index: i,
          field,
          found: id,
          facts: { near: closest(id, [...nodeIds(d), ...groups]) },
        });
      }
    }
    return errors.length > 0 ? errors : nodes;
  };
  const follow = (nodes: DiagramNode[], column: string | undefined) => {
    for (const n of nodes) {
      if (column === undefined) delete n.column;
      else n.column = column;
      touch(s, n.id);
    }
  };
  const isErrors = (x: DiagramNode[] | OpError[]): x is OpError[] =>
    x.length > 0 && "code" in (x[0] as object);
  if (op.op === "column.add") {
    const dup = dupError(d, op.id, i);
    if (dup) return [dup];
    if (op.before !== undefined && op.after !== undefined) {
      return [{ code: "conflicting-position", index: i, field: "before,after", found: op.before }];
    }
    const ref = op.before ?? op.after;
    const at = ref === undefined ? columns.length : ids.indexOf(ref);
    if (ref !== undefined && at < 0) return [unknownColumn(ref, op.before ? "before" : "after")];
    const nodes = op.nodes === undefined ? [] : members(op.nodes, "nodes");
    if (isErrors(nodes)) return nodes;
    columns.splice(op.after !== undefined ? at + 1 : at, 0, { id: op.id });
    d.columns = columns;
    touch(s, op.id);
    follow(nodes, op.id);
    return [];
  }
  if (op.op === "column.leave") {
    const nodes = members(op.members, "members");
    if (isErrors(nodes)) return nodes;
    follow(nodes, undefined);
    return [];
  }
  const key = op.op === "column.join" ? op.column : op.id;
  if (!ids.includes(key)) return [unknownColumn(key, op.op === "column.join" ? "column" : "id")];
  if (op.op === "column.join") {
    const nodes = members(op.members, "members");
    if (isErrors(nodes)) return nodes;
    follow(nodes, key);
    return [];
  }
  follow(
    d.layers.flatMap((l) => l.nodes.filter((n) => n.column === key)),
    undefined,
  );
  if (columns.length > 1) d.columns = columns.filter((c) => c.id !== key);
  else delete d.columns;
  touch(s, key);
  return [];
}

/** note.add and note.remove (DESIGN.md, "Notes as callouts or footnotes"). A note is named by its target, which has one at most. */
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
    const x: Note = { on: op.on, text: op.text };
    if (op.footnote === true) x.footnote = true;
    if (at >= 0) notes[at] = x;
    else notes.push(x);
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
  // Whether a box placed by steps lands in the same row is known once it is placed.
  if (at.layer?.id === nodeLayer) {
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

type Slot = { at: number } | { error: OpError };

/**
 * Where in `list` the position puts a node. `self` is not in `list`. A position is
 * required unless the row is empty: the agent states the order, and the engine never
 * picks it (DESIGN.md, "The agent states every order").
 */
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
  if (set.length === 0) {
    if (list.length === 0) return { at: 0 };
    return {
      error: {
        code: "missing-field",
        index: i,
        field: "first,last,before,after",
        found: "",
        facts: { row: layerId, nodes: list.map((n) => n.id) },
      },
    };
  }
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
  const layer: Layer = {
    id: op.id,
    ...(op.label === undefined ? {} : { label: op.label }),
    nodes: [],
  };
  // A layer added inside a row lane's span joins the lane, so that the lane stays whole.
  const above = d.layers[at - 1]?.lane;
  if (above !== undefined && above === d.layers[at]?.lane) layer.lane = above;
  d.layers.splice(at, 0, layer);
  touch(s, op.id);
  return [];
}

type StepSet = Partial<Record<(typeof STEP_KEYS)[number], number>>;

/** Whether an operation gives steps from another box (DESIGN.md, "Steps from another box"). */
function givesSteps(op: Steps): boolean {
  return op.from !== undefined || STEP_KEYS.some((k) => op[k] !== undefined);
}

/**
 * The errors of placing box `id` by steps from `from` (DESIGN.md, "Steps from another box"): that box exists and does not
 * step from `id`, through others or not; at least one step, and one way across and one
 * way down; and none of `others`, the options that would say where the box is too.
 */
function stepErrors(
  d: Diagram,
  id: string,
  from: string | undefined,
  steps: StepSet,
  others: string[],
  i: number,
): OpError[] {
  const errors: OpError[] = others.map((f) => ({
    code: "conflicting-position",
    index: i,
    field: `from,${f}`,
    found: `from,${f}`,
    facts: { max: 1 },
  }));
  if (from === undefined)
    errors.push({ code: "missing-field", index: i, field: "from", found: "" });
  else if (!findNode(d, from)) errors.push(unknownNode(d, from, i, "from"));
  else {
    const chain = [from, ...stepChain(d, from)];
    const k = chain.indexOf(id);
    if (k >= 0) {
      errors.push({
        code: "step-cycle",
        index: i,
        field: "from",
        found: from,
        facts: { chain: [id, ...chain.slice(0, k + 1)] },
      });
    }
  }
  if (!STEP_KEYS.some((k) => steps[k] !== undefined)) {
    errors.push({ code: "missing-field", index: i, field: STEP_KEYS.join(","), found: "" });
  }
  for (const pair of [["down", "up"] as const, ["left", "right"] as const]) {
    if (steps[pair[0]] === undefined || steps[pair[1]] === undefined) continue;
    errors.push({
      code: "conflicting-position",
      index: i,
      field: pair.join(","),
      found: pair.join(","),
      facts: { max: 1 },
    });
  }
  return errors;
}

/** The options of an operation besides steps that say where a box is. */
function placeOptions(op: NodeAddOp | NodeMoveOp): string[] {
  const set: string[] = [];
  if (op.layer !== undefined) set.push("layer");
  if (op.first === true) set.push("first");
  if (op.last === true) set.push("last");
  if (op.before !== undefined) set.push("before");
  if (op.after !== undefined) set.push("after");
  if ("align" in op && op.align !== undefined) set.push("align");
  return set;
}

/** Sets a box's steps, replacing the ones it had; without `from`, takes them off. */
function setSteps(node: DiagramNode, from: string | undefined, steps: StepSet) {
  if (from === undefined) delete node.from;
  else node.from = from;
  for (const k of STEP_KEYS) {
    const v = steps[k];
    if (v === undefined) delete node[k];
    else node[k] = v;
  }
}

/** The steps an operation gives, or a box's own when it gives none. */
function stepsOf(op: StepSet, own: StepSet): StepSet {
  const given = STEP_KEYS.some((k) => op[k] !== undefined) ? op : own;
  const out: StepSet = {};
  for (const k of STEP_KEYS) if (given[k] !== undefined) out[k] = given[k];
  return out;
}

function addStepped(s: State, op: NodeAddOp, i: number): OpError[] {
  const d = s.d;
  const errors: OpError[] = [];
  const dup = dupError(d, op.id, i);
  if (dup) errors.push(dup);
  const steps = stepsOf(op, {});
  errors.push(...stepErrors(d, op.id, op.from, steps, placeOptions(op), i));
  if (op.accent === true) {
    const count = everyNode(d).filter((x) => x.accent).length;
    if (count >= MAX_ACCENTS) errors.push(tooManyAccents(d, i, "accent", "true", count + 1));
  }
  if (errors.length > 0) return errors;
  const node: DiagramNode = { id: op.id, label: op.label, kind: op.kind ?? DEFAULT_NODE_KIND };
  if (op.size !== undefined) node.size = op.size;
  if (op.sublabel !== undefined) node.sublabel = op.sublabel;
  if (op.accent === true) node.accent = true;
  setSteps(node, op.from, steps);
  d.nodes = [...(d.nodes ?? []), node];
  touch(s, op.id);
  return [];
}

/** node.move with steps: the box leaves its row, or keeps its place in the list of such boxes (DESIGN.md, "Steps from another box"). */
function moveStepped(s: State, op: NodeMoveOp, at: Found, i: number): OpError[] {
  const d = s.d;
  const from = op.from ?? at.node.from;
  const steps = stepsOf(op, at.node);
  const errors = stepErrors(d, op.id, from, steps, placeOptions(op), i);
  // A fact that ties a box to a box in another row or to a column goes first. A box in a group shares its
  // lane with the whole group, so the group around it all leaves the lane.
  const outer = groupChain(d, at.node.group).at(-1);
  const ties = [
    ["align", `node align <file> ${op.id}`],
    ["column", `column leave <file> ${op.id}`],
    ["lane", `lane leave <file> ${outer ?? op.id}`],
  ] as const;
  for (const [k, fix] of ties) {
    const v = at.node[k];
    if (v === undefined) continue;
    errors.push({
      code: "conflicting-position",
      index: i,
      field: `from,${k}`,
      found: v,
      facts: { node: op.id, fix: [fix] },
    });
  }
  if (errors.length > 0) return errors;
  if (at.layer !== undefined) {
    unlist(d, at);
    d.nodes = [...(d.nodes ?? []), at.node];
  }
  setSteps(at.node, from, steps);
  touch(s, op.id);
  return [];
}

function addNode(s: State, op: NodeAddOp, i: number): OpError[] {
  if (givesSteps(op)) return addStepped(s, op, i);
  const d = s.d;
  const errors: OpError[] = [];
  const dup = dupError(d, op.id, i);
  if (dup) errors.push(dup);
  if (op.layer === undefined) {
    return [...errors, { code: "missing-field", index: i, field: "layer,from", found: "" }];
  }
  const layer = d.layers.find((l) => l.id === op.layer);
  if (!layer) errors.push(unknownLayer(d, op.layer, i, "layer"));
  if (layer && op.align !== undefined) {
    const e = checkAlign(d, layer.id, op.align, i);
    if (e) errors.push(e);
  }
  if (op.accent === true) {
    const count = everyNode(d).filter((x) => x.accent).length;
    if (count >= MAX_ACCENTS) errors.push(tooManyAccents(d, i, "accent", "true", count + 1));
  }
  let slot: Slot = { at: 0 };
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
  touch(s, op.id);
  return [];
}

function moveNode(s: State, op: NodeMoveOp, i: number): OpError[] {
  const d = s.d;
  const at = findNode(d, op.id);
  if (!at) return [unknownNode(d, op.id, i, "id")];
  if (givesSteps(op)) return moveStepped(s, op, at, i);
  const hasPos =
    op.first === true || op.last === true || op.before !== undefined || op.after !== undefined;
  // A box placed by steps has no row to take a position in: --layer puts it back in one.
  if (op.layer === undefined && (!hasPos || at.layer === undefined)) {
    return [
      {
        code: "missing-field",
        index: i,
        field: at.layer === undefined ? "layer,from" : "layer,first,last,before,after",
        found: "",
      },
    ];
  }
  const target = op.layer === undefined ? at.layer : d.layers.find((l) => l.id === op.layer);
  if (!target) return [unknownLayer(d, op.layer as string, i, "layer")];
  const errors: OpError[] = [];
  if (target.id !== at.layer?.id) {
    const own = at.node.align;
    const ownLayer = own === undefined ? undefined : findNode(d, own)?.layer?.id;
    // An alignment holds only between rows: the one that would join the box to a box of its new row goes first.
    if (ownLayer === target.id) {
      errors.push({
        code: "align-same-layer",
        index: i,
        field: "layer",
        found: target.id,
        facts: { node: own as string, fix: [`node align <file> ${op.id}`] },
      });
    }
    const clash = target.nodes.find((n) => n.align === op.id);
    if (clash) {
      errors.push({
        code: "align-same-layer",
        index: i,
        field: "layer",
        found: target.id,
        facts: { node: clash.id, fix: [`node align <file> ${clash.id}`] },
      });
    }
  }
  const rest = target.nodes.filter((n) => n.id !== op.id);
  const slot = resolveSlot(d, rest, op, op.id, i, target.id);
  if ("error" in slot) errors.push(slot.error);
  if (errors.length > 0) return errors;
  unlist(d, at);
  setSteps(at.node, undefined, {});
  if ("at" in slot) target.nodes.splice(slot.at, 0, at.node);
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
  if (op.pass === true) edge.pass = true;
  d.edges.push(edge);
  touch(s, id);
  return [];
}

/** A style that names no theme, or a stylesheet outside the diagram's folder (DESIGN.md, "Themes and stylesheets"). */
export function badStyle(style: string, problem: ErrorCode, i: number, field = "style"): OpError {
  return {
    code: problem,
    index: i,
    field,
    found: style,
    facts: { allowed: [...Object.keys(THEMES), `<name>${STYLESHEET_SUFFIX}`] },
  };
}

/** A link has no direction, so it takes no arrowheads at all (DESIGN.md, "Lines meet any side"). */
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
  const accented = everyNode(d)
    .filter((x) => x.accent)
    .map((x) => x.id);
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
  // A box placed by steps has no place in a row to swap (DESIGN.md, "Steps from another box").
  for (const [x, field] of [
    [a, "a"],
    [b, "b"],
  ] as const) {
    if (x.layer === undefined) return [stepped(x.node.id, i, field, x.node.id)];
  }
  a.list[a.index] = b.node;
  b.list[b.index] = a.node;
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
  // The merged node takes the first part's place in its row, so every part is in a row (DESIGN.md, "Steps from another box").
  for (const id of op.nodes) {
    if (findNode(d, id)?.layer === undefined) return [stepped(id, i, "nodes", id)];
  }
  const parts = op.nodes.map((id) => findNode(d, id)?.node as DiagramNode);
  const first = findNode(d, op.nodes[0] as string);
  if (!first) return [];
  const node: DiagramNode = { id: op.id, label: op.label, kind: op.kind ?? first.node.kind };
  if (op.sublabel !== undefined) node.sublabel = op.sublabel;
  if (parts.some((p) => p.accent === true)) node.accent = true;
  if (first.node.group !== undefined) node.group = first.node.group;
  if (first.node.lane !== undefined) node.lane = first.node.lane;
  first.list[first.index] = node;
  const merged = new Set(op.nodes);
  for (const id of op.nodes.slice(1)) {
    const at = findNode(d, id);
    if (at) at.list.splice(at.index, 1);
  }
  touch(s, op.id, ...op.nodes);
  // A box placed by steps from a merged node steps from the new one.
  for (const n of d.nodes ?? []) {
    if (n.from === undefined || !merged.has(n.from)) continue;
    n.from = op.id;
    touch(s, n.id);
  }
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
  // edges that become the same (ends, kind, label and step) are kept once.
  const seen = new Set<string>();
  const kept: Edge[] = [];
  for (const e of d.edges) {
    const from = merged.has(e.from) ? op.id : e.from;
    const to = merged.has(e.to) ? op.id : e.to;
    if (from === op.id && to === op.id && (merged.has(e.from) || merged.has(e.to))) {
      touch(s, e.id);
      continue;
    }
    const key = `${from}\u0000${to}\u0000${e.kind}\u0000${e.label ?? ""}\u0000${e.step ?? ""}`;
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
  // A group's boxes are its own and its inner groups' (DESIGN.md, "Every layered diagram type"), so a group cannot
  // go beside itself or a group around or inside it.
  if (groupChain(d, op.id).includes(other) || groupChain(d, other).includes(op.id)) {
    return [{ code: "bad-reference", index: i, field, found: other, facts: { group: op.id } }];
  }
  const ours = (n: DiagramNode) => inGroup(d, n, op.id);
  const theirs = (n: DiagramNode) => inGroup(d, n, other);
  let shared = false;
  for (const l of d.layers) {
    const mine = l.nodes.filter(ours);
    if (mine.length === 0 || !l.nodes.some(theirs)) continue;
    shared = true;
    const rest = l.nodes.filter((n) => !ours(n));
    const at = op.before !== undefined ? rest.findIndex(theirs) : rest.findLastIndex(theirs) + 1;
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

/** A copied line's id: its copied ends' default id when it had its ends' default, else its own id with the suffix before any `#n`. */
function copiedEdgeId(e: Edge, from: string, to: string, suffix: string): string {
  const n = /#[0-9]+$/.exec(e.id)?.[0] ?? "";
  const base = e.id.slice(0, e.id.length - n.length);
  return base === `${e.from}->${e.to}` ? `${from}->${to}${n}` : `${base}${suffix}${n}`;
}

/**
 * Copies a group, the groups inside it, its boxes and the lines between them, and with `outside` its lines to
 * everything else (DESIGN.md, "A group copy holds its inside"). Each copied box joins its original's row, before or
 * after the other group's boxes there, as group.order puts them (DESIGN.md, "The agent states every order").
 */
function copyGroup(s: State, op: GroupCopyOp, i: number): OpError[] {
  const d = s.d;
  const groups = d.groups ?? [];
  const g = groups.find((x) => x.id === op.id);
  if (!g) return [unknownGroup(d, op.id, i, "id")];
  const inner = groups.filter((x) => x.id !== g.id && groupChain(d, x.id).includes(g.id));
  const boxes = groupNodes(d, g.id);
  const copyOf = new Map<string, string>([[g.id, op.into]]);
  for (const x of [...inner, ...boxes]) copyOf.set(x.id, `${x.id}${op.suffix}`);
  const mapped = (id: string) => copyOf.get(id) ?? id;
  const rows = d.layers.filter((l) => l.nodes.some((n) => copyOf.has(n.id)));
  // The groups with a box in every row of the copy, but those it would split.
  const sharing = groups
    .filter((x) => !inner.includes(x))
    .filter((x) => rows.every((l) => l.nodes.some((n) => inGroup(d, n, x.id))))
    .map((x) => x.id);
  const set = (["before", "after"] as const).filter((k) => op[k] !== undefined);
  if (set.length > 1) return [conflicting(i, set)];
  const field = set[0];
  if (field === undefined) {
    return [
      {
        code: "missing-field",
        index: i,
        field: "before,after",
        found: "",
        facts: { allowed: sharing },
      },
    ];
  }
  const other = op[field] as string;
  if (!groups.some((x) => x.id === other)) return [unknownGroup(d, other, i, field)];
  // An alignment or a step to a box outside the group cannot hold for the box and its copy at once.
  const errors: OpError[] = [];
  for (const n of boxes) {
    for (const key of ["align", "from"] as const) {
      const to = n[key];
      if (to === undefined || copyOf.has(to)) continue;
      const fix =
        key === "align" ? `node align <file> ${n.id}` : `node move <file> ${n.id} --layer <row>`;
      errors.push({
        code: "copy-conflict",
        index: i,
        field: key,
        found: to,
        facts: { node: n.id, fix: [fix] },
      });
    }
  }
  if (errors.length > 0) return errors;
  const inside = (end: string) => copyOf.has(end);
  const lines = d.edges.filter((e) =>
    op.outside === true ? inside(e.from) || inside(e.to) : inside(e.from) && inside(e.to),
  );
  const copies: Edge[] = lines.map((e) => {
    const from = mapped(e.from);
    const to = mapped(e.to);
    return { ...structuredClone(e), id: copiedEdgeId(e, from, to, op.suffix), from, to };
  });
  const made = [op.into, ...inner.map((x) => mapped(x.id)), ...boxes.map((n) => mapped(n.id))];
  const seen = new Set<string>();
  for (const [k, id] of [...made, ...copies.map((e) => e.id)].entries()) {
    const kind = unusedKind(d, id);
    if (kind === undefined && !seen.has(id)) {
      seen.add(id);
      continue;
    }
    const is = kind === undefined ? {} : { is: kind };
    errors.push({
      code: "duplicate-id",
      index: i,
      field: k === 0 ? "into" : "suffix",
      found: id,
      facts: is,
    });
  }
  if (errors.length > 0) return errors;
  const unshared = rows.find((l) => !l.nodes.some((n) => inGroup(d, n, other)));
  if (unshared !== undefined) {
    return [
      {
        code: "no-shared-layer",
        index: i,
        field,
        found: other,
        facts: { allowed: sharing, row: unshared.id, group: g.id },
      },
    ];
  }
  const copyNode = (n: DiagramNode): DiagramNode => {
    const c = structuredClone(n);
    c.id = mapped(n.id);
    if (n.group !== undefined) c.group = mapped(n.group);
    if (n.align !== undefined) c.align = mapped(n.align);
    if (n.from !== undefined) c.from = mapped(n.from);
    return c;
  };
  for (const l of rows) {
    const theirs = (n: DiagramNode) => inGroup(d, n, other);
    const at = field === "before" ? l.nodes.findIndex(theirs) : l.nodes.findLastIndex(theirs) + 1;
    l.nodes.splice(at, 0, ...l.nodes.filter((n) => copyOf.has(n.id)).map(copyNode));
  }
  const stepped = (d.nodes ?? []).filter((n) => copyOf.has(n.id));
  if (stepped.length > 0) d.nodes = [...(d.nodes ?? []), ...stepped.map(copyNode)];
  const top: Group = { id: op.into, label: op.label };
  if (g.sublabel !== undefined) top.sublabel = g.sublabel;
  if (g.in !== undefined) top.in = g.in;
  if (g.titleAt !== undefined) top.titleAt = g.titleAt;
  const nested = inner.map((x) => ({ ...x, id: mapped(x.id), in: mapped(x.in as string) }));
  d.groups = [...groups, top, ...nested];
  d.edges.push(...copies);
  // The copies keep their originals' lanes and columns. A place that their order would move is refused, not moved.
  const probe = structuredClone(d);
  const moved = new Set([...orderByLanes(probe), ...orderByColumns(probe)]);
  const key = laneRun(d) === "columns" ? "lane" : "column";
  const away = boxes.filter((n) => moved.has(mapped(n.id)));
  // The box whose own lane or column moves it, or else the first one moved.
  const original = away.find((n) => n[key] !== undefined) ?? away[0];
  if (original !== undefined) {
    return [
      {
        code: "copy-conflict",
        index: i,
        field: key,
        found: original[key] ?? "",
        facts: { node: original.id },
      },
    ];
  }
  touch(s, ...made, ...copies.map((e) => e.id));
  return [];
}

/** The newer operations: diagram settings, layers, node and edge edits, group order and copy. */
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
    case "layer.rename": {
      const layer = d.layers.find((l) => l.id === op.id);
      if (!layer) return [unknownLayer(d, op.id, i, "id")];
      layer.label = op.label;
      touch(s, op.id);
      return [];
    }
    case "layer.look": {
      const layer = d.layers.find((l) => l.id === op.id);
      if (!layer) return [unknownLayer(d, op.id, i, "id")];
      if (op.look === undefined) delete layer.look;
      else layer.look = op.look;
      touch(s, op.id);
      return [];
    }
    case "layer.move":
      return moveLayer(s, op, i);
    case "layer.remove":
      return removeLayer(s, op, i);
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
          const count = everyNode(d).filter((x) => x.accent).length;
          if (count >= MAX_ACCENTS) return [tooManyAccents(d, i, "id", op.id, count + 1)];
          n.accent = true;
        }
      } else if (op.to === undefined) delete n.align;
      else if (at.layer === undefined) return [stepped(op.id, i, "to", op.to)];
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
        // The old accent and a weight never both stay: the last one set is the edge's look (DESIGN.md, "Edge weights").
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
    case "edge.pass":
    case "edge.step":
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
      } else if (op.op === "edge.pass") {
        if (op.off === true) delete e.pass;
        else e.pass = true;
      } else if (op.op === "edge.step") {
        if (op.n === undefined) delete e.step;
        else e.step = op.n;
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
    case "group.title": {
      const g = (d.groups ?? []).find((x) => x.id === op.id);
      if (!g) return [unknownGroup(d, op.id, i, "id")];
      if (op.at === undefined) delete g.titleAt;
      else g.titleAt = op.at;
      touch(s, op.id);
      return [];
    }
    case "group.order":
      return orderGroup(s, op, i);
    case "group.copy":
      return copyGroup(s, op, i);
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
    case "wall.relabel":
      return wallStep(s, op, i);
    case "note.add":
    case "note.remove":
      return noteStep(s, op, i);
    case "column.add":
    case "column.join":
    case "column.leave":
    case "column.remove":
      return columnStep(s, op, i);
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
      // A box others are placed from by steps stays while they are (DESIGN.md, "Steps from another box").
      const users = steppedFrom(d, op.id);
      if (users.length > 0) {
        return [
          {
            code: "step-anchor",
            index: i,
            field: "id",
            found: op.id,
            facts: {
              nodes: users,
              fix: users.map((u) => `node move <file> ${u} --layer <row>`),
            },
          },
        ];
      }
      unlist(d, at);
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
 * `diagram` is null only for `diagram.new`, which must be the single first
 * operation. Nothing is changed in the input.
 */
export function applyOps(diagram: Diagram | null, ops: readonly Op[]): ApplyResult {
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
  const s: State = { d: start, changed: [] };
  for (let i = from; i < ops.length; i++) {
    const op = ops[i] as Op;
    const named = s.d.walls !== undefined || s.d.notes !== undefined;
    const before = named ? wallNames(s.d) : undefined;
    const errors = step(s, op, i);
    if (errors.length > 0) return { errors };
    // The walls forget what the operation removed (DESIGN.md, "Walls as space"), and notes go with their targets (DESIGN.md, "Notes as callouts or footnotes").
    if (before !== undefined) {
      const now = wallNames(s.d);
      const gone = new Set([...before].filter((id) => !now.has(id)));
      // A note's change is named by its target, which the operation already named.
      touch(s, ...pruneWalls(s.d, gone));
      pruneNotes(s.d, gone);
    }
  }
  // Column lanes keep each row in lane order (DESIGN.md, "Swimlanes run one way").
  touch(s, ...orderByLanes(s.d));
  // Columns keep each row in column order (DESIGN.md, "Columns beside rows").
  touch(s, ...orderByColumns(s.d));
  const last = Math.max(0, ops.length - 1);
  const broken = checkIntegrity(s.d, last);
  if (broken.length > 0) return { errors: broken };
  // An alignment that cannot hold with the order of its layers is an operation error (DESIGN.md, "Layout computed again on every change").
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
  // A group the engine cannot box without a non-member inside is an operation error (DESIGN.md, "Rows unseen, groups as systems").
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
  // A box placed by steps whose cell another fact keeps is an operation error (DESIGN.md, "Steps from another box").
  const stepProblems = layoutModule.validateSteps(s.d);
  if (stepProblems.length > 0) {
    return {
      errors: stepProblems.map((p) => {
        // Two boxes in each other's way: the error names the one this batch moved.
        const other = typeof p.facts.node === "string" ? p.facts.node : undefined;
        const swap =
          p.code === "step-blocked" &&
          other !== undefined &&
          !s.changed.includes(p.found) &&
          s.changed.includes(other);
        const found = swap ? (other as string) : p.found;
        const facts = swap ? { ...p.facts, node: p.found } : p.facts;
        return { code: p.code, index: last, field: "from", found, facts };
      }),
    };
  }
  if (s.d.groups !== undefined && s.d.groups.length === 0) delete s.d.groups;
  if (s.d.lanes !== undefined && s.d.lanes.length === 0) delete s.d.lanes;
  return { diagram: s.d, changed: s.changed };
}
