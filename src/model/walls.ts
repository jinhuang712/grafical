// Walls (DESIGN.md D43): empty space between two sides, each a list of nodes and
// groups. Which way a wall runs follows from the rows of its sides: across when one
// side lies wholly above the other, up and down when they share rows and one side
// sits left of the other in each. A line from one side to the other crosses only
// where the wall allows it: by its id, or by a node or group at one of its ends.

import type { OpError } from "../errors.ts";
import { endNodes } from "./ends.ts";
import { groupChain } from "./groups.ts";
import { closest } from "./suggest.ts";
import type { Diagram, Edge, Wall } from "./types.ts";

/** The nodes a side names: each node, and every node of each group, inner groups' included. */
export function sideNodes(d: Diagram, ids: readonly string[]): string[] {
  const out = new Set<string>();
  for (const id of ids) for (const n of endNodes(d, id)) out.add(n);
  return [...out];
}

/** Which way a wall runs, with the nodes of its sides: upper then lower, or left then right. */
export type WallRun =
  | { run: "across"; first: string[]; second: string[] }
  | { run: "beside"; first: string[]; second: string[] };

/** The way a wall runs, or undefined when its sides are neither above nor beside each other. */
export function wallRun(d: Diagram, w: Wall): WallRun | undefined {
  const a = sideNodes(d, w.between);
  const b = sideNodes(d, w.and);
  if (a.length === 0 || b.length === 0) return undefined;
  const row = rowOf(d);
  const rows = (ns: string[]) => ns.map((n) => row.get(n) ?? 0);
  const [ra, rb] = [rows(a), rows(b)];
  if (Math.max(...ra) < Math.min(...rb)) return { run: "across", first: a, second: b };
  if (Math.max(...rb) < Math.min(...ra)) return { run: "across", first: b, second: a };
  let left: boolean | undefined;
  for (const l of d.layers) {
    const at = (ns: string[]) => l.nodes.flatMap((n, k) => (ns.includes(n.id) ? [k] : []));
    const [ia, ib] = [at(a), at(b)];
    if (ia.length === 0 || ib.length === 0) continue;
    const aLeft = Math.max(...ia) < Math.min(...ib);
    const bLeft = Math.max(...ib) < Math.min(...ia);
    if ((!aLeft && !bLeft) || (left !== undefined && left !== aLeft)) return undefined;
    left = aLeft;
  }
  if (left === undefined) return undefined;
  return left ? { run: "beside", first: a, second: b } : { run: "beside", first: b, second: a };
}

function rowOf(d: Diagram): Map<string, number> {
  return new Map(d.layers.flatMap((l, i) => l.nodes.map((n) => [n.id, i] as const)));
}

/** Whether a line runs from one side of a wall to the other. */
export function joinsSides(
  d: Diagram,
  e: Edge,
  a: readonly string[],
  b: readonly string[],
): boolean {
  const from = endNodes(d, e.from);
  const to = endNodes(d, e.to);
  const on = (ns: string[], side: readonly string[]) => ns.some((n) => side.includes(n));
  return (on(from, a) && on(to, b)) || (on(from, b) && on(to, a));
}

/** Whether a wall lets a line through: it names the line, or an end of it, or a group an end lies in. */
export function wallAllows(d: Diagram, w: Wall, e: Edge): boolean {
  const allow = w.allow ?? [];
  if (allow.includes(e.id)) return true;
  const group = new Map(d.layers.flatMap((l) => l.nodes.map((n) => [n.id, n.group] as const)));
  for (const end of [e.from, e.to]) {
    const chain = group.has(end) ? [end, ...groupChain(d, group.get(end))] : groupChain(d, end);
    if (chain.some((id) => allow.includes(id))) return true;
  }
  return false;
}

/** The rule's operations for a line that crosses a wall it may not. */
export function crossingFix(w: Wall, e: Edge): string[] {
  return [`wall allow <file> ${w.id} ${e.id}`, `edge remove <file> ${e.id}`];
}

/**
 * The rules for each wall: its sides name nodes and groups, and what it allows names
 * lines, nodes and groups; no node is on both sides; the sides lie above or beside
 * each other; and no line runs from one side to the other unless the wall allows it.
 */
