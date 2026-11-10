// Every refusal says what happened, what caused it, and names only commands that exist (specs/decisions, "Refusals say
// what happened and which commands can change it"). Random single changes to the saved fixtures and to fuzz
// diagrams, of the kinds an agent makes, are refused, each as one command; each refusal, as the write path reports it,
// has its code's sentence, the command as its source, and in next real commands, in the order the help lists them.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { attempt, blocks, failure, isReport } from "../../src/cli/pipeline.ts";
import { type Block, DESCRIPTIONS } from "../../src/cli/problems.ts";
import { readDiagram } from "../../src/model/index.ts";
import { type Op, parseOp } from "../../src/model/ops.ts";
import type { Diagram } from "../../src/model/types.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { commandOrder } from "../cli/commands.ts";
import { generate, rng } from "../fuzz/gen.ts";

vi.setConfig({ testTimeout: 300_000 });

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

/** The command a change stands for, as the source of its problems. */
const COMMAND = "grafical -f d.grafical <the change>";

/** What a command of this change would be refused for, as the write path reports it; empty when it would be written. */
function refused(d: Diagram, raw: unknown): Block[] {
  const op = parseOp(raw, 0);
  if (Array.isArray(op)) return blocks(failure(op.map((e) => ({ ...e, source: COMMAND }))));
  const r = attempt(d, op, { command: COMMAND }, m);
  return isReport(r) ? blocks(r) : [];
}

const PLACES = ["top-left", "top", "top-right", "bottom-left", "left", "outside-top"];

/** Random single changes to a diagram, of the kinds an agent makes. */
function changes(d: Diagram, seed: number, count: number): Op[] {
  const r = rng(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
  const nodes = d.layers.flatMap((l) => l.nodes.map((n) => n.id));
  const layerIds = d.layers.map((l) => l.id);
  const groups = (d.groups ?? []).map((g) => g.id);
  const edges = d.edges.map((e) => e.id);
  const dir = () => pick(["down", "up", "left", "right"]);
  const out: Op[] = [];
  for (let i = 0; i < count && nodes.length >= 3; i++) {
    const a = pick(nodes);
    const b = pick(nodes.filter((x) => x !== a));
    const all = [
      { op: "node.move", ids: [b, a], first: true },
      { op: "node.move", ids: [a], layer: pick(layerIds), before: b },
      { op: "node.move", ids: [a], layer: pick(layerIds) },
      { op: "node.move", ids: [a], from: b, [dir()]: "1" },
      { op: "node.set", ids: [`new${i}`], label: "new box", from: a, [dir()]: "1" },
      { op: "node.set", ids: [`new${i}`], label: "new box", layer: pick(layerIds) },
      { op: "node.set", ids: [a], layer: pick(layerIds), last: true },
      { op: "group.set", ids: [a], label: "new box" },
      { op: "node.set", ids: [a], align: b },
      { op: "node.set", ids: [a], type: "servise" },
      { op: "diagram.set", sizing: "loose" },
      { op: "edge.set", ids: [`e${i}`], from: a, to: b, label: "a long label for this line" },
      { op: "edge.set", ids: [`e${i}`], from: a, to: `${b}x` },
      { op: "node.set", ids: [a, b], group: `g${i}` },
      { op: "note.set", ids: [a], text: "a note that says something a reader needs to know here" },
      { op: "wall.set", ids: [`w${i}`], between: a, and: b, label: "boundary" },
      { op: "layer.remove", ids: [pick(layerIds)] },
      { op: "node.set", ids: [a], column: `c${i}` },
      ...(groups.length > 0
        ? [
            { op: "label.set", ids: [pick(groups)], at: pick(PLACES) },
            { op: "node.set", ids: [a], group: pick(groups) },
          ]
        : []),
      ...(edges.length > 0 ? [{ op: "edge.set", ids: [pick(edges)], number: "1" }] : []),
    ];
    out.push(pick(all) as unknown as Op);
  }
  return out;
}

/** An operation that changes nothing. */
function still(d: Diagram): Op {
  return { op: "diagram.set", title: d.title };
}

function diagrams(): [string, Diagram][] {
  const dir = join(import.meta.dirname, "../fixtures");
  const saved = readdirSync(dir)
    .filter((f) => f.endsWith(".grafical"))
    .map((f) => [f, readDiagram(readFileSync(join(dir, f), "utf8"))] as [string, Diagram]);
  const seeds = Number(process.env.REFUSAL_SEEDS ?? 12);
  const fuzz = Array.from({ length: seeds }, (_, k) => [
    `seed ${k + 1}`,
    generate(k + 1, m).diagram,
  ]);
  // A diagram that refuses a change of nothing is refused for itself, not for the change.
  return [...saved, ...(fuzz as [string, Diagram][])].filter(
    ([, d]) => refused(d, still(d)).length === 0,
  );
}

/** A stable number from a name, so that each diagram has its own changes. */
function k0(name: string): number {
  return [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
}

describe("the refusals of random changes", () => {
  it("each say what happened and what caused it, and name only commands that exist, in the help's order", () => {
    const order = commandOrder();
    const wrong: string[] = [];
    const codes = new Set<string>();
    for (const [name, d] of diagrams()) {
      for (const [k, op] of changes(d, name.length * 31 + k0(name), 20).entries()) {
        for (const b of refused(d, op)) {
          codes.add(b.code);
          const at = `${name} change ${k} ${JSON.stringify(op)}: ${b.kind} ${b.code}`;
          if (b.description !== DESCRIPTIONS[b.code]) wrong.push(`${at}: description`);
          // The diagram refuses no change of nothing, so every problem is the change's.
          if (b.source !== COMMAND) wrong.push(`${at}: source ${b.source}`);
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
    for (const code of [
      "missing-field",
      "bad-value",
      "unknown-node",
      "duplicate-id",
      "unknown-type",
    ])
      expect([...codes], code).toContain(code);
    expect(codes.size).toBeGreaterThan(12);
  });
});
