// The column grid (DESIGN.md, "Rows unseen, groups as systems", "Layout computed again on every change"): every node gets a column of one grid shared
// by all rows. Within a row, columns follow node order. The facts decide the
// columns, deterministically, in four steps:
// 1. Order: each row's nodes come left to right, each lane that runs as a column
//    takes a block of columns of its own (DESIGN.md, "Swimlanes run one way"), and each group's members fill a
//    block of columns that no other node of the group's rows enters. These are
//    "left of" constraints between nodes.
// 2. Columns: nodes that share a column form a class. Alignment facts join
//    classes first, then boxes placed by steps (DESIGN.md, "Steps from another box"): such a box joins the class of
//    the box it steps from at an offset, its steps across, so that a class may span
//    columns. Then edges between rows join their two ends, best edge first,
//    so that the edge becomes one straight vertical line. An edge that skips rows
//    also reserves its column in the rows it passes, so that it runs through empty
//    space (DESIGN.md, "A target picture with measured rules" rule 5). A join must keep every constraint satisfiable, must not
//    put two nodes of one row in one column, and must not widen the grid.
// 3. Packing: each class takes the leftmost column its constraints allow.
// 4. Balance: each class then moves, within its room, toward the columns of the
//    nodes it connects to.
// Pure: no measurement and no pixels. place.ts turns columns into x.

import type { Facts } from "../errors.ts";
import { columnRanks } from "../model/columns.ts";
import { groupChain } from "../model/groups.ts";
import { laneRanks, laneRun } from "../model/lanes.ts";
import { stepOf } from "../model/steps.ts";
import { closest } from "../model/suggest.ts";
import type { Diagram } from "../model/types.ts";
import { wallRun, wallSplit } from "../model/walls.ts";
import type { AlignmentProblem } from "./align.ts";

export type GroupCode = "group-split" | "group-conflict" | "wall-sides" | "column-order";

/** A group whose members cannot be boxed together (DESIGN.md, "Rows unseen, groups as systems"). */
export interface GroupProblem {
  code: GroupCode;
  group: string;
  /** The node that stands in the way, if one does. */
  node?: string;
  found: string;
  facts: Facts;
}

/** A box placed by steps whose cell another fact keeps (DESIGN.md, "Steps from another box"). */
export interface StepProblem {
  code: "step-blocked";
  node: string;
  found: string;
  facts: Facts;
}

export interface Grid {
  /** Column index of every node, from 0. */
  col: Map<string, number>;
  columns: number;
  /** Rows each column passes empty for a straight edge that skips rows. */
  reserved: Map<number, Set<number>>;
  alignProblems: AlignmentProblem[];
  groupProblems: GroupProblem[];
  stepProblems: StepProblem[];
  /** Nodes outside every group that two or more groups use: they sit between those groups. */
  shared: Set<string>;
}

/**
 * A cell of a class: a row, and an offset from the class's column. Offsets stay well
 * inside ±4096, so the key of a cell one column right is the key plus one.
 */
const cellKey = (r: number, o: number): number => r * 8192 + o + 4096;
const cellRow = (key: number): number => Math.floor(key / 8192);
const cellOff = (key: number): number => (key % 8192) - 4096;

