// The node budget (DESIGN.md D26): a warning, never an error.

import type { Diagram } from "./types.ts";

export const NODE_BUDGET = 16;

export interface Warning {
  code:
    | "too-many-nodes"
    | "crowded-layer"
    | "lonely-group"
    | "edge-crosses-layer"
    | "too-wide"
    | "too-many-main-edges";
  found: string;
  expected: string;
  /** Candidate merges, or what to do. */
  suggestion: string;
}

/** Signature of a node's edges: who it receives from and sends to. Empty when it has none. */
function edgeSet(d: Diagram, id: string): string {
  const from = d.edges.filter((e) => e.to === id).map((e) => `${e.from}:${e.kind}`);
  const to = d.edges.filter((e) => e.from === id).map((e) => `${e.to}:${e.kind}`);
  if (from.length === 0 && to.length === 0) return "";
  return `<${[...from].sort().join(",")}>${[...to].sort().join(",")}`;
}

/** Candidate merges, as short phrases: same group and same edges, or several queues in a row. */
export function mergeCandidates(d: Diagram): string[] {
  const out: string[] = [];
  const merged = new Set<string>();
  const byKey = new Map<string, string[]>();
  for (const l of d.layers) {
    for (const n of l.nodes) {
      if (n.group === undefined) continue;
      const sig = edgeSet(d, n.id);
      if (sig === "") continue;
      const key = `${n.group}|${sig}`;
      byKey.set(key, [...(byKey.get(key) ?? []), n.id]);
    }
  }
  for (const ids of byKey.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) merged.add(id);
    out.push(`${ids.join(", ")} (same group, same edges)`);
  }
  for (const l of d.layers) {
    const queues = l.nodes.filter((n) => n.kind === "queue" && !merged.has(n.id));
    if (queues.length >= 2) {
      out.push(`${queues.map((n) => n.id).join(", ")} (queues in layer ${l.id})`);
    }
  }
  return out;
}

export function budgetWarnings(d: Diagram): Warning[] {
  const count = d.layers.reduce((n, l) => n + l.nodes.length, 0);
  if (count <= NODE_BUDGET) return [];
  const merges = mergeCandidates(d);
  const hint = "keep one story: merge nodes a reader does not need apart, or make it two diagrams";
  return [
    {
      code: "too-many-nodes",
      found: `${count} nodes`,
      expected: `at most ${NODE_BUDGET} nodes`,
      suggestion: merges.length > 0 ? `${hint}. Candidate merges: ${merges.join("; ")}` : `${hint}`,
    },
  ];
}
