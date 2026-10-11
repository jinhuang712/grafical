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
    svg: "6f3d80d327ef9cd2db5d6672ffb4b719870ec4d2168d4f2e771cda3a180cd031",
    png: "e43fdd02daad0aa3e11c2f84b5ca7b236e9433e183c0324ec2591531a68a62c4",
  },
  lanesRows: {
    diagram: lanesRows,
    svg: "7fa4d35fd2be5282877156af58ba0832a682bafa035636d03c424cd8a3d18aa9",
    png: "81e00653dbf1770277f7de5dcfd441fddd299b1a5e88550eb864c78f47bd8d5b",
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
