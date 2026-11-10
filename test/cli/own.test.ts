// A style's attributes set on the object itself, on the command line (specs/decisions, "Every attribute of a style
// may be set on the object itself"): each noun's `--set` takes the ones it draws, `-` gives one back to its styles,
// and the page names them on one line.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 60_000 });

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-own-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});
// Git's own variables would point it at the repository under test.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
const run = (...args: string[]) => {
  const r = spawnSync("node", [MAIN, "-f", "a.grafical", ...args], {
    cwd: dir,
    env,
    encoding: "utf8",
  });
  return { code: r.status, out: r.stdout + r.stderr };
};
const git = (...args: string[]) => {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], {
    cwd: dir,
    env,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(r.stderr);
};
const file = () => readFileSync(join(dir, "a.grafical"), "utf8");

describe("a style's attributes on the object itself", () => {
  it("are set, said back as changed fields, held once, and given back with -", () => {
    expect(run("diagram", "--set", "--title", "T").code).toBe(0);
    run("layer", "--set", "l");
    run("node", "--set", "x", "--layer", "l", "--label", "X");
    const set = run("node", "--set", "x", "--fill", "#ffeeee", "--margin-left", "16");
    expect(set.code).toBe(0);
    expect(set.out).toContain("CHANGED node=x fields=fill,margin-left");
    expect(file()).toContain("  fill: #ffeeee\n  margin-left: 16\n");
    expect(run("node", "--set", "x", "--fill", "#ffeeee").out).toMatch(/^UNCHANGED/);
    const back = run("node", "--set", "x", "--fill", "-");
    expect(back.out).toContain("CHANGED node=x fields=fill");
    expect(file()).not.toContain("fill:");
    expect(run("show").out).toContain('x "X" service margin-left=16');
  });

  it("refuse what a noun does not draw as a usage error, and a value style --set refuses", () => {
    const color = run("node", "--set", "x", "--color", "#000000");
    expect(color.code).toBe(2);
    expect(color.out).toContain("unknown-option");
    expect(run("layer", "--set", "l", "--margin-left", "8").code).toBe(2);
    const odd = run("node", "--set", "x", "--margin-top", "6");
    expect(odd.code).toBe(1);
    expect(odd.out).toContain("field: margin-top");
  });

  it("are named on one line of each page that takes them", () => {
    const page = spawnSync("node", [MAIN, "node", "--set", "--help"], { encoding: "utf8" }).stdout;
    const options = page.split("\n\n").find((p) => p.startsWith("Options:")) ?? "";
    expect(options).not.toContain("--fill");
    expect(page).toContain("Style flags, as style --set takes them, over its styles: --fill");
    const label = spawnSync("node", [MAIN, "label", "--set", "--help"], {
      encoding: "utf8",
    }).stdout;
    expect(label).toContain("Style flags of an edge's label");
  });

  it("come back from diff as command lines that replay them", () => {
    git("init", "-q");
    git("add", "a.grafical");
    git("commit", "-q", "-m", "first");
    run("node", "--set", "x", "--border", "#cc0000", "--border-width", "2");
    run("node", "--set", "y", "--layer", "l", "--last", "--label", "Y", "--fill", "#eeeeff");
    run("edge", "--set", "x-y", "--from", "x", "--to", "y", "--label", "go", "--color", "#0969da");
    run("label", "--set", "x-y", "--fill", "#ffffff");
    run("diagram", "--set", "--row-gap", "48");
    const d = spawnSync("node", [MAIN, "-f", "a.grafical", "diff"], {
      cwd: dir,
      env,
      encoding: "utf8",
    }).stdout;
    expect(d).toContain("label --set x-y --fill '#ffffff'");
    const old = spawnSync("git", ["show", "HEAD:./a.grafical"], {
      cwd: dir,
      env,
      encoding: "utf8",
    }).stdout;
    writeFileSync(join(dir, "old.grafical"), old);
    const script = d.replaceAll("grafical -f a.grafical ", `node ${MAIN} -f old.grafical `);
    const sh = spawnSync("sh", ["-e", "-c", script], { cwd: dir, env, encoding: "utf8" });
    expect(sh.status, sh.stdout + sh.stderr).toBe(0);
    expect(readFileSync(join(dir, "old.grafical"), "utf8")).toBe(file());
  });
});
