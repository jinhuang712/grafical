import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TYPE_GUIDES } from "../../src/cli/guide.ts";

// Each example runs the real command line several times.
vi.setConfig({ testTimeout: 60_000 });

const MAIN = join(import.meta.dirname, "../../src/cli/main.ts");
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-guides-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

/** A type guide's `grafical new` line and its batch, taken from the guide itself. */
function example(guide: string): { args: string[]; file: string; batch: string } {
  const line = guide.split("\n").find((l) => l.startsWith("grafical new ")) as string;
  const args = [...line.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? (m[2] as string));
  const start = guide.indexOf("Write batch.yaml:\n") + "Write batch.yaml:\n".length;
  return {
    args: args.slice(1),
    file: args[2] as string,
    batch: guide.slice(start, guide.indexOf("\nThen:", start)),
  };
}

describe("type guides (D34)", () => {
  for (const [type, guide] of Object.entries(TYPE_GUIDES)) {
    it(`${type}: fits its budget, and its example builds with no defect`, () => {
      expect(guide.length).toBeLessThan(3000);
      const ex = example(guide);
      expect(run(...ex.args).code).toBe(0);
      writeFileSync(join(dir, `${type}.yaml`), ex.batch);
      const r = run("apply", ex.file, `${type}.yaml`);
      expect(r.err).toBe("");
      expect(r.code).toBe(0);
      const c = run("check", ex.file, "--all", "--json");
      expect(JSON.parse(c.out).defects).toEqual([]);
      expect(run("guide", type).out).toBe(guide);
    });
  }

  it("a hint after the state machine example names the file, ready to run (D35)", () => {
    const ex = example(TYPE_GUIDES["state-machine"]);
    const c = run("check", ex.file);
    expect(c.out).toMatch(/^hint: .*crossings|^hint: .*bends/m);
    expect(c.out).toContain(`grafical node move ${ex.file} `);
    const json = JSON.parse(run("check", ex.file, "--json").out);
    expect(json.hints.length).toBeGreaterThan(0);
    expect(json.hints[0].ops.length).toBeGreaterThan(0);
  });

  it("tells the agent what to improve, and leaves the moves to it (D35)", () => {
    const ex = example(TYPE_GUIDES["state-machine"]);
    const out = run("check", ex.file).out;
    expect(out).toMatch(/^lines: \d+ crossings?, \d+ lines? bending more than twice: /m);
    expect(run("diagram", "improve", ex.file).code).toBe(2);
    const json = JSON.parse(run("check", ex.file, "--json").out);
    expect(json.lines.bent.length + json.lines.crossings.length).toBeGreaterThan(0);
  });

  it("names the types it knows when asked for another", () => {
    const r = run("guide", "sequence");
    expect(r.code).toBe(2);
    expect(r.err).toContain("flowchart, state-machine, swimlane");
  });
});
