// Applying operations (DESIGNS.md, "Operations are the only way a diagram changes", "Every write is checked, and
// each defect has an owner", specs/decisions, "Operations over whole-file rewrites", "The agent states every order",
// "One command is one write, and running it twice changes nothing"). Each operation is a write of its own: it makes
// an object when its ID is new and otherwise changes only the attributes it names, and the diagram it makes is
// checked whole. A place on `set` places only a new object, and one that does not hold is refused. An operation that
// leaves the file as it is changes nothing. Pure and atomic: any error means the input diagram is untouched, and the
// errors of the first operation refused are returned with its index.

import type { ErrorCode, OpError } from "../errors.ts";
import * as layoutModule from "../layout/index.ts";
import { edgeStyle, edgeWidth, WEIGHT_MAX, WEIGHT_MIN } from "../theme/paint.ts";
import {
  STYLESHEET_SUFFIX,
  stylesheetProblem,
  stylesOf,
  THEMES,
  themeOf,
} from "../theme/themes.ts";
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
import { writeDiagram } from "./io.ts";
import { likelyType } from "./issues.ts";
import { type LaneRun, laneRun, orderByLanes } from "./lanes.ts";
import { type Follower, likeCircle, pruneLikes } from "./like.ts";
import { noteTargets, pruneNotes } from "./notes.ts";
import { flagOf, listOf, numberOf, type Op, type OpOf, parseOp, RESET } from "./ops.ts";
import {
  checkIntegrity,
  graphemes,
  isEmoji,
  isMarkFile,
  legendWeightProblem,
  MARK_TEXT_MAX,
  MAX_EMPHASIS,
  markColor,
  markNameTooLong,
  weightValue,
} from "./schema.ts";
import { passable, pruneSteer } from "./steer.ts";
import { everyNode, STEP_KEYS, stepChain, steppedFrom } from "./steps.ts";
import { closest } from "./suggest.ts";
import {
  DEFAULT_EDGE_KIND,
  DEFAULT_MARK_SHAPE,
  DEFAULT_MARK_SIZE,
  DEFAULT_NODE_KIND,
  type Diagram,
  type DiagramNode,
  EDGE_KINDS,
  EDGE_STYLES,
  type Edge,
  type EdgeBend,
  type EdgeKind,
  type EdgeSide,
  type EdgeStretch,
  FORMAT_VERSION,
  type Group,
  type LabelAlign,
  type Layer,
  type LayerLook,
  type Legend,
  MARK_COLORS,
  MARK_SLOTS,
  type Mark,
  type MarkShape,
  type MarkSize,
  type MarkSlot,
  type MarkStyle,
  NODE_KINDS,
  type NodeKind,
  type Note,
  SHAPE_KINDS,
  type SizeStep,
  type ViaSide,
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

/** A place among an object's kind: first, last, or before or after one of them. */
interface Place {
  first?: boolean | undefined;
  last?: boolean | undefined;
  before?: string | undefined;
  after?: string | undefined;
}

type StepKey = (typeof STEP_KEYS)[number];
type StepSet = Partial<Record<StepKey, number>>;

/** Where a node goes: a layer and a place in it, or steps from another node (specs/decisions, "Steps from another node"). */
interface NodePlace extends Place, StepSet {
  id: string;
  layer?: string | undefined;
  from?: string | undefined;
}

/** A new node's facts. */
interface NewNode extends NodePlace {
  label: string;
  type?: string | undefined;
  sublabel?: string | undefined;
  size?: SizeStep | undefined;
  align?: string | undefined;
  emphasis?: boolean | undefined;
}

/** Where the object at `k` of an operation's ids goes: the given place for the first, then each after the one before. */
function placeOf(op: Place, k: number, ids: readonly string[]): Place {
  if (k > 0) return { after: ids[k - 1] };
  const out: Place = {};
  if (op.first === true) out.first = true;
  if (op.last === true) out.last = true;
  if (op.before !== undefined) out.before = op.before;
  if (op.after !== undefined) out.after = op.after;
  return out;
}

/** The layer and place an operation gives, which steps refuse beside them. */
const given = (
  op: Place & { layer?: string | undefined },
): Place & { layer?: string | undefined } => ({
  layer: op.layer,
  first: op.first,
  last: op.last,
  before: op.before,
  after: op.after,
});

const placed = (op: Place) =>
  op.first === true || op.last === true || op.before !== undefined || op.after !== undefined;

/** The steps an operation gives, as numbers. */
function stepsGiven(op: Partial<Record<StepKey, string>>): StepSet {
  const out: StepSet = {};
  for (const k of STEP_KEYS) {
    const v = op[k];
    if (v !== undefined) out[k] = Number(v);
  }
  return out;
}

const stepped = (op: { from?: string } & Partial<Record<StepKey, string>>) =>
  op.from !== undefined || STEP_KEYS.some((k) => op[k] !== undefined);

/** Words that may reset an attribute: none for `-`. */
const orNone = (v: string): string | undefined => (v === RESET ? undefined : v);

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

function missingField(field: string, i: number): OpError {
  return { code: "missing-field", index: i, field, found: "" };
}

function badValue(field: string, found: string, allowed: string[], i: number): OpError {
  return { code: "bad-value", index: i, field, found, facts: { allowed } };
}

/** A place on `set` for an object that sits elsewhere: the noun's `move` changes it. */
function elsewhere(id: string, noun: string, i: number): OpError {
  return { code: "placed-elsewhere", index: i, field: "id", found: id, facts: { [noun]: id } };
}

/** Whether a move leaves the file as it is: a place on `set` that already holds. */
function holds(s: State, move: (x: State) => OpError[]): boolean {
  const x: State = { d: structuredClone(s.d), changed: [] };
  if (move(x).length > 0) return false;
  orderByLanes(x.d);
  orderByColumns(x.d);
  return writeDiagram(x.d) === writeDiagram(s.d);
}

/** The fields that give a node its place in a layer (specs/decisions, "The agent states every order"). */
const POSITION_FIELDS = ["first", "last", "before", "after"] as const;

/** The style fields of a text mark, in the order errors name them. */
const MARK_STYLE_FIELDS = ["bg", "fg", "border", "shape"] as const;

/** What a mark is made of, before it is checked. */
interface MarkSpec {
  sha256?: string | undefined;
  bg?: string | undefined;
  fg?: string | undefined;
  border?: string | undefined;
  shape?: string | undefined;
  size?: string | undefined;
}

/**
 * The mark a spec makes, or its errors (specs/decisions, "Marks of any kind"). A style that holds its default is
 * left out, so the file shows only what was chosen. A picture, that is an emoji or a file, takes a size and nothing
 * else: it has its own colors and outline. `field` is the flag the mark came from.
 */
function buildMark(spec: MarkSpec, mark: string, field: string, i: number): Mark | OpError[] {
  const bad = (code: ErrorCode, at: string, found: string, facts?: OpError["facts"]): OpError[] => [
    { code, index: i, field: at, found, ...(facts === undefined ? {} : { facts }) },
  ];
  const size =
    spec.size === undefined || spec.size === DEFAULT_MARK_SIZE
      ? undefined
      : (spec.size as MarkSize);
  const picture = spec.sha256 !== undefined || isEmoji(mark);
  if (spec.sha256 === undefined && isMarkFile(mark)) {
    // The command line reads the file and fills in its hash before the operation gets here.
    return bad("mark-file-unread", field, mark);
  }
  if (spec.sha256 === undefined && graphemes(mark).length > MARK_TEXT_MAX) {
    return bad("mark-too-long", field, mark, { max: MARK_TEXT_MAX });
  }
  if (picture) {
    for (const f of MARK_STYLE_FIELDS) {
      const v = spec[f];
      if (v !== undefined) {
        return bad("mark-style-on-picture", f, v, { allowed: ["size"] });
      }
    }
    if (spec.sha256 !== undefined) {
      return { file: mark, sha256: spec.sha256, ...(size === undefined ? {} : { size }) };
    }
    return size === undefined ? mark : { text: mark, size };
  }
  const style: MarkStyle = {};
  for (const f of ["bg", "fg", "border"] as const) {
    const v = spec[f];
    if (v === undefined) continue;
    const hex = markColor(v);
    if (hex === undefined) {
      return bad("bad-value", f, v, { allowed: [...Object.keys(MARK_COLORS), "#rrggbb"] });
    }
    style[f] = hex;
  }
  if (spec.shape !== undefined && spec.shape !== DEFAULT_MARK_SHAPE)
    style.shape = spec.shape as MarkShape;
  if (size !== undefined) style.size = size;
  return Object.keys(style).length === 0 ? mark : { text: mark, ...style };
}

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
 * Sets one legend entry's words, or without text takes them away, and with them the entry (specs/decisions, "A
 * legend for widths and marks", "The legend says only what the agent named"). The entry is named by its address,
 * `style:<style>`, `weight:<level>` or `mark:<text>`, and an error names the address.
 */
function setLegend(s: State, id: string, text: string | undefined, i: number): OpError[] {
  const cut = id.indexOf(":");
  const kind = id.slice(0, cut);
  const value = id.slice(cut + 1);
  if (cut <= 0 || value === "" || !["style", "weight", "mark"].includes(kind)) {
    return [badValue("id", id, ["style:<style>", "weight:<level>", "mark:<text>"], i)];
  }
  const legend: Legend = { ...(s.d.legend ?? {}) };
  if (kind === "style") {
    if (!(EDGE_STYLES as readonly string[]).includes(value)) {
      // How the edges of a kind look, given as the kind: the legend names the look.
      const likely = (EDGE_KINDS as readonly string[]).includes(value)
        ? { likely: [edgeStyle(value as EdgeKind)] }
        : {};
      return [
        {
          code: "bad-value",
          index: i,
          field: "id",
          found: value,
          facts: { allowed: [...EDGE_STYLES], ...likely },
        },
      ];
    }
    const look = value as (typeof EDGE_STYLES)[number];
    if (text === undefined) delete legend[look];
    else legend[look] = text;
  } else if (kind === "weight") {
    const weight = numberOf(value);
    if (!weightValue.safeParse(weight).success) {
      const facts = { allowed: ["thick", "heavy"], min: WEIGHT_MIN, max: WEIGHT_MAX };
      return [{ code: "bad-value", index: i, field: "id", found: value, facts }];
    }
    const key = weightKey(weight);
    const P = themeOf(s.d).paint;
    const levels = ["thick", ...Object.keys(P.edge.weights)];
    const facts = legendWeightProblem(key, levels);
    if (facts !== undefined)
      return [{ code: "bad-value", index: i, field: "id", found: key, facts }];
    if (typeof weight === "string" && edgeWidth({ weight }, P) === undefined) {
      return [
        {
          code: "unknown-weight",
          index: i,
          field: "id",
          found: key,
          facts: { near: closest(key, levels), allowed: levels },
        },
      ];
    }
    const weights = setWords(legend.weights, key, text);
    if (weights === undefined) delete legend.weights;
    else legend.weights = weights;
  } else {
    if (markNameTooLong(value)) {
      return [
        {
          code: "mark-too-long",
          index: i,
          field: "id",
          found: value,
          facts: { max: MARK_TEXT_MAX },
        },
      ];
    }
    const marks = setWords(legend.marks, value, text);
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

/** Where a node is: its layer, or none for a node placed by steps (specs/decisions, "Steps from another node"), and the list that holds it. */
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

/** A fact about where a node is, on a node placed by steps (specs/decisions, "Steps from another node"): it goes back to a layer first. */
function fromSteps(id: string, i: number, field: string, found: string): OpError {
  return {
    code: "conflicting-position",
    index: i,
    field,
    found,
    facts: { node: id },
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

function unknownType(
  d: Diagram,
  id: string,
  i: number,
  kinds: readonly string[] = [],
  field = "type",
): OpError {
  const own = (d.types ?? []).map((x) => x.id);
  const likely = likelyType(id, kinds, own, kinds === EDGE_KINDS);
  return {
    code: "unknown-type",
    index: i,
    field,
    found: id,
    facts: {
      near: closest(id, own, 3),
      ...(likely.length > 0 ? { likely } : {}),
      ...(kinds.length > 0 ? { allowed: [...kinds, ...own] } : {}),
    },
  };
}

/** The kind that draws a type: its shape's, or its base's. */
function drawnKind(d: Diagram, id: string): string {
  const t = d.types?.find((x) => x.id === id);
  if (t === undefined) return id;
  return t.shape === undefined ? drawnKind(d, t.base) : SHAPE_KINDS[t.shape];
}

/** A type's built-in kind, when it names one. */
function nodeKindOf(type: string | undefined): NodeKind | undefined {
  return (NODE_KINDS as readonly (string | undefined)[]).includes(type)
    ? (type as NodeKind)
    : undefined;
}
function edgeKindOf(type: string | undefined): EdgeKind | undefined {
  return (EDGE_KINDS as readonly (string | undefined)[]).includes(type)
    ? (type as EdgeKind)
    : undefined;
}

/** Gives an object a defined type, whose base must be a kind of that sort of object. */
function setType(
  d: Diagram,
  o: { kind: string; type?: string } | undefined,
  type: string,
  kinds: readonly string[],
  i: number,
): OpError[] {
  if (!(d.types ?? []).some((x) => x.id === type)) return [unknownType(d, type, i, kinds)];
  const kind = drawnKind(d, type);
  if (o === undefined || !kinds.includes(kind)) return [unknownType(d, type, i, kinds)];
  o.type = type;
  o.kind = kind;
  return [];
}

function unknownStyle(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-style",
    index: i,
    field,
    found: id,
    facts: {
      near: closest(
        id,
        stylesOf(d).map((x) => x.id),
        3,
      ),
    },
  };
}

/** Whether the diagram or its stylesheet names a style (specs/decisions, "Styles set spacing as CSS does, and a later style wins"). */
const knownStyle = (d: Diagram, name: string) => stylesOf(d).some((x) => x.id === name);

/**
 * The styles an object marks after `--style` (specs/decisions, "Styles set spacing as CSS does, and a later style
 * wins"): `a,b` marks exactly these, `+a` adds one, `-a` takes one away, and `-` clears them. Undefined: none.
 */
function marked(raw: string, now: readonly string[] | undefined): string[] | undefined {
  if (raw === RESET) return undefined;
  const items = listOf(raw);
  const signed = items.filter((x) => x.startsWith("+") || x.startsWith("-"));
  if (signed.length === 0) return [...new Set(items)];
  const out = [...(now ?? [])];
  for (const x of signed) {
    const name = x.slice(1);
    const at = out.indexOf(name);
    if (x.startsWith("+") && at < 0) out.push(name);
    if (x.startsWith("-") && at >= 0) out.splice(at, 1);
  }
  return out.length > 0 ? out : undefined;
}

/** The styles an object marks, after `--style`; every one it names must exist. */
function markStyles(
  d: Diagram,
  raw: string,
  now: readonly string[] | undefined,
  i: number,
): string[] | undefined | OpError[] {
  const styles = marked(raw, now);
  for (const name of styles ?? []) {
    if (!knownStyle(d, name)) return [unknownStyle(d, name, i, "style")];
  }
  return styles;
}

/** Sets the styles an object marks, or takes them away. */
function styleOf(s: State, o: { style?: string[] }, id: string, raw: string, i: number): OpError[] {
  const styles = markStyles(s.d, raw, o.style, i);
  if (isStyleErrors(styles)) return styles;
  if (styles === undefined) delete o.style;
  else o.style = styles;
  touch(s, id);
  return [];
}

const isStyleErrors = (x: string[] | undefined | OpError[]): x is OpError[] =>
  Array.isArray(x) && x.length > 0 && typeof x[0] !== "string";

/** One object takes another of its sort as the look it follows, or lets go (specs/decisions, "`like` follows an object's look and nothing else"). */
function follow(
  s: State,
  id: string,
  raw: string,
  all: readonly Follower[],
  unknown: (id: string) => OpError,
  i: number,
): OpError[] {
  const target = all.find((x) => x.id === id);
  if (target === undefined) return [{ ...unknown(id), field: "id" }];
  const like = orNone(raw);
  if (like === undefined) delete target.like;
  else {
    if (!all.some((x) => x.id === like)) return [unknown(like)];
    const chain = likeCircle(all, id, like);
    if (chain !== undefined) {
      return [{ code: "like-cycle", index: i, field: "like", found: like, facts: { chain } }];
    }
    target.like = like;
  }
  touch(s, id);
  return [];
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

/** The errors for listed nodes that do not exist. */
function missingNodes(d: Diagram, ids: readonly string[], i: number, field: string): OpError[] {
  return ids.filter((id) => !findNode(d, id)).map((id) => unknownNode(d, id, i, field));
}

// --- Groups (specs/decisions, "Every layered diagram type") ---

function setGroup(s: State, ids: readonly string[], group: string | undefined) {
  for (const id of ids) {
    const at = findNode(s.d, id);
    if (!at || at.node.group === group) continue;
    if (group === undefined) delete at.node.group;
    else at.node.group = group;
    touch(s, id);
  }
}

/** Sets the group a group sits in, or takes it out of every group. */
function setParent(s: State, id: string, parent: string | undefined) {
  const g = s.d.groups?.find((x) => x.id === id);
  if (g === undefined || g.in === parent) return;
  if (parent === undefined) delete g.in;
  else g.in = parent;
  touch(s, id);
}

/** A group that would sit more than three deep, with what is inside it, or inside itself. */
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

const isGroup = (d: Diagram, id: string) => (d.groups ?? []).some((x) => x.id === id);

function addGroup(
  s: State,
  id: string,
  label: string,
  sublabel: string | undefined,
  parent: string | undefined,
  i: number,
): OpError[] {
  const d = s.d;
  const errors: OpError[] = [];
  const dup = dupError(d, id, i);
  if (dup) errors.push(dup);
  if (parent !== undefined && !isGroup(d, parent)) errors.push(unknownGroup(d, parent, i, "in"));
  if (errors.length > 0) return errors;
  const deep = parent === undefined ? undefined : nestError(d, id, parent, i, "in");
  if (deep) return [deep];
  const group: Group = { id, label };
  if (sublabel !== undefined) group.sublabel = sublabel;
  if (parent !== undefined) group.in = parent;
  d.groups = [...(d.groups ?? []), group];
  touch(s, id);
  return [];
}

/** Nodes, and groups that move inside this one with everything in them, join a group. */
function joinGroup(
  s: State,
  group: string,
  members: readonly string[],
  i: number,
  groupField: string,
  memberField: string,
): OpError[] {
  const d = s.d;
  const g = d.groups?.find((x) => x.id === group);
  if (!g) return [unknownGroup(d, group, i, groupField)];
  const errors = missingNodes(
    d,
    members.filter((id) => !isGroup(d, id)),
    i,
    memberField,
  );
  if (errors.length > 0) return errors;
  for (const id of members) {
    if (!isGroup(d, id)) {
      setGroup(s, [id], g.id);
      continue;
    }
    const wrong = nestError(d, id, g.id, i, memberField);
    if (wrong) return [wrong];
    setParent(s, id, g.id);
  }
  return [];
}

/** Nodes or groups leave every group. */
function leaveGroup(s: State, members: readonly string[]) {
  for (const id of members) {
    if (isGroup(s.d, id)) setParent(s, id, undefined);
    else setGroup(s, [id], undefined);
  }
}

function removeGroup(s: State, id: string, out: boolean, i: number): OpError[] {
  const d = s.d;
  const groups = d.groups ?? [];
  const g = groups.find((x) => x.id === id);
  if (!g) return [unknownGroup(d, id, i, "id")];
  // Its nodes and inner groups move into the group around it, or out of every group.
  const into = out ? undefined : g.in;
  const members = everyNode(d)
    .filter((n) => n.group === g.id)
    .map((n) => n.id);
  for (const c of innerGroups(d, g.id)) setParent(s, c, into);
  d.groups = groups.filter((x) => x.id !== g.id);
  touch(s, g.id);
  setGroup(s, members, into);
  // The edges that end at the group go with it, as a node's do (specs/decisions, "Edges that end at containers").
  const gone = d.edges.filter((e) => e.from === g.id || e.to === g.id);
  d.edges = d.edges.filter((e) => e.from !== g.id && e.to !== g.id);
  touch(s, ...gone.map((e) => e.id));
  return [];
}

// --- Lanes (specs/decisions, "Lanes run one way") ---

/**
 * What lane members stand for: layers when lanes run as layers, nodes when they run as columns. While no lane has
 * a member, the first layer or node decides.
 */
function laneTargets(
  d: Diagram,
  members: readonly string[],
  i: number,
  field: string,
): { run: LaneRun; layers: Layer[]; nodes: DiagramNode[] } | OpError[] {
  const errors: OpError[] = [];
  const layerIds = d.layers.map((l) => l.id);
  const groupIds = (d.groups ?? []).map((g) => g.id);
  let run = laneRun(d);
  for (const id of members) {
    if (run !== undefined) break;
    if (layerIds.includes(id)) run = "layers";
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
        if (settled === "layers") layers.push(l);
        else nodes.push(...mine);
      }
    } else if (layer !== undefined) {
      if (settled === "layers") layers.push(layer);
      else
        errors.push({
          code: "lane-mixed",
          index: i,
          field,
          found: id,
          facts: { is: "layer", run: "columns", nodes: layer.nodes.map((n) => n.id) },
        });
    } else if (node !== undefined) {
      if (node.layer === undefined) errors.push(fromSteps(id, i, field, id));
      else if (settled === "columns") nodes.push(node.node);
      else
        errors.push({
          code: "lane-mixed",
          index: i,
          field,
          found: id,
          facts: { is: "node", run: "layers", layer: node.layer.id },
        });
    } else {
      errors.push({
        code: "unknown-node",
        index: i,
        field,
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

/** Layers or nodes lie in a lane, or in none when `lane` is `-`. */
function laneOf(s: State, id: string, raw: string, now: string | undefined, i: number): OpError[] {
  const lane = orNone(raw);
  if (lane === undefined) {
    if (now === undefined) return [];
    const t = laneTargets(s.d, [id], i, "lane");
    if (Array.isArray(t)) return t;
    setLane(s, t, undefined);
    return [];
  }
  if (!(s.d.lanes ?? []).some((x) => x.id === lane)) return [unknownLane(s.d, lane, i, "lane")];
  const t = laneTargets(s.d, [id], i, "id");
  if (Array.isArray(t)) return t;
  setLane(s, t, lane);
  return [];
}

function removeLane(s: State, id: string, i: number): OpError[] {
  const d = s.d;
  const lane = (d.lanes ?? []).find((x) => x.id === id);
  if (!lane) return [unknownLane(d, id, i, "id")];
  d.lanes = (d.lanes ?? []).filter((x) => x.id !== lane.id);
  touch(s, lane.id);
  for (const l of d.layers) {
    if (l.lane === lane.id) setLane(s, { layers: [l], nodes: [] }, undefined);
    setLane(s, { layers: [], nodes: l.nodes.filter((n) => n.lane === lane.id) }, undefined);
  }
  // The edges that end at the lane go with it, as a group's do (specs/decisions, "Edges that end at containers").
  const gone = d.edges.filter((e) => e.from === lane.id || e.to === lane.id);
  d.edges = d.edges.filter((e) => e.from !== lane.id && e.to !== lane.id);
  touch(s, ...gone.map((e) => e.id));
  return [];
}

// --- Walls (specs/decisions, "Walls as space") ---
// Ids that do not exist are refused here; whether the sides lie above or beside each other, and which edges cross,
// is checked once the operation is applied.

function unknownAmong(
  ids: readonly string[],
  field: string,
  among: Set<string>,
  i: number,
): OpError[] {
  return ids
    .filter((id) => !among.has(id))
    .map((id) => ({
      code: "unknown-node",
      index: i,
      field,
      found: id,
      facts: { near: closest(id, [...among]) },
    }));
}

const unique = (ids: readonly string[]) => [...new Set(ids)];

function addWall(
  s: State,
  id: string,
  between: readonly string[],
  and: readonly string[],
  allow: readonly string[],
  label: string | undefined,
  i: number,
): OpError[] {
  const d = s.d;
  const dup = dupError(d, id, i);
  if (dup) return [dup];
  const sides = new Set([...nodeIds(d), ...(d.groups ?? []).map((g) => g.id)]);
  const errors = [
    ...unknownAmong(between, "between", sides, i),
    ...unknownAmong(and, "and", sides, i),
    ...unknownAmong(allow, "allow", wallNames(d), i),
  ];
  if (errors.length > 0) return errors;
  const wall: Wall = { id, between: unique(between), and: unique(and) };
  if (allow.length > 0) wall.allow = unique(allow);
  if (label !== undefined) wall.label = label;
  d.walls = [...(d.walls ?? []), wall];
  touch(s, id);
  return [];
}

function unknownWall(d: Diagram, id: string, i: number): OpError {
  return {
    code: "unknown-wall",
    index: i,
    field: "id",
    found: id,
    facts: {
      near: closest(
        id,
        (d.walls ?? []).map((x) => x.id),
      ),
    },
  };
}

function removeWall(s: State, id: string, i: number): OpError[] {
  const walls = s.d.walls ?? [];
  if (!walls.some((x) => x.id === id)) return [unknownWall(s.d, id, i)];
  if (walls.length > 1) s.d.walls = walls.filter((x) => x.id !== id);
  else delete s.d.walls;
  touch(s, id);
  return [];
}

// --- Columns (specs/decisions, "Columns beside layers") ---
// Members are nodes, or groups that bring their nodes. Layers are put in column order once the operation is applied.

function unknownColumn(d: Diagram, id: string, i: number, field: string): OpError {
  return {
    code: "unknown-column",
    index: i,
    field,
    found: id,
    facts: {
      near: closest(
        id,
        (d.columns ?? []).map((c) => c.id),
      ),
    },
  };
}

/** The nodes column members stand for. */
function columnMembers(
  d: Diagram,
  list: readonly string[],
  i: number,
  field: string,
): DiagramNode[] | OpError[] {
  const nodes: DiagramNode[] = [];
  const errors: OpError[] = [];
  const groups = (d.groups ?? []).map((g) => g.id);
  for (const id of list) {
    const at = findNode(d, id);
    if (at?.layer === undefined && at !== undefined) errors.push(fromSteps(id, i, field, id));
    else if (at) nodes.push(at.node);
    // A group brings the nodes of its layers; a node placed by steps follows no column.
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
}

const isErrors = (x: DiagramNode[] | OpError[]): x is OpError[] =>
  x.length > 0 && "code" in (x[0] as object);

function setColumn(s: State, nodes: DiagramNode[], column: string | undefined) {
  for (const n of nodes) {
    if (column === undefined) delete n.column;
    else n.column = column;
    touch(s, n.id);
  }
}

/** A node follows a column, or none when `column` is `-`. */
function columnOf(
  s: State,
  id: string,
  raw: string,
  now: string | undefined,
  i: number,
): OpError[] {
  const column = orNone(raw);
  if (column === undefined) {
    if (now === undefined) return [];
    const nodes = columnMembers(s.d, [id], i, "column");
    if (isErrors(nodes)) return nodes;
    setColumn(s, nodes, undefined);
    return [];
  }
  if (!(s.d.columns ?? []).some((c) => c.id === column)) {
    return [unknownColumn(s.d, column, i, "column")];
  }
  const nodes = columnMembers(s.d, [id], i, "id");
  if (isErrors(nodes)) return nodes;
  setColumn(s, nodes, column);
  return [];
}

function addColumn(s: State, id: string, place: Place, i: number): OpError[] {
  const d = s.d;
  const columns = d.columns ?? [];
  const ids = columns.map((c) => c.id);
  const dup = dupError(d, id, i);
  if (dup) return [dup];
  // A column goes first, before another, after one, or last when the place names none.
  const before = place.first === true ? ids[0] : place.before;
  if (before !== undefined && place.after !== undefined) {
    return [{ code: "conflicting-position", index: i, field: "before,after", found: before }];
  }
  const ref = before ?? place.after;
  const at = ref === undefined ? columns.length : ids.indexOf(ref);
  if (ref !== undefined && at < 0) {
    return [unknownColumn(d, ref, i, before !== undefined ? "before" : "after")];
  }
  columns.splice(place.after !== undefined ? at + 1 : at, 0, { id });
  d.columns = columns;
  touch(s, id);
  return [];
}

function moveColumn(s: State, id: string, place: Place, i: number): OpError[] {
  const d = s.d;
  const columns = d.columns ?? [];
  const ids = columns.map((c) => c.id);
  if (!ids.includes(id)) return [unknownColumn(d, id, i, "id")];
  const given = POSITION_FIELDS.filter((f) => place[f] !== undefined && place[f] !== false);
  if (given.length > 1) return [conflicting(i, [...given])];
  const ref = place.before ?? place.after;
  if (ref !== undefined && (ref === id || !ids.includes(ref))) {
    return [unknownColumn(d, ref, i, place.before !== undefined ? "before" : "after")];
  }
  const moved = columns.find((c) => c.id === id) as (typeof columns)[number];
  const rest = columns.filter((c) => c.id !== id);
  const at =
    place.first === true
      ? 0
      : ref === undefined
        ? rest.length
        : rest.findIndex((c) => c.id === ref) + (place.after !== undefined ? 1 : 0);
  rest.splice(at, 0, moved);
  d.columns = rest;
  touch(s, id);
  return [];
}

function removeColumn(s: State, id: string, i: number): OpError[] {
  const d = s.d;
  const columns = d.columns ?? [];
  if (!columns.some((c) => c.id === id)) return [unknownColumn(d, id, i, "id")];
  setColumn(
    s,
    d.layers.flatMap((l) => l.nodes.filter((n) => n.column === id)),
    undefined,
  );
  if (columns.length > 1) d.columns = columns.filter((c) => c.id !== id);
  else delete d.columns;
  touch(s, id);
  return [];
}

// --- Notes (specs/decisions, "Notes as callouts or footnotes"): a note is named by its target, which has one at most. ---

function unknownNote(d: Diagram, on: string, i: number): OpError {
  return {
    code: "unknown-note",
    index: i,
    field: "id",
    found: on,
    facts: {
      near: closest(
        on,
        (d.notes ?? []).map((x) => x.on),
      ),
    },
  };
}

/** Puts a note on its target, or replaces the one there; a card keeps how its text lines up. */
function setNote(s: State, on: string, text: string, footnote: boolean, i: number): OpError[] {
  const d = s.d;
  const targets = noteTargets(d);
  if (!targets.includes(on)) {
    return [
      {
        code: "unknown-node",
        index: i,
        field: "id",
        found: on,
        facts: { near: closest(on, targets) },
      },
    ];
  }
  const notes = d.notes ?? [];
  const at = notes.findIndex((x) => x.on === on);
  const x: Note = { on, text };
  if (footnote) x.footnote = true;
  const stated = notes[at]?.labelAlign;
  if (stated !== undefined && !footnote) x.labelAlign = stated;
  if (at >= 0) notes[at] = x;
  else notes.push(x);
  d.notes = notes;
  touch(s, on);
  return [];
}

function alignNote(s: State, on: string, align: LabelAlign, i: number): OpError[] {
  const x = s.d.notes?.find((y) => y.on === on);
  if (x === undefined) return [unknownNote(s.d, on, i)];
  if (x.footnote === true) return [badValue("id", on, ["a note drawn as a card"], i)];
  if (align === "left") delete x.labelAlign;
  else x.labelAlign = align;
  touch(s, on);
  return [];
}

function removeNote(s: State, on: string, i: number): OpError[] {
  const notes = s.d.notes ?? [];
  const at = notes.findIndex((x) => x.on === on);
  if (at < 0) return [unknownNote(s.d, on, i)];
  notes.splice(at, 1);
  if (notes.length > 0) s.d.notes = notes;
  else delete s.d.notes;
  touch(s, on);
  return [];
}

// --- Layers and nodes ---

function checkAlign(d: Diagram, nodeLayer: string, target: string, i: number): OpError | undefined {
  const at = findNode(d, target);
  if (!at) return unknownNode(d, target, i, "align");
  // Whether a node placed by steps lands in the same layer is known once it is placed.
  if (at.layer?.id === nodeLayer) {
    return {
      code: "align-same-layer",
      index: i,
      field: "align",
      found: target,
      facts: { layer: nodeLayer },
    };
  }
  return undefined;
}

type Slot = { at: number } | { error: OpError };

/**
 * Where in `list` the place puts a node. `self` is not in `list`. A place is required unless the layer is empty:
 * the agent states the order, and the engine never picks it (specs/decisions, "The agent states every order").
 */
function resolveSlot(
  d: Diagram,
  list: DiagramNode[],
  pos: Place,
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
        field: "place",
        found: "",
        facts: { layer: layerId, nodes: list.map((n) => n.id), allowed: [...POSITION_FIELDS] },
      },
    };
  }
  if (pos.first === true) return { at: 0 };
  if (pos.last === true) return { at: list.length };
  const field = pos.before !== undefined ? "before" : "after";
  const ref = (pos.before ?? pos.after) as string;
  if (ref === self) {
    return {
      error: { code: "bad-reference", index: i, field, found: ref, facts: { node: self } },
    };
  }
  const idx = list.findIndex((n) => n.id === ref);
  if (idx < 0) {
    if (findNode(d, ref)) {
      return {
        error: {
          code: "not-in-layer",
          index: i,
          field,
          found: ref,
          facts: { layer: layerId, nodes: list.map((n) => n.id) },
        },
      };
    }
    return { error: unknownNode(d, ref, i, field) };
  }
  return { at: pos.before !== undefined ? idx : idx + 1 };
}

function addLayer(
  s: State,
  id: string,
  label: string | undefined,
  place: Place,
  i: number,
): OpError[] {
  const d = s.d;
  const errors: OpError[] = [];
  const dup = dupError(d, id, i);
  if (dup) errors.push(dup);
  // A layer goes first, before another, after one, or last when the place names none.
  const before = place.first === true ? d.layers[0]?.id : place.before;
  const after = place.after;
  if (before !== undefined && after !== undefined) {
    errors.push({
      code: "conflicting-position",
      index: i,
      field: "before,after",
      found: "before,after",
      facts: { max: 1 },
    });
  }
  let at = d.layers.length;
  const ref = before ?? after;
  if (ref !== undefined && !(before !== undefined && after !== undefined)) {
    const idx = d.layers.findIndex((l) => l.id === ref);
    if (idx < 0) errors.push(unknownLayer(d, ref, i, before !== undefined ? "before" : "after"));
    else at = before !== undefined ? idx : idx + 1;
  }
  if (errors.length > 0) return errors;
  const layer: Layer = { id, ...(label === undefined ? {} : { label }), nodes: [] };
  // A layer added inside a layer lane's span joins the lane, so that the lane stays whole.
  const above = d.layers[at - 1]?.lane;
  if (above !== undefined && above === d.layers[at]?.lane) layer.lane = above;
  d.layers.splice(at, 0, layer);
  touch(s, id);
  return [];
}

/**
 * The errors of placing node `id` by steps from `from` (specs/decisions, "Steps from another node"): that node
 * exists and does not step from `id`, through others or not; at least one step, and one way across and one way
 * down; and none of `others`, the options that would say where the node is too.
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
  if (from === undefined) errors.push(missingField("from", i));
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
    errors.push({
      code: "missing-field",
      index: i,
      field: "steps",
      found: "",
      facts: { allowed: [...STEP_KEYS] },
    });
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

/** The options besides steps that say where a node is. */
function placeOptions(p: NodePlace & { align?: string | undefined }): string[] {
  const set: string[] = [];
  if (p.layer !== undefined) set.push("layer");
  if (p.first === true) set.push("first");
  if (p.last === true) set.push("last");
  if (p.before !== undefined) set.push("before");
  if (p.after !== undefined) set.push("after");
  if (p.align !== undefined) set.push("align");
  return set;
}

/** Sets a node's steps, replacing the ones it had; without `from`, takes them off. */
function setSteps(node: DiagramNode, from: string | undefined, steps: StepSet) {
  if (from === undefined) delete node.from;
  else node.from = from;
  for (const k of STEP_KEYS) {
    const v = steps[k];
    if (v === undefined) delete node[k];
    else node[k] = v;
  }
}

/** The steps a place gives, or a node's own when it gives none. */
function stepsOf(p: StepSet, own: StepSet): StepSet {
  const given = STEP_KEYS.some((k) => p[k] !== undefined) ? p : own;
  const out: StepSet = {};
  for (const k of STEP_KEYS) if (given[k] !== undefined) out[k] = given[k];
  return out;
}

const givesSteps = (p: NodePlace) =>
  p.from !== undefined || STEP_KEYS.some((k) => p[k] !== undefined);

function tooMuchEmphasis(
  d: Diagram,
  i: number,
  field: string,
  found: string,
  count: number,
): OpError {
  const emphasized = everyNode(d)
    .filter((x) => x.emphasis)
    .map((x) => x.id);
  return {
    code: "too-much-emphasis",
    index: i,
    field,
    found,
    facts: { count, max: MAX_EMPHASIS, nodes: emphasized },
  };
}

function newNode(n: NewNode): DiagramNode {
  const node: DiagramNode = {
    id: n.id,
    label: n.label,
    kind: nodeKindOf(n.type) ?? DEFAULT_NODE_KIND,
  };
  if (n.size !== undefined) node.size = n.size;
  if (n.sublabel !== undefined) node.sublabel = n.sublabel;
  if (n.emphasis === true) node.emphasis = true;
  return node;
}

function addNode(s: State, n: NewNode, i: number): OpError[] {
  const d = s.d;
  const errors: OpError[] = [];
  const dup = dupError(d, n.id, i);
  if (dup) errors.push(dup);
  const emphasis = () => {
    if (n.emphasis !== true) return;
    const count = everyNode(d).filter((x) => x.emphasis).length;
    if (count >= MAX_EMPHASIS) errors.push(tooMuchEmphasis(d, i, "emphasis", "on", count + 1));
  };
  if (givesSteps(n)) {
    const steps = stepsOf(n, {});
    errors.push(...stepErrors(d, n.id, n.from, steps, placeOptions(n), i));
    emphasis();
    if (errors.length > 0) return errors;
    const node = newNode(n);
    setSteps(node, n.from, steps);
    d.nodes = [...(d.nodes ?? []), node];
    touch(s, n.id);
    return [];
  }
  if (n.layer === undefined) {
    return [
      ...errors,
      {
        code: "missing-field",
        index: i,
        field: "layer",
        found: "",
        facts: { allowed: ["layer", "from"] },
      },
    ];
  }
  const layer = d.layers.find((l) => l.id === n.layer);
  if (!layer) errors.push(unknownLayer(d, n.layer, i, "layer"));
  if (layer && n.align !== undefined) {
    const e = checkAlign(d, layer.id, n.align, i);
    if (e) errors.push(e);
  }
  emphasis();
  let slot: Slot = { at: 0 };
  if (layer) {
    slot = resolveSlot(d, layer.nodes, n, n.id, i, layer.id);
    if ("error" in slot) errors.push(slot.error);
  }
  if (errors.length > 0 || !layer) return errors;
  const node = newNode(n);
  if (n.align !== undefined) node.align = n.align;
  if ("at" in slot) layer.nodes.splice(slot.at, 0, node);
  touch(s, n.id);
  return [];
}

/** A move with steps: the node leaves its layer, or keeps its place in the list of such nodes (specs/decisions, "Steps from another node"). */
function moveStepped(s: State, p: NodePlace, at: Found, i: number): OpError[] {
  const d = s.d;
  const from = p.from ?? at.node.from;
  const steps = stepsOf(p, at.node);
  const errors = stepErrors(d, p.id, from, steps, placeOptions(p), i);
  // A fact that ties a node to a node in another layer or to a column goes first. A node in a group shares its
  // lane with the whole group, so the group around it all leaves the lane.
  const outer = groupChain(d, at.node.group).at(-1);
  for (const k of ["align", "column", "lane"] as const) {
    const v = at.node[k];
    if (v === undefined) continue;
    errors.push({
      code: "conflicting-position",
      index: i,
      field: `from,${k}`,
      found: v,
      facts: { node: p.id, ...(k === "lane" && outer !== undefined ? { group: outer } : {}) },
    });
  }
  if (errors.length > 0) return errors;
  if (at.layer !== undefined) {
    unlist(d, at);
    d.nodes = [...(d.nodes ?? []), at.node];
  }
  setSteps(at.node, from, steps);
  touch(s, p.id);
  return [];
}

function moveNode(s: State, p: NodePlace, i: number): OpError[] {
  const d = s.d;
  const at = findNode(d, p.id);
  if (!at) return [unknownNode(d, p.id, i, "id")];
  if (givesSteps(p)) return moveStepped(s, p, at, i);
  // A node placed by steps has no layer to take a position in: --layer puts it back in one.
  if (p.layer === undefined && (!placed(p) || at.layer === undefined)) {
    return [
      {
        code: "missing-field",
        index: i,
        ...(at.layer === undefined
          ? { field: "layer", facts: { allowed: ["layer", "from"] } }
          : { field: "place", facts: { allowed: ["layer", ...POSITION_FIELDS] } }),
        found: "",
      },
    ];
  }
  const target = p.layer === undefined ? at.layer : d.layers.find((l) => l.id === p.layer);
  if (!target) return [unknownLayer(d, p.layer as string, i, "layer")];
  const errors: OpError[] = [];
  if (target.id !== at.layer?.id) {
    const own = at.node.align;
    const ownLayer = own === undefined ? undefined : findNode(d, own)?.layer?.id;
    // An alignment holds only between layers: the one that would join the node to a node of its new layer goes first.
    if (ownLayer === target.id) {
      errors.push({
        code: "align-same-layer",
        index: i,
        field: "layer",
        found: target.id,
        facts: { node: own as string },
      });
    }
    const clash = target.nodes.find((n) => n.align === p.id);
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
  const rest = target.nodes.filter((n) => n.id !== p.id);
  // A node already in its layer, with no place given, stays where it is.
  const slot: Slot =
    target.id === at.layer?.id && !placed(p)
      ? { at: at.index }
      : resolveSlot(d, rest, p, p.id, i, target.id);
  if ("error" in slot) errors.push(slot.error);
  if (errors.length > 0) return errors;
  unlist(d, at);
  setSteps(at.node, undefined, {});
  if ("at" in slot) target.nodes.splice(slot.at, 0, at.node);
  touch(s, p.id);
  return [];
}

function removeNode(s: State, id: string, i: number): OpError[] {
  const d = s.d;
  const at = findNode(d, id);
  if (!at) return [unknownNode(d, id, i, "id")];
  // A node others are placed from by steps stays while they are (specs/decisions, "Steps from another node").
  const users = steppedFrom(d, id);
  if (users.length > 0) {
    return [{ code: "step-anchor", index: i, field: "id", found: id, facts: { nodes: users } }];
  }
  unlist(d, at);
  touch(s, id);
  const gone = d.edges.filter((e) => e.from === id || e.to === id);
  d.edges = d.edges.filter((e) => e.from !== id && e.to !== id);
  touch(s, ...gone.map((e) => e.id));
  // An alignment to a removed node is dropped, and the node is reported.
  for (const l of d.layers) {
    for (const n of l.nodes) {
      if (n.align === id) {
        delete n.align;
        touch(s, n.id);
      }
    }
  }
  return [];
}

function moveLayer(s: State, id: string, place: Place, i: number): OpError[] {
  const d = s.d;
  const from = d.layers.findIndex((l) => l.id === id);
  if (from < 0) return [unknownLayer(d, id, i, "id")];
  const set = POSITION_FIELDS.filter((f) => place[f] !== undefined && place[f] !== false);
  if (set.length !== 1) {
    if (set.length > 1) return [conflicting(i, [...set])];
    return [missingField("first,last,before,after", i)];
  }
  const [layer] = d.layers.splice(from, 1) as [Layer];
  let at = place.first === true ? 0 : d.layers.length;
  const ref = place.before ?? place.after;
  if (ref !== undefined) {
    const field = place.before !== undefined ? "before" : "after";
    if (ref === id) {
      d.layers.splice(from, 0, layer);
      return [{ code: "bad-reference", index: i, field, found: ref, facts: { layer: id } }];
    }
    const k = d.layers.findIndex((l) => l.id === ref);
    if (k < 0) {
      d.layers.splice(from, 0, layer);
      return [unknownLayer(d, ref, i, field)];
    }
    at = place.before !== undefined ? k : k + 1;
  }
  d.layers.splice(at, 0, layer);
  touch(s, id);
  return [];
}

function removeLayer(s: State, id: string, i: number): OpError[] {
  const d = s.d;
  const k = d.layers.findIndex((l) => l.id === id);
  const layer = d.layers[k];
  if (layer === undefined) return [unknownLayer(d, id, i, "id")];
  if (layer.nodes.length > 0) {
    return [
      {
        code: "layer-not-empty",
        index: i,
        field: "id",
        found: id,
        facts: { count: layer.nodes.length, max: 0, nodes: layer.nodes.map((n) => n.id) },
      },
    ];
  }
  d.layers.splice(k, 1);
  touch(s, id);
  const gone = d.edges.filter((e) => e.from === id || e.to === id);
  d.edges = d.edges.filter((e) => e.from !== id && e.to !== id);
  touch(s, ...gone.map((e) => e.id));
  return [];
}

/** Moves a layer's nodes from `from` on, or its second half, into a new layer below it (specs/decisions, "Curation stays with the agent"). */
function splitLayer(s: State, op: OpOf<"layer.split">, i: number): OpError[] {
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
      if (!findNode(d, op.from)) return [unknownNode(d, op.from, i, "from")];
      return [
        {
          code: "not-in-layer",
          index: i,
          field: "from",
          found: op.from,
          facts: { layer: op.id, nodes: layer.nodes.map((n) => n.id) },
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
          facts: { layer: op.id, allowed: layer.nodes.slice(1).map((n) => n.id) },
        },
      ];
    }
  }
  const moved = layer.nodes.splice(at);
  const into: Layer = {
    id: op.into,
    ...(op.label === undefined ? {} : { label: op.label }),
    nodes: moved,
  };
  if (layer.lane !== undefined) into.lane = layer.lane;
  d.layers.splice(k + 1, 0, into);
  touch(s, op.into, ...moved.map((n) => n.id));
  return [];
}

/** Nodes become one new node, at the first one's place, that keeps all their edges. */
function mergeNodes(s: State, op: OpOf<"node.merge">, i: number): OpError[] {
  const d = s.d;
  const errors = missingNodes(d, op.nodes, i, "nodes");
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
  // The merged node takes the first part's place in its layer, so every part is in a layer (specs/decisions, "Steps from another node").
  for (const id of op.nodes) {
    if (findNode(d, id)?.layer === undefined) return [fromSteps(id, i, "nodes", id)];
  }
  const parts = op.nodes.map((id) => findNode(d, id)?.node as DiagramNode);
  const first = findNode(d, op.nodes[0] as string);
  if (!first) return [];
  const node: DiagramNode = {
    id: op.id,
    label: op.label,
    kind: nodeKindOf(op.type) ?? first.node.kind,
  };
  if (op.sublabel !== undefined) node.sublabel = op.sublabel;
  if (parts.some((p) => p.emphasis === true)) node.emphasis = true;
  if (first.node.group !== undefined) node.group = first.node.group;
  if (first.node.lane !== undefined) node.lane = first.node.lane;
  first.list[first.index] = node;
  const merged = new Set(op.nodes);
  for (const id of op.nodes.slice(1)) {
    const at = findNode(d, id);
    if (at) at.list.splice(at.index, 1);
  }
  touch(s, op.id, ...op.nodes);
  // A node placed by steps from a merged node steps from the new one.
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

/** Puts a group's borders, its inner groups' too, before or after another group's, in every layer they share. */
function orderGroup(s: State, id: string, place: Place, i: number): OpError[] {
  const d = s.d;
  const groups = d.groups ?? [];
  if (!groups.some((g) => g.id === id)) return [unknownGroup(d, id, i, "id")];
  const set: string[] = [];
  if (place.before !== undefined) set.push("before");
  if (place.after !== undefined) set.push("after");
  if (set.length !== 1) {
    if (set.length > 1) return [conflicting(i, set)];
    return [
      {
        code: "missing-field",
        index: i,
        field: "place",
        found: "",
        facts: { allowed: ["before", "after"] },
      },
    ];
  }
  const other = (place.before ?? place.after) as string;
  const field = place.before !== undefined ? "before" : "after";
  if (!groups.some((g) => g.id === other)) return [unknownGroup(d, other, i, field)];
  // A group's borders are its own and its inner groups' (specs/decisions, "Every layered diagram type"), so a group cannot
  // go beside itself or a group around or inside it.
  if (groupChain(d, id).includes(other) || groupChain(d, other).includes(id)) {
    return [{ code: "bad-reference", index: i, field, found: other, facts: { group: id } }];
  }
  const ours = (n: DiagramNode) => inGroup(d, n, id);
  const theirs = (n: DiagramNode) => inGroup(d, n, other);
  let shared = false;
  for (const l of d.layers) {
    const mine = l.nodes.filter(ours);
    if (mine.length === 0 || !l.nodes.some(theirs)) continue;
    shared = true;
    const rest = l.nodes.filter((n) => !ours(n));
    const at = place.before !== undefined ? rest.findIndex(theirs) : rest.findLastIndex(theirs) + 1;
    const next = [...rest.slice(0, at), ...mine, ...rest.slice(at)];
    if (next.some((n, k) => n !== l.nodes[k])) touch(s, ...mine.map((n) => n.id));
    l.nodes = next;
  }
  if (!shared) {
    return [{ code: "no-shared-layer", index: i, field, found: other, facts: { group: id } }];
  }
  return [];
}

/**
 * Copies a group, the groups inside it, its nodes and the edges between them, and with `outside` its edges to
 * everything else (specs/decisions, "A group copy holds its inside"). Each copied node joins its original's layer,
 * before or after the other group's borders there, as group.move puts them (specs/decisions, "The agent states every
 * order").
 */
function copyGroup(s: State, op: OpOf<"group.copy">, i: number): OpError[] {
  const d = s.d;
  const groups = d.groups ?? [];
  const g = groups.find((x) => x.id === op.id);
  if (!g) return [unknownGroup(d, op.id, i, "id")];
  const inner = groups.filter((x) => x.id !== g.id && groupChain(d, x.id).includes(g.id));
  const groupMembers = groupNodes(d, g.id);
  const copyOf = new Map<string, string>([[g.id, op.into]]);
  for (const x of [...inner, ...groupMembers]) copyOf.set(x.id, `${x.id}${op.suffix}`);
  const mapped = (id: string) => copyOf.get(id) ?? id;
  const hosts = d.layers.filter((l) => l.nodes.some((n) => copyOf.has(n.id)));
  // The groups with a node in every layer of the copy, but those it would split.
  const sharing = groups
    .filter((x) => !inner.includes(x))
    .filter((x) => hosts.every((l) => l.nodes.some((n) => inGroup(d, n, x.id))))
    .map((x) => x.id);
  const set = (["before", "after"] as const).filter((k) => op[k] !== undefined);
  if (set.length > 1) return [conflicting(i, set)];
  const field = set[0];
  if (field === undefined) {
    return [
      {
        code: "missing-field",
        index: i,
        field: "place",
        found: "",
        // The groups it may sit before or after.
        facts: { allowed: sharing },
      },
    ];
  }
  const other = op[field] as string;
  if (!groups.some((x) => x.id === other)) return [unknownGroup(d, other, i, field)];
  // An alignment or a step to a node outside the group cannot hold for the node and its copy at once.
  const errors: OpError[] = [];
  for (const n of groupMembers) {
    for (const key of ["align", "from"] as const) {
      const to = n[key];
      if (to === undefined || copyOf.has(to)) continue;
      errors.push({
        code: "copy-conflict",
        index: i,
        field: key,
        found: to,
        facts: { node: n.id },
      });
    }
  }
  if (errors.length > 0) return errors;
  const inside = (end: string) => copyOf.has(end);
  const copiedEdges = d.edges.filter((e) =>
    op.outside === true ? inside(e.from) || inside(e.to) : inside(e.from) && inside(e.to),
  );
  const copies: Edge[] = copiedEdges.map((e) => {
    const from = mapped(e.from);
    const to = mapped(e.to);
    // A copied edge's id is its original's with the suffix, as every id the copy makes.
    return { ...structuredClone(e), id: `${e.id}${op.suffix}`, from, to };
  });
  const made = [
    op.into,
    ...inner.map((x) => mapped(x.id)),
    ...groupMembers.map((n) => mapped(n.id)),
  ];
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
  const unshared = hosts.find((l) => !l.nodes.some((n) => inGroup(d, n, other)));
  if (unshared !== undefined) {
    return [
      {
        code: "no-shared-layer",
        index: i,
        field,
        found: other,
        facts: { allowed: sharing, layer: unshared.id, group: g.id },
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
  for (const l of hosts) {
    const theirs = (n: DiagramNode) => inGroup(d, n, other);
    const at = field === "before" ? l.nodes.findIndex(theirs) : l.nodes.findLastIndex(theirs) + 1;
    l.nodes.splice(at, 0, ...l.nodes.filter((n) => copyOf.has(n.id)).map(copyNode));
  }
  const steppedNodes = (d.nodes ?? []).filter((n) => copyOf.has(n.id));
  if (steppedNodes.length > 0) d.nodes = [...(d.nodes ?? []), ...steppedNodes.map(copyNode)];
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
  const away = groupMembers.filter((n) => moved.has(mapped(n.id)));
  // The node whose own lane or column moves it, or else the first one moved.
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

// --- Edges ---

/** A link has no direction, so it takes no arrowheads at all (specs/decisions, "Edges meet any side"). */
function bothOnLink(id: string, i: number, field: string, found: string): OpError {
  return { code: "both-on-link", index: i, field, found, facts: { edge: id, kind: "link" } };
}

/** A style that names no built-in stylesheet and no .grafical file (specs/decisions, "Themes and stylesheets"). */
function badStyle(style: string, problem: ErrorCode, i: number, field = "style"): OpError {
  return {
    code: problem,
    index: i,
    field,
    found: style,
    facts: { allowed: [...Object.keys(THEMES), `<name>${STYLESHEET_SUFFIX}`] },
  };
}

/** The ends of an edge that name nothing an edge can end at. */
function unknownEnds(
  d: Diagram,
  ends: { from?: string | undefined; to?: string | undefined },
  i: number,
) {
  const errors: OpError[] = [];
  for (const field of ["from", "to"] as const) {
    const end = ends[field];
    if (end === undefined || endKind(d, end) !== undefined) continue;
    errors.push({
      code: "unknown-node",
      index: i,
      field,
      found: end,
      facts: { near: closest(end, endIds(d)) },
    });
  }
  return errors;
}

function addEdge(
  s: State,
  e: {
    id: string;
    from: string;
    to: string;
    type?: string | undefined;
    label?: string | undefined;
    both: boolean;
    pass: boolean;
  },
  i: number,
): OpError[] {
  const d = s.d;
  const errors = unknownEnds(d, e, i);
  const dup = dupError(d, e.id, i);
  if (dup) errors.push(dup);
  const kind = edgeKindOf(e.type) ?? DEFAULT_EDGE_KIND;
  if (e.both && kind === "link") errors.push(bothOnLink(e.id, i, "both", "on"));
  if (errors.length > 0) return errors;
  const edge: Edge = { id: e.id, from: e.from, to: e.to, kind };
  if (e.label !== undefined) edge.label = e.label;
  if (e.both) edge.both = true;
  if (e.pass) edge.pass = true;
  d.edges.push(edge);
  touch(s, e.id);
  if (e.type === undefined || edgeKindOf(e.type)) return [];
  return setType(d, edge, e.type, EDGE_KINDS, i);
}

/** An edge's type: a built-in one, one of the diagram's own, or `-` for none of its own. */
function edgeType(s: State, e: Edge, raw: string, i: number): OpError[] {
  touch(s, e.id);
  const type = orNone(raw);
  if (type === undefined) {
    delete e.type;
    return [];
  }
  const kind = edgeKindOf(type);
  if (kind !== undefined) {
    if (kind === "link" && e.both === true) return [bothOnLink(e.id, i, "type", type)];
    delete e.type;
    e.kind = kind;
    return [];
  }
  return setType(s.d, e, type, EDGE_KINDS, i);
}

/** An edge's weight: a level, a width in pixels, or thin again (specs/decisions, "Edge weights"). */
function edgeWeight(s: State, e: Edge, raw: string, i: number): OpError[] {
  const weight = raw === RESET ? undefined : numberOf(raw);
  if (typeof weight === "string") {
    const P = themeOf(s.d).paint;
    if (edgeWidth({ weight }, P) === undefined) {
      const allowed = ["thin", "thick", ...Object.keys(P.edge.weights)];
      return [
        {
          code: "unknown-weight",
          index: i,
          field: "weight",
          found: weight,
          facts: { edges: [e.id], near: closest(weight, allowed), allowed },
        },
      ];
    }
  }
  if (weight === undefined || weight === "thin") delete e.weight;
  else e.weight = weight;
  touch(s, e.id);
  return [];
}

// --- The operations ---

type Run<N extends Op["op"]> = (s: State, op: OpOf<N>, i: number) => OpError[];

/** The diagram's own facts. A diagram made by this operation names nothing it changed but what follows its making. */
function diagramSet(s: State, op: OpOf<"diagram.set">, i: number, made = false): OpError[] {
  const d = s.d;
  const said = (id: string) => {
    if (!made) touch(s, id);
  };
  if (op.title !== undefined) {
    d.title = op.title;
    said("title");
  }
  for (const field of ["subtitle", "caption"] as const) {
    const v = op[field];
    if (v === undefined) continue;
    if (v === RESET) delete d[field];
    else d[field] = v;
    said(field);
  }
  if (op.stylesheet !== undefined) {
    if (op.stylesheet === RESET) delete d.stylesheet;
    else {
      const problem = stylesheetProblem(op.stylesheet);
      if (problem !== undefined) return [badStyle(op.stylesheet, problem, i, "stylesheet")];
      d.stylesheet = op.stylesheet;
    }
    said("stylesheet");
  }
  if (op.sizing !== undefined) {
    if (op.sizing === "fixed") d.sizing = "fixed";
    else delete d.sizing;
    said("sizing");
  }
  if (op.style !== undefined) {
    const styles = markStyles(d, op.style, d.style, i);
    if (isStyleErrors(styles)) return styles;
    if (styles === undefined) delete d.style;
    else d.style = styles;
    touch(s, "style");
  }
  if (op.lines !== undefined) {
    if (op.lines === "round") d.lines = "round";
    else delete d.lines;
    touch(s, "lines");
  }
  if (op.titleAt !== undefined || op.titleSide !== undefined) {
    if (op.titleAt === RESET) delete d.titleAt;
    else {
      const at = op.titleAt === undefined ? (d.titleAt?.at ?? 0) : Number(op.titleAt);
      const side =
        op.titleSide === undefined
          ? (d.titleAt?.side ?? "top")
          : op.titleSide === RESET
            ? "top"
            : (op.titleSide as "top" | "bottom");
      d.titleAt = { at, side };
    }
    touch(s, "title");
  }
  return [];
}

const layerSet: Run<"layer.set"> = (s, op, i) => {
  const d = s.d;
  for (const [k, id] of op.ids.entries()) {
    const where = placeOf(op, k, op.ids);
    const was = d.layers.find((l) => l.id === id);
    if (was === undefined) {
      const errors = addLayer(
        s,
        id,
        op.label === undefined ? undefined : orNone(op.label),
        where,
        i,
      );
      if (errors.length > 0) return errors;
    } else {
      if (placed(op) && !holds(s, (x) => moveLayer(x, id, where, i))) {
        return [elsewhere(id, "layer", i)];
      }
      if (op.label !== undefined) {
        if (op.label === RESET) {
          delete was.label;
          delete was.labelAt;
        } else was.label = op.label;
        touch(s, id);
      }
    }
    const layer = d.layers.find((l) => l.id === id) as Layer;
    if (op.look !== undefined) {
      if (op.look === RESET) delete layer.look;
      else layer.look = op.look as LayerLook;
      touch(s, id);
    }
    if (op.lane !== undefined) {
      const errors = laneOf(s, id, op.lane, was?.lane, i);
      if (errors.length > 0) return errors;
    }
    if (op.style !== undefined) {
      const errors = styleOf(s, layer, id, op.style, i);
      if (errors.length > 0) return errors;
    }
  }
  return [];
};

const nodeSet: Run<"node.set"> = (s, op, i) => {
  const d = s.d;
  for (const [k, id] of op.ids.entries()) {
    const at = findNode(d, id);
    const where = placeOf(op, k, op.ids);
    const steps = stepsGiven(op);
    if (at === undefined) {
      if (op.label === undefined) return [missingField("label", i)];
      const type = op.type === undefined ? undefined : orNone(op.type);
      const n: NewNode = {
        id,
        label: op.label,
        type,
        sublabel: op.sublabel === undefined ? undefined : orNone(op.sublabel),
        size: op.size === undefined ? undefined : (orNone(op.size) as SizeStep | undefined),
        align: op.align === undefined ? undefined : orNone(op.align),
        emphasis: op.emphasis === "on",
        ...(stepped(op)
          ? { ...given(op), from: op.from, ...steps }
          : { layer: op.layer, ...where }),
      };
      const errors = addNode(s, n, i);
      if (errors.length > 0) return errors;
      if (type !== undefined && !nodeKindOf(type)) {
        const typed = setType(d, findNode(d, id)?.node, type, NODE_KINDS, i);
        if (typed.length > 0) return typed;
      }
    } else {
      if (placed(op) || stepped(op) || op.layer !== undefined) {
        const move: NodePlace = stepped(op)
          ? { id, ...given(op), from: op.from, ...steps }
          : { id, layer: op.layer ?? at.layer?.id, ...where };
        if (!holds(s, (x) => moveNode(x, move, i))) return [elsewhere(id, "node", i)];
      }
      const errors = nodeFacts(s, at, op, i);
      if (errors.length > 0) return errors;
    }
    const node = findNode(d, id)?.node as DiagramNode;
    if (op.group !== undefined) {
      const group = orNone(op.group);
      if (group === undefined) {
        if (at?.node.group !== undefined) leaveGroup(s, [id]);
      } else {
        const errors = joinGroup(s, group, [id], i, "group", "id");
        if (errors.length > 0) return errors;
      }
    }
    if (op.lane !== undefined) {
      const errors = laneOf(s, id, op.lane, at?.node.lane, i);
      if (errors.length > 0) return errors;
    }
    if (op.column !== undefined) {
      const errors = columnOf(s, id, op.column, at?.node.column, i);
      if (errors.length > 0) return errors;
    }
    if (op.style !== undefined) {
      const errors = styleOf(s, node, id, op.style, i);
      if (errors.length > 0) return errors;
    }
    if (op.like !== undefined) {
      const errors = follow(s, id, op.like, everyNode(d), (x) => unknownNode(d, x, i, "like"), i);
      if (errors.length > 0) return errors;
    }
  }
  return [];
};

/** The facts `node --set` changes on a node that exists. */
function nodeFacts(s: State, at: Found, op: OpOf<"node.set">, i: number): OpError[] {
  const d = s.d;
  const n = at.node;
  const id = n.id;
  if (op.label !== undefined) {
    n.label = op.label;
    touch(s, id);
  }
  if (op.sublabel !== undefined) {
    if (op.sublabel === RESET) delete n.sublabel;
    else n.sublabel = op.sublabel;
    touch(s, id);
  }
  if (op.type !== undefined) {
    touch(s, id);
    const type = orNone(op.type);
    if (type === undefined) delete n.type;
    else if (nodeKindOf(type) !== undefined) {
      delete n.type;
      n.kind = type as NodeKind;
    } else {
      const errors = setType(d, n, type, NODE_KINDS, i);
      if (errors.length > 0) return errors;
    }
  }
  if (op.size !== undefined) {
    if (op.size === RESET) delete n.size;
    else n.size = op.size as SizeStep;
    touch(s, id);
  }
  if (op.emphasis !== undefined) {
    if (op.emphasis === "off") delete n.emphasis;
    else if (n.emphasis !== true) {
      const count = everyNode(d).filter((x) => x.emphasis).length;
      if (count >= MAX_EMPHASIS) return [tooMuchEmphasis(d, i, "id", id, count + 1)];
      n.emphasis = true;
    }
    touch(s, id);
  }
  if (op.align !== undefined) {
    const to = orNone(op.align);
    if (to === undefined) delete n.align;
    else {
      const layer = findNode(d, id)?.layer;
      if (layer === undefined) return [fromSteps(id, i, "align", to)];
      const e = checkAlign(d, layer.id, to, i);
      if (e) return [e];
      n.align = to;
    }
    touch(s, id);
  }
  return [];
}

const nodeMove: Run<"node.move"> = (s, op, i) => {
  for (const [k, id] of op.ids.entries()) {
    const move: NodePlace = stepped(op)
      ? { id, ...given(op), from: op.from, ...stepsGiven(op) }
      : { id, layer: op.layer, ...placeOf(op, k, op.ids) };
    const errors = moveNode(s, move, i);
    if (errors.length > 0) return errors;
  }
  return [];
};

const edgeSet: Run<"edge.set"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    const was = d.edges.find((x) => x.id === id);
    if (was === undefined) {
      const missing = (["from", "to"] as const).filter((f) => op[f] === undefined);
      if (missing.length > 0) return missing.map((f) => missingField(f, i));
      const errors = addEdge(
        s,
        {
          id,
          from: op.from as string,
          to: op.to as string,
          type: op.type === undefined ? undefined : orNone(op.type),
          label: op.label === undefined ? undefined : orNone(op.label),
          both: op.both === "on",
          pass: op.pass === "on",
        },
        i,
      );
      if (errors.length > 0) return errors;
    } else {
      const errors = edgeFacts(s, was, op, i);
      if (errors.length > 0) return errors;
    }
    const e = d.edges.find((x) => x.id === id) as Edge;
    const errors = steering(s, e, op, i);
    if (errors.length > 0) return errors;
  }
  return [];
};

/** The facts `edge --set` changes on an edge that exists: its ends, type, label and arrowheads. */
function edgeFacts(s: State, e: Edge, op: OpOf<"edge.set">, i: number): OpError[] {
  const from = op.from !== undefined && op.from !== e.from ? op.from : undefined;
  const to = op.to !== undefined && op.to !== e.to ? op.to : undefined;
  if (from !== undefined || to !== undefined) {
    const errors = unknownEnds(s.d, { from, to }, i);
    if (errors.length > 0) return errors;
    if (from !== undefined) e.from = from;
    if (to !== undefined) e.to = to;
    touch(s, e.id);
  }
  if (op.type !== undefined) {
    const errors = edgeType(s, e, op.type, i);
    if (errors.length > 0) return errors;
  }
  if (op.label !== undefined) {
    if (op.label === RESET) {
      delete e.label;
      delete e.seat;
      delete e.labelAlign;
      delete e.labelStyle;
    } else e.label = op.label;
    touch(s, e.id);
  }
  if (op.both !== undefined) {
    if (op.both === "off") delete e.both;
    else if (e.kind === "link") return [bothOnLink(e.id, i, "id", e.id)];
    else e.both = true;
    touch(s, e.id);
  }
  if (op.pass !== undefined) {
    if (op.pass === "off") delete e.pass;
    else e.pass = true;
    touch(s, e.id);
  }
  return [];
}

/**
 * What steers an edge, new or not (specs/decisions, "An edge is steered by facts and never by coordinates"), its
 * weight, number, styles and the look it follows. `-` gives a fact back to the engine.
 */
function steering(s: State, e: Edge, op: OpOf<"edge.set">, i: number): OpError[] {
  const d = s.d;
  if (op.weight !== undefined) {
    const errors = edgeWeight(s, e, op.weight, i);
    if (errors.length > 0) return errors;
  }
  if (op.out !== undefined || op.in !== undefined) {
    // A side not named keeps what it has.
    const side = (given: string | undefined, now: EdgeSide | undefined) =>
      given === undefined ? now : (orNone(given) as EdgeSide | undefined);
    const out = side(op.out, e.out);
    const into = side(op.in, e.in);
    delete e.out;
    delete e.in;
    if (out !== undefined) e.out = out;
    if (into !== undefined) e.in = into;
    touch(s, e.id);
  }
  if (op.via !== undefined) {
    if (op.via === RESET) delete e.via;
    else {
      const cut = op.via.lastIndexOf(":");
      const allowed = ["<object>:left", "<object>:right", RESET];
      if (cut <= 0) return [badValue("via", op.via, allowed, i)];
      const object = op.via.slice(0, cut);
      const side = op.via.slice(cut + 1);
      if (side !== "left" && side !== "right") return [badValue("via", side, ["left", "right"], i)];
      if (!passable(d, object)) return [unknownNode(d, object, i, "via")];
      e.via = { object, side: side as ViaSide };
    }
    touch(s, e.id);
  }
  if (op.straight !== undefined) {
    if (op.straight === "on") e.straight = true;
    else delete e.straight;
    touch(s, e.id);
  }
  if (op.with !== undefined) {
    const other = orNone(op.with);
    if (other === undefined) delete e.with;
    else {
      if (!d.edges.some((x) => x.id === other)) return [unknownEdge(d, other, i, "with")];
      e.with = other;
    }
    touch(s, e.id);
  }
  if (op.bendAt !== undefined) {
    if (op.bendAt === RESET) delete e.bendAt;
    else e.bendAt = Number(op.bendAt) as EdgeBend;
    touch(s, e.id);
  }
  if (op.stretch !== undefined) {
    if (op.stretch === RESET) delete e.stretch;
    else e.stretch = Number(op.stretch) as EdgeStretch;
    touch(s, e.id);
  }
  if (op.number !== undefined) {
    if (op.number === RESET) delete e.step;
    else e.step = Number(op.number);
    touch(s, e.id);
  }
  if (op.style !== undefined) {
    const errors = styleOf(s, e, e.id, op.style, i);
    if (errors.length > 0) return errors;
  }
  if (op.like !== undefined) {
    const errors = follow(s, e.id, op.like, d.edges, (x) => unknownEdge(d, x, i, "like"), i);
    if (errors.length > 0) return errors;
  }
  return [];
}

const groupSet: Run<"group.set"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    const g = d.groups?.find((x) => x.id === id);
    if (g === undefined) {
      if (op.label === undefined) return [missingField("label", i)];
      const errors = addGroup(
        s,
        id,
        op.label,
        op.sublabel === undefined ? undefined : orNone(op.sublabel),
        op.in === undefined ? undefined : orNone(op.in),
        i,
      );
      if (errors.length > 0) return errors;
    } else {
      if (op.label !== undefined) {
        g.label = op.label;
        touch(s, id);
      }
      if (op.sublabel !== undefined) {
        if (op.sublabel === RESET) delete g.sublabel;
        else g.sublabel = op.sublabel;
        touch(s, id);
      }
      if (op.in !== undefined) {
        const parent = orNone(op.in);
        if (parent === undefined) {
          if (g.in !== undefined) leaveGroup(s, [id]);
        } else if (parent !== g.in) {
          const errors = joinGroup(s, parent, [id], i, "in", "id");
          if (errors.length > 0) return errors;
        }
      }
    }
    const group = d.groups?.find((x) => x.id === id) as Group;
    if (op.style !== undefined) {
      const errors = styleOf(s, group, id, op.style, i);
      if (errors.length > 0) return errors;
    }
    if (op.like !== undefined) {
      const errors = follow(
        s,
        id,
        op.like,
        d.groups ?? [],
        (x) => unknownGroup(d, x, i, "like"),
        i,
      );
      if (errors.length > 0) return errors;
    }
  }
  return [];
};

const laneSet: Run<"lane.set"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    const lane = d.lanes?.find((x) => x.id === id);
    if (lane === undefined) {
      if (op.label === undefined) return [missingField("label", i)];
      const dup = dupError(d, id, i);
      if (dup) return [dup];
      d.lanes = [...(d.lanes ?? []), { id, label: op.label }];
      touch(s, id);
    } else if (op.label !== undefined) {
      lane.label = op.label;
      touch(s, id);
    }
    const now = d.lanes?.find((x) => x.id === id) as NonNullable<Diagram["lanes"]>[number];
    if (op.style !== undefined) {
      const errors = styleOf(s, now, id, op.style, i);
      if (errors.length > 0) return errors;
    }
    if (op.like !== undefined) {
      const errors = follow(s, id, op.like, d.lanes ?? [], (x) => unknownLane(d, x, i, "like"), i);
      if (errors.length > 0) return errors;
    }
  }
  return [];
};

const columnSet: Run<"column.set"> = (s, op, i) => {
  const d = s.d;
  for (const [k, id] of op.ids.entries()) {
    const where = placeOf(op, k, op.ids);
    const c = d.columns?.find((x) => x.id === id);
    if (c === undefined) {
      const errors = addColumn(s, id, where, i);
      if (errors.length > 0) return errors;
    } else if (placed(op) && !holds(s, (x) => moveColumn(x, id, where, i))) {
      return [elsewhere(id, "column", i)];
    }
    if (op.style !== undefined) {
      const column = d.columns?.find((x) => x.id === id) as NonNullable<Diagram["columns"]>[number];
      const errors = styleOf(s, column, id, op.style, i);
      if (errors.length > 0) return errors;
    }
  }
  return [];
};

const wallSet: Run<"wall.set"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    const w = d.walls?.find((x) => x.id === id);
    const allow = op.allow === undefined ? undefined : op.allow === RESET ? [] : listOf(op.allow);
    const between = op.between === undefined ? w?.between : listOf(op.between);
    const and = op.and === undefined ? w?.and : listOf(op.and);
    if (
      w === undefined ||
      between?.join(",") !== w.between.join(",") ||
      and?.join(",") !== w.and.join(",")
    ) {
      // A wall's sides are its identity: a wall with new sides is made again, with what it let through and its words.
      const missing = [
        ...(between === undefined ? ["between"] : []),
        ...(and === undefined ? ["and"] : []),
      ];
      if (missing.length > 0) return missing.map((f) => missingField(f, i));
      if (w !== undefined) removeWall(s, id, i);
      const words = op.label === undefined ? w?.label : orNone(op.label);
      const errors = addWall(
        s,
        id,
        between as string[],
        and as string[],
        allow ?? w?.allow ?? [],
        words,
        i,
      );
      if (errors.length > 0) return errors;
      const made = d.walls?.find((x) => x.id === id) as Wall;
      if (w?.labelAlign !== undefined && words !== undefined) made.labelAlign = w.labelAlign;
      continue;
    }
    if (allow !== undefined) {
      // What it let through keeps its order, and what comes is added after it.
      const now = w.allow ?? [];
      const come = unique(allow.filter((x) => !now.includes(x)));
      const errors = unknownAmong(come, "allow", wallNames(d), i);
      if (errors.length > 0) return errors;
      const through = [...now.filter((x) => allow.includes(x)), ...come];
      if (through.join(",") !== now.join(",")) {
        if (through.length > 0) w.allow = through;
        else delete w.allow;
        touch(s, id);
      }
    }
    if (op.label !== undefined) {
      if (op.label === RESET) {
        delete w.label;
        delete w.labelAlign;
      } else w.label = op.label;
      touch(s, id);
    }
  }
  return [];
};

const noteSet: Run<"note.set"> = (s, op, i) => {
  for (const on of op.ids) {
    const n = s.d.notes?.find((x) => x.on === on);
    const foot = op.footnote === undefined ? undefined : op.footnote === "on";
    if (
      n === undefined ||
      op.text !== undefined ||
      (foot !== undefined && foot !== (n.footnote === true))
    ) {
      const text = op.text ?? n?.text;
      if (text === undefined) return [missingField("text", i)];
      const errors = setNote(s, on, text, foot ?? n?.footnote === true, i);
      if (errors.length > 0) return errors;
    }
    if (op.align !== undefined) {
      const align = (op.align === RESET ? "left" : op.align) as LabelAlign;
      const errors = alignNote(s, on, align, i);
      if (errors.length > 0) return errors;
    }
  }
  return [];
};

/** How a label looks and where it sits; its words are its owner's. */
const labelSet: Run<"label.set"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    const edge = d.edges.find((x) => x.id === id);
    const group = d.groups?.find((x) => x.id === id);
    const lane = d.lanes?.find((x) => x.id === id);
    const layer = d.layers.find((x) => x.id === id);
    const labelled = (x: { label?: string } | undefined) => (x?.label ?? "") !== "";
    if (op.style !== undefined) {
      // What an edge's label looks like (specs/decisions, "A label may mark a style").
      if (edge === undefined || !labelled(edge)) {
        return [badValue("id", id, ["an edge with a label"], i)];
      }
      const styles = markStyles(d, op.style, edge.labelStyle, i);
      if (isStyleErrors(styles)) return styles;
      if (styles === undefined) delete edge.labelStyle;
      else edge.labelStyle = styles;
      touch(s, id);
    }
    if (op.align !== undefined) {
      // How a text's lines line up (specs/decisions, "An agent sets a label's breaks and its alignment"). A lane's
      // default depends on how it runs, so every lane keeps what was stated.
      const align = (op.align === RESET ? "center" : op.align) as LabelAlign;
      const held = lane ?? d.walls?.find((x) => x.id === id) ?? edge ?? findNode(d, id)?.node;
      if (held === undefined || !labelled(held)) {
        return [badValue("id", id, ["a node, an edge, a wall or a lane with a label"], i)];
      }
      if (align === "center" && lane === undefined) delete held.labelAlign;
      else held.labelAlign = align;
      touch(s, id);
    }
    if (op.seat !== undefined) {
      if (edge === undefined) return [unknownEdge(d, id, i, "id")];
      if (!labelled(edge)) return [badValue("id", id, ["an edge with a label"], i)];
      if (op.seat === "beside") edge.seat = "beside";
      else delete edge.seat;
      touch(s, id);
    }
    if (op.at === undefined && op.side === undefined && op.place === undefined) continue;
    if (group !== undefined) {
      // Where a group's label sits (specs/decisions, "The agent states where a group's label sits").
      if (op.at === RESET) delete group.titleAt;
      else {
        const now = group.titleAt;
        const at = op.at === undefined ? (now?.at ?? 0) : Number(op.at);
        const side = (
          op.side === undefined ? (now?.side ?? "top") : op.side === RESET ? "top" : op.side
        ) as EdgeSide;
        const place = (
          op.place === undefined
            ? (now?.place ?? "inside")
            : op.place === RESET
              ? "inside"
              : op.place
        ) as "inside" | "outside";
        group.titleAt = { at, side, place };
      }
      touch(s, id);
      continue;
    }
    if (op.side !== undefined || op.place !== undefined) {
      const field = op.side !== undefined ? "side" : "place";
      return [badValue(field, op.side ?? op.place ?? "", ["a group's label"], i)];
    }
    // Where a layer's or a lane's label sits along its head.
    const held = lane ?? layer;
    if (held === undefined) {
      return [badValue("at", op.at ?? "", ["a group's, a layer's or a lane's label"], i)];
    }
    if (!labelled(held)) return [badValue("id", id, ["a layer with a label"], i)];
    if (op.at === RESET) delete held.labelAt;
    else held.labelAt = Number(op.at);
    touch(s, id);
  }
  return [];
};

