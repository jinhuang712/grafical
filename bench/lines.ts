// How good a round's lines are, measured, not judged (D35): for each chain's final
// diagram, its route cost, the hints still left in it, and how many of the hints
// grafical printed during the run the agent then ran. Used to compare rounds with
// and without hints, so that no person needs to rate the pictures.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findHints } from "../src/check/hints.ts";
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
  hintsLeft: number;
  hintsShown: number;
  hintsRun: number;
}

/** The hint commands grafical printed in a run, and those of them the agent ran afterwards. */
function hintUse(transcript: string): { shown: number; run: number } {
  const shown = new Set<string>();
  const ran = new Set<string>();
  const strip = (cmd: string) => cmd.replace(/grafical (\w+) (\w+) \S+/g, "grafical $1 $2");
  for (const line of readFileSync(transcript, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    const m = JSON.parse(line) as { message?: { content?: unknown } };
    const content = m.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content as Record<string, unknown>[]) {
      if (c.type === "tool_result") {
        const text = JSON.stringify(c.content ?? "");
        // A hint's commands start with grafical; the guide's own line about hints does not.
        for (const h of text.matchAll(/hint: [^:\\]*: (grafical [^\\]*)/g)) {
          for (const cmd of (h[1] ?? "").split("; ")) shown.add(strip(cmd.trim()));
        }
      }
      if (c.type === "tool_use") {
        const cmd = String((c.input as Record<string, unknown> | undefined)?.command ?? "");
        for (const s of shown) if (strip(cmd).includes(s)) ran.add(s);
        // `diagram improve` takes the hints shown so far (D35).
        if (shown.size > 0 && /grafical diagram improve\b/.test(cmd)) ran.add("diagram improve");
      }
    }
  }
  return { shown: shown.size, run: ran.size };
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
    const use = existsSync(transcript) ? hintUse(transcript) : { shown: 0, run: 0 };
    out.push({
      chain,
      task: chain.split(".")[0] ?? chain,
      nodes: d.layers.reduce((s, l) => s + l.nodes.length, 0),
      problems: cost[0] ?? 0,
      crossings: cost[1] ?? 0,
      bends: cost[2] ?? 0,
      troubled: troubledEdges(d, m).size,
      hintsLeft: findHints(d, m).length,
      hintsShown: use.shown,
      hintsRun: use.run,
    });
  }
  return out;
}

export function formatLines(round: string, rows: LineMeasure[]): string {
  const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
  const lines = [`round ${round}: ${rows.length} diagrams`];
  for (const r of rows) {
    lines.push(
      `  ${r.chain}: ${r.nodes} nodes, problems ${r.problems}, crossings ${r.crossings}, bends ${r.bends}, hints left ${r.hintsLeft}, hints shown ${r.hintsShown}, run ${r.hintsRun}`,
    );
  }
  const f = (x: number) => x.toFixed(2);
  lines.push(
    `mean: problems ${f(mean(rows.map((r) => r.problems)))}, crossings ${f(mean(rows.map((r) => r.crossings)))}, bends ${f(mean(rows.map((r) => r.bends)))}, hints left ${f(mean(rows.map((r) => r.hintsLeft)))}; drafts shown a hint ${rows.filter((r) => r.hintsShown > 0).length}, of them ran one ${rows.filter((r) => r.hintsShown > 0 && r.hintsRun > 0).length}`,
  );
  return lines.join("\n");
}
