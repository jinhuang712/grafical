import { beforeAll, describe, expect, it, vi } from "vitest";
import { checkSvg } from "../../bench/geometry.ts";
import { layout } from "../../src/layout/index.ts";
import type { Diagram } from "../../src/model/types.ts";
import { renderSvg } from "../../src/render/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { catalogSync } from "../fixtures/catalog-sync.ts";
import { catalogSyncGrouped } from "../fixtures/catalog-sync-grouped.ts";
import { dense } from "../fixtures/dense.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";
import { flowchart } from "../fixtures/flowchart.ts";
import { lanesColumns, lanesRows } from "../fixtures/lanes.ts";
import { stateMachine } from "../fixtures/state-machine.ts";
import { tiny } from "../fixtures/tiny.ts";
import { generate } from "../fuzz/gen.ts";

// Lays out many random diagrams: slower CI machines need more than the default 5 s.
vi.setConfig({ testTimeout: 60_000 });

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">\n<rect width="400" height="300" fill="#ffffff"/>\n${body}\n</svg>\n`;
const box = (x: number, y: number, w = 100, h = 40) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#ffffff" stroke="#999999" stroke-width="1"/>`;
const text = (x: number, y: number, t: string) =>
  `<text x="${x}" y="${y}" font-family="Inter" font-size="13" font-weight="600" fill="#111111">${t}</text>`;
const line = (d: string, dash = "") =>
  `<path d="${d}" fill="none" stroke="#666666" stroke-width="1.25"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const codes = (s: string) => checkSvg(s, m).map((d) => d.code);

describe("the separate geometry check (benchmark 7)", () => {
  it("finds each kind of mechanical defect in a hand-made SVG", () => {
    expect(codes(svg(`${box(10, 10)}\n${box(80, 30)}`))).toEqual(["overlap"]);
    expect(codes(svg(`${box(100, 100)}\n${line("M150 20L150 250")}`))).toEqual([
      "edge-through-node",
    ]);
    expect(
      codes(svg(`${box(100, 100)}\n${text(108, 125, "a label much too long for it")}`)),
    ).toEqual(["overflow"]);
    expect(codes(svg(`${text(20, 60, "persist")}\n${line("M10 55L200 55")}`))).toEqual([
      "label-collision",
    ]);
    expect(codes(svg(`${text(20, 60, "persist")}\n${text(30, 62, "consume")}`))).toEqual([
      "label-collision",
    ]);
    expect(
      codes(svg(`${line("M10 50L200 50L200 250")}\n${line("M300 10L200 10L200 200")}`)),
    ).toEqual(["edge-overlap"]);
  });

  it("accepts what is drawn on purpose: ports at a box, a bus, a fan-in, a container", () => {
    const ports = `${box(100, 100)}\n${line("M150 20L150 100")}\n${line("M150 140L150 250")}`;
    expect(codes(svg(ports))).toEqual([]);
    const bus = `${line("M50 10L50 100L100 100L100 200")}\n${line("M50 10L50 100L20 100L20 200")}`;
    expect(codes(svg(bus))).toEqual([]);
    const fanIn = `${line("M10 10L10 100L100 100L100 200")}\n${line("M200 10L200 100L100 100L100 200")}`;
    expect(codes(svg(fanIn))).toEqual([]);
    const lanes = `<rect x="5" y="5" width="300" height="250" fill="#ffffff" stroke="#cccccc" stroke-width="1"/>\n${box(20, 20)}\n${box(150, 20)}`;
    expect(codes(svg(lanes))).toEqual([]);
  });

  it("reads a diamond by its outline: lines may reach its slanted sides, not its middle", () => {
    const diamond = `<path d="M200 100L300 150L200 200L100 150Z" fill="#ffffff" stroke="#999999" stroke-width="1"/>`;
    // Into the top tip, and onto the slanted side away from the tip: drawn on purpose.
    expect(
      codes(svg(`${diamond}\n${line("M200 20L200 100")}\n${line("M140 20L140 130")}`)),
    ).toEqual([]);
    expect(codes(svg(`${diamond}\n${line("M200 20L200 180")}`))).toEqual(["edge-through-node"]);
    // Text in the middle fits; text in the box's corner is outside the diamond.
    expect(codes(svg(`${diamond}\n${text(185, 155, "Ok?")}`))).toEqual([]);
    expect(codes(svg(`${diamond}\n${text(104, 114, "Ok?")}`))).toEqual(["overflow"]);
  });

  it("finds nothing in grafical's pictures of the fixtures and of random diagrams", () => {
    const found: string[] = [];
    const fixtures: [string, Diagram][] = [
      ["tiny", tiny],
      ["catalog-sync", catalogSync],
      ["catalog-sync-grouped", catalogSyncGrouped],
      ["dense", dense],
      ["lanes-rows", lanesRows],
      ["lanes-columns", lanesColumns],
      ["dark", { ...catalogSyncGrouped, style: "dark" }],
      ["edge-looks", edgeLooks],
      ["flowchart", flowchart],
      ["state-machine", stateMachine],
    ];
    for (let seed = 1; seed <= 100; seed++)
      fixtures.push([`seed ${seed}`, generate(seed, m).diagram]);
    for (const [name, d] of fixtures) {
      for (const x of checkSvg(renderSvg(layout(d, m)), m))
        found.push(`${name}: ${x.code} ${x.found}`);
    }
    expect(found).toEqual([]);
  });
});
