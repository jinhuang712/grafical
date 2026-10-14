// Walls (DESIGN.md D43): empty space between two named sides, crossed only where it allows.

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
import { createStubMeasurer } from "../../src/text/stub.ts";
import { catalogSyncGrouped as fx } from "../fixtures/catalog-sync-grouped.ts";

const m = createStubMeasurer();

function ok(d: Diagram, ops: Op[]) {
  const r = applyOps(d, ops, m);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r;
}
function fail(d: Diagram, ops: Op[]): OpError[] {
  const r = applyOps(d, ops, m);
  if (!("errors" in r)) throw new Error("expected errors");
  return r.errors;
}

/** Callers above, the two systems below; the only ways in are the relay and the handlers. */
const net: Op = {
  op: "wall.add",
  id: "net",
  between: ["upstream", "callers"],
  and: ["catalog-sync", "catalog-api"],
  allow: ["relay", "handlers"],
  label: "private network",
};

describe("walls (D43)", () => {
  it("are kept in the file, read back, and shown", () => {
    const d = ok(fx, [net]).diagram;
    expect(d.walls).toEqual([
      {
        id: "net",
        between: ["upstream", "callers"],
        and: ["catalog-sync", "catalog-api"],
        allow: ["relay", "handlers"],
        label: "private network",
      },
    ]);
    const text = writeDiagram(d);
    expect(text).toContain("walls:");
    expect(writeDiagram(readDiagram(text) as Diagram)).toBe(text);
    expect(showDiagram(d)).toContain(
      'wall net "private network" (across): between=upstream,callers and=catalog-sync,catalog-api allow=relay,handlers',
    );
  });

  it("refuse a line from one side to the other unless the wall allows it", () => {
    const { allow: _, ...closed } = net as Extract<Op, { op: "wall.add" }>;
    const errors = fail(fx, [closed]);
    expect(errors.map((e) => e.found)).toEqual(["upstream->relay", "callers->handlers"]);
    expect(errors[0]).toMatchObject({
      code: "wall-crossed",
      facts: {
        fix: ["wall allow <file> net upstream->relay", "edge remove <file> upstream->relay"],
      },
    });
    // By the line, by a node at one end, or by a group an end lies in.
    ok(fx, [{ ...closed, allow: ["upstream->relay", "callers->handlers"] }]);
    ok(fx, [{ ...closed, allow: ["catalog-sync", "callers"] }]);
  });

  it("let more through, or less, with wall.allow", () => {
    const d = ok(fx, [
      { ...net, allow: ["relay"] } as Op,
      { op: "wall.allow", id: "net", allow: ["handlers"] },
    ]).diagram;
    expect(d.walls?.[0]?.allow).toEqual(["relay", "handlers"]);
    expect(
      fail(d, [{ op: "wall.allow", id: "net", allow: ["handlers"], off: true }])[0],
    ).toMatchObject({
      code: "wall-crossed",
      found: "callers->handlers",
    });
    expect(fail(d, [{ op: "wall.allow", id: "nte", allow: ["x"] }])[0]).toMatchObject({
      code: "unknown-wall",
      facts: { near: ["net"] },
    });
  });

  it("refuse unknown ids, a node on both sides, and sides that share a row", () => {
    expect(fail(fx, [{ ...net, between: ["upstrem"] } as Op])[0]).toMatchObject({
      code: "unknown-node",
      field: "between",
      found: "upstrem",
    });
    expect(fail(fx, [{ ...net, allow: ["nope->x"] } as Op])[0]).toMatchObject({
      code: "unknown-node",
      field: "allow",
    });
    expect(fail(fx, [{ ...net, between: ["relay"] } as Op])[0]).toMatchObject({
      code: "wall-sides",
      facts: { nodes: ["relay"] },
    });
    // Up and down: a node between the sides would stand in the wall, and a row the wall
    // spans with no node of either side has no place for it.
    const beside = (between: string[], and: string[]): Op => ({
      op: "wall.add",
      id: "w",
      between,
      and,
    });
    expect(fail(fx, [beside(["catalog-sync"], ["catalog-api"])])[0]).toMatchObject({
      code: "wall-sides",
      facts: { row: "work", nodes: ["mongo"] },
    });
    expect(fail(fx, [beside(["relay", "pipelines"], ["service"])])[0]).toMatchObject({
      code: "wall-sides",
      facts: { row: "topics", nodes: [] },
    });
    expect(ok(fx, [beside(["upstream"], ["callers"])]).diagram.walls).toHaveLength(1);
    expect(fail(fx, [{ ...net, id: "relay" } as Op])[0]).toMatchObject({ code: "duplicate-id" });
  });

  it("forget what is removed, and go when a side is left empty", () => {
    const d = ok(fx, [net]).diagram;
    const r = ok(d, [{ op: "node.remove", id: "callers" }]);
    expect(r.diagram.walls?.[0]?.between).toEqual(["upstream"]);
    expect(r.changed).toContain("net");
    const gone = ok(r.diagram, [{ op: "node.remove", id: "upstream" }]);
    expect(gone.diagram.walls).toBeUndefined();
    expect(gone.changed).toContain("net");
    // A removed line leaves what the wall allows.
    const lines = ok(fx, [{ ...net, allow: ["upstream->relay", "handlers"] } as Op]).diagram;
    const cut = ok(lines, [{ op: "edge.remove", id: "upstream->relay" }]).diagram;
    expect(cut.walls?.[0]?.allow).toEqual(["handlers"]);
  });

  it("diff gives back the operations, and a changed wall comes back last", () => {
    const d = ok(fx, [net]).diagram;
    expect(diffDiagrams(fx, d)).toEqual([net]);
    const changed = ok(d, [{ op: "node.remove", id: "callers" }]).diagram;
    const ops = diffDiagrams(d, changed);
    expect(ops[0]).toEqual({ op: "wall.remove", id: "net" });
    expect(ops.at(-1)).toMatchObject({ op: "wall.add", id: "net", between: ["upstream"] });
    expect(writeDiagram(ok(d, ops).diagram)).toBe(writeDiagram(changed));
    expect(writeDiagram(ok(fx, diffDiagrams(fx, changed)).diagram)).toBe(writeDiagram(changed));
  });
});
