// Blind judging (EXPERIMENTS.md, "Judging"). Two Opus judges score each
// picture. Each judge gets its own random labels, drawn with a crypto RNG, and
// sees one picture per call in a directory that holds nothing else. The key
// that maps labels back to pictures is stored apart from what the judges see.

import { spawnSync } from "node:child_process";
import { randomInt } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { loadChanges, REPO, RUNS, render } from "./run.ts";

export const CRITERIA = ["accuracy", "clarity", "visual", "defects", "fit"] as const;
export type Criterion = (typeof CRITERIA)[number];

/** Something to judge: the picture a step produced. */
export interface Item {
  /** `<chain>/<step>`, for example `grafical-haiku-r1/e2-rename-node`. */
  id: string;
  picture: string;
  /** E2 only: the picture before the request, and the request. */
  before?: string;
  request?: string;
}

export interface Verdict {
  scores: Record<Criterion, number>;
  /** Out of 25. */
  total: number;
  invented: string[];
  missing: string[];
  defectList: string[];
  /** E2 only: what changed besides the request. */
  otherChanges: string[];
  notes: string;
}

export type Rng = (maxExclusive: number) => number;
export const cryptoRng: Rng = (n) => randomInt(n);

/** Fisher-Yates. */
export function shuffle<T>(xs: readonly T[], rng: Rng = cryptoRng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/**
 * Random labels for one judge. The label says nothing about the item, and
 * the order the judge sees them in is shuffled too. Returns the key
 * (label -> item id) and the shuffled order of labels.
 */
export function blindLabels(
  ids: readonly string[],
  rng: Rng = cryptoRng,
): { key: Record<string, string>; order: string[] } {
  const numbers = shuffle(
    Array.from({ length: 9000 }, (_, i) => 1000 + i),
    rng,
  ).slice(0, ids.length);
  const key: Record<string, string> = {};
  ids.forEach((id, i) => {
    key[`P${numbers[i]}`] = id;
  });
  return { key, order: shuffle(Object.keys(key), rng) };
}

/** Pulls the JSON object out of a reply, which may be wrapped in a code fence or prose. */
export function parseVerdict(reply: string): Verdict {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("no JSON object in the judge's reply");
  const j = JSON.parse(reply.slice(start, end + 1));
  const scores = {} as Record<Criterion, number>;
  for (const c of CRITERIA) {
    const v = j[c];
    if (!Number.isInteger(v) || v < 1 || v > 5)
      throw new Error(`${c} must be a whole number 1-5, got ${v}`);
    scores[c] = v;
  }
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  return {
    scores,
    total: CRITERIA.reduce((a, c) => a + scores[c], 0),
    invented: list(j.invented),
    missing: list(j.missing),
    defectList: list(j.defect_list),
    otherChanges: list(j.other_changes),
    notes: typeof j.notes === "string" ? j.notes : "",
  };
}

const OTHER_CHANGES = `For a change request you also see the picture before the change. Answer: what changed besides the request? Count nodes that moved, resized or were relabelled, edges that were rerouted, and anything added or removed that the request did not name. List each in \`other_changes\`, or leave it empty. Also say in \`notes\` whether the request itself was done right.`;

/** The prompt for one item. `label` is the only name the judge knows it by. */
export function judgePrompt(o: { brief: string; request?: string; hasBefore: boolean }): string {
  const template = readFileSync(join(REPO, "bench", "prompts", "judge.md"), "utf8").trim();
  const files = o.hasBefore
    ? "- `before.png`: the diagram before the request\n- `picture.png`: the diagram after the request. Score this one."
    : "- `picture.png`: the diagram. Score this one.";
  return render(template, {
    BRIEF: o.brief.trim(),
    REQUEST_BLOCK: o.request ? `## The change request\n\n${o.request}` : "",
    FILES: files,
    OTHER_CHANGES: o.request ? OTHER_CHANGES : "",
    OTHER_CHANGES_FIELD: o.request ? ', "other_changes": []' : "",
  });
}

export function judgeArgs(prompt: string): string[] {
  return [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--model",
    "opus",
    "--max-budget-usd",
    "1",
    "--safe-mode",
    "--permission-mode",
    "dontAsk",
    "--permission-prompts",
    "none",
    "--allowedTools",
    "Read",
    "--no-session-persistence",
  ];
}

/** Every picture a round produced, with the request and the previous picture for E2 steps. */
export function collectItems(round: string, runs = RUNS): Item[] {
  const changes = new Map(loadChanges().map((c) => [`e2-${c.id}`, c.request]));
  const items: Item[] = [];
  const root = join(runs, round);
  for (const chain of readdirSync(root).sort()) {
    const steps = join(root, chain, "steps");
    if (!existsSync(steps) || chain.startsWith("baseline")) continue;
    let previous: string | undefined;
    // "e1" sorts first; E2 steps run in the order of the change script.
    const order = ["e1", ...loadChanges().map((c) => `e2-${c.id}`)];
    for (const step of order) {
      const picture = join(steps, step, "diagram.png");
      if (!existsSync(picture)) continue;
      const request = changes.get(step);
      items.push({
        id: `${chain}/${step}`,
        picture,
        ...(request && previous ? { before: previous, request } : {}),
      });
      previous = picture;
    }
  }
  return items;
}

export interface JudgedRow {
  judge: string;
  item: string;
  verdict: Verdict | null;
  error?: string;
}

/** Runs every judge on every item. Real calls: only after the owner approved the cost. */
export function runJudging(
  round: string,
  judgeCount: number,
  /** A round kept outside the repository, such as the MVP bar's on the private brief. */
  where: { runs: string; brief: string } = {
    runs: RUNS,
    brief: join(REPO, "bench", "briefs", "catalog-sync.md"),
  },
): void {
  const items = collectItems(round, where.runs);
  const brief = readFileSync(where.brief, "utf8");
  const base = join(where.runs, round, "judging");
  const keyDir = join(base, "keys"); // outside every judge's working directory
  mkdirSync(keyDir, { recursive: true });
  const rows: JudgedRow[] = [];
  for (let j = 1; j <= judgeCount; j++) {
    const judge = `judge-${j}`;
    const { key, order } = blindLabels(items.map((i) => i.id));
    writeFileSync(join(keyDir, `${judge}.json`), `${JSON.stringify(key, null, 2)}\n`);
    for (const label of order) {
      const item = items.find((i) => i.id === key[label]) as Item;
      const dir = join(base, judge, label);
      mkdirSync(dir, { recursive: true });
      copyFileSync(item.picture, join(dir, "picture.png"));
      if (item.before) copyFileSync(item.before, join(dir, "before.png"));
      const prompt = judgePrompt({
        brief,
        hasBefore: item.before !== undefined,
        ...(item.request ? { request: item.request } : {}),
      });
      const res = spawnSync("claude", judgeArgs(prompt), { cwd: dir, encoding: "utf8" });
      try {
        const outer = JSON.parse(res.stdout);
        writeFileSync(join(dir, "reply.json"), res.stdout);
        rows.push({ judge, item: item.id, verdict: parseVerdict(String(outer.result)) });
      } catch (e) {
        rows.push({ judge, item: item.id, verdict: null, error: String(e) });
      }
    }
  }
  writeFileSync(join(base, "scores.json"), `${JSON.stringify(rows, null, 2)}\n`);
}
