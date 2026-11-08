// What a problem is, in grafical's words (specs/decisions, "Refusals say what happened and which commands can change it"):
// one fixed sentence per code, which says what happened and never what to do, and the commands that can change it,
// by name only. Both are fixed per code, never made for the case at hand.

import {
  DEFECT_CODES,
  type Defect,
  type DefectCode,
  ERROR_CODES,
  type ErrorCode,
  FACT_ORDER,
  type Facts,
  type OpError,
  USAGE_CODES,
  type UsageCode,
  WARNING_CODES,
  type Warning,
  type WarningCode,
} from "../errors.ts";
import { everyNode } from "../model/steps.ts";
import type { Diagram } from "../model/types.ts";
import type { Value } from "../records.ts";
import { IN_FILE } from "./source.ts";
import { surfaceName } from "./surface.ts";

/** Every code a problem may carry. */
export type Code = ErrorCode | DefectCode | UsageCode | WarningCode;
export const CODES: readonly Code[] = [
  ...new Set<Code>([...ERROR_CODES, ...DEFECT_CODES, ...USAGE_CODES, ...WARNING_CODES]),
];

/** What happened, one sentence per code. A code that is both an error and a defect has one sentence for both. */
export const DESCRIPTIONS: Record<Code, string> = {
  "align-same-layer":
    "A node is aligned with a node in its own layer, and an alignment joins two layers.",
  "alignment-conflict":
    "A node's alignment cannot hold together with the other alignments and the order of the layers.",
  "bad-batch": "The batch file holds something other than a list of operations.",
  "bad-file": "The diagram file holds something other than a diagram.",
  "bad-id": "An id holds a character that an id may not hold.",
  "bad-mark": "A mark is neither a text nor a file.",
  "bad-op": "An item of the batch is not an operation with an op field.",
  "bad-port": "The port is not a whole number within the limits.",
  "bad-reference": "A field names the thing the operation changes, or one it cannot be placed by.",
  "bad-revision": "git does not know the revision.",
  "bad-scale": "The scale is not a number within the limits.",
  "bad-stylesheet": "The stylesheet holds a field or a value that a stylesheet does not take.",
  "bad-type": "A field holds a value of another type than the one it takes.",
  "bad-value": "A field holds a value that it does not take.",
  "bad-yaml": "The text is not valid YAML.",
  "bar-crossed": "An edge passes a layer with no nodes, drawn as a bar, without ending at it.",
  "bar-in-group":
    "A layer with no nodes, drawn as a bar, lies inside a group's border, which covers every layer from its top layer to its bottom one.",
  "bar-to-bar": "An edge joins two layers with no nodes, and a bar is met straight past a node.",
  "bent-edge": "An edge bends more than twice, mostly because it skips layers.",
  "batch-unreadable": "The batch file cannot be read.",
  "both-on-link": "A link has no direction, so it takes no arrowheads.",
  "node-aside": "A node sits beside every node it connects to, so its edges reach across.",
  "column-lanes":
    "The diagram has columns and lanes that run as columns, and it may have one of them.",
  "column-order": "A node of a column would sit right of a node of a later column in some layer.",
  "conflicting-fields": "The operation gives two fields, and it takes one of them.",
  "conflicting-option": "The command was given two options, and it takes one of them.",
  "conflicting-position":
    "The operation gives a node more than one place, or a place in a layer to a node placed by steps.",
  "copy-conflict":
    "A copied node's alignment, steps, lane or column cannot hold for the copy where it is put.",
  "crowded-label": "An edge's label has less than 8 px of room on two or more sides.",
  crossing: "Two edges cross.",
  "duplicate-id": "The id is taken.",
  "edge-blocked":
    "An edge that ends at a group, layer or lane has no way to it: other nodes stand between its ends in their layer.",
  "edge-inside": "An edge joins a group, layer or lane and something inside it.",
  "edge-overlap": "Two edges run on top of each other.",
  "edge-through-node": "An edge runs through a node.",
  "empty-container": "An edge ends at a group or lane that holds no node.",
  "empty-value": "A field is empty, and it takes at least one value.",
  "excess-arguments": "The command was given more arguments than it takes.",
  "file-exists": "A file is already there.",
  "file-not-found": "No file is there.",
  "file-unreadable": "The file cannot be read.",
  "group-across-lanes": "A group's borders lie in more than one lane, and a group lies in one.",
  "group-conflict":
    "A group's border covers every layer from its top member to its bottom one, and a node or group there would sit on both sides of it.",
  "like-cycle": "Objects would follow each other's looks in a circle.",
  "group-cycle": "Groups would sit inside each other in a circle.",
  "group-intruder": "A node that is not a member lies inside a group's border.",
  "group-split":
    "A node sits between members of the group in one layer, and a group's border cannot split around it.",
  "group-too-deep": "Groups would nest deeper than grafical draws.",
  invalid: "A field holds a value that is not valid there.",
  "invalid-argument": "An option holds a value that it does not take.",
  "via-blocked": "An edge does not pass the stated object on the stated side.",
  "not-straight": "An edge stated straight has a bend.",
  "no-trunk": "An edge cannot run along the trunk it names.",
  "bend-blocked": "An edge has no inner run to slide, or the slide meets something.",
  "stretch-blocked": "An edge has no detour to reach further, or the reach meets something.",
  "side-blocked":
    "No route leaves or enters by the stated side, and no edge takes another side unasked.",
  "label-blocked":
    "A text has no place clear of the edges and nodes around it, and no edge moves for a text.",
  "label-collision": "An edge's label lies on a node, an edge or another label.",
  "lane-gap":
    "A layer of no lane lies between layers of one lane, and a lane's layers are neighbours.",
  "lane-mixed": "The lanes hold layers and nodes, and lanes run one way: as layers or as columns.",
  "lane-stray": "A node lies outside its lane, or inside a lane it is not in.",
  "lane-to-lane": "An edge joins two lanes.",
  "layer-not-empty": "The layer still holds nodes.",
  "layer-too-small": "The layer holds fewer than two nodes.",
  "edge-across-group": "An edge runs through the node of a group that holds neither of its ends.",
  "edge-per-member":
    "Every node of a group has an edge to the same end, or from it, alike in kind, label, weight and arrowheads.",
  "lonely-node": "No edge reaches a node: none of its own, and none to its group, layer or lane.",
  "mark-covers": "A node's mark covers its text or another node.",
  "mark-file-changed": "A mark's file changed after the mark was set.",
  "mark-file-not-found": "No file is there for the mark.",
  "mark-file-outside": "A mark's file lies outside the diagram's folder.",
  "mark-file-unread": "A mark names a file that the command line did not read.",
  "mark-file-unreadable": "A mark's file is not a PNG or an SVG that grafical can read.",
  "mark-file-unsafe": "A mark's SVG holds code or a reference to something outside it.",
  "mark-not-drawn": "The bundled emoji have no picture for the mark.",
  "mark-style-on-picture":
    "A mark that is a picture, an emoji or a file, takes a size and no style.",
  "mark-too-long": "A mark's text is longer than a mark holds.",
  "missing-argument": "The command lacks an argument it needs.",
  "missing-field":
    "The operation lacks a field it needs, such as a node's place in a layer that has nodes.",
  "missing-glyph": "A text holds characters that no bundled font can draw.",
  "missing-mandatory-option-value": "The command lacks an option it needs.",
  "needless-bend": "An edge bends where one straight run would join its nodes.",
  "newer-format": "The file was written by a newer grafical.",
  "no-diagram": "There is no diagram to apply the operation to.",
  "no-folder": "The file's folder is not there.",
  "no-shared-layer": "The group given has no node in a layer of the group being placed.",
  "node-overlap": "Two nodes overlap.",
  "not-allowed": "The operation cannot be in a batch.",
  "not-in-git": "The file is not in a git repository.",
  "not-in-layer": "A place names a node that is not in the layer.",
  "option-missing-argument": "An option was given without its value.",
  "outside-folder": "The stylesheet lies outside the diagram's folder.",
  overflow: "A text takes more room than its node, header or card holds.",
  "passing-layer":
    "An edge runs through a layer between its ends, among the layer's nodes, without meeting one of them.",
  "same-layer": "A node is aligned with a node that sits in its own layer.",
  "self-alignment": "A node is aligned with itself.",
  "step-anchor": "Other nodes are placed by steps from the node.",
  "step-blocked": "A node placed by steps lands where another node keeps its place.",
  "step-collision": "An edge's step number touches a node, an edge, a text or another number.",
  "step-cycle": "A node would be placed by steps from itself, through other nodes.",
  "style-not-found": "No stylesheet is there.",
  "text-crossing": "An edge runs across a text.",
  "tight-edges": "Two edges run side by side less than 12 px apart for more than 100 px.",
  "title-blocked": "An edge runs where the group's title sits, and no edge moves for a title.",
  "too-much-emphasis": "More nodes would carry emphasis than grafical allows.",
  "unknown-column": "No column has the id.",
  "unknown-command": "No command has the name.",
  "unknown-edge": "No edge has the id.",
  "unknown-field": "The operation has a field that it does not take.",
  "unknown-group": "No group has the id.",
  "unknown-guide": "No guide has the name.",
  "unknown-lane": "No lane has the id.",
  "unknown-layer": "No layer has the id.",
  "unknown-style": "No style has the id.",
  "unknown-type": "No type has the name, or it is a type of another sort of object.",
  "unknown-node": "No node has the id.",
  "not-neighbours": "A gap names two regions that are not neighbours of one kind.",
  "unknown-note": "No note is on the id.",
  "unknown-op": "No operation has the name.",
  "unknown-option": "The command has no option of the name.",
  "unknown-wall": "No wall has the id.",
  "unknown-weight": "No edge weight has the name.",
  "unquoted-text":
    "A value holds a comma, a colon or a #, and YAML read it as more than one field.",
  "wall-crossed": "An edge runs through a wall that does not let it through.",
  "wall-sides": "A layer that the wall spans holds no node of a side, or a node between the sides.",
};

