// The determinism gate (GOALS.md, "Determinism"; DESIGN.md, "Output and determinism"), end to end: fixtures laid
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
    svg: "b51e7d09a0143c63df301dfec01d9d3c1acc78126b233876bf719c042d3ede26",
    png: "f75af846d1fc79b5feb3d4008299f0af9483b7742a63c4a1a905e26e9aa97faa",
  },
  lanesRows: {
    diagram: lanesRows,
    svg: "1ca5f5427677c6826d6fffd75ee07b2d2c0b219a5983b52942be8e0575337407",
    png: "5a860795017c8b3104596bd78cefb3d02d23cdfb8d411ca6613824b4560ac558",
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
    svg: "ce78dc143787207c42d5a7e731f19439ccd9e22c7512d21bacc1909605592984",
    png: "31d84d98885688927e2418d2c5ae63c365b6d7d6171265b4a080509dee01d653",
  },
  lanesColumns: {
    diagram: lanesColumns,
    svg: "634fe5805ab1a560b8abc211641ed7ce3934c33cf083696cb2784a73af86b427",
    png: "52f43a5c3d1f55ffbe56920abcca1b2a2b259ad8cbba02bd384139fc68d3277d",
  },
};

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe('the same file gives the same picture everywhere (DESIGN.md, "Output and determinism")', () => {
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
