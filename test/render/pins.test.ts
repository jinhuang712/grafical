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
import { steps } from "../fixtures/steps.ts";

const sha = (d: string | Uint8Array): string => createHash("sha256").update(d).digest("hex");
const pixels = (png: Uint8Array): string => sha(PNG.sync.read(Buffer.from(png)).data);

const PINS: Record<string, { diagram: Diagram; svg: string; png: string }> = {
  grouped: {
    diagram: catalogSyncGrouped,
    svg: "8cb8695f1b760742f7e3fcc1e93c1fee7589b9a43a8e4a6177d05435aa600e27",
    png: "97ab657a6748a4bb74ff4d67023ffdd739e4050f25f19d2a1838a4147d6bcfb6",
  },
  lanesRows: {
    diagram: lanesRows,
    svg: "3575d2d5ab55b7c250b27768ff84c0cae4dbd8769b81d3016ee71b8cd166454a",
    png: "34058b314e26f9bb7b0871dce6ddd5f8e9e3a1c7b1077ad51ea055810ad682d1",
  },
  flowchart: {
    diagram: flowchart,
    svg: "25878e345a2ab5c4071f97e5e197cf6671484b16b01817404608dcc62007ff49",
    png: "ea1d373276abb4d989d68f8504aeb29098dca69ed6565f8c49ede8a0e69382d0",
  },
  stateMachine: {
    diagram: stateMachine,
    svg: "addafce7464525316d5d0b5e22e4702aa0a6bc7d18eccc9385f311bf6476aaa1",
    png: "6c524fbe66e516a9484fe6067e5d1e17d309eb31660a623fa5208d223bbe4407",
  },
  nested: {
    diagram: nested,
    svg: "064198cca7386c485eed63b93b351cc599b18aa27ce9ae767d69e695dc2c2aea",
    png: "742d1902c9bc1738fc0963eb7773416c9e2e321f536c6a62622d9485f86b13d4",
  },
  lanesColumns: {
    diagram: lanesColumns,
    svg: "c77686e4106160b3b0132ba799312f63eea7749ace99f4b3c5e37bff0e4d4f21",
    png: "f3ecdf6d7b9e786f89d48749e6981ec20c0b5417b45eb2d747da9692f9edda8e",
  },
  steps: {
    diagram: steps,
    svg: "b58d2b415686033f2d49b13d94793c4c7200d967c83e0c9e3177e7486f28c259",
    png: "0d3a6fd972f976a70514f42aacf996c09b4b32178f0c3b0b528a529a4a25e9de",
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
