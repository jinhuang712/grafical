// Label slots in a gutter: the order a slot fixes between runs is weighed for the crossings
// it forces, without the label's earlier place and through the order already fixed.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { check } from "../../src/check/index.ts";
import { countCrossings } from "../../src/check/taste.ts";
import { layout } from "../../src/layout/index.ts";
import { type Diagram, readDiagram } from "../../src/model/index.ts";
import type { Scene } from "../../src/scene.ts";
import { createMeasurer } from "../../src/text/index.ts";
import type { Measurer } from "../../src/text/types.ts";
import { dense } from "../fixtures/dense.ts";

let m: Measurer;
beforeAll(async () => {
  m = await createMeasurer();
});

function crossings(s: Scene, a: string, b: string): number {
  const ea = s.edges.find((e) => e.id === a);
  const eb = s.edges.find((e) => e.id === b);
  if (ea === undefined || eb === undefined) throw new Error(`${a} ${b}`);
  return countCrossings([ea, eb]);
}

describe("label slots", () => {
  // Found on 2026-10-16 in a saved agent draft: once "trip-matched" could no longer lie
  // across the matching group's side, its clear slot above the line was charged for
  // crossings counted with the label where it lay before, so it went below the line and
  // pushed the events fan-out above it, across matcher->events.
  it("weigh a slot without the label's earlier place", () => {
    const file = join(import.meta.dirname, "../fixtures/dispatch.grafical.yaml");
    const d = readDiagram(readFileSync(file, "utf8")) as Diagram;
    const s = layout(d, m);
    expect(check(d, s, m)).toEqual([]);
    for (const id of ["events->location-ingest", "events->payments-api"]) {
      expect(crossings(s, "matcher->events", id), id).toBe(0);
    }
  });

  // A slot beside full_load->mongo_control puts full_load->postgres above it and it above
  // retry_runner->mongo_control, which already lies above the goods_pipe fan-out: so
  // full_load->postgres would lie above the fan-out too, and cross it.
  it("weigh the order a slot fixes through the order already fixed", () => {
    const s = layout(dense, m);
    for (const id of ["full_load->postgres", "goods_pipe->postgres"]) {
      expect(crossings(s, id, "goods_pipe->i18n"), id).toBe(0);
    }
  });
});