/** The commands that can change a problem, by name, in the order the help lists commands. */
type Next = readonly string[];

/**
 * For each code, the commands that can change it; for a code whose problem lies in different things, one list for
 * each, by what the problem is about (`variant`). Engine-owned defects and problems of a command or an operation's
 * own form name none.
 */
export const NEXT: Record<Code, Next | Readonly<Record<string, Next>>> = {
  "align-same-layer": ["node move", "node align"],
  "alignment-conflict": ["node move", "node align"],
  "bad-batch": [],
  "bad-file": [],
  "bad-id": [],
  "bad-mark": [],
  "bad-op": [],
  "bad-port": [],
  "bad-reference": [],
  "bad-revision": [],
  "bad-scale": [],
  "bad-stylesheet": ["diagram style"],
  "bad-type": [],
  "bad-value": [],
  "bad-yaml": [],
  "bar-crossed": ["layer move", "node move", "edge remove", "edge pass"],
  "bar-in-group": {
    line: ["group leave", "layer move", "node move", "edge remove"],
    look: ["group leave", "layer look", "layer move", "node move"],
  },
  "bar-to-bar": ["edge remove", "plug"],
  "bent-edge": ["layer move", "node move", "node swap"],
  "batch-unreadable": [],
  "both-on-link": ["edge type"],
  "node-aside": ["node move"],
  "column-lanes": ["lane remove", "column remove"],
  "column-order": ["column join", "column leave", "node move"],
  "conflicting-fields": [],
  "conflicting-option": [],
  "conflicting-position": {
    placed: [],
    stepped: ["node move"],
    align: ["node move", "node align"],
    column: ["column leave", "node move"],
    lane: ["lane leave", "node move"],
  },
  "copy-conflict": ["node move", "node align"],
  "crowded-label": ["node move", "node swap", "edge label"],
  crossing: ["group order", "layer move", "node move", "node swap"],
  "duplicate-id": {
    layer: ["layer remove"],
    node: ["node remove"],
    group: ["group remove"],
    lane: ["lane remove"],
    wall: ["wall remove"],
    column: ["column remove"],
    edge: ["edge remove"],
    note: ["note remove"],
    other: [],
  },
  "edge-blocked": ["node move", "edge remove", "plug"],
  "edge-inside": ["edge remove", "plug"],
  "edge-overlap": [],
  "edge-through-node": [],
  "empty-container": ["group join", "lane join", "edge remove", "plug"],
  "empty-value": [],
  "excess-arguments": [],
  "file-exists": [],
  "file-not-found": ["new"],
  "file-unreadable": [],
  "group-across-lanes": ["lane join", "lane leave"],
  "group-conflict": ["group join", "group leave", "node move"],
  "group-cycle": ["group leave"],
  "like-cycle": ["group like", "lane like", "node like", "edge like"],
  "group-intruder": [],
  "group-split": ["group join", "node move"],
  "group-too-deep": ["group leave", "group remove"],
  invalid: [],
  "invalid-argument": [],
  "side-blocked": ["layer move", "node move", "edge side"],
  "via-blocked": ["node move", "edge via"],
  "not-straight": ["node move", "node align", "edge straight"],
  "no-trunk": ["node move", "edge with"],
  "bend-blocked": ["node move", "edge bend"],
  "stretch-blocked": ["node move", "edge stretch"],
  "label-blocked": {
    edge: ["layer move", "node size", "node move", "edge label", "edge number"],
    note: ["note add", "note remove", "node move"],
    wall: ["wall label", "node move"],
  },
  "label-collision": [],
  "lane-gap": ["lane join", "lane leave", "layer move"],
  "lane-mixed": ["lane join", "lane leave"],
  "lane-stray": [],
  "lane-to-lane": ["edge remove", "plug"],
  "layer-not-empty": ["node move", "node remove"],
  "layer-too-small": ["node add", "node move"],
  "edge-across-group": ["group order", "node move", "node swap"],
  "edge-per-member": ["edge add", "edge remove"],
  "lonely-node": ["node remove", "edge add"],
  "mark-covers": ["node size", "node mark"],
  "mark-file-changed": ["node mark"],
  "mark-file-not-found": ["node mark"],
  "mark-file-outside": ["node mark"],
  "mark-file-unread": ["node mark"],
  "mark-file-unreadable": ["node mark"],
  "mark-file-unsafe": ["node mark"],
  "mark-not-drawn": ["node mark"],
  "mark-style-on-picture": [],
  "mark-too-long": [],
  "missing-argument": [],
  "missing-field": [],
  "missing-glyph": {
    title: ["diagram title"],
    subtitle: ["diagram subtitle"],
    caption: ["diagram caption"],
    legend: ["diagram legend"],
    group: ["group label", "group sublabel"],
    lane: ["lane label"],
    wall: ["wall label"],
    "on-note": ["note add"],
    layer: ["layer label"],
    node: ["node label", "node sublabel", "node mark"],
    edge: ["edge label"],
  },
  "missing-mandatory-option-value": [],
  "needless-bend": [],
  "newer-format": [],
  "no-diagram": ["new"],
  "no-folder": [],
  "no-shared-layer": ["node move"],
  "node-overlap": [],
  "not-allowed": ["new"],
  "not-in-git": [],
  "not-in-layer": [],
  "option-missing-argument": [],
  "outside-folder": [],
  overflow: {
    node: ["node label", "node size", "node sublabel"],
    lane: ["lane label"],
    note: ["note add"],
  },
  "passing-layer": ["layer move", "node move", "node swap"],
  "same-layer": ["node move", "node align"],
  "self-alignment": ["node align"],
  "step-anchor": ["node move"],
  "step-blocked": ["node move"],
  "step-collision": [],
  "step-cycle": ["node move"],
  "style-not-found": ["diagram style"],
  "text-crossing": [],
  "tight-edges": ["layer move", "node move", "node swap"],
  "title-blocked": ["group label-at", "node move", "edge remove"],
  "too-much-emphasis": ["node emphasis"],
  "unknown-column": ["column add"],
  "unknown-command": [],
  "unknown-edge": ["edge add"],
  "unknown-field": [],
  "unknown-group": ["group add"],
  "unknown-guide": [],
  "unknown-lane": ["lane add"],
  "unknown-layer": ["layer add"],
  "unknown-style": ["style add"],
  "unknown-type": ["type add"],
  "unknown-node": ["node add"],
  "not-neighbours": ["layer move", "node move"],
  "unknown-note": ["note add"],
  "unknown-op": [],
  "unknown-option": [],
  "unknown-wall": ["wall add"],
  // An edge or a legend names a weight its stylesheet lacks: another stylesheet, or another weight for the edge, or no
  // entry in the legend.
  "unknown-weight": {
    edge: ["diagram style", "edge weight"],
    legend: ["diagram style", "diagram legend"],
  },
  "unquoted-text": [],
  "wall-crossed": ["wall allow", "node move", "edge remove"],
  "wall-sides": ["wall remove", "node move"],
};

