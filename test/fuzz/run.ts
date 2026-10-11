// Runs the fuzz outside vitest and prints the failure rate by defect code, with
// the first failures. Run: node test/fuzz/run.ts [seeds] [first-seed] [--list]

import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { ENGINE_OWNED, failures, geometryFailures } from "./fuzz.ts";
import { generate } from "./gen.ts";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const seeds = Number(args[0] ?? 300);
const first = Number(args[1] ?? 1);
const list = process.argv.includes("--list");
const m = await createMeasurer();
const byCode = new Map<string, number>();
let failed = 0;
let shown = 0;
const t0 = performance.now();
for (let seed = first; seed < first + seeds; seed++) {
  const { diagram } = generate(seed, m);
  const scene = layout(diagram, m);
  const found = [...failures(check(diagram, scene, m)), ...geometryFailures(scene)];
  if (found.length === 0) continue;
  failed++;
  for (const code of new Set(found.map((x) => x.code)))
    byCode.set(code, (byCode.get(code) ?? 0) + 1);
  if (list || shown < 8) {
    shown++;
    console.log(`seed ${seed}: ${found.length} defects`);
    for (const x of found.slice(0, 4))
      console.log(`  ${x.code} [${x.elements.join(", ")}] ${x.found}`);
  }
}
const ms = performance.now() - t0;
console.log(
  `${failed} of ${seeds} diagrams have an engine-owned defect (${((100 * failed) / seeds).toFixed(1)}%), in ${(ms / 1000).toFixed(1)} s`,
);
for (const code of ENGINE_OWNED) console.log(`  ${code}: ${byCode.get(code) ?? 0} diagrams`);
