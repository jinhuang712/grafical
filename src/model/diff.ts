// The difference between two diagrams, as operations (DESIGN.md D18). Applied to
// `before` in one batch, the operations give `after`, file for file. Pure.
//
// The order makes every operation valid when it runs: edges that go, then nodes,
// groups and lanes that go; layers, then nodes, in their new places; the layers
// that go, now empty; the nodes' own facts; groups and lanes, and who is in them;
// last the edges that come. An alignment that a move would break is cleared
// before the move and set again after it. Groups, lanes and edges keep creation
// order in the file, and an operation can only append one, so the ones that the
// new order puts out of step are removed and added again.

import type { Op } from "./ops.ts";
import {
  type Diagram,
  type DiagramNode,
  type Edge,
  type Group,
  type Lane,
  LINE_STYLES,
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
  layer: string;
}

function nodesOf(d: Diagram): Map<string, Placed> {
  return new Map(d.layers.flatMap((l) => l.nodes.map((node) => [node.id, { node, layer: l.id }])));
}

const defaultEdgeId = (e: Edge) => `${e.from}->${e.to}`;

function edgeAdd(e: Edge): Op {
  const op: Op = { op: "edge.add", from: e.from, to: e.to, kind: e.kind };
  if (e.id !== defaultEdgeId(e)) op.id = e.id;
  if (e.label !== undefined) op.label = e.label;
  if (e.both === true) op.both = true;
  return op;
}

