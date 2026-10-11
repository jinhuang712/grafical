// The phase 1 smoke test (EXPERIMENTS.md, "Schedule"): E1 and E2 on the public
// brief, grafical against a raw model, Haiku only, 3 runs each. E2 sends the
// four change types phase 1 supports.

import { ALLOWED_TOOLS, type Arm, chainDir, chainSteps, claudeArgs, loadChanges } from "./run.ts";

export const SMOKE_ARMS: Arm[] = ["grafical", "raw"];
export const SMOKE_MODEL = "haiku";
export const SMOKE_RUNS = 3;
/** Each run is capped at this many dollars (`--max-budget-usd`). */
export const RUN_CAP_USD = 1;

export interface SmokePlan {
  round: string;
  chains: { arm: Arm; model: string; run: number }[];
  /** Every `claude` call, in order, as the shell would see it. */
  commands: { dir: string; step: string; argv: string[] }[];
}

export function planSmoke(round: string): SmokePlan {
  const changes = loadChanges().filter((c) => c.phase1);
  const chains: SmokePlan["chains"] = [];
  const commands: SmokePlan["commands"] = [];
  for (const arm of SMOKE_ARMS) {
    for (let run = 1; run <= SMOKE_RUNS; run++) {
      chains.push({ arm, model: SMOKE_MODEL, run });
      const dir = chainDir(round, arm, SMOKE_MODEL, run);
      for (const spec of chainSteps(arm, changes)) {
        commands.push({
          dir,
          step: spec.step,
          argv: claudeArgs({
            prompt: spec.prompt,
            model: SMOKE_MODEL,
            tools: ALLOWED_TOOLS[arm],
            persist: true,
            // The session id is known only after the draft runs.
            ...(spec.step === "e1" ? {} : { resume: "<session-id-of-the-e1-draft>" }),
          }),
        });
      }
    }
  }
  return { round, chains, commands };
}

function shellQuote(s: string): string {
  return /^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replaceAll("'", `'\\''`)}'`;
}

export function formatPlan(plan: SmokePlan): string {
  const lines = [`# smoke test, round "${plan.round}" (dry run: nothing is called)`];
  for (const c of plan.commands) {
    lines.push(
      "",
      `# ${c.step}`,
      `(cd ${shellQuote(c.dir)} && claude ${c.argv.map(shellQuote).join(" ")})`,
    );
  }
  const n = plan.commands.length;
  lines.push(
    "",
    `chains: ${plan.chains.length} (${SMOKE_ARMS.join(", ")} x ${SMOKE_RUNS} runs, ${SMOKE_MODEL})`,
    `runs (claude calls): ${n}`,
    `cost cap: ${n} x $${RUN_CAP_USD} = $${n * RUN_CAP_USD} at most`,
  );
  return lines.join("\n");
}
