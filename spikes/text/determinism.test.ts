import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { describe, expect, it } from "vitest";
import { fontFiles } from "./fonts.ts";
import { resvgOptions } from "./resvg.ts";
import { renderScene, sceneSvg, sha256 } from "./scene.ts";

// Recorded on macOS (arm64, Node 24, @resvg/resvg-js 2.6.2) with `node spikes/text/run-render.ts`.
const SVG_SHA256 = "782ecaa2c9244b3a3e63c546635bb792eadc89de82ac7bb36b3e773cdc79d430";
const PIXELS_SHA256 = "0a1b2ec910535bb416074f284b4078dc2fba38f7cba305900a4fa33cfabef91b";

describe("D15 determinism spike", () => {
  const svg = sceneSvg();
  const { png, pixels, width, height } = renderScene(svg);

  it("writes the same SVG bytes on every platform", () => {
    expect(sha256(svg)).toBe(SVG_SHA256);
  });

  it("draws the same pixels on every platform", () => {
    // Printed so that a CI log shows both values when the hash differs.
    console.log(`${process.platform}/${process.arch} pixels ${sha256(pixels)} png ${sha256(png)}`);
    mkdirSync(".out", { recursive: true });
    writeFileSync(`.out/scene-${process.platform}.png`, png);
    expect([width, height]).toEqual([560, 260]);
    expect(sha256(pixels)).toBe(PIXELS_SHA256);
  });

  it("decoded PNG pixels equal the pixels resvg reports", () => {
    const raw = new Resvg(svg, resvgOptions()).render().pixels;
    expect(createHash("sha256").update(raw).digest("hex")).toBe(sha256(pixels));
  });

  it("loads only the four bundled font files", () => {
    expect(fontFiles).toHaveLength(4);
    // Without system fonts and without the bundled ones nothing can be drawn, so any hit comes
    // from the bundled fonts.
    const noFonts = new Resvg(svg, {
      font: { loadSystemFonts: false, fontFiles: [] },
    }).render();
    expect(sha256(noFonts.pixels)).not.toBe(PIXELS_SHA256);
  });
});