/** What a problem with variants is about: the key of its list in NEXT. */
export function variantOf(
  code: Code,
  facts: Facts,
  field: string | undefined,
  of?: string,
): string {
  switch (code) {
    case "bar-in-group":
      // A bar an edge ends at, or one drawn for its look alone.
      return facts.edge === undefined ? "look" : "line";
    case "unknown-weight":
      return facts.edge !== undefined || facts.edges !== undefined ? "edge" : "legend";
    case "conflicting-position":
      // A node moved by steps that keeps an alignment, a column or a lane can lose that, or not move by steps.
      if (facts.node === undefined) return "placed";
      return field?.startsWith("from,") ? field.slice("from,".length) : "stepped";
    case "duplicate-id":
      return facts.is ?? "other";
    case "label-blocked":
    case "overflow":
      return facts.is === "note" || field === "note" ? "note" : (of ?? facts.is ?? "node");
    case "missing-glyph":
      if (of === undefined) return field === "text" ? "legend" : (field ?? "title");
      return field === "note" ? "on-note" : of;
    default:
      return "";
  }
}

/** The commands that can change a problem. */
export function nextOf(code: Code, facts: Facts, field?: string, of?: string): Next {
  const n = NEXT[code];
  const named = Array.isArray(n)
    ? n
    : (n as Record<string, Next>)[variantOf(code, facts, field, of)];
  return (named ?? []).map(surfaceName);
}

