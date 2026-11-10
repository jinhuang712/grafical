// The difference between two diagrams, as operations (specs/decisions, "Git as the history", "One command is one
// write, and running it twice changes nothing"). Applied to `before` one after another, each a write of its own, the
// operations give `after`, file for file. Each is placed so that it leaves a diagram the model accepts where an order
// can; a picture in between may still draw wrong, and that write refuses it, as the owner expects. Each fact that
// changed is said as the command that makes it. Pure.
//
// The order keeps every step valid and drawn as close to the end as it can be: the diagram's settings, types and
// styles, and the styles of what stays; edges that go; alignments of nodes that wait, then nodes, groups and lanes
// that go; members leave lanes, columns and groups where staying would block a move; layers, then nodes, in their new
// places; layers that go; the nodes' own facts; groups, lanes and columns, and who joins them; alignments; the edges
// that come, each made as it ends up, and their labels and numbers once every edge is drawn; walls and notes; last who
// follows whose look and the types and styles that went. Groups, lanes and edges keep creation order in the file, and
// an operation can only append one, so the ones that the new order puts out of step are removed and added again.

import { type Op, RESET } from "./ops.ts";
import { everyNode, STEP_KEYS } from "./steps.ts";
import {
  type Diagram,
  type DiagramNode,
  EDGE_STYLES,
  type Edge,
  type Group,
  type LabelAlign,
  type Lane,
  MARK_SLOTS,
  type Mark,
  OWN_KEYS,
  type OwnSort,
  type Wall,
} from "./types.ts";

const str = (v: unknown) => (v === undefined ? RESET : String(v));
const joined = (v: readonly string[] | undefined) => (v === undefined ? RESET : v.join(","));
const onOff = (on: boolean | undefined) => (on === true ? "on" : "off");

/** The longest common subsequence of two lists of ids, as a set. */
function lcs(a: readonly string[], b: readonly string[]): Set<string> {
  const n = a.length;
  const m = b.length;
  // t[i * w + j]: the length of the longest common subsequence of a[i..] and b[j..].
  const w = m + 1;
  const t = new Int32Array((n + 1) * w);
  const at = (i: number, j: number) => t[i * w + j] ?? 0;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i * w + j] = a[i] === b[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }
  const out = new Set<string>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.add(a[i] as string);
      i++;
      j++;
    } else if (at(i + 1, j) >= at(i, j + 1)) i++;
    else j++;
  }
  return out;
}

/**
 * The ids of `after` that keep their entry: the longest start of `after` whose
 * ids are in `before`, in `before`'s order. Every later one is added again.
 */
function keptStart(before: readonly string[], after: readonly string[]): Set<string> {
  const kept = new Set<string>();
  let last = -1;
  for (const id of after) {
    const at = before.indexOf(id);
    if (at <= last) break;
    kept.add(id);
    last = at;
  }
  return kept;
}

interface Placed {
  node: DiagramNode;
  /** The node's layer; "" for a node placed by steps (specs/decisions, "Steps from another node"). */
  layer: string;
}

function nodesOf(d: Diagram): Map<string, Placed> {
  return new Map([
    ...d.layers.flatMap((l) => l.nodes.map((node) => [node.id, { node, layer: l.id }] as const)),
    ...(d.nodes ?? []).map((node) => [node.id, { node, layer: "" }] as const),
  ]);
}

/** A node's steps as a command's flags (specs/decisions, "Steps from another node"). */
function stepFlags(n: DiagramNode): Partial<Record<(typeof STEP_KEYS)[number], string>> {
  const out: Partial<Record<(typeof STEP_KEYS)[number], string>> = {};
  for (const k of STEP_KEYS) if (n[k] !== undefined) out[k] = String(n[k]);
  return out;
}

const sameSteps = (x: DiagramNode, y: DiagramNode) =>
  x.from === y.from && STEP_KEYS.every((k) => x[k] === y[k]);

/**
 * The command that makes an edge as it ends up, so that the picture after it is drawn as the last one will be: its
 * type, sides, steering, weight and styles. Its label and number wait until every edge is made, since a gutter grows
 * with the edges in it and an earlier text may find no room yet; `with` waits when the trunk it joins is not made yet.
 */
function edgeAdd(e: Edge, trunkMade: boolean): Op {
  const weighted = e.weight !== undefined && e.weight !== "thin";
  return {
    op: "edge.set",
    ids: [e.id],
    from: e.from,
    to: e.to,
    type: e.type ?? e.kind,
    ...(e.both === true ? { both: "on" } : {}),
    ...(e.pass === true ? { pass: "on" } : {}),
    ...(e.out === undefined ? {} : { out: e.out }),
    ...(e.in === undefined ? {} : { in: e.in }),
    ...(e.via === undefined ? {} : { via: `${e.via.object}:${e.via.side}` }),
    ...(e.straight === true ? { straight: "on" } : {}),
    ...(e.with === undefined || !trunkMade ? {} : { with: e.with }),
    ...(e.bendAt === undefined ? {} : { bendAt: String(e.bendAt) }),
    ...(e.stretch === undefined ? {} : { stretch: String(e.stretch) }),
    ...(weighted ? { weight: String(e.weight) } : {}),
    ...(e.style === undefined || e.style.length === 0 ? {} : { style: e.style.join(",") }),
    ...ownFlags("edge", undefined, e),
  };
}

/**
 * The flags of what an object holds of a style's attributes itself and did not hold so before, a reset for each it
 * held and no longer does (specs/decisions, "Every attribute of a style may be set on the object itself").
 */
function ownFlags(sort: OwnSort, was: object | undefined, now: object | undefined) {
  const a = (was ?? {}) as Record<string, unknown>;
  const b = (now ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of OWN_KEYS[sort]) if (a[k] !== b[k]) out[k] = str(b[k]);
  return out;
}

/** A style list as `--style` takes it, when there is one. */
const styleFlag = (style: readonly string[] | undefined) =>
  style === undefined || style.length === 0 ? {} : { style: style.join(",") };

/** What a type or a style held that it no longer does is reset, since `set` keeps what it does not name. */
function resets(
  was: Record<string, unknown> | undefined,
  now: Record<string, unknown>,
  fields: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (now[f] !== undefined) out[f] = String(now[f]);
    else if (was?.[f] !== undefined) out[f] = RESET;
  }
  return out;
}

