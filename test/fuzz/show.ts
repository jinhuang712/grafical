// Renders one fuzz seed with the real engine and lists its engine-owned defects.
// Run: node test/fuzz/show.ts <seed> [out-dir]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { renderPng, renderSvg } from "../../src/render/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import { failures, geometryFailures } from "./fuzz.ts";
import { generate } from "./gen.ts";

const seed = Number(process.argv[2] ?? 1);
const out = process.argv[3] ?? ".out/fuzz";
const m = await createMeasurer();
const { diagram } = generate(seed, m);
const scene = layout(diagram, m);
const found = [...failures(check(diagram, scene, m)), ...geometryFailures(scene)];
const nodes = diagram.layers.reduce((s, l) => s + l.nodes.length, 0);
console.log(
  `seed ${seed}: ${diagram.layers.length} layers, ${nodes} nodes, ${diagram.edges.length} edges, ${scene.width}x${scene.height}, ${found.length} engine-owned defects`,
);
for (const x of found) console.log(`  ${x.code} [${x.elements.join(", ")}] ${x.found}`);
mkdirSync(out, { recursive: true });
const svg = renderSvg(scene);
writeFileSync(join(out, `seed-${seed}.svg`), svg);
writeFileSync(join(out, `seed-${seed}.png`), renderPng(svg, 1));
writeFileSync(join(out, `seed-${seed}.json`), JSON.stringify(diagram, null, 1));
