// Alignment (DESIGN.md D6, D10): how `node.align` combines with even spreading.
//
// Every layer is first spread evenly and centred from its own contents alone. An
// aligned node then slides sideways, alone, until its centre sits on its target's
// centre. Its neighbours keep their slots. So a change in one layer moves another
// layer's nodes only where they are aligned to a node that moved (D10).
//
// The alignment holds while the aligned node keeps at least `minGap` to both of its
// neighbours, in the order of its layer. Otherwise it cannot hold with that order,
// the layout leaves the node in its own slot, and the problem is reported so that
// the operation that caused it fails.

import type { PLayer, PNode } from "./place.ts";

export type AlignmentCode =
  | "unknown-node"
  | "same-layer"
  | "self-alignment"
  | "alignment-cycle"
  | "alignment-blocked";

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

export function resolveAlignments(
  layers: PLayer[],
  nodes: Map<string, PNode>,
  minGap: number,
): AlignmentProblem[] {
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

  // Chains are followed; a cycle cannot be resolved, so every node on it is reported.
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

  for (;;) {
    const memo = new Map<string, number>();
    const xOf = (n: PNode): number => {
      const known = memo.get(n.id);
      if (known !== undefined) return known;
      const target = active.get(n.id);
      const x = target === undefined ? n.natural : xOf(target) + target.w / 2 - n.w / 2;
      memo.set(n.id, x);
      return x;
    };
    for (const n of all) n.x = xOf(n);

    const blocked: { n: PNode; other: PNode; gap: number }[] = [];
    for (const layer of layers) {
      for (let k = 1; k < layer.nodes.length; k++) {
        const p = layer.nodes[k - 1];
        const q = layer.nodes[k];
        if (p === undefined || q === undefined) continue;
        const gap = q.x - (p.x + p.w);
        if (gap >= minGap) continue;
        if (active.has(p.id)) blocked.push({ n: p, other: q, gap });
        if (active.has(q.id)) blocked.push({ n: q, other: p, gap });
      }
    }
    if (blocked.length === 0) break;
    for (const b of blocked) {
      const target = active.get(b.n.id);
      if (target === undefined) continue;
      const shift = b.n.x - b.n.natural;
      const layerId = layers[b.n.layer]?.id ?? "";
      problems.push({
        code: "alignment-blocked",
        node: b.n.id,
        target: target.id,
        found:
          b.gap < 0
            ? `${b.n.id} would have to pass ${b.other.id} to sit ${verb(b.n, target)} ${target.id}`
            : `${b.n.id} would sit ${round(b.gap)} px from ${b.other.id}, ${round(Math.abs(shift))} px ${shift < 0 ? "left" : "right"} of its slot`,
        expected: `at least ${minGap} px between ${b.n.id} and its neighbours, in the order of layer ${layerId}`,
        suggestion: `remove the alignment of ${b.n.id}, or move ${b.n.id} to the slot of layer ${layerId} that lies ${verb(b.n, target)} ${target.id}`,
      });
      active.delete(b.n.id);
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