/** A mark's node and slot from its address, `<node>:<slot>`. */
function markAddress(id: string, i: number): { node: string; slot: MarkSlot } | OpError {
  const cut = id.lastIndexOf(":");
  if (cut <= 0) return badValue("id", id, ["<node>:<slot>"], i);
  const slot = id.slice(cut + 1);
  if (!(MARK_SLOTS as readonly string[]).includes(slot)) {
    return {
      code: "bad-value",
      index: i,
      field: "id",
      found: slot,
      facts: { allowed: [...MARK_SLOTS], likely: closest(slot, [...MARK_SLOTS], 1) },
    };
  }
  return { node: id.slice(0, cut), slot: slot as MarkSlot };
}

const isError = (x: unknown): x is OpError =>
  typeof x === "object" && x !== null && "code" in x && "index" in x;

/** Small marks on a node (specs/decisions, "Marks of any kind"): a mark keeps what the operation does not name. */
const markSet: Run<"mark.set"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    const a = markAddress(id, i);
    if (isError(a)) return [a];
    if (op.text !== undefined && op.file !== undefined) {
      return [{ code: "conflicting-fields", index: i, field: "text,file", found: op.text }];
    }
    const n = findNode(d, a.node)?.node;
    if (n === undefined) return [unknownNode(d, a.node, i, "id")];
    const now = n.marks?.[a.slot];
    const spec: MarkSpec & { mark?: string } =
      now === undefined
        ? {}
        : typeof now === "string"
          ? { mark: now }
          : "file" in now
            ? {
                mark: now.file,
                sha256: now.sha256,
                ...(now.size === undefined ? {} : { size: now.size }),
              }
            : { ...withoutText(now), mark: now.text };
    const given = op.text ?? op.file;
    if (given !== undefined) {
      spec.mark = given;
      delete spec.sha256;
      if (op.sha256 !== undefined) spec.sha256 = op.sha256;
    }
    for (const field of ["bg", "fg", "border", "shape", "size"] as const) {
      const v = op[field];
      if (v === undefined) continue;
      if (v === RESET) delete spec[field];
      else spec[field] = v;
    }
    if (spec.mark === undefined) {
      return [
        {
          code: "missing-field",
          index: i,
          field: "text",
          found: "",
          facts: { allowed: ["text", "file"] },
        },
      ];
    }
    if (
      a.slot === "left" &&
      (n.kind === "decision" || n.kind === "initial" || n.kind === "final" || n.kind === "choice")
    ) {
      return [
        {
          code: "bad-value",
          index: i,
          field: "id",
          found: a.slot,
          facts: { kind: n.kind, allowed: MARK_SLOTS.filter((x) => x !== "left") },
        },
      ];
    }
    const mark = buildMark(spec, spec.mark, op.file !== undefined ? "file" : "text", i);
    if (Array.isArray(mark)) return mark;
    n.marks = { ...n.marks, [a.slot]: mark };
    touch(s, a.node);
  }
  return [];
};

