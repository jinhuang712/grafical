import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");

// Each test spawns the command line several times, and each start loads the
// fonts and the harfbuzz WASM: about 0.1 s locally, slower on CI runners.
vi.setConfig({ testTimeout: 60_000 });

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-cli-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const read = (f: string) => readFileSync(join(dir, f), "utf8");

// tiny: 3 layers, 5 nodes, 4 edges.
const SINGLE: string[][] = [
  ["new", "single.grafical.yaml", "--title", "Tiny"],
  ["layer", "add", "single.grafical.yaml", "clients", "--label", "Clients"],
  ["layer", "add", "single.grafical.yaml", "services", "--label", "Services"],
  ["layer", "add", "single.grafical.yaml", "storage", "--label", "Storage"],
  [
    "node",
    "add",
    "single.grafical.yaml",
    "web",
    "--layer",
    "clients",
    "--label",
    "Web",
    "--kind",
    "actor",
  ],
  [
    "node",
    "add",
    "single.grafical.yaml",
    "api",
    "--layer",
    "services",
    "--label",
    "API",
    "--accent",
  ],
  ["node", "add", "single.grafical.yaml", "worker", "--layer", "services", "--label", "Worker"],
  [
    "node",
    "add",
    "single.grafical.yaml",
    "db",
    "--layer",
    "storage",
    "--label",
    "DB",
    "--kind",
    "store",
  ],
  [
    "node",
    "add",
    "single.grafical.yaml",
    "mq",
    "--layer",
    "storage",
    "--label",
    "MQ",
    "--kind",
    "queue",
  ],
  ["edge", "add", "single.grafical.yaml", "web", "api", "--label", "call"],
  ["edge", "add", "single.grafical.yaml", "api", "db", "--kind", "data"],
  ["edge", "add", "single.grafical.yaml", "api", "mq", "--kind", "async"],
  ["edge", "add", "single.grafical.yaml", "mq", "worker", "--kind", "async"],
];

const BATCH = `- op: layer.add
  id: clients
  label: Clients
- op: layer.add
  id: services
  label: Services
- op: layer.add
  id: storage
  label: Storage
- op: node.add
  id: web
  layer: clients
  label: Web
  kind: actor
- op: node.add
  id: api
  layer: services
  label: API
  accent: true
- op: node.add
  id: worker
  layer: services
  label: Worker
- op: node.add
  id: db
  layer: storage
  label: DB
  kind: store
- op: node.add
  id: mq
  layer: storage
  label: MQ
  kind: queue
- op: edge.add
  from: web
  to: api
  label: call
- op: edge.add
  from: api
  to: db
  kind: data
- op: edge.add
  from: api
  to: mq
  kind: async
- op: edge.add
  from: mq
  to: worker
  kind: async
`;

