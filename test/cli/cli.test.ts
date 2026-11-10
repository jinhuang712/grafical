import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { typed } from "./argv.ts";

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
  const r = spawnSync("node", [MAIN, ...typed(args)], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const read = (f: string) => readFileSync(join(dir, f), "utf8");

// tiny: 3 layers, 5 nodes, 4 edges.
const SINGLE: string[][] = [
  ["diagram", "set", "single.grafical", "--title", "Tiny"],
  ["layer", "set", "single.grafical", "clients", "--label", "Clients"],
  ["layer", "set", "single.grafical", "services", "--label", "Services"],
  ["layer", "set", "single.grafical", "storage", "--label", "Storage"],
  [
    "node",
    "set",
    "single.grafical",
    "web",
    "--layer",
    "clients",
    "--label",
    "Web",
    "--type",
    "actor",
  ],
  [
    "node",
    "set",
    "single.grafical",
    "api",
    "--layer",
    "services",
    "--label",
    "API",
    "--emphasis",
    "on",
  ],
  [
    "node",
    "set",
    "single.grafical",
    "worker",
    "--layer",
    "services",
    "--label",
    "Worker",
    "--last",
  ],
  [
    "node",
    "set",
    "single.grafical",
    "db",
    "--layer",
    "storage",
    "--label",
    "DB",
    "--type",
    "store",
  ],
  [
    "node",
    "set",
    "single.grafical",
    "mq",
    "--layer",
    "storage",
    "--label",
    "MQ",
    "--type",
    "queue",
    "--last",
  ],
  ["edge", "set", "single.grafical", "web-api", "--from", "web", "--to", "api", "--label", "call"],
  ["edge", "set", "single.grafical", "api-db", "--from", "api", "--to", "db", "--type", "data"],
  ["edge", "set", "single.grafical", "api-mq", "--from", "api", "--to", "mq", "--type", "async"],
  [
    "edge",
    "set",
    "single.grafical",
    "mq-worker",
    "--from",
    "mq",
    "--to",
    "worker",
    "--type",
    "async",
  ],
];

describe("write commands", () => {
  it("builds tiny with single commands", () => {
    for (const args of SINGLE) {
      const r = run(...args);
      expect(r.code, `${args.join(" ")}: ${r.out}${r.err}`).toBe(0);
    }
    const single = read("single.grafical");
    expect(single.startsWith('<diagram> {\n  format: 1\n  title: "Tiny"\n}\n')).toBe(true);
  });

  it("says what a write did as JSON on one line", () => {
    const r = run(
      "node",
      "set",
      "single.grafical",
      "cache",
      "--layer",
      "storage",
      "--label",
      "Cache",
      "--last",
      "--json",
    );
    expect(r.code).toBe(0);
    // The new node has no edges yet: a warning the write brought, from the command (specs/decisions, "An answer says
    // what happened, and a write reports only what it changed").
    expect(r.out).toBe(
      `${JSON.stringify({
        outcome: "WRITTEN",
        changes: [{ action: "MADE", sort: "node", id: "cache" }],
        warnings: { new: 1, cleared: [], total: 1 },
        problems: [
          {
            kind: "WARNING",
            code: "lonely-node",
            description:
              "No edge reaches a node: none of its own, and none to its group, layer or lane.",
            source:
              "grafical -f single.grafical node --set cache --layer storage --label Cache --last --json",
            detail: { node: "cache" },
            next: ["node --remove", "edge --set"],
          },
        ],
      })}\n`,
    );
    const rm = run("node", "remove", "single.grafical", "cache", "--json");
    expect(JSON.parse(rm.out)).toEqual({
      outcome: "WRITTEN",
      changes: [{ action: "REMOVED", sort: "node", id: "cache" }],
      warnings: { new: 0, cleared: [{ code: "lonely-node", node: "cache" }], total: 0 },
    });
  });

  it("leaves the file untouched and exits 1 when an operation fails", () => {
    const before = read("single.grafical");
    const r = run("node", "set", "single.grafical", "x", "--layer", "servces", "--label", "X");
    expect(r.code).toBe(1);
    expect(r.out).toBe(
      [
        "REFUSED",
        "<problems>",
        "  ERROR unknown-layer",
        "    description: No layer has the id.",
        "    source: grafical -f single.grafical node --set x --layer servces --label X",
        "    detail:",
        "      field: layer",
        "      found: servces",
        "      near: services, storage, clients",
        "    next: layer --set",
        "</problems>",
        "",
      ].join("\n"),
    );
    expect(read("single.grafical")).toBe(before);
  });

  it("gives the error as JSON", () => {
    const before = read("single.grafical");
    const r = run(
      "edge",
      "set",
      "single.grafical",
      "api-nope",
      "--from",
      "api",
      "--to",
      "nope",
      "--json",
    );
    expect(r.code).toBe(1);
    const j = JSON.parse(r.out);
    expect(j.outcome).toBe("REFUSED");
    expect(j.changes).toBeUndefined();
    expect(j.problems[0]).toMatchObject({
      kind: "ERROR",
      code: "unknown-node",
      description: "No node has the id.",
      detail: { field: "to", found: "nope" },
      next: ["node --set"],
    });
    expect(j.problems[0].detail.op).toBeUndefined();
    expect(read("single.grafical")).toBe(before);
  });

  it("refuses an unknown type, with the type it most likely means", () => {
    const r = run(
      "node",
      "set",
      "single.grafical",
      "n",
      "--layer",
      "storage",
      "--label",
      "N",
      "--type",
      "db",
      "--last",
    );
    expect(r.code).toBe(1);
    expect(r.out).toContain("  ERROR unknown-type\n");
    expect(r.out).toContain("      field: type\n      found: db\n");
    expect(r.out).toContain("      likely: store\n");
    expect(r.out).toContain("      allowed: service, store, queue, external, actor,");
  });

  it("makes a file only with a title, and a missing file is an error", () => {
    expect(run("diagram", "set", "untitled.grafical", "--subtitle", "S").code).toBe(1);
    expect(existsSync(join(dir, "untitled.grafical"))).toBe(false);
    const r = run("show", "missing.grafical");
    expect(r.code).toBe(1);
    expect(r.out).toContain("file-not-found");
  });

  it("exits 2 on usage errors", () => {
    expect(run("node", "set", "single.grafical").code).toBe(2);
    expect(run("bogus").code).toBe(2);
    expect(run("render", "single.grafical", "--scale", "9").code).toBe(2);
    expect(run().code).toBe(2);
  });

  it("prints the parser's refusals as blocks", () => {
    const opt = run("show", "single.grafical", "--bogus");
    expect(opt.code).toBe(2);
    expect(opt.err).toBe(
      [
        "REFUSED",
        "<problems>",
        "  ERROR unknown-option",
        "    description: The command has no option of the name.",
        "    source: grafical -f single.grafical show --bogus",
        "    detail:",
        "      found: --bogus",
        "    next: -",
        "</problems>",
        "",
      ].join("\n"),
    );
    expect(run("bogus").err).toContain("  ERROR unknown-command\n");
    expect(run("show").err).toContain("  ERROR missing-argument\n");
    expect(run("show").err).toContain("    detail:\n      field: --file\n");
    expect(run("diagram", "set", "x.grafical").out).toContain("    detail:\n      field: title\n");
    // With --json a usage error is the same object as any refusal, on standard output.
    const json = run("show", "single.grafical", "--bogus", "--json");
    expect(json.code).toBe(2);
    expect(json.err).toBe("");
    expect(JSON.parse(json.out)).toEqual({
      outcome: "REFUSED",
      problems: [
        {
          kind: "ERROR",
          code: "unknown-option",
          description: "The command has no option of the name.",
          source: "grafical -f single.grafical show --bogus --json",
          detail: { found: "--bogus" },
          next: [],
        },
      ],
    });
    expect(JSON.parse(run("bogus", "--json").out).problems[0].code).toBe("unknown-command");
    // Past `--` the word is an argument and not the flag.
    expect(run("bogus", "--", "--json").err).toContain("  ERROR unknown-command\n");
    // Extra arguments are what was found, beside the arguments the command takes.
    const extra = run("node", "remove", "single.grafical", "api", "worker");
    expect(extra.err).toContain("  ERROR excess-arguments\n");
    expect(extra.err).toContain("    detail:\n      found: worker\n      takes: <ids>\n");
  });

  it("sets an edge again with no change, and node remove takes its edges", () => {
    run("diagram", "set", "e.grafical", "--title", "E");
    run("layer", "set", "e.grafical", "l", "--label", "L");
    run("node", "set", "e.grafical", "p", "--layer", "l", "--label", "P");
    run("node", "set", "e.grafical", "q", "--layer", "l", "--label", "Q", "--last");
    expect(run("edge", "set", "e.grafical", "p-q", "--from", "p", "--to", "q").out).toBe(
      [
        "WRITTEN",
        "<changes>",
        "  MADE edge=p-q",
        "</changes>",
        "<warnings>",
        "  new=0 cleared=2 total=0",
        "  CLEARED lonely-node node=p",
        "  CLEARED lonely-node node=q",
        "</warnings>",
        "",
      ].join("\n"),
    );
    // Run twice, a command changes nothing (specs/decisions, "One command is one write, and running it twice changes nothing").
    expect(run("edge", "set", "e.grafical", "p-q", "--from", "p", "--to", "q").out).toBe(
      "UNCHANGED\n",
    );
    const second = run(
      "edge",
      "set",
      "e.grafical",
      "p-q2",
      "--from",
      "p",
      "--to",
      "q",
      "--label",
      "again",
    );
    expect(second.out).toMatch(/^WRITTEN\n<changes>\n {2}MADE edge=p-q2\n<\/changes>\n/);
    const rm = run("node", "remove", "e.grafical", "q");
    // The edges go with q, and p is left with none: a warning this command brought.
    expect(rm.out).toBe(
      [
        "WRITTEN",
        "<changes>",
        "  REMOVED node=q",
        "  REMOVED edge=p-q by=node:q",
        "  REMOVED edge=p-q2 by=node:q",
        "</changes>",
        "<warnings>",
        "  new=1 cleared=0 total=1",
        "</warnings>",
        "<problems>",
        "  WARNING lonely-node",
        "    description: No edge reaches a node: none of its own, and none to its group, layer or lane.",
        "    source: grafical -f e.grafical node --remove q",
        "    detail:",
        "      node: p",
        "    next: node --remove, edge --set",
        "</problems>",
        "",
      ].join("\n"),
    );
  });

  it('edge number numbers an edge, show prints it, and no --n clears it (specs/decisions, "Step badges ride the edge")', () => {
    run("diagram", "set", "s.grafical", "--title", "S");
    run("layer", "set", "s.grafical", "a", "--label", "A");
    run("layer", "set", "s.grafical", "b", "--label", "B");
    run("node", "set", "s.grafical", "p", "--layer", "a", "--label", "P");
    run("node", "set", "s.grafical", "q", "--layer", "b", "--label", "Q");
    run("edge", "set", "s.grafical", "p-q", "--from", "p", "--to", "q", "--label", "read");
    const numbered = "WRITTEN\n<changes>\n  CHANGED edge=p-q fields=number\n</changes>\n";
    expect(run("edge", "set", "s.grafical", "p-q", "--number", "3").out).toMatch(
      new RegExp(`^${numbered}`),
    );
    expect(read("s.grafical")).toContain("number: 3");
    expect(run("show", "s.grafical").out).toContain("  p-q (p->q) [step 3] read");
    expect(run("show", "s.grafical", "--drawn").out).toMatch(/^ {2}edge id=p-q .* step=3$/m);
    const bad = run("edge", "set", "s.grafical", "p-q", "--number", "0");
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("  ERROR bad-value\n");
    expect(bad.out).toContain(
      "    detail:\n      field: number\n      found: 0\n      min: 1\n      max: 99\n",
    );
    expect(run("edge", "set", "s.grafical", "p-q", "--number", "-").out).toMatch(
      new RegExp(`^${numbered}`),
    );
    expect(read("s.grafical")).not.toContain("step:");
    expect(run("show", "s.grafical", "--drawn").out).not.toContain("step=");
  });
});

describe("read commands", () => {
  it("show prints a compact view", () => {
    const r = run("show", "single.grafical");
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      [
        "OK",
        "<diagram>",
        '  diagram "Tiny"',
        '  layer clients "Clients": web "Web" actor',
        '  layer services "Services": api "API" service emphasis | worker "Worker" service',
        '  layer storage "Storage": db "DB" store | mq "MQ" queue',
        "  edges:",
        "  web-api (web->api) call",
        "  api-db (api->db) [data]",
        "  api-mq (api->mq) [async]",
        "  mq-worker (mq->worker) [async]",
        "</diagram>",
        "",
      ].join("\n"),
    );
    expect(r.out.length).toBeLessThan(read("single.grafical").length);
  });

  it("check reports no defects on a good file", () => {
    const r = run("check", "single.grafical", "--json");
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.outcome).toBe("OK");
    expect(body.problems).toBeUndefined();
    expect(body.counts.crossings).toBe(0);
  });

  it("render writes the svg and the png beside the file", () => {
    const r = run("render", "single.grafical");
    expect(r.code, r.out + r.err).toBe(0);
    expect(existsSync(join(dir, "single.svg"))).toBe(true);
    const png = readFileSync(join(dir, "single.png"));
    expect(Array.from(png.subarray(1, 4))).toEqual([0x50, 0x4e, 0x47]);
    expect(readFileSync(join(dir, "single.svg"), "utf8").startsWith("<svg")).toBe(true);
  });

  it('show --drawn prints the drawing as facts and counts (specs/decisions, "Records over prose")', () => {
    const r = run("show", "single.grafical", "--drawn");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^OK\n<drawing>\n {2}counts nodes=\d+ edges=\d+ crossings=\d+/);
    expect(r.out).toMatch(/^ {2}node id=api layer=\S+ place=\d+ of=\d+/m);
    expect(r.out).toMatch(
      /^ {2}edge id=api-db from=api to=db leaves=\w+ enters=\w+ bends=\d+ length=\d+/m,
    );
    expect(r.out).toMatch(
      /^ {2}gutter above=clients below=services edges=\d+ crossings=\d+ tight=\d+ crowded=\d+$/m,
    );
    expect(r.out).toMatch(/<\/drawing>\n$/);
    const json = JSON.parse(run("show", "single.grafical", "--drawn", "--json").out);
    expect(json.drawing.counts.nodes).toBeGreaterThan(0);
    expect(json.drawing.gutters).toHaveLength(2);
    expect(json.drawing.composition).toBeUndefined();
  });

  it('--try reports the counts before and after a command, and writes nothing (specs/decisions, "Records over prose")', () => {
    const before = readFileSync(join(dir, "single.grafical"), "utf8");
    const r = run("node", "set", "single.grafical", "api", "--label", "API service", "--try");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(
      /^TRIED\n<changes>\n {2}CHANGED node=api fields=label\n<\/changes>\n<before>\n {2}nodes=\d+ edges=\d+ crossings=\d+.*\n<\/before>\n<after>\n {2}nodes=\d+.*\n<\/after>\n<delta>\n {2}nodes=0 edges=0 crossings=[-+]?\d+ .*\n<\/delta>\n$/,
    );
    expect(readFileSync(join(dir, "single.grafical"), "utf8")).toBe(before);
    const json = JSON.parse(
      run("node", "set", "single.grafical", "api", "--label", "API service", "--try", "--json").out,
    );
    expect(json.after.nodes).toBe(json.before.nodes);
    expect(json.delta.length).toBe(json.after.length - json.before.length);
    // A command it would refuse is refused as the write would refuse it.
    const bad = run(
      "node",
      "set",
      "single.grafical",
      "nope",
      "--layer",
      "servces",
      "--label",
      "X",
      "--try",
    );
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("unknown-layer");
    expect(readFileSync(join(dir, "single.grafical"), "utf8")).toBe(before);
    // Every command that writes takes it; a file it would make has no picture before it, and is refused.
    expect(run("edge", "set", "single.grafical", "web-api", "--number", "1", "--try").code).toBe(0);
    expect(run("diagram", "set", "other.grafical", "--title", "X", "--try").code).toBe(1);
    expect(existsSync(join(dir, "other.grafical"))).toBe(false);
  });

  it("render with one flag writes only that file", () => {
    const r = run("render", "single.grafical", "--png", "only.png", "--scale", "1");
    expect(r.code).toBe(0);
    expect(existsSync(join(dir, "only.png"))).toBe(true);
    expect(r.out).toMatch(/^OK\n<files>\n {2}only.png\n<\/files>\n<counts>\n {2}nodes=/);
    // A flag with no path writes only that file, beside the diagram.
    const beside = run("render", "single.grafical", "--png", "--scale", "1");
    expect(beside.code).toBe(0);
    expect(beside.out).toMatch(/^OK\n<files>\n {2}single.png\n<\/files>\n<counts>\n {2}nodes=/);
  });

  // No size limit while the help's correctness comes first (specs/decisions, "One entry page, help where it is used").
  it("the help read before a draft is byte-stable", () => {
    const a = run("--help");
    const b = run("--help");
    expect(a.code).toBe(0);
    expect(a.out).toBe(b.out);
    expect(a.out).toContain("--try");
  });
});
