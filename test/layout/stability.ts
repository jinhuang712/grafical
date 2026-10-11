// Benchmark 4 as a test helper: after one operation, did anything move that D10's
// list does not allow? Every x is compared relative to the centre line, so a wider
// canvas that shifts everything by the same amount moves nothing.
//
// The list, as checked here:
// - nodes: the named ones; others in a layer whose contents changed, sideways only;
//   layers whose band moved down or changed height, as one block; nodes aligned to
//   a node that moved;
// - edges that may change anywhere: the named ones, those attached to a node that
//   moved, and those that pass through a layer whose contents changed (the gaps
//   they pass through moved);
// - every other edge may change only inside the channels (gutters and gaps) it
//   shares with those, which covers ports on a shared node side;
// - a label may move if its route changed. A label whose route did not change may
//   move only inside a channel shared with a changed edge, like a route, because a
//   new line can cross its slot. Those moves are counted, since D10 lists only "the
//   labels of routes that changed".

import type { Diagram } from "../../src/model/types.ts";
import type { Point, Rect, Scene, SceneEdge } from "../../src/scene.ts";

export interface Framed {
  scene: Scene;
  centre: number;
}

export interface Named {
  nodes: string[];
  edges: string[];
}

export interface Report {
  violations: string[];
  /** Edges whose route changed, of those in both scenes. */
  changedRoutes: string[];
  /** Routes that changed although they are not named and not attached to anything that moved. */
  bystanders: string[];
  /** Labels that moved inside a shared channel although their route did not change. */
  labelsAlone: string[];
}

const key = (r: Rect, c: number) => `${r.x - c},${r.y},${r.w},${r.h}`;

function contents(d: Diagram): Map<string, string> {
  return new Map(d.layers.map((l) => [l.id, l.nodes.map((n) => `${n.id}:${n.size}`).join(",")]));
}

/** The channel a point lies in: a gutter, a gap beside nodes, or inside a node. */
function classify(s: Scene, x: number, y: number): string {
  for (let i = 0; i < s.layers.length; i++) {
    const l = s.layers[i];
    if (l === undefined) continue;
    const above = i === 0 ? "G:top" : `G:${s.layers[i - 1]?.id}`;
    if (y < l.band.y) return above;
    if (y > l.band.y + l.band.h) continue;
    const nodes = s.nodes.filter((n) => n.layer === l.id).sort((a, b) => a.rect.x - b.rect.x);
    for (const n of nodes) {
      if (x < n.rect.x || x > n.rect.x + n.rect.w) continue;
      if (y <= n.rect.y) return above;
      if (y >= n.rect.y + n.rect.h) return `G:${l.id}`;
      return `inside:${n.id}`;
    }
    const left = nodes.filter((n) => n.rect.x + n.rect.w < x).pop()?.id ?? "";
    const right = nodes.find((n) => n.rect.x > x)?.id ?? "";
    return `V:${l.id}:${left}|${right}`;
  }
  return `G:${s.layers[s.layers.length - 1]?.id}`;
}

/** A point every px along a route, with its channel. */
function samples(s: Scene, pts: Point[], c: number): { at: string; ch: string }[] {
  const out: { at: string; ch: string }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a === undefined || b === undefined) continue;
    const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    const steps = Math.max(1, Math.round(len));
    for (let k = 0; k <= steps; k++) {
      const x = a.x + ((b.x - a.x) * k) / steps;
      const y = a.y + ((b.y - a.y) * k) / steps;
      out.push({
        at: `${Math.round((x - c) * 10) / 10},${Math.round(y * 10) / 10}`,
        ch: classify(s, x, y),
      });
    }
  }
  return out;
}

function passesBand(s: Scene, pts: Point[], layer: string): boolean {
  const l = s.layers.find((x) => x.id === layer);
  if (l === undefined) return false;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a === undefined || b === undefined) continue;
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    if (Math.min(hi, l.band.y + l.band.h) - Math.max(lo, l.band.y) > 0) return true;
  }
  return false;
}