/** The kinds of problem (specs/decisions, "Refusals say what happened and which commands can change it"). */
export type Kind = "error" | "defect" | "warning";

/** One problem as grafical prints it: its kind and code, its code's sentence, its source, its facts, and next. */
export interface Block {
  kind: Kind;
  code: Code;
  description: string;
  /** What caused it: the command line, a batch's edge, or what was already in the file. */
  source?: string;
  /** The operation's index in its batch, from 0: in --json only. */
  op?: number;
  detail: Record<string, Value>;
  next: readonly string[];
}

/** What each id of a diagram names, by the key its facts take: layer, node, group, lane, edge, wall or column. */
export function kindsOf(d: Diagram): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of d.layers) out.set(l.id, "layer");
  for (const n of everyNode(d)) out.set(n.id, "node");
  for (const g of d.groups ?? []) out.set(g.id, "group");
  for (const x of d.lanes ?? []) out.set(x.id, "lane");
  for (const x of d.walls ?? []) out.set(x.id, "wall");
  for (const x of d.columns ?? []) out.set(x.id, "column");
  for (const e of d.edges) out.set(e.id, "edge");
  return out;
}

/**
 * The keys that may name several things. Each holds a list, even of one; every other key holds one value
 * (specs/decisions, "Refusals say what happened and which commands can change it").
 */
