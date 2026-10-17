// Runs one chain of headless Claude Code calls: an E1 draft, then E2 change
// requests that resume the same session, then a reflection that resumes it once
// more with no tools (EXPERIMENTS.md, "Harness").
//
// A chain is (task, arm, model, run number). Its directory holds the brief, the
// tool and every step's files:
//   bench/runs/<round>/[<task>.]<arm>-<model>-r<n>/steps/<step>/{transcript.jsonl,metrics.json,diagram.png}
//   bench/runs/<round>/[<task>.]<arm>-<model>-r<n>/reflection/{prompt.txt,transcript.jsonl,reflection.md,cost.json}
// The task prefix is left out for the public catalog-sync brief, the E1 and E2 task.

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  computeMetrics,
  type Metrics,
  parseTranscript,
  type StepKind,
  stepTotal,
} from "./metrics.ts";

export type Arm = "grafical" | "raw" | "mermaid";
export const ARMS: Arm[] = ["grafical", "raw", "mermaid"];

/**
 * What a chain draws. Without a task: the public catalog-sync brief (E1, E2).
 * With `brief`: another brief in bench/briefs/ (E4). With `request`: a loose
 * prompt and no brief at all (E3). `briefFile` is an absolute path to a brief
 * kept outside the repository, such as the private reference brief.
 */
export interface Task {
  id: string;
  brief?: string;
  briefFile?: string;
  request?: string;
}

/** Where mermaid-cli is installed for the Mermaid arm: outside the repository, with a puppeteer config. */
export const MMDC_HOME =
  process.env.GRAFICAL_BENCH_MMDC ?? join(homedir(), ".cache", "grafical-bench", "mermaid");

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RUNS = join(REPO, "bench", "runs");
const PROMPTS = join(REPO, "bench", "prompts");

/**
 * The tools each arm may use: the same for both, so the comparison is fair. A narrower Bash
 * made don't-ask mode refuse `grafical apply f.yaml b.yaml; echo $?`, and the agent fell back
 * to one command per call. The grafical arm's prompt says to draw only with grafical, and the
 * `offTool` metric audits that it did (hypothesis H4).
 */
const BOTH_ARMS_TOOLS = ["Bash", "Read", "Write", "Edit"];
export const ALLOWED_TOOLS: Record<Arm, string[]> = {
  grafical: BOTH_ARMS_TOOLS,
  raw: BOTH_ARMS_TOOLS,
  mermaid: BOTH_ARMS_TOOLS,
};

/** The file each arm keeps its diagram in, whose change tells whether a change step edited it. */
export const SOURCE_FILE: Record<Arm, string | null> = {
  grafical: "diagram.grafical.yaml",
  raw: null,
  mermaid: "diagram.mmd",
};

export interface Change {
  id: string;
  type: string;
  phase1: boolean;
  request: string;
}

export interface StepSpec {
  /** "e1", or "e2-<change id>". */
  step: string;
  kind: StepKind;
  prompt: string;
}

export interface ClaudeCall {
  args: string[];
  /** The step must be resumable later, so sessions are saved to disk. */
  persist: boolean;
}

/** The arguments of one `claude` call. Every flag here was checked against `claude --help` (2.1.296). */
export function claudeArgs(o: {
  prompt: string;
  model: string;
  tools: string[];
  /** Session to continue. Set for E2 steps. */
  resume?: string;
  /** Keep the session on disk so a later step can resume it. */
  persist: boolean;
}): string[] {
  // The prompt comes first: --allowedTools takes several values and must not swallow it.
  const args = [
    "-p",
    o.prompt,
    // stream-json in print mode is refused without --verbose.
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    o.model,
    "--max-budget-usd",
    "1",
    "--effort",
    "medium",
    // No CLAUDE.md, skills, MCP servers or hooks from the host: every run sees the same setup.
    "--safe-mode",
    // Anything not in the allow list is denied: never asked, never auto-approved.
    "--permission-mode",
    "dontAsk",
    "--permission-prompts",
    "none",
  ];
  if (o.tools.length > 0) args.push("--allowedTools", o.tools.join(","));
  if (o.resume) args.push("--resume", o.resume);
  if (!o.persist) args.push("--no-session-persistence");
  return args;
}

export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
}

