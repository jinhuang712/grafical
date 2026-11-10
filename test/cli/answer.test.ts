// What a command answers (specs/decisions, "An answer says what happened, and a write reports only what it changed"):
// the word for what happened, the objects a write touched found by comparing the diagram before and after, how the
// warnings moved, and the sections in their fixed order.

import { describe, expect, it } from "vitest";
import { answerJson, answerText, changesOf, warningMoves } from "../../src/cli/answer.ts";
import { warningBlock } from "../../src/cli/problems.ts";
import type { Warning } from "../../src/errors.ts";
import { applyOps, type Diagram, type Op } from "../../src/model/index.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";

function edited(d: Diagram | null, op: Op): Diagram {
  const r = applyOps(d, [op]);
  if ("errors" in r) throw new Error(JSON.stringify(r.errors));
  return r.diagram;
}

/** The changes of one command, as the lines of its <changes> section. */
function lines(d: Diagram | null, op: Op): string[] {
  const after = edited(d, op);
  return answerText({ outcome: "WRITTEN", changes: changesOf(d, after, op) })
    .split("\n")
    .filter((l) => l.startsWith("  "))
    .map((l) => l.trim());
}

describe("changes", () => {
  const d = catalogSyncGrouped;

  it("names a new file as the diagram it made, with no id", () => {
    expect(lines(null, { op: "diagram.set", title: "T" })).toEqual(["MADE diagram"]);
  });

  it("names only the flags whose value changed", () => {
    const relay = d.layers.flatMap((l) => l.nodes).find((n) => n.id === "relay");
    const op: Op = {
      op: "node.set",
      ids: ["relay"],
      label: "relay two",
      type: relay?.type ?? "service",
    };
    expect(lines(d, op)).toEqual(["CHANGED node=relay fields=label"]);
  });

  it("says a move is a change of place, for each node the command moves", () => {
    const layer = d.layers.find((l) => l.nodes.length > 2);
    if (layer === undefined) throw new Error("a layer of three");
    const [a, b] = layer.nodes.map((n) => n.id);
    const op: Op = { op: "node.move", ids: [b as string, a as string], first: true };
    expect(lines(d, op)).toEqual(
      [`CHANGED node=${a} fields=place`, `CHANGED node=${b} fields=place`].sort(),
    );
  });

  it("names what a removal took with it, and the object that caused it", () => {
    const out = lines(d, { op: "node.remove", ids: ["geo"] });
    expect(out[0]).toBe("REMOVED node=geo");
    expect(out.slice(1).length).toBeGreaterThan(0);
    for (const l of out.slice(1)) expect(l).toMatch(/^REMOVED edge=\S+ by=node:geo$/);
  });

  it("follows a cause through what the command made, as an edge of a copied node comes from the copy", () => {
    const base = applyOps(null, [
      { op: "diagram.set", title: "Copy" },
      { op: "layer.set", ids: ["r1", "r2"] },
      { op: "node.set", ids: ["lb"], layer: "r1", label: "LB" },
      { op: "node.set", ids: ["web"], layer: "r2", label: "Web" },
      { op: "group.set", ids: ["zone"], label: "Zone" },
      { op: "node.set", ids: ["web"], group: "zone" },
      { op: "edge.set", ids: ["lb-web"], from: "lb", to: "web" },
    ]);
    if ("errors" in base) throw new Error(JSON.stringify(base.errors));
    const op: Op = {
      op: "group.copy",
      id: "zone",
      into: "zone-b",
      label: "Zone B",
      suffix: "-b",
      after: "zone",
      outside: true,
    };
    expect(lines(base.diagram, op)).toEqual([
      "MADE group=zone-b",
      "MADE node=web-b by=group:zone-b",
      "MADE edge=lb-web-b by=group:zone-b",
    ]);
  });

  it("changes a label that takes its first look, since a label is there as long as its owner is", () => {
    const group = d.groups?.[0]?.id as string;
    const out = lines(d, { op: "label.set", ids: [group], at: "0.5" });
    expect(out.length).toBe(1);
    expect(out[0]).toMatch(new RegExp(`^CHANGED label=${group} fields=\\S*at`));
  });
});

describe("warnings", () => {
  it("are the same warning when their code and facts are, so a write reports only what moved", () => {
    const { added, moves } = warningMoves([lonely("a"), lonely("b")], [lonely("b"), lonely("c")]);
    expect(added).toEqual([lonely("c")]);
    expect(moves).toEqual({ new: 1, cleared: [lonely("a")], total: 2 });
  });
});

describe("the answer's text", () => {
  it("is the word, then each section that has anything, in its tag and indented, a blank line between blocks", () => {
    const text = answerText({
      outcome: "WRITTEN",
      changes: [{ action: "MADE", sort: "node", id: "cache" }],
      warnings: { new: 2, cleared: [{ code: "lonely-node", facts: { node: "db" } }], total: 2 },
      files: [],
      problems: [warningBlock(lonely("cache"), "cmd"), warningBlock(lonely("api"), "cmd")],
    });
    expect(text).toBe(
      [
        "WRITTEN",
        "<changes>",
        "  MADE node=cache",
        "</changes>",
        "<warnings>",
        "  new=2 cleared=1 total=2",
        "  CLEARED lonely-node node=db",
        "</warnings>",
        "<problems>",
        "  WARNING lonely-node",
        "    description: No edge reaches a node: none of its own, and none to its group, layer or lane.",
        "    source: cmd",
        "    detail:",
        "      node: cache",
        "    next: node --remove, edge --set",
        "",
        "  WARNING lonely-node",
        "    description: No edge reaches a node: none of its own, and none to its group, layer or lane.",
        "    source: cmd",
        "    detail:",
        "      node: api",
        "    next: node --remove, edge --set",
        "</problems>",
        "",
      ].join("\n"),
    );
    expect(answerText({ outcome: "UNCHANGED" })).toBe("UNCHANGED\n");
  });

  it("says the same as JSON, one key a section and only those it has", () => {
    expect(
      answerJson({
        outcome: "TRIED",
        changes: [{ action: "CHANGED", sort: "edge", id: "a-b", fields: ["label"] }],
        files: [],
      }),
    ).toEqual({
      outcome: "TRIED",
      changes: [{ action: "CHANGED", sort: "edge", id: "a-b", fields: ["label"] }],
    });
  });
});

function lonely(node: string): Warning {
  return { code: "lonely-node", facts: { node } };
}