export function d10(before: Framed, after: Framed, db: Diagram, da: Diagram, named: Named): Report {
  const violations: string[] = [];
  const cb = before.centre;
  const ca = after.centre;
  const sb = before.scene;
  const sa = after.scene;

  const kb = contents(db);
  const ka = contents(da);
  const changedLayers = new Set(
    [...new Set([...kb.keys(), ...ka.keys()])].filter((id) => kb.get(id) !== ka.get(id)),
  );
  const bandB = new Map(sb.layers.map((l) => [l.id, l.band]));
  const bandA = new Map(sa.layers.map((l) => [l.id, l.band]));
  const nodeB = new Map(sb.nodes.map((n) => [n.id, n]));
  const nodeA = new Map(sa.nodes.map((n) => [n.id, n]));
  const alignOf = new Map(
    da.layers.flatMap((l) => l.nodes.flatMap((n) => (n.align ? [[n.id, n.align]] : []))),
  );

  const moved = new Set<string>();
  for (const [id, b] of nodeB) {
    const a = nodeA.get(id);
    if (a === undefined) continue;
    if (key(b.rect, cb) !== key(a.rect, ca) || b.layer !== a.layer) moved.add(id);
  }
  const allowedX = (id: string, layer: string): boolean => {
    if (named.nodes.includes(id) || changedLayers.has(layer)) return true;
    const t = alignOf.get(id);
    return t !== undefined && moved.has(t) && allowedX(t, nodeA.get(t)?.layer ?? "");
  };
  for (const id of moved) {
    const b = nodeB.get(id);
    const a = nodeA.get(id);
    if (a === undefined || b === undefined || named.nodes.includes(id)) continue;
    if (b.rect.w !== a.rect.w || b.rect.h !== a.rect.h) violations.push(`node ${id} changed size`);
    if (b.rect.x - cb !== a.rect.x - ca && !allowedX(id, a.layer)) {
      violations.push(`node ${id} moved sideways`);
    }
    if (b.rect.y !== a.rect.y) {
      const bb = bandB.get(a.layer);
      const ba = bandA.get(a.layer);
      const block =
        bb !== undefined &&
        ba !== undefined &&
        (bb.h !== ba.h || a.rect.y - b.rect.y === ba.y - bb.y) &&
        (bb.y !== ba.y || bb.h !== ba.h);
      if (!block) violations.push(`node ${id} moved down, not with its layer as one block`);
    }
  }

  const edgeB = new Map(sb.edges.map((e) => [e.id, e]));
  const edgeA = new Map(sa.edges.map((e) => [e.id, e]));
  const rel = (e: SceneEdge | undefined, c: number) =>
    JSON.stringify(e?.points.map((p) => [p.x - c, p.y]) ?? null);
  const free = new Set<string>(named.edges);
  for (const e of [...sb.edges, ...sa.edges]) {
    if (
      moved.has(e.from) ||
      moved.has(e.to) ||
      named.nodes.includes(e.from) ||
      named.nodes.includes(e.to)
    ) {
      free.add(e.id);
    }
  }
  for (const layer of changedLayers) {
    for (const e of sb.edges) if (passesBand(sb, e.points, layer)) free.add(e.id);
    for (const e of sa.edges) if (passesBand(sa, e.points, layer)) free.add(e.id);
  }
  for (const id of edgeB.keys()) if (!edgeA.has(id)) free.add(id);
  for (const id of edgeA.keys()) if (!edgeB.has(id)) free.add(id);

  const shared = new Set<string>();
  for (const id of free) {
    const b = edgeB.get(id);
    const a = edgeA.get(id);
    if (b !== undefined) for (const s of samples(sb, b.points, cb)) shared.add(s.ch);
    if (a !== undefined) for (const s of samples(sa, a.points, ca)) shared.add(s.ch);
  }

  const changedRoutes: string[] = [];
  const bystanders: string[] = [];
  const labelsAlone: string[] = [];
  const channelOf = (s: Scene, r: Rect) => classify(s, r.x + r.w / 2, r.y + r.h / 2);
  for (const [id, b] of edgeB) {
    const a = edgeA.get(id);
    if (a === undefined) continue;
    const routeChanged = rel(b, cb) !== rel(a, ca);
    if (routeChanged) {
      changedRoutes.push(id);
      if (!free.has(id)) {
        bystanders.push(id);
        const outside = (s: Scene, e: SceneEdge, c: number) =>
          samples(s, e.points, c)
            .filter((x) => !shared.has(x.ch))
            .map((x) => x.at)
            .join(" ");
        if (outside(sb, b, cb) !== outside(sa, a, ca)) {
          violations.push(`route ${id} changed outside the channels it shares with a changed edge`);
        }
      }
    }
    const lb = b.label === undefined ? "none" : key(b.label.bbox, cb);
    const la = a.label === undefined ? "none" : key(a.label.bbox, ca);
    if (
      lb !== la &&
      !routeChanged &&
      !free.has(id) &&
      b.label !== undefined &&
      a.label !== undefined
    ) {
      if (shared.has(channelOf(sb, b.label.bbox)) && shared.has(channelOf(sa, a.label.bbox))) {
        labelsAlone.push(id);
      } else {
        violations.push(`label of ${id} moved outside the channels shared with a changed edge`);
      }
    }
  }
  return { violations, changedRoutes, bystanders, labelsAlone };
}
