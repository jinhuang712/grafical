// Renders every fixture with both routers to .out/router/ so the PNGs can be looked at.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { loadAvoid } from "./avoid-router.js";
import { catalogSync, catalogSyncDense } from "./fixtures.js";
import { routerNames, run, toPng } from "./pipeline.js";

const out = join(import.meta.dirname, "..", "..", ".out", "router");

beforeAll(async () => {
  await loadAvoid();
  mkdirSync(out, { recursive: true });
});

const fixtures = { "catalog-sync": catalogSync, "catalog-sync-dense": catalogSyncDense };

/** The same SVG with a smaller viewBox, to look at one region up close. */
function crop(svg: string, x: number, y: number, w: number, h: number): string {
  return svg.replace(
    /^<svg [^>]*?width="[^"]*" height="[^"]*" viewBox="[^"]*"/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"`,
  );
}

for (const [name, d] of Object.entries(fixtures)) {
  for (const router of routerNames) {
    test(`render ${name} with ${router}`, () => {
      const r = run(router, d);
      writeFileSync(join(out, `${name}.${router}.svg`), r.svg);
      writeFileSync(join(out, `${name}.${router}.png`), toPng(r.svg, 1.5));
      writeFileSync(
        join(out, `${name}.${router}.report.json`),
        `${JSON.stringify(r.report, null, 2)}\n`,
      );
      if (name === "catalog-sync") {
        const lower = crop(r.svg, 150, 430, 1150, 520);
        writeFileSync(join(out, `${name}.${router}.lower.png`), toPng(lower, 1.6));
      }
      expect(r.svg.startsWith("<svg")).toBe(true);
    });
  }
}
