// Styles an object marks (specs/decisions, "A style may be as rich as it likes").

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
    run("new", "--title", "T");
    run("layer", "--add", "l", "--label", "L");
    run("node", "--add", "x", "--layer", "l", "--label", "X");
    run("node", "--add", "y", "--layer", "l", "--last", "--label", "Y");
    run("edge", "--add", "x", "y");
    run("edge", "--add", "y", "x");
    expect(run("edge", "--like", "y->x", "x->y").code).toBe(0);
    expect(readFileSync(join(dir, "a.grafical"), "utf8")).toContain("like: @x->y");
    expect(run("show", "y->x").code).toBe(0);
    expect(run("edge", "--like", "x->y", "y->x").out).toContain("like-cycle");
    rmSync(join(dir, "a.grafical"));
  });
});

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

  it("a type of one's own sets a shape and a look, and a style beats it", () => {
    const g = ["-f", "t.grafical"];
    const go = (...args: string[]) => {
      const r = spawnSync("node", [MAIN, ...g, ...args], { cwd: dir, encoding: "utf8" });
      return { code: r.status, out: r.stdout + r.stderr };
    };
    expect(go("new", "--title", "T").code).toBe(0);
    go("layer", "--add", "l", "--label", "L");
    expect(go("type", "--add", "db", "--base", "store", "--fill", "#eef").code).toBe(0);
    expect(
      go("type", "--add", "cache", "--base", "db", "--shape", "pill", "--border", "#090").code,
    ).toBe(0);
    expect(go("node", "--add", "a", "--layer", "l", "--label", "A", "--type", "db").code).toBe(0);
    expect(
      go("node", "--add", "b", "--layer", "l", "--last", "--label", "B", "--type", "cache").code,
    ).toBe(0);
    expect(
      go("node", "--add", "c", "--layer", "l", "--last", "--label", "C", "--type", "nope").out,
    ).toContain("unknown-type");
    expect(go("render", "--svg", "t.svg").code).toBe(0);
    const svg = readFileSync(join(dir, "t.svg"), "utf8");
    expect(svg).toContain("#eef");
    expect(svg).toContain('stroke="#090"');
    const file = readFileSync(join(dir, "t.grafical"), "utf8");
    expect(file).toContain("<type> db {");
    expect(file).toContain("type: @cache");
    expect(go("show").code).toBe(0);
    expect(go("node", "--type", "b", "actor").code).toBe(0);
    expect(readFileSync(join(dir, "t.grafical"), "utf8")).toContain("type: @actor");
    expect(go("node", "--type", "b", "cache").code).toBe(0);
    expect(go("type", "--add", "db", "--base", "store", "--fill", "#123").code).toBe(0);
    expect(go("type", "--remove", "cache").code).toBe(0);
    expect(readFileSync(join(dir, "t.grafical"), "utf8")).not.toContain("@cache");
  });

  it("edges may be round, and square again", () => {
    const g = ["-f", "dispatch.grafical.yaml"];
    copyFileSync(
      resolve(import.meta.dirname, "../fixtures/dispatch.grafical"),
      join(dir, "dispatch.grafical.yaml"),
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
    expect(go("diagram", "--lines", "round").code).toBe(0);
    expect(svg()).not.toBe(square);
    expect(go("diagram", "--lines", "square").code).toBe(0);
    expect(svg()).toBe(square);
  });
});
