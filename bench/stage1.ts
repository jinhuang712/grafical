// The end of stage 1 (ROADMAP.md, "The MVP bar, measured again"; EXPERIMENTS.md, "Schedule"):
// every experiment that runs, as parts the owner can run one at a time.
//
//   e1e2    E1 draft and the 8 E2 change requests: grafical, raw and Mermaid, Haiku, 3 runs
//   opus    E1 drafts on Opus, grafical and raw, 3 runs: the model gap (GOALS.md, "Model gap")
//   scale   E4 drafts on the 10-, 25- and 50-component briefs: all three arms, Haiku, 3 runs
//   intent  E3: the 10 loose prompts, grafical, Haiku, one run each; the owner accepts or rejects
//   mvp     the MVP bar: the private reference brief, grafical, Haiku, 3 runs, kept outside the repo
//   hints, nohints  phase 1d: five tasks with and without the engine's hints (DESIGN.md, "Records over prose"),
//           grafical, Haiku, 3 runs, measured by their lines, not by a person
//   hints2  the same with `diagram improve` and the guide's step to run it
//   hints3  the same with improve taking only safe hints
//   hints4  the same with improve removed: the agent runs each hint itself
//   help    a prompt for each diagram type, the public brief and the 25-component brief,
//           the agent learning grafical from its help alone (DESIGN.md, "The help as the reference"), Haiku, 3 runs
//   brief   the public brief again, 6 runs, after the refusals learned to say how to fix
//   help2   the help round again, after the refusals and the help said how to fix
//   help3   again, after the kinds were named, rows took ids like row-users, and hints
//           tried rows and hubs, safe ones first, each naming the lines it untangles
//   records again, after the output became key=value records with no hints (DESIGN.md, "Records over prose"), and
//           fan-outs bundled (DESIGN.md, "Fan-outs of three bundle"), rows took one height and stores more room
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
  reflectArgs,
  type Task,
} from "./run.ts";

export const PARTS = [
  "e1e2",
  "opus",
  "scale",
  "intent",
  "mvp",
  "hints",
  "nohints",
  "hints2",
  "hints3",
  "hints4",
  "help",
  "brief",
  "help2",
  "help3",
  "records",
] as const;
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
  /** false: the grafical tool prints no hints (DESIGN.md, "Records over prose"). */
  hints?: boolean;
}

/**
 * The hint comparison's tasks: the public brief and the 25-component brief, whose stage 1
 * drafts had the most crossing lines, the one loose prompt the owner rejected for a line,
 * and the two new types.
 */
function hintTasks(): Task[] {
  return [
    { id: "catalog-sync", brief: "catalog-sync.md" },
    { id: "scale-25", brief: "scale-25.md" },
    ...loadIntents().filter((t) => t.id === "password-reset"),
    ...loadIntents("types.yaml").filter((t) => t.id === "refund-flow" || t.id === "order-states"),
  ];
}

/** The help round's tasks: those of the type guide round (p1d-guides), and a scale brief. */
function helpTasks(): Task[] {
  return [
    { id: "catalog-sync", brief: "catalog-sync.md" },
    ...loadIntents("types.yaml"),
    { id: "scale-25", brief: "scale-25.md" },
  ];
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
    case "hints":
      add(["grafical"], "haiku", runs3, hintTasks(), []);
      return { part, round: "p1d-hints", runs: RUNS, chains };
    case "nohints":
      add(["grafical"], "haiku", runs3, hintTasks(), []);
      return { part, round: "p1d-nohints", runs: RUNS, chains, hints: false };
    case "hints2":
      add(["grafical"], "haiku", runs3, hintTasks(), []);
      return { part, round: "p1d-hints2", runs: RUNS, chains };
    case "hints3":
      add(["grafical"], "haiku", runs3, hintTasks(), []);
      return { part, round: "p1d-hints3", runs: RUNS, chains };
    case "hints4":
      add(["grafical"], "haiku", runs3, hintTasks(), []);
      return { part, round: "p1d-hints4", runs: RUNS, chains };
    case "help":
      add(["grafical"], "haiku", runs3, helpTasks(), []);
      return { part, round: "p1d-help", runs: RUNS, chains };
    case "brief":
      add(
        ["grafical"],
        "haiku",
        [1, 2, 3, 4, 5, 6],
        [{ id: "catalog-sync", brief: "catalog-sync.md" }],
        [],
      );
      return { part, round: "p1d-brief", runs: RUNS, chains };
    case "help2":
      add(["grafical"], "haiku", runs3, helpTasks(), []);
      return { part, round: "p1d-help2", runs: RUNS, chains };
    case "help3":
      add(["grafical"], "haiku", runs3, helpTasks(), []);
      return { part, round: "p1d-help3", runs: RUNS, chains };
    case "records":
      add(["grafical"], "haiku", runs3, helpTasks(), []);
      return { part, round: "p1e-records", runs: RUNS, chains };
  }
}

/** Every claude call of a part, as the dry run prints it. */
export function partCommands(plan: PartPlan): { chain: string; step: string; argv: string[] }[] {
  return plan.chains.flatMap((c) => {
    const chain = chainName(c.arm, c.model, c.run, c.task);
    return [
      ...chainSteps(c.arm, c.changes, c.task).map((spec) => ({
        chain,
        step: spec.step,
        argv: claudeArgs({
          prompt: spec.prompt,
          model: c.model,
          tools: ALLOWED_TOOLS[c.arm],
          persist: true,
          ...(spec.step === "e1" ? {} : { resume: "<session-id-of-the-e1-draft>" }),
        }),
      })),
      {
        chain,
        step: "reflection",
        argv: reflectArgs(c.arm, c.model, "<session-id-of-the-e1-draft>"),
      },
    ];
  });
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
