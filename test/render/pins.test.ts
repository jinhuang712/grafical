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
    svg: "60c78bb93cf341f44364df953c71de93699cabb1e07c026f53c530537cbd9a80",
    png: "202505c50246f1134f39db43a096d298a40ce439c0cfe84d6428c7f9f77a5ad5",
  },
  lanesRows: {
    diagram: lanesLayers,
    svg: "c1114353f7299c58e1711c27404a58c8bb1adeb7667935db9b26f7791cf220f3",
    png: "fcc3174fbfa7c9f869ee3a0de6d0a636e0c06e4810cbe56941a2ee8acb18e890",
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
    svg: "1736a84d79a10a32afe31be9868303d38bc54edf47cbcdd1a33ecf0ea52237b7",
    png: "3bedd4a08581bc07d689a8adba21c78df4c3b1c7e22e9d87ffcfeec93adf6cd0",
  },
  lanesColumns: {
    diagram: lanesColumns,
    svg: "3c4291f9a239a20fddb48121e4ca64ea457e022a55ee207d0c38f0faf7969b66",
    png: "3820f704f44cf53e2d2ac9a51b91476ebeb1f8c2c83a1e236f2a0d4a3d1404cc",
  },
  steps: {
    diagram: steps,
    svg: "09258f9b924db8af8dd29c67f1bc96242208150544aa38aa56ae8fa9bd7b3768",
    png: "f9fdbabe7804115dc13320b78ec1a3bb68d498b42b1fe991303d7577df822327",
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