function withoutText<T extends { text: string }>(m: T): Omit<T, "text"> {
  const { text: _text, ...rest } = m;
  return rest;
}

const markRemove: Run<"mark.remove"> = (s, op, i) => {
  for (const id of op.ids) {
    const a = markAddress(id, i);
    if (isError(a)) return [a];
    const n = findNode(s.d, a.node)?.node;
    if (n === undefined) return [unknownNode(s.d, a.node, i, "id")];
    if (n.marks !== undefined) delete n.marks[a.slot];
    if (n.marks !== undefined && Object.keys(n.marks).length === 0) delete n.marks;
    touch(s, a.node);
  }
  return [];
};

const TYPE_FIELDS = ["base", "shape", "fill", "border", "borderWidth", "color"] as const;
const STYLE_FIELDS = [
  "fill",
  "border",
  "borderWidth",
  "color",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "rowGap",
  "columnGap",
] as const;
/** The fields of a type or a style that hold numbers. */
const NUMBERS = new Set<string>(
  STYLE_FIELDS.filter((f) => !["fill", "border", "color"].includes(f)),
);

type Fields = Record<string, unknown>;

/** What a type or a style held, with what the operation names: `-` takes an attribute away. */
function merged(
  now: Fields | undefined,
  op: Fields,
  fields: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(now ?? {}) };
  for (const f of fields) {
    const v = op[f];
    if (typeof v !== "string") continue;
    if (v === RESET) delete out[f];
    else out[f] = NUMBERS.has(f) ? Number(v) : v;
  }
  return out;
}

