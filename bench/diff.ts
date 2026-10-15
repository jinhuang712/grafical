// `pnpm bench diff <ref>`: what an engine change does to every picture we have.
// Lays out three corpora with the engine at <ref> and with the working tree, and
// prints key=value records (DESIGN.md, "Records over prose"). No model calls, no cost.
//   drafts    every saved agent draft: bench/runs/*/*/*.grafical.yaml in the main checkout
//   fixtures  test/fixtures/*.grafical.yaml and the TypeScript fixtures of test/debug/check-fixtures.ts
//   fuzz      seeds 1..N of test/fuzz/gen.ts (--seeds <n>, default 2000)

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { Diagram } from "../src/model/types.ts";
import { renderPng } from "../src/render/index.ts";
import { createMeasurer } from "../src/text/index.ts";
import { catalogSync } from "../test/fixtures/catalog-sync.ts";
import { catalogSyncGrouped } from "../test/fixtures/catalog-sync-grouped.ts";
import { dense } from "../test/fixtures/dense.ts";
import { edgeLooks } from "../test/fixtures/edge-looks.ts";
import { flowchart } from "../test/fixtures/flowchart.ts";
import { lanesColumns, lanesRows } from "../test/fixtures/lanes.ts";
import { nested } from "../test/fixtures/nested.ts";
import { stateMachine } from "../test/fixtures/state-machine.ts";
import { tiny } from "../test/fixtures/tiny.ts";
import { generate } from "../test/fuzz/gen.ts";

export const CORPORA = ["drafts", "fixtures", "fuzz"] as const;
export type Corpus = (typeof CORPORA)[number];

/** One diagram to lay out: a file read by the engine under test, or a diagram built here. */
export interface Item {
  id: string;
  file?: string;
  diagram?: Diagram;
  /** Wanted as a picture if it changes. */
  render: boolean;
}

/** What one engine made of one item. */
export type Measure =
  | { id: string; error: string }
  | {
      id: string;
      /** A hash of the scene, to tell whether anything moved. */
      hash: string;
      bends: number;
      crossings: number;
      width: number;
      height: number;
      /** One `owner:code` per defect. */
      defects: string[];
    };

const ok = (x: Measure | undefined): x is Extract<Measure, { hash: string }> =>
  x !== undefined && "hash" in x;

/** `owner:code` to count. */
export function countDefects(found: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const f of found) out.set(f, (out.get(f) ?? 0) + 1);
  return out;
}

const sorted = (m: Map<string, number>) => [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** A name made safe for a key=value record. */
const word = (s: string) => (/^[^\s=]+$/.test(s) ? s : JSON.stringify(s));

/** `a:1,b:2`, or `none`. */
function listOf(m: Map<string, number>): string {
  const xs = sorted(m).filter(([, n]) => n !== 0);
  return xs.length === 0 ? "none" : xs.map(([k, n]) => `${k}:${n}`).join(",");
}

export interface Totals {
  bends: number;
  crossings: number;
  width: number;
  height: number;
  defects: Map<string, number>;
}

export interface Summary {
  corpus: string;
  laidOut: number;
  changed: number;
  /** Items one engine laid out and the other refused or threw on. */
  errors: number;
  before: Totals;
  after: Totals;
  /** One record line per changed item. */
  items: string[];
  /** Ids of the changed items, in order. */
  changedIds: string[];
}

/** Compares the two engines' measurements of one corpus, item by item. */
export function summarize(corpus: string, before: Measure[], after: Measure[]): Summary {
  const empty = (): Totals => ({
    bends: 0,
    crossings: 0,
    width: 0,
    height: 0,
    defects: new Map(),
  });
  const s: Summary = {
    corpus,
    laidOut: 0,
    changed: 0,
    errors: 0,
    before: empty(),
    after: empty(),
    items: [],
    changedIds: [],
  };
  const byId = new Map(before.map((x) => [x.id, x]));
  for (const a of after) {
    const b = byId.get(a.id);
    if (!ok(a) || !ok(b)) {
      s.errors++;
      continue;
    }
    s.laidOut++;
    for (const [t, x] of [
      [s.before, b],
      [s.after, a],
    ] as const) {
      t.bends += x.bends;
      t.crossings += x.crossings;
      t.width += x.width;
      t.height += x.height;
      for (const [k, n] of countDefects(x.defects)) t.defects.set(k, (t.defects.get(k) ?? 0) + n);
    }
    if (a.hash === b.hash) continue;
    s.changed++;
    s.changedIds.push(a.id);
    const was = countDefects(b.defects);
    const now = countDefects(a.defects);
    const delta = new Map<string, number>();
    for (const k of new Set([...was.keys(), ...now.keys()]))
      delta.set(k, (now.get(k) ?? 0) - (was.get(k) ?? 0));
    const deltas = sorted(delta).filter(([, n]) => n !== 0);
    s.items.push(
      [
        `item corpus=${corpus}`,
        `name=${word(a.id)}`,
        `bends=${signed(a.bends - b.bends)}`,
        `crossings=${signed(a.crossings - b.crossings)}`,
        `width=${signed(a.width - b.width)}`,
        `height=${signed(a.height - b.height)}`,
        `defects=${deltas.length === 0 ? "none" : deltas.map(([k, n]) => `${k}:${signed(n)}`).join(",")}`,
      ].join(" "),
    );
  }
  return s;
}

/** The corpus record, then one record per changed item. */
export function formatSummary(s: Summary): string[] {
  return [
    [
      `corpus=${s.corpus}`,
      `laid_out=${s.laidOut}`,
      `changed=${s.changed}`,
      `errors=${s.errors}`,
      `bends_before=${s.before.bends}`,
      `bends_after=${s.after.bends}`,
      `crossings_before=${s.before.crossings}`,
      `crossings_after=${s.after.crossings}`,
      `width_before=${s.before.width}`,
      `width_after=${s.after.width}`,
      `height_before=${s.before.height}`,
      `height_after=${s.after.height}`,
      `defects_before=${listOf(s.before.defects)}`,
      `defects_after=${listOf(s.after.defects)}`,
    ].join(" "),
    ...s.items,
  ];
}

/** The checkout that holds bench/runs: the main one, when this is a linked worktree. */
export function mainCheckout(cwd: string): string {
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd,
    encoding: "utf8",
  }).trim();
  return dirname(common);
}

