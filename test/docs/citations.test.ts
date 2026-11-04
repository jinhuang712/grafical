import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Code and documents cite a section of a document by its heading, such as
// GOALS.md, "Speed", or a decision by its title, such as specs/decisions,
// "Our own gap router". Headings are addresses: this test fails when a
// citation names a heading that is gone, or when an old number is left in
// place of one.

const ROOT = join(import.meta.dirname, "..", "..");
const DECISIONS = "specs/decisions";
const PLAN = "plan";

/** Where a cited document lives. A citation names the file alone, such as GOALS.md. */
function located(doc: string): string {
  return ["GOALS.md", "ROADMAP.md", "TODO.md"].includes(doc) ? join(PLAN, doc) : doc;
}

/** The files that may cite: the documents, the specs, the code, the tests and the benchmark code. */
function sources(): string[] {
  const files = readdirSync(ROOT).filter((f) => f.endsWith(".md"));
  const walk = (dir: string, ext: RegExp): void => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const path = join(dir, name);
      if (statSync(join(ROOT, path)).isDirectory()) walk(path, ext);
      else if (ext.test(name)) files.push(path);
    }
  };
  walk(PLAN, /\.md$/);
  walk("specs", /\.md$/);
  walk("src", /\.(ts|yaml|svg)$/);
  walk("test", /\.(ts|yaml|svg)$/);
  for (const name of readdirSync(join(ROOT, "bench"))) {
    if (name.endsWith(".ts")) files.push(join("bench", name));
  }
  files.push(
    join("bench", "prompts", "types.yaml"),
    join("bench", "targets", "catalog-sync-grouped.svg"),
  );
  return files;
}

/**
 * The name a heading is cited by. A goal, a feature or a checkpoint goes without
 * its ID (`T2: Speed` is cited as "Speed"), a guideline without its number, a TODO
 * item without its priority and type, and a status mark goes too.
 */
function cited(heading: string): string {
  return heading
    .replace(/ (✅|🚧|🟨|⬜)$/u, "")
    .replace(/^(?:O|M|B|C|T|R|F|CP)\d+(?:\.\d+)*: /, "")
    .replace(/^\d+\. /, "")
    .replace(/^\[P\d\]\[[A-Z]+\] /, "");
}

/** A document's headings, as they are cited. The decisions are the titles of the files in specs/decisions. */
function headings(doc: string): Set<string> {
  const out = new Set<string>();
  if (doc === DECISIONS) {
    for (const name of readdirSync(join(ROOT, DECISIONS))) {
      if (name === "README.md") continue;
      const first = readFileSync(join(ROOT, DECISIONS, name), "utf8").split("\n")[0] ?? "";
      const m = /^# \d+\. (.+)$/.exec(first);
      if (m?.[1]) out.add(m[1]);
    }
    return out;
  }
  for (const line of readFileSync(join(ROOT, located(doc)), "utf8").split("\n")) {
    const m = /^#{1,6} (.+)$/.exec(line);
    if (m?.[1]) out.add(cited(m[1]));
  }
  return out;
}

const CITATION = /\b([A-Z]+\.md|specs\/decisions), ((?:\\?"[^"\\\n]+\\?"(?:, )?)+)/g;

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

  it("use no decision or benchmark number left from before 2026-10-15", () => {
    const left: string[] = [];
    for (const file of files) {
      let text = readFileSync(join(ROOT, file), "utf8");
      // The decisions' index keeps the old numbers under "Former IDs", and GOALS.md under "Former numbers".
      if (file === join(DECISIONS, "README.md"))
        text = text.slice(0, text.indexOf("## Former IDs"));
      if (file === located("GOALS.md")) text = text.slice(0, text.indexOf("## Former numbers"));
      for (const m of text.matchAll(/\bD\d{1,2}\b(?!")|\b[Bb]enchmarks? \d|\b[Gg]oal \d\b/g)) {
        left.push(`${file}: ${m[0]}`);
      }
    }
    expect(left).toEqual([]);
  });
});