/** Sorts of node or edge of the diagram's own: a change reaches every object of the sort. */
const typeSet: Run<"type.set"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    const list = d.types ?? [];
    const now = list.find((x) => x.id === id);
    const type = {
      ...merged(now as unknown as Fields, op as Fields, TYPE_FIELDS),
      id,
    } as NonNullable<Diagram["types"]>[number];
    if (type.base === undefined) return [missingField("base", i)];
    const others = list.filter((x) => x.id !== id);
    const chainOf = (x: string): string[] => {
      const up = others.find((y) => y.id === x);
      return up === undefined ? [x] : [x, ...chainOf(up.base)];
    };
    const root = chainOf(type.base).at(-1) as string;
    const known = [...NODE_KINDS, ...EDGE_KINDS] as readonly string[];
    if (!known.includes(root) || chainOf(type.base).includes(id)) {
      return [unknownType(d, type.base, i, [], "base")];
    }
    const at = list.findIndex((x) => x.id === id);
    if (at >= 0) list[at] = type;
    else list.push(type);
    d.types = list;
    for (const o of [...everyNode(d), ...d.edges]) {
      if (o.type !== undefined) (o as { kind: string }).kind = drawnKind(d, o.type);
    }
    touch(s, id);
  }
  return [];
};

const typeRemove: Run<"type.remove"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    if (!(d.types ?? []).some((x) => x.id === id)) return [unknownType(d, id, i, [], "id")];
    const left = (d.types ?? []).filter((x) => x.id !== id);
    if (left.some((x) => x.base === id)) return [unknownType(d, id, i, [], "id")];
    if (left.length > 0) d.types = left;
    else delete d.types;
    for (const o of [...everyNode(d), ...d.edges]) if (o.type === id) delete o.type;
    touch(s, id);
  }
  return [];
};

