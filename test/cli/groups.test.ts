import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GUIDE } from "../../src/cli/guide.ts";

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
vi.setConfig({ testTimeout: 60_000 });

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-groups-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const read = (f: string) => readFileSync(join(dir, f), "utf8");

// The example batch is taken from the guide itself, so the guide cannot drift from the tool.
function guideExample() {
  const start = GUIDE.indexOf("Write batch.yaml:\n") + "Write batch.yaml:\n".length;
  const batch = GUIDE.slice(start, GUIDE.indexOf("\nThen:", start));
  const line = GUIDE.split("\n").find((l) => l.startsWith("grafical new orders")) as string;
  return { batch, line };
}

describe("grouped diagrams", () => {
  it("builds the guide's example with new and one apply, and show lists the groups", () => {
    const { batch, line } = guideExample();
    // The example's new line, split into words that keep quoted text together.
    const args = [...line.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? (m[2] as string));
    const n = run(...args.slice(1));
    expect(n.code).toBe(0);
    writeFileSync(join(dir, "batch.yaml"), batch);
    const r = run("apply", "orders.grafical.yaml", "batch.yaml");
    expect(r.out).toMatch(/^ok changed: /);
    expect(r.code).toBe(0);
    const text = read("orders.grafical.yaml");
    expect(text).toContain("subtitle: Two services coupled");
    expect(text).toContain("note: ");
    expect(text).toMatch(/groups:\n {2}- id: order-desk\n {4}label: order-desk\n/);
    const s = run("show", "orders.grafical.yaml");
    expect(s.out).toContain('subtitle "Two services coupled only by the shared orders database."');
    expect(s.out).toContain('note "Not shown: payment retries, admin tools."');
    expect(s.out).toContain('group order-desk "order-desk": gateway, checkout');
    expect(s.out).toContain('group shipping "shipping": events, dispatcher');
    expect(s.out).toContain("group=shipping");
    expect(run("check", "orders.grafical.yaml").code).toBe(0);
  });

  it("group and diagram commands change the file, and report errors", () => {
    const f = "g.grafical.yaml";
    run("new", f, "--title", "G", "--subtitle", "S", "--note", "N");
    run("layer", "add", f, "r1", "--label", "R1");
    run("layer", "add", f, "r2", "--label", "R2");
    run("layer", "add", f, "r3", "--label", "R3");
    run("node", "add", f, "a", "--layer", "r1", "--label", "A");
    run("node", "add", f, "b", "--layer", "r2", "--label", "B");
    run("node", "add", f, "c", "--layer", "r3", "--label", "C");
    expect(run("group", "add", f, "g", "--label", "G", "--nodes", "a,b").out).toBe(
      "ok changed: g, a, b\n",
    );
    expect(run("group", "join", f, "g", "c").code).toBe(0);
    const before = read(f);
    const bad = run("group", "leave", f, "b");
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("group-gap");
    expect(bad.out).toContain("failed, file unchanged");
    expect(read(f)).toBe(before);
    expect(run("group", "join", f, "zz", "a").out).toContain("unknown-group");
    expect(run("group", "rename", f, "g", "--label", "Renamed").code).toBe(0);
    expect(run("group", "remove", f, "g").out).toBe("ok changed: g, a, b, c\n");
    expect(read(f)).not.toContain("group");
    expect(run("diagram", "subtitle", f).code).toBe(0);
    expect(run("diagram", "note", f, "--text", "Not shown: y.").code).toBe(0);
    const t = read(f);
    expect(t).not.toContain("subtitle");
    expect(t).toContain('note: "Not shown: y."');
    expect(run("diagram", "note", f).code).toBe(0);
    expect(read(f)).not.toContain("note");
  });

  it("warns above 16 nodes, in text and JSON, and exits 0", () => {
    const f = "big.grafical.yaml";
    run("new", f, "--title", "Big");
    const items = ["- op: layer.add\n  id: row\n  label: Row\n"];
    for (let i = 0; i < 17; i++) {
      items.push(`- op: node.add\n  id: n${i}\n  layer: row\n  label: N${i}\n  kind: queue\n`);
    }
    writeFileSync(join(dir, "big.yaml"), items.join(""));
    const w = run("apply", f, "big.yaml");
    expect(w.code).toBe(0);
    expect(w.out).toContain("warning too-many-nodes: found 17 nodes");
    expect(w.out).toContain("queues in layer row");
    const c = run("check", f, "--json");
    expect(c.code).toBe(0);
    const body = JSON.parse(c.out);
    expect(body.ok).toBe(true);
    expect(body.warnings[0].code).toBe("too-many-nodes");
    const small = run("check", "g.grafical.yaml", "--json");
    expect(JSON.parse(small.out).warnings).toEqual([]);
  });

  it("guide teaches the grouped style within the budget", () => {
    expect(GUIDE.length).toBeLessThan(12000);
    for (const w of ["group add", "diagram subtitle", "Not shown:", "sublabel", "group-gap"]) {
      expect(GUIDE).toContain(w);
    }
  });
});
