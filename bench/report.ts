// `pnpm bench report`: one clean session draws one picture and writes down what got in its way
// (specs/benchmark.md, "A report run"). It is how a test picture gets made: the cost, the
// picture and the agent's own report end up on one page.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { StepRecord } from "./run.ts";
import { type Change, chainDir, loadChanges, loadIntents, runChain, type Task } from "./run.ts";

export interface ReportPlan {
  round: string;
  model: string;
  task: Task | undefined;
  changes: Change[];
  /** One draft, each change, and the report. */
  calls: number;
}

/** A round's name from the clock, so that a report run never reuses a directory. */
export function reportRound(now: Date): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-");
  return `report-${stamp}`;
}

/** What to draw: a brief, a loose request, or a prompt of bench/prompts/intent.yaml by its id. */
export function reportTask(o: {
  brief?: string | undefined;
  request?: string | undefined;
  intent?: string | undefined;
}): Task | undefined {
  if (o.request !== undefined) return { id: "request", request: o.request };
  if (o.intent !== undefined) {
    const found = loadIntents().find((x) => x.id === o.intent);
    if (found === undefined) throw new Error(`no intent ${o.intent} in bench/prompts/intent.yaml`);
    return found;
  }
  if (o.brief === undefined || o.brief === "catalog-sync") return undefined;
  return { id: o.brief, brief: `${o.brief}.md` };
}

export function planReport(o: {
  round: string;
  model: string;
  task: Task | undefined;
  withChanges: boolean;
}): ReportPlan {
  const changes = o.withChanges ? loadChanges().filter((c) => c.phase1) : [];
  return { round: o.round, model: o.model, task: o.task, changes, calls: changes.length + 2 };
}

export function formatReportPlan(p: ReportPlan): string {
  return [
    `round=${p.round} model=${p.model} task=${p.task?.id ?? "catalog-sync"} changes=${p.changes.length} calls=${p.calls}`,
    `each call is capped at $1, so at most $${p.calls} in all`,
  ].join("\n");
}

/** The report page: what the session cost and did, then the agent's own words. */
export function formatReport(o: {
  name: string;
  steps: StepRecord[];
  reflectionUsd: number | null;
  reflection: string;
}): string {
  const cost = o.steps.reduce((sum, s) => sum + s.costUsd, 0) + (o.reflectionUsd ?? 0);
  const last = o.steps[o.steps.length - 1];
  const rows = o.steps.map((s) => {
    const refused = s.grafical === null ? "-" : s.grafical.opErrors + s.grafical.defects;
    const done = s.complete ? "yes" : "no";
    return `| ${s.step} | $${s.costUsd.toFixed(4)} | ${s.wallSeconds.toFixed(0)} s | ${s.turns} | ${s.toolCallTotal} | ${s.tokens.fresh} | ${refused} | ${s.imageReads} | ${done} |`;
  });
  return [
    `# ${o.name}`,
    "",
    `- **Cost:** $${cost.toFixed(4)}, of which the report $${(o.reflectionUsd ?? 0).toFixed(4)}`,
    `- **Model:** ${last?.model ?? "none"}`,
    `- **Commit:** ${last?.graficalCommit ?? "none"}`,
    `- **Defects:** engine ${last?.engineDefects ?? "unknown"}, agent ${last?.agentDefects ?? "unknown"}`,
    `- **Picture:** ${last?.diagramPng === true ? "diagram.png" : "none delivered"}`,
    "",
    "| Step | Cost | Wall | Turns | Tools | Fresh tokens | Refused | Images read | Delivered |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    o.reflection.trim() === "" ? "(no report)" : o.reflection.trim(),
    "",
  ].join("\n");
}

/** Runs the session and writes `report.md` beside its picture. Returns the page's path. */
export function runReport(p: ReportPlan): string {
  const arm = "grafical";
  const { steps, reflectionUsd } = runChain({
    round: p.round,
    arm,
    model: p.model,
    run: 1,
    changes: p.changes,
    ...(p.task === undefined ? {} : { task: p.task }),
  });
  const dir = chainDir(p.round, arm, p.model, 1, p.task);
  const file = join(dir, "reflection", "reflection.md");
  const reflection = existsSync(file) ? readFileSync(file, "utf8") : "";
  const out = join(dir, "report.md");
  writeFileSync(
    out,
    formatReport({
      name: `${p.round}: ${p.task?.id ?? "catalog-sync"}`,
      steps,
      reflectionUsd,
      reflection,
    }),
  );
  return out;
}
