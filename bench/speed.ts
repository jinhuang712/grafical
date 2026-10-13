// Benchmark 11's speed (GOALS.md): the time in process to apply, lay out and check
// one operation on diagrams of about 50 nodes, and the wall time of one command.
// Diagrams come from the fuzz generator's fixed seeds, so every run measures the
// same ones. Costs nothing: no agent runs.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drawing } from "../src/check/drawing.ts";
import { check } from "../src/check/index.ts";
import { layout } from "../src/layout/index.ts";
import { applyOps, type Diagram, type Op } from "../src/model/index.ts";
import { writeDiagram } from "../src/model/io.ts";
import { createMeasurer } from "../src/text/index.ts";
import { generate } from "../test/fuzz/gen.ts";

const MAIN = join(import.meta.dirname, "..", "src", "cli", "main.ts");

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)] ?? 0;
};

/** The operations timed on each diagram: one of each common kind. */
function operations(d: Diagram): Record<string, Op[]> {
  const nodes = d.layers.flatMap((l) => l.nodes.map((n) => n.id));
  const layer = d.layers[1]?.id ?? d.layers[0]?.id ?? "";
  return {
    rename: [{ op: "node.rename", id: nodes[3] ?? "", label: "renamed node" }],
    "add, placed": [{ op: "node.add", id: "zz", layer, label: "new node", last: true }],
    "add, slotted": [
      { op: "node.add", id: "zz", layer, label: "new node" },
      { op: "edge.add", from: "zz", to: nodes[0] ?? "" },
    ],
    "edge add": [{ op: "edge.add", from: nodes[1] ?? "", to: nodes[nodes.length - 2] ?? "" }],
  };
}

export async function measureSpeed(): Promise<string[]> {
  const m = await createMeasurer();
  const picked: Diagram[] = [];
  for (let seed = 1; picked.length < 6 && seed < 500; seed++) {
    const d = generate(seed, m).diagram;
    const n = d.layers.reduce((t, l) => t + l.nodes.length, 0);
    if (n >= 45 && n <= 55) picked.push(d);
  }
  const lines: string[] = [];
  const all: number[] = [];
  for (const d of picked) {
    const cells: string[] = [];
    for (const [name, ops] of Object.entries(operations(d))) {
      const ms: number[] = [];
      for (let k = 0; k < 7; k++) {
        const t0 = performance.now();
        const r = applyOps(d, ops, m);
        if ("errors" in r) break;
        const s = layout(r.diagram, m);
        check(r.diagram, s, m);
        drawing(r.diagram, s);
        ms.push(performance.now() - t0);
      }
      if (ms.length === 0) continue;
      all.push(median(ms));
      cells.push(`${name} ${median(ms).toFixed(1)} ms`);
    }
    const n = d.layers.reduce((t, l) => t + l.nodes.length, 0);
    lines.push(`${d.title}, ${n} nodes, ${d.edges.length} edges: ${cells.join(", ")}`);
  }
  lines.push(
    `in process, one operation: median ${median(all).toFixed(1)} ms, worst ${Math.max(...all).toFixed(1)} ms (target ≤ 50 ms)`,
  );

  // Wall time: a whole command, from a fresh process.
  const dir = mkdtempSync(join(tmpdir(), "grafical-speed-"));
  try {
    const d = picked[0] as Diagram;
    const file = join(dir, "speed.grafical.yaml");
    writeFileSync(file, writeDiagram(d));
    const node = d.layers.flatMap((l) => l.nodes)[0]?.id ?? "";
    const commands: [string, string[]][] = [
      ["node rename", ["node", "rename", file, node, "--label", "renamed"]],
      ["check", ["check", file]],
      ["render", ["render", file, "--png", join(dir, "speed.png")]],
    ];
    for (const [name, args] of commands) {
      const ms: number[] = [];
      for (let k = 0; k < 5; k++) {
        const t0 = performance.now();
        spawnSync("node", [MAIN, ...args], { encoding: "utf8" });
        ms.push(performance.now() - t0);
      }
      const target = name === "render" ? "below 2 s" : "≤ 400 ms";
      lines.push(`wall time, ${name}: median ${median(ms).toFixed(0)} ms (target ${target})`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return lines;
}