/** Named looks and spacing (specs/decisions, "Styles set spacing as CSS does, and a later style wins"). */
const styleSet: Run<"style.set"> = (s, op) => {
  for (const id of op.ids) {
    const list = s.d.styles ?? [];
    const at = list.findIndex((x) => x.id === id);
    const style = {
      ...merged(list[at] as unknown as Fields, op as Fields, STYLE_FIELDS),
      id,
    } as NonNullable<Diagram["styles"]>[number];
    if (at >= 0) list[at] = style;
    else list.push(style);
    s.d.styles = list;
    touch(s, id);
  }
  return [];
};

/** A style's place among the styles, which decides between two that say one thing. */
const styleMove: Run<"style.move"> = (s, op, i) => {
  if (op.before !== undefined && op.after !== undefined)
    return [conflicting(i, ["before", "after"])];
  const d = s.d;
  for (const [k, id] of op.ids.entries()) {
    const list = d.styles ?? [];
    const before = k > 0 ? undefined : op.before;
    const after = k > 0 ? op.ids[k - 1] : op.after;
    const at = list.findIndex((x) => x.id === id);
    if (at < 0) return [unknownStyle(d, id, i, "id")];
    const anchor = before ?? after;
    if (anchor === undefined) return [missingField("before,after", i)];
    if (anchor === id || !list.some((x) => x.id === anchor)) {
      return [unknownStyle(d, anchor, i, before !== undefined ? "before" : "after")];
    }
    const [moved] = list.splice(at, 1);
    const to = list.findIndex((x) => x.id === anchor) + (after !== undefined ? 1 : 0);
    list.splice(to, 0, moved as (typeof list)[number]);
    touch(s, id);
  }
  return [];
};

