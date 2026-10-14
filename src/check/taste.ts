// Taste measurements (DESIGN.md, "A target picture with measured rules", "Curation stays with the agent"). These are not defects: a broken
// rule is reported by `grafical check --all` and never blocks a write. Pure.

import { everyNode } from "../model/steps.ts";
import type { Diagram } from "../model/types.ts";
import type { Rect, Scene, SceneEdge } from "../scene.ts";
import { lineStyle } from "../theme/paint.ts";
import { EPS, type Segment, segmentsOf } from "./geometry.ts";

/** One measured rule. `limit` is a maximum, except for `straightShare`, where it is a minimum. */
export interface TasteRule {
  value: number;
  limit: number;
  ok: boolean;
}

export interface TasteReport {
  /** Rule 1: the canvas width in px. */
  canvasWidth: TasteRule;
  /** Rule 3: edge pairs that cross. The limit is 1 per 10 edges, rounded down. */
  crossings: TasteRule;
  /** Rule 2: the share of edges that are a single straight segment. The limit is a minimum. */
  straightShare: TasteRule;
  /** Rule 2: the most bends on any edge. */
  maxBends: TasteRule;
  /** Rule 2: how many edges have more than 2 bends. */
  edgesOverBendLimit: TasteRule;
  /** Rule 7: the share of edges that carry a label. */
  labelledShare: TasteRule;
  /** Rule 6: how many line styles the edges use: solid, dashed, dotted or plain (DESIGN.md, "Looks", "Lines meet any side"). */
  lineStyles: TasteRule;
  /** DESIGN.md, "Curation stays with the agent": the node count, against the budget. */
  nodeCount: TasteRule;
  /** Rule 5: see `countCorridorViolations`. */
  corridorViolations: TasteRule;
  /** Every rule is ok. */
  ok: boolean;
}

export const TASTE_LIMITS = {
  canvasWidth: 1024,
  straightShare: 0.5,
  maxBends: 2,
  edgesOverBendLimit: 0,
  labelledShare: 0.4,
  lineStyles: 3,
  nodeCount: 16,
  corridorViolations: 0,
} as const;

const round = (v: number): number => Math.round(v * 1000) / 1000;

const isH = (s: Segment): boolean => Math.abs(s.a.y - s.b.y) < EPS;
const isV = (s: Segment): boolean => Math.abs(s.a.x - s.b.x) < EPS;

/** Drops points that sit in the middle of a straight run, so that bends count corners only. */
function segmentsMerged(e: SceneEdge): Segment[] {
  const out: Segment[] = [];
  for (const s of segmentsOf(e.points)) {
    const last = out[out.length - 1];
    if (last && ((isH(last) && isH(s)) || (isV(last) && isV(s)))) last.b = s.b;
    else out.push({ a: s.a, b: s.b });
  }
  return out;
}

const between = (v: number, a: number, b: number): boolean =>
  v > Math.min(a, b) + EPS && v < Math.max(a, b) - EPS;

/** True when a horizontal and a vertical segment cross in the interior of both. */
function cross(h: Segment, v: Segment): boolean {
  return between(v.a.x, h.a.x, h.b.x) && between(h.a.y, v.a.y, v.b.y);
}

function edgesCross(a: Segment[], b: Segment[]): boolean {
  for (const s of a) {
    for (const t of b) {
      if (isH(s) && isV(t) && cross(s, t)) return true;
      if (isV(s) && isH(t) && cross(t, s)) return true;
    }
  }
  return false;
}

/** Edge pairs with at least one proper crossing. T-junctions and shared trunks are not crossings. */
export function countCrossings(edges: SceneEdge[]): number {
  const segs = edges.map(segmentsMerged);
  let n = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (edgesCross(segs[i] as Segment[], segs[j] as Segment[])) n++;
    }
  }
  return n;
}