interface Cand {
  u: number;
  v: number;
  score: number;
  key: string;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Extra columns a join may add beyond the widest row. */
const SLACK = 0;

export function buildGrid(d: Diagram): Grid {
  // Nodes in row-major order. A repeated id keeps its first place.
  const ids: string[] = [];
  const row: number[] = [];
  const ord: number[] = [];
  const index = new Map<string, number>();
  const rows: number[][] = [];
  d.layers.forEach((l, r) => {
    const list: number[] = [];
    for (const n of l.nodes) {
      if (index.has(n.id)) continue;
      const i = ids.length;
      index.set(n.id, i);
      ids.push(n.id);
      row.push(r);
      ord.push(list.length);
      list.push(i);
    }
    rows.push(list);
  });
  const N = ids.length;
  // Each node's offset from its class's column: 0 but for boxes placed by steps (DESIGN.md, "Steps from another box").
  const off: number[] = new Array<number>(N).fill(0);
  // The groups around each node, innermost first (DESIGN.md, "Every layered diagram type").
  const chainOf: string[][] = Array.from({ length: N }, () => []);
  const alignOf: (string | undefined)[] = [];
  // Boxes placed by steps, in row order: the box, the box it steps from, its steps across.
  const steps: { s: number; a: number; dx: number }[] = [];
  for (const l of d.layers) {
    for (const n of l.nodes) {
      const i = index.get(n.id);
      if (i === undefined || (chainOf[i] ?? []).length > 0 || alignOf[i] !== undefined) continue;
      chainOf[i] = groupChain(d, n.group);
      alignOf[i] = n.align;
      const a = n.from === undefined ? undefined : index.get(n.from);
      if (a !== undefined && a !== i && !steps.some((x) => x.s === i)) {
        steps.push({ s: i, a, dx: stepOf(n).dx });
      }
    }
  }
  /** The outermost group around a node. */
  const outerOf = (i: number): string | undefined => chainOf[i]?.[(chainOf[i]?.length ?? 0) - 1];

  // The nodes each node connects to, in any row.
  const links: number[][] = Array.from({ length: N }, () => []);
  for (const e of d.edges) {
    const u = index.get(e.from);
    const v = index.get(e.to);
    if (u === undefined || v === undefined || u === v) continue;
    links[u]?.push(v);
    links[v]?.push(u);
  }

  // Step 1: "left of" constraints, as node-level edges.
  const succ: number[][] = Array.from({ length: N }, () => []);
  for (const list of rows) {
    for (let k = 1; k < list.length; k++) succ[list[k - 1] as number]?.push(list[k] as number);
  }
  // Column lanes: every node of a lane, in any row, lies left of every node of the
  // next lane. Rows are already in lane order (layout sorts them), so no cycle forms.
  if (laneRun(d) === "columns") {
    const ranks = laneRanks(d);
    const byRank = new Map<number, number[]>();
    for (let i = 0; i < N; i++) {
      const r = ranks.get(ids[i] as string) ?? 0;
      byRank.set(r, [...(byRank.get(r) ?? []), i]);
    }
    const order = [...byRank.keys()].sort((a, b) => a - b);
    for (let k = 1; k < order.length; k++) {
      for (const a of byRank.get(order[k - 1] as number) ?? []) {
        for (const b of byRank.get(order[k] as number) ?? []) {
          if (!(succ[a] ?? []).includes(b)) succ[a]?.push(b);
        }
      }
    }
  }
  const cls = Array.from({ length: N }, (_, i) => i);
  let stamp = 0;
  const seen = new Int32Array(N);
  /** Does any node of class a reach class b through the constraints? */
  const reaches = (a: number, b: number): boolean => {
    stamp++;
    const stack: number[] = [];
    for (let i = 0; i < N; i++) {
      if (cls[i] === a) {
        stack.push(i);
        seen[i] = stamp;
      }
    }
    while (stack.length > 0) {
      const i = stack.pop() as number;
      for (const j of succ[i] ?? []) {
        if (cls[j] === b) return true;
        if (seen[j] === stamp) continue;
        // A node reached means its whole class is reached.
        const c = cls[j] as number;
        for (let k = 0; k < N; k++) {
          if (cls[k] === c && seen[k] !== stamp) {
            seen[k] = stamp;
            stack.push(k);
          }
        }
      }
    }
    return false;
  };

  const groupProblems = groupConstraints(d, rows, ids, row, chainOf, succ, reaches, cls, links);
  // Columns (DESIGN.md, "Columns beside rows"): every node of a column lies left of every node of a later column, in
  // every row. Rows are already in column order, so only another fact can contradict it:
  // the first pair that cannot hold is refused.
  const ranks = columnRanks(d);
  if (ranks.size > 0) {
    const rankOf = new Map(
      d.layers.flatMap((l) =>
        l.nodes.flatMap((n) => {
          const r = n.column === undefined ? undefined : ranks.get(n.column);
          return r === undefined ? [] : [[n.id, r] as const];
        }),
      ),
    );
    let clash: [string, string] | undefined;
    for (const [a, ra] of rankOf) {
      for (const [b, rb] of rankOf) {
        const i = index.get(a);
        const j = index.get(b);
        if (rb <= ra || i === undefined || j === undefined || (succ[i] ?? []).includes(j)) continue;
        if (reaches(cls[j] as number, cls[i] as number)) {
          clash ??= [a, b];
          continue;
        }
        succ[i]?.push(j);
      }
    }
    if (clash !== undefined) {
      const column = d.layers.flatMap((l) => l.nodes).find((n) => n.id === clash[0])?.column ?? "";
      groupProblems.push({
        code: "column-order",
        group: column,
        found: clash[0],
        facts: { nodes: clash },
      });
    }
  }
  // Walls up and down (DESIGN.md, "Walls as space"): every node left of a wall, in the rows it spans, lies left
  // of every node right of it, so that the wall's space can run between their columns.
  for (const w of d.walls ?? []) {
    const way = wallRun(d, w);
    const split = way?.run === "beside" ? wallSplit(d, way) : undefined;
    if (split === undefined || "row" in split) continue;
    let clash: string[] | undefined;
    for (const a of split.left) {
      for (const b of split.right) {
        const i = index.get(a);
        const j = index.get(b);
        if (i === undefined || j === undefined || (succ[i] ?? []).includes(j)) continue;
        if (reaches(cls[j] as number, cls[i] as number)) {
          clash ??= [a, b];
          continue;
        }
        succ[i]?.push(j);
      }
    }
    if (clash !== undefined) {
      groupProblems.push({ code: "wall-sides", group: w.id, found: w.id, facts: { nodes: clash } });
    }
  }

  // Classes: members' cells, and reserved cells (cellKey).
  const cellsOf = (c: number, shift = 0): Set<number> => {
    const s = new Set<number>();
    for (let i = 0; i < N; i++) {
      if (cls[i] === c) s.add(cellKey(row[i] as number, (off[i] as number) + shift));
    }
    return s;
  };
  const reservedOf = new Map<number, Set<number>>();

  /** Joins b's class to a's, b in a's column. Within a class that spans columns, b's offset follows a's. */
  const tryJoin = (a: number, b: number): "joined" | "same" | "clash" => {
    const ca = cls[a] as number;
    const cb = cls[b] as number;
    if (ca === cb) return off[a] === off[b] ? "same" : "clash";
    const shift = (off[a] as number) - (off[b] as number);
    const ra = cellsOf(ca);
    const rb = cellsOf(cb, shift);
    for (const r of ra) if (rb.has(r)) return "clash";
    const res = new Set([
      ...(reservedOf.get(ca) ?? []),
      ...[...(reservedOf.get(cb) ?? [])].map((x) => x + shift),
    ]);
    for (const r of res) if (ra.has(r) || rb.has(r)) return "clash";
    if (reaches(ca, cb) || reaches(cb, ca)) return "clash";
    for (let i = 0; i < N; i++) {
      if (cls[i] !== cb) continue;
      cls[i] = ca;
      off[i] = (off[i] as number) + shift;
    }
    reservedOf.delete(cb);
    if (res.size > 0) reservedOf.set(ca, res);
    return "joined";
  };

  // Step 2a: alignment facts are joins that must hold.
  const alignProblems: AlignmentProblem[] = [];
  for (let i = 0; i < N; i++) {
    const t = alignOf[i];
    if (t === undefined) continue;
    const id = ids[i] as string;
    const j = index.get(t);
    if (t === id) {
      alignProblems.push({
        code: "self-alignment",
        node: id,
        target: t,
        found: t,
        facts: { node: id, fix: [`node align <file> ${id}`] },
      });
    } else if (j === undefined) {
      alignProblems.push({
        code: "unknown-node",
        node: id,
        target: t,
        found: t,
        facts: { node: id, near: closest(t, ids), fix: [`node align <file> ${id}`] },
      });
    } else if (row[j] === row[i]) {
      alignProblems.push({
        code: "same-layer",
        node: id,
        target: t,
        found: t,
        facts: {
          node: id,
          row: d.layers[row[i] as number]?.id ?? "",
          fix: [`node align <file> ${id}`],
        },
      });
    } else if (tryJoin(i, j) === "clash") {
      const layer = d.layers[row[i] as number]?.id ?? "";
      alignProblems.push({
        code: "alignment-conflict",
        node: id,
        target: t,
        found: t,
        facts: { node: id, row: layer, fix: [`node align <file> ${id}`] },
      });
    }
  }

  // Step 2a, boxes placed by steps (DESIGN.md, "Steps from another box"): each joins the class of the box it steps from,
  // its steps across right of it, the box stepped from first. The join must hold.
  const stepProblems: StepProblem[] = [];
  {
    const left = new Set(steps.map((x) => x.s));
    const order: typeof steps = [];
    for (let grew = true; grew; ) {
      grew = false;
      for (const x of steps) {
        if (!left.has(x.s) || left.has(x.a)) continue;
        order.push(x);
        left.delete(x.s);
        grew = true;
      }
    }
    for (const { s, a, dx } of order) {
      const block = stepJoin(a, s, dx);
      if (block === undefined) continue;
      stepProblems.push({
        code: "step-blocked",
        node: ids[s] as string,
        found: ids[s] as string,
        facts: { node: ids[block] as string, row: d.layers[row[s] as number]?.id ?? "" },
      });
    }
  }

  /**
   * Joins box s to the class of box a, k columns right of it, or names the box in the way:
   * one of a's class in the cell, or a neighbour of s in its row when the constraints
   * cannot hold. Classes that the join puts both left and right of a's class have their
   * place fixed by it: they join it, each where the constraints put it first.
   */
  function stepJoin(a: number, s: number, k: number): number | undefined {
    const ca = cls[a] as number;
    const cs = cls[s] as number;
    const list = rows[row[s] as number] ?? [];
    const at = list.indexOf(s);
    const near = k >= 0 ? [list[at - 1], list[at + 1]] : [list[at + 1], list[at - 1]];
    const neighbour = near.find((x) => x !== undefined) ?? a;
    if (ca === cs) return (off[s] as number) - (off[a] as number) === k ? undefined : neighbour;
    const shift = (off[a] as number) + k - (off[s] as number);
    const own = new Map<number, number>();
    for (let i = 0; i < N; i++) {
      if (cls[i] === ca) own.set(cellKey(row[i] as number, off[i] as number), i);
    }
    for (let i = 0; i < N; i++) {
      if (cls[i] !== cs) continue;
      const hit = own.get(cellKey(row[i] as number, (off[i] as number) + shift));
      if (hit !== undefined) return hit;
    }
    const savedCls = [...cls];
    const savedOff = [...off];
    const restore = () => {
      cls.splice(0, N, ...savedCls);
      off.splice(0, N, ...savedOff);
    };
    for (let i = 0; i < N; i++) {
      if (cls[i] !== cs) continue;
      cls[i] = ca;
      off[i] = (off[i] as number) + shift;
    }
    // The classes on a cycle through a's class: reached from it, and reaching it.
    const outs = new Map<number, Set<number>>();
    const ins = new Map<number, Set<number>>();
    for (let i = 0; i < N; i++) {
      for (const j of succ[i] ?? []) {
        const p = cls[i] as number;
        const q = cls[j] as number;
        if (p === q) continue;
        outs.set(p, (outs.get(p) ?? new Set()).add(q));
        ins.set(q, (ins.get(q) ?? new Set()).add(p));
      }
    }
    const reach = (next: Map<number, Set<number>>): Set<number> => {
      const seen = new Set([ca]);
      const stack = [ca];
      while (stack.length > 0) {
        for (const q of next.get(stack.pop() as number) ?? []) {
          if (seen.has(q)) continue;
          seen.add(q);
          stack.push(q);
        }
      }
      return seen;
    };
    const back = reach(ins);
    const ring = [...reach(outs)].filter((c) => back.has(c));
    // The least columns that keep every constraint among them, from 0.
    const p = new Map(ring.map((c) => [c, 0]));
    let settled = false;
    for (let round = 0; round <= ring.length && !settled; round++) {
      settled = true;
      for (let i = 0; i < N; i++) {
        const pi = p.get(cls[i] as number);
        if (pi === undefined) continue;
        for (const j of succ[i] ?? []) {
          const cj = cls[j] as number;
          const pj = p.get(cj);
          if (pj === undefined) continue;
          const want = pi + (off[i] as number) - (off[j] as number) + 1;
          if (want <= pj) continue;
          p.set(cj, want);
          settled = false;
        }
      }
    }
    if (!settled) {
      restore();
      return neighbour;
    }
    const base = p.get(ca) as number;
    const taken = new Map<number, number>();
    for (let i = 0; i < N; i++) {
      const pi = p.get(cls[i] as number);
      if (pi === undefined) continue;
      const o = (off[i] as number) + pi - base;
      const key = cellKey(row[i] as number, o);
      const other = taken.get(key);
      if (other !== undefined) {
        restore();
        return other === s ? i : other;
      }
      taken.set(key, i);
    }
    for (let i = 0; i < N; i++) {
      const pi = p.get(cls[i] as number);
      if (pi === undefined) continue;
      off[i] = (off[i] as number) + pi - base;
      cls[i] = ca;
    }
    return undefined;
  }

  /**
   * Keeps the column of node a's class empty in these rows, for a straight line
   * through them. Each node of those rows takes the side its edges pull it to:
   * the median column of the nodes it connects to, or its own column if it has
   * none; the right side on a tie. Fails if a node of the class is in one of the
   * rows, or the sides cannot hold.
   */
  const reserveRows = (a: number, rs: number[], added: [number, number][]): boolean => {
    const c = cls[a] as number;
    const own = cellsOf(c);
    const cells = rs.map((r) => cellKey(r, off[a] as number));
    if (cells.some((x) => own.has(x))) return false;
    const packed = pack(N, cls, row, off, succ, reservedOf).col;
    const colOf = (x: number) => (packed.get(cls[x] as number) ?? 0) + (off[x] as number);
    const at = colOf(a);
    const pull = (x: number) => {
      const cs = (links[x] ?? []).map(colOf).sort((p, q) => p - q);
      if (cs.length === 0) return colOf(x);
      return (
        ((cs[Math.floor((cs.length - 1) / 2)] ?? 0) + (cs[Math.floor(cs.length / 2)] ?? 0)) / 2
      );
    };
    const before = (p: number, q: number): boolean => {
      if ((succ[p] ?? []).includes(q)) return true;
      if (reaches(cls[q] as number, cls[p] as number)) return false;
      succ[p]?.push(q);
      added.push([p, q]);
      return true;
    };
    for (const r of rs) {
      // The row splits once: the nodes before the split go left of the column.
      // Splits are tried from the one that puts fewest nodes on the wrong side.
      const list = rows[r] ?? [];
      const packedSplit = list.filter((x) => colOf(x) < at).length;
      const splits = Array.from({ length: list.length + 1 }, (_, k) => ({
        k,
        wrong: list.filter((x, i) => i < k !== pull(x) < at).length,
      })).sort(
        (p, q) =>
          p.wrong - q.wrong ||
          Math.abs(p.k - packedSplit) - Math.abs(q.k - packedSplit) ||
          p.k - q.k,
      );
      let held = false;
      for (const { k } of splits) {
        const mark = added.length;
        const left = list[k - 1];
        const right = list[k];
        if ((left === undefined || before(left, a)) && (right === undefined || before(a, right))) {
          held = true;
          break;
        }
        for (const [p, q] of added.splice(mark)) {
          const l = succ[p] ?? [];
          l.splice(l.lastIndexOf(q), 1);
        }
      }
      if (!held) return false;
    }
    reservedOf.set(c, new Set([...(reservedOf.get(c) ?? []), ...cells]));
    return true;
  };

  // A node outside every group that two or more groups use is where they meet,
  // like the shared store between a write side and a read side. It is not lined
  // up under either, and balance puts it between them.
  const shared = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (outerOf(i) !== undefined) continue;
    const gs = new Set<string>();
    for (const j of links[i] ?? []) {
      const g = outerOf(j);
      if (g !== undefined) gs.add(g);
    }
    if (gs.size >= 2) shared[i] = 1;
  }
  // It takes a column of its own between the leftmost and the rightmost group it
  // joins: right of every member of the one, left of every member of the other.
  // Sides come from the order so far; constraints that would make a cycle are dropped.
  {
    const packed0 = pack(N, cls, row, off, succ, reservedOf).col;
    const colOf = (i: number) => (packed0.get(cls[i] as number) ?? 0) + (off[i] as number);
    const membersOf = new Map<string, number[]>();
    for (let i = 0; i < N; i++) {
      const g = outerOf(i);
      if (g === undefined) continue;
      const list = membersOf.get(g) ?? [];
      list.push(i);
      membersOf.set(g, list);
    }
    const mean = (g: string) => {
      const ms = membersOf.get(g) ?? [];
      return ms.reduce((t, m) => t + colOf(m), 0) / Math.max(1, ms.length);
    };
    for (let i = 0; i < N; i++) {
      if (shared[i] === 0) continue;
      const gs = [...new Set((links[i] ?? []).map((j) => outerOf(j)))]
        .filter((g): g is string => g !== undefined)
        .sort((a, b) => mean(a) - mean(b) || cmp(a, b));
      const mine: [number, number][] = [];
      const add = (a: number, b: number): boolean => {
        if ((succ[a] ?? []).includes(b)) return true;
        if (reaches(cls[b] as number, cls[a] as number)) return false;
        succ[a]?.push(b);
        mine.push([a, b]);
        return true;
      };
      const ok =
        (membersOf.get(gs[0] as string) ?? []).every((m) => add(m, i)) &&
        (membersOf.get(gs[gs.length - 1] as string) ?? []).every((m) => add(i, m));
      if (ok) continue;
      for (const [a, b] of mine) {
        const list = succ[a] ?? [];
        list.splice(list.lastIndexOf(b), 1);
      }
    }
  }

