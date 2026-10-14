// GOALS.md, "Stability" as a test helper, restated for the column grid (DESIGN.md, "Layout computed again on every change"): an
// operation changes only the facts it names. The engine chooses columns, so
// positions may shift to keep the picture tidy; the structure may not. After one
// operation, for every node the operation does not name:
// - it stays in its layer, and the picture draws it in that layer's row;
// - it keeps its place in its layer's order, and the picture draws the row's
//   nodes left to right in that order;
// - it keeps its group, and the picture draws it inside that group's box and the
//   boxes around it (DESIGN.md, "Every layered diagram type"), and in no other;
// - it keeps its lane and its alignment (DESIGN.md, "Swimlanes run one way", "Layout computed again on every change").
// Movement is measured, not limited: how many nodes and routes moved, relative to
// the centre line.

import type { Diagram } from "../../src/model/types.ts";
import type { Scene } from "../../src/scene.ts";
import { rectsOverlap } from "./checks.ts";

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
  /** Nodes that are not named and moved, relative to the centre line. */
  moved: string[];
  /** Edges whose route changed, of those in both scenes. */
  changedRoutes: string[];
}

const r2 = (x: number) => Math.round(x * 100) / 100;

interface Facts {
  layer: string;
  order: string[];
  group: string;
  lane: string;
  align: string;
}

/** Each node's layer, the layer's order, its group, its lane and its alignment. */
function facts(d: Diagram): Map<string, Facts> {
  const out = new Map<string, Facts>();
  for (const l of d.layers) {
    const order = l.nodes.map((n) => n.id);
    for (const n of l.nodes) {
      out.set(n.id, {
        layer: l.id,
        order,
        group: n.group ?? "",
        lane: n.lane ?? l.lane ?? "",
        align: n.align ?? "",
      });
    }
  }
  return out;
}

/** The order of the given ids in a list, keeping only those ids. */
const within = (list: string[], keep: Set<string>) => list.filter((id) => keep.has(id));

/** Violations of the structure in one scene: rows, order across, and group boxes. */
function drawn(s: Scene, d: Diagram): string[] {
  const out: string[] = [];
  const rect = new Map(s.nodes.map((n) => [n.id, n]));
  for (const l of d.layers) {
    const xs = l.nodes.map((n) => rect.get(n.id));
    xs.forEach((n, i) => {
      if (n === undefined) return;
      if (n.layer !== l.id) out.push(`node ${n.id} drawn in row ${n.layer}, not ${l.id}`);
      const prev = xs[i - 1];
      if (prev !== undefined && prev.rect.x + prev.rect.w > n.rect.x) {
        out.push(`node ${n.id} drawn left of ${prev.id}, against the order of ${l.id}`);
      }
    });
  }
  for (const g of s.groups ?? []) {
    for (const n of s.nodes) {
      const member = g.members.includes(n.id);
      const inside = rectsOverlap(n.rect, g.rect);
      if (member !== inside)
        out.push(`node ${n.id} ${member ? "outside" : "inside"} group ${g.id}`);
    }
  }
  return out;
}

export function d10(before: Framed, after: Framed, db: Diagram, da: Diagram, named: Named): Report {
  const violations: string[] = [];
  const fb = facts(db);
  const fa = facts(da);
  const kept = new Set([...fb.keys()].filter((id) => fa.has(id) && !named.nodes.includes(id)));
  for (const id of kept) {
    const b = fb.get(id);
    const a = fa.get(id);
    if (a === undefined || b === undefined) continue;
    if (a.layer !== b.layer) violations.push(`node ${id} changed layer`);
    if (a.group !== b.group) violations.push(`node ${id} changed group`);
    if (a.lane !== b.lane) violations.push(`node ${id} changed lane`);
    if (a.align !== b.align) violations.push(`node ${id} changed alignment`);
    const ob = within(b.order, kept).join(",");
    const oa = within(a.order, kept).join(",");
    if (a.layer === b.layer && ob !== oa) violations.push(`layer ${a.layer} changed order`);
  }
  violations.push(...drawn(before.scene, db).map((v) => `before: ${v}`));
  violations.push(...drawn(after.scene, da).map((v) => `after: ${v}`));

  const at = (f: Framed) =>
    new Map(f.scene.nodes.map((n) => [n.id, `${r2(n.rect.x - f.centre)},${n.rect.y}`]));
  const pb = at(before);
  const pa = at(after);
  const moved = [...kept].filter((id) => pb.get(id) !== pa.get(id));
  const route = (f: Framed) =>
    new Map(
      f.scene.edges.map((e) => [
        e.id,
        JSON.stringify(e.points.map((p) => [r2(p.x - f.centre), p.y])),
      ]),
    );
  const rb = route(before);
  const ra = route(after);
  const changedRoutes = [...rb.keys()].filter((id) => ra.has(id) && ra.get(id) !== rb.get(id));
  return { violations: [...new Set(violations)], moved, changedRoutes };
}
