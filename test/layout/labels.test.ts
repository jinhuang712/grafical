// Line labels and group boxes: a group's side is a line too, and no line's label lies across it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

describe("line labels and group sides", () => {
  // Found on 2026-10-15 in a C4 container diagram: the labels of two lines that leave the
  // system's group to the right lay across its side.
  it("keep a label off the side of a group its line leaves", () => {
    const file = join(import.meta.dirname, "../fixtures/big-bank.grafical.yaml");
    const d = readDiagram(readFileSync(file, "utf8")) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m)).toEqual([]);
    const g = s.groups?.find((x) => x.id === "ibs")?.rect;
    if (g === undefined) throw new Error("ibs");
    for (const id of ["mobile->api", "api->mainframe"]) {
      const b = s.edges.find((e) => e.id === id)?.label?.bbox;
      if (b === undefined) throw new Error(id);
      expect(b.x + b.w <= g.x + g.w || b.x >= g.x + g.w, id).toBe(true);
    }
  });
});
