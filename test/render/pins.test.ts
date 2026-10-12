// The determinism gate of benchmark 11 (DESIGN.md D15), end to end: fixtures laid
// out with the real measurer give these SVG bytes and PNG pixels on every
// machine CI runs on, macOS and Linux. If the layout or the paint changes on
// purpose, look at the pictures (node test/debug/check-fixtures.ts), then update.

import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { beforeAll, describe, expect, it } from "vitest";
import { layout } from "../../src/layout/index.ts";
import type { Diagram } from "../../src/model/types.ts";
import { renderPng, renderSvg } from "../../src/render/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { lanesColumns, lanesRows } from "../fixtures/lanes.ts";

const sha = (d: string | Uint8Array): string => createHash("sha256").update(d).digest("hex");
const pixels = (png: Uint8Array): string => sha(PNG.sync.read(Buffer.from(png)).data);

const PINS: Record<string, { diagram: Diagram; svg: string; png: string }> = {
  grouped: {
    diagram: catalogSyncGrouped,
    svg: "9625bcd4ddf72d41585592991b208c8f367b7e800b76a1f356c5d2bdb93def54",
    png: "99292303ab9c54f7df2231a81c3a59425e9ff5d7dbb8b0e2e6cdf972b6779a0d",
  },
  lanesRows: {
    diagram: lanesRows,
    svg: "ef6c36d775422f2e6772016f8db1728275e59ef6866bdab1825e81fc50cd70a3",
    png: "cd19a9fc203cc2d67080dda319e83a41124efdebac53cbc02daaf4838b83f666",
  },
  lanesColumns: {
    diagram: lanesColumns,
    svg: "b9c6cc6e326a4bd69581fa6033a8f978f4e816c4928816a6dc480a39df20a0a9",
    png: "d0cce866d943dbd1d95cf437f07b9e10835584b8254baffcf7df46d0f6bd3971",
  },
};

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe("the same file gives the same picture everywhere (D15)", () => {
  for (const [name, pin] of Object.entries(PINS)) {
    it(`${name}: SVG bytes and PNG pixels`, () => {
      const svg = renderSvg(layout(pin.diagram, m));
      expect({ svg: sha(svg), png: pixels(renderPng(svg, 1)) }).toEqual({
        svg: pin.svg,
        png: pin.png,
      });
    });
  }
});
