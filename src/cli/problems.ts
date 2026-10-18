// What a problem is, in grafical's words (DESIGN.md, "Refusals say what happened and which commands can change it"):
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

/** Every code a problem may carry. */
export type Code = ErrorCode | DefectCode | UsageCode | WarningCode;
export const CODES: readonly Code[] = [
  ...new Set<Code>([...ERROR_CODES, ...DEFECT_CODES, ...USAGE_CODES, ...WARNING_CODES]),
];

/** What happened, one sentence per code. A code that is both an error and a defect has one sentence for both. */
export const DESCRIPTIONS: Record<Code, string> = {
  "align-same-layer":
    "A box is aligned with a box in its own row, and an alignment joins two rows.",
  "alignment-conflict":
    "A box's alignment cannot hold together with the other alignments and the order of the rows.",
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
  "bar-crossed": "A line passes a row with no boxes, drawn as a bar, without ending at it.",
  "bar-in-group":
    "A row with no boxes, drawn as a bar, lies inside a group's box, which covers every row from its top row to its bottom one.",
  "bar-to-bar": "A line joins two rows with no boxes, and a bar is met straight past a box.",
  "bent-line": "A line bends more than twice, mostly because it skips rows.",
  "batch-unreadable": "The batch file cannot be read.",
  "both-on-link": "A link has no direction, so it takes no arrowheads.",
  "box-aside":
    "A box placed by steps sits beside every box it connects to, so its lines reach across.",
  "column-lanes":
    "The diagram has columns and lanes that run as columns, and it may have one of them.",
  "column-order": "A box of a column would sit right of a box of a later column in some row.",
  "conflicting-fields": "The operation gives two fields, and it takes one of them.",
  "conflicting-option": "The command was given two options, and it takes one of them.",
  "conflicting-position":
    "The operation gives a box more than one place, or a place in a row to a box placed by steps.",
  "copy-conflict":
    "A copied box's alignment, steps, lane or column cannot hold for the copy where it is put.",
  "crowded-label": "A line's label has less than 8 px of room on two or more sides.",
  crossing: "Two lines cross.",
  "duplicate-id": "The id is taken.",
  "edge-blocked":
    "A line that ends at a group, row or lane has no way to it: other boxes stand between its ends in their row.",
  "edge-inside": "A line joins a group, row or lane and something inside it.",
  "edge-overlap": "Two lines run on top of each other.",
  "edge-through-node": "A line runs through a box.",
  "empty-container": "A line ends at a group or lane that holds no box.",
  "empty-value": "A field is empty, and it takes at least one value.",
  "excess-arguments": "The command was given more arguments than it takes.",
  "file-exists": "A file is already there.",
  "file-not-found": "No file is there.",
  "file-unreadable": "The file cannot be read.",
  "group-across-lanes": "A group's boxes lie in more than one lane, and a group lies in one.",
  "group-conflict":
    "A group's box covers every row from its top member to its bottom one, and a box or group in those rows would sit on both sides of it.",
  "group-cycle": "Groups would sit inside each other in a circle.",
  "group-intruder": "A box that is not a member lies inside a group's box.",
  "group-split":
    "A box sits between members of the group in one row, and a group's box cannot split around it.",
  "group-too-deep": "Groups would nest deeper than grafical draws.",
  invalid: "A field holds a value that is not valid there.",
  "invalid-argument": "An option holds a value that it does not take.",
  "label-blocked":
    "A text has no place clear of the lines and boxes around it, and no line moves for a text.",
  "label-collision": "A line's label lies on a box, a line or another label.",
  "lane-gap": "A row of no lane lies between rows of one lane, and a lane's rows are neighbours.",
  "lane-mixed": "The lanes hold rows and boxes, and lanes run one way: as rows or as columns.",
  "lane-stray": "A box lies outside its lane, or inside a lane it is not in.",
  "lane-to-lane": "A line joins two lanes.",
  "layer-not-empty": "The row still holds boxes.",
  "layer-too-small": "The row holds fewer than two boxes.",
  "line-across-group": "A line runs through the box of a group that holds neither of its ends.",
  "lonely-box": "No line reaches a box: none of its own, and none to its group, row or lane.",
  "mark-covers": "A box's mark covers its text or another box.",
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
    "The operation lacks a field it needs, such as a box's place in a row that has boxes.",
  "missing-glyph": "A text holds characters that no bundled font can draw.",
  "missing-mandatory-option-value": "The command lacks an option it needs.",
  "needless-bend": "A line bends where one straight run would join its boxes.",
  "newer-format": "The file was written by a newer grafical.",
  "no-diagram": "There is no diagram to apply the operation to.",
  "no-folder": "The file's folder is not there.",
  "no-shared-layer": "The group given has no box in a row of the group being placed.",
  "node-overlap": "Two boxes overlap.",
  "not-allowed": "The operation cannot be in a batch.",
  "not-in-git": "The file is not in a git repository.",
  "not-in-layer": "A place names a box that is not in the row.",
  "option-missing-argument": "An option was given without its value.",
  "outside-folder": "The stylesheet lies outside the diagram's folder.",
  overflow: "A text takes more room than its box, header or card holds.",
  "passing-row":
    "A line runs through a row between its ends, among the row's boxes, without meeting one of them.",
  "same-layer": "A box is aligned with a box that sits in its own row.",
  "self-alignment": "A box is aligned with itself.",
  "step-anchor": "Other boxes are placed by steps from the box.",
  "step-blocked": "A box placed by steps lands where another box keeps its place.",
  "step-collision": "A line's step number touches a box, a line, a text or another number.",
  "step-cycle": "A box would be placed by steps from itself, through other boxes.",
  "style-not-found": "No stylesheet is there.",
  "text-crossing": "A line runs across a text.",
  "tight-lines": "Two lines run side by side less than 12 px apart for more than 100 px.",
  "title-blocked": "A line runs where the group's title sits, and no line moves for a title.",
  "too-many-accents": "More boxes would carry an accent than grafical allows.",
  "unknown-column": "No column has the id.",
  "unknown-command": "No command has the name.",
  "unknown-edge": "No line has the id.",
  "unknown-field": "The operation has a field that it does not take.",
  "unknown-group": "No group has the id.",
  "unknown-guide": "No guide has the name.",
  "unknown-lane": "No lane has the id.",
  "unknown-layer": "No row has the id.",
  "unknown-node": "No box has the id.",
  "unknown-note": "No note is on the id.",
  "unknown-op": "No operation has the name.",
  "unknown-option": "The command has no option of the name.",
  "unknown-wall": "No wall has the id.",
  "unknown-weight": "No line weight has the name.",
  "unquoted-text":
    "A value holds a comma, a colon or a #, and YAML read it as more than one field.",
  "wall-crossed": "A line runs through a wall that does not let it through.",
  "wall-sides": "A row that the wall spans holds no box of a side, or a box between the sides.",
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
  "bar-to-bar": ["edge remove", "edge retarget"],
  "bent-line": ["layer move", "node move", "node swap"],
  "batch-unreadable": [],
  "both-on-link": ["edge kind"],
  "box-aside": ["node move"],
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
  "crowded-label": ["node move", "node swap", "edge relabel"],
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
  "edge-blocked": ["node move", "edge remove", "edge retarget"],
  "edge-inside": ["edge remove", "edge retarget"],
  "edge-overlap": [],
  "edge-through-node": [],
  "empty-container": ["group join", "lane join", "edge remove", "edge retarget"],
  "empty-value": [],
  "excess-arguments": [],
  "file-exists": [],
  "file-not-found": ["new"],
  "file-unreadable": [],
  "group-across-lanes": ["lane join", "lane leave"],
  "group-conflict": ["group join", "group leave", "node move"],
  "group-cycle": ["group leave"],
  "group-intruder": [],
  "group-split": ["group join", "node move"],
  "group-too-deep": ["group leave", "group remove"],
  invalid: [],
  "invalid-argument": [],
  "label-blocked": {
    edge: ["layer move", "node resize", "node move", "edge relabel", "edge step"],
    note: ["note add", "note remove", "node move"],
    wall: ["wall relabel", "node move"],
  },
  "label-collision": [],
  "lane-gap": ["lane join", "lane leave", "layer move"],
  "lane-mixed": ["lane join", "lane leave"],
  "lane-stray": [],
  "lane-to-lane": ["edge remove", "edge retarget"],
  "layer-not-empty": ["node move", "node remove"],
  "layer-too-small": ["node add", "node move"],
  "line-across-group": ["group order", "node move", "node swap"],
  "lonely-box": ["node remove", "edge add"],
  "mark-covers": ["node resize", "node icon"],
  "mark-file-changed": ["node icon"],
  "mark-file-not-found": ["node icon"],
  "mark-file-outside": ["node icon"],
  "mark-file-unread": ["node icon"],
  "mark-file-unreadable": ["node icon"],
  "mark-file-unsafe": ["node icon"],
  "mark-not-drawn": ["node icon"],
  "mark-style-on-picture": [],
  "mark-too-long": [],
  "missing-argument": [],
  "missing-field": [],
  "missing-glyph": {
    title: ["diagram title"],
    subtitle: ["diagram subtitle"],
    note: ["diagram note"],
    legend: ["diagram legend"],
    group: ["group rename", "group describe"],
    lane: ["lane rename"],
    wall: ["wall relabel"],
    "on-note": ["note add"],
    row: ["layer rename"],
    node: ["node rename", "node describe", "node icon"],
    edge: ["edge relabel"],
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
    node: ["node rename", "node resize", "node describe"],
    lane: ["lane rename"],
    note: ["note add"],
  },
  "passing-row": ["layer move", "node move", "node swap"],
  "same-layer": ["node move", "node align"],
  "self-alignment": ["node align"],
  "step-anchor": ["node move"],
  "step-blocked": ["node move"],
  "step-collision": [],
  "step-cycle": ["node move"],
  "style-not-found": ["diagram style"],
  "text-crossing": [],
  "tight-lines": ["layer move", "node move", "node swap"],
  "title-blocked": ["group title", "node move", "edge remove"],
  "too-many-accents": ["node emphasize"],
  "unknown-column": ["column add"],
  "unknown-command": [],
  "unknown-edge": ["edge add"],
  "unknown-field": [],
  "unknown-group": ["group add"],
  "unknown-guide": [],
  "unknown-lane": ["lane add"],
  "unknown-layer": ["layer add"],
  "unknown-node": ["node add"],
  "unknown-note": ["note add"],
  "unknown-op": [],
  "unknown-option": [],
  "unknown-wall": ["wall add"],
  // A line or a legend names a weight its stylesheet lacks: another stylesheet, or another weight for the line, or no
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
      // A bar a line ends at, or one drawn for its look alone.
      return facts.edge === undefined ? "look" : "line";
    case "unknown-weight":
      return facts.edge !== undefined || facts.edges !== undefined ? "edge" : "legend";
    case "conflicting-position":
      // A box moved by steps that keeps an alignment, a column or a lane can lose that, or not move by steps.
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
  if (Array.isArray(n)) return n;
  return (n as Record<string, Next>)[variantOf(code, facts, field, of)] ?? [];
}