describe("write commands", () => {
  it("builds tiny with single commands and with one apply, byte-identical", () => {
    for (const args of SINGLE) {
      const r = run(...args);
      expect(r.code, `${args.join(" ")}: ${r.out}${r.err}`).toBe(0);
    }
    expect(run("new", "batch.grafical.yaml", "--title", "Tiny").code).toBe(0);
    writeFileSync(join(dir, "batch.yaml"), BATCH);
    const r = run("apply", "batch.grafical.yaml", "batch.yaml");
    expect(r.code, r.out + r.err).toBe(0);
    expect(r.out).toBe(
      "ok changed: clients, services, storage, web, api, worker, db, mq, web->api, api->db, api->mq, mq->worker\n" +
        "counts nodes=5 lines=4 crossings=0 bends=2 length=256 width=368 height=376 fullest=services:2 busiest=api:3 longest=api->mq:120 passing=0\n",
    );
    const single = read("single.grafical.yaml");
    expect(read("batch.grafical.yaml")).toBe(single);
    expect(single.startsWith("grafical: 1\ntitle: Tiny\ndensity: normal\nlayers:\n")).toBe(true);
  });

  it("reports changed ids as JSON on one line", () => {
    const r = run(
      "node",
      "add",
      "single.grafical.yaml",
      "cache",
      "--layer",
      "storage",
      "--label",
      "Cache",
      "--json",
    );
    expect(r.code).toBe(0);
    expect(r.out).toBe('{"ok":true,"changed":["cache"],"errors":[],"defects":[]}\n');
    const rm = run("node", "remove", "single.grafical.yaml", "cache", "--json");
    expect(JSON.parse(rm.out)).toEqual({
      ok: true,
      changed: ["cache"],
      errors: [],
      defects: [],
    });
  });

  it("leaves the file untouched and exits 1 when an operation fails", () => {
    const before = read("single.grafical.yaml");
    const r = run("node", "add", "single.grafical.yaml", "x", "--layer", "servces", "--label", "X");
    expect(r.code).toBe(1);
    expect(r.out).toContain("failed, file unchanged");
    expect(r.out).toContain("unknown-layer layer");
    expect(r.out).toContain("closest layers: services");
    expect(read("single.grafical.yaml")).toBe(before);
  });

  it("gives the error as JSON with the operation index", () => {
    writeFileSync(
      join(dir, "bad.yaml"),
      "- op: node.add\n  id: ok1\n  layer: storage\n  label: Ok\n- op: edge.add\n  from: api\n  to: nope\n",
    );
    const before = read("single.grafical.yaml");
    const r = run("apply", "single.grafical.yaml", "bad.yaml", "--json");
    expect(r.code).toBe(1);
    const j = JSON.parse(r.out);
    expect(j.ok).toBe(false);
    expect(j.changed).toEqual([]);
    expect(j.errors[0]).toMatchObject({
      code: "unknown-node",
      index: 1,
      field: "to",
      found: "nope",
    });
    expect(read("single.grafical.yaml")).toBe(before);
  });

  it("rejects a malformed batch item before applying anything", () => {
    writeFileSync(
      join(dir, "bad2.yaml"),
      "- op: node.add\n  id: n\n  layer: storage\n  label: N\n  kind: db\n",
    );
    const r = run("apply", "single.grafical.yaml", "bad2.yaml");
    expect(r.code).toBe(1);
    expect(r.out).toContain("bad-value kind");
    expect(r.out).toContain("allowed: service, store, queue, external, actor");
  });

  it("refuses to overwrite with new, and a missing file is an error", () => {
    expect(run("new", "single.grafical.yaml", "--title", "Again").code).toBe(1);
    const r = run("show", "missing.grafical.yaml");
    expect(r.code).toBe(1);
    expect(r.out).toContain("file-not-found");
  });

  it("exits 2 on usage errors", () => {
    expect(run("node", "add", "single.grafical.yaml", "x").code).toBe(2);
    expect(run("bogus").code).toBe(2);
    expect(run("render", "single.grafical.yaml", "--scale", "9").code).toBe(2);
    expect(run().code).toBe(2);
  });

  it("handles edge id suffixes and node remove cascading", () => {
    run("new", "e.grafical.yaml", "--title", "E");
    run("layer", "add", "e.grafical.yaml", "l", "--label", "L");
    run("node", "add", "e.grafical.yaml", "p", "--layer", "l", "--label", "P");
    run("node", "add", "e.grafical.yaml", "q", "--layer", "l", "--label", "Q");
    run("edge", "add", "e.grafical.yaml", "p", "q");
    const second = run("edge", "add", "e.grafical.yaml", "p", "q", "--label", "again");
    expect(second.out).toBe("ok changed: p->q#2\n");
    const rm = run("node", "remove", "e.grafical.yaml", "q");
    expect(rm.out).toBe("ok changed: q, p->q, p->q#2\n");
  });
});

