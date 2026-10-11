// Warnings (DESIGN.md D26, D29): facts that may help the agent, never errors.
// The engine arranges; the agent decides what the diagram says (PHILOSOPHY.md),
// so a warning names what it sees and what the agent could do, and blocks nothing.

import { budgetWarnings, type Warning } from "../model/budget.ts";
import { endRows } from "../model/ends.ts";
import type { Diagram } from "../model/types.ts";
import type { Scene } from "../scene.ts";
import { TASTE_LIMITS } from "./taste.ts";

/** A layer with more nodes than this is crowded. */
export const CROWDED_LAYER = 5;

/** A main path of up to this many edges never draws a warning, however few edges the diagram has. */
export const MAIN_PATH_FREE = 3;

/** Every warning for a diagram and its laid-out scene. */
export function advise(d: Diagram, scene: Scene): Warning[] {
  const out = [...budgetWarnings(d)];

  if (scene.width > TASTE_LIMITS.canvasWidth) {
    const widest = [...d.layers].sort((a, b) => b.nodes.length - a.nodes.length)[0];
    out.push({
      code: "too-wide",
      found: `the picture is ${scene.width} px wide`,
      expected: `at most ${TASTE_LIMITS.canvasWidth} px, so its text stays readable in a document`,
      suggestion:
        widest === undefined
          ? "use fewer nodes side by side"
          : `layer ${widest.id} holds ${widest.nodes.length} nodes: grafical layer split <file> ${widest.id} <new-id> --label <text>, or merge nodes a reader does not need apart`,
    });
  }

  for (const l of d.layers) {
    if (l.nodes.length <= CROWDED_LAYER) continue;
    out.push({
      code: "crowded-layer",
      found: `layer ${l.id} holds ${l.nodes.length} nodes`,
      expected: `at most ${CROWDED_LAYER} nodes side by side`,
      suggestion: `grafical layer split <file> ${l.id} <new-id> --label <text>, or merge nodes a reader does not need apart`,
    });
  }

  for (const g of d.groups ?? []) {
    const members = d.layers.flatMap((l) => l.nodes.filter((n) => n.group === g.id));
    if (members.length !== 1) continue;
    const only = members[0]?.id ?? "";
    out.push({
      code: "lonely-group",
      found: `group ${g.id} holds one node, ${only}`,
      expected: "a group of two or more nodes",
      suggestion: `grafical group remove <file> ${g.id} (${only} stays), or group join a second node`,
    });
  }

  // A main path stands out only against thin lines (D33).
  const main = d.edges.filter((e) => e.accent === true);
  if (main.length > MAIN_PATH_FREE && main.length * 3 > d.edges.length) {
    out.push({
      code: "too-many-main-edges",
      found: `${main.length} of ${d.edges.length} edges are on the main path`,
      expected: "at most a third of the edges, so that the main path stands out",
      suggestion:
        "grafical edge emphasize <file> <id...> --off on the edges a reader can follow without help",
    });
  }

  // Edges whose line threads between the nodes of a layer they do not connect: a
  // reader follows it across unrelated boxes. A line that passes beside the
  // layer's nodes, in open space, is fine.
  const spans = new Map<string, { y0: number; y1: number; x0: number; x1: number }>();
  for (const n of scene.nodes) {
    const s = spans.get(n.layer);
    const r = n.rect;
    if (s === undefined) spans.set(n.layer, { y0: r.y, y1: r.y + r.h, x0: r.x, x1: r.x + r.w });
    else {
      s.y0 = Math.min(s.y0, r.y);
      s.y1 = Math.max(s.y1, r.y + r.h);
      s.x0 = Math.min(s.x0, r.x);
      s.x1 = Math.max(s.x1, r.x + r.w);
    }
  }
  const passes: string[] = [];
  for (const e of scene.edges) {
    const a = endRows(d, e.from);
    const b = endRows(d, e.to);
    if (a === undefined || b === undefined) continue;
    const lo = Math.min(a[1], b[1]);
    const hi = Math.max(a[0], b[0]);
    const through = d.layers.slice(lo + 1, Math.max(lo + 1, hi)).find((layer) => {
      const s = spans.get(layer.id);
      if (s === undefined) return false;
      for (let k = 1; k < e.points.length; k++) {
        const p = e.points[k - 1];
        const q = e.points[k];
        if (p === undefined || q === undefined || p.x !== q.x) continue;
        const inRow = Math.min(p.y, q.y) < s.y1 && Math.max(p.y, q.y) > s.y0;
        if (inRow && p.x > s.x0 && p.x < s.x1) return true;
      }
      return false;
    });
    if (through !== undefined) passes.push(`${e.id} passes ${through.id}`);
  }
  if (passes.length > 0) {
    out.push({
      code: "edge-crosses-layer",
      found: passes.join("; "),
      expected: "edges between neighbouring layers",
      suggestion:
        "where the story allows, grafical layer move so that connected layers sit next to each other",
    });
  }
  return out;
}
