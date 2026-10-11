// `pnpm bench <command>`: the entry point of the benchmark harness.
//
//   baseline --model haiku [--round <name>]   the empty task, once per model (about $0.005 on Haiku)
//   smoke --dry-run [--round <name>]          print every command the smoke test would run
//   smoke --approved [--round <name>]         run it. Only after the owner approved the cost.
//   chain --arm <arm> [--model haiku] [--run 1] [--round <name>]
//                                             one draft and its change requests, to measure a
//                                             cell's cost before the owner approves a round.
//   judge --round <name> [--judges 2] [--private]
//                                             score a round's pictures blind with Opus judges;
//                                             --private: a round on the private brief
//   summary --round <name>                    write bench/results/<round>.md
//   gallery --round <name> [--title <text>]   blind pictures for the owner's rating page
//   geometry --round <name>                   benchmark 7: check every step's picture's geometry
//   speed                                     benchmark 11: time one operation and one command
//   stage1 --part <e1e2|opus|scale|intent|mvp> --dry-run | --approved [--only <chain>]
//                                             the end of stage 1, one part at a time

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildGallery, SITE } from "./gallery.ts";
import { checkRound } from "./geometry.ts";
import { runJudging } from "./judge.ts";
import { chainName, loadChanges, prepareChainDir, RUNS, runChain, runStep } from "./run.ts";
import { formatPlan, planSmoke } from "./smoke.ts";
import { measureSpeed } from "./speed.ts";
import { formatPart, PARTS, type Part, PRIVATE, planPart } from "./stage1.ts";
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
        // Each step's own cost; their sum is the chain's cost (the session total after the last step).
        const total = recs.reduce((sum, r) => sum + r.costUsd, 0);
        const missing = recs.filter((r) => !r.diagramPngUpdated).map((r) => r.step);
        console.log(
          `${chain.arm} r${chain.run}: ${recs.map((r) => `${r.step} $${r.costUsd.toFixed(3)}`).join(", ")}; total $${total.toFixed(3)}` +
            (missing.length > 0 ? `; no new diagram.png at ${missing.join(", ")}` : ""),
        );
      }
      return;
    }
    case "chain": {
      const arm = flag(args, "arm");
      if (arm !== "grafical" && arm !== "raw") {
        console.error("chain needs --arm grafical or --arm raw");
        process.exit(2);
      }
      const model = flag(args, "model") ?? "haiku";
      const run = Number(flag(args, "run") ?? 1);
      mkdirSync(join(RUNS, round), { recursive: true });
      const changes = loadChanges().filter((c) => c.phase1);
      const recs = runChain({ round, arm, model, run, changes });
      for (const r of recs) {
        console.log(
          `${r.step}: $${r.costUsd.toFixed(4)} (session $${r.sessionCostUsd.toFixed(4)}), ${r.wallSeconds.toFixed(0)} s, ${r.turns} turns, error ${r.isError}, new diagram.png ${r.diagramPngUpdated}`,
        );
      }
      const total = recs.reduce((sum, r) => sum + r.costUsd, 0);
      console.log(`total: $${total.toFixed(4)}`);
      return;
    }
    case "judge": {
      // --private: a round on the private reference brief, kept outside the repository.
      const where = args.includes("--private")
        ? { runs: join(PRIVATE, "runs"), brief: join(PRIVATE, "briefs", "reference.md") }
        : undefined;
      runJudging(round, Number(flag(args, "judges") ?? 2), where);
      return;
    }
    case "gallery": {
      const title = flag(args, "title") ?? round;
      const g = buildGallery(round, title);
      console.log(
        `gallery ${g.id}: ${g.diagrams.length} diagrams, ${g.tasks.length} tasks, in ${SITE}; key in ${join(RUNS, round, "gallery-key.json")}`,
      );
      return;
    }
    case "geometry": {
      checkRound(round).then((found) => {
        const counts = new Map<string, number>();
        for (const g of found.values()) {
          for (const d of g.defects) counts.set(d.code, (counts.get(d.code) ?? 0) + 1);
        }
        const failed = [...found].filter(([, g]) => g.error !== undefined).map(([k]) => k);
        console.log(
          `${found.size} pictures checked, ${[...found.values()].filter((g) => g.defects.length > 0).length} with a defect: ${JSON.stringify(Object.fromEntries(counts))}`,
        );
        if (failed.length > 0) console.log(`not checked: ${failed.join(", ")}`);
      });
      return;
    }
    case "stage1": {
      const part = flag(args, "part") as Part | undefined;
      if (part === undefined || !PARTS.includes(part)) {
        console.error(`stage1 needs --part ${PARTS.join("|")}`);
        process.exit(2);
      }
      const plan = planPart(part);
      const only = flag(args, "only");
      if (only !== undefined) {
        plan.chains = plan.chains.filter((c) => chainName(c.arm, c.model, c.run, c.task) === only);
        if (plan.chains.length === 0) {
          console.error(`no chain ${only} in part ${part}; --dry-run lists them`);
          process.exit(2);
        }
      }
      if (args.includes("--dry-run")) {
        console.log(formatPart(plan));
        return;
      }
      if (!args.includes("--approved")) {
        console.error(
          "Real runs cost money and the owner approves them (EXPERIMENTS.md, rule 4).\n" +
            "Use --dry-run to see the plan, or --approved once the owner has approved the total.",
        );
        process.exit(2);
      }
      mkdirSync(join(plan.runs, plan.round), { recursive: true });
      let spent = 0;
      for (const c of plan.chains) {
        const recs = runChain({ round: plan.round, runs: plan.runs, ...c });
        const total = recs.reduce((sum, r) => sum + r.costUsd, 0);
        spent += total;
        const missing = recs.filter((r) => !r.diagramPngUpdated).map((r) => r.step);
        console.log(
          `${chainName(c.arm, c.model, c.run, c.task)}: $${total.toFixed(3)} in ${recs.length} steps` +
            (missing.length > 0 ? `; no new diagram.png at ${missing.join(", ")}` : ""),
        );
      }
      console.log(`part ${part}: $${spent.toFixed(3)} spent`);
      return;
    }
    case "speed": {
      measureSpeed().then((lines) => console.log(lines.join("\n")));
      return;
    }
    case "summary": {
      const out = writeSummary(round);
      mkdirSync(dirname(out.path), { recursive: true });
      writeFileSync(out.path, out.text);
      console.log(`wrote ${out.path}`);
      return;
    }
    default:
      console.error(
        "usage: pnpm bench <baseline|smoke|chain|judge|gallery|geometry|speed|stage1|summary> [options]",
      );
      process.exit(2);
  }
}

main(process.argv.slice(2));
