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
import { flowchart } from "../fixtures/flowchart.ts";
import { lanesColumns, lanesRows } from "../fixtures/lanes.ts";
import { nested } from "../fixtures/nested.ts";
import { stateMachine } from "../fixtures/state-machine.ts";

const sha = (d: string | Uint8Array): string => createHash("sha256").update(d).digest("hex");
const pixels = (png: Uint8Array): string => sha(PNG.sync.read(Buffer.from(png)).data);

const PINS: Record<string, { diagram: Diagram; svg: string; png: string }> = {
  grouped: {
    diagram: catalogSyncGrouped,
    svg: "eada6126b5e59d641f9bc7c5806667f9b05bf179cf85f316669e53c6ebe7ccd2",
    png: "504816c29cf5b24a5b51f91ada21160ac7c8db93b88676df58101e19d43c6c43",
  },
  lanesRows: {
    diagram: lanesRows,
    svg: "4c4e707b165b582bca314d47358ee3be6bf8446a7635abb80f032dcb7cc9e8ae",
    png: "f9c5772217fcb470238fc808ca21372624852292d7b0ab02a3921a160c7724d2",
  },
  flowchart: {
    diagram: flowchart,
    svg: "18f089de243e5ca2ed071c9902bc91614de7efea14569f82fab51974f0410b44",
    png: "3bd0ee5b043f90bdcd73dd6c28c9d53cbf0f1aaab8f1bfd368566a74edcde620",
  },
  stateMachine: {
    diagram: stateMachine,
    svg: "987a1153a41fd8a2bfc91e4fc4d5bb989aacb18eb1377f4cf1f5e63611bd1a67",
    png: "1cbdb4115f29e5eeef8d88bf43a145856fd1f409f54cf22b99ebed55d77d440a",
  },
  nested: {
    diagram: nested,
    svg: "3239741da54334ec5ce5cebed32c784d39787503b905b43a95e39eaf6d07ff75",
    png: "1c089ea9fd744ffc59bc1fcaf8ed685095f16cd77aff27342d56d279465c2a55",
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
