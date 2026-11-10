import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { applyOps, type Op } from "../../src/model/index.ts";
import { writeDiagram } from "../../src/model/io.ts";
import { nested } from "../fixtures/nested.ts";
import { typed } from "./argv.ts";

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
  const r = spawnSync("node", [MAIN, ...typed(args)], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const read = (f: string) => readFileSync(join(dir, f), "utf8");

// The example is taken from `grafical new --help` as printed, so the help cannot drift from the tool.
function helpExample(): string[][] {
  return run("diagram", "set", "--help")
    .out.split("\n")
    .map((l) => l.slice(2))
    .filter((l) => l.startsWith("grafical -f orders.grafical "))
    .map((l) => [...l.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? (m[2] as string)));
}

describe("grouped diagrams", () => {
  it("builds the example of new --help one command at a time, and show lists the groups", () => {
    const commands = helpExample();
    expect(commands.length).toBeGreaterThan(10);
    for (const words of commands) {
      // The words after grafical, as a caller types them.
      const r = spawnSync("node", [MAIN, ...words.slice(1)], { cwd: dir, encoding: "utf8" });
      expect(r.status, `${words.join(" ")}: ${r.stdout}${r.stderr}`).toBe(0);
      expect(r.stdout).toMatch(/^ok/);
    }
    const text = read("orders.grafical");
    expect(text).toContain('subtitle: "Two services coupled');
    expect(text).toMatch(
      /<group> order-desk \{\n}\n[\s\S]*<label> order-desk-label \{\n {2}on: @order-desk\n {2}text: "order-desk"\n/,
    );
    const s = run("show", "orders.grafical");
    expect(s.out).toContain('subtitle "Two services coupled only by the shared orders database."');
    expect(s.out).toContain('group order-desk "order-desk": gateway, checkout');
    expect(s.out).toContain('group shipping "shipping": events, dispatcher');
    expect(s.out).toContain("group=shipping");
    expect(run("check", "orders.grafical").code).toBe(0);
  });

  it("group and diagram commands change the file, and report errors", () => {
    const f = "g.grafical";
    run("diagram", "set", f, "--title", "G", "--subtitle", "S", "--caption", "N");
    run("layer", "set", f, "r1", "--label", "R1");
    run("layer", "set", f, "r2", "--label", "R2");
    run("layer", "set", f, "r3", "--label", "R3");
    run("node", "set", f, "a", "--layer", "r1", "--label", "A");
    run("node", "set", f, "b", "--layer", "r2", "--label", "B");
    run("node", "set", f, "c", "--layer", "r3", "--label", "C");
    // The nodes have no edges: each write prints those warnings after its outcome.
    expect(run("group", "set", f, "g", "--label", "G").out).toMatch(
      /^ok changed=g\n\nwarning: lonely-node\n/,
    );
    expect(run("node", "set", f, "a,b", "--group", "g").out).toMatch(/^ok changed=a,b\n/);
    expect(run("node", "set", f, "c", "--group", "g").code).toBe(0);
    // Leaving the middle layer: the node still spans it (specs/decisions, "Layers unseen, groups as systems").
    expect(run("node", "set", f, "b", "--group", "-").code).toBe(0);
    expect(run("node", "set", f, "b", "--group", "g").code).toBe(0);
    expect(run("node", "set", f, "a", "--group", "zz").out).toContain("unknown-group");
    expect(run("group", "set", f, "g", "--label", "Renamed").code).toBe(0);
    expect(run("group", "remove", f, "g").out).toMatch(/^ok changed=g,a,b,c\n/);
    expect(read(f)).not.toContain("group");
    expect(run("diagram", "set", f, "--subtitle", "-").code).toBe(0);
    expect(run("diagram", "set", f, "--caption", "Not shown: y.").code).toBe(0);
    const t = read(f);
    expect(t).not.toContain("subtitle");
    expect(t).toContain('caption: "Not shown: y."');
    expect(run("diagram", "set", f, "--caption", "-").code).toBe(0);
    expect(read(f)).not.toContain("note");
  });

  it("lane commands change the file, and a group joins a lane whole", () => {
    const f = "orders.grafical";
    expect(run("lane", "set", f, "desk", "--label", "Desk team").code).toBe(0);
    expect(run("node", "set", f, "gateway,checkout", "--lane", "desk").code).toBe(0);
    expect(read(f)).toMatch(
      /<lane> desk \{[\s\S]*<label> desk-label \{\n {2}on: @desk\n {2}text: "Desk team"\n/,
    );
    expect(run("lane", "set", f, "desk", "--label", "Order desk team").code).toBe(0);
    expect(run("show", f).out).toContain(
      'lane desk "Order desk team" (columns): gateway, checkout',
    );
    const mixed = run("layer", "set", f, "row-store", "--lane", "desk");
    expect(mixed.code).toBe(1);
    expect(mixed.out).toContain("lane-mixed");
    expect(run("node", "set", f, "gateway,checkout", "--lane", "-").code).toBe(0);
    expect(run("lane", "remove", f, "desk").out).toMatch(/^ok changed=desk\n/);
    expect(read(f)).not.toContain("lane");
  });

  it('check reports the counts, in text and JSON, with no threshold (specs/decisions, "Records over prose")', () => {
    const f = "big.grafical";
    const ops: Op[] = [
      { op: "diagram.set", title: "Big" },
      { op: "layer.set", ids: ["row"], label: "Row" },
    ];
    for (let i = 0; i < 17; i++) {
      ops.push({
        op: "node.set",
        ids: [`n${i}`],
        layer: "row",
        label: `N${i}`,
        type: "queue",
        last: true,
      });
    }
    const big = applyOps(null, ops);
    if ("errors" in big) throw new Error(JSON.stringify(big.errors));
    writeFileSync(join(dir, f), writeDiagram(big.diagram));
    const w = run("check", f);
    expect(w.code).toBe(0);
    expect(w.out).toMatch(/^counts nodes=17 edges=0 crossings=0 bends=0 .*fullest=row:17 /m);
    // No warning of too many nodes: only the facts, each node with no edges.
    expect(w.out.match(/^warning: .*$/gm)).toEqual(Array(17).fill("warning: lonely-node"));
    expect(w.out).not.toMatch(/hint|too many/);
    const c = run("check", f, "--json");
    expect(c.code).toBe(0);
    const body = JSON.parse(c.out);
    expect(body.ok).toBe(true);
    expect(body.counts.nodes).toBe(17);
  });

  it('group copy writes the copy, and prints its refusals as blocks (specs/decisions, "A group copy holds its inside")', () => {
    const f = "copy.grafical";
    run("diagram", "set", f, "--title", "Copy");
    for (const words of [
      ["layer", "set", f, "r1", "--label", "R1"],
      ["layer", "set", f, "r2", "--label", "R2"],
      ["node", "set", f, "lb", "--layer", "r1", "--label", "LB"],
      ["node", "set", f, "web", "--layer", "r2", "--label", "Web"],
      ["group", "set", f, "zone", "--label", "Zone A"],
      ["node", "set", f, "web", "--group", "zone"],
      ["edge", "set", f, "lb-web", "--from", "lb", "--to", "web"],
    ])
      expect(run(...words).code, words.join(" ")).toBe(0);
    const args = ["group", "copy", f, "zone", "zone-b", "--label", "Zone B", "--suffix", "-b"];
    const missing = run(...args);
    expect(missing.code).toBe(1);
    expect(missing.out).toBe(
      [
        "failed changed=-",
        "",
        "error: missing-field",
        "description: The operation lacks a field it needs, such as a node's place in a layer that has nodes.",
        'source: grafical -f copy.grafical group --copy zone zone-b --label "Zone B" --suffix -b',
        "detail:",
        "  field: place",
        "  allowed: zone",
        "next: -",
        "",
      ].join("\n"),
    );
    expect(run(...args, "--after", "zone", "--outside").out).toBe(
      "ok changed=zone-b,web-b,lb-web-b\n",
    );
    expect(run("show", f).out).toContain('layer r2 "R2": web "Web" service group=zone | web-b');
    expect(run(...args, "--after", "zone").out).toContain(
      'error: duplicate-id\ndescription: The id is taken.\nsource: grafical -f copy.grafical group --copy zone zone-b --label "Zone B" --suffix -b --after zone\ndetail:\n  field: into\n  found: zone-b\n',
    );
  });

  it("the help teaches the grouped style", () => {
    const help =
      run("--help").out + run("diagram", "set", "--help").out + run("group", "set", "--help").out;
    for (const w of ["group --set", "subtitle", "sublabel"]) {
      expect(help).toContain(w);
    }
  });
});

const longVpc = {
  ...nested,
  groups: (nested.groups ?? []).map((g) =>
    g.id === "vpc" ? { ...g, label: "virtual private cloud network" } : g,
  ),
};

describe('groups inside groups on the command line (specs/decisions, "Every layered diagram type")', () => {
  it("label set says where a group's label sits, and show prints it (specs/decisions, \"The agent states where a group's label sits\")", () => {
    const f = "titled.grafical";
    writeFileSync(join(dir, f), writeDiagram(nested));
    expect(run("label", "set", f, "vpc", "--at", "1").code).toBe(0);
    expect(read(f)).toContain("side: top");
    expect(run("show", f).out).toContain("title=1,top,inside");
    expect(run("label", "set", f, "vpc", "--at", "-").code).toBe(0);
    expect(read(f)).not.toContain("titleAt");
    const wrong = run("label", "set", f, "vpc", "--at", "middle");
    expect(wrong.code).not.toBe(0);
    expect(wrong.err + wrong.out).toContain("bad-type");
    // An edge runs out of the vpc's last layer where its long label would sit in the foot.
    writeFileSync(join(dir, f), writeDiagram(longVpc));
    const before = read(f);
    const blocked = run("label", "set", f, "vpc", "--at", "0.5", "--side", "bottom");
    expect(blocked.code).not.toBe(0);
    expect(blocked.out).toContain(
      "defect: title-blocked\ndescription: An edge runs where the group's title sits, and no edge moves for a title.\n",
    );
    expect(blocked.out).toContain(
      "detail:\n  owner: agent\n  group: vpc\n  edge: db-backup\n  place: 0.5 bottom inside\n  clear: 0.5 top inside, ",
    );
    expect(blocked.out).toMatch(/\nnext: node --move, edge --remove, label --set\n$/);
    expect(read(f)).toBe(before);
  });

  it("adds, moves and removes a group inside another, and show names where each sits", () => {
    writeFileSync(join(dir, "shop.grafical"), writeDiagram(nested));
    const f = "shop.grafical";
    expect(run("group", "set", f, "zone", "--label", "zone b", "--in", "region").code).toBe(0);
    expect(run("show", f).out).toContain('group zone "zone b" in=region: (empty)');
    expect(run("node", "set", f, "backup", "--group", "zone").code).toBe(0);
    expect(run("group", "set", f, "public", "--in", "region").code).toBe(0);
    expect(run("show", f).out).toContain('group public "public subnet" in=region: lb, servers');
    expect(run("group", "remove", f, "private", "--out").code).toBe(0);
    expect(read(f)).not.toContain("group: private");
    const deep = run("group", "set", f, "rack", "--label", "rack", "--in", "zone");
    expect(deep.code).toBe(0);
    const tooDeep = run("group", "set", f, "shelf", "--label", "shelf", "--in", "rack");
    expect(tooDeep.code).not.toBe(0);
    expect(tooDeep.err + tooDeep.out).toContain("group-too-deep");
  });
});
