// Notes (DESIGN.md D44): a short text about a node, a group or a line. The agent
// states only what it is about and its words; the layout draws it as a callout
// beside its target, or as a numbered footnote.

import { everyNode } from "./steps.ts";
import type { Diagram } from "./types.ts";

/** Every id a note may be about: nodes, groups and lines. */
export function noteTargets(d: Diagram): string[] {
  return [
    ...everyNode(d).map((n) => n.id),
    ...(d.groups ?? []).map((g) => g.id),
    ...d.edges.map((e) => e.id),
  ];
}

/** After an operation removed nodes, groups or lines, their notes go too. Returns their ids. */
export function pruneNotes(d: Diagram, gone: ReadonlySet<string>): string[] {
  if (gone.size === 0 || d.notes === undefined) return [];
  const left = d.notes.filter((x) => !gone.has(x.on));
  const removed = d.notes.filter((x) => gone.has(x.on)).map((x) => x.on);
  if (left.length > 0) d.notes = left;
  else delete d.notes;
  return removed;
}