const styleRemove: Run<"style.remove"> = (s, op, i) => {
  const d = s.d;
  for (const id of op.ids) {
    if (!(d.styles ?? []).some((x) => x.id === id)) return [unknownStyle(d, id, i, "id")];
    const left = (d.styles ?? []).filter((x) => x.id !== id);
    if (left.length > 0) d.styles = left;
    else delete d.styles;
    const clear = (o: { style?: string[] }) => {
      const rest = o.style?.filter((x) => x !== id);
      if (rest === undefined) return;
      if (rest.length > 0) o.style = rest;
      else delete o.style;
    };
    for (const o of [
      d,
      ...d.layers,
      ...everyNode(d),
      ...d.edges,
      ...(d.groups ?? []),
      ...(d.lanes ?? []),
      ...(d.columns ?? []),
    ])
      clear(o);
    for (const e of d.edges) {
      const rest = e.labelStyle?.filter((x) => x !== id);
      if (rest === undefined) continue;
      if (rest.length > 0) e.labelStyle = rest;
      else delete e.labelStyle;
    }
    touch(s, id);
  }
  return [];
};

/** Each of the ids, in turn. */
const each =
  (one: (s: State, id: string, i: number) => OpError[]) =>
  (s: State, op: { ids: string[] }, i: number): OpError[] => {
    for (const id of op.ids) {
      const errors = one(s, id, i);
      if (errors.length > 0) return errors;
    }
    return [];
  };