  // Step 2b: edges, best first.
  const maxRow = Math.max(0, ...rows.map((l) => l.length));
  const limit = Math.max(maxRow, pack(N, cls, row, off, succ, reservedOf).columns) + SLACK;
  const partners = new Map<string, number[]>();
  const edgeKey = (a: number, r: number) => `${a}:${r}`;
  const pairs: { u: number; v: number; key: string }[] = [];
  const sorted = [...d.edges].sort((x, y) => cmp(x.id, y.id));
  for (const e of sorted) {
    const u = index.get(e.from);
    const v = index.get(e.to);
    if (u === undefined || v === undefined || u === v || row[u] === row[v]) continue;
    pairs.push({ u, v, key: e.id });
    for (const [a, b] of [
      [u, v],
      [v, u],
    ] as const) {
      const k = edgeKey(a, row[b] as number);
      const list = partners.get(k);
      if (list === undefined) partners.set(k, [b]);
      else if (!list.includes(b)) list.push(b);
    }
  }
  const joinable = pairs.filter(({ u, v }) => shared[u] === 0 && shared[v] === 0);
  const cands: Cand[] = joinable.map(({ u, v, key }) => {
    const span = Math.abs((row[u] as number) - (row[v] as number));
    let score = span === 1 ? 10 : Math.max(1, 6 - span);
    for (const [a, b] of [
      [u, v],
      [v, u],
    ] as const) {
      const list = [...(partners.get(edgeKey(a, row[b] as number)) ?? [])].sort(
        (x, y) => (ord[x] as number) - (ord[y] as number),
      );
      if (list.length === 1) score += 4;
      if (list[Math.floor((list.length - 1) / 2)] === b) score += 2;
    }
    return { u, v, score, key };
  });
  // A node with a straight line above it (up) or below it (down).
  const up = new Uint8Array(N);
  const down = new Uint8Array(N);
  const live = [...cands];
  while (live.length > 0) {
    let best = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    live.forEach((c, k) => {
      const [hi, lo] = (row[c.u] as number) < (row[c.v] as number) ? [c.u, c.v] : [c.v, c.u];
      const s = c.score + (up[hi] ? 3 : 0) + (down[lo] ? 3 : 0);
      if (s > bestScore) {
        best = k;
        bestScore = s;
      }
    });
    const c = live.splice(best, 1)[0] as Cand;
    const [hi, lo] = (row[c.u] as number) < (row[c.v] as number) ? [c.u, c.v] : [c.v, c.u];
    const reserve: number[] = [];
    for (let r = (row[hi] as number) + 1; r < (row[lo] as number); r++) reserve.push(r);
    const saved = [...cls];
    const savedOff = [...off];
    const savedRes = new Map([...reservedOf].map(([k, v]) => [k, new Set(v)]));
    const added: [number, number][] = [];
    const restore = () => {
      cls.splice(0, N, ...saved);
      off.splice(0, N, ...savedOff);
      reservedOf.clear();
      for (const [k, v] of savedRes) reservedOf.set(k, v);
      for (const [a, b] of added) {
        const list = succ[a] ?? [];
        list.splice(list.lastIndexOf(b), 1);
      }
    };
    const res = tryJoin(hi, lo);
    if (res === "clash" || (res === "same" && reserve.length === 0)) continue;
    if (reserve.length > 0 && !reserveRows(hi, reserve, added)) {
      restore();
      continue;
    }
    if (pack(N, cls, row, off, succ, reservedOf).columns > limit) {
      restore();
      continue;
    }
    down[hi] = 1;
    up[lo] = 1;
  }

