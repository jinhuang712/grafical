// Notes (specs/decisions, "Notes as callouts or footnotes"): a short text about a node, a group or an edge.

import { describe, expect, it } from "vitest";
import { showDiagram } from "../../src/cli/show.ts";
import type { OpError } from "../../src/errors.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import {
  applyOps,
  type Diagram,
  type Op,
  readDiagram,
  writeDiagram,
} from "../../src/model/index.ts";
import { catalogSyncGrouped as fx } from "../fixtures/catalog-sync-grouped.ts";

function ok(d: Diagram, ops: Op[]) {
  const r = applyOps(d, ops);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}

const retry: Op = { op: "note.set", ids: ["retry"], text: "retries 5 times, then the DLQ" };

describe('notes (specs/decisions, "Notes as callouts or footnotes")', () => {
  it("are kept in the file, read back, and shown", () => {
    const r = ok(fx, [retry, { op: "note.set", ids: ["service-mongo"], text: "Find only" }]);
    expect(r.changed).toEqual(["retry", "service-mongo"]);
    expect(r.diagram.notes).toEqual([
      { on: "retry", text: "retries 5 times, then the DLQ" },
      { on: "service-mongo", text: "Find only" },
    ]);
    const text = writeDiagram(r.diagram);
    expect(text).toContain("<note> ");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    expect(showDiagram(r.diagram)).toContain('note on=retry "retries 5 times, then the DLQ"');
  });

  it("one to a target: adding again replaces it, in its place", () => {
    const d = ok(fx, [retry, { op: "note.set", ids: ["mongo"], text: "shared" }]).diagram;
    const again = ok(d, [{ op: "note.set", ids: ["retry"], text: "retries forever" }]).diagram;
    expect(again.notes?.map((x) => x.on)).toEqual(["retry", "mongo"]);
    expect(again.notes?.[0]?.text).toBe("retries forever");
  });

  it("refuse a target that does not exist, and removing a note there is none of", () => {
    expect(fail(fx, [{ op: "note.set", ids: ["retyr"], text: "x" }])[0]).toMatchObject({
      code: "unknown-node",
      field: "id",
      facts: { near: expect.arrayContaining(["retry"]) },
    });
    expect(fail(fx, [{ op: "note.remove", ids: ["retry"] }])[0]).toMatchObject({
      code: "unknown-note",
    });
    const d = ok(fx, [retry]).diagram;
    expect(ok(d, [{ op: "note.remove", ids: ["retry"] }]).diagram.notes).toBeUndefined();
  });

  it("go with their target", () => {
    const d = ok(fx, [
      retry,
      { op: "note.set", ids: ["service-mongo"], text: "Find only" },
    ]).diagram;
    expect(ok(d, [{ op: "node.remove", ids: ["retry"] }]).diagram.notes?.map((x) => x.on)).toEqual([
      "service-mongo",
    ]);
    expect(
      ok(d, [{ op: "edge.remove", ids: ["service-mongo"] }]).diagram.notes?.map((x) => x.on),
    ).toEqual(["retry"]);
  });

  it("a file's note must name a target, once", () => {
    const text = writeDiagram(ok(fx, [retry]).diagram);
    expect(readDiagram(text.replace("on: @retry", "on: @nope"))).toMatchObject([
      { code: "unknown-node", field: "notes[0].on" },
    ]);
  });

  it("diff gives back the operations, and a changed note comes back last", () => {
    const d = ok(fx, [retry]).diagram;
    expect(diffDiagrams(fx, d)).toEqual([retry]);
    const changed = ok(d, [{ op: "note.set", ids: ["retry"], text: "retries forever" }]).diagram;
    const ops = diffDiagrams(d, changed);
    expect(ops).toEqual([
      { op: "note.remove", ids: ["retry"] },
      { op: "note.set", ids: ["retry"], text: "retries forever" },
    ]);
    expect(writeDiagram(ok(d, ops).diagram)).toBe(writeDiagram(changed));
  });

  // The agent states a footnote; the engine never makes one (specs/decisions, "A note is what the agent states").
  it("a footnote is stated, kept in the file, shown, and diffed", () => {
    const foot: Op = { ...retry, footnote: "on" };
    const d = ok(fx, [foot]).diagram;
    expect(d.notes).toEqual([
      { on: "retry", text: "retries 5 times, then the DLQ", footnote: true },
    ]);
    const text = writeDiagram(d);
    expect(text).toContain("footnote: true");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    expect(showDiagram(d)).toContain('note on=retry footnote "retries 5 times, then the DLQ"');
    expect(diffDiagrams(fx, d)).toEqual([foot]);
    // A card again: the note goes and comes back without it.
    const card = ok(d, [{ ...retry, footnote: "off" }]).diagram;
    expect(card.notes).toEqual([{ on: "retry", text: "retries 5 times, then the DLQ" }]);
    expect(diffDiagrams(d, card)).toEqual([{ op: "note.remove", ids: ["retry"] }, retry]);
  });
});