const LISTS: ReadonlySet<keyof Facts> = new Set<keyof Facts>([
  "likely",
  "near",
  "edges",
  "ends",
  "nodes",
  "layers",
  "groups",
  "lanes",
  "between",
  "across",
  "chain",
  "clear",
  "gutters",
  "allowed",
  "takes",
  "chars",
]);
/** Where several ids of one kind go, by the key for one of them. */
const PLURAL: Readonly<Record<string, keyof Facts>> = {
  node: "nodes",
  edge: "edges",
  group: "groups",
  layer: "layers",
  lane: "lanes",
};

/** The facts in their order, as a block's detail. */
function ordered(facts: Facts, typed: Record<string, string[]> = {}): Record<string, Value> {
  // A key for one thing takes one id; several of one kind go under the key for several.
  const ids: Record<string, string[]> = {};
  for (const [k, list] of Object.entries(typed)) {
    const key = list.length > 1 && !LISTS.has(k as keyof Facts) ? (PLURAL[k] ?? k) : k;
    ids[key] = [...new Set([...(ids[key] ?? []), ...list])];
  }
  const out: Record<string, Value> = {};
  for (const k of FACT_ORDER) {
    const own = facts[k];
    const mine = ids[k];
    if (mine === undefined) {
      if (own !== undefined) out[k] = own;
      continue;
    }
    // A typed key both names elements and holds a fact: both, the elements first.
    const more = own === undefined ? [] : Array.isArray(own) ? own : [String(own)];
    const all = [...new Set([...mine, ...more])];
    out[k] = LISTS.has(k) || all.length > 1 ? all : (all[0] as string);
  }
  return out;
}

