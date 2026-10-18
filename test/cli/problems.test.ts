// The words of a problem (DESIGN.md, "Refusals say what happened and which commands can change it"): one short
// sentence per code, and next names real commands only, in the order the help lists them.

import { describe, expect, it } from "vitest";
import { CODES, DESCRIPTIONS, NEXT, nextOf } from "../../src/cli/problems.ts";
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
