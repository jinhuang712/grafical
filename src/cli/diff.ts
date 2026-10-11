// `grafical diff <file> [<rev>]` (DESIGN.md D18): how the file on disk differs
// from a git revision, as a batch of operations. `grafical apply` replays the
// batch on the revision's file and gets the file on disk.

import { spawnSync } from "node:child_process";
import { basename, dirname } from "node:path";
import { Document, type YAMLMap, type YAMLSeq } from "yaml";
import { readDiagram } from "../model/io.ts";
import type { Op } from "../model/ops.ts";
import type { Diagram } from "../model/types.ts";
import { failure, fileError, oneLine, type Report } from "./pipeline.ts";

/** The diagram as the revision holds it, or null when the revision has no such file. */
export function atRevision(file: string, rev: string): Diagram | null | Report {
  const r = spawnSync("git", ["-C", dirname(file), "show", `${rev}:./${basename(file)}`], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
  });
  if (r.error !== undefined) {
    return fileError("not-in-git", file, "git on the PATH", oneLine(String(r.error)));
  }
  if (r.status !== 0) {
    const why = r.stderr ?? "";
    if (/not a git repository/i.test(why)) {
      return fileError(
        "not-in-git",
        file,
        "a file inside a git repository",
        "git init, then commit",
      );
    }
    if (/does not exist in|exists on disk, but not in/.test(why)) return null;
    return failure([
      {
        code: "bad-revision",
        index: 0,
        field: "rev",
        found: rev,
        expected: "a git revision that exists, such as HEAD, HEAD~1 or a commit id",
        suggestion: oneLine(why.replace(/^fatal: /, "")),
      },
    ]);
  }
  const d = readDiagram(r.stdout);
  if (Array.isArray(d)) {
    return failure(d.map((e) => ({ ...e, found: `${e.found} (in ${rev})` })));
  }
  return d;
}

/** The operations as a YAML batch, one operation per line. */
export function formatOps(ops: Op[]): string {
  if (ops.length === 0) return "[] # no changes\n";
  const doc = new Document(ops);
  for (const item of (doc.contents as YAMLSeq<YAMLMap>).items) item.flow = true;
  return doc.toString({ lineWidth: 0 });
}