const TYPE_FIELDS = ["base", "shape", "fill", "border", "borderWidth", "color"];
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
];

/** The command that puts a mark in a slot, with a reset for each style the mark there before had and this one lacks. */
function markSet(id: string, now: Mark, before: Mark | undefined): Op {
  const fields = (m: Mark | undefined): Record<string, unknown> =>
    m === undefined || typeof m === "string" ? {} : { ...m };
  const was = fields(before);
  const given = fields(now);
  const style: Record<string, string> = {};
  for (const f of ["bg", "fg", "border", "shape", "size"] as const) {
    if (given[f] !== undefined) style[f] = given[f] as string;
    else if (was[f] !== undefined) style[f] = RESET;
  }
  const what =
    typeof now === "string"
      ? { text: now }
      : "file" in now
        ? { file: now.file, sha256: now.sha256 }
        : { text: now.text };
  return { op: "mark.set", ids: [id], ...what, ...style };
}

/** The commands that turn `before` into `after`. With no `before`, they build `after` from nothing. */
function diffOps(before: Diagram | null, after: Diagram): Op[] {
  if (before === null) {
    const created: Op = {
      op: "diagram.set",
      title: after.title,
      ...(after.sizing === "fixed" ? { sizing: "fixed" } : {}),
      ...(after.stylesheet === undefined ? {} : { stylesheet: after.stylesheet }),
      ...(after.subtitle === undefined ? {} : { subtitle: after.subtitle }),
      ...(after.caption === undefined ? {} : { caption: after.caption }),
    };
    // Only what the first command makes: every other fact is said by a command of its own.
    const empty: Diagram = { ...after, layers: [], edges: [] };
    delete empty.types;
    delete empty.styles;
    delete empty.lines;
    delete empty.titleAt;
    delete empty.nodes;
    delete empty.groups;
    delete empty.lanes;
    delete empty.walls;
    delete empty.columns;
    delete empty.notes;
    delete empty.legend;
    delete empty.style;
    for (const k of OWN_KEYS.diagram) delete empty[k];
    return [created, ...diffOps(empty, after)];
  }
  const b = before;
  const a = after;
  const ops: Op[] = [];

  // 1. Diagram settings.
  if (a.title !== b.title) ops.push({ op: "diagram.set", title: a.title });
  if (a.subtitle !== b.subtitle) ops.push({ op: "diagram.set", subtitle: str(a.subtitle) });
  if (a.caption !== b.caption) ops.push({ op: "diagram.set", caption: str(a.caption) });
  if (a.lines !== b.lines) ops.push({ op: "diagram.set", lines: a.lines ?? "square" });
  if (JSON.stringify(a.titleAt) !== JSON.stringify(b.titleAt)) {
    ops.push(
      a.titleAt === undefined
        ? { op: "diagram.set", titleAt: RESET }
        : { op: "diagram.set", titleAt: String(a.titleAt.at), titleSide: a.titleAt.side },
    );
  }
  if ((a.sizing ?? "auto") !== (b.sizing ?? "auto")) {
    ops.push({ op: "diagram.set", sizing: a.sizing ?? "auto" });
  }
  if (a.stylesheet !== b.stylesheet) ops.push({ op: "diagram.set", stylesheet: str(a.stylesheet) });
  /** A legend entry's words, or its removal: the legend says only what the agent named (specs/decisions, "A legend for widths and marks"). */
  const legend = (id: string, text: string | undefined): Op =>
    text === undefined ? { op: "legend.remove", ids: [id] } : { op: "legend.set", ids: [id], text };
  for (const styleName of EDGE_STYLES) {
    const words = a.legend?.[styleName];
    if (words !== b.legend?.[styleName]) ops.push(legend(`style:${styleName}`, words));
  }
  const aw = a.legend?.weights ?? {};
  const bw = b.legend?.weights ?? {};
  for (const key of [...new Set([...Object.keys(bw), ...Object.keys(aw)])].sort()) {
    if (aw[key] !== bw[key]) ops.push(legend(`weight:${key}`, aw[key]));
  }
  const am = a.legend?.marks ?? {};
  const bm = b.legend?.marks ?? {};
  for (const mark of [...new Set([...Object.keys(bm), ...Object.keys(am)])].sort()) {
    if (am[mark] !== bm[mark]) ops.push(legend(`mark:${mark}`, am[mark]));
  }

  const bN = nodesOf(b);
  const aN = nodesOf(a);
  const bGroups = new Map((b.groups ?? []).map((g) => [g.id, g]));
  const aGroups = (a.groups ?? []) as Group[];
  const bLanes = new Map((b.lanes ?? []).map((x) => [x.id, x]));
  const aLanes = (a.lanes ?? []) as Lane[];
  // Groups and lanes out of creation order are removed and added again.
  const keptGroups = keptStart(
    [...bGroups.keys()],
    aGroups.map((g) => g.id),
  );
  const keptLanes = keptStart(
    [...bLanes.keys()],
    aLanes.map((x) => x.id),
  );
  const goneGroups = [...bGroups.keys()].filter((g) => !keptGroups.has(g));
  const goneLanes = [...bLanes.keys()].filter((x) => !keptLanes.has(x));
  // Columns (specs/decisions, "Columns beside layers") keep their order the same way: those out of step go and come back.
  const aColumns = (a.columns ?? []).map((c) => c.id);
  const keptColumns = keptStart(
    (b.columns ?? []).map((c) => c.id),
    aColumns,
  );
  const goneColumns = (b.columns ?? []).map((c) => c.id).filter((c) => !keptColumns.has(c));
  const reborn = new Set([...goneGroups, ...goneLanes]);

  // Edges keep their entry when it is in step and their ends before the change
  // last: removing an end removes its edges. The new ends all exist by step 9.
  const bEdges = new Map(b.edges.map((e) => [e.id, e]));
  const aLayerSet = new Set(a.layers.map((l) => l.id));
  const lasts = (id: string) =>
    !reborn.has(id) &&
    ((bN.has(id) && aN.has(id)) ||
      keptGroups.has(id) ||
      keptLanes.has(id) ||
      (aLayerSet.has(id) && b.layers.some((l) => l.id === id)));
  const survives = (e: Edge) => lasts(e.from) && lasts(e.to);
  const keptEdges = keptStart(
    b.edges.filter(survives).map((e) => e.id),
    a.edges
      .filter((e) => {
        const was = bEdges.get(e.id);
        return was !== undefined && survives(was);
      })
      .map((e) => e.id),
  );
  // A kept edge must also come before every new one in the file.
  {
    let fresh = false;
    for (const e of a.edges) {
      if (!keptEdges.has(e.id)) fresh = true;
      else if (fresh) keptEdges.delete(e.id);
    }
  }

  // Walls (specs/decisions, "Walls as space") that change go first and come back last, once all they name exists. So
  // does a wall that names something removed and added again, which would forget it.
  const removed = new Set([
    ...b.edges.filter((e) => !keptEdges.has(e.id)).map((e) => e.id),
    ...[...bN.keys()].filter((id) => !aN.has(id)),
    ...goneGroups,
  ]);
  const aWalls = new Map((a.walls ?? []).map((w) => [w.id, w]));
  const steady = (w: Wall) =>
    sameWall(w, aWalls.get(w.id)) &&
    ![...w.between, ...w.and, ...(w.allow ?? [])].some((id) => removed.has(id));
  const keptWalls = keptStart(
    (b.walls ?? []).filter(steady).map((w) => w.id),
    (a.walls ?? []).map((w) => w.id),
  );
  for (const w of b.walls ?? [])
    if (!keptWalls.has(w.id)) ops.push({ op: "wall.remove", ids: [w.id] });
  // Notes (specs/decisions, "Notes as callouts or footnotes") the same way: one that changes, or whose target is removed and added
  // again, goes first and comes back last.
  const aNotes = new Map((a.notes ?? []).map((x) => [x.on, x]));
  const keptNotes = keptStart(
    (b.notes ?? [])
      .filter(
        (x) =>
          aNotes.get(x.on)?.text === x.text &&
          aNotes.get(x.on)?.footnote === x.footnote &&
          !removed.has(x.on),
      )
      .map((x) => x.on),
    (a.notes ?? []).map((x) => x.on),
  );
  for (const x of b.notes ?? [])
    if (!keptNotes.has(x.on)) ops.push({ op: "note.remove", ids: [x.on] });

  // Types and styles come before what marks them.
  const fields = (x: object) => x as Record<string, unknown>;
  const wasType = new Map((b.types ?? []).map((x) => [x.id, x]));
  for (const x of a.types ?? []) {
    const was = wasType.get(x.id);
    if (JSON.stringify(was) === JSON.stringify(x)) continue;
    const said = resets(was === undefined ? undefined : fields(was), fields(x), TYPE_FIELDS);
    ops.push({ op: "type.set", ids: [x.id], ...said });
  }
  const wasStyle = new Map((b.styles ?? []).map((x) => [x.id, x]));
  for (const x of a.styles ?? []) {
    const was = wasStyle.get(x.id);
    if (JSON.stringify(was) === JSON.stringify(x)) continue;
    const said = resets(was === undefined ? undefined : fields(was), fields(x), STYLE_FIELDS);
    ops.push({ op: "style.set", ids: [x.id], ...said });
  }
  // A style's place decides between two that say one thing (specs/decisions, "Styles set spacing as CSS does, and a
  // later style wins"): each takes its place after the one before it.
  const styleOrder = (b.styles ?? []).map((x) => x.id);
  for (const x of a.styles ?? []) if (!styleOrder.includes(x.id)) styleOrder.push(x.id);
  const wantStyles = (a.styles ?? []).map((x) => x.id);
  for (let k = 1; k < wantStyles.length; k++) {
    const id = wantStyles[k] as string;
    const prev = wantStyles[k - 1] as string;
    if (styleOrder.indexOf(id) === styleOrder.indexOf(prev) + 1) continue;
    styleOrder.splice(styleOrder.indexOf(id), 1);
    styleOrder.splice(styleOrder.indexOf(prev) + 1, 0, id);
    ops.push({ op: "style.move", ids: [id], after: prev });
  }

  // The styles the diagram and what stays mark come next, before anything is placed, so that every later step is laid
  // out with the spacing and looks of the end (specs/decisions, "Styles set spacing as CSS does, and a later style
  // wins"). What is made later marks its styles as it is made.
  const same = (x?: readonly string[], y?: readonly string[]) =>
    JSON.stringify(x ?? []) === JSON.stringify(y ?? []);
  type Noun = "node" | "edge" | "group" | "lane" | "layer" | "column";
  const said = (noun: Noun, id: string, flags: Record<string, string>) =>
    ({ op: `${noun}.set`, ids: [id], ...flags }) as Op;
  if (!same(b.style, a.style)) ops.push({ op: "diagram.set", style: joined(a.style) });
  const diagramOwn = ownFlags("diagram", b, a);
  if (Object.keys(diagramOwn).length > 0) ops.push({ op: "diagram.set", ...diagramOwn });
  const marksKept = <T extends { id: string; style?: string[] }>(
    noun: Noun,
    was: readonly T[],
    now: readonly T[],
    kept: (id: string) => boolean,
  ) => {
    for (const x of now) {
      if (!kept(x.id)) continue;
      const old = was.find((y) => y.id === x.id);
      if (!same(old?.style, x.style)) ops.push(said(noun, x.id, { style: joined(x.style) }));
      const flags = ownFlags(noun, old, x);
      if (Object.keys(flags).length > 0) ops.push(said(noun, x.id, flags));
    }
  };
  const bLayerIds = new Set(b.layers.map((l) => l.id));
  marksKept("layer", b.layers, a.layers, (id) => bLayerIds.has(id));
  marksKept("node", everyNode(b), everyNode(a), (id) => bN.has(id));
  marksKept("group", b.groups ?? [], a.groups ?? [], (id) => keptGroups.has(id));
  marksKept("lane", b.lanes ?? [], a.lanes ?? [], (id) => keptLanes.has(id));
  marksKept("column", b.columns ?? [], a.columns ?? [], (id) => keptColumns.has(id));
  marksKept("edge", b.edges, a.edges, (id) => keptEdges.has(id));
  for (const e of a.edges) {
    if (!keptEdges.has(e.id)) continue;
    const was = bEdges.get(e.id)?.labelStyle;
    if (!same(was, e.labelStyle))
      ops.push({ op: "label.set", ids: [e.id], style: joined(e.labelStyle) });
  }

  // 2. Edges that go.
  for (const e of b.edges) if (!keptEdges.has(e.id)) ops.push({ op: "edge.remove", ids: [e.id] });

  // Nodes placed by steps (specs/decisions, "Steps from another node") keep creation order, and only the end of the list takes
  // a node. One placed by steps before and after, from a node that stays, keeps its entry
  // while in step; every other one waits in a layer, so that no node is removed while
  // another steps from it, and goes to the end of the list once the layers are in place.
  const bSteps = (b.nodes ?? []).map((n) => n.id);
  const aSteps = a.nodes ?? [];
  const keptSteps = keptStart(
    bSteps.filter((id) => {
      const was = bN.get(id)?.node;
      return was?.from !== undefined && aN.has(was.from) && aN.get(id)?.layer === "";
    }),
    aSteps.map((n) => n.id),
  );
  // An alignment to or from a node that is about to wait goes first: the node's place in its layer would not hold it.
  const cleared = new Set<string>();
  const waits = (x: string) => bSteps.includes(x) && !keptSteps.has(x);
  for (const id of aN.keys()) {
    const was = bN.get(id)?.node.align;
    if (was === undefined || !aN.has(was) || (!waits(id) && !waits(was))) continue;
    ops.push({ op: "node.set", ids: [id], align: RESET });
    cleared.add(id);
  }
  for (const id of bSteps) {
    if (keptSteps.has(id)) continue;
    // A layer no node of which sits above or below the node.
    // It waits beside a member of its own group where there is one, so that it splits no group, and never in a layer
    // with no node, which it would turn from a bar into a band.
    const group = bN.get(id)?.node.group;
    const rows = b.layers.filter((l) => l.nodes.length > 0 && !l.nodes.some((n) => n.align === id));
    const mate = (l: (typeof rows)[number]) =>
      [...l.nodes].reverse().find((n) => group !== undefined && n.group === group);
    const row = rows.find((l) => mate(l) !== undefined) ?? rows[0] ?? b.layers[0];
    const beside = row === undefined ? undefined : mate(row);
    if (row !== undefined)
      ops.push(
        beside === undefined
          ? { op: "node.move", ids: [id], layer: row.id, last: true }
          : { op: "node.move", ids: [id], layer: row.id, after: beside.id },
      );
  }

  // 3. Nodes, groups and lanes that go. Their edges went above.
  for (const id of bN.keys()) if (!aN.has(id)) ops.push({ op: "node.remove", ids: [id] });
  for (const g of goneGroups)
    ops.push(
      bGroups.get(g)?.in === undefined
        ? { op: "group.remove", ids: [g] }
        : { op: "group.remove", ids: [g], out: true },
    );
  for (const c of goneColumns) ops.push({ op: "column.remove", ids: [c] });

  // Alignments a move would break are cleared now and set again once every node has its place.
  const movesLayer = (id: string) => {
    const was = bN.get(id);
    const is = aN.get(id);
    return was !== undefined && is !== undefined && was.layer !== is.layer;
  };
  for (const [id, is] of aN) {
    const was = bN.get(id)?.node.align;
    if (was === undefined || !aN.has(was)) continue;
    if (cleared.has(id)) continue;
    if (was !== is.node.align || movesLayer(id) || movesLayer(was)) {
      ops.push({ op: "node.set", ids: [id], align: RESET });
      cleared.add(id);
    }
  }

  // 4. Layers in their new order. A layer added inside a layer lane joins it.
  const order = b.layers.map((l) => l.id);
  const laneOfLayer = new Map(
    b.layers.map((l) => [l.id, l.lane !== undefined && !reborn.has(l.lane) ? l.lane : undefined]),
  );
  const aLayerIds = a.layers.map((l) => l.id);
  const stay = lcs(
    order.filter((id) => aLayerIds.includes(id)),
    aLayerIds.filter((id) => order.includes(id)),
  );
  // Lanes and columns order the layers on every write, and a lane of layers must stay whole. So when who is in them
  // changes, or a layer moves while layers lie in lanes, every member leaves them before anything moves, and all join
  // again in step 8: no move runs under the memberships of before.
  let lanesLeft = false;
  let columnsLeft = false;
  const laneKept = (x: string | undefined) => (x !== undefined && keptLanes.has(x) ? x : undefined);
  const laneNow = (id: string) => (lanesLeft ? undefined : laneKept(bN.get(id)?.node.lane));
  const columnNow = (id: string) => {
    const c = bN.get(id)?.node.column;
    return !columnsLeft && c !== undefined && keptColumns.has(c) ? c : undefined;
  };
  // A node that leaves its group leaves it now, before anything moves, when that leaves no gap among those who stay:
  // moved first, it could stand between members of the group it is about to leave.
  const groupLeft = new Set<string>();
  const groupNow = (id: string) => {
    const g = bN.get(id)?.node.group;
    return !groupLeft.has(id) && g !== undefined && keptGroups.has(g) ? g : undefined;
  };
  {
    const parent = new Map((b.groups ?? []).map((g) => [g.id, g.in]));
    const within = (g: string | undefined, top: string): boolean =>
      g !== undefined && (g === top || within(parent.get(g), top));
    const leavers = new Set(
      [...aN]
        .filter(
          ([id, { node }]) =>
            groupNow(id) !== undefined && node.group !== groupNow(id) && bN.get(id)?.layer !== "",
        )
        .map(([id]) => id),
    );
    for (let changed = true; changed; ) {
      changed = false;
      for (const l of b.layers) {
        const ids = l.nodes.map((n) => n.id).filter((id) => aN.has(id));
        for (const top of keptGroups) {
          const inside = ids.map((id) => within(groupNow(id), top));
          const stays = ids.map((id, k) => inside[k] === true && !leavers.has(id));
          const first = stays.indexOf(true);
          const last = stays.lastIndexOf(true);
          for (let k = first + 1; k < last; k++) {
            const id = ids[k] as string;
            if (inside[k] && leavers.has(id)) {
              leavers.delete(id);
              changed = true;
            }
          }
        }
      }
    }
    if (leavers.size > 0) {
      ops.push({ op: "node.set", ids: [...leavers], group: RESET });
      for (const id of leavers) groupLeft.add(id);
    }
  }
  {
    const layersMove = a.layers.some((l) => order.includes(l.id) && !stay.has(l.id));
    const layered = b.layers.filter((l) => laneKept(laneOfLayer.get(l.id)) !== undefined);
    // Removed nodes went in step 3.
    const laned = [...bN.keys()].filter((id) => aN.has(id) && laneNow(id) !== undefined);
    const lanesChange =
      [...aN].some(([id, { node }]) => node.lane !== laneNow(id)) ||
      a.layers.some((l) => l.lane !== laneKept(laneOfLayer.get(l.id))) ||
      (layersMove && layered.length > 0);
    if (lanesChange && layered.length + laned.length > 0) {
      if (layered.length > 0)
        ops.push({ op: "layer.set", ids: layered.map((l) => l.id), lane: RESET });
      if (laned.length > 0) ops.push({ op: "node.set", ids: laned, lane: RESET });
      lanesLeft = true;
    }
    if (lanesChange) for (const id of laneOfLayer.keys()) laneOfLayer.set(id, undefined);
    // A lane that goes goes once its members have left: removed first, its members would take new places.
    for (const x of goneLanes) ops.push({ op: "lane.remove", ids: [x] });
    const columned = [...bN.keys()].filter((id) => aN.has(id) && columnNow(id) !== undefined);
    if ([...aN].some(([id, { node }]) => node.column !== columnNow(id)) && columned.length > 0) {
      ops.push({ op: "node.set", ids: columned, column: RESET });
      columnsLeft = true;
    }
  }
  a.layers.forEach((l, k) => {
    const prev = aLayerIds[k - 1];
    const known = order.includes(l.id);
    if (known && stay.has(l.id)) return;
    if (known) {
      order.splice(order.indexOf(l.id), 1);
      ops.push(
        prev === undefined
          ? { op: "layer.move", ids: [l.id], first: true }
          : { op: "layer.move", ids: [l.id], after: prev },
      );
    } else {
      ops.push({
        op: "layer.set",
        ids: [l.id],
        ...(l.label === undefined ? {} : { label: l.label }),
        ...styleFlag(l.style),
        ...ownFlags("layer", undefined, l),
        ...(prev !== undefined
          ? { after: prev }
          : order.length > 0
            ? { before: order[0] as string }
            : {}),
      });
      const at = prev === undefined ? 0 : order.indexOf(prev) + 1;
      const above = laneOfLayer.get(order[at - 1] ?? "");
      laneOfLayer.set(
        l.id,
        above !== undefined && above === laneOfLayer.get(order[at] ?? "") ? above : undefined,
      );
    }
    const at = prev === undefined ? 0 : order.indexOf(prev) + 1;
    order.splice(at, 0, l.id);
  });

  for (const l of a.layers) {
    const was = b.layers.find((x) => x.id === l.id);
    // No operation takes a layer's label away, so a layer that has none was made without one.
    if (was !== undefined && l.label !== undefined && was.label !== l.label) {
      ops.push({ op: "layer.set", ids: [l.id], label: l.label });
    }
    if (l.look !== was?.look) ops.push({ op: "layer.set", ids: [l.id], look: str(l.look) });
  }

  // 5. Nodes in their new layers and places.
  for (const l of a.layers) {
    const before = b.layers.find((x) => x.id === l.id)?.nodes.map((n) => n.id) ?? [];
    const here = l.nodes.map((n) => n.id);
    const still = lcs(
      before.filter((id) => here.includes(id)),
      here.filter((id) => before.includes(id)),
    );
    l.nodes.forEach((n, k) => {
      const prev = here[k - 1];
      const place = prev === undefined ? { first: true as const } : { after: prev };
      if (!bN.has(n.id)) {
        ops.push({
          op: "node.set",
          ids: [n.id],
          label: n.label,
          layer: l.id,
          ...place,
          type: n.type ?? n.kind,
          ...(n.sublabel === undefined ? {} : { sublabel: n.sublabel }),
          ...(n.size === undefined ? {} : { size: n.size }),
          ...styleFlag(n.style),
          ...ownFlags("node", undefined, n),
        });
      } else if (!still.has(n.id)) {
        ops.push({
          op: "node.move",
          ids: [n.id],
          ...(movesLayer(n.id) ? { layer: l.id } : {}),
          ...place,
        });
      }
    });
  }

  // Nodes placed by steps, past the ones that kept their entry, in the list's order. A
  // node steps from its own node once that node's chain of steps is final, and from the first
  // layer's first node until then; every node then takes its own, the node it steps from
  // first, so that no node ever steps from itself.
  const firstNode = a.layers.flatMap((l) => l.nodes)[0]?.id;
  const final = new Set(a.layers.flatMap((l) => l.nodes.map((n) => n.id)));
  const fixed = (n: DiagramNode) => {
    const was = bN.get(n.id)?.node;
    return keptSteps.has(n.id) && was !== undefined && sameSteps(n, was);
  };
  for (let grew = true; grew; ) {
    grew = false;
    for (const n of aSteps) {
      if (final.has(n.id) || !fixed(n) || !final.has(n.from ?? "")) continue;
      final.add(n.id);
      grew = true;
    }
  }
  const later = new Set<string>();
  for (const n of aSteps) {
    if (keptSteps.has(n.id) || n.from === undefined || firstNode === undefined) continue;
    const from = final.has(n.from) ? n.from : firstNode;
    if (from === n.from) final.add(n.id);
    else later.add(n.id);
    if (!bN.has(n.id)) {
      ops.push({
        op: "node.set",
        ids: [n.id],
        label: n.label,
        from,
        ...stepFlags(n),
        type: n.type ?? n.kind,
        ...(n.sublabel === undefined ? {} : { sublabel: n.sublabel }),
        ...(n.size === undefined ? {} : { size: n.size }),
        ...styleFlag(n.style),
        ...ownFlags("node", undefined, n),
      });
    } else ops.push({ op: "node.move", ids: [n.id], from, ...stepFlags(n) });
  }
  for (const n of aSteps) if (keptSteps.has(n.id) && !fixed(n)) later.add(n.id);
  const done = new Set(final);
  for (let grew = true; grew; ) {
    grew = false;
    for (const n of aSteps) {
      if (done.has(n.id) || !done.has(n.from ?? "")) continue;
      done.add(n.id);
      grew = true;
      if (later.has(n.id)) {
        ops.push({ op: "node.move", ids: [n.id], from: n.from as string, ...stepFlags(n) });
      }
    }
  }

  // 6. Layers that go, now empty.
  for (const l of b.layers)
    if (!aLayerIds.includes(l.id)) ops.push({ op: "layer.remove", ids: [l.id] });

  // 7. The nodes' own facts. Accents go before others come, to stay within the limit.
  const ons: Op[] = [];
  for (const [id, { node: n }] of aN) {
    const was = bN.get(id)?.node;
    if (was !== undefined) {
      if (n.label !== was.label) ops.push({ op: "node.set", ids: [id], label: n.label });
      if (n.sublabel !== was.sublabel)
        ops.push({ op: "node.set", ids: [id], sublabel: str(n.sublabel) });
      if (n.kind !== was.kind || n.type !== was.type)
        ops.push({ op: "node.set", ids: [id], type: n.type ?? n.kind });
      if (n.size !== was.size) ops.push({ op: "node.set", ids: [id], size: str(n.size) });
      if (was.emphasis === true && n.emphasis !== true)
        ops.push({ op: "node.set", ids: [id], emphasis: "off" });
    }
    for (const slot of MARK_SLOTS) {
      const now = n.marks?.[slot];
      const before = was?.marks?.[slot];
      if (JSON.stringify(now) === JSON.stringify(before)) continue;
      if (now === undefined) ops.push({ op: "mark.remove", ids: [`${id}:${slot}`] });
      else ops.push(markSet(`${id}:${slot}`, now, before));
    }
    if (n.emphasis === true && was?.emphasis !== true)
      ons.push({ op: "node.set", ids: [id], emphasis: "on" });
    const now =
      was?.align !== undefined && !cleared.has(id) && aN.has(was.align) ? was.align : undefined;
    if (n.align !== now) ons.push({ op: "node.set", ids: [id], align: str(n.align) });
  }

  // 8. Groups and lanes, then who is in them: everyone leaves first, so that lanes
  // can change the way they run.
  for (const g of aGroups) {
    const was = keptGroups.has(g.id) ? bGroups.get(g.id) : undefined;
    /** Where a group's label sits, as `label --set` says it. */
    const titleAt = (): Op =>
      g.titleAt === undefined
        ? { op: "label.set", ids: [g.id], at: RESET }
        : {
            op: "label.set",
            ids: [g.id],
            at: String(g.titleAt.at),
            side: g.titleAt.side,
            place: g.titleAt.place,
          };
    if (was === undefined) {
      ops.push({
        op: "group.set",
        ids: [g.id],
        label: g.label,
        ...(g.sublabel === undefined ? {} : { sublabel: g.sublabel }),
        ...styleFlag(g.style),
        ...ownFlags("group", undefined, g),
      });
      if (g.titleAt !== undefined) ops.push(titleAt());
      continue;
    }
    if (g.label !== was.label) ops.push({ op: "group.set", ids: [g.id], label: g.label });
    if (g.sublabel !== was.sublabel)
      ops.push({ op: "group.set", ids: [g.id], sublabel: str(g.sublabel) });
    if (JSON.stringify(g.titleAt) !== JSON.stringify(was.titleAt)) ops.push(titleAt());
  }
  for (const x of aLanes) {
    const was = keptLanes.has(x.id) ? bLanes.get(x.id) : undefined;
    if (was === undefined)
      ops.push({
        op: "lane.set",
        ids: [x.id],
        label: x.label,
        ...styleFlag(x.style),
        ...ownFlags("lane", undefined, x),
      });
    else if (x.label !== was.label) ops.push({ op: "lane.set", ids: [x.id], label: x.label });
  }
  const columnLeave: string[] = [];
  const columnJoin = new Map<string, string[]>();
  const groupLeave: string[] = [];
  const groupJoin = new Map<string, string[]>();
  const laneLeave: string[] = [];
  const laneJoin = new Map<string, string[]>();
  const want = <K>(map: Map<K, string[]>, key: K, id: string) =>
    map.set(key, [...(map.get(key) ?? []), id]);
  for (const [id, { node: n }] of aN) {
    const g = groupNow(id);
    if (n.group !== g) {
      if (n.group === undefined) groupLeave.push(id);
      else want(groupJoin, n.group, id);
    }
    const c = columnNow(id);
    if (n.column !== c) {
      if (c !== undefined) columnLeave.push(id);
      if (n.column !== undefined) want(columnJoin, n.column, id);
    }
    const x = laneNow(id);
    if (n.lane !== x) {
      if (x !== undefined) laneLeave.push(id);
      if (n.lane !== undefined) want(laneJoin, n.lane, id);
    }
  }
  // A group sits in the group it did before, if both are kept; a new group in none.
  for (const g of aGroups) {
    const before = keptGroups.has(g.id) ? bGroups.get(g.id)?.in : undefined;
    const now = before !== undefined && keptGroups.has(before) ? before : undefined;
    if (g.in === now) continue;
    if (g.in === undefined) groupLeave.push(g.id);
    else want(groupJoin, g.in, g.id);
  }
  for (const l of a.layers) {
    const x = laneOfLayer.get(l.id);
    const now = x !== undefined && keptLanes.has(x) ? x : undefined;
    if (l.lane === now) continue;
    if (now !== undefined) laneLeave.push(l.id);
    if (l.lane !== undefined) want(laneJoin, l.lane, l.id);
  }
  // Membership is set on the member: a node's group, a group's group, a layer's or a node's lane, a node's column.
  const isGroup = (id: string) => aGroups.some((g) => g.id === id) || bGroups.has(id);
  const isLayer = (id: string) =>
    a.layers.some((l) => l.id === id) || b.layers.some((l) => l.id === id);
  const inGroup = (members: readonly string[], group: string) => {
    const nodes = members.filter((m) => !isGroup(m));
    const groups = members.filter(isGroup);
    if (nodes.length > 0) ops.push({ op: "node.set", ids: nodes, group });
    if (groups.length > 0) ops.push({ op: "group.set", ids: groups, in: group });
  };
  const inLane = (members: readonly string[], lane: string) => {
    const layers = members.filter(isLayer);
    const nodes = members.filter((m) => !isLayer(m));
    if (layers.length > 0) ops.push({ op: "layer.set", ids: layers, lane });
    if (nodes.length > 0) ops.push({ op: "node.set", ids: nodes, lane });
  };
  if (groupLeave.length > 0) inGroup(groupLeave, RESET);
  if (laneLeave.length > 0) inLane(laneLeave, RESET);
  // A column is made once the lanes that ran as columns are left: a diagram has one or the other.
  for (const c of a.columns ?? [])
    if (!keptColumns.has(c.id))
      ops.push({
        op: "column.set",
        ids: [c.id],
        ...styleFlag(c.style),
        ...ownFlags("column", undefined, c),
      });
  if (columnLeave.length > 0) ops.push({ op: "node.set", ids: columnLeave, column: RESET });
  for (const c of aColumns) {
    const members = columnJoin.get(c);
    if (members !== undefined) ops.push({ op: "node.set", ids: members, column: c });
  }
  // A group takes its new members after those leaving it for another group have joined theirs, so that no one stands
  // among its members on the way.
  {
    const current = (id: string) =>
      isGroup(id) ? (keptGroups.has(id) ? bGroups.get(id)?.in : undefined) : groupNow(id);
    const pending = aGroups.map((g) => g.id).filter((g) => groupJoin.has(g));
    while (pending.length > 0) {
      const ready =
        pending.find(
          (t) =>
            !pending.some((u) => u !== t && (groupJoin.get(u) ?? []).some((x) => current(x) === t)),
        ) ?? (pending[0] as string);
      pending.splice(pending.indexOf(ready), 1);
      inGroup(groupJoin.get(ready) as string[], ready);
    }
  }
  for (const x of aLanes) {
    const members = laneJoin.get(x.id);
    if (members !== undefined) inLane(members, x.id);
  }

  // Alignments and the first nodes to stand out, once memberships have put every layer in its order: a lane or a
  // column orders a layer on every write, so an alignment set earlier may not hold yet.
  ops.push(...ons);
  // Where a layer's or a lane's label sits along its head, and how labels line up, before the edges come.
  for (const x of [...a.layers, ...(a.lanes ?? [])]) {
    const was = [...b.layers, ...(b.lanes ?? [])].find((y) => y.id === x.id)?.labelAt;
    if (was !== x.labelAt) ops.push({ op: "label.set", ids: [x.id], at: str(x.labelAt) });
  }
  const aligns = <T extends { id: string; labelAlign?: LabelAlign }>(was: T[], now: T[]) => {
    for (const x of now) {
      if (was.find((y) => y.id === x.id)?.labelAlign === x.labelAlign) continue;
      ops.push({ op: "label.set", ids: [x.id], align: x.labelAlign ?? "center" });
    }
  };
  aligns(everyNode(b), everyNode(a));
  aligns(b.lanes ?? [], a.lanes ?? []);

  // 9. Edges that come, each made as it ends up, and the facts of the edges that stay. Their weights come last.
  const weightOff: string[] = [];
  const weighted = new Map<string | number, string[]>();
  const set = (id: string, flags: Record<string, string>): Op => ({
    op: "edge.set",
    ids: [id],
    ...flags,
  });
  const made = new Set([...keptEdges]);
  const trunks: Op[] = [];
  const texts: Op[] = [];
  for (const e of a.edges) {
    const was = keptEdges.has(e.id) ? bEdges.get(e.id) : undefined;
    if (was === undefined) {
      const trunkMade = e.with === undefined || made.has(e.with);
      ops.push(edgeAdd(e, trunkMade));
      if (!trunkMade) trunks.push(set(e.id, { with: e.with as string }));
      if (e.label !== undefined || e.step !== undefined) {
        texts.push(
          set(e.id, {
            ...(e.label === undefined ? {} : { label: e.label }),
            ...(e.step === undefined ? {} : { number: String(e.step) }),
          }),
        );
        if (e.seat !== undefined) texts.push({ op: "label.set", ids: [e.id], seat: e.seat });
        if (e.labelStyle !== undefined && e.labelStyle.length > 0)
          texts.push({ op: "label.set", ids: [e.id], style: e.labelStyle.join(",") });
        const look = ownFlags("label", undefined, e.labelLook);
        if (e.label !== undefined && Object.keys(look).length > 0)
          texts.push({ op: "label.set", ids: [e.id], ...look });
      }
      made.add(e.id);
      continue;
    }
    if (weightLook(e) !== weightLook(was)) {
      if (e.weight !== undefined && e.weight !== "thin") {
        weighted.set(e.weight, [...(weighted.get(e.weight) ?? []), e.id]);
      } else weightOff.push(e.id);
    }
    if (e.from !== was.from || e.to !== was.to) {
      ops.push(
        set(e.id, {
          ...(e.from === was.from ? {} : { from: e.from }),
          ...(e.to === was.to ? {} : { to: e.to }),
        }),
      );
    }
    if (e.label !== was.label) ops.push(set(e.id, { label: str(e.label) }));
    // A label's own look goes with its label, so only a label that stays or comes says it.
    if (e.label !== undefined) {
      const look = ownFlags(
        "label",
        was.label === undefined ? undefined : was.labelLook,
        e.labelLook,
      );
      if (Object.keys(look).length > 0) ops.push({ op: "label.set", ids: [e.id], ...look });
    }
    // Both ends off before a kind turns into a link, and on only after it leaves one.
    if (e.both !== true && was.both === true) ops.push(set(e.id, { both: "off" }));
    if (e.kind !== was.kind || e.type !== was.type) ops.push(set(e.id, { type: e.type ?? e.kind }));
    if (e.both === true && was.both !== true) ops.push(set(e.id, { both: "on" }));
    if (e.out !== was.out || e.in !== was.in) {
      // A side taken away resets both, and what stays is stated again.
      if (
        (e.out === undefined && was.out !== undefined) ||
        (e.in === undefined && was.in !== undefined)
      ) {
        ops.push(set(e.id, { out: RESET, in: RESET }));
      }
      if (e.out !== undefined || e.in !== undefined) {
        ops.push(
          set(e.id, {
            ...(e.out === undefined ? {} : { out: e.out }),
            ...(e.in === undefined ? {} : { in: e.in }),
          }),
        );
      }
    }
    if (e.seat !== was.seat) ops.push({ op: "label.set", ids: [e.id], seat: e.seat ?? "on" });
    if (JSON.stringify(e.via) !== JSON.stringify(was.via)) {
      ops.push(set(e.id, { via: e.via === undefined ? RESET : `${e.via.object}:${e.via.side}` }));
    }
    if (e.straight !== was.straight) ops.push(set(e.id, { straight: onOff(e.straight) }));
    if (e.with !== was.with) ops.push(set(e.id, { with: str(e.with) }));
    if (e.bendAt !== was.bendAt) ops.push(set(e.id, { bendAt: str(e.bendAt) }));
    if (e.stretch !== was.stretch) ops.push(set(e.id, { stretch: str(e.stretch) }));
    if (e.pass !== was.pass) ops.push(set(e.id, { pass: onOff(e.pass) }));
    if (e.step !== was.step) ops.push(set(e.id, { number: str(e.step) }));
  }
  ops.push(...trunks);
  ops.push(...texts);
  if (weightOff.length > 0) ops.push({ op: "edge.set", ids: weightOff, weight: RESET });
  for (const [weight, edges] of weighted) {
    ops.push({ op: "edge.set", ids: edges, weight: String(weight) });
  }
  aligns(b.edges, a.edges);
  for (const w of a.walls ?? []) {
    if (keptWalls.has(w.id)) continue;
    ops.push({
      op: "wall.set",
      ids: [w.id],
      between: w.between.join(","),
      and: w.and.join(","),
      ...(w.allow === undefined || w.allow.length === 0 ? {} : { allow: w.allow.join(",") }),
      ...(w.label === undefined ? {} : { label: w.label }),
    });
  }
  aligns(b.walls ?? [], a.walls ?? []);
  for (const x of a.notes ?? []) {
    if (keptNotes.has(x.on)) continue;
    ops.push({
      op: "note.set",
      ids: [x.on],
      text: x.text,
      ...(x.footnote === true ? { footnote: "on" } : {}),
    });
  }
  for (const x of a.notes ?? []) {
    const was = keptNotes.has(x.on)
      ? (b.notes ?? []).find((y) => y.on === x.on)?.labelAlign
      : undefined;
    if (was !== x.labelAlign) {
      ops.push({ op: "note.set", ids: [x.on], align: x.labelAlign ?? "left" });
    }
  }
  // 10. Who follows whose look, then the types and styles that went.
  const follows = <T extends { id: string; like?: string }>(
    noun: Noun,
    was: readonly T[],
    now: readonly T[],
  ) => {
    // Letting go comes first, so no step passes through a circle.
    const moved = now.filter((x) => was.find((y) => y.id === x.id)?.like !== x.like);
    for (const x of moved) {
      if (was.find((y) => y.id === x.id)?.like !== undefined)
        ops.push(said(noun, x.id, { like: RESET }));
    }
    for (const x of moved) if (x.like !== undefined) ops.push(said(noun, x.id, { like: x.like }));
  };
  follows("node", everyNode(b), everyNode(a));
  follows("edge", b.edges, a.edges);
  follows("group", b.groups ?? [], a.groups ?? []);
  follows("lane", b.lanes ?? [], a.lanes ?? []);
  const keptTypes = new Set((a.types ?? []).map((x) => x.id));
  for (const x of b.types ?? [])
    if (!keptTypes.has(x.id)) ops.push({ op: "type.remove", ids: [x.id] });
  const kept = new Set((a.styles ?? []).map((x) => x.id));
  for (const x of b.styles ?? [])
    if (!kept.has(x.id)) ops.push({ op: "style.remove", ids: [x.id] });

  return ops;
}

