// The column grid (DESIGN.md D7, D10): every node gets a column of one grid shared
// by all rows. Within a row, columns follow node order. The facts decide the
// columns, deterministically, in four steps:
// 1. Order: each row's nodes come left to right, and each group's members fill a
//    block of columns that no other node of the group's rows enters. These are
//    "left of" constraints between nodes.
// 2. Columns: nodes that share a column form a class. Alignment facts join
//    classes first. Then edges between rows join their two ends, best edge first,
//    so that the edge becomes one straight vertical line. An edge that skips rows
//    also reserves its column in the rows it passes, so that it runs through empty
//    space (D25 rule 5). A join must keep every constraint satisfiable, must not
//    put two nodes of one row in one column, and must not widen the grid.
// 3. Packing: each class takes the leftmost column its constraints allow.
// 4. Balance: each class then moves, within its room, toward the columns of the
//    nodes it connects to.
// Pure: no measurement and no pixels. place.ts turns columns into x.

import type { Diagram } from "../model/types.ts";
import type { AlignmentProblem } from "./align.ts";

export type GroupCode = "group-split" | "group-conflict";

/** A group whose members cannot be boxed together (D7). */
export interface GroupProblem {
  code: GroupCode;
  group: string;
  /** The node that stands in the way, if one does. */
  node?: string;
  found: string;
  expected: string;
  suggestion: string;
}

export interface Grid {
  /** Column index of every node, from 0. */
  col: Map<string, number>;
  columns: number;
  /** Rows each column passes empty for a straight edge that skips rows. */
  reserved: Map<number, Set<number>>;
  alignProblems: AlignmentProblem[];
  groupProblems: GroupProblem[];
  /** Nodes outside every group that two or more groups use: they sit between those groups. */
  shared: Set<string>;
}

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
  const groupOf: (string | undefined)[] = [];
  const alignOf: (string | undefined)[] = [];
  for (const l of d.layers) {
    for (const n of l.nodes) {
      const i = index.get(n.id);
      if (i === undefined || groupOf[i] !== undefined || alignOf[i] !== undefined) continue;
      groupOf[i] = n.group;
      alignOf[i] = n.align;
    }
  }

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

  const groupProblems = groupConstraints(d, rows, ids, row, groupOf, succ, reaches, cls);

  // Classes: members, real rows and reserved rows.
  const rowsOf = (c: number): Set<number> => {
    const s = new Set<number>();
    for (let i = 0; i < N; i++) if (cls[i] === c) s.add(row[i] as number);
    return s;
  };
  const reservedOf = new Map<number, Set<number>>();

  const tryJoin = (a: number, b: number): "joined" | "same" | "clash" => {
    const ca = cls[a] as number;
    const cb = cls[b] as number;
    if (ca === cb) return "same";
    const ra = rowsOf(ca);
    const rb = rowsOf(cb);
    for (const r of ra) if (rb.has(r)) return "clash";
    const res = new Set([...(reservedOf.get(ca) ?? []), ...(reservedOf.get(cb) ?? [])]);
    for (const r of res) if (ra.has(r) || rb.has(r)) return "clash";
    if (reaches(ca, cb) || reaches(cb, ca)) return "clash";
    for (let i = 0; i < N; i++) if (cls[i] === cb) cls[i] = ca;
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
        found: `${id} aligned with itself`,
        expected: "a node in another layer",
        suggestion: `remove the alignment of ${id}`,
      });
    } else if (j === undefined) {
      alignProblems.push({
        code: "unknown-node",
        node: id,
        target: t,
        found: `no node ${t}`,
        expected: "the id of a node in another layer",
        suggestion: `align ${id} with an existing node, or remove the alignment`,
      });
    } else if (row[j] === row[i]) {
      alignProblems.push({
        code: "same-layer",
        node: id,
        target: t,
        found: `${t} is in the same layer as ${id}`,
        expected: "a node in another layer",
        suggestion: `align ${id} with a node above or below it, or remove the alignment`,
      });
    } else if (tryJoin(i, j) === "clash") {
      const layer = d.layers[row[i] as number]?.id ?? "";
      alignProblems.push({
        code: "alignment-conflict",
        node: id,
        target: t,
        found: `${id} cannot sit in the column of ${t}: the order of layer ${layer}, another alignment or a group puts that column elsewhere`,
        expected:
          "an alignment that fits the order of both layers, the other alignments and the groups",
        suggestion: `remove the alignment of ${id}, or move ${id} in layer ${layer} so that it lies on the same side of its neighbours as ${t}`,
      });
    }
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
    const own = rowsOf(c);
    if (rs.some((r) => own.has(r))) return false;
    const packed = pack(N, cls, row, succ, reservedOf).col;
    const colOf = (x: number) => packed.get(cls[x] as number) ?? 0;
    const at = packed.get(c) ?? 0;
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
    reservedOf.set(c, new Set([...(reservedOf.get(c) ?? []), ...rs]));
    return true;
  };

  // A node outside every group that two or more groups use is where they meet,
  // like the shared store between a write side and a read side. It is not lined
  // up under either, and balance puts it between them.
  const shared = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (groupOf[i] !== undefined) continue;
    const gs = new Set<string>();
    for (const j of links[i] ?? []) {
      const g = groupOf[j];
      if (g !== undefined) gs.add(g);
    }
    if (gs.size >= 2) shared[i] = 1;
  }
  // It takes a column of its own between the leftmost and the rightmost group it
  // joins: right of every member of the one, left of every member of the other.
  // Sides come from the order so far; constraints that would make a cycle are dropped.
  {
    const packed0 = pack(N, cls, row, succ, reservedOf).col;
    const colOf = (i: number) => packed0.get(cls[i] as number) ?? 0;
    const membersOf = new Map<string, number[]>();
    for (let i = 0; i < N; i++) {
      const g = groupOf[i];
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
      const gs = [...new Set((links[i] ?? []).map((j) => groupOf[j]))]
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
  const limit = Math.max(maxRow, pack(N, cls, row, succ, reservedOf).columns) + SLACK;
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
    const savedRes = new Map([...reservedOf].map(([k, v]) => [k, new Set(v)]));
    const added: [number, number][] = [];
    const restore = () => {
      cls.splice(0, N, ...saved);
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
    if (pack(N, cls, row, succ, reservedOf).columns > limit) {
      restore();
      continue;
    }
    down[hi] = 1;
    up[lo] = 1;
  }

  // Steps 3 and 4.
  const packed = pack(N, cls, row, succ, reservedOf);
  const colOfClass = packed.col;
  balance(N, cls, row, succ, reservedOf, colOfClass, pairs, packed.columns, shared);

  // Columns in use, renumbered from 0.
  const used = [...new Set([...colOfClass.values()])].sort((a, b) => a - b);
  const renum = new Map(used.map((c, i) => [c, i]));
  const col = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    col.set(ids[i] as string, renum.get(colOfClass.get(cls[i] as number) ?? 0) ?? 0);
  }
  const reserved = new Map<number, Set<number>>();
  for (const [c, res] of reservedOf) {
    const k = renum.get(colOfClass.get(c) ?? 0);
    if (k === undefined) continue;
    const set = reserved.get(k) ?? new Set<number>();
    for (const r of res) set.add(r);
    reserved.set(k, set);
  }
  const sharedIds = new Set<string>();
  for (let i = 0; i < N; i++) if (shared[i] === 1) sharedIds.add(ids[i] as string);
  return { col, columns: used.length, reserved, alignProblems, groupProblems, shared: sharedIds };
}

