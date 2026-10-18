// Every refusal says what happened and names only commands that exist (DESIGN.md, "Refusals say what happened and
// which commands can change it"). Random single changes to the saved fixtures and to fuzz diagrams, of the kinds an
// agent makes, are refused; each refusal, as the command line would print it, has its code's sentence, and its next
// names real commands, in the order the help lists them.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { check } from "../../src/check/index.ts";
import {
  type Block,
  DESCRIPTIONS,
  defectBlock,
  errorBlock,
  kindsOf,
} from "../../src/cli/problems.ts";
import type { OpError } from "../../src/errors.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, readDiagram } from "../../src/model/index.ts";
import { type Op, parseOps } from "../../src/model/ops.ts";
import type { Diagram } from "../../src/model/types.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { unknownWeights } from "../../src/theme/themes.ts";
import { commandOrder } from "../cli/commands.ts";
import { generate, rng } from "../fuzz/gen.ts";

vi.setConfig({ testTimeout: 300_000 });

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

/** What a write would refuse, as a batch is read and checked, as blocks; empty when it would be written. */
function refused(d: Diagram, raw: unknown[]): Block[] {
  const ops = parseOps(raw);
  if (ops.some((x) => "code" in x)) return (ops as OpError[]).map(errorBlock);
  const r = applyOps(d, ops as Op[]);
  if ("errors" in r) return r.errors.map(errorBlock);
  const weights = unknownWeights(r.diagram);
  if (weights.length > 0) return weights.map(errorBlock);
  const kinds = kindsOf(r.diagram);
  return check(r.diagram, layout(r.diagram, m), m)
    .filter((x) => x.owner === "agent")
    .map((x) => defectBlock(x, kinds));
}

const PLACES = ["top-left", "top", "top-right", "bottom-left", "left", "outside-top"];

/** Random single changes to a diagram, of the kinds an agent makes. */
function changes(d: Diagram, seed: number, count: number): Op[] {
  const r = rng(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
  const nodes = d.layers.flatMap((l) => l.nodes.map((n) => n.id));
  const rows = d.layers.map((l) => l.id);
  const groups = (d.groups ?? []).map((g) => g.id);
  const edges = d.edges.map((e) => e.id);
  const dir = () => pick(["down", "up", "left", "right"]);
  const out: Op[] = [];
  for (let i = 0; i < count && nodes.length >= 3; i++) {
    const a = pick(nodes);
    const b = pick(nodes.filter((x) => x !== a));
    const all = [
      { op: "node.swap", a, b },
      { op: "node.move", id: a, layer: pick(rows), before: b },
      { op: "node.move", id: a, layer: pick(rows) },
      { op: "node.move", id: a, from: b, [dir()]: 1 },
      { op: "node.add", id: `new${i}`, label: "new box", from: a, [dir()]: 1 },
      { op: "node.add", id: `new${i}`, label: "new box", layer: pick(rows) },
      { op: "node.add", id: a, label: "new box", layer: pick(rows), last: true },
      { op: "node.align", id: a, to: b },
      { op: "node.kind", id: a, kind: "servise" },
      { op: "edge.add", from: a, to: b, label: "a long label for this line" },
      { op: "edge.add", from: a, to: `${b}x` },
      { op: "group.add", id: `g${i}`, label: "group", nodes: [a, b] },
      { op: "note.add", on: a, text: "a note that says something a reader needs to know here" },
      { op: "wall.add", id: `w${i}`, between: [a], and: [b], label: "boundary" },
      { op: "layer.remove", id: pick(rows) },
      { op: "column.add", id: `c${i}`, nodes: [a] },
      ...(groups.length > 0
        ? [
            { op: "group.title", id: pick(groups), at: pick(PLACES) },
            { op: "group.join", group: pick(groups), nodes: [a] },
          ]
        : []),
      ...(edges.length > 0 ? [{ op: "edge.step", id: pick(edges), n: 1 }] : []),
    ];
    out.push(pick(all) as unknown as Op);
  }
  return out;
}

function diagrams(): [string, Diagram][] {
  const dir = join(import.meta.dirname, "../fixtures");
  const saved = readdirSync(dir)
    .filter((f) => f.endsWith(".grafical.yaml"))
    .map((f) => [f, readDiagram(readFileSync(join(dir, f), "utf8"))] as [string, Diagram]);
  const seeds = Number(process.env.REFUSAL_SEEDS ?? 12);
  const fuzz = Array.from({ length: seeds }, (_, k) => [
    `seed ${k + 1}`,
    generate(k + 1, m).diagram,
  ]);
  // A diagram that refuses a change of nothing is refused for itself, not for the change.
  return [...saved, ...(fuzz as [string, Diagram][])].filter(
    ([, d]) => refused(d, [{ op: "diagram.title", text: d.title }]).length === 0,
  );
}

/** A stable number from a name, so that each diagram has its own changes. */
function k0(name: string): number {
  return [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
}

describe("the refusals of random changes", () => {
  it("each say what happened and name only commands that exist, in the help's order", () => {
    const order = commandOrder();
    const wrong: string[] = [];
    const codes = new Set<string>();
    for (const [name, d] of diagrams()) {
      for (const [k, op] of changes(d, name.length * 31 + k0(name), 20).entries()) {
        for (const b of refused(d, [op])) {
          codes.add(b.code);
          const at = `${name} change ${k} ${JSON.stringify(op)}: ${b.kind} ${b.code}`;
          if (b.description !== DESCRIPTIONS[b.code]) wrong.push(`${at}: description`);
          const places = b.next.map((x) => order.indexOf(x));
          if (places.some((p) => p < 0)) wrong.push(`${at}: next ${b.next.join(", ")}`);
          if (places.some((p, i) => i > 0 && p < (places[i - 1] as number)))
            wrong.push(`${at}: next out of order ${b.next.join(", ")}`);
          if (Object.keys(b.detail).length === 0) wrong.push(`${at}: no detail`);
        }
      }
    }
    expect(wrong).toEqual([]);
    // The changes reach the codes agents meet most.
    for (const code of ["missing-field", "bad-value", "unknown-node", "duplicate-id"])
      expect([...codes], code).toContain(code);
    expect(codes.size).toBeGreaterThan(12);
  });
});
