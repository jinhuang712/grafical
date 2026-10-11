// Builds the owner's blind rating gallery for one round (EXPERIMENTS.md).
//
//   pnpm bench gallery --round <name>
//
// Each chain of the round gets a random letter (A, B, ...). The pictures are
// copied under that letter into bench/runs/gallery-site/, with a manifest the
// rating page reads. Which arm each letter stands for is written only to
// bench/runs/<round>/gallery-key.json, which is never published: the owner
// rates blind, and the key is revealed after the round is rated.
//
// A round is one task drawn by every chain (E1 and E2: the draft and each change
// request), or several tasks, one draft each, when chains carry a task prefix
// (`<task>.<arm>-<model>-r<n>`): the scale briefs of E4, or E3's loose prompts,
// which the owner accepts or rejects. A letter stands for the same arm, model
// and run in every task of a round.

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
import { parse } from "yaml";
import { loadChanges, loadIntents, REPO, RUNS } from "./run.ts";

export const SITE = join(RUNS, "gallery-site");

interface StepMetrics {
  step: string;
  arm: string;
  modelAlias: string;
  graficalCommit: string;
  diagramPng: boolean;
  diagramPngUpdated: boolean;
}

interface Picture {
  /** Path relative to the page. null when the step left no picture. */
  src: string | null;
  /** The step made no new picture: `src` is the previous step's, if any. */
  unchanged: boolean;
}

export interface GalleryTask {
  id: string;
  /** "look": a picture of a feature for the owner to accept or reject, made outside this builder. */
  kind: "draft" | "change" | "intent" | "look";
  title: string;
  /** The request as the agent saw it: a change step's, or an intent task's loose prompt. */
  request?: string;
  /** The brief of this task, when the round's tasks have different briefs. */
  brief?: string;
  /** Per diagram letter. For a change: the picture before and after it. */
  pictures: Record<string, { before?: Picture; after: Picture }>;
}