/**
 * Group constraints: in each row of a group's rows, its members are one block,
 * the nodes left of the block come before every member, and the nodes right of it
 * after every member. Groups that share rows keep their side of each other. A
 * group whose constraints cannot hold with the ones before it is reported, and
 * its constraints are left out.
 */
function groupConstraints(
  d: Diagram,
  rows: number[][],
  ids: string[],
  row: number[],
  groupOf: (string | undefined)[],
  succ: number[][],
  reaches: (a: number, b: number) => boolean,
  cls: number[],
): GroupProblem[] {
  const problems: GroupProblem[] = [];
  const groups = (d.groups ?? []).map((g) => g.id);
  const members = new Map<string, number[]>();
  groupOf.forEach((g, i) => {
    if (g === undefined || !groups.includes(g)) return;
    const list = members.get(g) ?? [];
    list.push(i);
    members.set(g, list);
  });
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
      const at = list.map((i, k) => (groupOf[i] === g ? k : -1)).filter((k) => k >= 0);
      if (at.length === 0) continue;
      const first = at[0] as number;
      const last = at[at.length - 1] as number;
      const stranger = list.slice(first, last + 1).find((i) => groupOf[i] !== g);
      if (stranger !== undefined) {
        const layer = d.layers[r]?.id ?? "";
        const s = ids[stranger] as string;
        failed = {
          code: "group-split",
          group: g,
          node: s,
          found: `${s} sits between members of ${g} in layer ${layer}`,
          expected: `the members of ${g} next to each other in every layer`,
          suggestion: `move ${s} before or after the members of ${g} in layer ${layer}, or join it to ${g}`,
        };
        break;
      }
      const left = list[first - 1];
      const right = list[last + 1];
      for (const m of ms) {
        if (left !== undefined && !addEdge(left, m, mine)) {
          failed = conflict(d, g, ids[left] as string);
          break;
        }
        if (right !== undefined && !addEdge(m, right, mine)) {
          failed = conflict(d, g, ids[right] as string);
          break;
        }
      }
    }
    // Groups that share a row keep the side they have in it.
    for (const other of added) {
      if (failed !== undefined) break;
      const os = members.get(other.group) ?? [];
      let side = 0;
      for (const list of rows) {
        const a = list.findIndex((i) => groupOf[i] === g);
        const b = list.findIndex((i) => groupOf[i] === other.group);
        if (a >= 0 && b >= 0) {
          side = a < b ? -1 : 1;
          break;
        }
      }
      if (side === 0) continue;
      for (const m of ms) {
        for (const o of os) {
          const ok = side < 0 ? addEdge(m, o, mine) : addEdge(o, m, mine);
          if (!ok && failed === undefined) failed = conflict(d, g, undefined, other.group);
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

function conflict(d: Diagram, g: string, node?: string, other?: string): GroupProblem {
  const label = d.groups?.find((x) => x.id === g)?.label ?? g;
  const what = other !== undefined ? `group ${other}` : `node ${node}`;
  const p: GroupProblem = {
    code: "group-conflict",
    group: g,
    found: `${g} (${label}) cannot be one box: ${what} lies on its left in one layer and on its right in another`,
    expected: `a side of ${g} that ${what} keeps in every layer`,
    suggestion:
      other !== undefined
        ? `move the members of ${g} or of ${other} so that one group is left of the other in every layer`
        : `move ${node} to the same side of the members of ${g} in every layer, or join it to ${g}`,
  };
  if (node !== undefined) p.node = node;
  return p;
}

interface Packed {
  /** Column of each class. */
  col: Map<number, number>;
  columns: number;
}

/** Each class takes the leftmost column its constraints and its rows allow. */
function pack(
  N: number,
  cls: number[],
  row: number[],
  succ: number[][],
  reservedOf: Map<number, Set<number>>,
): Packed {
  const classes = [...new Set(cls)].sort((a, b) => a - b);
  const indeg = new Map<number, number>(classes.map((c) => [c, 0]));
  const out = new Map<number, Set<number>>(classes.map((c) => [c, new Set<number>()]));
  for (let i = 0; i < N; i++) {
    for (const j of succ[i] ?? []) {
      const a = cls[i] as number;
      const b = cls[j] as number;
      if (a === b) continue;
      const set = out.get(a) as Set<number>;
      if (set.has(b)) continue;
      set.add(b);
      indeg.set(b, (indeg.get(b) ?? 0) + 1);
    }
  }
  const rowsOf = new Map<number, number[]>(classes.map((c) => [c, []]));
  for (let i = 0; i < N; i++) rowsOf.get(cls[i] as number)?.push(row[i] as number);
  for (const [c, res] of reservedOf) rowsOf.get(c)?.push(...res);
  const occupied: Set<number>[] = [];
  const lower = new Map<number, number>();
  const col = new Map<number, number>();
  const ready = classes.filter((c) => indeg.get(c) === 0);
  let columns = 0;
  while (ready.length > 0) {
    ready.sort((a, b) => a - b);
    const c = ready.shift() as number;
    const rs = rowsOf.get(c) ?? [];
    let k = lower.get(c) ?? 0;
    while (rs.some((r) => occupied[k]?.has(r))) k++;
    col.set(c, k);
    const occ = occupied[k] ?? new Set<number>();
    for (const r of rs) occ.add(r);
    occupied[k] = occ;
    columns = Math.max(columns, k + 1);
    for (const b of out.get(c) ?? []) {
      lower.set(b, Math.max(lower.get(b) ?? 0, k + 1));
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
  const preds = new Map<number, Set<number>>(classes.map((c) => [c, new Set<number>()]));
  const succs = new Map<number, Set<number>>(classes.map((c) => [c, new Set<number>()]));
  for (let i = 0; i < N; i++) {
    for (const j of succ[i] ?? []) {
      const a = cls[i] as number;
      const b = cls[j] as number;
      if (a === b) continue;
      succs.get(a)?.add(b);
      preds.get(b)?.add(a);
    }
  }
  const rowsOf = new Map<number, Set<number>>(classes.map((c) => [c, new Set<number>()]));
  for (let i = 0; i < N; i++) rowsOf.get(cls[i] as number)?.add(row[i] as number);
  for (const [c, res] of reservedOf) for (const r of res) rowsOf.get(c)?.add(r);
  const links = new Map<number, number[]>(classes.map((c) => [c, []]));
  for (const { u, v } of pairs) {
    const a = cls[u] as number;
    const b = cls[v] as number;
    if (a === b) continue;
    links.get(a)?.push(b);
    links.get(b)?.push(a);
  }
  const clash = (c: number, k: number): boolean => {
    const rs = rowsOf.get(c) as Set<number>;
    for (const o of classes) {
      if (o === c || col.get(o) !== k) continue;
      for (const r of rowsOf.get(o) ?? []) if (rs.has(r)) return true;
    }
    return false;
  };
  for (let sweep = 0; sweep < 3; sweep++) {
    let moved = false;
    for (const c of classes) {
      const ls = links.get(c) ?? [];
      if (ls.length === 0) continue;
      let lo = 0;
      for (const p of preds.get(c) ?? []) lo = Math.max(lo, (col.get(p) ?? 0) + 1);
      let hi = columns - 1;
      for (const s of succs.get(c) ?? []) hi = Math.min(hi, (col.get(s) ?? 0) - 1);
      const cost = (k: number) => ls.reduce((t, o) => t + Math.abs(k - (col.get(o) ?? 0)), 0);
      const here = col.get(c) ?? 0;
      const aim = sharedClass.has(c)
        ? ls.reduce((t, o) => t + (col.get(o) ?? 0), 0) / ls.length
        : here;
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