function sameWall(x: Wall, y: Wall | undefined): boolean {
  const list = (ids: readonly string[] | undefined) => (ids ?? []).join(",");
  return (
    y !== undefined &&
    list(x.between) === list(y.between) &&
    list(x.and) === list(y.and) &&
    list(x.allow) === list(y.allow) &&
    x.label === y.label
  );
}

/** How an edge is weighted: thin is no weight (specs/decisions, "Edge weights"). */
function weightLook(e: Edge | undefined): string {
  if (e === undefined) return "thin";
  if (e.weight !== undefined) return e.weight === "thin" ? "thin" : `w:${e.weight}`;
  return "thin";
}

/**
 * Two commands in a row that set different attributes of the same objects, said as one: a node made and then marking
 * a style is one `node --set`. A command that places or moves is never joined to the one before it.
 */
function joinedSets(ops: Op[]): Op[] {
  const out: Op[] = [];
  for (const op of ops) {
    const last = out[out.length - 1] as Record<string, unknown> | undefined;
    const cur = op as Record<string, unknown>;
    const fields = (o: Record<string, unknown>) =>
      Object.keys(o).filter((k) => k !== "op" && k !== "ids");
    const sameIds = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
    if (
      last !== undefined &&
      last.op === cur.op &&
      String(cur.op).endsWith(".set") &&
      cur.op !== "diagram.set" &&
      sameIds(last.ids, cur.ids) &&
      fields(cur).every((k) => !(k in last)) &&
      !["first", "last", "before", "after", "layer", "from"].some((k) => k in cur)
    ) {
      Object.assign(last, cur);
      continue;
    }
    out.push({ ...op });
  }
  return out;
}

/** The commands that turn `before` into `after`. With no `before`, they build `after` from nothing. */
export function diffDiagrams(before: Diagram | null, after: Diagram): Op[] {
  return joinedSets(diffOps(before, after));
}
