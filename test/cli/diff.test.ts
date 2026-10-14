import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
vi.setConfig({ testTimeout: 60_000 });

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-diff-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
function git(...args: string[]) {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], {
    cwd: dir,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(r.stderr);
}

describe('grafical diff (DESIGN.md, "Git as the history")', () => {
  it("reports changes since a revision as a batch that replays them", () => {
    git("init", "-q");
    const f = "d.grafical.yaml";
    run("new", f, "--title", "D");
    run("layer", "add", f, "row", "--label", "Row");
    run("node", "add", f, "a", "--layer", "row", "--label", "A");
    git("add", f);
    git("commit", "-q", "-m", "first");
    expect(run("diff", f).out).toBe("[] # no changes\n");

    run("node", "rename", f, "a", "--label", "Alpha");
    run("node", "add", f, "b", "--layer", "row", "--label", "B", "--last");
    const d = run("diff", f);
    expect(d.code).toBe(0);
    expect(d.out).toBe(
      "- { op: node.add, id: b, layer: row, label: B, kind: service, after: a }\n" +
        "- { op: node.rename, id: a, label: Alpha }\n",
    );
    const json = JSON.parse(run("diff", f, "HEAD", "--json").out);
    expect(json.ok).toBe(true);
    expect(json.ops).toHaveLength(2);

    // The batch, applied to the revision's file, gives the file on disk.
    writeFileSync(join(dir, "batch.yaml"), d.out);
    const old = spawnSync("git", ["show", `HEAD:./${f}`], { cwd: dir, encoding: "utf8" }).stdout;
    writeFileSync(join(dir, "old.grafical.yaml"), old);
    expect(run("apply", "old.grafical.yaml", "batch.yaml").code).toBe(0);
    expect(readFileSync(join(dir, "old.grafical.yaml"), "utf8")).toBe(
      readFileSync(join(dir, f), "utf8"),
    );
  });

  it("builds a file the revision does not have from nothing", () => {
    run("new", "n.grafical.yaml", "--title", "New");
    expect(run("diff", "n.grafical.yaml").out).toBe(
      "- { op: diagram.new, title: New, density: normal }\n",
    );
  });

  it("refuses a revision that does not exist", () => {
    const r = run("diff", "d.grafical.yaml", "nosuchrev");
    expect(r.code).toBe(1);
    expect(r.out).toContain("bad-revision");
  });
});