function prompt(name: string): string {
  return readFileSync(join(PROMPTS, name), "utf8").trim();
}

/** The E1 prompt. The arms differ only in the line that names the tool. */
export function draftPrompt(arm: Arm): string {
  return render(prompt("first-draft.md"), { TOOL_LINE: prompt(`tool-${arm}.md`) });
}

/** The E3 prompt: the loose request, then the same tool line and deliverable as a draft. */
export function intentPrompt(arm: Arm, request: string): string {
  return render(prompt("intent.md"), { REQUEST: request, TOOL_LINE: prompt(`tool-${arm}.md`) });
}

/** The 10 loose prompts of E3, from bench/prompts/intent.yaml. */
export function loadIntents(file = "intent.yaml"): Task[] {
  const list = parse(readFileSync(join(PROMPTS, file), "utf8")) as {
    id: string;
    prompt: string;
  }[];
  return list.map((x) => ({ id: x.id, request: x.prompt }));
}

export function changePrompt(n: number, total: number, request: string): string {
  return render(prompt("change.md"), { N: String(n), TOTAL: String(total), REQUEST: request });
}

/** What the reflection calls the arm's tool. */
const TOOL_NAME: Record<Arm, string> = {
  grafical: "grafical",
  mermaid: "mmdc",
  raw: "the tools you used",
};

/**
 * The reflection asked after a chain's last step: how the agent drew, why it changed its
 * draft, and where the tool got in the way (EXPERIMENTS.md, "Harness").
 */
export function reflectPrompt(arm: Arm): string {
  return render(prompt("reflect.md"), { TOOL: TOOL_NAME[arm] });
}

/** The reflection's call: it resumes the chain's session with no tools, so nothing can change. */
export function reflectArgs(arm: Arm, model: string, session: string): string[] {
  return claudeArgs({
    prompt: reflectPrompt(arm),
    model,
    tools: [],
    persist: false,
    resume: session,
  });
}

/** Reads `bench/changes/<name>.yaml`: a flat list of `key: value` items. */
export function parseChanges(text: string): Change[] {
  const items: Record<string, string>[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line === "" || line.trimStart().startsWith("#")) continue;
    const m = /^(- | {2})(\w+): ?(.*)$/.exec(line);
    if (!m) throw new Error(`cannot read changes line: ${line}`);
    if (m[1] === "- ") items.push({});
    const item = items[items.length - 1];
    if (!item) throw new Error(`value before the first item: ${line}`);
    item[m[2] as string] = (m[3] as string).trim();
  }
  return items.map((it) => {
    const { id, type, phase1, request } = it;
    if (!id || !type || !phase1 || !request) throw new Error(`incomplete change item: ${id}`);
    return { id, type, phase1: phase1 === "true", request };
  });
}

export function loadChanges(): Change[] {
  return parseChanges(readFileSync(join(REPO, "bench", "changes", "catalog-sync.yaml"), "utf8"));
}

/** The steps of one chain: the draft, then the change requests (the E2 part), in order. */
export function chainSteps(arm: Arm, changes: Change[], task?: Task): StepSpec[] {
  const first = task?.request ? intentPrompt(arm, task.request) : draftPrompt(arm);
  const steps: StepSpec[] = [{ step: "e1", kind: "draft", prompt: first }];
  changes.forEach((c, i) => {
    steps.push({
      step: `e2-${c.id}`,
      kind: "change",
      prompt: changePrompt(i + 1, changes.length, c.request),
    });
  });
  return steps;
}

/** A chain's directory name: `[<task>.]<arm>-<model>-r<run>`. */
export function chainName(arm: Arm, model: string, run: number, task?: Task): string {
  return `${task ? `${task.id}.` : ""}${arm}-${model}-r${run}`;
}

export function chainDir(round: string, arm: Arm, model: string, run: number, task?: Task): string {
  return join(RUNS, round, chainName(arm, model, run, task));
}

function wrapper(dir: string, name: string, body: string): void {
  mkdirSync(join(dir, "bin"), { recursive: true });
  const file = join(dir, "bin", name);
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, 0o755);
}

/**
 * A new, empty directory with the task's brief and the arm's tool, and nothing else.
 * With `hints` false, the grafical arm's tool prints no hint lines (DESIGN.md, "Records over prose"), for comparing.
 */