export function checkWalls(d: Diagram, index: number): OpError[] {
  const walls = d.walls ?? [];
  if (walls.length === 0) return [];
  const errors: OpError[] = [];
  const nodes = d.layers.flatMap((l) => l.nodes.map((n) => n.id));
  const sideIds = [...nodes, ...(d.groups ?? []).map((g) => g.id)];
  const passIds = [...sideIds, ...d.edges.map((e) => e.id)];
  walls.forEach((w, wi) => {
    const unknown: OpError[] = [];
    for (const side of ["between", "and"] as const) {
      for (const id of w[side]) {
        if (sideIds.includes(id)) continue;
        unknown.push({
          code: "unknown-node",
          index,
          field: `walls[${wi}].${side}`,
          found: id,
          facts: { near: closest(id, sideIds) },
        });
      }
    }
    for (const id of w.allow ?? []) {
      if (passIds.includes(id)) continue;
      unknown.push({
        code: "unknown-node",
        index,
        field: `walls[${wi}].allow`,
        found: id,
        facts: { near: closest(id, passIds) },
      });
    }
    if (unknown.length > 0) {
      errors.push(...unknown);
      return;
    }
    const a = sideNodes(d, w.between);
    const b = sideNodes(d, w.and);
    const both = a.filter((n) => b.includes(n));
    const run = both.length > 0 ? undefined : wallRun(d, w);
    // Walls that run up and down are refused until they are laid out (D43).
    if (run === undefined || run.run === "beside") {
      errors.push({
        code: "wall-sides",
        index,
        field: `walls[${wi}]`,
        found: w.id,
        facts: both.length > 0 ? { nodes: both } : sharedRow(d, a, b),
      });
      return;
    }
    d.edges.forEach((e, ei) => {
      if (!joinsSides(d, e, a, b) || wallAllows(d, w, e)) return;
      errors.push({
        code: "wall-crossed",
        index,
        field: `edges[${ei}]`,
        found: e.id,
        facts: { fix: crossingFix(w, e) },
      });
    });
  });
  return errors;
}

/** The first row both sides hold nodes in, with those nodes; or the nodes of a side that is empty. */
function sharedRow(d: Diagram, a: string[], b: string[]): { row?: string; nodes: string[] } {
  if (a.length === 0 || b.length === 0) return { nodes: [] };
  for (const l of d.layers) {
    const here = l.nodes.filter((n) => a.includes(n.id) || b.includes(n.id)).map((n) => n.id);
    if (here.some((n) => a.includes(n)) && here.some((n) => b.includes(n))) {
      return { row: l.id, nodes: here };
    }
  }
  // The sides interleave by rows: name each side's nodes.
  return { nodes: [...a, ...b] };
}

/** Every id a wall may name: nodes, groups and lines. */
export function wallNames(d: Diagram): Set<string> {
  return new Set([
    ...d.layers.flatMap((l) => l.nodes.map((n) => n.id)),
    ...(d.groups ?? []).map((g) => g.id),
    ...d.edges.map((e) => e.id),
  ]);
}

/**
 * After an operation removed nodes, groups or lines, the walls forget them. A wall left
 * with an empty side goes too. Returns the walls changed or removed.
 */
export function pruneWalls(d: Diagram, gone: ReadonlySet<string>): string[] {
  if (gone.size === 0 || d.walls === undefined) return [];
  const touched: string[] = [];
  const kept = [];
  for (const w of d.walls) {
    const keep = (ids: string[]) => ids.filter((id) => !gone.has(id));
    const between = keep(w.between);
    const and = keep(w.and);
    const allow = keep(w.allow ?? []);
    const changed =
      between.length !== w.between.length ||
      and.length !== w.and.length ||
      allow.length !== (w.allow ?? []).length;
    if (changed) touched.push(w.id);
    if (between.length === 0 || and.length === 0) continue;
    const next: Wall = { ...w, between, and };
    if (allow.length > 0) next.allow = allow;
    else delete next.allow;
    kept.push(next);
  }
  if (kept.length > 0) d.walls = kept;
  else delete d.walls;
  return touched;
}