/** Each of the ids in its place: the given place for the first, then each after the one before. */
const inTurn =
  (one: (s: State, id: string, place: Place, i: number) => OpError[]) =>
  (s: State, op: Place & { ids: string[] }, i: number): OpError[] => {
    for (const [k, id] of op.ids.entries()) {
      const errors = one(s, id, placeOf(op, k, op.ids), i);
      if (errors.length > 0) return errors;
    }
    return [];
  };

const RUNS: { [N in Op["op"]]: Run<N> } = {
  "diagram.set": (s, op, i) => diagramSet(s, op, i),
  "layer.set": layerSet,
  "layer.move": inTurn(moveLayer),
  "layer.split": splitLayer,
  "layer.remove": each(removeLayer),
  "node.set": nodeSet,
  "node.move": nodeMove,
  "node.merge": mergeNodes,
  "node.remove": each(removeNode),
  "edge.set": edgeSet,
  "edge.remove": each((s, id, i) => {
    const at = s.d.edges.findIndex((e) => e.id === id);
    if (at < 0) return [unknownEdge(s.d, id, i, "id")];
    s.d.edges.splice(at, 1);
    touch(s, id);
    return [];
  }),
  "group.set": groupSet,
  // Groups go beside a group in turn, as layers do: the first where it is told, each next after the one before.
  "group.move": (s, op, i) => {
    for (const [k, id] of op.ids.entries()) {
      const place: Place =
        k > 0 ? { after: op.ids[k - 1] } : { before: op.before, after: op.after };
      const errors = orderGroup(s, id, place, i);
      if (errors.length > 0) return errors;
    }
    return [];
  },
  "group.copy": copyGroup,
  "group.remove": (s, op, i) =>
    each((x, id, k) => removeGroup(x, id, op.out === true, k))(s, op, i),
  "lane.set": laneSet,
  "lane.remove": each(removeLane),
  "column.set": columnSet,
  "column.move": inTurn(moveColumn),
  "column.remove": each(removeColumn),
  "wall.set": wallSet,
  "wall.remove": each(removeWall),
  "note.set": noteSet,
  "note.remove": each(removeNote),
  "label.set": labelSet,
  "mark.set": markSet,
  "mark.remove": markRemove,
  "legend.set": (s, op, i) => each((x, id, k) => setLegend(x, id, op.text, k))(s, op, i),
  "legend.remove": each((s, id, i) => setLegend(s, id, undefined, i)),
  "type.set": typeSet,
  "type.remove": typeRemove,
  "style.set": styleSet,
  "style.move": styleMove,
  "style.remove": styleRemove,
};