/** The operations that turn `before` into `after`. With no `before`, they build `after` from nothing. */
export function diffDiagrams(before: Diagram | null, after: Diagram): Op[] {
  if (before === null) {
    const created: Op = { op: "diagram.new", title: after.title, density: after.density };
    if (after.sizing === "fixed") created.sizing = "fixed";
    if (after.style !== undefined) created.style = after.style;
    if (after.subtitle !== undefined) created.subtitle = after.subtitle;
    if (after.note !== undefined) created.note = after.note;
    const empty: Diagram = { ...after, layers: [], edges: [] };
    delete empty.groups;
    delete empty.lanes;
    delete empty.walls;
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
  if (a.note !== b.note) {
    ops.push(a.note === undefined ? { op: "diagram.note" } : { op: "diagram.note", text: a.note });
  }
  if (a.density !== b.density) ops.push({ op: "diagram.density", density: a.density });
  if ((a.sizing ?? "auto") !== (b.sizing ?? "auto")) {
    ops.push({ op: "diagram.sizing", mode: a.sizing ?? "auto" });
  }
  if (a.style !== b.style) {
    ops.push(
      a.style === undefined ? { op: "diagram.style" } : { op: "diagram.style", style: a.style },
    );
  }
  for (const line of LINE_STYLES) {
    const words = a.legend?.[line];
    if (words !== b.legend?.[line]) ops.push({ op: "diagram.legend", style: line, ...said(words) });
  }
  const aw = a.legend?.weights ?? {};
  const bw = b.legend?.weights ?? {};
  for (const key of [...new Set([...Object.keys(bw), ...Object.keys(aw)])].sort()) {
    if (aw[key] === bw[key]) continue;
    // A width in pixels is a number in the operation, as in edge.weight (D41).
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

  // Walls (D43) that change go first and come back last, once all they name exists. So
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

  // 2. Edges that go.
  for (const e of b.edges) if (!keptEdges.has(e.id)) ops.push({ op: "edge.remove", id: e.id });

  // 3. Nodes, groups and lanes that go. Their edges went above.
  for (const id of bN.keys()) if (!aN.has(id)) ops.push({ op: "node.remove", id });
  for (const g of goneGroups)
    ops.push(
      bGroups.get(g)?.in === undefined
        ? { op: "group.remove", id: g }
        : { op: "group.remove", id: g, out: true },
    );
  for (const x of goneLanes) ops.push({ op: "lane.remove", id: x });

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

  // 4. Layers in their new order. A layer added inside a row lane joins it.
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
      const op: Op = { op: "layer.add", id: l.id, label: l.label };
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
    if (was !== undefined && was.label !== l.label) {
      ops.push({ op: "layer.rename", id: l.id, label: l.label });
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
          kind: n.kind,
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

  // 6. Layers that go, now empty.
  for (const l of b.layers)
    if (!aLayerIds.includes(l.id)) ops.push({ op: "layer.remove", id: l.id });

  // 7. The nodes' own facts. Accents go before others come, to stay within the limit.
  const ons: Op[] = [];
  for (const [id, { node: n }] of aN) {
    const was = bN.get(id)?.node;
    if (was !== undefined) {
      if (n.label !== was.label) ops.push({ op: "node.rename", id, label: n.label });
      if (n.sublabel !== was.sublabel)
        ops.push(
          n.sublabel === undefined
            ? { op: "node.describe", id }
            : { op: "node.describe", id, text: n.sublabel },
        );
      if (n.kind !== was.kind) ops.push({ op: "node.kind", id, kind: n.kind });
      if (n.size !== was.size)
        ops.push(
          n.size === undefined
            ? { op: "node.resize", id }
            : { op: "node.resize", id, size: n.size },
        );
      if (was.accent === true && n.accent !== true)
        ops.push({ op: "node.emphasize", id, off: true });
    }
    for (const slot of MARK_SLOTS) {
      const now = n.icons?.[slot];
      const before = was?.icons?.[slot];
      if (JSON.stringify(now) === JSON.stringify(before)) continue;
      if (now === undefined) ops.push({ op: "node.icon", id, slot });
      else if (typeof now === "string") ops.push({ op: "node.icon", id, slot, icon: now });
      else if ("file" in now) {
        ops.push({
          op: "node.icon",
          id,
          slot,
          icon: now.file,
          sha256: now.sha256,
          ...(now.size === undefined ? {} : { size: now.size }),
        });
      } else {
        const { text, ...style } = now;
        ops.push({ op: "node.icon", id, slot, icon: text, ...style });
      }
    }
    if (n.accent === true && was?.accent !== true) ons.push({ op: "node.emphasize", id });
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
      continue;
    }
    if (g.label !== was.label) ops.push({ op: "group.rename", id: g.id, label: g.label });
    if (g.sublabel !== was.sublabel)
      ops.push(
        g.sublabel === undefined
          ? { op: "group.describe", id: g.id }
          : { op: "group.describe", id: g.id, text: g.sublabel },
      );
  }
  for (const x of aLanes) {
    const was = keptLanes.has(x.id) ? bLanes.get(x.id) : undefined;
    if (was === undefined) ops.push({ op: "lane.add", id: x.id, label: x.label });
    else if (x.label !== was.label) ops.push({ op: "lane.rename", id: x.id, label: x.label });
  }
  const groupNow = (id: string) => {
    const g = bN.get(id)?.node.group;
    return g !== undefined && keptGroups.has(g) ? g : undefined;
  };
  const laneNow = (id: string) => {
    const x = bN.get(id)?.node.lane;
    return x !== undefined && keptLanes.has(x) ? x : undefined;
  };
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
  for (const g of aGroups) {
    const nodes = groupJoin.get(g.id);
    if (nodes !== undefined) ops.push({ op: "group.join", group: g.id, nodes });
  }
  for (const x of aLanes) {
    const members = laneJoin.get(x.id);
    if (members !== undefined) ops.push({ op: "lane.join", lane: x.id, members });
  }

  // 9. Edges that come, and the facts of the edges that stay. The weights come last.
  const mainOn: string[] = [];
  const mainOff: string[] = [];
  const weightOff: string[] = [];
  const weighted = new Map<string | number, string[]>();
  for (const e of a.edges) {
    const was = keptEdges.has(e.id) ? bEdges.get(e.id) : undefined;
    if (weightLook(e) !== weightLook(was)) {
      if (e.weight !== undefined && e.weight !== "thin") {
        weighted.set(e.weight, [...(weighted.get(e.weight) ?? []), e.id]);
      } else if (e.accent === true && e.weight === undefined) mainOn.push(e.id);
      else if (was?.weight === undefined) mainOff.push(e.id);
      else weightOff.push(e.id);
    }
    if (was === undefined) {
      ops.push(edgeAdd(e));
      continue;
    }
    if (e.from !== was.from || e.to !== was.to) {
      const op: Op = { op: "edge.retarget", id: e.id };
      if (e.from !== was.from) op.from = e.from;
      if (e.to !== was.to) op.to = e.to;
      ops.push(op);
    }
    if (e.label !== was.label)
      ops.push(
        e.label === undefined
          ? { op: "edge.relabel", id: e.id }
          : { op: "edge.relabel", id: e.id, label: e.label },
      );
    // Both ends off before a kind turns into a link, and on only after it leaves one.
    if (e.both !== true && was.both === true) ops.push({ op: "edge.both", id: e.id, off: true });
    if (e.kind !== was.kind) ops.push({ op: "edge.kind", id: e.id, kind: e.kind });
    if (e.both === true && was.both !== true) ops.push({ op: "edge.both", id: e.id });
  }
  if (mainOff.length > 0) ops.push({ op: "edge.emphasize", edges: mainOff, off: true });
  if (weightOff.length > 0) ops.push({ op: "edge.weight", edges: weightOff });
  for (const [weight, edges] of weighted) ops.push({ op: "edge.weight", edges, weight });
  if (mainOn.length > 0) ops.push({ op: "edge.emphasize", edges: mainOn });
  for (const w of a.walls ?? []) {
    if (keptWalls.has(w.id)) continue;
    const op: Op = { op: "wall.add", id: w.id, between: w.between, and: w.and };
    if (w.allow !== undefined) op.allow = w.allow;
    if (w.label !== undefined) op.label = w.label;
    ops.push(op);
  }
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

/** A legend entry's words as operation fields: text, hide for false, none for the default (D42). */
function said(words: string | false | undefined): { text: string } | { hide: true } | object {
  if (words === false) return { hide: true };
  return words === undefined ? {} : { text: words };
}

/** How an edge is weighted: a weight wins over the old accent, and thin is no weight (D41). */
function weightLook(e: Edge | undefined): string {
  if (e === undefined) return "thin";
  if (e.weight !== undefined) return e.weight === "thin" ? "thin" : `w:${e.weight}`;
  return e.accent === true ? "accent" : "thin";
}