  // Steps 3 and 4.
  const packed = pack(N, cls, row, off, succ, reservedOf);
  const colOfClass = packed.col;
  balance(N, cls, row, off, succ, reservedOf, colOfClass, pairs, packed.columns, shared);

  // Columns in use, renumbered from 0. A class that spans columns, for steps, keeps the
  // columns between its boxes, so that a step stays one column.
  const nodeCol = (i: number) => (colOfClass.get(cls[i] as number) ?? 0) + (off[i] as number);
  const inUse = new Set<number>();
  for (let i = 0; i < N; i++) inUse.add(nodeCol(i));
  for (const c of new Set(cls)) {
    const os = cls.flatMap((x, i) => (x === c ? [off[i] as number] : []));
    const at = colOfClass.get(c) ?? 0;
    for (let o = Math.min(...os) + 1; o < Math.max(...os); o++) inUse.add(at + o);
  }
  const used = [...inUse].sort((a, b) => a - b);
  const renum = new Map(used.map((c, i) => [c, i]));
  const col = new Map<string, number>();
  for (let i = 0; i < N; i++) col.set(ids[i] as string, renum.get(nodeCol(i)) ?? 0);
  const reserved = new Map<number, Set<number>>();
  for (const [c, res] of reservedOf) {
    for (const key of res) {
      const k = renum.get((colOfClass.get(c) ?? 0) + cellOff(key));
      if (k === undefined) continue;
      const set = reserved.get(k) ?? new Set<number>();
      set.add(cellRow(key));
      reserved.set(k, set);
    }
  }
  const sharedIds = new Set<string>();
  for (let i = 0; i < N; i++) if (shared[i] === 1) sharedIds.add(ids[i] as string);
  return {
    col,
    columns: used.length,
    reserved,
    alignProblems,
    groupProblems,
    stepProblems,
    shared: sharedIds,
  };
}

