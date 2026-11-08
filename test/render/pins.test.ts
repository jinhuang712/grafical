// The determinism gate (GOALS.md, "Determinism"; DESIGNS.md, "The same file gives the same picture on any machine"), end to end: fixtures laid
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
import { lanesColumns, lanesLayers } from "../fixtures/lanes.ts";
import { nested } from "../fixtures/nested.ts";
import { stateMachine } from "../fixtures/state-machine.ts";
import { steps } from "../fixtures/steps.ts";

const sha = (d: string | Uint8Array): string => createHash("sha256").update(d).digest("hex");
const pixels = (png: Uint8Array): string => sha(PNG.sync.read(Buffer.from(png)).data);

const PINS: Record<string, { diagram: Diagram; svg: string; png: string }> = {
  grouped: {
    diagram: catalogSyncGrouped,
    svg: "3008f7aa87af3554ceb31cacb3d76ac27f57377f1283be731d156554be018415",
    png: "cb3d00892554e306de6aeb64aaa5ff328739ed6fa5a48d2758326982f72dc715",
  },
  lanesRows: {
    diagram: lanesLayers,
    svg: "167921e34bccf991ca838eccbfeeb13fb5034177fc91e00e61619f55a8f22f0a",
    png: "bbd64d52b1470c37b2849d4029d06ca029b6ce8a1b08a91b6b5a1155eed7d1b3",
  },
  flowchart: {
    diagram: flowchart,
    svg: "4536346abc0b986a0f5555532b244b3c60c22c0418c6b457ee903218833005ba",
    png: "58bb866413e58f9bde56ccde8a43da6efbe291c8b87a1af20f439c7849cbb8ab",
  },
  stateMachine: {
    diagram: stateMachine,
    svg: "b06ca31a5efb61deef19def2441ff77b2e8cb3690a98fe690a2a8ad8f9344545",
    png: "00e001dfff02615cda7a2aa4032cff7a7f75e7b93e860918a3c44e3c16b22625",
  },
  nested: {
    diagram: nested,
    svg: "3893b4fba09e60584876fe6b3aa30d1adda84807952398344cfecbf7a81d5942",
    png: "63840843c3cfc2223e24324a33a8cac8fc7697c5824f9337faa4f407d71cf671",
  },
  lanesColumns: {
    diagram: lanesColumns,
    svg: "b30c82367df1569fd8d88be199b3af2f29de8f094e47e6297f9114235488f112",
    png: "a797d229fa0e7aa79eb90e717fbc370b017a8ebeaad2afba1047e4b81b9274fc",
  },
  steps: {
    diagram: steps,
    svg: "6c559ee6b4631cea27fb6ec8416a8b7065ade1f938d0664107c92c71dd84d848",
    png: "2b916121064ea3527e5915bd6ff77e298939cd40d402baa5a66133b47c8ec6af",
  },
};

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe('the same file gives the same picture everywhere (DESIGNS.md, "The same file gives the same picture on any machine")', () => {
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
