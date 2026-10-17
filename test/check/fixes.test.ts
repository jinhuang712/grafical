// Every fix a refusal suggests is a change grafical accepts, and it takes that refusal away (DESIGN.md, "One entry
// page, help where it is used"). Random single changes to the saved fixtures and to fuzz diagrams are refused; each
// refusal's fixes are read by the real command line, then tried after the change, before it and alone. A fix
// grafical refuses, or one after which the same refusal stays, is a wrong hint.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Op } from "../../src/model/ops.ts";
import type { Diagram } from "../../src/model/types.ts";
import type { Measurer } from "../../src/text/types.ts";

/** The operations the command line would write, caught instead of written. */
const written: Op[][] = [];
vi.mock("../../src/cli/pipeline.ts", async (real) => ({
  ...(await real<typeof import("../../src/cli/pipeline.ts")>()),
  runWrite: async (_file: string, ops: Op[]) => {
    written.push(ops);
    return { ok: true, changed: [], errors: [], defects: [] };
  },
  emit: () => 0,
}));

const { build } = await import("../../src/cli/main.ts");
const { check } = await import("../../src/check/index.ts");
const { layout } = await import("../../src/layout/index.ts");
const { applyOps, readDiagram } = await import("../../src/model/index.ts");
const { createMeasurer } = await import("../../src/text/index.ts");
const { unknownWeights } = await import("../../src/theme/themes.ts");
const { generate, rng } = await import("../fuzz/gen.ts");

vi.setConfig({ testTimeout: 300_000 });

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

/** A refusal: an operation's error, or a defect the agent owns. */
interface Problem {
  code: string;
  index?: number;
  found?: string;
  elements?: string[];
  facts?: { fix?: readonly string[]; group?: string };
}

/** What a write would refuse, as the write path checks it; empty when it would be written. */
function refused(d: Diagram, ops: Op[]): Problem[] {
  const r = applyOps(d, ops);
  if ("errors" in r) return r.errors;
  const weights = unknownWeights(r.diagram);
  if (weights.length > 0) return weights;
  return check(r.diagram, layout(r.diagram, m), m).filter((x) => x.owner === "agent");
}

/** Splits a command line as a shell does, for the quoting fixes use. */
function words(s: string): string[] {
  return [...s.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g)].map(
    (x) => x[1] ?? x[2] ?? x[3] ?? "",
  );
}

/** A fix's operations as the command line reads them, or why it reads none. */
async function read(fix: string): Promise<Op[] | string> {
  const args = words(fix.replace(/^grafical /, "")).map((w) => (w === "<file>" ? "d.yaml" : w));
  if (args.some((a) => /^<.*>$/.test(a))) return "template";
  written.length = 0;
  try {
    const p = build();
    p.configureOutput({ writeOut: () => {}, writeErr: () => {}, outputError: () => {} });
    await p.parseAsync(["node", "grafical", ...args]);
  } catch (e) {
    return `usage ${(e as { code?: string }).code}`;
  }
  return written[0] ?? "refused as it was read";
}

/** Errors that mean the operation itself cannot apply, as opposed to what the picture then shows. */
const OWN = new Set([
  "missing-field",
  "not-in-layer",
  "unknown-node",
  "unknown-group",
  "unknown-lane",
  "unknown-edge",
  "unknown-layer",
  "unknown-wall",
  "unknown-note",
  "unknown-column",
  "conflicting-position",
  "bad-value",
  "bad-reference",
  "duplicate-id",
  "align-same-layer",
]);

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
      { op: "node.move", id: a, from: b, [dir()]: 1 },
      { op: "node.add", id: `new${i}`, label: "new box", from: a, [dir()]: 1 },
      { op: "node.align", id: a, to: b },
      { op: "edge.add", from: a, to: b, label: "a long label for this line" },
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
  const seeds = Number(process.env.FIX_SEEDS ?? 12);
  const fuzz = Array.from({ length: seeds }, (_, k) => [
    `seed ${k + 1}`,
    generate(k + 1, m).diagram,
  ]);
  // A diagram that refuses a change of nothing would blame every fix for its own problems.
  return [...saved, ...(fuzz as [string, Diagram][])].filter(
    ([, d]) => refused(d, [{ op: "diagram.title", text: d.title }]).length === 0,
  );
}

describe("the fixes refusals suggest", () => {
  it("are each a change grafical accepts, after which their refusal is gone", async () => {
    const wrong: string[] = [];
    let tried = 0;
    for (const [name, d] of diagrams()) {
      for (const [k, op] of changes(d, name.length * 31 + k0(name), 20).entries()) {
        for (const p of refused(d, [op]) as Problem[]) {
          for (const fix of p.facts?.fix ?? []) {
            const ops = await read(fix);
            if (ops === "template") continue;
            tried++;
            const at = `${name} change ${k} ${JSON.stringify(op)}: ${p.code} fix "${fix}"`;
            if (typeof ops === "string") {
              wrong.push(`${at}: ${ops}`);
              continue;
            }
            const after = refused(d, [op, ...ops]);
            // A check of the whole diagram reports against the batch's last operation: an error the change
            // already had is not the fix's own.
            const key = (x: Problem) => `${x.code} ${x.found ?? ""}`;
            const had = new Set((refused(d, [op]) as Problem[]).map(key));
            const own = after.filter(
              (x) => (x as Problem).index === 1 && OWN.has(x.code) && !had.has(key(x as Problem)),
            );
            if (own.length > 0) {
              wrong.push(`${at}: refused, ${own.map((x) => x.code).join(" ")}`);
              continue;
            }
            // Gone in one of the orders it may mean: after the change, before it, or in its place.
            const same = (x: Problem) =>
              x.code === p.code &&
              (x.found ?? "") === (p.found ?? "") &&
              (x.facts?.group ?? "") === (p.facts?.group ?? "") &&
              (x.elements ?? []).join() === (p.elements ?? []).join();
            const orders = [after, refused(d, [...ops, op]), refused(d, ops)];
            if (orders.every((o) => (o as Problem[]).some(same))) wrong.push(`${at}: stays`);
          }
        }
      }
    }
    expect(tried).toBeGreaterThan(50);
    expect(wrong).toEqual([]);
  });
});

/** A stable number from a name, so that each diagram has its own changes. */
function k0(name: string): number {
  return [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
}