/**
 * Group constraints: in each row of a group's rows, its members are one block,
 * the nodes left of the block come before every member, and the nodes right of it
 * after every member. A group's members are its inner groups' nodes too, and the
 * outer groups come first (DESIGN.md, "Every layered diagram type"). Groups that share rows, neither inside the other,
 * keep their side of each other. A group whose constraints cannot hold with the
 * ones before it is reported, and its constraints are left out.
 */
function groupConstraints(
  d: Diagram,
  rows: number[][],
  ids: string[],
  row: number[],
  chainOf: string[][],
  succ: number[][],
  reaches: (a: number, b: number) => boolean,
  cls: number[],
  links: number[][],
): GroupProblem[] {
  const problems: GroupProblem[] = [];
  const depth = (g: string) => groupChain(d, g).length;
  const groups = (d.groups ?? [])
    .map((g) => g.id)
    .map((g, k) => ({ g, k }))
    .sort((a, b) => depth(a.g) - depth(b.g) || a.k - b.k)
    .map((x) => x.g);
  const members = new Map<string, number[]>();
  chainOf.forEach((chain, i) => {
    for (const g of chain) {
      if (!groups.includes(g)) continue;
      const list = members.get(g) ?? [];
      list.push(i);
      members.set(g, list);
    }
  });
  const isIn = (i: number, g: string) => chainOf[i]?.includes(g) === true;
  /** Whether one of the two groups sits inside the other. */
  const nested = (a: string, b: string) =>
    groupChain(d, a).includes(b) || groupChain(d, b).includes(a);
  const added: { group: string; edges: [number, number][] }[] = [];
  const addEdge = (a: number, b: number, mine: [number, number][]): boolean => {
    if ((succ[a] ?? []).includes(b)) return true;
    if (reaches(cls[b] as number, cls[a] as number)) return false;
    succ[a]?.push(b);
    mine.push([a, b]);
    return true;
  };
  const undo = (mine: [number, number][]) => {
    for (const [a, b] of mine) {
      const list = succ[a] ?? [];
      const k = list.lastIndexOf(b);
      if (k >= 0) list.splice(k, 1);
    }
  };
  for (const g of groups) {
    const ms = members.get(g) ?? [];
    if (ms.length === 0) continue;
    const r0 = Math.min(...ms.map((i) => row[i] as number));
    const r1 = Math.max(...ms.map((i) => row[i] as number));
    const mine: [number, number][] = [];
    let failed: GroupProblem | undefined;
    for (let r = r0; r <= r1 && failed === undefined; r++) {
      const list = rows[r] ?? [];
      const at = list.map((i, k) => (isIn(i, g) ? k : -1)).filter((k) => k >= 0);
      if (at.length === 0) {
        // A row inside the group's span with no member (DESIGN.md, "Rows unseen, groups as systems"): the box spans it, so each
        // of its nodes sits wholly left or right of the box, the row keeping its order.
        const split = gapSplit(list, ms, g, rows, chainOf, links, reaches, cls);
        if (split === undefined) {
          failed = conflict(g, ids[list[0] as number] as string);
          break;
        }
        for (const [k, i] of list.entries()) {
          for (const m of ms) {
            if (k < split ? addEdge(i, m, mine) : addEdge(m, i, mine)) continue;
            failed = conflict(g, ids[i] as string);
            break;
          }
          if (failed !== undefined) break;
        }
        continue;
      }
      const first = at[0] as number;
      const last = at[at.length - 1] as number;
      const stranger = list.slice(first, last + 1).find((i) => !isIn(i, g));
      if (stranger !== undefined) {
        const layer = d.layers[r]?.id ?? "";
        const s = ids[stranger] as string;
        // The node either belongs in the group, or goes out to one side of its members.
        const fix = [
          `group join <file> ${g} ${s}`,
          `node move <file> ${s} --before ${ids[list[first] as number]}`,
          `node move <file> ${s} --after ${ids[list[last] as number]}`,
        ];
        failed = {
          code: "group-split",
          group: g,
          node: s,
          found: s,
          facts: { group: g, row: layer, fix },
        };
        break;
      }
      const left = list[first - 1];
      const right = list[last + 1];
      for (const m of ms) {
        if (left !== undefined && !addEdge(left, m, mine)) {
          failed = conflict(g, ids[left] as string);
          break;
        }
        if (right !== undefined && !addEdge(m, right, mine)) {
          failed = conflict(g, ids[right] as string);
          break;
        }
      }
    }
    // Groups that share a row keep the side they have in it.
    for (const other of added) {
      if (failed !== undefined) break;
      if (nested(g, other.group)) continue;
      const os = members.get(other.group) ?? [];
      let side = 0;
      for (const list of rows) {
        const a = list.findIndex((i) => isIn(i, g));
        const b = list.findIndex((i) => isIn(i, other.group));
        if (a >= 0 && b >= 0) {
          side = a < b ? -1 : 1;
          break;
        }
      }
      if (side === 0) continue;
      for (const m of ms) {
        for (const o of os) {
          const ok = side < 0 ? addEdge(m, o, mine) : addEdge(o, m, mine);
          if (!ok && failed === undefined) failed = conflict(g, undefined, other.group);
        }
      }
    }
    if (failed !== undefined) {
      undo(mine);
      problems.push(failed);
      continue;
    }
    added.push({ group: g, edges: mine });
  }
  return problems;
}

