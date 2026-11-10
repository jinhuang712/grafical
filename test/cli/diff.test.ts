import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { commandLines } from "../../src/cli/diff.ts";
import { build } from "../../src/cli/main.ts";
import { inward } from "../../src/cli/surface.ts";
import { diffDiagrams } from "../../src/model/diff.ts";
import { readDiagram } from "../../src/model/io.ts";
import type { Diagram } from "../../src/model/types.ts";
import { typed } from "./argv.ts";

const MAIN = resolve(import.meta.dirname, "../../src/cli/main.ts");
vi.setConfig({ testTimeout: 60_000 });

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "grafical-diff-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

// Run from a git hook or `git rebase --exec`, git's variables would point these commands at the
// repository under test: drop them so git finds the temporary folder's own repository.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));

function run(...args: string[]) {
  const r = spawnSync("node", [MAIN, ...typed(args)], { cwd: dir, env, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
function git(...args: string[]) {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], {
    cwd: dir,
    env,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(r.stderr);
}

describe('grafical diff (specs/decisions, "Git as the history")', () => {
  it("reports changes since a revision as command lines that replay them", () => {
    git("init", "-q");
    const f = "d.grafical";
    run("diagram", "set", f, "--title", "D");
    run("layer", "set", f, "row", "--label", "Row");
    run("node", "set", f, "a", "--layer", "row", "--label", "A");
    git("add", f);
    git("commit", "-q", "-m", "first");
    expect(run("diff", f).out).toBe("# no changes\n");

    run("node", "set", f, "a", "--label", "Alpha beta");
    run("node", "set", f, "b", "--layer", "row", "--label", "B's", "--last");
    run("edge", "set", f, "a-b", "--from", "a", "--to", "b", "--label", "reads\\nwrites");
    const d = run("diff", f);
    expect(d.code).toBe(0);
    expect(d.out).toBe(
      [
        "grafical -f d.grafical node --set b --label 'B'\\''s' --type service --layer row --after a",
        "grafical -f d.grafical node --set a --label 'Alpha beta'",
        "grafical -f d.grafical edge --set a-b --from a --to b --label 'reads\\nwrites' --type call",
        "",
      ].join("\n"),
    );
    const json = JSON.parse(run("diff", f, "HEAD", "--json").out);
    expect(json.outcome).toBe("OK");
    expect(json.commands).toEqual(d.out.trimEnd().split("\n"));

    // The lines, run in order by a shell on the revision's file, give the file on disk.
    const old = spawnSync("git", ["show", `HEAD:./${f}`], {
      cwd: dir,
      env,
      encoding: "utf8",
    }).stdout;
    writeFileSync(join(dir, "old.grafical"), old);
    const script = d.out.replaceAll("grafical -f d.grafical ", `node ${MAIN} -f old.grafical `);
    const sh = spawnSync("sh", ["-e", "-c", script], { cwd: dir, env, encoding: "utf8" });
    expect(sh.status, sh.stdout + sh.stderr).toBe(0);
    expect(readFileSync(join(dir, "old.grafical"), "utf8")).toBe(
      readFileSync(join(dir, f), "utf8"),
    );
  });

  it("builds a file the revision does not have from nothing", () => {
    run("diagram", "set", "n.grafical", "--title", "New");
    expect(run("diff", "n.grafical").out).toBe(
      "grafical -f n.grafical diagram --set --title New\n",
    );
  });

  it("refuses a revision that does not exist", () => {
    const r = run("diff", "d.grafical", "nosuchrev");
    expect(r.code).toBe(1);
    expect(r.out).toContain("bad-revision");
  });

  it("builds every saved fixture from nothing, one command line at a time, byte for byte", async () => {
    const fixtures = join(import.meta.dirname, "../fixtures");
    const into = mkdtempSync(join(tmpdir(), "grafical-replay-"));
    try {
      // The marks the fixtures name sit beside them.
      for (const f of readdirSync(fixtures))
        if (!f.endsWith(".ts") && !f.endsWith(".grafical"))
          copyFileSync(join(fixtures, f), join(into, f));
      for (const name of readdirSync(fixtures).filter((f) => f.endsWith(".grafical"))) {
        const text = readFileSync(join(fixtures, name), "utf8");
        const file = join(into, name);
        for (const line of commandLines(
          diffDiagrams(null, readDiagram(text) as Diagram),
          file,
          build(),
        )) {
          const out = await inProcess(shellWords(line).slice(1));
          expect(out.code, `${name}: ${line}\n${out.text}`).toBe(0);
        }
        expect(readFileSync(file, "utf8"), name).toBe(text);
      }
    } finally {
      rmSync(into, { recursive: true, force: true });
    }
  });
});

/** A line's words as a POSIX shell reads them: single quotes, and words apart at spaces. */
function shellWords(line: string): string[] {
  const words: string[] = [];
  let word: string | undefined;
  for (let i = 0; i < line.length; i++) {
    const c = line[i] as string;
    if (c === " ") {
      if (word !== undefined) words.push(word);
      word = undefined;
    } else if (c === "'") {
      const end = line.indexOf("'", i + 1);
      word = (word ?? "") + line.slice(i + 1, end);
      i = end;
    } else if (c === "\\") {
      word = (word ?? "") + line[i + 1];
      i++;
    } else word = (word ?? "") + c;
  }
  if (word !== undefined) words.push(word);
  return words;
}

/** A command run in this process: its exit code and what it printed. */
async function inProcess(words: string[]): Promise<{ code: number; text: string }> {
  let text = "";
  const write = process.stdout.write;
  process.stdout.write = ((s: string) => {
    text += s;
    return true;
  }) as typeof process.stdout.write;
  process.exitCode = 0;
  try {
    await build().parseAsync(inward(words) as string[], { from: "user" });
  } finally {
    process.stdout.write = write;
  }
  const code = Number(process.exitCode ?? 0);
  process.exitCode = 0;
  return { code, text };
}
