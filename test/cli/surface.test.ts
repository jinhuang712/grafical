// The command line a caller types (specs/decisions, "A command names its file with a flag", "A command's verb is a flag").

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inward, surfaceName } from "../../src/cli/surface.ts";

vi.setConfig({ testTimeout: 60_000 });

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-surface-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});
const run = (args: string[], input?: string) => {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8", input });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

describe("the words a caller types", () => {
  it("take the file from -f and the verb from the first flag after the noun", () => {
    expect(inward(["-f", "a", "edge", "--weight", "x", "--weight", "2"])).toEqual([
      "edge",
      "weight",
      "a",
      "x",
      "--weight",
      "2",
    ]);
    expect(inward(["--file", "a", "node", "--label", "x"])).toEqual(["node", "label", "a", "x"]);
    expect(inward(["-f", "a", "show", "--drawn"])).toEqual(["show", "a", "--drawn"]);
  });

  it("refuse a call with no file and a noun with no verb", () => {
    expect(inward(["node", "--add", "x"])).toEqual({ field: "--file" });
    expect(inward(["-f", "a", "node", "x"])).toEqual({ field: "verb", found: "x" });
  });

  it("name a verb as it is typed", () => {
    expect(surfaceName("node move")).toBe("node --move");
    expect(surfaceName("edge reverse")).toBe("edge --reverse");
    expect(surfaceName("apply")).toBe("apply");
  });

  it("draw a batch from standard input", () => {
    expect(run(["-f", "a.grafical.yaml", "new", "--title", "T"]).code).toBe(0);
    const batch =
      "- {op: layer.add, id: l, label: L}\n- {op: node.add, id: x, layer: l, label: X, type: store}\n";
    expect(run(["-f", "a.grafical.yaml", "apply", "-"], batch).code).toBe(0);
    expect(
      run([
        "-f",
        "a.grafical.yaml",
        "node",
        "--add",
        "y",
        "--layer",
        "l",
        "--last",
        "--label",
        "Y",
        "--type",
        "store",
      ]).code,
    ).toBe(0);
    expect(run(["-f", "a.grafical.yaml", "show"]).out).toContain("y");
  });

  it("show gives one object and what refers to it", () => {
    const f = ["-f", "b.grafical.yaml"];
    expect(run([...f, "new", "--title", "T"]).code).toBe(0);
    run([...f, "layer", "--add", "l", "--label", "L"]);
    run([...f, "node", "--add", "x", "--layer", "l", "--label", "X"]);
    run([...f, "node", "--add", "y", "--layer", "l", "--last", "--label", "Y"]);
    run([...f, "edge", "--add", "x", "y"]);
    const out = run([...f, "show", "x"]).out;
    expect(out).toContain("node x\n");
    expect(out).toContain('label: "X"');
    expect(out).toContain("used by:\n  edge x->y\n");
    expect(run([...f, "show", "nope"]).code).toBe(2);
  });
});
