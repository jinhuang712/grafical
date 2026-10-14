// Boxes placed by steps (DESIGN.md D46): a box in no row, placed some cells of the
// column grid from another box, which it moves with. The agent states the steps; the
// engine puts the box in its cell, and the boxes of the row it lands in stand aside.

import type { OpError } from "../errors.ts";
import { closest } from "./suggest.ts";
import type { Diagram, DiagramNode } from "./types.ts";

/** The most cells one step option may move a box. */
export const MAX_STEPS = 10;

/** The step options, in the order the file writes them. */
export const STEP_KEYS = ["down", "up", "left", "right"] as const;

/** Every node: each row's, in order, then the boxes placed by steps. */
export function everyNode(d: Diagram): DiagramNode[] {
  const rows = d.layers.flatMap((l) => l.nodes);
  return d.nodes === undefined || d.nodes.length === 0 ? rows : [...rows, ...d.nodes];
}

/** A box's steps as cells across and down: right less left, down less up. */
export function stepOf(n: DiagramNode): { dx: number; dy: number } {
  return { dx: (n.right ?? 0) - (n.left ?? 0), dy: (n.down ?? 0) - (n.up ?? 0) };
}

/**
 * The boxes a box's steps lead back through, nearest first: the box it steps from,
 * the box that one steps from, and on. Stops at a box in a row, an unknown id, or a
 * box seen before, so a box that steps from itself through others ends its own chain.
 */
export function stepChain(d: Diagram, id: string): string[] {
  const from = new Map((d.nodes ?? []).map((n) => [n.id, n.from]));
  const out: string[] = [];
  for (let at = from.get(id); at !== undefined && !out.includes(at); at = from.get(at)) {
    out.push(at);
  }
  return out;
}

/** The boxes that step from a box. */
export function steppedFrom(d: Diagram, id: string): string[] {
  return (d.nodes ?? []).filter((n) => n.from === id).map((n) => n.id);
}

/**
 * Step rules: each box in no row steps from a node that exists, never from itself
 * through others, by at least one step, and not both ways at once.
 */
export function checkSteps(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  const ids = everyNode(d).map((n) => n.id);
  (d.nodes ?? []).forEach((n, ni) => {
    const field = `nodes[${ni}]`;
    const from = n.from;
    if (from === undefined || !ids.includes(from)) {
      errors.push({
        code: from === undefined ? "missing-field" : "unknown-node",
        index,
        field: `${field}.from`,
        found: from ?? "",
        ...(from === undefined ? {} : { facts: { near: closest(from, ids) } }),
      });
      return;
    }
    const chain = stepChain(d, n.id);
    if (chain.includes(n.id)) {
      errors.push({
        code: "step-cycle",
        index,
        field: `${field}.from`,
        found: from,
        facts: { chain: [n.id, ...chain] },
      });
      return;
    }
    const set = STEP_KEYS.filter((k) => n[k] !== undefined);
    if (set.length === 0) {
      errors.push({
        code: "missing-field",
        index,
        field: STEP_KEYS.join(","),
        found: "",
        facts: { node: n.id },
      });
    }
    for (const pair of [["down", "up"] as const, ["left", "right"] as const]) {
      if (n[pair[0]] === undefined || n[pair[1]] === undefined) continue;
      errors.push({
        code: "conflicting-position",
        index,
        field: pair.join(","),
        found: pair.join(","),
        facts: { node: n.id, max: 1 },
      });
    }
  });
  return errors;
}