/**
 * Where a row with no member of a group, inside the group's span, splits around the
 * box: the first `split` nodes go left of it, the rest right. Each node leans toward the
 * side of the group where the nodes it connects to sit, in rows that hold members; a
 * split no constraint forbids that agrees with most leanings wins, and with none,
 * every node goes right. Undefined when no split can hold.
 */
function gapSplit(
  list: number[],
  members: number[],
  g: string,
  rows: number[][],
  chainOf: string[][],
  links: number[][],
  reaches: (a: number, b: number) => boolean,
  cls: number[],
): number | undefined {
  const sideIn = (j: number): number => {
    for (const r of rows) {
      const k = r.indexOf(j);
      if (k < 0) continue;
      const at = r.map((i, x) => (chainOf[i]?.includes(g) ? x : -1)).filter((x) => x >= 0);
      if (at.length === 0 || chainOf[j]?.includes(g)) return 0;
      return k < (at[0] as number) ? -1 : k > (at[at.length - 1] as number) ? 1 : 0;
    }
    return 0;
  };
  const lean = list.map((i) => (links[i] ?? []).reduce((s, j) => s + sideIn(j), 0));
  let best: number | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let split = 0; split <= list.length; split++) {
    const ok = list.every((i, k) =>
      members.every((m) =>
        k < split
          ? !reaches(cls[m] as number, cls[i] as number)
          : !reaches(cls[i] as number, cls[m] as number),
      ),
    );
    if (!ok) continue;
    const score = lean.reduce((s, v, k) => s + (k < split ? -v : v), 0);
    if (score > bestScore) {
      bestScore = score;
      best = split;
    }
  }
  return best;
}

