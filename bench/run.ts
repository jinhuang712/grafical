// Runs one chain of headless Claude Code calls: an E1 draft, then E2 change
// requests that resume the same session (EXPERIMENTS.md, "Harness").
//
// A chain is (arm, model, run number). Its directory holds the brief, the
// tool and every step's files:
//   bench/runs/<round>/<arm>-<model>-r<n>/steps/<step>/{transcript.jsonl,metrics.json,diagram.png}

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeMetrics, type Metrics, parseTranscript, type StepKind } from "./metrics.ts";

export type Arm = "grafical" | "raw";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RUNS = join(REPO, "bench", "runs");
const PROMPTS = join(REPO, "bench", "prompts");

/** The tools each arm may use. `Bash(grafical *)` keeps the grafical arm from scripting a drawing. */
export const ALLOWED_TOOLS: Record<Arm, string[]> = {
  grafical: ["Bash(grafical *)", "Read", "Write"],
  raw: ["Bash", "Read", "Write", "Edit"],
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

/** The E1 prompt. The two arms differ only in the line that names the tool. */
export function draftPrompt(arm: Arm): string {
  const toolLine = prompt(arm === "grafical" ? "tool-grafical.md" : "tool-raw.md");
  return render(prompt("first-draft.md"), { TOOL_LINE: toolLine });
}

export function changePrompt(n: number, total: number, request: string): string {
  return render(prompt("change.md"), { N: String(n), TOTAL: String(total), REQUEST: request });
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
export function chainSteps(arm: Arm, changes: Change[]): StepSpec[] {
  const steps: StepSpec[] = [{ step: "e1", kind: "draft", prompt: draftPrompt(arm) }];
  changes.forEach((c, i) => {
    steps.push({
      step: `e2-${c.id}`,
      kind: "change",
      prompt: changePrompt(i + 1, changes.length, c.request),
    });
  });
  return steps;
}

export function chainDir(round: string, arm: Arm, model: string, run: number): string {
  return join(RUNS, round, `${arm}-${model}-r${run}`);
}

/** A new, empty directory with the brief and the arm's tool, and nothing else. */
export function prepareChainDir(dir: string, arm: Arm): void {
  if (existsSync(dir)) throw new Error(`run directory exists, refusing to reuse it: ${dir}`);
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(REPO, "bench", "briefs", "catalog-sync.md"), join(dir, "brief.md"));
  if (arm === "grafical") {
    mkdirSync(join(dir, "bin"));
    const wrapper = join(dir, "bin", "grafical");
    writeFileSync(wrapper, `#!/bin/sh\nexec node "${REPO}/src/cli/main.ts" "$@"\n`);
    chmodSync(wrapper, 0o755);
  }
}

export function chainEnv(dir: string, arm: Arm): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (arm === "grafical") env.PATH = `${join(dir, "bin")}:${process.env.PATH ?? ""}`;
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

export interface StepRecord extends Metrics {
  step: string;
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
  const stepDir = join(o.dir, "steps", o.spec.step);
  mkdirSync(stepDir, { recursive: true });
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

  // Keep what the agent made at this step; the next step overwrites diagram.png.
  const hashes: Record<string, string> = { transcript: sha256(transcript) };
  for (const f of ["diagram.png", "diagram.grafical.yaml", "diagram.svg"]) {
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
  });
  const v = versions();
  const record: StepRecord = {
    ...metrics,
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

/** Runs the draft and then each change request, resuming the draft's session. */
export function runChain(o: {
  round: string;
  arm: Arm;
  model: string;
  run: number;
  changes: Change[];
}): StepRecord[] {
  const dir = chainDir(o.round, o.arm, o.model, o.run);
  prepareChainDir(dir, o.arm);
  const records: StepRecord[] = [];
  let session: string | undefined;
  for (const spec of chainSteps(o.arm, o.changes)) {
    // Every step but the last is resumed by the next, so it must stay on disk.
    const rec = runStep({
      dir,
      arm: o.arm,
      model: o.model,
      spec,
      persist: o.changes.length > 0,
      ...(session ? { resume: session } : {}),
    });
    records.push(rec);
    session ??= rec.sessionId ?? undefined;
    if (!session) break; // no session id: a resume is impossible, report the failure instead
  }
  return records;
}
