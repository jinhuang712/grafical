import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Code and documents cite a section of a document by its heading, such as
// DESIGN.md, "Our own gap router" (DESIGN.md, "Interfaces"). Headings are
// addresses: this test fails when a citation names a heading that is gone,
// or when an old decision number is left in place of one.

const ROOT = join(import.meta.dirname, "..", "..");

/** The files that may cite: the documents, the code, the tests and the benchmark code. */
function sources(): string[] {
  const files = readdirSync(ROOT).filter((f) => f.endsWith(".md"));
  const walk = (dir: string): void => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const path = join(dir, name);
      if (statSync(join(ROOT, path)).isDirectory()) walk(path);
      else if (/\.(ts|yaml|svg)$/.test(name)) files.push(path);
    }
  };
  walk("src");
  walk("test");
  for (const name of readdirSync(join(ROOT, "bench"))) {
    if (name.endsWith(".ts")) files.push(join("bench", name));
  }
  files.push(
    join("bench", "prompts", "types.yaml"),
    join("bench", "targets", "catalog-sync-grouped.svg"),
  );
  return files;
}

/** A document's headings, as they are cited: a decision without "Decision: " and its date. */
function headings(doc: string): Set<string> {
  const out = new Set<string>();
  for (const line of readFileSync(join(ROOT, doc), "utf8").split("\n")) {
    const m = /^#{1,6} (.+)$/.exec(line);
    if (!m?.[1]) continue;
    out.add(m[1].replace(/^Decision: /, "").replace(/ — \d{4}-\d{2}-\d{2}$/, ""));
  }
  return out;
}

const CITATION = /\b([A-Z]+\.md), ((?:\\?"[^"\\\n]+\\?"(?:, )?)+)/g;

describe("citations of document headings", () => {
  const files = sources();

  it("name a heading that exists", () => {
    const known = new Map<string, Set<string>>();
    const missing: string[] = [];
    for (const file of files) {
      const text = readFileSync(join(ROOT, file), "utf8");
      for (const m of text.matchAll(CITATION)) {
        const doc = m[1] ?? "";
        if (!known.has(doc)) known.set(doc, headings(doc));
        for (const name of (m[2] ?? "").matchAll(/\\?"([^"\\]+)\\?"/g)) {
          if (!known.get(doc)?.has(name[1] ?? "")) missing.push(`${file}: ${doc}, "${name[1]}"`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("use no decision number left from before 2026-10-15", () => {
    const left: string[] = [];
    for (const file of files) {
      let text = readFileSync(join(ROOT, file), "utf8");
      // DESIGN.md keeps the old numbers in its intro and in "Former IDs".
      if (file === "DESIGN.md")
        text = text.slice(text.indexOf("## Principles"), text.indexOf("## Former IDs"));
      for (const m of text.matchAll(/\bD\d{1,2}\b(?!")/g)) left.push(`${file}: ${m[0]}`);
    }
    expect(left).toEqual([]);
  });
});
