// The child of `pnpm bench diff` (bench/diff.ts): lays out a manifest of diagrams
// with the engine under <root> and writes one measurement per diagram. It is
// started once per engine, so the two engines never share a module graph.
//   node bench/diff-measure.ts <root> <manifest.json> <out.json> [<svg-dir>]

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Item, Measure } from "./diff.ts";

const [root, manifest, out, svgDir] = process.argv.slice(2) as [string, string, string, string?];
const load = (rel: string) => import(pathToFileURL(join(root, rel)).href);
const pipeline = await load("src/cli/pipeline.ts");
const { layout } = await load("src/layout/index.ts");
const { check } = await load("src/check/index.ts");
const { countCrossings } = await load("src/check/taste.ts");
const { renderSvg } = await load("src/render/index.ts");
const { createMeasurer } = await load("src/text/index.ts");
const m = await createMeasurer();
if (svgDir) mkdirSync(svgDir, { recursive: true });

/** Corners over all edges: a run of horizontal or vertical segments counts once (src/check/taste.ts does the same). */
function bendsOf(edges: { points: { x: number; y: number }[] }[]): number {
  let n = 0;
  for (const e of edges) {
    let last: "h" | "v" | "d" | undefined;
    let runs = 0;
    for (let i = 1; i < e.points.length; i++) {
      const a = e.points[i - 1] as { x: number; y: number };
      const b = e.points[i] as { x: number; y: number };
      const dir = Math.abs(a.y - b.y) < 0.01 ? "h" : Math.abs(a.x - b.x) < 0.01 ? "v" : "d";
      if (dir === "d" || dir !== last) runs++;
      last = dir;
    }
    n += Math.max(0, runs - 1);
  }
  return n;
}

const items: Item[] = JSON.parse(readFileSync(manifest, "utf8"));
const result: Measure[] = [];
for (const [i, item] of items.entries()) {
  try {
    const d = item.file !== undefined ? pipeline.loadDiagram(item.file) : item.diagram;
    if (pipeline.isReport(d)) {
      result.push({ id: item.id, error: d.errors?.[0]?.code ?? "report" });
      continue;
    }
    const scene = layout(d, m);
    const defects: string[] = check(d, scene, m).map(
      (x: { owner: string; code: string }) => `${x.owner}:${x.code}`,
    );
    result.push({
      id: item.id,
      hash: createHash("sha1").update(JSON.stringify(scene)).digest("hex").slice(0, 12),
      bends: bendsOf(scene.edges),
      crossings: countCrossings(scene.edges),
      width: scene.width,
      height: scene.height,
      defects,
    });
    if (svgDir && item.render) writeFileSync(join(svgDir, `${i}.svg`), renderSvg(scene));
  } catch (e) {
    result.push({ id: item.id, error: `threw:${String((e as Error).message).slice(0, 60)}` });
  }
}
writeFileSync(out, JSON.stringify(result));
