import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PAGES } from "../../src/cli/help.ts";
import { writeDiagram } from "../../src/model/io.ts";
import { EDGE_KINDS, NODE_KINDS } from "../../src/model/types.ts";
import { edgeLooks } from "../fixtures/edge-looks.ts";

// Each page runs the real command line.
vi.setConfig({ testTimeout: 60_000 });

const MAIN = join(import.meta.dirname, "../../src/cli/main.ts");
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-help-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

describe('help pages (DESIGN.md, "The help as the reference")', () => {
  it("each page belongs to a command, shows its paragraph and sections, and fits a terminal", () => {
    for (const path of ["", ...Object.keys(PAGES)]) {
      const r = run(...(path === "" ? [] : path.split(" ")), "--help");
      expect(r.code, path).toBe(0);
      // The paragraph may be wrapped anew; its words and the sections are shown as written.
      const words = (s: string) => s.replace(/\s+/g, " ");
      const page = PAGES[path];
      if (page?.about !== undefined) expect(words(r.out), path).toContain(words(page.about));
      if (page?.after !== undefined) expect(r.out, path).toContain(page.after.trim());
      // Commands and batch items in an example may run long; the rest wraps at 80.
      const prose = r.out.split(/^Example/m)[0] ?? "";
      for (const line of prose.split("\n"))
        expect(line.length, `${path}: ${line}`).toBeLessThanOrEqual(80);
    }
  });

  it("lists every kind of node and edge", () => {
    const nodes = run("node", "add", "--help").out;
    for (const k of NODE_KINDS) expect(nodes).toMatch(new RegExp(`^ {2}${k} `, "m"));
    const edges = run("edge", "add", "--help").out;
    for (const k of EDGE_KINDS) expect(edges).toMatch(new RegExp(`^ {2}${k} `, "m"));
  });

  it("has no guide command any more", () => {
    const r = run("guide");
    expect(r.code).toBe(2);
    expect(r.err).toContain("unknown command");
  });
});

describe('the counts in place of hints (DESIGN.md, "Records over prose")', () => {
  /** The photo-sharing diagram, where a line bends more than twice round the upload queue. */
  function photos(): string {
    writeFileSync(join(dir, "photos.grafical.yaml"), writeDiagram(edgeLooks));
    return "photos.grafical.yaml";
  }

  it("check prints the counts, and no hint, warning or advice", () => {
    const out = run("check", photos()).out;
    expect(out).toMatch(/^ok\ncounts nodes=\d+ lines=\d+ crossings=\d+ bends=\d+/);
    expect(out).not.toMatch(/^(hint|warning|lines):/m);
    expect(run("diagram", "improve", photos()).code).toBe(2);
    const json = JSON.parse(run("check", photos(), "--json").out);
    expect(json.counts.lines).toBe(edgeLooks.edges.length);
    expect(json.hints).toBeUndefined();
    expect(json.warnings).toBeUndefined();
  });
});
