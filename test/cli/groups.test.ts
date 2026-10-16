import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { writeDiagram } from "../../src/model/io.ts";
import { nested } from "../fixtures/nested.ts";

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

// The example is taken from `grafical apply --help` as printed, so the help cannot drift
// from the tool.
function helpExample() {
  const lines = run("apply", "--help")
    .out.split("\n")
    .map((l) => l.slice(2));
  const line = lines.find((l) => l.startsWith("grafical new orders")) as string;
  const batch = `${lines.filter((l) => l.startsWith("- {op: ")).join("\n")}\n`;
  return { batch, line };
}

describe("grouped diagrams", () => {
  it("builds the example of apply --help with new and one apply, and show lists the groups", () => {
    const { batch, line } = helpExample();
    // The example's new line, split into words that keep quoted text together.
    const args = [...line.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? (m[2] as string));
    const n = run(...args.slice(1));
    expect(n.code).toBe(0);
    writeFileSync(join(dir, "batch.yaml"), batch);
    const r = run("apply", "orders.grafical.yaml", "batch.yaml");
    expect(r.out).toMatch(/^ok changed=/);
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
      "ok changed=g,a,b\n",
    );
    expect(run("group", "join", f, "g", "c").code).toBe(0);
    // Leaving the middle row: the box still spans it (DESIGN.md, "Rows unseen, groups as systems").
    expect(run("group", "leave", f, "b").code).toBe(0);
    expect(run("group", "join", f, "g", "b").code).toBe(0);
    expect(run("group", "join", f, "zz", "a").out).toContain("unknown-group");
    expect(run("group", "rename", f, "g", "--label", "Renamed").code).toBe(0);
    expect(run("group", "remove", f, "g").out).toBe("ok changed=g,a,b,c\n");
    expect(read(f)).not.toContain("group");
    expect(run("diagram", "subtitle", f).code).toBe(0);
    expect(run("diagram", "note", f, "--text", "Not shown: y.").code).toBe(0);
    const t = read(f);
    expect(t).not.toContain("subtitle");
    expect(t).toContain('note: "Not shown: y."');
    expect(run("diagram", "note", f).code).toBe(0);
    expect(read(f)).not.toContain("note");
  });

  it("lane commands change the file, and a group joins a lane whole", () => {
    const f = "orders.grafical.yaml";
    expect(
      run("lane", "add", f, "desk", "--label", "Desk team", "--members", "order-desk").code,
    ).toBe(0);
    expect(read(f)).toMatch(/lanes:\n {2}- id: desk\n {4}label: Desk team\n/);
    expect(run("lane", "rename", f, "desk", "--label", "Order desk team").code).toBe(0);
    expect(run("show", f).out).toContain(
      'lane desk "Order desk team" (columns): gateway, checkout',
    );
    const mixed = run("lane", "join", f, "desk", "row-store");
    expect(mixed.code).toBe(1);
    expect(mixed.out).toContain("lane-mixed");
    expect(run("lane", "leave", f, "order-desk").code).toBe(0);
    expect(run("lane", "remove", f, "desk").out).toBe("ok changed=desk\n");
    expect(read(f)).not.toContain("lane");
  });

  it('apply and check report the counts, in text and JSON, with no threshold (DESIGN.md, "Records over prose")', () => {
    const f = "big.grafical.yaml";
    run("new", f, "--title", "Big");
    const items = ["- op: layer.add\n  id: row\n  label: Row\n"];
    for (let i = 0; i < 17; i++) {
      items.push(
        `- op: node.add\n  id: n${i}\n  layer: row\n  label: N${i}\n  kind: queue\n  last: true\n`,
      );
    }
    writeFileSync(join(dir, "big.yaml"), items.join(""));
    const w = run("apply", f, "big.yaml");
    expect(w.code).toBe(0);
    expect(w.out).toMatch(/^counts nodes=17 lines=0 crossings=0 bends=0 .*fullest=row:17 /m);
    expect(w.out).not.toMatch(/warning|hint|too many/);
    const c = run("check", f, "--json");
    expect(c.code).toBe(0);
    const body = JSON.parse(c.out);
    expect(body.ok).toBe(true);
    expect(body.counts.nodes).toBe(17);
  });

  it('group copy writes the copy, and prints its refusals as records (DESIGN.md, "A group copy holds its inside")', () => {
    const f = "copy.grafical.yaml";
    run("new", f, "--title", "Copy");
    writeFileSync(
      join(dir, "copy.yaml"),
      [
        "- {op: layer.add, id: r1, label: R1}",
        "- {op: layer.add, id: r2, label: R2}",
        "- {op: node.add, id: lb, layer: r1, label: LB}",
        "- {op: node.add, id: web, layer: r2, label: Web}",
        "- {op: group.add, id: zone, label: Zone A, nodes: [web]}",
        "- {op: edge.add, from: lb, to: web}",
        "",
      ].join("\n"),
    );
    expect(run("apply", f, "copy.yaml").code).toBe(0);
    const args = ["group", "copy", f, "zone", "zone-b", "--label", "Zone B", "--suffix", "-b"];
    const missing = run(...args);
    expect(missing.code).toBe(1);
    expect(missing.out).toBe(
      "failed changed=-\nerror op=0 code=missing-field field=before,after found=- allowed=zone\n",
    );
    expect(run(...args, "--after", "zone", "--outside").out).toBe(
      "ok changed=zone-b,web-b,lb->web-b\n",
    );
    expect(run("show", f).out).toContain('layer r2 "R2": web "Web" service group=zone | web-b');
    expect(run(...args, "--after", "zone").out).toContain(
      "error op=0 code=duplicate-id field=into found=zone-b is=group",
    );
  });

  it("the help teaches the grouped style", () => {
    const help = run("--help").out + run("apply", "--help").out + run("group", "add", "--help").out;
    for (const w of ["group add", "subtitle", "Not shown:", "sublabel"]) {
      expect(help).toContain(w);
    }
  });
});

