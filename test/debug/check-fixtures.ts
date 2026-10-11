// Lays out each fixture with the real measurer, runs the real checker and the
// layout's own geometry checks, prints the measured rules of DESIGN.md D25, and
// renders a PNG through the real renderer, with group boxes, subtitle, legend and
// footnote added by the debug writer until the renderer draws them. Run with:
//   node test/debug/check-fixtures.ts <out-dir> [fixture]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { renderPng, renderSvg } from "../../src/render/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { dense } from "../fixtures/dense.ts";
import { tiny } from "../fixtures/tiny.ts";
import { defects, groupIntruders, mechanical, taste, textCrossings } from "../layout/checks.ts";
import { withFrame } from "./svg.ts";

const out = process.argv[2] ?? ".out/check";
const only = process.argv[3];
mkdirSync(out, { recursive: true });
const m = await createMeasurer();
for (const [name, d] of [
  ["tiny", tiny],
  ["catalog-sync-grouped", catalogSyncGrouped],
  ["catalog-sync", catalogSync],
  ["dense", dense],
] as const) {
  if (only !== undefined && only !== name) continue;
  const t0 = performance.now();
  const scene = layout(d, m);
  const t1 = performance.now();
  const found = check(d, scene, m);
  const svg = withFrame(renderSvg({ ...scene, layers: [] }), scene);
  writeFileSync(join(out, `${name}.svg`), svg);
  writeFileSync(join(out, `${name}.png`), renderPng(svg, 2));
  const counts = new Map<string, number>();
  for (const x of found) counts.set(x.code, (counts.get(x.code) ?? 0) + 1);
  const t = taste(scene);
  const own = [
    ...mechanical(defects(scene)),
    ...textCrossings(scene).map((x) => `text crossing: ${x}`),
    ...groupIntruders(scene).map((x) => `group intruder: ${x}`),
  ];
  console.log(
    `${name}: ${scene.width}x${scene.height}, layout ${(t1 - t0).toFixed(1)} ms, checker defects ${found.length}`,
    Object.fromEntries(counts),
  );
  console.log(
    `  edges ${scene.edges.length}, crossings ${t.crossings} (limit ${Math.floor(scene.edges.length / 10)}), bends ${t.bends}, straight ${(100 * t.straight).toFixed(0)}%, max bends ${t.maxBends}, over 2 bends ${t.overBends}, labelled ${(100 * t.labelled).toFixed(0)}%, corridor violations ${t.corridorViolations}`,
  );
  for (const x of found.slice(0, 6)) console.log(`  ${x.code} ${x.elements.join(",")}: ${x.found}`);
  for (const x of own.slice(0, 12)) console.log(`  own: ${x}`);
}
