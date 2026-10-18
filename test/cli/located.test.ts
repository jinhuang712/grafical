// The batch line a refused write names as a problem's source is never wrong (DESIGN.md, "Refusals say what happened
// and which commands can change it"): it is the line after the last prefix of the batch without the problem, when
// every longer prefix has it; or the batch file alone, when that cannot be known within the prefixes grafical tries.
// Found by review on 2026-10-18: a search that halved the range assumed a problem that appears stays.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { check } from "../../src/check/index.ts";
import {
  attempt,
  batchOps,
  defectKey,
  errorKey,
  isReport,
  type Report,
} from "../../src/cli/pipeline.ts";
import { layout } from "../../src/layout/index.ts";
import { applyOps, type Diagram, type Op, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { unknownWeights } from "../../src/theme/themes.ts";
import { rng } from "../fuzz/gen.ts";

vi.setConfig({ testTimeout: 300_000 });

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

const grocer = readDiagram(
  readFileSync(join(import.meta.dirname, "../fixtures/grocer.grafical.yaml"), "utf8"),
) as Diagram;
const WORD = "Antidisestablishmentarianism";
const LONG = `"${WORD} ${WORD} ${WORD} ${WORD}"`;
const BATCH = "b.yaml";

/** A batch of these lines refused on a diagram: its ops, the lines its items start on, and its report. */
function refuse(base: Diagram, lines: readonly string[]) {
  const read = batchOps(BATCH, `${lines.join("\n")}\n`, `grafical apply d.grafical.yaml ${BATCH}`);
  if (isReport(read)) throw new Error(JSON.stringify(read.errors));
  const r = attempt(base, read.ops, read.origin, m);
  if (!isReport(r)) throw new Error(`accepted: ${lines.join(" ")}`);
  const starts = read.origin.batch?.items.map((x) => x.line) ?? [];
  return { ops: read.ops, starts, report: r };
}

/** The problems of a report whose source is found by trying prefixes: errors of the whole diagram, and defects. */
function located(r: Report) {
  return [
    ...r.errors
      .filter((e) => e.whole)
      .map((e) => ({ key: errorKey(e), defect: false, source: e.source })),
    ...r.defects.map((d) => ({ key: defectKey(d), defect: true, source: d.source })),
  ];
}

/**
 * The oracle: every prefix applied as a write does, and the problem's line, the one after the last prefix without it
 * when every longer prefix has it; 0 when every prefix and the file have it; undefined when a prefix after the last
 * one without it is refused for another problem.
 */
function truth(
  base: Diagram,
  ops: readonly Op[],
  key: string,
  defect: boolean,
): number | undefined {
  const seq: ("P" | "A" | "U")[] = [];
  for (let k = 0; k <= ops.length; k++) {
    const r = applyOps(base, ops.slice(0, k));
    if ("errors" in r) {
      seq.push(r.errors.map(errorKey).includes(key) ? "P" : "U");
      continue;
    }
    const weights = unknownWeights(r.diagram);
    if (weights.length > 0) {
      seq.push(weights.map((e) => errorKey({ ...e, whole: true })).includes(key) ? "P" : "U");
      continue;
    }
    if (!defect) {
      seq.push("A");
      continue;
    }
    const found = check(r.diagram, layout(r.diagram, m), m, false).filter(
      (x) => x.owner === "agent",
    );
    seq.push(found.map(defectKey).includes(key) ? "P" : "A");
  }
  const a = seq.lastIndexOf("A");
  return seq.slice(a + 1).every((x) => x === "P") ? a + 1 : undefined;
}

/** What a printed source says: the item it names, from 1; 0 for the file; undefined for the batch alone. */
function named(source: string | undefined, starts: readonly number[]): number | undefined {
  if (source === "already in the file") return 0;
  if (source === BATCH) return undefined;
  const line = Number(source?.match(/^b\.yaml line (\d+): /)?.[1]);
  const k = starts.indexOf(line) + 1;
  if (k === 0) throw new Error(`no such line: ${source}`);
  return k;
}

describe("the batch line a refused write names", () => {
  it("is after the last prefix without the problem, when the problem goes and comes back", () => {
    // The label is too long after line 1, fits after line 2, and is too long again after line 3.
    const nm1 = [
      `- {op: node.add, id: big, label: ${LONG}, layer: row-callers, last: true, size: s}`,
      "- {op: node.rename, id: big, label: Short}",
      `- {op: node.rename, id: big, label: ${LONG}}`,
    ];
    const r1 = refuse(grocer, nm1);
    expect(r1.report.defects.map((d) => d.source)).toEqual([
      `${BATCH} line 3: ${nm1[2]?.slice(2)}`,
    ]);
    // A group split around picker-app, joined, and split again.
    const nm3 = [
      "- {op: group.add, id: g, label: G, nodes: [customers, courier-app]}",
      "- {op: group.join, group: g, nodes: [picker-app]}",
      "- {op: group.leave, nodes: [picker-app]}",
    ];
    const r3 = refuse(grocer, nm3);
    expect(r3.report.errors.map((e) => e.source)).toEqual([`${BATCH} line 3: ${nm3[2]?.slice(2)}`]);
    // A label that fits only while the boxes size to their text.
    const lng = structuredClone(grocer);
    lng.layers[0]?.nodes.push({
      id: "lng",
      label: "Supercalifragilistic expialidocious wording",
      kind: "service",
    });
    const nm4 = [
      "- {op: diagram.sizing, mode: fixed}",
      "- {op: diagram.title, text: T1}",
      "- {op: diagram.title, text: T2}",
      "- {op: diagram.title, text: T3}",
      "- {op: diagram.sizing, mode: auto}",
      "- {op: diagram.sizing, mode: fixed}",
      "- {op: diagram.title, text: T4}",
      "- {op: diagram.title, text: T5}",
    ];
    const r4 = refuse(lng, nm4);
    expect(r4.report.defects.map((d) => d.source)).toEqual([
      `${BATCH} line 6: ${nm4[5]?.slice(2)}`,
    ]);
  });

  it("is not the file's when the batch takes the problem away and brings it back", () => {
    // The file splits the group around picker-app; line 1 joins it, line 2 leaves it again.
    const split = structuredClone(grocer);
    for (const n of split.layers[0]?.nodes ?? []) {
      if (n.id === "customers" || n.id === "courier-app") n.group = "g";
    }
    split.groups = [{ id: "g", label: "G" }];
    const nm5 = [
      "- {op: group.join, group: g, nodes: [picker-app]}",
      "- {op: group.leave, nodes: [picker-app]}",
    ];
    const r5 = refuse(split, nm5);
    expect(r5.report.errors.map((e) => e.source)).toEqual([`${BATCH} line 2: ${nm5[1]?.slice(2)}`]);
  });

  it("is none when a prefix after the last one without the problem cannot tell", () => {
    // Lines 2 to 4 split the group; whether the label is too long there cannot be known.
    const nm2 = [
      `- {op: node.add, id: big, label: ${LONG}, layer: row-callers, last: true, size: s}`,
      "- {op: group.add, id: g, label: G, nodes: [customers, courier-app]}",
      "- {op: node.rename, id: big, label: Short}",
      `- {op: node.rename, id: big, label: ${LONG}}`,
      "- {op: group.join, group: g, nodes: [picker-app]}",
    ];
    expect(refuse(grocer, nm2).report.defects.map((d) => d.source)).toEqual([BATCH]);
  });

  it("is, on random batches, the oracle's line or none", () => {
    const rows = grocer.layers.map((l) => l.id);
    const boxes = grocer.layers.flatMap((l) => l.nodes.map((n) => n.id));
    let lines = 0;
    let none = 0;
    for (let seed = 1; seed <= Number(process.env.LOCATED_SEEDS ?? 40); seed++) {
      const r = rng(seed);
      const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
      const added: string[] = [];
      const groups: string[] = [];
      const bars: string[] = [];
      const batch: string[] = [];
      for (let i = 0; i < 6; i++) {
        const x = r();
        const all = [...boxes, ...added];
        if (x < 0.2) {
          added.push(`n${i}`);
          batch.push(
            `- {op: node.add, id: n${i}, label: ${r() < 0.5 ? LONG : `n${i}`}, layer: ${pick(rows)}, last: true, size: s}`,
          );
        } else if (x < 0.35 && added.length > 0) {
          batch.push(
            `- {op: node.rename, id: ${pick(added)}, label: ${r() < 0.5 ? LONG : "Short"}}`,
          );
        } else if (x < 0.45) {
          groups.push(`g${i}`);
          batch.push(`- {op: group.add, id: g${i}, label: G, nodes: [${pick(all)}, ${pick(all)}]}`);
        } else if (x < 0.55 && groups.length > 0) {
          batch.push(`- {op: group.join, group: ${pick(groups)}, nodes: [${pick(all)}]}`);
        } else if (x < 0.62 && groups.length > 0) {
          batch.push(`- {op: group.leave, nodes: [${pick(all)}]}`);
        } else if (x < 0.7) {
          bars.push(`w${i}`);
          batch.push(`- {op: layer.add, id: w${i}, label: Bus, after: ${pick(rows)}}`);
        } else if (x < 0.8 && bars.length > 0) {
          batch.push(`- {op: layer.look, id: ${pick(bars)}${r() < 0.5 ? ", look: box" : ""}}`);
        } else if (x < 0.9) {
          batch.push(`- {op: diagram.sizing, mode: ${pick(["auto", "fixed"])}}`);
        } else {
          batch.push(`- {op: diagram.title, text: T${i}}`);
        }
      }
      const read = batchOps(
        BATCH,
        `${batch.join("\n")}\n`,
        `grafical apply d.grafical.yaml ${BATCH}`,
      );
      if (isReport(read)) continue;
      const res = attempt(grocer, read.ops, read.origin, m);
      if (!isReport(res)) continue;
      const starts = read.origin.batch?.items.map((x) => x.line) ?? [];
      for (const p of located(res)) {
        const said = named(p.source, starts);
        if (said === undefined) {
          none++;
          continue;
        }
        lines++;
        expect(said, `seed ${seed}: ${p.source}`).toBe(truth(grocer, read.ops, p.key, p.defect));
      }
    }
    // The batches name some lines, and leave some out.
    expect(lines).toBeGreaterThan(0);
    expect(none).toBeGreaterThan(0);
  });
});