export function errorBlock(e: OpError): Block {
  const facts = e.facts ?? {};
  return {
    kind: "error",
    code: e.code,
    description: DESCRIPTIONS[e.code],
    ...(e.source !== undefined ? { source: e.source } : {}),
    // Only an error an operation caused has the operation's index: not one already in the file, nor one whose edge
    // cannot be known.
    ...(e.index >= 0 && e.source !== IN_FILE ? { op: e.index } : {}),
    detail: {
      ...(e.field !== undefined && e.field !== "" ? { field: e.field } : {}),
      ...(e.found !== "" ? { found: e.found } : {}),
      ...ordered(facts),
    },
    next: nextOf(e.code, facts, e.field),
  };
}

/**
 * The ids a defect names, split by what each one is. The first id of a blocked text is whose text it is, and the
 * edges across it are `across`; a mark that covers a node names the node with the mark, then the node it covers; a
 * note is named by what it is on.
 */
function typedIds(d: Defect, kinds: ReadonlyMap<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const add = (key: string | undefined, id: string) => {
    if (key === undefined) return;
    const list = out[key] ?? [];
    if (!list.includes(id)) list.push(id);
    out[key] = list;
  };
  const [first, ...rest] = d.elements;
  if (first === undefined) return out;
  if (d.code === "label-blocked") {
    add(d.facts.is === "note" || d.facts.is === "wall" ? d.facts.is : "edge", first);
    for (const id of rest) add(kinds.get(id) === "edge" ? "across" : kinds.get(id), id);
    return out;
  }
  if (d.code === "mark-covers" && d.facts.is === "node") {
    add("node", first);
    for (const id of rest) add("covers", id);
    return out;
  }
  if (d.field === "note" && kinds.has(first)) {
    add("note", first);
    return out;
  }
  for (const id of d.elements) add(kinds.get(id), id);
  return out;
}

export function defectBlock(d: Defect, kinds: ReadonlyMap<string, string>): Block {
  const first = d.elements[0];
  return {
    kind: "defect",
    code: d.code,
    description: DESCRIPTIONS[d.code],
    ...(d.source !== undefined ? { source: d.source } : {}),
    detail: {
      owner: d.owner,
      ...(d.field !== undefined ? { field: d.field } : {}),
      ...(d.found !== undefined && d.found !== "" ? { found: d.found } : {}),
      ...ordered(d.facts, typedIds(d, kinds)),
    },
    // An engine-owned defect is grafical's bug: no command of the agent's is the way to change it.
    next:
      d.owner === "engine"
        ? []
        : nextOf(d.code, d.facts, d.field, first === undefined ? undefined : kinds.get(first)),
  };
}

/** A command line that grafical cannot read, as a block. */
export function usageBlock(
  code: UsageCode,
  given: { field?: string; found?: Value },
  facts: Facts = {},
): Block {
  return {
    kind: "error",
    code,
    description: DESCRIPTIONS[code],
    detail: {
      ...(given.field !== undefined ? { field: given.field } : {}),
      ...(given.found !== undefined ? { found: given.found } : {}),
      ...ordered(facts),
    },
    next: nextOf(code, facts),
  };
}

/** Something drawn poorly, as a warning block. It has no source: the outcome edge names what the write changed. */
export function warningBlock(w: Warning): Block {
  return {
    kind: "warning",
    code: w.code,
    description: DESCRIPTIONS[w.code],
    detail: ordered(w.facts),
    next: nextOf(w.code, w.facts),
  };
}