/** A node or another group that lies left of group g in one row and right of it in another. */
function conflict(g: string, node?: string, other?: string): GroupProblem {
  const p: GroupProblem = {
    code: "group-conflict",
    group: g,
    found: other ?? node ?? "",
    facts: {
      is: other !== undefined ? "group" : "node",
      group: g,
      ...(other === undefined && node !== undefined
        ? { fix: [`group join <file> ${g} ${node}`] }
        : {}),
    },
  };
  if (node !== undefined) p.node = node;
  return p;
}

interface Packed {
  /** Column of each class. */
  col: Map<number, number>;
  columns: number;
}

/**
 * The "left of" constraints between classes, each with the least columns between the
 * two classes' columns: 1, but for a box at an offset in its class (DESIGN.md, "Steps from another box").
 */
function classEdges(
  N: number,
  cls: number[],
  off: number[],
  succ: number[][],
): Map<number, Map<number, number>> {
  const out = new Map<number, Map<number, number>>();
  for (let i = 0; i < N; i++) {
    for (const j of succ[i] ?? []) {
      const a = cls[i] as number;
      const b = cls[j] as number;
      if (a === b) continue;
      const w = (off[i] as number) - (off[j] as number) + 1;
      const m = out.get(a) ?? new Map<number, number>();
      m.set(b, Math.max(m.get(b) ?? w, w));
      out.set(a, m);
    }
  }
  return out;
}

/** Each class's cells, as [row, offset]: its nodes' and its reserved ones. */
function classCells(
  N: number,
  cls: number[],
  row: number[],
  off: number[],
  reservedOf: Map<number, Set<number>>,
): Map<number, [number, number][]> {
  const cells = new Map<number, [number, number][]>();
  for (let i = 0; i < N; i++) {
    const c = cls[i] as number;
    const list = cells.get(c) ?? [];
    list.push([row[i] as number, off[i] as number]);
    cells.set(c, list);
  }
  for (const [c, res] of reservedOf) {
    for (const key of res) cells.get(c)?.push([cellRow(key), cellOff(key)]);
  }
  return cells;
}

