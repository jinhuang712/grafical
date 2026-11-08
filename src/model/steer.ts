// What an edge states to steer its edge (specs/decisions, "An edge is steered by facts and never by coordinates").

import type { OpError } from "../errors.ts";
import { everyNode } from "./steps.ts";
import type { Diagram, Edge } from "./types.ts";

/** A node or a group an edge may pass. */
export function passable(d: Diagram, id: string): boolean {
  return everyNode(d).some((n) => n.id === id) || (d.groups ?? []).some((g) => g.id === id);
}

/** Two edges that may share a trunk: they share a start or an end. */
export function shareEnd(a: Edge, b: Edge): boolean {
  return a.from === b.from || a.to === b.to;
}

/** The trunks an edge runs along, itself first, and whether they close a circle. */
function trunkChain(d: Diagram, e: Edge): { chain: string[]; circle: boolean } {
  const chain = [e.id];
  for (let at = e.with; at !== undefined; ) {
    if (chain.includes(at)) return { chain: [...chain, at], circle: true };
    chain.push(at);
    const here: string = at;
    at = d.edges.find((x) => x.id === here)?.with;
  }
  return { chain, circle: false };
}

/** What a diagram's steering breaks: a name nothing holds, a circle, or a trunk that shares no end. */
export function steerProblems(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  for (const e of d.edges) {
    if (e.via !== undefined && !passable(d, e.via.object)) {
      errors.push({ code: "unknown-node", index, field: "via", found: e.via.object, facts: {} });
    }
    if (e.with === undefined) continue;
    const other = d.edges.find((x) => x.id === e.with);
    if (other === undefined) {
      errors.push({ code: "unknown-edge", index, field: "with", found: e.with, facts: {} });
    } else if (!shareEnd(e, other) || trunkChain(d, e).circle) {
      const { chain } = trunkChain(d, e);
      errors.push({ code: "no-trunk", index, field: "with", found: e.id, facts: { chain } });
    }
  }
  return errors;
}

/** After operations removed an object, the edges that named it let go. Returns who let go. */
export function pruneSteer(d: Diagram): string[] {
  const gone: string[] = [];
  const edges = new Set(d.edges.map((e) => e.id));
  for (const e of d.edges) {
    if (e.via !== undefined && !passable(d, e.via.object)) {
      delete e.via;
      gone.push(e.id);
    }
    if (e.with !== undefined && !edges.has(e.with)) {
      delete e.with;
      gone.push(e.id);
    }
  }
  return gone;
}
