// Renders the fixtures to .out/layout/ with the debug writer, and prints route
// measures. Run: node test/debug/render.ts [fixture] [--boxes]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { layout, routeStats } from "../../src/layout/index.ts";
import { createStubMeasurer } from "../../src/text/stub.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { dense } from "../fixtures/dense.ts";
import { edgeCases } from "../fixtures/edge-cases.ts";
import { tiny } from "../fixtures/tiny.ts";
import { debugPng, debugSvg } from "./svg.ts";

const out = join(import.meta.dirname, "..", "..", ".out", "layout");
mkdirSync(out, { recursive: true });
const m = createStubMeasurer();
const boxes = process.argv.includes("--boxes");
const only =
  process.argv[2] !== undefined && !process.argv[2].startsWith("--") ? process.argv[2] : "";
const fixtures = {
  tiny,
  "edge-cases": edgeCases,
  "catalog-sync-grouped": catalogSyncGrouped,
  "catalog-sync": catalogSync,
  dense,
};
for (const [name, d] of Object.entries(fixtures)) {
  if (only !== "" && only !== name) continue;
  const scene = layout(d, m);
  const svg = debugSvg(scene, { boxes });
  writeFileSync(join(out, `${name}.svg`), svg);
  writeFileSync(join(out, `${name}.png`), debugPng(svg));
  const st = routeStats(scene.edges.map((e) => e.points));
  console.log(
    `${name}: ${scene.width}x${scene.height}, crossings ${st.crossings}, bends ${st.bends}, length ${st.length}`,
  );
}
