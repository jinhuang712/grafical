// Builds the owner's blind rating gallery for one round (EXPERIMENTS.md).
//
//   pnpm bench gallery --round <name>
//
// Each chain of the round gets a random letter (A, B, ...). The pictures are
// copied under that letter into bench/runs/gallery-site/, with a manifest the
// rating page reads. Which arm each letter stands for is written only to
// bench/runs/<round>/gallery-key.json, which is never published: the owner
// rates blind, and the key is revealed after the round is rated.

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
import { loadChanges, REPO, RUNS } from "./run.ts";

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
  kind: "draft" | "change";
  title: string;
  /** The request as the agent saw it, for change steps. */
  request?: string;
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

export function buildGallery(round: string, title: string): GalleryRound {
  const roundDir = join(RUNS, round);
  const chains = readdirSync(roundDir)
    .filter((d) => /^(grafical|raw)-.+-r\d+$/.test(d))
    .sort();
  if (chains.length === 0) throw new Error(`no chains in ${roundDir}`);
  const letters = shuffle(chains).map((chain, i) => ({
    chain,
    letter: String.fromCharCode(65 + i),
  }));
  letters.sort((a, b) => (a.letter < b.letter ? -1 : 1));

  const imgDir = join(SITE, "img", round);
  mkdirSync(imgDir, { recursive: true });
  const key: Record<string, { chain: string; arm: string }> = {};
  const steps = [
    "e1",
    ...loadChanges()
      .filter((c) => c.phase1)
      .map((c) => `e2-${c.id}`),
  ];
  let model = "";
  let commit = "";
  const tasks: GalleryTask[] = steps.map((step, si) => {
    const pictures: GalleryTask["pictures"] = {};
    for (const { chain, letter } of letters) {
      const dir = join(roundDir, chain);
      const m = readMetrics(dir, step);
      key[letter] = { chain, arm: chain.split("-")[0] ?? "" };
      if (m) {
        model ||= m.modelAlias;
        commit ||= m.graficalCommit;
      }
      const src = join(dir, "steps", step, "diagram.png");
      let after: Picture = { src: null, unchanged: !m?.diagramPngUpdated };
      if (existsSync(src)) {
        const name = `${letter}-${step}.png`;
        copyFileSync(src, join(imgDir, name));
        after = { src: `img/${round}/${name}`, unchanged: !m?.diagramPngUpdated };
      }
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
    const firstChain = join(roundDir, letters[0]?.chain ?? "");
    const request = requestOf(firstChain, step, commit);
    return {
      id: step,
      kind: "change",
      title: `Change ${si} of ${steps.length - 1}`,
      ...(request ? { request } : {}),
      pictures,
    };
  });

  writeFileSync(join(roundDir, "gallery-key.json"), `${JSON.stringify(key, null, 2)}\n`);
  const brief = readFileSync(join(REPO, "bench", "briefs", "catalog-sync.md"), "utf8");
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