export interface GalleryRound {
  id: string;
  title: string;
  model: string;
  brief: string;
  diagrams: string[];
  tasks: GalleryTask[];
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function readMetrics(chainDir: string, step: string): StepMetrics | null {
  const file = join(chainDir, "steps", step, "metrics.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as StepMetrics) : null;
}

/** The change request as the agent saw it: from prompt.txt, or from the changes file at the run's commit. */
function requestOf(chainDir: string, step: string, commit: string): string | undefined {
  const promptFile = join(chainDir, "steps", step, "prompt.txt");
  const id = step.replace(/^e2-/, "");
  if (existsSync(promptFile)) {
    const m = readFileSync(promptFile, "utf8").match(/Change request \d+ of \d+: (.*)/);
    if (m?.[1]) return m[1].trim();
  }
  const res = spawnSync("git", ["-C", REPO, "show", `${commit}:bench/changes/catalog-sync.yaml`], {
    encoding: "utf8",
  });
  if (res.status === 0) {
    const list = parse(res.stdout) as { id: string; request: string }[];
    return list.find((c) => c.id === id)?.request;
  }
  return loadChanges().find((c) => c.id === id)?.request;
}

/** `[<task>.]<arm>-<model>-r<n>`: the task, and the chain's identity across tasks. */
const CHAIN = /^(?:([\w-]+)\.)?((grafical|raw|mermaid)-.+-r\d+)$/;

function copyPicture(src: string, imgDir: string, round: string, name: string): string | null {
  if (!existsSync(src)) return null;
  copyFileSync(src, join(imgDir, name));
  return `img/${round}/${name}`;
}

export function buildGallery(round: string, title: string): GalleryRound {
  const roundDir = join(RUNS, round);
  const chains = readdirSync(roundDir)
    .map((d) => CHAIN.exec(d))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ dir: m[0], task: m[1], identity: m[2] as string, arm: m[3] as string }));
  if (chains.length === 0) throw new Error(`no chains in ${roundDir}`);
  const identities = [...new Set(chains.map((c) => c.identity))].sort();
  const letters = shuffle(identities).map((identity, i) => ({
    identity,
    letter: String.fromCharCode(65 + i),
  }));
  letters.sort((a, b) => (a.letter < b.letter ? -1 : 1));

  const imgDir = join(SITE, "img", round);
  mkdirSync(imgDir, { recursive: true });
  const key: Record<string, { chain: string; arm: string }> = {};
  for (const { identity, letter } of letters) {
    key[letter] = { chain: identity, arm: identity.split("-")[0] ?? "" };
  }
  let model = "";
  let commit = "";
  const note = (dir: string, step: string) => {
    const m = readMetrics(dir, step);
    if (m) {
      model ||= m.modelAlias;
      commit ||= m.graficalCommit;
    }
    return m;
  };

  let tasks: GalleryTask[];
  let brief: string;
  const prefixes = [...new Set(chains.flatMap((c) => (c.task ? [c.task] : [])))];
  if (prefixes.length === 0) {
    // One task drawn by every chain: the draft, then each change request it got.
    const present = new Set(
      chains.flatMap((c) => {
        const steps = join(roundDir, c.dir, "steps");
        return existsSync(steps) ? readdirSync(steps) : [];
      }),
    );
    const steps = ["e1", ...loadChanges().map((c) => `e2-${c.id}`)].filter((s) => present.has(s));
    tasks = steps.map((step, si) => {
      const pictures: GalleryTask["pictures"] = {};
      for (const { identity, letter } of letters) {
        const dir = join(roundDir, identity);
        const m = note(dir, step);
        const name = `${letter}-${step}.png`;
        const src = copyPicture(join(dir, "steps", step, "diagram.png"), imgDir, round, name);
        const after: Picture = { src, unchanged: !m?.diagramPngUpdated };
        const prev = si > 0 ? steps[si - 1] : undefined;
        pictures[letter] =
          prev === undefined
            ? { after }
            : {
                before: existsSync(join(imgDir, `${letter}-${prev}.png`))
                  ? { src: `img/${round}/${letter}-${prev}.png`, unchanged: false }
                  : { src: null, unchanged: false },
                after,
              };
      }
      if (step === "e1") return { id: step, kind: "draft", title: "First draft", pictures };
      const request = requestOf(join(roundDir, letters[0]?.identity ?? ""), step, commit);
      return {
        id: step,
        kind: "change",
        title: `Change ${si} of ${steps.length - 1}`,
        ...(request ? { request } : {}),
        pictures,
      };
    });
    const first = join(roundDir, letters[0]?.identity ?? "", "brief.md");
    brief = existsSync(first)
      ? readFileSync(first, "utf8")
      : readFileSync(join(REPO, "bench", "briefs", "catalog-sync.md"), "utf8");
  } else {
    // Several tasks, one draft each: a scale brief, or a loose prompt.
    const intents = new Map(loadIntents().map((t) => [t.id, t.request ?? ""]));
    tasks = prefixes.map((task) => {
      const pictures: GalleryTask["pictures"] = {};
      let taskBrief: string | undefined;
      for (const { identity, letter } of letters) {
        const dir = join(roundDir, `${task}.${identity}`);
        const m = note(dir, "e1");
        const name = `${letter}-${task}.png`;
        const src = copyPicture(join(dir, "steps", "e1", "diagram.png"), imgDir, round, name);
        pictures[letter] = { after: { src, unchanged: !m?.diagramPngUpdated } };
        const b = join(dir, "brief.md");
        if (taskBrief === undefined && existsSync(b)) taskBrief = readFileSync(b, "utf8");
      }
      if (taskBrief === undefined) {
        const request = intents.get(task);
        return { id: task, kind: "intent", title: task, ...(request ? { request } : {}), pictures };
      }
      const heading = taskBrief.match(/^#\s+(.*)$/m)?.[1] ?? task;
      return { id: task, kind: "draft", title: heading, brief: taskBrief, pictures };
    });
    brief = "";
  }

  writeFileSync(join(roundDir, "gallery-key.json"), `${JSON.stringify(key, null, 2)}\n`);
  const manifest: GalleryRound = {
    id: round,
    title,
    model,
    brief,
    diagrams: letters.map((l) => l.letter),
    tasks,
  };
  const roundsDir = join(SITE, "rounds");
  mkdirSync(roundsDir, { recursive: true });
  writeFileSync(join(roundsDir, `${round}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  const indexFile = join(roundsDir, "index.json");
  const index: { id: string; title: string }[] = existsSync(indexFile)
    ? (JSON.parse(readFileSync(indexFile, "utf8")) as { id: string; title: string }[])
    : [];
  const next = [...index.filter((r) => r.id !== round), { id: round, title }];
  writeFileSync(indexFile, `${JSON.stringify(next, null, 2)}\n`);
  return manifest;
}