/**
 * Corridor violations (rule 5). A row is a set of nodes whose y ranges overlap.
 * A vertical segment of an edge "passes" a row when its y range enters the row's
 * band by more than 2 px, and the row holds neither end of the edge. It violates
 * the rule when its x lies inside the x span of some node of that row: the
 * column it runs in is not empty there. This approximates "a column that is
 * empty in every row it passes". Groups are ignored, so a segment through a
 * non-member column and one through a member column count alike. One violation
 * is counted per edge and row.
 */
export function countCorridorViolations(scene: Scene): number {
  const nodes = [...scene.nodes].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const rows: { top: number; bottom: number; ids: string[]; rects: Rect[] }[] = [];
  for (const n of nodes) {
    const row = rows.find((r) => n.rect.y < r.bottom - EPS && n.rect.y + n.rect.h > r.top + EPS);
    if (row) {
      row.top = Math.min(row.top, n.rect.y);
      row.bottom = Math.max(row.bottom, n.rect.y + n.rect.h);
      row.ids.push(n.id);
      row.rects.push(n.rect);
    } else {
      rows.push({ top: n.rect.y, bottom: n.rect.y + n.rect.h, ids: [n.id], rects: [n.rect] });
    }
  }
  const slack = 2;
  let count = 0;
  for (const e of scene.edges) {
    const vertical = segmentsMerged(e).filter(isV);
    for (const row of rows) {
      if (row.ids.includes(e.from) || row.ids.includes(e.to)) continue;
      const hit = vertical.some((s) => {
        const lo = Math.min(s.a.y, s.b.y);
        const hi = Math.max(s.a.y, s.b.y);
        if (hi <= row.top + slack || lo >= row.bottom - slack) return false;
        return row.rects.some((r) => s.a.x > r.x - EPS && s.a.x < r.x + r.w + EPS);
      });
      if (hit) count++;
    }
  }
  return count;
}

function rule(value: number, limit: number, ok: boolean): TasteRule {
  return { value: round(value), limit, ok };
}

/** Measures the eight rules of DESIGN.md, "A target picture with measured rules" and the node budget of DESIGN.md, "Curation stays with the agent". */
export function measureTaste(diagram: Diagram, scene: Scene): TasteReport {
  const edges = scene.edges;
  const total = edges.length;
  const merged = edges.map(segmentsMerged);
  const bends = merged.map((s) => Math.max(0, s.length - 1));
  const straight = merged.filter((s) => s.length === 1).length;
  const labelled = edges.filter((e) => e.label).length;
  const styles = new Set(edges.map((e) => lineStyle(e.kind)));
  const nodeCount = everyNode(diagram).length;
  const crossings = countCrossings(edges);
  const crossLimit = Math.floor(total / 10 + 1e-9);
  const maxBends = bends.reduce((m, b) => Math.max(m, b), 0);
  const over = bends.filter((b) => b > TASTE_LIMITS.maxBends).length;
  const straightShare = total === 0 ? 1 : straight / total;
  const labelledShare = total === 0 ? 0 : labelled / total;
  const corridors = countCorridorViolations(scene);
  const L = TASTE_LIMITS;

  const report = {
    canvasWidth: rule(scene.width, L.canvasWidth, scene.width <= L.canvasWidth),
    crossings: rule(crossings, crossLimit, crossings <= crossLimit),
    straightShare: rule(straightShare, L.straightShare, straightShare >= L.straightShare),
    maxBends: rule(maxBends, L.maxBends, maxBends <= L.maxBends),
    edgesOverBendLimit: rule(over, L.edgesOverBendLimit, over <= L.edgesOverBendLimit),
    labelledShare: rule(labelledShare, L.labelledShare, labelledShare <= L.labelledShare),
    lineStyles: rule(styles.size, L.lineStyles, styles.size <= L.lineStyles),
    nodeCount: rule(nodeCount, L.nodeCount, nodeCount <= L.nodeCount),
    corridorViolations: rule(corridors, L.corridorViolations, corridors <= L.corridorViolations),
  };
  return { ...report, ok: Object.values(report).every((r) => r.ok) };
}