/** The kinds of problem (DESIGN.md, "Refusals say what happened and which commands can change it"). */
export type Kind = "error" | "defect" | "warning";

/** One problem as grafical prints it: its kind and code, its code's sentence, its source, its facts, and next. */
export interface Block {
  kind: Kind;
  code: Code;
  description: string;
  /** What caused it: the command line, a batch's line, or what was already in the file. */
  source?: string;
  /** The operation's index in its batch, from 0: in --json only. */
  op?: number;
  detail: Record<string, Value>;
  next: readonly string[];
}

/** What each id of a diagram names, by the key its facts take: row, node, group, lane, edge, wall or column. */
export function kindsOf(d: Diagram): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of d.layers) out.set(l.id, "row");
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
 * (DESIGN.md, "Refusals say what happened and which commands can change it").
 */
const LISTS: ReadonlySet<keyof Facts> = new Set<keyof Facts>([
  "likely",
  "near",
  "edges",
  "ends",
  "nodes",
  "rows",
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
  row: "rows",
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
    // Only an error an operation caused has the operation's index: not one already in the file, nor one whose line
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
 * lines across it are `across`; a mark that covers a box names the box with the mark, then the box it covers; a
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

/** Something drawn poorly, as a warning block. It has no source: the outcome line names what the write changed. */
export function warningBlock(w: Warning): Block {
  return {
    kind: "warning",
    code: w.code,
    description: DESCRIPTIONS[w.code],
    detail: ordered(w.facts),
    next: nextOf(w.code, w.facts),
  };
}
