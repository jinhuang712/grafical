// Alignment (DESIGN.md D6, D10): how `node.align` combines with even spreading.
//
// Every layer is first spread evenly and centred from its own contents alone. A
// layer with an aligned node then slides sideways as one block, keeping its even
// spacing, until that node sits directly under or over its target. So a layer
// moves sideways only when its own contents change, or when one of its nodes is
// aligned to a node that moved (D10), and its order always holds.
//
// One block takes one shift. The first alignment of a layer, in row order, decides
// it; a later alignment in the same layer holds only if it needs the same shift.
// Otherwise it cannot hold, and the problem is reported so that the operation
// that caused it fails. A layer follows the layer its deciding target lies in, so
// alignments that make two layers follow each other cannot all hold either.

import type { PLayer, PNode } from "./place.ts";

export type AlignmentCode =
  | "unknown-node"
  | "same-layer"
  | "self-alignment"
  | "alignment-cycle"
  | "alignment-conflict";

export interface AlignmentProblem {
  code: AlignmentCode;
  /** The aligned node. */
  node: string;
  /** Its alignment target. */
  target: string;
  found: string;
  expected: string;
  suggestion: string;
}

const EPS = 1e-6;

export function resolveAlignments(layers: PLayer[], nodes: Map<string, PNode>): AlignmentProblem[] {
  const problems: AlignmentProblem[] = [];
  const all = layers.flatMap((l) => l.nodes);
  const active = new Map<string, PNode>();
  for (const n of all) {
    const t = n.node.align;
    if (t === undefined) continue;
    const target = nodes.get(t);
    if (t === n.id) {
      problems.push({
        code: "self-alignment",
        node: n.id,
        target: t,
        found: `${n.id} aligned with itself`,
        expected: "a node in another layer",
        suggestion: `remove the alignment of ${n.id}`,
      });
    } else if (target === undefined) {
      problems.push({
        code: "unknown-node",
        node: n.id,
        target: t,
        found: `no node ${t}`,
        expected: "the id of a node in another layer",
        suggestion: `align ${n.id} with an existing node, or remove the alignment`,
      });
    } else if (target.layer === n.layer) {
      problems.push({
        code: "same-layer",
        node: n.id,
        target: t,
        found: `${t} is in the same layer as ${n.id}`,
        expected: "a node in another layer",
        suggestion: `align ${n.id} with a node above or below it, or remove the alignment`,
      });
    } else {
      active.set(n.id, target);
    }
  }

  // Nodes aligned with each other in a ring: none of them can hold.
  for (const n of all) {
    const path: string[] = [];
    let cur: string | undefined = n.id;
    while (cur !== undefined && active.has(cur) && !path.includes(cur)) {
      path.push(cur);
      cur = active.get(cur)?.id;
    }
    if (cur === undefined || !path.includes(cur)) continue;
    const cycle = path.slice(path.indexOf(cur));
    for (const id of cycle) {
      const target = active.get(id);
      if (target === undefined) continue;
      problems.push({
        code: "alignment-cycle",
        node: id,
        target: target.id,
        found: `alignments form a cycle: ${[...cycle, cycle[0]].join(" -> ")}`,
        expected: "alignments that end at a node without one",
        suggestion: `remove the alignment of ${id}`,
      });
      active.delete(id);
    }
  }

  // Layer shifts, top layer first. A layer follows the target of its first
  // alignment whose target layer is not already waiting on it.
  const shift = new Map<number, number>();
  const busy = new Set<number>();
  const decider = new Map<number, PNode>();
  const skipped = new Set<string>();
  const centre = (n: PNode, s: number) => n.natural + s + n.w / 2;
  const resolve = (li: number): number | undefined => {
    const known = shift.get(li);
    if (known !== undefined) return known;
    if (busy.has(li)) return undefined;
    busy.add(li);
    let s = 0;
    for (const n of layers[li]?.nodes ?? []) {
      const target = active.get(n.id);
      if (target === undefined) continue;
      const ts = resolve(target.layer);
      if (ts === undefined) {
        skipped.add(n.id);
        continue;
      }
      s = centre(target, ts) - centre(n, 0);
      decider.set(li, n);
      break;
    }
    busy.delete(li);
    shift.set(li, s);
    return s;
  };
  for (const l of layers) resolve(l.index);
  for (const n of all) n.x = n.natural + (shift.get(n.layer) ?? 0);

  // Every alignment that does not hold, with why.
  for (const n of all) {
    const target = active.get(n.id);
    if (target === undefined) continue;
    const off = n.x + n.w / 2 - (target.x + target.w / 2);
    if (Math.abs(off) <= EPS) continue;
    const layerId = layers[n.layer]?.id ?? "";
    const other = decider.get(n.layer);
    const otherTarget = other === undefined ? undefined : active.get(other.id);
    const where = `${round(Math.abs(off))} px ${off < 0 ? "left" : "right"} of ${target.id}`;
    if (other !== undefined && otherTarget !== undefined && !skipped.has(n.id)) {
      problems.push({
        code: "alignment-conflict",
        node: n.id,
        target: target.id,
        found: `layer ${layerId} already slides to put ${other.id} ${verb(other, otherTarget)} ${otherTarget.id}, which leaves ${n.id} ${where}`,
        expected: `alignments in layer ${layerId} that need the same slide; the first in the layer's order wins`,
        suggestion: `remove the alignment of ${n.id}, or of ${other.id}`,
      });
    } else {
      const targetLayer = layers[target.layer]?.id ?? "";
      problems.push({
        code: "alignment-cycle",
        node: n.id,
        target: target.id,
        found: `layer ${targetLayer} already follows layer ${layerId} through another alignment, which leaves ${n.id} ${where}`,
        expected: "alignments that do not make two layers follow each other",
        suggestion: `remove the alignment of ${n.id}`,
      });
    }
  }
  return problems;
}

function verb(n: PNode, target: PNode): string {
  return target.layer < n.layer ? "below" : "above";
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