export function prepareChainDir(dir: string, arm: Arm, task?: Task, hints = true): void {
  if (existsSync(dir)) throw new Error(`run directory exists, refusing to reuse it: ${dir}`);
  mkdirSync(dir, { recursive: true });
  if (!task?.request) {
    const brief =
      task?.briefFile ?? join(REPO, "bench", "briefs", task?.brief ?? "catalog-sync.md");
    copyFileSync(brief, join(dir, "brief.md"));
  }
  if (arm === "grafical" && hints)
    wrapper(dir, "grafical", `exec node "${REPO}/src/cli/main.ts" "$@"`);
  if (arm === "grafical" && !hints) {
    wrapper(
      dir,
      "grafical",
      `out=$(node "${REPO}/src/cli/main.ts" "$@"); code=$?\n[ -n "$out" ] && printf '%s\\n' "$out" | grep -v '^hint: '\nexit $code`,
    );
  }
  if (arm === "mermaid") {
    const mmdc = join(MMDC_HOME, "node_modules", ".bin", "mmdc");
    if (!existsSync(mmdc)) {
      throw new Error(
        `mermaid-cli is not installed in ${MMDC_HOME}: PUPPETEER_SKIP_DOWNLOAD=true npm install --prefix ${MMDC_HOME} @mermaid-js/mermaid-cli, then write ${join(MMDC_HOME, "puppeteer.json")} with the Chrome executablePath`,
      );
    }
    wrapper(dir, "mmdc", `exec "${mmdc}" -p "${join(MMDC_HOME, "puppeteer.json")}" "$@"`);
  }
}

export function chainEnv(dir: string, arm: Arm): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (arm !== "raw") env.PATH = `${join(dir, "bin")}:${process.env.PATH ?? ""}`;
  return env;
}

export function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export function versions(): { claude: string; grafical: string } {
  const claude = execFileSync("claude", ["--version"], { encoding: "utf8" }).trim();
  const grafical = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: REPO,
    encoding: "utf8",
  }).trim();
  return { claude, grafical };
}

/** The defects of a diagram, split by who must fix them. */
export interface DefectSplit {
  engineDefects: number;
  agentDefects: number;
}

/**
 * Reads the output of `grafical check <file> --all --json`. null when it is not that report:
 * an older CLI that has no `--all` prints nothing on stdout, or defects with no `owner`.
 */