/** Each class takes the leftmost column its constraints and its cells allow. */
function pack(
  N: number,
  cls: number[],
  row: number[],
  off: number[],
  succ: number[][],
  reservedOf: Map<number, Set<number>>,
): Packed {
  const classes = [...new Set(cls)].sort((a, b) => a - b);
  const indeg = new Map<number, number>(classes.map((c) => [c, 0]));
  const out = classEdges(N, cls, off, succ);
  for (const m of out.values()) for (const b of m.keys()) indeg.set(b, (indeg.get(b) ?? 0) + 1);
  const cellsOf = classCells(N, cls, row, off, reservedOf);
  const occupied: Set<number>[] = [];
  const lower = new Map<number, number>();
  const col = new Map<number, number>();
  const ready = classes.filter((c) => indeg.get(c) === 0);
  let columns = 0;
  while (ready.length > 0) {
    ready.sort((a, b) => a - b);
    const c = ready.shift() as number;
    const cells = cellsOf.get(c) ?? [];
    const offs = cells.map(([, o]) => o);
    let k = Math.max(lower.get(c) ?? 0, -Math.min(0, ...offs));
    while (cells.some(([r, o]) => occupied[k + o]?.has(r))) k++;
    col.set(c, k);
    for (const [r, o] of cells) {
      const occ = occupied[k + o] ?? new Set<number>();
      occ.add(r);
      occupied[k + o] = occ;
    }
    columns = Math.max(columns, k + Math.max(0, ...offs) + 1);
    for (const [b, w] of out.get(c) ?? []) {
      lower.set(b, Math.max(lower.get(b) ?? 0, k + w));
      const left = (indeg.get(b) ?? 0) - 1;
      indeg.set(b, left);
      if (left === 0) ready.push(b);
    }
  }
  // A cycle cannot happen, since every join kept the constraints acyclic. Should
  // one remain anyway, its classes go to the right, so that layout still runs.
  for (const c of classes) {
    if (col.has(c)) continue;
    col.set(c, columns);
    columns++;
  }
  return { col, columns };
}

/**
 * Moves each class, within the room its constraints leave, to the column that
 * brings its edges closest to straight. Three sweeps, in class order; a tie keeps
 * the class where it is, except that a shared node (see buildGrid) takes the
 * column nearest the middle of the nodes it connects to.
 */
function balance(
  N: number,
  cls: number[],
  row: number[],
  off: number[],
  succ: number[][],
  reservedOf: Map<number, Set<number>>,
  col: Map<number, number>,
  pairs: { u: number; v: number }[],
  columns: number,
  shared: Uint8Array,
): void {
  const sharedClass = new Set<number>();
  for (let i = 0; i < N; i++) if (shared[i] === 1) sharedClass.add(cls[i] as number);
  const classes = [...new Set(cls)].sort((a, b) => a - b);
  const succs = classEdges(N, cls, off, succ);
  const preds = new Map<number, Map<number, number>>();
  for (const [a, m] of succs) {
    for (const [b, w] of m) preds.set(b, (preds.get(b) ?? new Map<number, number>()).set(a, w));
  }
  const cellsOf = classCells(N, cls, row, off, reservedOf);
  // Each class's offsets, least and most, and its cells as keys.
  const span = new Map<number, [number, number]>();
  const keys = new Map<number, Set<number>>();
  for (const c of classes) {
    const cells = cellsOf.get(c) ?? [];
    const offs = cells.map(([, o]) => o);
    span.set(c, [Math.min(...offs), Math.max(...offs)]);
    keys.set(c, new Set(cells.map(([r, o]) => cellKey(r, o))));
  }
  // An edge between two classes, with the columns from one class's column to the other end.
  const links = new Map<number, { o: number; d: number }[]>(classes.map((c) => [c, []]));
  for (const { u, v } of pairs) {
    const a = cls[u] as number;
    const b = cls[v] as number;
    if (a === b) continue;
    const d = (off[v] as number) - (off[u] as number);
    links.get(a)?.push({ o: b, d });
    links.get(b)?.push({ o: a, d: -d });
  }
  const clash = (c: number, k: number): boolean => {
    const [lo, hi] = span.get(c) as [number, number];
    const mine = keys.get(c) as Set<number>;
    for (const o of classes) {
      if (o === c) continue;
      const at = col.get(o) ?? 0;
      const [olo, ohi] = span.get(o) as [number, number];
      if (at + ohi < k + lo || at + olo > k + hi) continue;
      for (const [r, x] of cellsOf.get(o) ?? []) if (mine.has(cellKey(r, x + at - k))) return true;
    }
    return false;
  };
  for (let sweep = 0; sweep < 3; sweep++) {
    let moved = false;
    for (const c of classes) {
      const ls = links.get(c) ?? [];
      if (ls.length === 0) continue;
      const [first, last] = span.get(c) as [number, number];
      let lo = Math.max(0, -first);
      for (const [p, w] of preds.get(c) ?? []) lo = Math.max(lo, (col.get(p) ?? 0) + w);
      let hi = columns - 1 - last;
      for (const [s, w] of succs.get(c) ?? []) hi = Math.min(hi, (col.get(s) ?? 0) - w);
      const at = (l: { o: number; d: number }) => (col.get(l.o) ?? 0) + l.d;
      const cost = (k: number) => ls.reduce((t, l) => t + Math.abs(k - at(l)), 0);
      const here = col.get(c) ?? 0;
      const aim = sharedClass.has(c) ? ls.reduce((t, l) => t + at(l), 0) / ls.length : here;
      let best = here;
      let bestCost = cost(here);
      for (let k = lo; k <= hi; k++) {
        if (k === here || clash(c, k)) continue;
        const v = cost(k);
        if (v < bestCost || (v === bestCost && Math.abs(k - aim) < Math.abs(best - aim) - 1e-9)) {
          best = k;
          bestCost = v;
        }
      }
      if (best !== here) {
        col.set(c, best);
        moved = true;
      }
    }
    if (!moved) break;
  }
}