function run(s: State, op: Op, i: number): OpError[] {
  return (RUNS[op.op] as Run<Op["op"]>)(s, op as never, i);
}

/** The checks of the whole diagram the operation made, in turn; the diagram again when it passes them. */
function checked(d: Diagram, changed: string[], index: number): ApplyResult {
  const s: State = { d, changed };
  // What follows is found in the diagram the operation makes, by checks that run in turn: each stops the rest, and
  // its errors say which it was (`stage`), so that a diagram one check refuses is known to pass those before it.
  const whole = (errors: OpError[], stage: number): ApplyResult => ({
    errors: errors.map((e) => ({ ...e, whole: true, stage })),
  });
  const broken = checkIntegrity(s.d, index);
  if (broken.length > 0) return whole(broken, 1);
  // An alignment that cannot hold with the order of its layers is an operation error (specs/decisions, "Layout computed again on every change").
  const problems = layoutModule.validateAlignments(s.d);
  if (problems.length > 0) {
    return whole(
      problems.map((p) => ({
        code: p.code,
        index,
        field: "align",
        found: p.found,
        facts: p.facts,
      })),
      2,
    );
  }
  // A group the engine cannot draw without a non-member inside is an operation error (specs/decisions, "Layers unseen, groups as systems").
  // A layer between members that holds none is boxed over, its nodes beside the node. No field of an operation is at
  // fault, so the facts name what is there.
  const groupProblems = layoutModule.validateGroups(s.d);
  if (groupProblems.length > 0) {
    return whole(
      groupProblems.map((p) => ({ code: p.code, index, found: "", facts: p.facts })),
      3,
    );
  }
  // A node placed by steps whose cell another fact keeps is an operation error (specs/decisions, "Steps from another node").
  const stepProblems = layoutModule.validateSteps(s.d);
  if (stepProblems.length > 0) {
    return whole(
      stepProblems.map((p) => {
        // Two nodes in each other's way: the error names the one the operation moved.
        const other = typeof p.facts.node === "string" ? p.facts.node : undefined;
        const swap =
          p.code === "step-blocked" &&
          other !== undefined &&
          !s.changed.includes(p.found) &&
          s.changed.includes(other);
        const found = swap ? (other as string) : p.found;
        const facts = swap ? { ...p.facts, node: p.found } : p.facts;
        return { code: p.code, index, field: "from", found, facts };
      }),
      4,
    );
  }
  if (s.d.groups !== undefined && s.d.groups.length === 0) delete s.d.groups;
  if (s.d.lanes !== undefined && s.d.lanes.length === 0) delete s.d.lanes;
  return { diagram: s.d, changed: s.changed };
}

/** One operation as a write: what it makes, with what follows each change, checked whole. */
function write(diagram: Diagram | null, op: Op, i: number): ApplyResult {
  let s: State;
  let errors: OpError[];
  if (diagram === null) {
    if (op.op !== "diagram.set")
      return { errors: [{ code: "no-diagram", index: i, found: op.op }] };
    if (op.title === undefined) return { errors: [missingField("title", i)] };
    s = { d: { grafical: FORMAT_VERSION, title: op.title, layers: [], edges: [] }, changed: [] };
    errors = diagramSet(s, op, i, true);
  } else {
    s = { d: structuredClone(diagram), changed: [] };
    const named = s.d.walls !== undefined || s.d.notes !== undefined;
    const before = named ? wallNames(s.d) : undefined;
    errors = run(s, op, i);
    // The walls forget what the operation removed (specs/decisions, "Walls as space"), and notes go with their targets (specs/decisions, "Notes as callouts or footnotes").
    if (errors.length === 0 && before !== undefined) {
      const now = wallNames(s.d);
      const gone = new Set([...before].filter((id) => !now.has(id)));
      // A note's change is named by its target, which the operation already named.
      touch(s, ...pruneWalls(s.d, gone));
      pruneNotes(s.d, gone);
    }
  }
  if (errors.length > 0) {
    return {
      errors: errors.map((e) => (e.field === undefined ? e : { ...e, field: flagOf(e.field) })),
    };
  }
  touch(s, ...pruneLikes(s.d), ...pruneSteer(s.d));
  // Column lanes keep each layer in lane order (specs/decisions, "Lanes run one way").
  touch(s, ...orderByLanes(s.d));
  // Columns keep each layer in column order (specs/decisions, "Columns beside layers").
  touch(s, ...orderByColumns(s.d));
  return checked(s.d, s.changed, i);
}

/**
 * Applies operations in turn, each one a write of its own: the diagram after the last, or the errors of the first
 * that is refused, with its index. `diagram` is null before the file is made, which only `diagram.set` does. No
 * operation checks the diagram as it is; nothing is changed in the input.
 */
export function applyOps(diagram: Diagram | null, ops: readonly Op[]): ApplyResult {
  if (ops.length === 0) {
    if (diagram === null) return { errors: [{ code: "no-diagram", index: 0, found: "" }] };
    return checked(structuredClone(diagram), [], 0);
  }
  let d = diagram;
  let changed: string[] = [];
  for (const [i, given] of ops.entries()) {
    const op = parseOp(given, i);
    if (Array.isArray(op)) return { errors: op };
    const r = write(d, op, i);
    if ("errors" in r) return r;
    if (d !== null && writeDiagram(r.diagram) === writeDiagram(d)) continue;
    changed = [...new Set([...changed, ...r.changed])];
    d = r.diagram;
  }
  return { diagram: d as Diagram, changed };
}
