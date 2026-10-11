import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { StepRecord } from "../../bench/run.ts";
import {
  ALLOWED_TOOLS,
  ARMS,
  chainName,
  chainSteps,
  claudeArgs,
  draftPrompt,
  loadChanges,
  loadIntents,
  MMDC_HOME,
  parseChanges,
  parseCheckAll,
  prepareChainDir,
  REPO,
} from "../../bench/run.ts";
import { planSmoke } from "../../bench/smoke.ts";
import { PARTS, partCommands, planPart } from "../../bench/stage1.ts";
import {
  buildChainTable,
  buildNetTable,
  buildTable,
  type Loaded,
  normalizeChain,
  stat,
} from "../../bench/summary.ts";

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
  it("the arms' prompts differ only in the tool line", () => {
    const r = draftPrompt("raw").split("\n");
    for (const [arm, tool] of [
      ["grafical", "grafical guide"],
      ["mermaid", "mmdc"],
    ] as const) {
      const a = draftPrompt(arm).split("\n");
      expect(a).toHaveLength(r.length);
      const differing = a.filter((line, i) => line !== r[i]);
      expect(differing).toHaveLength(1);
      expect(differing[0]).toContain(tool);
    }
  });

  it("gives every arm the same tools, with full Bash", () => {
    for (const arm of ARMS) expect(ALLOWED_TOOLS[arm]).toEqual(ALLOWED_TOOLS.raw);
    expect(ALLOWED_TOOLS.grafical).toContain("Bash");
    expect(ALLOWED_TOOLS.grafical.some((t) => t.startsWith("Bash("))).toBe(false);
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

  it("gives a task its own brief, a loose prompt none, and the Mermaid arm an mmdc wrapper", () => {
    const root = mkdtempSync(join(tmpdir(), "bench-"));
    const s = join(root, "s");
    prepareChainDir(s, "raw", { id: "scale-10", brief: "scale-10.md" });
    expect(readFileSync(join(s, "brief.md"), "utf8")).toContain("notify");
    const i = join(root, "i");
    const intent = loadIntents()[0];
    prepareChainDir(i, "grafical", intent);
    expect(existsSync(join(i, "brief.md"))).toBe(false);
    expect(chainSteps("grafical", [], intent)[0]?.prompt).toContain(intent?.request ?? "?");
    expect(chainName("raw", "haiku", 2, intent)).toBe(`${intent?.id}.raw-haiku-r2`);
    if (existsSync(join(MMDC_HOME, "node_modules", ".bin", "mmdc"))) {
      const m = join(root, "m");
      prepareChainDir(m, "mermaid");
      expect(readFileSync(join(m, "bin", "mmdc"), "utf8")).toContain("puppeteer.json");
    }
  });

  it("lists 10 loose prompts for E3, each about three sentences", () => {
    const intents = loadIntents();
    expect(intents).toHaveLength(10);
    for (const t of intents) {
      const sentences = (t.request ?? "").split(/[.!?](\s|$)/).filter((x) => x.trim().length > 3);
      expect(sentences.length).toBeGreaterThanOrEqual(2);
      expect(sentences.length).toBeLessThanOrEqual(4);
    }
  });
});

describe("stage 1 plan", () => {
  it("has the parts and sizes the owner approved", () => {
    const sizes = Object.fromEntries(PARTS.map((p) => [p, partCommands(planPart(p)).length]));
    expect(sizes).toEqual({ e1e2: 81, opus: 6, scale: 27, intent: 10, mvp: 3 });
    expect(planPart("mvp").runs).not.toContain(REPO);
  });

  it("gives every model the same prompt, word for word", () => {
    const prompts = (part: "e1e2" | "opus") =>
      new Map(
        partCommands(planPart(part))
          .filter((c) => c.step === "e1")
          .map((c) => [c.chain.split("-")[0], c.argv[1]]),
      );
    const haiku = prompts("e1e2");
    const opus = prompts("opus");
    for (const [arm, prompt] of opus) {
      expect(prompt).toBe(haiku.get(arm));
      expect(prompt).not.toMatch(/haiku|opus|sonnet/i);
    }
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
    // Both arms get the same tools, and none is narrowed to `Bash(grafical *)`.
    expect(out.match(/--allowedTools Bash,Read,Write,Edit/g)).toHaveLength(30);
    expect(out).not.toContain("Bash(grafical");
  });
});

describe("defect split from grafical check --all", () => {
  it("counts engine and agent defects", () => {
    const out = JSON.stringify({
      ok: false,
      changed: [],
      errors: [],
      defects: [{ owner: "engine" }, { owner: "agent" }, { owner: "engine" }],
    });
    expect(parseCheckAll(out)).toEqual({ engineDefects: 2, agentDefects: 1 });
    expect(parseCheckAll('{"ok":true,"defects":[]}')).toEqual({
      engineDefects: 0,
      agentDefects: 0,
    });
  });

  it("is null when the CLI has no --all yet: no output, or defects with no owner", () => {
    expect(parseCheckAll("")).toBeNull();
    expect(parseCheckAll('{"ok":false,"defects":[{"code":"x"}]}')).toBeNull();
    expect(parseCheckAll("error: unknown option '--all'")).toBeNull();
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
      grafical: arm === "grafical" ? { rejectedShare: 0.1, permissionDenials: 0 } : null,
      offTool: arm === "grafical" ? 0 : null,
      engineDefects: arm === "grafical" ? 2 : null,
      agentDefects: arm === "grafical" ? 0 : null,
      diagramPngUpdated: true,
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

  it("sums a chain's per-step costs, and shows a step with no new picture", () => {
    const step = (name: string, cost: number, png = true): Loaded => ({
      chain: "grafical-haiku-r1",
      record: { ...rec(cost, 1, 0.5, "grafical"), step: name, diagramPngUpdated: png },
    });
    const runs = [step("e1", 0.03, false), step("e2-add-node", 0.005)];
    expect(buildChainTable(runs)).toContain("| grafical | haiku | 1 | 0.035 (0.035–0.035) |");
    const table = buildTable(runs, new Map());
    expect(table).toContain("0/1"); // e1 finished without diagram.png
    expect(table).toContain("1/1");
  });

  it("turns old running-total records into per-step ones, in step order", () => {
    const old = (name: string, total: number, api: number) =>
      ({ step: name, arm: "grafical", costUsd: total, apiSeconds: api }) as unknown as StepRecord;
    const fixed = normalizeChain([
      old("e2-move-node", 0.0375, 124),
      old("e1", 0.0309, 109),
      old("e2-add-node", 0.036, 121),
    ]);
    expect(fixed.map((r) => r.step)).toEqual(["e1", "e2-add-node", "e2-move-node"]);
    expect(fixed.map((r) => r.costUsd.toFixed(4))).toEqual(["0.0309", "0.0051", "0.0015"]);
    expect(fixed.map((r) => r.sessionCostUsd)).toEqual([0.0309, 0.036, 0.0375]);
    // New records already carry sessionCostUsd and are left alone.
    const fresh = { ...old("e1", 0.01, 1), sessionCostUsd: 0.5 };
    expect(normalizeChain([fresh])[0]?.costUsd).toBe(0.01);
  });
});
