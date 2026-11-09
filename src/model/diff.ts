// The difference between two diagrams, as operations (specs/decisions, "Git as the history"). Applied to
// `before` together, the operations give `after`, file for file. Pure.
//
// The order makes every operation valid when it runs: edges that go, then nodes,
// groups and lanes that go; layers, then nodes, in their new places; the layers
// that go, now empty; the nodes' own facts; groups and lanes, and who is in them;
// last the edges that come. An alignment that a move would break is cleared
// before the move and set again after it. Groups, lanes and edges keep creation
// order in the file, and an operation can only append one, so the ones that the
// new order puts out of step are removed and added again.

import type { Op } from "./ops.ts";
import { everyNode, STEP_KEYS } from "./steps.ts";
import {
  type Diagram,
  type DiagramNode,
  EDGE_STYLES,
  type Edge,
  type Gap,
  type Group,
  type LabelAlign,
  type Lane,
  MARK_SLOTS,
  type Wall,
} from "./types.ts";

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

/** A node's steps as operation fields (specs/decisions, "Steps from another node"). */
function stepFields(n: DiagramNode): Partial<Record<(typeof STEP_KEYS)[number], number>> {
  const out: Partial<Record<(typeof STEP_KEYS)[number], number>> = {};
  for (const k of STEP_KEYS) if (n[k] !== undefined) out[k] = n[k];
  return out;
}

const sameSteps = (x: DiagramNode, y: DiagramNode) =>
  x.from === y.from && STEP_KEYS.every((k) => x[k] === y[k]);

const defaultEdgeId = (e: Edge) => `${e.from}->${e.to}`;

function edgeAdd(e: Edge): Op {
  const op: Op = { op: "edge.add", from: e.from, to: e.to, type: e.kind };
  if (e.id !== defaultEdgeId(e)) op.id = e.id;
  if (e.label !== undefined) op.label = e.label;
  if (e.both === true) op.both = true;
  if (e.pass === true) op.pass = true;
  return op;
}