export function parseCheckAll(stdout: string): DefectSplit | null {
  let j: { defects?: { owner?: string }[] };
  try {
    j = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (!Array.isArray(j.defects)) return null;
  if (j.defects.some((d) => d.owner !== "agent" && d.owner !== "engine")) return null;
  const engineDefects = j.defects.filter((d) => d.owner === "engine").length;
  return { engineDefects, agentDefects: j.defects.length - engineDefects };
}

/** Runs the check on the step's diagram. null counts, and the reason, when it cannot. */
function checkAll(dir: string, file: string): { split: DefectSplit | null; note: string | null } {
  if (!existsSync(join(dir, file))) return { split: null, note: `no ${file}` };
  const res = spawnSync(join(dir, "bin", "grafical"), ["check", file, "--all", "--json"], {
    cwd: dir,
    encoding: "utf8",
    timeout: 2 * 60 * 1000,
  });
  const split = parseCheckAll(res.stdout ?? "");
  if (split) return { split, note: null };
  const why = (res.stderr ?? "").trim().split("\n")[0] ?? "";
  return { split: null, note: `check --all not available: ${why || `exit ${res.status}`}` };
}

export interface StepRecord extends Metrics {
  step: string;
  /** Whether `diagram.png` existed when the step ended. False means the step did not deliver. */
  diagramPng: boolean;
  /** The picture is new: it did not exist before the step, or the step changed it. */
  diagramPngUpdated: boolean;
  /** Finished with no error and a new picture. */
  complete: boolean;
  /**
   * The arm's diagram file (grafical's YAML, Mermaid's .mmd) changed during the
   * step. A change step that leaves it untouched made no edit, whatever the
   * agent reported. null for the raw arm.
   */
  diagramChanged: boolean | null;
  /** `owner: "engine"` defects in the step's diagram. null for the raw arm, or if the check was unavailable. */
  engineDefects: number | null;
  /** `owner: "agent"` defects in the step's diagram. */
  agentDefects: number | null;
  /** Why the two counts above are null, when they are. */
  defectCheckNote: string | null;
  arm: Arm | "baseline";
  modelAlias: string;
  claudeVersion: string;
  graficalCommit: string;
  hashes: Record<string, string>;
}

/** Runs one headless call in `dir`, then stores its transcript, metrics, picture and hashes. */
export function runStep(o: {
  dir: string;
  arm: Arm | "baseline";
  model: string;
  spec: StepSpec;
  resume?: string;
  /** The session's running totals after the previous step; omit for a first step. */
  previous?: { costUsd: number; apiSeconds: number };
  persist: boolean;
}): StepRecord {
  const tools = o.arm === "baseline" ? [] : ALLOWED_TOOLS[o.arm];
  const args = claudeArgs({
    prompt: o.spec.prompt,
    model: o.model,
    tools,
    persist: o.persist,
    ...(o.resume ? { resume: o.resume } : {}),
  });
  const pngFile = join(o.dir, "diagram.png");
  const pngBefore = existsSync(pngFile) ? sha256(pngFile) : null;
  const source = o.arm === "baseline" ? null : SOURCE_FILE[o.arm];
  const sourceFile = source === null ? null : join(o.dir, source);
  const sourceBefore = sourceFile && existsSync(sourceFile) ? sha256(sourceFile) : null;
  const stepDir = join(o.dir, "steps", o.spec.step);
  mkdirSync(stepDir, { recursive: true });
  // The exact prompt, so the rating page can show the request as the agent saw it.
  writeFileSync(join(stepDir, "prompt.txt"), o.spec.prompt);
  const env = o.arm === "baseline" ? process.env : chainEnv(o.dir, o.arm);
  const res = spawnSync("claude", args, {
    cwd: o.dir,
    env,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
  });
  const transcript = join(stepDir, "transcript.jsonl");
  writeFileSync(transcript, res.stdout ?? "");
  if (res.stderr) writeFileSync(join(stepDir, "stderr.txt"), res.stderr);

  // Keep what the agent made at this step; the next step overwrites diagram.png. An
  // agent may name its grafical file as its help suggests, `<name>.grafical.yaml`.
  const hashes: Record<string, string> = { transcript: sha256(transcript) };
  const named = readdirSync(o.dir).filter((f) => f.endsWith(".grafical.yaml"));
  const kept = new Set([
    "diagram.png",
    "diagram.grafical.yaml",
    "diagram.svg",
    "diagram.mmd",
    ...named,
  ]);
  for (const f of kept) {
    const src = join(o.dir, f);
    if (existsSync(src)) {
      copyFileSync(src, join(stepDir, f));
      hashes[f] = sha256(src);
    }
  }

  const events = parseTranscript(readFileSync(transcript, "utf8"));
  const metrics = computeMetrics(events, {
    arm: o.arm === "baseline" ? "raw" : o.arm,
    kind: o.spec.kind,
    ...(o.previous ? { previous: o.previous } : {}),
  });
  const diagramPng = existsSync(pngFile);
  const diagramPngUpdated = diagramPng && sha256(pngFile) !== pngBefore;
  const defects =
    o.arm === "grafical"
      ? checkAll(o.dir, "diagram.grafical.yaml")
      : { split: null, note: "raw arm: no grafical diagram" };
  const v = versions();
  const record: StepRecord = {
    ...metrics,
    diagramPng,
    diagramPngUpdated,
    complete: metrics.finished && !metrics.isError && diagramPngUpdated,
    diagramChanged:
      sourceFile === null
        ? null
        : (existsSync(sourceFile) ? sha256(sourceFile) : null) !== sourceBefore,
    engineDefects: defects.split?.engineDefects ?? null,
    agentDefects: defects.split?.agentDefects ?? null,
    defectCheckNote: defects.note,
    step: o.spec.step,
    arm: o.arm,
    modelAlias: o.model,
    claudeVersion: v.claude,
    graficalCommit: v.grafical,
    hashes,
  };
  writeFileSync(join(stepDir, "metrics.json"), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

/**
 * Asks the chain's agent to reflect, and keeps its report in `<chain>/reflection/`, outside
 * the steps that every metric reads. Returns the call's own cost.
 */
export function runReflection(o: {
  dir: string;
  arm: Arm;
  model: string;
  session: string;
  /** The session's running cost after the chain's last step. */
  previousCostUsd: number;
}): number {
  const out = join(o.dir, "reflection");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "prompt.txt"), reflectPrompt(o.arm));
  const res = spawnSync("claude", reflectArgs(o.arm, o.model, o.session), {
    cwd: o.dir,
    env: chainEnv(o.dir, o.arm),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
  });
  writeFileSync(join(out, "transcript.jsonl"), res.stdout ?? "");
  if (res.stderr) writeFileSync(join(out, "stderr.txt"), res.stderr);
  const result = [...parseTranscript(res.stdout ?? "")].reverse().find((e) => e.type === "result");
  const report: string = typeof result?.result === "string" ? result.result.trim() : "";
  writeFileSync(join(out, "reflection.md"), `${report}\n`);
  const sessionCostUsd: number = result?.total_cost_usd ?? 0;
  const costUsd = stepTotal(sessionCostUsd, o.previousCostUsd);
  writeFileSync(
    join(out, "cost.json"),
    `${JSON.stringify({ costUsd, sessionCostUsd, isError: result?.is_error === true }, null, 2)}\n`,
  );
  return costUsd;
}

/**
 * Every chain's reflection in a round's directory, as one Markdown document: a heading per
 * chain, in name order, then its report, and what the reflections cost together.
 */
export function collectReflections(roundDir: string): string {
  const chains = existsSync(roundDir) ? readdirSync(roundDir).sort() : [];
  const parts: string[] = [];
  let cost = 0;
  for (const chain of chains) {
    const file = join(roundDir, chain, "reflection", "reflection.md");
    if (!existsSync(file)) continue;
    const costFile = join(roundDir, chain, "reflection", "cost.json");
    if (existsSync(costFile)) cost += JSON.parse(readFileSync(costFile, "utf8")).costUsd ?? 0;
    // A chain's report keeps its own headings, one level down.
    const report = readFileSync(file, "utf8").trim().replace(/^## /gm, "### ");
    parts.push(`## ${chain}\n\n${report || "(no report)"}`);
  }
  return [
    `# Reflections: ${parts.length} chain${parts.length === 1 ? "" : "s"}, $${cost.toFixed(3)}`,
    ...parts,
  ].join("\n\n");
}

/** A chain's steps, and what its reflection cost, or null when no session was left to resume. */
export interface ChainResult {
  steps: StepRecord[];
  reflectionUsd: number | null;
}

/** Runs the draft and then each change request, resuming the draft's session, then the reflection. */
export function runChain(o: {
  round: string;
  arm: Arm;
  model: string;
  run: number;
  changes: Change[];
  task?: Task;
  /** Where the round's directory lives, when not under bench/runs (private briefs). */
  runs?: string;
  /** false: the grafical tool prints no hints (DESIGN.md, "Records over prose"). */
  hints?: boolean;
}): ChainResult {
  const dir = join(o.runs ?? RUNS, o.round, chainName(o.arm, o.model, o.run, o.task));
  prepareChainDir(dir, o.arm, o.task, o.hints ?? true);
  const records: StepRecord[] = [];
  let session: string | undefined;
  let previous: { costUsd: number; apiSeconds: number } | undefined;
  for (const spec of chainSteps(o.arm, o.changes, o.task)) {
    // Every step is resumed by the next or by the reflection, so it must stay on disk.
    const rec = runStep({
      dir,
      arm: o.arm,
      model: o.model,
      spec,
      persist: true,
      ...(session ? { resume: session } : {}),
      ...(previous ? { previous } : {}),
    });
    records.push(rec);
    previous = { costUsd: rec.sessionCostUsd, apiSeconds: rec.sessionApiSeconds };
    session ??= rec.sessionId ?? undefined;
    if (!session) break; // no session id: a resume is impossible, report the failure instead
  }
  const reflectionUsd =
    session === undefined
      ? null
      : runReflection({
          dir,
          arm: o.arm,
          model: o.model,
          session,
          previousCostUsd: previous?.costUsd ?? 0,
        });
  return { steps: records, reflectionUsd };
}