describe("read commands", () => {
  it("show prints a compact view", () => {
    const r = run("show", "single.grafical.yaml");
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      [
        'diagram "Tiny" density=normal',
        'layer clients "Clients": web "Web" actor',
        'layer services "Services": api "API" service accent | worker "Worker" service',
        'layer storage "Storage": db "DB" store | mq "MQ" queue',
        "edges:",
        "web->api call",
        "api->db [data]",
        "api->mq [async]",
        "mq->worker [async]",
        "",
      ].join("\n"),
    );
    expect(r.out.length).toBeLessThan(read("single.grafical.yaml").length);
  });

  it("check reports no defects on a good file", () => {
    const r = run("check", "single.grafical.yaml", "--json");
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body).toMatchObject({ ok: true, changed: [], errors: [], defects: [] });
    expect(body.counts.crossings).toBe(0);
  });

  it("render writes the svg and the png beside the file", () => {
    const r = run("render", "single.grafical.yaml");
    expect(r.code, r.out + r.err).toBe(0);
    expect(existsSync(join(dir, "single.svg"))).toBe(true);
    const png = readFileSync(join(dir, "single.png"));
    expect(Array.from(png.subarray(1, 4))).toEqual([0x50, 0x4e, 0x47]);
    expect(readFileSync(join(dir, "single.svg"), "utf8").startsWith("<svg")).toBe(true);
  });

  it("show --drawn prints the drawing as facts and counts (D37)", () => {
    const r = run("show", "single.grafical.yaml", "--drawn");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^counts nodes=\d+ lines=\d+ crossings=\d+/);
    expect(r.out).toMatch(/^box id=api row=\S+ place=\d+ of=\d+/m);
    expect(r.out).toMatch(
      /^line id=api->db from=api to=db leaves=\w+ enters=\w+ bends=\d+ length=\d+/m,
    );
    const json = JSON.parse(run("show", "single.grafical.yaml", "--drawn", "--json").out);
    expect(json.drawing.counts.nodes).toBeGreaterThan(0);
  });

  it("try reports the counts before and after a batch, and writes nothing (D37)", () => {
    const before = readFileSync(join(dir, "single.grafical.yaml"), "utf8");
    writeFileSync(join(dir, "try.yaml"), "- {op: node.rename, id: api, label: API service}\n");
    const r = run("try", "single.grafical.yaml", "try.yaml");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(
      /^ok would change: api\nbefore nodes=\d+ lines=\d+ crossings=\d+.*\nafter nodes=\d+.*\ndelta nodes=0 lines=0 crossings=[-+]?\d+ /,
    );
    expect(readFileSync(join(dir, "single.grafical.yaml"), "utf8")).toBe(before);
    const json = JSON.parse(run("try", "single.grafical.yaml", "try.yaml", "--json").out);
    expect(json.after.nodes).toBe(json.before.nodes);
    expect(json.delta.length).toBe(json.after.length - json.before.length);
    writeFileSync(join(dir, "try-bad.yaml"), "- {op: node.rename, id: nope, label: X}\n");
    const bad = run("try", "single.grafical.yaml", "try-bad.yaml");
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("unknown-node");
  });

  it("render with one flag writes only that file", () => {
    const r = run("render", "single.grafical.yaml", "--png", "only.png", "--scale", "1");
    expect(r.code).toBe(0);
    expect(existsSync(join(dir, "only.png"))).toBe(true);
    expect(r.out).toMatch(/^wrote only.png\nok\ncounts nodes=/);
    // A flag with no path writes only that file, beside the diagram.
    const beside = run("render", "single.grafical.yaml", "--png", "--scale", "1");
    expect(beside.code).toBe(0);
    expect(beside.out).toMatch(/^wrote single.png\nok\ncounts nodes=/);
  });

  it("the help read before a draft is byte-stable and within the old guide's budget", () => {
    const a = run("--help");
    const b = run("--help");
    expect(a.code).toBe(0);
    expect(a.out).toBe(b.out);
    const draft = a.out + run("new", "--help").out + run("apply", "--help").out;
    expect(draft.length).toBeLessThan(12000);
    expect(draft).toContain("grafical apply");
  });
});
