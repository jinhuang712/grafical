// The four D11 conditions, checked for both routers on the public brief.
// Condition 4 (license) is not code: see REPORT.md.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { loadAvoid } from "./avoid-router.js";
import { condition1 } from "./checks.js";
import { addedEdges, catalogSync, catalogSyncDense } from "./fixtures.js";
import { gapOptions } from "./gap-router.js";
import { type Diagram, type Edge, e, withEdge } from "./model.js";
import { type RouterName, route, routerNames, run } from "./pipeline.js";
import { place } from "./place.js";
import { diffAfterAdd, type StabilityResult } from "./stability.js";

const out = join(import.meta.dirname, "..", "..", ".out", "router");
const results: Record<string, unknown> = {};
const SLOW = 180_000;

beforeAll(async () => {
  const t0 = performance.now();
  await loadAvoid();
  results.avoidLoadMs = Math.round(performance.now() - t0);
});

afterAll(() => {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
});

/** Plausible and implausible single edges, from a fixed seed. */
function randomEdges(d: Diagram, n: number, seed: number): Edge[] {
  const ids = d.layers.flatMap((l) => l.nodes.map((x) => x.id));
  const taken = new Set(d.edges.map((x) => x.id));
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const edges: Edge[] = [];
  while (edges.length < n) {
    const from = ids[Math.floor(next() * ids.length)];
    const to = ids[Math.floor(next() * ids.length)];
    if (from === undefined || to === undefined || from === to) continue;
    const edge = e(from, to, "call", edges.length % 2 === 0 ? "new" : undefined);
    if (taken.has(edge.id)) continue;
    taken.add(edge.id);
    edges.push(edge);
  }
  return edges;
}

const additions = [...addedEdges, ...randomEdges(catalogSync, 40, 7)];

interface Trial {
  diff: StabilityResult;
  cond1: boolean;
}

function stability(router: RouterName): Trial[] {
  const before = run(router, catalogSync);
  return additions.map((edge) => {
    const after = run(router, withEdge(catalogSync, edge));
    return {
      diff: diffAfterAdd(before, after, catalogSync, edge),
      cond1: condition1(after.report),
    };
  });
}

function summary(trials: Trial[]) {
  const changed = trials.map((x) => x.diff.changedRoutes.length);
  const tag = (pick: (d: StabilityResult) => string[]) =>
    trials.flatMap((x) => pick(x.diff).map((v) => `${x.diff.added}: ${v}`));
  return {
    additions: trials.length,
    edgesBefore: catalogSync.edges.length,
    routeViolations: tag((d) => d.routeViolations),
    labelViolations: tag((d) => d.labelViolations),
    changedRoutesMean: Number((changed.reduce((a, b) => a + b, 0) / changed.length).toFixed(1)),
    changedRoutesMax: Math.max(...changed),
    changedOutsideSharedGaps: tag((d) => d.changedOutsideSharedGaps),
    afterAddFailingCondition1: trials.filter((x) => !x.cond1).map((x) => x.diff.added),
    listed: trials.slice(0, addedEdges.length).map((x) => ({
      added: x.diff.added,
      gaps: x.diff.addedGaps,
      changed: x.diff.changedRoutes.length,
    })),
  };
}

describe.each(routerNames)("%s router", (router: RouterName) => {
  test("condition 1: no edge through a node, no label collision", () => {
    const r = run(router, catalogSync);
    results[`${router}.condition1`] = r.report;
    expect(r.report.notOrthogonal).toEqual([]);
    expect(r.report.edgeThroughNode).toEqual([]);
    expect(r.report.labelCollisions).toEqual([]);
    expect(r.report.unplacedLabels).toEqual([]);
  });

  test(
    "condition 2: adding one edge changes no route outside D10's list",
    () => {
      const trials = stability(router);
      results[`${router}.condition2`] = summary(trials);
      expect(trials.flatMap((x) => x.diff.moved)).toEqual([]);
      expect(trials.flatMap((x) => x.diff.routeViolations)).toEqual([]);
    },
    SLOW,
  );

  test(
    "dense variant of about 50 nodes routes without an edge through a node",
    () => {
      const r = run(router, catalogSyncDense);
      results[`${router}.dense`] = {
        nodes: catalogSyncDense.layers.reduce((n, l) => n + l.nodes.length, 0),
        edges: catalogSyncDense.edges.length,
        ...r.report,
      };
      expect(r.report.notOrthogonal).toEqual([]);
      expect(r.report.edgeThroughNode).toEqual([]);
    },
    SLOW,
  );

  test(
    "route time",
    () => {
      for (const [name, d] of [
        ["catalog-sync", catalogSync],
        ["dense", catalogSyncDense],
      ] as const) {
        const p = place(d);
        const times: number[] = [];
        for (let i = 0; i < 7; i++) {
          const t0 = performance.now();
          route(router, d, p);
          times.push(performance.now() - t0);
        }
        times.sort((a, b) => a - b);
        const median = times[3] ?? 0;
        results[`${router}.routeMs.${name}`] = Number(median.toFixed(2));
        expect(median).toBeLessThan(30_000);
      }
    },
    SLOW,
  );
});

test("experiment: gap router with tracks on fixed slots", () => {
  gapOptions.tracks = "fixed";
  try {
    const trials = stability("gap");
    results["gap-fixed.condition2"] = summary(trials);
    results["gap-fixed.condition1"] = run("gap", catalogSync).report;
    expect(trials.flatMap((x) => x.diff.routeViolations)).toEqual([]);
  } finally {
    gapOptions.tracks = "spread";
  }
});

// SVG sha256, recorded on macOS (arm64, Node 24.14). CI compares on Linux and macOS.
const recorded: Record<string, string> = {
  "gap:catalog-sync": "8dae5f8246b1ad80cd7412d79074bec12120dc798e59426ff7028c7d6bbdd229",
  "gap:catalog-sync-dense": "d93e579d643683d416a7af577ccdae140541d405ebc0e05cafa47e3bbfeb44aa",
  "avoid:catalog-sync": "d3dbfcf58e8755c18bf2837f72db2aac6b397f40d2f1b338d96aef6e8dc4d4ef",
  "avoid:catalog-sync-dense": "2213f2822da270281a5027e65a8d792ec255ecebfb3d835d2007ffc98a1f4d26",
};

describe("condition 3: same input, same SVG bytes", () => {
  for (const router of routerNames) {
    for (const [name, d] of [
      ["catalog-sync", catalogSync],
      ["catalog-sync-dense", catalogSyncDense],
    ] as const) {
      test(
        `${name} with ${router}`,
        () => {
          const svg = run(router, d).svg;
          expect(run(router, d).svg).toBe(svg);
          const hash = createHash("sha256").update(svg).digest("hex");
          results[`${router}.sha256.${name}`] = hash;
          expect(hash).toBe(recorded[`${router}:${name}`]);
        },
        SLOW,
      );
    }
  }
});
