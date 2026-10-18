// The words of a problem (DESIGN.md, "Refusals say what happened and which commands can change it"): one short
// sentence per code, and next names real commands only, in the order the help lists them.

import { describe, expect, it } from "vitest";
import {
  CODES,
  DESCRIPTIONS,
  defectBlock,
  errorBlock,
  NEXT,
  nextOf,
} from "../../src/cli/problems.ts";
import { applyOps, type Diagram, type Op, readDiagram } from "../../src/model/index.ts";
import { commandOrder } from "./commands.ts";

/** Every list of commands NEXT holds, with the code and variant it is for. */
function lists(): [string, readonly string[]][] {
  return Object.entries(NEXT).flatMap(([code, n]) =>
    Array.isArray(n)
      ? [[code, n] as [string, readonly string[]]]
      : Object.entries(n as Record<string, readonly string[]>).map(
          ([v, x]) => [`${code} ${v}`, x] as [string, readonly string[]],
        ),
  );
}

describe("problems", () => {
  it("each code has one short sentence that says what happened", () => {
    expect(Object.keys(DESCRIPTIONS).sort()).toEqual([...CODES].sort());
    for (const [code, text] of Object.entries(DESCRIPTIONS)) {
      expect(text, code).toMatch(/^[A-Za-z].*\.$/);
      // One sentence: no full stop inside it, and short enough to read at a glance.
      expect(text.slice(0, -1), code).not.toMatch(/\.\s/);
      expect(text.length, code).toBeLessThanOrEqual(140);
    }
  });

  it("a bar in a group's rows names the commands that change the rows, the group or the box", () => {
    // Round p1g: two agents could not tell from the record why a bar there was refused. A bar a line ends at can lose
    // the line; one drawn for its look alone, the look.
    const bar = { row: "mid", group: "sys", top: "core", bottom: "stores" };
    expect(nextOf("bar-in-group", { ...bar, edge: "rider->mid" })).toEqual([
      "group leave",
      "layer move",
      "node move",
      "edge remove",
    ]);
    expect(nextOf("bar-in-group", bar)).toEqual([
      "group leave",
      "layer look",
      "layer move",
      "node move",
    ]);
  });

  // Found by review on 2026-10-18: a box moved by steps that keeps an alignment was refused with only node move.
  it("a box moved by steps names the commands that take away its alignment, column or lane", () => {
    const read = (text: string) => {
      const d = readDiagram(text);
      if (Array.isArray(d)) throw new Error(JSON.stringify(d));
      return d;
    };
    const rows = `layers:
  - {id: top, label: Top, nodes: [{id: web, label: Web}, {id: api, label: API}]}
  - {id: low, label: Low, nodes: [{id: db, label: DB, align: web, lane: ops}, {id: cache, label: Cache, column: left}]}
edges: []
`;
    const laned = read(`grafical: 1
title: stepped
density: normal
lanes:
  - {id: ops, label: Ops}
${rows.replace(", column: left", "")}`);
    const columned = read(`grafical: 1
title: stepped
density: normal
columns:
  - {id: left}
${rows.replace(", lane: ops", "")}`);
    const next = (d: Diagram, op: Op) => {
      const r = applyOps(d, [op]);
      if (!("errors" in r)) throw new Error(JSON.stringify(op));
      return r.errors
        .filter((e) => e.code === "conflicting-position")
        .map((e) => `${e.field}: ${errorBlock(e).next.join(", ")}`);
    };
    expect(next(laned, { op: "node.move", id: "db", from: "api", down: 1 } as Op)).toEqual([
      "from,align: node move, node align",
      "from,lane: lane leave, node move",
    ]);
    expect(next(columned, { op: "node.move", id: "cache", from: "web", down: 1 } as Op)).toEqual([
      "from,column: column leave, node move",
    ]);
  });

  // Found by review on 2026-10-18: a defect's ids were lists even of one, an error's and a warning's not.
  it("give a key for one thing one value, and a key for several a list, even of one", () => {
    const kinds = new Map([
      ["a", "node"],
      ["b", "node"],
      ["e", "edge"],
    ]);
    expect(
      defectBlock({ code: "node-overlap", owner: "engine", elements: ["a", "b"], facts: {} }, kinds)
        .detail,
    ).toEqual({ owner: "engine", nodes: ["a", "b"] });
    expect(
      defectBlock(
        { code: "edge-through-node", owner: "engine", elements: ["e", "a"], facts: {} },
        kinds,
      ).detail,
    ).toEqual({ owner: "engine", node: "a", edge: "e" });
    expect(
      defectBlock(
        { code: "box-aside", owner: "agent", elements: ["a"], facts: { node: "a", nodes: ["b"] } },
        kinds,
      ).detail,
    ).toEqual({ owner: "agent", node: "a", nodes: ["b"] });
  });

  it("next names real commands only, in the order the help lists them", () => {
    expect(Object.keys(NEXT).sort()).toEqual([...CODES].sort());
    const order = commandOrder();
    for (const [at, names] of lists()) {
      for (const name of names) expect(order, `${at}: ${name}`).toContain(name);
      const places = names.map((x) => order.indexOf(x));
      expect(places, at).toEqual([...places].sort((a, b) => a - b));
    }
  });
});
