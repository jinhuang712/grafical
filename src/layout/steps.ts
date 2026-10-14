// Boxes placed by steps (DESIGN.md, "Steps from another box"), put in rows for layout. A box's row is the row
// of the box it steps from, its steps down; past the first or last row it lands in a
// row the engine adds there. In that row it goes where its column falls among the
// column grid the other boxes take before it arrives: a box in its cell stands aside,
// away from the box it steps from. The grid (grid.ts) then holds it in its cell.

import type { Facts } from "../errors.ts";
import { stepOf } from "../model/steps.ts";
import type { Diagram, DiagramNode, Layer } from "../model/types.ts";
import { buildGrid, type StepProblem } from "./grid.ts";

/**
 * Whether a row is one the engine adds for boxes placed past the first or last row. Its
 * id is "-" and a number, which no id in a file can be; output names it "-".
 */
export function addedRow(id: string): boolean {
  return id.startsWith("-");
}

/** A box placed by steps that cannot be placed at all: its anchor is unknown, or it steps from itself. */
export interface StepPlaceProblem {
  code: "unknown-node" | "step-cycle";
  node: string;
  found: string;
  facts: Facts;
}

/**
 * The diagram with every box placed by steps in a row, and no `nodes`; the same diagram
 * when it has none. A box that cannot be placed goes into a row added at the bottom.
 */
export function placeSteps(d: Diagram): { d: Diagram; problems: StepPlaceProblem[] } {
  const free = d.nodes ?? [];
  if (free.length === 0) return { d, problems: [] };
  const { nodes: _nodes, ...rest } = d;
  const base: Diagram = { ...rest, layers: d.layers.map((l) => ({ ...l, nodes: [...l.nodes] })) };
  const grid = buildGrid(base);
  const rowOf = new Map<string, number>();
  const colOf = new Map<string, number>();
  base.layers.forEach((l, r) => {
    for (const n of l.nodes) {
      rowOf.set(n.id, r);
      colOf.set(n.id, grid.col.get(n.id) ?? 0);
    }
  });
  // The box stepped from first.
  const placed: { n: DiagramNode; r: number; c: number; dx: number }[] = [];
  const left = new Set(free.map((n) => n.id));
  for (let grew = true; grew; ) {
    grew = false;
    for (const n of free) {
      const from = n.from;
      if (!left.has(n.id) || from === undefined || !rowOf.has(from) || left.has(from)) continue;
      const { dx, dy } = stepOf(n);
      const r = (rowOf.get(from) as number) + dy;
      const c = (colOf.get(from) as number) + dx;
      rowOf.set(n.id, r);
      colOf.set(n.id, c);
      placed.push({ n, r, c, dx });
      left.delete(n.id);
      grew = true;
    }
  }
  const problems: StepPlaceProblem[] = [];
  const known = new Set([...rowOf.keys(), ...left]);
  const stray = free.filter((n) => left.has(n.id));
  for (const n of stray) {
    const from = n.from ?? "";
    problems.push(
      known.has(from)
        ? { code: "step-cycle", node: n.id, found: from, facts: { node: n.id } }
        : { code: "unknown-node", node: n.id, found: from, facts: { node: n.id } },
    );
  }
  const R = base.layers.length;
  const rs = placed.map((x) => x.r);
  const top = Math.min(0, ...rs);
  const bottom = Math.max(R - 1, ...rs, stray.length > 0 ? R : 0);
  const layers: Layer[] = [];
  for (let r = top; r <= bottom; r++) {
    layers.push(base.layers[r] ?? { id: `-${layers.length}`, label: "", nodes: [] });
  }
  for (const { n, r, c, dx } of placed) {
    const list = (layers[r - top] as Layer).nodes;
    let at = 0;
    list.forEach((x, k) => {
      const xc = colOf.get(x.id) ?? 0;
      if (xc < c || (xc === c && dx < 0)) at = k + 1;
    });
    list.splice(at, 0, n);
  }
  (layers[layers.length - 1] as Layer).nodes.push(...stray);
  return { d: { ...base, layers }, problems };
}

/** Every box placed by steps that cannot be placed, or whose cell another fact keeps (DESIGN.md, "Steps from another box"). */
export function validateSteps(d: Diagram): (StepPlaceProblem | StepProblem)[] {
  if ((d.nodes ?? []).length === 0) return [];
  const placed = placeSteps(d);
  return [...placed.problems, ...buildGrid(placed.d).stepProblems];
}
