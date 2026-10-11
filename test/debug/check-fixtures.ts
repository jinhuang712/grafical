// Lays out each fixture with the real measurer, runs the real checker and
// renders a PNG through the real renderer. Run with:
//   node test/debug/check-fixtures.ts <out-dir>

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { renderPng, renderSvg } from "../../src/render/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { dense } from "../fixtures/dense.ts";
import { tiny } from "../fixtures/tiny.ts";

const out = process.argv[2] ?? ".out/check";
mkdirSync(out, { recursive: true });
const m = await createMeasurer();
for (const [name, d] of [
  ["tiny", tiny],
  ["catalog-sync", catalogSync],
  ["dense", dense],
] as const) {
  const t0 = performance.now();
  const scene = layout(d, m);
  const t1 = performance.now();
  const defects = check(d, scene, m);
  const svg = renderSvg(scene);
  writeFileSync(join(out, `${name}.svg`), svg);
  writeFileSync(join(out, `${name}.png`), renderPng(svg, 2));
  const counts = new Map<string, number>();
  for (const x of defects) counts.set(x.code, (counts.get(x.code) ?? 0) + 1);
  console.log(
    `${name}: ${scene.width}x${scene.height}, layout ${(t1 - t0).toFixed(1)} ms, defects ${defects.length}`,
    Object.fromEntries(counts),
  );
  for (const x of defects.slice(0, 6))
    console.log(`  ${x.code} ${x.elements.join(",")}: ${x.found}`);
}
