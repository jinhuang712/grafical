// `pnpm bench routes`: lays out every routing case and compares it with its saved baseline.
//   pnpm bench routes                 print one record per case, then the totals
//   pnpm bench routes --write         save these numbers as the baseline
//   pnpm bench routes --render <dir>  also write each case's PNG

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { check } from "../src/check/index.ts";
import { countCrossings } from "../src/check/taste.ts";
import { isReport, loadDiagram } from "../src/cli/pipeline.ts";
import { layout } from "../src/layout/index.ts";
import { routeStats } from "../src/layout/stats.ts";
import { renderPng, renderSvg } from "../src/render/index.ts";
import { createMeasurer } from "../src/text/index.ts";

const HOME = join(import.meta.dirname, "routes");
const BASELINE = join(HOME, "baseline.yaml");

interface Case {
  name: string;
  file?: string;
  standard: number;
  floor?: number;
  tests: string;
}

interface Numbers {
  crossings: number;
  bends: number;
  length: number;
  /** The longest edge against the shortest way between its ends. */
  detour: number;
  defects: number;
}

const FIELDS = ["crossings", "bends", "length", "detour", "defects"] as const;

function detourOf(edges: readonly { points: { x: number; y: number }[] }[]): number {
  let worst = 1;
  for (const e of edges) {
    const a = e.points[0];
    const b = e.points.at(-1);
    if (a === undefined || b === undefined) continue;
    let length = 0;
    for (let i = 1; i < e.points.length; i++) {
      const p = e.points[i - 1] as { x: number; y: number };
      const q = e.points[i] as { x: number; y: number };
      length += Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
    }
    const direct = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (direct > 0) worst = Math.max(worst, length / direct);
  }
  return Math.round(worst * 100) / 100;
}

export async function runRoutes(options: { write: boolean; render?: string }): Promise<void> {
  const cases = parse(readFileSync(join(HOME, "cases.yaml"), "utf8")) as Case[];
  const saved: Record<string, Numbers> = options.write ? {} : parse(readFileSync(BASELINE, "utf8"));
  const m = await createMeasurer();
  if (options.render !== undefined) mkdirSync(options.render, { recursive: true });
  const now: Record<string, Numbers> = {};
  let better = 0;
  let worse = 0;
  for (const c of cases) {
    const d = loadDiagram(c.file ?? join(HOME, `${c.name}.grafical`));
    if (isReport(d)) throw new Error(`${c.name}: ${d.errors?.[0]?.code ?? "unreadable"}`);
    const scene = layout(d, m);
    const stats = routeStats(scene.edges.map((e) => e.points));
    const n: Numbers = {
      crossings: countCrossings(scene.edges),
      bends: stats.bends,
      length: stats.length,
      detour: detourOf(scene.edges),
      defects: check(d, scene, m).length,
    };
    now[c.name] = n;
    const was = saved[c.name];
    const moved = FIELDS.filter((f) => was !== undefined && was[f] !== n[f]);
    const shown = FIELDS.map(
      (f) => `${f}=${moved.includes(f) ? `${was?.[f]}->${n[f]}` : n[f]}`,
    ).join(" ");
    const floor = c.floor === undefined ? "" : ` floor=${c.floor}`;
    console.log(`case name=${c.name} standard=${c.standard}${floor} ${shown}`);
    if (was !== undefined) {
      if (FIELDS.some((f) => n[f] < was[f]) && FIELDS.every((f) => n[f] <= was[f])) better++;
      if (FIELDS.some((f) => n[f] > was[f])) worse++;
    }
    if (options.render !== undefined) {
      writeFileSync(join(options.render, `${c.name}.png`), renderPng(renderSvg(scene), 1));
    }
  }
  const sum = (f: (typeof FIELDS)[number]) =>
    Object.values(now).reduce((total, n) => total + n[f], 0);
  console.log(
    `total cases=${cases.length} better=${better} worse=${worse} crossings=${sum("crossings")} bends=${sum("bends")} length=${Math.round(sum("length"))} defects=${sum("defects")}`,
  );
  if (options.write) writeFileSync(BASELINE, stringify(now));
}
