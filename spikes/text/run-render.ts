// Usage: node spikes/text/run-render.ts
// Writes .out/scene.svg and .out/scene.png and prints the hashes the determinism test records.
import { mkdirSync, writeFileSync } from "node:fs";
import { renderScene, sceneSvg, sha256 } from "./scene.ts";

const svg = sceneSvg();
const { png, pixels, width, height } = renderScene(svg);
mkdirSync(".out", { recursive: true });
writeFileSync(".out/scene.svg", svg);
writeFileSync(".out/scene.png", png);
console.log(`svg    sha256 ${sha256(svg)} (${svg.length} chars)`);
console.log(`pixels sha256 ${sha256(pixels)} (${width}x${height})`);
console.log(`png    sha256 ${sha256(png)} (${png.length} bytes, informational)`);