describe('groups inside groups on the command line (DESIGN.md, "Every layered diagram type")', () => {
  it('group title and group label say where a label sits, and show prints it (DESIGN.md, "The agent states where a group\'s label sits")', () => {
    const f = "titled.grafical.yaml";
    writeFileSync(join(dir, f), writeDiagram(nested));
    expect(run("group", "title", f, "vpc", "top-right").code).toBe(0);
    expect(read(f)).toContain("titleAt: top-right");
    expect(run("show", f).out).toContain("title=top-right");
    expect(run("group", "label", f, "vpc").code).toBe(0);
    expect(read(f)).not.toContain("titleAt");
    const wrong = run("group", "title", f, "vpc", "middle");
    expect(wrong.code).not.toBe(0);
    expect(wrong.err + wrong.out).toContain("bad-value");
    // A line runs out of the vpc's last row where its label would sit in the foot.
    const before = read(f);
    const blocked = run("group", "title", f, "vpc", "bottom");
    expect(blocked.code).not.toBe(0);
    expect(blocked.out).toContain(
      "defect code=title-blocked owner=agent elements=vpc,db->backup place=bottom clear=top-left,",
    );
    expect(read(f)).toBe(before);
  });

  it("adds, moves and removes a group inside another, and show names where each sits", () => {
    writeFileSync(join(dir, "shop.grafical.yaml"), writeDiagram(nested));
    const f = "shop.grafical.yaml";
    expect(run("group", "add", f, "zone", "--label", "zone b", "--in", "region").code).toBe(0);
    expect(run("show", f).out).toContain('group zone "zone b" in=region: (empty)');
    expect(run("group", "join", f, "zone", "backup").code).toBe(0);
    expect(run("group", "leave", f, "public", "--up").code).toBe(0);
    expect(run("show", f).out).toContain('group public "public subnet" in=region: lb, servers');
    expect(run("group", "remove", f, "private", "--out").code).toBe(0);
    expect(read(f)).not.toContain("group: private");
    const deep = run("group", "add", f, "rack", "--label", "rack", "--in", "zone");
    expect(deep.code).toBe(0);
    const tooDeep = run("group", "add", f, "shelf", "--label", "shelf", "--in", "rack");
    expect(tooDeep.code).not.toBe(0);
    expect(tooDeep.err + tooDeep.out).toContain("group-too-deep");
  });
});
