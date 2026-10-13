// A round's lines, measured, not judged: for each chain's final diagram its route cost
// (D24), and how often the agent measured a change with `grafical try` (D37).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isReport, loadDiagram } from "../src/cli/pipeline.ts";
import { arrangementCost, troubledEdges } from "../src/layout/index.ts";
import { createMeasurer } from "../src/text/index.ts";
import { RUNS } from "./run.ts";

export interface LineMeasure {
  chain: string;
  task: string;
  nodes: number;
  /** Crossings plus lines with more than two bends, then crossings and bends (D24). */
  problems: number;
  crossings: number;
  bends: number;
  troubled: number;
  /** Calls of `grafical try` in the run. */
  tries: number;
}

/** How many times the agent ran `grafical try` in a run. */
function tryUse(transcript: string): number {
  let n = 0;
  for (const line of readFileSync(transcript, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    const content = (JSON.parse(line) as { message?: { content?: unknown } }).message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content as Record<string, unknown>[]) {
      const cmd = String((c.input as Record<string, unknown> | undefined)?.command ?? "");
      if (c.type === "tool_use" && /(^|[;&|\n]\s*)grafical try\b/.test(cmd)) n++;
    }
  }
  return n;
}

export async function measureLines(round: string): Promise<LineMeasure[]> {
  const m = await createMeasurer();
  const dir = join(RUNS, round);
  const out: LineMeasure[] = [];
  for (const chain of readdirSync(dir).sort()) {
    const home = join(dir, chain);
    if (!existsSync(join(home, "steps"))) continue;
    const file = readdirSync(home).find((f) => f.endsWith(".grafical.yaml"));
    if (file === undefined) continue;
    const d = loadDiagram(join(home, file));
    if (isReport(d)) continue;
    const cost = arrangementCost(d, m);
    const transcript = join(home, "steps", "e1", "transcript.jsonl");
    out.push({
      chain,
      task: chain.split(".")[0] ?? chain,
      nodes: d.layers.reduce((s, l) => s + l.nodes.length, 0),
      problems: cost[0] ?? 0,
      crossings: cost[1] ?? 0,
      bends: cost[2] ?? 0,
      troubled: troubledEdges(d, m).size,
      tries: existsSync(transcript) ? tryUse(transcript) : 0,
    });
  }
  return out;
}

export function formatLines(round: string, rows: LineMeasure[]): string {
  const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
  const lines = [`round ${round}: ${rows.length} diagrams`];
  for (const r of rows) {
    lines.push(
      `  ${r.chain}: ${r.nodes} nodes, problems ${r.problems}, crossings ${r.crossings}, bends ${r.bends}, tries ${r.tries}`,
    );
  }
  const f = (x: number) => x.toFixed(2);
  lines.push(
    `mean: problems ${f(mean(rows.map((r) => r.problems)))}, crossings ${f(mean(rows.map((r) => r.crossings)))}, bends ${f(mean(rows.map((r) => r.bends)))}; drafts that ran try ${rows.filter((r) => r.tries > 0).length}`,
  );
  return lines.join("\n");
}
