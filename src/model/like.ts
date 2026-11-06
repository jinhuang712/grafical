// An object may follow another object's look (specs/decisions, "`like` follows an object's look and nothing else").

import type { OpError } from "../errors.ts";
import { everyNode } from "./steps.ts";
import type { Diagram } from "./types.ts";

export interface Follower {
  id: string;
  like?: string;
}

const SORTS = [
  { code: "unknown-node", all: (d: Diagram): readonly Follower[] => everyNode(d) },
  { code: "unknown-edge", all: (d: Diagram): readonly Follower[] => d.edges },
  { code: "unknown-group", all: (d: Diagram): readonly Follower[] => d.groups ?? [] },
  { code: "unknown-lane", all: (d: Diagram): readonly Follower[] => d.lanes ?? [] },
] as const;

/** The circle that `id` following `like` would close, or undefined when it closes none. */
export function likeCircle(
  all: readonly Follower[],
  id: string,
  like: string,
): string[] | undefined {
  const chain = [id];
  for (let at: string | undefined = like; at !== undefined; ) {
    chain.push(at);
    if (at === id) return chain;
    const here: string = at;
    if (chain.indexOf(here) < chain.length - 1) return undefined;
    at = all.find((x) => x.id === here)?.like;
  }
  return undefined;
}

/** What a file's `like` attributes break: a name nothing holds, or a circle. */
export function likeProblems(d: Diagram, index: number): OpError[] {
  const errors: OpError[] = [];
  for (const { code, all } of SORTS) {
    const list = all(d);
    for (const o of list) {
      if (o.like === undefined) continue;
      if (!list.some((x) => x.id === o.like)) {
        errors.push({ code, index, field: "like", found: o.like, facts: {} });
        continue;
      }
      const chain = likeCircle(list, o.id, o.like);
      if (chain !== undefined) {
        errors.push({ code: "like-cycle", index, field: "like", found: o.id, facts: { chain } });
      }
    }
  }
  return errors;
}

/** After operations removed an object, its followers let go of it. Returns who let go. */
export function pruneLikes(d: Diagram): string[] {
  const gone: string[] = [];
  for (const { all } of SORTS) {
    const list = all(d);
    for (const o of list) {
      if (o.like === undefined || list.some((x) => x.id === o.like)) continue;
      delete o.like;
      gone.push(o.id);
    }
  }
  return gone;
}

/** Each edge with the weight it follows, where it states none of its own. */
export function withFollowedWeights(d: Diagram): Diagram {
  if (!d.edges.some((e) => e.like !== undefined && e.weight === undefined)) return d;
  const byId = new Map(d.edges.map((e) => [e.id, e]));
  const weightOf = (start: (typeof d.edges)[number]) => {
    const seen = new Set<string>();
    let at: (typeof d.edges)[number] | undefined = start;
    while (at !== undefined && !seen.has(at.id)) {
      if (at.weight !== undefined) return at.weight;
      seen.add(at.id);
      at = at.like === undefined ? undefined : byId.get(at.like);
    }
    return undefined;
  };
  return {
    ...d,
    edges: d.edges.map((e) => {
      const weight = weightOf(e);
      return weight === undefined ? e : { ...e, weight };
    }),
  };
}
