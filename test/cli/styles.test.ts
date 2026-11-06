// Styles an object marks (specs/decisions, "A style may be as rich as it likes").

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 60_000 });

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-styles-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});
const f = ["-f", "a.grafical"];
const run = (...args: string[]) => {
  const r = spawnSync("node", [MAIN, ...f, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
};

describe("styles", () => {
  it("paint what marks them, and a later one wins", () => {
    expect(run("new", "--title", "T").code).toBe(0);
    run("layer", "--add", "l", "--label", "L");
    run("node", "--add", "x", "--layer", "l", "--label", "X");
    run("node", "--add", "y", "--layer", "l", "--last", "--label", "Y");
    run("edge", "--add", "x", "y");
    run("group", "--add", "g", "--label", "G", "--nodes", "x,y");
    expect(
      run("style", "--add", "red", "--fill", "#fee", "--border", "#c00", "--color", "#c00").code,
    ).toBe(0);
    expect(run("style", "--add", "blue", "--fill", "#eef").code).toBe(0);
    expect(run("node", "--style", "x", "red", "blue").code).toBe(0);
    expect(run("edge", "--style", "x->y", "red").code).toBe(0);
    expect(run("group", "--style", "g", "blue").code).toBe(0);
    expect(run("node", "--style", "y", "nope").out).toContain("unknown-style");
    expect(run("render", "--svg", "a.svg").code).toBe(0);
    const svg = readFileSync(join(dir, "a.svg"), "utf8");
    expect(svg).toContain('fill="#eef" stroke="#c00"');
    expect(svg).toContain('stroke="#c00"');
    expect(svg.match(/fill="#eef"/g)?.length).toBe(2);
    const file = readFileSync(join(dir, "a.grafical"), "utf8");
    expect(file).toContain("<style> red {");
    expect(file).toContain("style: @red @blue");
    expect(run("style", "--remove", "red").code).toBe(0);
    expect(readFileSync(join(dir, "a.grafical"), "utf8")).not.toContain("@red");
  });
});
