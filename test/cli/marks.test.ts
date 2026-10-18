// Marks through the command line (DESIGN.md, "Marks of any kind", "Output and determinism"): an emoji, text, an SVG and a
// PNG file; a changed or unsafe file is refused; the same file gives the same SVG.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
vi.setConfig({ testTimeout: 60_000 });

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-marks-"));
  writeFileSync(
    join(dir, "warn.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#d33"/></svg>',
  );
  // A 1 x 1 PNG.
  writeFileSync(
    join(dir, "dot.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  for (const args of [
    ["new", "d.grafical.yaml", "--title", "Marks"],
    ["layer", "add", "d.grafical.yaml", "top", "--label", "Services"],
    ["node", "add", "d.grafical.yaml", "billing", "--layer", "top", "--label", "Billing"],
  ]) {
    run(...args);
  }
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...args], { cwd: dir, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const read = (f: string) => readFileSync(join(dir, f), "utf8");
const icon = (slot: string, value?: string) =>
  run(
    "node",
    "icon",
    "d.grafical.yaml",
    "billing",
    "--slot",
    slot,
    ...(value ? ["--icon", value] : []),
  );

describe("grafical node icon", () => {
  it("puts an emoji in a corner and draws it as an image, not as text", () => {
    expect(icon("top-left", "⚠️").code).toBe(0);
    expect(read("d.grafical.yaml")).toContain("top-left: ⚠️");
    expect(run("show", "d.grafical.yaml").out).toContain('icon.top-left="⚠️"');
    expect(run("render", "d.grafical.yaml", "--svg", "o.svg").code).toBe(0);
    const svg = read("o.svg");
    expect(svg).toContain("<image ");
    expect(svg).toContain("data:image/svg+xml;base64,");
    expect(svg).not.toContain("⚠");
  });

  it("binds an SVG file with its hash, and a PNG file too", () => {
    expect(icon("top-right", "warn.svg").code).toBe(0);
    expect(icon("bottom-left", "dot.png").code).toBe(0);
    const file = read("d.grafical.yaml");
    expect(file).toMatch(/file: warn\.svg\n\s+sha256: [0-9a-f]{64}/);
    expect(file).toMatch(/file: dot\.png\n\s+sha256: [0-9a-f]{64}/);
    run("render", "d.grafical.yaml", "--svg", "o.svg");
    expect(read("o.svg")).toContain("data:image/png;base64,");
  });

  it('gives the same SVG bytes every time (DESIGN.md, "Output and determinism")', () => {
    run("render", "d.grafical.yaml", "--svg", "a.svg");
    run("render", "d.grafical.yaml", "--svg", "b.svg");
    expect(read("a.svg")).toBe(read("b.svg"));
  });

  it("refuses to load a diagram whose file changed, and names the command that sets the slot again", () => {
    writeFileSync(
      join(dir, "warn.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24"/></svg>',
    );
    const r = run("show", "d.grafical.yaml");
    expect(r.code).toBe(1);
    expect(r.out).toContain("error: mark-file-changed\n");
    expect(r.out).toContain("warn.svg");
    // Another slot's command does not get past it, but setting this slot again accepts the file.
    expect(icon("top-left", "!").code).toBe(1);
    expect(icon("top-right", "warn.svg").code).toBe(0);
    expect(run("show", "d.grafical.yaml").code).toBe(0);
  });

  it("refuses a missing file, an SVG with a script, and a file outside the folder", () => {
    writeFileSync(
      join(dir, "bad.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>',
    );
    writeFileSync(
      join(dir, "ext.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="http://x/y.png"/></svg>',
    );
    const fresh = "e.grafical.yaml";
    for (const args of [
      ["new", fresh, "--title", "E"],
      ["layer", "add", fresh, "top", "--label", "L"],
      ["node", "add", fresh, "n", "--layer", "top", "--label", "N"],
    ]) {
      run(...args);
    }
    const put = (v: string) => run("node", "icon", fresh, "n", "--slot", "top-left", "--icon", v);
    expect(put("nope.svg").out).toContain("error: mark-file-not-found\n");
    expect(put("bad.svg").out).toContain("error: mark-file-unsafe\n");
    expect(put("ext.svg").out).toContain("error: mark-file-unsafe\n");
    expect(put("../warn.svg").out).toContain("error: mark-file-outside\n");
    expect(put("/etc/x.svg").out).toContain("error: mark-file-outside\n");
    expect(read(fresh)).not.toContain("icons");
  });

  it("refuses a text over 6 characters, and the left slot on a diamond", () => {
    const fresh = "f.grafical.yaml";
    for (const args of [
      ["new", fresh, "--title", "F"],
      ["layer", "add", fresh, "top", "--label", "L"],
      ["node", "add", fresh, "q", "--layer", "top", "--label", "Q", "--kind", "decision"],
    ]) {
      run(...args);
    }
    expect(
      run("node", "icon", fresh, "q", "--slot", "top-left", "--icon", "TOOLONG").out,
    ).toContain("error: mark-too-long\n");
    expect(run("node", "icon", fresh, "q", "--slot", "left", "--icon", "!").out).toContain(
      "allowed: top-left, top-right, bottom-left, bottom-right\n",
    );
  });

  it("draws a text mark on the background it is given, with text that reads on it", () => {
    const f = "g.grafical.yaml";
    for (const args of [
      ["new", f, "--title", "G"],
      ["layer", "add", f, "top", "--label", "L"],
      ["node", "add", f, "n", "--layer", "top", "--label", "N"],
    ]) {
      run(...args);
    }
    expect(
      run("node", "icon", f, "n", "--slot", "top-left", "--icon", "P0", "--bg", "red").code,
    ).toBe(0);
    expect(
      run("node", "icon", f, "n", "--slot", "top-right", "--icon", "NEW", "--bg", "#f5c542").code,
    ).toBe(0);
    expect(run("show", f).out).toContain("icon.top-left.bg=#d1242f");
    run("render", f, "--svg", "g.svg");
    const svg = read("g.svg");
    expect(svg).toMatch(/rx="4" fill="#d1242f"/);
    expect(svg).toMatch(/rx="4" fill="#f5c542"/);
    // Light text on the red badge, dark text on the yellow one.
    expect(svg).toMatch(/fill="#ffffff"[^>]*>P0</);
    expect(svg).toMatch(/fill="#1f2328"[^>]*>NEW</);
    expect(
      run("node", "icon", f, "n", "--slot", "left", "--icon", "⚠️", "--bg", "red").out,
    ).toContain("error: mark-style-on-picture\n");
    expect(
      run("node", "icon", f, "n", "--slot", "left", "--icon", "P1", "--bg", "pink").out,
    ).toContain("allowed: red, amber, green, blue, purple, gray, dark, #rrggbb\n");
  });

  it("draws the border, shape, text color and size a text mark is given", () => {
    const f = "h.grafical.yaml";
    for (const args of [
      ["new", f, "--title", "H"],
      ["layer", "add", f, "top", "--label", "L"],
      ["node", "add", f, "n", "--layer", "top", "--label", "N", "--size", "l"],
    ]) {
      run(...args);
    }
    const put = (slot: string, ...rest: string[]) =>
      run("node", "icon", f, "n", "--slot", slot, "--icon", ...rest);
    expect(
      put("top-left", "P0", "--bg", "#fff3bf", "--border", "#bf8700", "--shape", "pill").code,
    ).toBe(0);
    expect(
      put("top-right", "NEW", "--bg", "blue", "--fg", "#ffd43b", "--size", "l", "--shape", "square")
        .code,
    ).toBe(0);
    run("render", f, "--svg", "h.svg");
    const svg = read("h.svg");
    // Pill: the radius is half the height (20 px), less the border's inset. Square: no radius.
    expect(svg).toMatch(/rx="9\.25" fill="#fff3bf" stroke="#bf8700" stroke-width="1\.5"/);
    expect(svg).toMatch(/height="28" rx="0" fill="#0969da"/);
    expect(svg).toMatch(/fill="#ffd43b"[^>]*>NEW</);
    // No --fg: dark text on the pale badge.
    expect(svg).toMatch(/fill="#1f2328"[^>]*>P0</);
    expect(run("show", f).out).toContain("icon.top-left.border=#bf8700");
    expect(run("show", f).out).toContain("icon.top-right.size=l");
  });

  it("refuses a style on an emoji, and a shape that does not exist", () => {
    const f = "h.grafical.yaml";
    expect(
      run("node", "icon", f, "n", "--slot", "left", "--icon", "⚠️", "--fg", "red").out,
    ).toContain("error: mark-style-on-picture\n");
    expect(
      run("node", "icon", f, "n", "--slot", "left", "--icon", "P0", "--shape", "star").out,
    ).toContain("allowed: square, rounded, pill\n");
    expect(
      run("node", "icon", f, "n", "--slot", "left", "--icon", "P0", "--size", "xl").out,
    ).toContain("allowed: s, m, l\n");
  });

  it("clears a slot without --icon", () => {
    expect(icon("top-left").code).toBe(0);
    expect(read("d.grafical.yaml")).not.toContain("top-left");
  });
});