/** The operations that turn `before` into `after`. With no `before`, they build `after` from nothing. */
export function diffDiagrams(before: Diagram | null, after: Diagram): Op[] {
  if (before === null) {
    const created: Op = { op: "diagram.new", title: after.title, density: after.density };
    if (after.sizing === "fixed") created.sizing = "fixed";
    if (after.style !== undefined) created.style = after.style;
    if (after.subtitle !== undefined) created.subtitle = after.subtitle;
    if (after.caption !== undefined) created.caption = after.caption;
    const empty: Diagram = { ...after, layers: [], edges: [] };
    delete empty.nodes;
    delete empty.groups;
    delete empty.lanes;
    delete empty.walls;
    delete empty.columns;
    delete empty.notes;
    delete empty.legend;
    return [created, ...diffDiagrams(empty, after)];
  }
  const b = before;
  const a = after;
  const ops: Op[] = [];

  // 1. Diagram settings.
  if (a.title !== b.title) ops.push({ op: "diagram.title", text: a.title });
  if (a.subtitle !== b.subtitle) {
    ops.push(
      a.subtitle === undefined
        ? { op: "diagram.subtitle" }
        : { op: "diagram.subtitle", text: a.subtitle },
    );
  }
  if (a.caption !== b.caption) {
    ops.push(
      a.caption === undefined
        ? { op: "diagram.caption" }
        : { op: "diagram.caption", text: a.caption },
    );
  }
  if (a.density !== b.density) ops.push({ op: "diagram.density", density: a.density });
  if (a.lines !== b.lines) ops.push({ op: "diagram.lines", lines: a.lines ?? "square" });
  if (JSON.stringify(a.titleAt) !== JSON.stringify(b.titleAt)) {
    ops.push({ op: "diagram.label-at", ...a.titleAt });
  }
  if ((a.sizing ?? "auto") !== (b.sizing ?? "auto")) {
    ops.push({ op: "diagram.sizing", mode: a.sizing ?? "auto" });
  }
  if (a.style !== b.style) {
    ops.push(
      a.style === undefined ? { op: "diagram.style" } : { op: "diagram.style", style: a.style },
    );
  }
  for (const styleName of EDGE_STYLES) {
    const words = a.legend?.[styleName];
    if (words !== b.legend?.[styleName])
      ops.push({ op: "diagram.legend", style: styleName, ...said(words) });
  }
  const aw = a.legend?.weights ?? {};
  const bw = b.legend?.weights ?? {};
  for (const key of [...new Set([...Object.keys(bw), ...Object.keys(aw)])].sort()) {
    if (aw[key] === bw[key]) continue;
    // A width in pixels is a number in the operation, as in edge.weight (specs/decisions, "Edge weights").
    const weight = /^[0-9]/.test(key) ? Number(key) : key;
    ops.push({ op: "diagram.legend", weight, ...said(aw[key]) });
  }
  const am = a.legend?.marks ?? {};
  const bm = b.legend?.marks ?? {};
  for (const mark of [...new Set([...Object.keys(bm), ...Object.keys(am)])].sort()) {
    const text = am[mark];
    if (text === bm[mark]) continue;
    ops.push(
      text === undefined ? { op: "diagram.legend", mark } : { op: "diagram.legend", mark, text },
    );
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
    if (!keptWalls.has(w.id)) ops.push({ op: "wall.remove", id: w.id });
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
    if (!keptNotes.has(x.on)) ops.push({ op: "note.remove", on: x.on });

  // Types and styles come before what marks them.
  const wasType = new Map((b.types ?? []).map((x) => [x.id, x]));
  for (const x of a.types ?? []) {
    if (JSON.stringify(wasType.get(x.id)) !== JSON.stringify(x)) ops.push({ op: "type.add", ...x });
  }
  const wasStyle = new Map((b.styles ?? []).map((x) => [x.id, x]));
  for (const x of a.styles ?? []) {
    if (JSON.stringify(wasStyle.get(x.id)) !== JSON.stringify(x))
      ops.push({ op: "style.add", ...x });
  }

  // 2. Edges that go.
  for (const e of b.edges) if (!keptEdges.has(e.id)) ops.push({ op: "edge.remove", id: e.id });

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
  for (const id of bSteps) {
    if (keptSteps.has(id)) continue;
    // A layer no node of which sits above or below the node.
    const row = b.layers.find((l) => !l.nodes.some((n) => n.align === id)) ?? b.layers[0];
    if (row !== undefined) ops.push({ op: "node.move", id, layer: row.id, last: true });
  }

  // 3. Nodes, groups and lanes that go. Their edges went above.
  for (const id of bN.keys()) if (!aN.has(id)) ops.push({ op: "node.remove", id });
  for (const g of goneGroups)
    ops.push(
      bGroups.get(g)?.in === undefined
        ? { op: "group.remove", id: g }
        : { op: "group.remove", id: g, out: true },
    );
  for (const x of goneLanes) ops.push({ op: "lane.remove", id: x });
  for (const c of goneColumns) ops.push({ op: "column.remove", id: c });

  // Alignments a move would break are cleared now and set again in step 7.
  const movesLayer = (id: string) => {
    const was = bN.get(id);
    const is = aN.get(id);
    return was !== undefined && is !== undefined && was.layer !== is.layer;
  };
  const cleared = new Set<string>();
  for (const [id, is] of aN) {
    const was = bN.get(id)?.node.align;
    if (was === undefined || !aN.has(was)) continue;
    if (was !== is.node.align || movesLayer(id) || movesLayer(was)) {
      ops.push({ op: "node.align", id });
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
  a.layers.forEach((l, k) => {
    const prev = aLayerIds[k - 1];
    const known = order.includes(l.id);
    if (known && stay.has(l.id)) return;
    if (known) {
      order.splice(order.indexOf(l.id), 1);
      ops.push(
        prev === undefined
          ? { op: "layer.move", id: l.id, first: true }
          : { op: "layer.move", id: l.id, after: prev },
      );
    } else {
      const op: Op = {
        op: "layer.add",
        id: l.id,
        ...(l.label === undefined ? {} : { label: l.label }),
      };
      if (prev !== undefined) op.after = prev;
      else if (order.length > 0) op.before = order[0] as string;
      ops.push(op);
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
      ops.push({ op: "layer.label", id: l.id, label: l.label });
    }
    if (l.look !== was?.look) {
      ops.push(
        l.look === undefined
          ? { op: "layer.look", id: l.id }
          : { op: "layer.look", id: l.id, look: l.look },
      );
    }
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
        const op: Op = {
          op: "node.add",
          id: n.id,
          layer: l.id,
          label: n.label,
          type: n.kind,
          ...place,
        };
        if (n.sublabel !== undefined) op.sublabel = n.sublabel;
        if (n.size !== undefined) op.size = n.size;
        ops.push(op);
      } else if (!still.has(n.id)) {
        const op: Op = { op: "node.move", id: n.id, ...place };
        if (movesLayer(n.id)) op.layer = l.id;
        ops.push(op);
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
      const op: Op = { op: "node.add", id: n.id, label: n.label, type: n.kind, from };
      if (n.sublabel !== undefined) op.sublabel = n.sublabel;
      if (n.size !== undefined) op.size = n.size;
      ops.push({ ...op, ...stepFields(n) });
    } else ops.push({ op: "node.move", id: n.id, from, ...stepFields(n) });
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
        ops.push({ op: "node.move", id: n.id, from: n.from as string, ...stepFields(n) });
      }
    }
  }

  // 6. Layers that go, now empty.
  for (const l of b.layers)
    if (!aLayerIds.includes(l.id)) ops.push({ op: "layer.remove", id: l.id });

  // 7. The nodes' own facts. Accents go before others come, to stay within the limit.
  const ons: Op[] = [];
  for (const [id, { node: n }] of aN) {
    const was = bN.get(id)?.node;
    if (was !== undefined) {
      if (n.label !== was.label) ops.push({ op: "node.label", id, label: n.label });
      if (n.sublabel !== was.sublabel)
        ops.push(
          n.sublabel === undefined
            ? { op: "node.sublabel", id }
            : { op: "node.sublabel", id, text: n.sublabel },
        );
      if (n.kind !== was.kind) ops.push({ op: "node.type", id, type: n.kind });
      if (n.size !== was.size)
        ops.push(
          n.size === undefined ? { op: "node.size", id } : { op: "node.size", id, size: n.size },
        );
      if (was.emphasis === true && n.emphasis !== true)
        ops.push({ op: "node.emphasis", id, off: true });
    }
    for (const slot of MARK_SLOTS) {
      const now = n.marks?.[slot];
      const before = was?.marks?.[slot];
      if (JSON.stringify(now) === JSON.stringify(before)) continue;
      if (now === undefined) ops.push({ op: "node.mark", id, slot });
      else if (typeof now === "string") ops.push({ op: "node.mark", id, slot, mark: now });
      else if ("file" in now) {
        ops.push({
          op: "node.mark",
          id,
          slot,
          mark: now.file,
          sha256: now.sha256,
          ...(now.size === undefined ? {} : { size: now.size }),
        });
      } else {
        const { text, ...style } = now;
        ops.push({ op: "node.mark", id, slot, mark: text, ...style });
      }
    }
    if (n.emphasis === true && was?.emphasis !== true) ons.push({ op: "node.emphasis", id });
    const now =
      was?.align !== undefined && !cleared.has(id) && aN.has(was.align) ? was.align : undefined;
    if (n.align !== now) {
      ons.push(
        n.align === undefined ? { op: "node.align", id } : { op: "node.align", id, to: n.align },
      );
    }
  }
  ops.push(...ons);

  // 8. Groups and lanes, then who is in them: everyone leaves first, so that lanes
  // can change the way they run.
  for (const g of aGroups) {
    const was = keptGroups.has(g.id) ? bGroups.get(g.id) : undefined;
    if (was === undefined) {
      const op: Op = { op: "group.add", id: g.id, label: g.label };
      if (g.sublabel !== undefined) op.sublabel = g.sublabel;
      ops.push(op);
      if (g.titleAt !== undefined) ops.push({ op: "group.label-at", id: g.id, ...g.titleAt });
      continue;
    }
    if (g.label !== was.label) ops.push({ op: "group.label", id: g.id, label: g.label });
    if (g.sublabel !== was.sublabel)
      ops.push(
        g.sublabel === undefined
          ? { op: "group.sublabel", id: g.id }
          : { op: "group.sublabel", id: g.id, text: g.sublabel },
      );
    if (JSON.stringify(g.titleAt) !== JSON.stringify(was.titleAt))
      ops.push(
        g.titleAt === undefined
          ? { op: "group.label-at", id: g.id }
          : { op: "group.label-at", id: g.id, ...g.titleAt },
      );
  }
  for (const x of aLanes) {
    const was = keptLanes.has(x.id) ? bLanes.get(x.id) : undefined;
    if (was === undefined) ops.push({ op: "lane.add", id: x.id, label: x.label });
    else if (x.label !== was.label) ops.push({ op: "lane.label", id: x.id, label: x.label });
  }
  const groupNow = (id: string) => {
    const g = bN.get(id)?.node.group;
    return g !== undefined && keptGroups.has(g) ? g : undefined;
  };
  const laneNow = (id: string) => {
    const x = bN.get(id)?.node.lane;
    return x !== undefined && keptLanes.has(x) ? x : undefined;
  };
  for (const c of aColumns) if (!keptColumns.has(c)) ops.push({ op: "column.add", id: c });
  const columnNow = (id: string) => {
    const c = bN.get(id)?.node.column;
    return c !== undefined && keptColumns.has(c) ? c : undefined;
  };
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
  if (groupLeave.length > 0) ops.push({ op: "group.leave", nodes: groupLeave });
  if (laneLeave.length > 0) ops.push({ op: "lane.leave", members: laneLeave });
  if (columnLeave.length > 0) ops.push({ op: "column.leave", members: columnLeave });
  for (const c of aColumns) {
    const members = columnJoin.get(c);
    if (members !== undefined) ops.push({ op: "column.join", column: c, members });
  }
  for (const g of aGroups) {
    const nodes = groupJoin.get(g.id);
    if (nodes !== undefined) ops.push({ op: "group.join", group: g.id, nodes });
  }
  for (const x of aLanes) {
    const members = laneJoin.get(x.id);
    if (members !== undefined) ops.push({ op: "lane.join", lane: x.id, members });
  }

  // 9. Edges that come, and the facts of the edges that stay. The weights come last.
  const weightOff: string[] = [];
  const weighted = new Map<string | number, string[]>();
  for (const e of a.edges) {
    const was = keptEdges.has(e.id) ? bEdges.get(e.id) : undefined;
    if (weightLook(e) !== weightLook(was)) {
      if (e.weight !== undefined && e.weight !== "thin") {
        weighted.set(e.weight, [...(weighted.get(e.weight) ?? []), e.id]);
      } else weightOff.push(e.id);
    }
    if (was === undefined) {
      ops.push(edgeAdd(e));
      if (e.step !== undefined) ops.push({ op: "edge.number", id: e.id, n: e.step });
      continue;
    }
    if (e.from !== was.from || e.to !== was.to) {
      const op: Op = { op: "plug", id: e.id };
      if (e.from !== was.from) op.from = e.from;
      if (e.to !== was.to) op.to = e.to;
      ops.push(op);
    }
    if (e.label !== was.label)
      ops.push(
        e.label === undefined
          ? { op: "edge.label", id: e.id }
          : { op: "edge.label", id: e.id, label: e.label },
      );
    // Both ends off before a kind turns into a link, and on only after it leaves one.
    if (e.both !== true && was.both === true) ops.push({ op: "edge.both", id: e.id, off: true });
    if (e.kind !== was.kind) ops.push({ op: "edge.type", id: e.id, type: e.kind });
    if (e.both === true && was.both !== true) ops.push({ op: "edge.both", id: e.id });
    if (e.out !== was.out || e.in !== was.in) {
      // A side taken away has no op of its own: both go, and what stays is stated again.
      if (
        (e.out === undefined && was.out !== undefined) ||
        (e.in === undefined && was.in !== undefined)
      ) {
        ops.push({ op: "edge.side", id: e.id });
      }
      if (e.out !== undefined || e.in !== undefined) {
        ops.push({
          op: "edge.side",
          id: e.id,
          ...(e.out === undefined ? {} : { out: e.out }),
          ...(e.in === undefined ? {} : { in: e.in }),
        });
      }
    }
    if (e.seat !== was.seat) {
      ops.push({ op: "edge.label-at", id: e.id, seat: e.seat ?? "on" });
    }
    if (JSON.stringify(e.via) !== JSON.stringify(was.via)) {
      ops.push({ op: "edge.via", id: e.id, ...(e.via ?? {}) });
    }
    if (e.straight !== was.straight) {
      ops.push({ op: "edge.straight", id: e.id, ...(e.straight === true ? {} : { off: true }) });
    }
    if (e.with !== was.with) {
      ops.push({ op: "edge.with", id: e.id, ...(e.with === undefined ? {} : { with: e.with }) });
    }
    if (e.bendAt !== was.bendAt) {
      ops.push({ op: "edge.bend", id: e.id, ...(e.bendAt === undefined ? {} : { at: e.bendAt }) });
    }
    if (e.stretch !== was.stretch) {
      const magnified = e.stretch;
      ops.push({ op: "edge.stretch", id: e.id, ...(magnified === undefined ? {} : { magnified }) });
    }
    if (e.pass !== was.pass) {
      ops.push(
        e.pass === true ? { op: "edge.pass", id: e.id } : { op: "edge.pass", id: e.id, off: true },
      );
    }
    if (e.step !== was.step)
      ops.push(
        e.step === undefined
          ? { op: "edge.number", id: e.id }
          : { op: "edge.number", id: e.id, n: e.step },
      );
  }
  if (weightOff.length > 0) ops.push({ op: "edge.weight", edges: weightOff });
  for (const [weight, edges] of weighted) ops.push({ op: "edge.weight", edges, weight });
  for (const w of a.walls ?? []) {
    if (keptWalls.has(w.id)) continue;
    const op: Op = { op: "wall.add", id: w.id, between: w.between, and: w.and };
    if (w.allow !== undefined) op.allow = w.allow;
    if (w.label !== undefined) op.label = w.label;
    ops.push(op);
  }
  for (const x of a.notes ?? []) {
    if (keptNotes.has(x.on)) continue;
    const op: Op = { op: "note.add", on: x.on, text: x.text };
    if (x.footnote === true) op.footnote = true;
    ops.push(op);
  }
  for (const x of a.notes ?? []) {
    const was = keptNotes.has(x.on)
      ? (b.notes ?? []).find((y) => y.on === x.on)?.labelAlign
      : undefined;
    if (was !== x.labelAlign) {
      ops.push({ op: "note.align", on: x.on, align: x.labelAlign ?? "left" });
    }
  }
  const gapKey = (g: Gap) => [...g.between].sort().join(" ");
  const wasGaps = new Map((b.gaps ?? []).map((g) => [gapKey(g), g]));
  const nowGaps = new Map((a.gaps ?? []).map((g) => [gapKey(g), g]));
  for (const [k, g] of wasGaps) {
    if (!nowGaps.has(k)) ops.push({ op: "gap.between", a: g.between[0], b: g.between[1] });
  }
  for (const [k, g] of nowGaps) {
    if (wasGaps.get(k)?.magnified === g.magnified) continue;
    ops.push({ op: "gap.between", a: g.between[0], b: g.between[1], magnified: g.magnified });
  }
  // 10. Who marks which style, then the styles that went.
  const same = (x?: string[], y?: string[]) => JSON.stringify(x ?? []) === JSON.stringify(y ?? []);
  const marks = <T extends { id: string; style?: string[] }>(
    op: "node.style" | "edge.style" | "group.style" | "lane.style",
    was: readonly T[],
    now: readonly T[],
  ) => {
    for (const x of now) {
      const old = was.find((y) => y.id === x.id);
      if (same(old?.style, x.style)) continue;
      ops.push(x.style === undefined ? { op, id: x.id } : { op, id: x.id, styles: x.style });
    }
  };
  for (const e of a.edges) {
    const was = b.edges.find((y) => y.id === e.id)?.labelStyle;
    if (same(was, e.labelStyle)) continue;
    const styles = e.labelStyle;
    ops.push({ op: "label.style", id: e.id, ...(styles === undefined ? {} : { styles }) });
  }
  marks("node.style", everyNode(b), everyNode(a));
  marks("edge.style", b.edges, a.edges);
  marks("group.style", b.groups ?? [], a.groups ?? []);
  marks("lane.style", b.lanes ?? [], a.lanes ?? []);
  const follows = <T extends { id: string; like?: string }>(
    op: "node.like" | "edge.like" | "group.like" | "lane.like",
    was: readonly T[],
    now: readonly T[],
  ) => {
    // Letting go comes first, so no step passes through a circle.
    const moved = now.filter((x) => was.find((y) => y.id === x.id)?.like !== x.like);
    for (const x of moved) {
      if (was.find((y) => y.id === x.id)?.like !== undefined) ops.push({ op, id: x.id });
    }
    for (const x of moved) if (x.like !== undefined) ops.push({ op, id: x.id, like: x.like });
  };
  follows("node.like", everyNode(b), everyNode(a));
  follows("edge.like", b.edges, a.edges);
  follows("group.like", b.groups ?? [], a.groups ?? []);
  follows("lane.like", b.lanes ?? [], a.lanes ?? []);
  const types = <T extends { id: string; type?: string }>(
    op: "node.type" | "edge.type",
    was: readonly T[],
    now: readonly T[],
  ) => {
    for (const x of now) {
      const old = was.find((y) => y.id === x.id);
      if (old?.type === x.type) continue;
      ops.push(x.type === undefined ? { op, id: x.id } : { op, id: x.id, type: x.type });
    }
  };
  for (const x of a.layers) {
    const was = b.layers.find((y) => y.id === x.id)?.labelAt;
    if (was === x.labelAt) continue;
    ops.push({
      op: "layer.label-at",
      id: x.id,
      ...(x.labelAt === undefined ? {} : { at: x.labelAt }),
    });
  }
  for (const x of a.lanes ?? []) {
    const was = (b.lanes ?? []).find((y) => y.id === x.id)?.labelAt;
    if (was === x.labelAt) continue;
    ops.push({
      op: "lane.label-at",
      id: x.id,
      ...(x.labelAt === undefined ? {} : { at: x.labelAt }),
    });
  }
  const aligns = <T extends { id: string; labelAlign?: LabelAlign }>(was: T[], now: T[]) => {
    for (const x of now) {
      if (was.find((y) => y.id === x.id)?.labelAlign === x.labelAlign) continue;
      ops.push({ op: "label.align", id: x.id, align: x.labelAlign ?? "center" });
    }
  };
  aligns(everyNode(b), everyNode(a));
  aligns(b.edges, a.edges);
  aligns(b.lanes ?? [], a.lanes ?? []);
  aligns(b.walls ?? [], a.walls ?? []);
  types("node.type", everyNode(b), everyNode(a));
  types("edge.type", b.edges, a.edges);
  const keptTypes = new Set((a.types ?? []).map((x) => x.id));
  for (const x of b.types ?? [])
    if (!keptTypes.has(x.id)) ops.push({ op: "type.remove", id: x.id });
  const kept = new Set((a.styles ?? []).map((x) => x.id));
  for (const x of b.styles ?? []) if (!kept.has(x.id)) ops.push({ op: "style.remove", id: x.id });

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

/** A legend entry's words as operation fields: text, or none for no entry (specs/decisions, "A legend for widths and marks"). */
function said(words: string | undefined): { text: string } | object {
  return words === undefined ? {} : { text: words };
}

/** How an edge is weighted: thin is no weight (specs/decisions, "Edge weights"). */
function weightLook(e: Edge | undefined): string {
  if (e === undefined) return "thin";
  if (e.weight !== undefined) return e.weight === "thin" ? "thin" : `w:${e.weight}`;
  return "thin";
}