/** Every `*.grafical.yaml` directly inside bench/runs/<round>/<chain>/. */
export function draftFiles(runs: string): string[] {
  const out: string[] = [];
  if (!existsSync(runs)) return out;
  for (const round of readdirSync(runs).sort()) {
    const top = join(runs, round);
    for (const chain of readdirSync(top).sort()) {
      const dir = join(top, chain);
      let names: string[];
      try {
        names = readdirSync(dir);
      } catch {
        continue; // a file, not a chain
      }
      for (const f of names.sort()) if (f.endsWith(".grafical.yaml")) out.push(join(dir, f));
    }
  }
  return out;
}

async function corpusItems(
  corpus: Corpus,
  o: { cwd: string; runs: string; seeds: number },
): Promise<Item[]> {
  if (corpus === "drafts")
    return draftFiles(o.runs).map((file) => ({
      id: file.slice(o.runs.length + 1).replace(/\.grafical\.yaml$/, ""),
      file,
      render: true,
    }));
  if (corpus === "fixtures") {
    const dir = join(o.cwd, "test", "fixtures");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".grafical.yaml"))
      .sort()
      .map((f) => ({ id: f.replace(/\.grafical\.yaml$/, ""), file: join(dir, f), render: true }));
    const built: [string, Diagram][] = [
      ["tiny", tiny],
      ["catalog-sync-grouped", catalogSyncGrouped],
      ["catalog-sync", catalogSync],
      ["dense", dense],
      ["lanes-rows", lanesRows],
      ["lanes-columns", lanesColumns],
      ["edge-looks", edgeLooks],
      ["flowchart", flowchart],
      ["state-machine", stateMachine],
      ["nested", nested],
    ];
    return [...files, ...built.map(([id, diagram]) => ({ id, diagram, render: true }))];
  }
  const m = await createMeasurer();
  const items: Item[] = [];
  for (let seed = 1; seed <= o.seeds; seed++)
    items.push({ id: `seed-${seed}`, diagram: generate(seed, m).diagram, render: false });
  return items;
}

/** Runs the measuring child for the engine under `root`. */
function measure(
  root: string,
  items: Item[],
  tmp: string,
  tag: string,
  svgDir?: string,
): Measure[] {
  const manifest = join(tmp, `${tag}.manifest.json`);
  const out = join(tmp, `${tag}.out.json`);
  writeFileSync(manifest, JSON.stringify(items));
  execFileSync(
    "node",
    [
      join(import.meta.dirname, "diff-measure.ts"),
      root,
      manifest,
      out,
      ...(svgDir ? [svgDir] : []),
    ],
    { stdio: ["ignore", "inherit", "inherit"], maxBuffer: 1 << 28 },
  );
  return JSON.parse(readFileSync(out, "utf8")) as Measure[];
}

export interface DiffOptions {
  ref: string;
  seeds: number;
  renderDir?: string | undefined;
  /** The working tree. */
  cwd: string;
}

/** Runs the whole comparison and returns the records to print. */
export async function runDiff(o: DiffOptions): Promise<string[]> {
  const main = mainCheckout(o.cwd);
  const runs = join(main, "bench", "runs");
  const tmp = mkdtempSync(join(tmpdir(), "grafical-diff-"));
  const old = join(tmp, "ref");
  const sha = execFileSync("git", ["rev-parse", "--short", `${o.ref}^{commit}`], {
    cwd: o.cwd,
    encoding: "utf8",
  }).trim();
  execFileSync("git", ["worktree", "add", "--detach", old, o.ref], { cwd: o.cwd, stdio: "ignore" });
  try {
    const modules = join(main, "node_modules");
    if (existsSync(modules)) symlinkSync(modules, join(old, "node_modules"));
    const lines = [`diff ref=${o.ref} sha=${sha} seeds=${o.seeds}`];
    const render = o.renderDir ? resolve(o.renderDir) : undefined;
    for (const corpus of CORPORA) {
      const items = await corpusItems(corpus, { cwd: o.cwd, runs, seeds: o.seeds });
      const svgs = (side: string) =>
        render && corpus !== "fuzz" ? join(tmp, `${corpus}-${side}`) : undefined;
      const before = measure(old, items, tmp, `${corpus}-before`, svgs("before"));
      const after = measure(o.cwd, items, tmp, `${corpus}-after`, svgs("after"));
      const s = summarize(corpus, before, after);
      lines.push(...formatSummary(s));
      if (render && corpus !== "fuzz") {
        mkdirSync(join(render, corpus), { recursive: true });
        for (const id of s.changedIds) {
          const i = items.findIndex((x) => x.id === id);
          for (const side of ["before", "after"]) {
            const svg = readFileSync(join(tmp, `${corpus}-${side}`, `${i}.svg`), "utf8");
            const name = id.replace(/[^\w.-]+/g, "_");
            writeFileSync(join(render, corpus, `${name}.${side}.png`), renderPng(svg, 2));
          }
        }
      }
    }
    return lines;
  } finally {
    execFileSync("git", ["worktree", "remove", "--force", old], { cwd: o.cwd, stdio: "ignore" });
    rmSync(tmp, { recursive: true, force: true });
  }
}
