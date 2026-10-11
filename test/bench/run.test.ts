import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { StepRecord } from "../../bench/run.ts";
import {
  ALLOWED_TOOLS,
  chainSteps,
  claudeArgs,
  draftPrompt,
  loadChanges,
  parseChanges,
  prepareChainDir,
  REPO,
} from "../../bench/run.ts";
import { planSmoke } from "../../bench/smoke.ts";
import { buildNetTable, buildTable, stat } from "../../bench/summary.ts";

describe("claude arguments", () => {
  const base = { prompt: "P", model: "haiku", tools: ["Read"], persist: false };

  it("uses stream-json with --verbose, the budget cap and the model", () => {
    const a = claudeArgs(base);
    expect(a.slice(0, 2)).toEqual(["-p", "P"]);
    expect(a[a.indexOf("--output-format") + 1]).toBe("stream-json");
    expect(a).toContain("--verbose");
    expect(a[a.indexOf("--max-budget-usd") + 1]).toBe("1");
    expect(a[a.indexOf("--model") + 1]).toBe("haiku");
    expect(a[a.indexOf("--allowedTools") + 1]).toBe("Read");
  });

  it("drops --no-session-persistence when a later step resumes", () => {
    expect(claudeArgs(base)).toContain("--no-session-persistence");
    expect(claudeArgs({ ...base, persist: true })).not.toContain("--no-session-persistence");
  });

  it("resumes a session by id", () => {
    const a = claudeArgs({ ...base, persist: true, resume: "abc" });
    expect(a[a.indexOf("--resume") + 1]).toBe("abc");
  });

  it("passes no --allowedTools for the empty baseline", () => {
    expect(claudeArgs({ ...base, tools: [] })).not.toContain("--allowedTools");
  });
});

describe("arms and prompts", () => {
  it("the two arms' prompts differ only in the tool line", () => {
    const g = draftPrompt("grafical").split("\n");
    const r = draftPrompt("raw").split("\n");
    expect(g).toHaveLength(r.length);
    const differing = g.filter((line, i) => line !== r[i]);
    expect(differing).toHaveLength(1);
    expect(differing[0]).toContain("grafical guide");
  });

  it("restricts the grafical arm's Bash to grafical", () => {
    expect(ALLOWED_TOOLS.grafical).toContain("Bash(grafical *)");
    expect(ALLOWED_TOOLS.grafical).not.toContain("Bash");
  });

  it("prepares a run directory with the brief, and a grafical wrapper only for that arm", () => {
    const root = mkdtempSync(join(tmpdir(), "bench-"));
    const g = join(root, "g");
    prepareChainDir(g, "grafical");
    expect(existsSync(join(g, "brief.md"))).toBe(true);
    const wrapper = join(g, "bin", "grafical");
    expect(readFileSync(wrapper, "utf8")).toContain(`${REPO}/src/cli/main.ts`);
    expect(statSync(wrapper).mode & 0o111).not.toBe(0);
    const r = join(root, "r");
    prepareChainDir(r, "raw");
    expect(existsSync(join(r, "bin"))).toBe(false);
    expect(() => prepareChainDir(r, "raw")).toThrow(/exists/);
  });
});

describe("change script", () => {
  it("lists the 8 change types, 4 of them for phase 1", () => {
    const changes = loadChanges();
    expect(changes).toHaveLength(8);
    expect(changes.filter((c) => c.phase1).map((c) => c.id)).toEqual([
      "add-node",
      "move-node",
      "rename-node",
      "remove-node",
    ]);
  });

  it("parses a flat list", () => {
    expect(
      parseChanges("# c\n- id: a\n  type: t\n  phase1: true\n  request: do it: now\n"),
    ).toEqual([{ id: "a", type: "t", phase1: true, request: "do it: now" }]);
  });

  it("builds a draft step and one step per change", () => {
    const steps = chainSteps(
      "raw",
      loadChanges().filter((c) => c.phase1),
    );
    expect(steps.map((s) => s.step)).toEqual([
      "e1",
      "e2-add-node",
      "e2-move-node",
      "e2-rename-node",
      "e2-remove-node",
    ]);
    expect(steps[1]?.prompt).toContain("Change request 1 of 4");
  });
});

describe("smoke plan", () => {
  it("is 6 chains and 30 claude calls, the E2 ones resuming", () => {
    const plan = planSmoke("t");
    expect(plan.chains).toHaveLength(6);
    expect(plan.commands).toHaveLength(30);
    const e2 = plan.commands.filter((c) => c.step.startsWith("e2-"));
    expect(e2).toHaveLength(24);
    for (const c of e2) expect(c.argv).toContain("--resume");
    for (const c of plan.commands) expect(c.argv).not.toContain("--no-session-persistence");
  });

  it("prints the plan on --dry-run without calling claude", () => {
    const out = execFileSync(
      process.execPath,
      [join(REPO, "bench", "cli.ts"), "smoke", "--dry-run"],
      {
        encoding: "utf8",
        // A PATH with no claude: a real call would fail here.
        env: { PATH: join(REPO, "node_modules", ".bin") },
      },
    );
    expect(out).toContain("runs (claude calls): 30");
    expect(out.match(/claude -p /g)).toHaveLength(30);
  });
});

describe("summary", () => {
  const rec = (
    cost: number,
    fresh: number,
    hit: number,
    arm: "raw" | "grafical" = "raw",
  ): StepRecord =>
    ({
      step: "e1",
      arm,
      modelAlias: "haiku",
      isError: false,
      finished: true,
      costUsd: cost,
      wallSeconds: 10,
      apiSeconds: 8,
      turns: 3,
      toolCallTotal: 4,
      imageReads: 1,
      regenerations: 0,
      tokens: { fresh, cacheHitRate: hit },
      grafical: arm === "grafical" ? { rejectedShare: 0.1 } : null,
    }) as unknown as StepRecord;

  it("formats mean and range", () => {
    expect(stat([1, 2, 3], 1)).toBe("2.0 (1.0–3.0)");
    expect(stat([], 1)).toBe("–");
  });

  it("builds one row per cell and a net table minus the baseline", () => {
    const runs = [1, 2, 3].map((i) => ({
      chain: `raw-haiku-r${i}`,
      record: rec(0.1 * i, 1000 * i, 0.5),
    }));
    const table = buildTable(runs, new Map());
    expect(table.split("\n")).toHaveLength(3);
    expect(table).toContain("0.200 (0.100–0.300)");
    const net = buildNetTable(runs, [rec(0.05, 400, 0.6)]);
    expect(net).toContain("0.150 (0.050–0.250)");
    expect(net).toContain("1600 (600–2600)");
  });
});
