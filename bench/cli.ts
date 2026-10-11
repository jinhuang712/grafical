// `pnpm bench <command>`: the entry point of the benchmark harness.
//
//   baseline --model haiku [--round <name>]   the empty task, once per model (about $0.005 on Haiku)
//   smoke --dry-run [--round <name>]          print every command the smoke test would run
//   smoke --approved [--round <name>]         run it. Only after the owner approved the cost.
//   judge --round <name> [--judges 2]         score a round's pictures blind with Opus judges
//   summary --round <name>                    write bench/results/<round>.md

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runJudging } from "./judge.ts";
import { loadChanges, prepareChainDir, RUNS, runChain, runStep } from "./run.ts";
import { formatPlan, planSmoke } from "./smoke.ts";
import { writeSummary } from "./summary.ts";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(argv: string[]): void {
  const [command, ...args] = argv;
  const round = flag(args, "round") ?? "smoke";
  switch (command) {
    case "baseline": {
      const model = flag(args, "model") ?? "haiku";
      const dir = join(RUNS, round, `baseline-${model}`);
      prepareChainDir(dir, "raw");
      const prompt = readFileSync(
        join(import.meta.dirname, "prompts", "baseline.md"),
        "utf8",
      ).trim();
      const rec = runStep({
        dir,
        arm: "baseline",
        model,
        spec: { step: "baseline", kind: "draft", prompt },
        persist: false,
      });
      console.log(JSON.stringify({ ...rec, perTurn: undefined }, null, 2));
      return;
    }
    case "smoke": {
      const plan = planSmoke(round);
      if (args.includes("--dry-run")) {
        console.log(formatPlan(plan));
        return;
      }
      if (!args.includes("--approved")) {
        console.error(
          "Real runs cost money and the owner approves them (EXPERIMENTS.md, rule 4).\n" +
            "Use --dry-run to see the plan, or --approved once the owner has approved the total.",
        );
        process.exit(2);
      }
      mkdirSync(join(RUNS, round), { recursive: true });
      const changes = loadChanges().filter((c) => c.phase1);
      for (const chain of plan.chains) {
        const recs = runChain({ round, ...chain, changes });
        console.log(
          `${chain.arm} r${chain.run}: ${recs.map((r) => `${r.step} $${r.costUsd.toFixed(3)}`).join(", ")}`,
        );
      }
      return;
    }
    case "judge": {
      runJudging(round, Number(flag(args, "judges") ?? 2));
      return;
    }
    case "summary": {
      const out = writeSummary(round);
      writeFileSync(out.path, out.text);
      console.log(`wrote ${out.path}`);
      return;
    }
    default:
      console.error("usage: pnpm bench <baseline|smoke|judge|summary> [options]");
      process.exit(2);
  }
}

main(process.argv.slice(2));
