// Styles an object marks (specs/decisions, "A style may be as rich as it likes", "Styles set spacing as CSS does,
// and a later style wins").

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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

describe("like", () => {
  it("follows an edge by its own id, in a .grafical file", () => {
    run("diagram", "--set", "--title", "T");
    run("layer", "--set", "l", "--label", "L");
    run("node", "--set", "x", "--layer", "l", "--label", "X");
    run("node", "--set", "y", "--layer", "l", "--last", "--label", "Y");
    run("edge", "--set", "x-y", "--from", "x", "--to", "y");
    run("edge", "--set", "y-x", "--from", "y", "--to", "x");
    expect(run("edge", "--set", "y-x", "--like", "x-y").code).toBe(0);
    expect(readFileSync(join(dir, "a.grafical"), "utf8")).toContain("like: @x-y");
    expect(run("show", "y-x").code).toBe(0);
    expect(run("edge", "--set", "x-y", "--like", "y-x").out).toContain("like-cycle");
    expect(run("edge", "--set", "y-x", "--like", "-").code).toBe(0);
    expect(readFileSync(join(dir, "a.grafical"), "utf8")).not.toContain("like: @x-y");
    rmSync(join(dir, "a.grafical"));
  });
});

describe("styles", () => {
  it("paint what marks them, and the one defined later wins", () => {
    expect(run("diagram", "--set", "--title", "T").code).toBe(0);
    run("layer", "--set", "l", "--label", "L");
    run("node", "--set", "x", "--layer", "l", "--label", "X");
    run("node", "--set", "y", "--layer", "l", "--last", "--label", "Y");
    run("edge", "--set", "x-y", "--from", "x", "--to", "y");
    run("group", "--set", "g", "--label", "G");
    run("node", "--set", "x,y", "--group", "g");
    expect(
      run("style", "--set", "red", "--fill", "#ffeeee", "--border", "#cc0000", "--color", "#cc0000")
        .code,
    ).toBe(0);
    expect(run("style", "--set", "blue", "--fill", "#eeeeff").code).toBe(0);
    // The order of marking decides nothing: blue is defined later, and its fill wins.
    expect(run("node", "--set", "x", "--style", "blue,red").code).toBe(0);
    expect(run("edge", "--set", "x-y", "--style", "red").code).toBe(0);
    expect(run("group", "--set", "g", "--style", "blue").code).toBe(0);
    expect(run("node", "--set", "y", "--style", "nope").out).toContain("unknown-style");
    expect(run("render", "--svg", "a.svg").code).toBe(0);
    const svg = readFileSync(join(dir, "a.svg"), "utf8");
    expect(svg).toContain('fill="#eeeeff" stroke="#cc0000"');
    expect(svg).toContain('stroke="#cc0000"');
    expect(svg.match(/fill="#eeeeff"/g)?.length).toBe(2);
    const file = readFileSync(join(dir, "a.grafical"), "utf8");
    expect(file).toContain("<style> red {");
    expect(file).toContain("style: @blue @red");
    // Moved before red, blue loses to it.
    expect(run("style", "--move", "blue", "--before", "red").code).toBe(0);
    expect(run("render", "--svg", "a.svg").code).toBe(0);
    expect(readFileSync(join(dir, "a.svg"), "utf8")).toContain('fill="#ffeeee" stroke="#cc0000"');
    // +a adds one, -a takes one away, and - clears them.
    expect(run("node", "--set", "x", "--style", "-red").code).toBe(0);
    expect(readFileSync(join(dir, "a.grafical"), "utf8")).toMatch(/style: @blue\n/);
    expect(run("node", "--set", "x", "--style", "+red").code).toBe(0);
    expect(readFileSync(join(dir, "a.grafical"), "utf8")).toContain("style: @blue @red");
    expect(run("node", "--set", "x", "--style", "-").code).toBe(0);
    expect(run("style", "--remove", "red").code).toBe(0);
    expect(readFileSync(join(dir, "a.grafical"), "utf8")).not.toContain("@red");
  });

  it("a type of one's own sets a shape and a look, and a style beats it", () => {
    const g = ["-f", "t.grafical"];
    const go = (...args: string[]) => {
      const r = spawnSync("node", [MAIN, ...g, ...args], { cwd: dir, encoding: "utf8" });
      return { code: r.status, out: r.stdout + r.stderr };
    };
    expect(go("diagram", "--set", "--title", "T").code).toBe(0);
    go("layer", "--set", "l", "--label", "L");
    expect(go("type", "--set", "db", "--base", "store", "--fill", "#eeeeff").code).toBe(0);
    expect(
      go("type", "--set", "cache", "--base", "db", "--shape", "pill", "--border", "#009900").code,
    ).toBe(0);
    expect(go("node", "--set", "a", "--layer", "l", "--label", "A", "--type", "db").code).toBe(0);
    expect(
      go("node", "--set", "b", "--layer", "l", "--last", "--label", "B", "--type", "cache").code,
    ).toBe(0);
    expect(
      go("node", "--set", "c", "--layer", "l", "--last", "--label", "C", "--type", "nope").out,
    ).toContain("unknown-type");
    expect(go("render", "--svg", "t.svg").code).toBe(0);
    const svg = readFileSync(join(dir, "t.svg"), "utf8");
    expect(svg).toContain("#eeeeff");
    expect(svg).toContain('stroke="#009900"');
    const file = readFileSync(join(dir, "t.grafical"), "utf8");
    expect(file).toContain("<type> db {");
    expect(file).toContain("type: @cache");
    expect(go("show").code).toBe(0);
    expect(go("node", "--set", "b", "--type", "actor").code).toBe(0);
    expect(readFileSync(join(dir, "t.grafical"), "utf8")).toContain("type: @actor");
    expect(go("node", "--set", "b", "--type", "cache").code).toBe(0);
    // A type set again keeps what it does not name, and - takes an attribute away.
    expect(go("type", "--set", "db", "--fill", "#112233").code).toBe(0);
    expect(readFileSync(join(dir, "t.grafical"), "utf8")).toMatch(
      /base: @store\n {2}fill: #112233/,
    );
    expect(go("type", "--set", "db", "--fill", "-").code).toBe(0);
    expect(readFileSync(join(dir, "t.grafical"), "utf8")).not.toContain("#112233");
    expect(go("type", "--remove", "cache").code).toBe(0);
    expect(readFileSync(join(dir, "t.grafical"), "utf8")).not.toContain("@cache");
  });

  it("edges may be round, and square again", () => {
    const g = ["-f", "dispatch.grafical"];
    copyFileSync(
      resolve(import.meta.dirname, "../fixtures/dispatch.grafical"),
      join(dir, "dispatch.grafical"),
    );
    const go = (...args: string[]) => {
      const r = spawnSync("node", [MAIN, ...g, ...args], { cwd: dir, encoding: "utf8" });
      return { code: r.status, out: r.stdout + r.stderr };
    };
    const svg = () => {
      go("render", "--svg", "l.svg");
      return readFileSync(join(dir, "l.svg"), "utf8");
    };
    const square = svg();
    expect(go("diagram", "--set", "--lines", "round").code).toBe(0);
    expect(svg()).not.toBe(square);
    expect(go("diagram", "--set", "--lines", "-").code).toBe(0);
    expect(svg()).toBe(square);
  });
});
