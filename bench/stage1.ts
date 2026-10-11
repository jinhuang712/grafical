// The end of stage 1 (ROADMAP.md, "How stage 1 ends"; EXPERIMENTS.md, "Schedule"):
// every experiment that runs, as parts the owner can run one at a time.
//
//   e1e2    E1 draft and the 8 E2 change requests: grafical, raw and Mermaid, Haiku, 3 runs
//   opus    E1 drafts on Opus, grafical and raw, 3 runs: the model gap (benchmark 5)
//   scale   E4 drafts on the 10-, 25- and 50-component briefs: all three arms, Haiku, 3 runs
//   intent  E3: the 10 loose prompts, grafical, Haiku, one run each; the owner accepts or rejects
//   mvp     the MVP bar: the private reference brief, grafical, Haiku, 3 runs, kept outside the repo
//
// Every run gets the same prompt for every model: a prompt depends on the arm and
// the task only (EXPERIMENTS.md, "Harness").

import { homedir } from "node:os";
import { join } from "node:path";
import {
  ALLOWED_TOOLS,
  ARMS,
  type Arm,
  type Change,
  chainName,
  chainSteps,
  claudeArgs,
  loadChanges,
  loadIntents,
  RUNS,
  type Task,
} from "./run.ts";

export const PARTS = ["e1e2", "opus", "scale", "intent", "mvp"] as const;
export type Part = (typeof PARTS)[number];

/** The private reference brief and its runs: outside the repository, never committed. */
export const PRIVATE = join(homedir(), "dev", "projects", "grafical-private");

export interface Chain {
  arm: Arm;
  model: string;
  run: number;
  task?: Task;
  changes: Change[];
}

export interface PartPlan {
  part: Part;
  round: string;
  /** The parent of the round's directory. */
  runs: string;
  chains: Chain[];
}

const SCALE: Task[] = [10, 25, 50].map((n) => ({ id: `scale-${n}`, brief: `scale-${n}.md` }));

export function planPart(part: Part): PartPlan {
  const runs3 = [1, 2, 3];
  const chains: Chain[] = [];
  const add = (
    arms: Arm[],
    model: string,
    runs: number[],
    tasks: (Task | undefined)[],
    changes: Change[],
  ) => {
    for (const task of tasks) {
      for (const arm of arms) {
        for (const run of runs)
          chains.push({ arm, model, run, ...(task ? { task } : {}), changes });
      }
    }
  };
  switch (part) {
    case "e1e2":
      add(ARMS, "haiku", runs3, [undefined], loadChanges());
      return { part, round: "stage1", runs: RUNS, chains };
    case "opus":
      add(["grafical", "raw"], "opus", runs3, [undefined], []);
      return { part, round: "stage1-opus", runs: RUNS, chains };
    case "scale":
      add(ARMS, "haiku", runs3, SCALE, []);
      return { part, round: "stage1-scale", runs: RUNS, chains };
    case "intent":
      add(["grafical"], "haiku", [1], loadIntents(), []);
      return { part, round: "stage1-intent", runs: RUNS, chains };
    case "mvp":
      add(
        ["grafical"],
        "haiku",
        runs3,
        [{ id: "reference", briefFile: join(PRIVATE, "briefs", "reference.md") }],
        [],
      );
      return { part, round: "stage1-mvp", runs: join(PRIVATE, "runs"), chains };
  }
}

/** Every claude call of a part, as the dry run prints it. */
export function partCommands(plan: PartPlan): { chain: string; step: string; argv: string[] }[] {
  return plan.chains.flatMap((c) =>
    chainSteps(c.arm, c.changes, c.task).map((spec) => ({
      chain: chainName(c.arm, c.model, c.run, c.task),
      step: spec.step,
      argv: claudeArgs({
        prompt: spec.prompt,
        model: c.model,
        tools: ALLOWED_TOOLS[c.arm],
        persist: c.changes.length > 0,
        ...(spec.step === "e1" ? {} : { resume: "<session-id-of-the-e1-draft>" }),
      }),
    })),
  );
}

export function formatPart(plan: PartPlan): string {
  const calls = partCommands(plan);
  const byChain = new Map<string, number>();
  for (const c of calls) byChain.set(c.chain, (byChain.get(c.chain) ?? 0) + 1);
  return [
    `# stage 1, part ${plan.part}: round ${plan.round} in ${plan.runs} (dry run: nothing is called)`,
    ...[...byChain].map(([chain, n]) => `${chain}: ${n} call${n === 1 ? "" : "s"}`),
    `chains: ${plan.chains.length}, claude calls: ${calls.length}, cost cap: $${calls.length} at most ($1 a call)`,
  ].join("\n");
}
