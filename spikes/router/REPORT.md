# Router spike: our gap router or libavoid-js (D11)

> Run on 2026-10-11, branch `spike/router`. This report records findings. The owner records the decision in DESIGN.md.

## Answer

**Use our own gap router.** Both routers meet conditions 1 to 3 on `bench/briefs/catalog-sync.md`. Only ours clearly meets condition 4. It is also about 900 times faster, keeps changes closer to where an edge was added, and never draws two unrelated edges on top of each other. libavoid's real advantage is fewer crossings: 40 against our 68.

## What was built

All code is in `spikes/router/`.

| File | Holds |
|---|---|
| `model.ts`, `fixtures.ts` | A minimal model and the hand-written brief: 6 layers, 30 nodes, 41 edges, 3 alignments. A dense variant has 7 layers, 50 nodes and 70 edges. There are 5 listed extra edges for the stability test |
| `place.ts` | D10 placement: left-aligned layers, nodes by order, a fixed box size per size step, gaps from the density, no optimization. Alignment centres a node under a node in an earlier layer, and an alignment that breaks the order is rejected. It also holds the text-width stub: 0.58 × the font size per character, with Chinese characters counting double |
| `gap-router.ts` | Our router, about 430 lines |
| `avoid-router.ts` | The libavoid-js adapter: fixed shapes, orthogonal routing, one pin per node side, and the same sides as our router |
| `labels.ts` | One label placer for both routers. A label goes on or beside a segment of its own route, clear of nodes, layer labels, other labels and other edges |
| `checks.ts`, `stability.ts` | The condition 1 geometry checks, the condition 2 diff, and a geometric gap classifier that treats both routers the same way |
| `svg.ts`, `pipeline.ts` | An SVG writer with a fixed element and attribute order, and PNG output through `@resvg/resvg-js` |
| `conditions.test.ts`, `render.test.ts` | The checks as vitest tests, and PNG rendering into `.out/router/` |

### Our router

The router works in three passes.

1. **Path.** The path depends only on the placement and the edge. A downward edge leaves the bottom of its source, and an upward edge leaves the top. It crosses each gutter between layers in turn. In every layer between its ends, it passes through the one gap between neighbouring nodes that needs the least sideways travel. An edge between neighbours in one layer runs straight through the gap between them. Other edges within one layer make a U through the gutter below.
2. **Channels.** Each pass decides positions only from the edges inside that channel, and from keys that come from the placement alone:
   - Ports are spread along each node side, sorted by where each edge goes next.
   - Edges in a gap are packed in order.
   - Gutter tracks are assigned with the classic left-edge channel algorithm, with vertical constraints. A stub that enters from above, inside another edge's span, puts that edge's track lower. Stubs at the same x are kept from overlapping.
   - Tracks are spread over a gutter height that the density fixes.
3. **Assembly.** Each route is built from the chosen ports, tracks and gaps.

As a result, a change spreads to a neighbouring channel only through edges that also use the changed gutter.

### Existing open-source routers checked first

Searched on the npm registry on 2026-10-11. None is a channel router for fixed bands, so the spike wrote its own.

| Package | License | What it is |
|---|---|---|
| `obstacle-router` 0.1.2 | LGPL-2.1 | A TypeScript port of libavoid: a global obstacle router, with the same license issue as libavoid |
| `grid-router` 0.1.1 | MIT | A* on a grid with occupancy, published in July 2026 by one author. Routing is sequential, so each edge depends on the edges routed before it |
| `@zsoerenm/libavoid` 0.1.7 | "MIT" | A 2024 fork of libavoid-js. libavoid is LGPL code, so the MIT label cannot be trusted |
| `@tiny-flowchart/orthogonal-connector` 1.0.23 | ISC | One connector between two boxes, with no track assignment |
| `@blocksuite/connector` 0.6.0 | MPL-2.0 | Orthogonal path finding for a single connector |
| `diagram-js` (ManhattanLayout) | MIT | Layout per connection for BPMN, with no obstacle routing |
| `elkjs` | EPL-2.0 OR GPL-3.0 | Already rejected in D11 |

### libavoid-js

From the npm registry and GitHub, checked on 2026-10-11.

| Fact | Value |
|---|---|
| Version used | `0.5.0-beta.5`, the npm `latest` tag, published 2026-02-23. The last stable release is `0.4.5`, from 2025-04-29 |
| License | LGPL-2.1-or-later on npm and in its LICENSE file. Upstream Adaptagrams libavoid is LGPL-2.1-or-later, with commercial licences offered |
| Maintenance | One maintainer and 46 stars. The last commit was on 2026-09-05. Five issues are open, among them #23 (an assertion failure in `nudgeOrthogonalRoutes`) and #37 (slow with many elements) |
| Size | A 492 kB WASM file plus 44 kB of JavaScript |

Two traps in 0.5.0-beta:
- Pins are exclusive by default. A second connector on the same pin silently gets a straight diagonal line between the shape centres. With 4 pins per node, 21 of 41 routes were diagonal until `setExclusive(false)` was set.
- The embind build frees the C++ object behind any JavaScript handle that is garbage-collected, including shapes and connectors that the router owns. The adapter keeps those handles alive forever, which leaks memory.

The settings used were a shape buffer of 6, a nudging distance of 24, `nudgeOrthogonalSegmentsConnectedToShapes` and `nudgeSharedPathsWithCommonEndPoint`. With a buffer of 10 and nudging of 12, condition 1 fails, because the `fanout` label finds no place.

## Router × condition

| Condition | Gap router | libavoid-js |
|---|---|---|
| 1. No edge crosses a node, and no labels collide | **Pass.** 0 edges through nodes, 0 label collisions, all 26 labels placed, all routes orthogonal | **Pass, with tuned settings.** 0, 0 and all placed. It fails with a buffer of 10 and nudging of 12 (1 label unplaced) |
| 2. Adding one edge changes no route outside D10's list | **Pass.** 45 single-edge additions (5 listed, 40 random from a fixed seed): 0 nodes moved, 0 route violations | **Pass.** The same 45 additions: 0 nodes moved, 0 route violations |
| 3. Same input, same SVG bytes on macOS and Linux | **Pass.** The SHA-256 recorded on macOS arm64 (Node 24.14) matched on CI `ubuntu-latest` (Node 24.21) and `macos-latest` (Node 24.20), for both fixtures | **Pass.** The same, for both fixtures |
| 4. The license fits D21 | **Pass.** It is our own code, under MIT | **Conditional.** LGPL-2.1-or-later. An MIT package may depend on it unmodified on npm, but any bundled build must let the library be replaced and must offer its source. This reading is not legal advice |

Evidence: `pnpm test` runs `spikes/router/conditions.test.ts` and writes `.out/router/results.json`. CI run [38114961731](https://github.com/jinhuang712/grafical/actions/runs/38114961731) on commit `f6b25a0` passed on both jobs.

### Beyond the four conditions

Over the 45 additions:

| Measure | Gap router | libavoid-js |
|---|---|---|
| Other routes changed per added edge, of 41: mean, max | 9.0, 27 | 7.9, 20 |
| Changed edges that also changed **outside** the added edge's gaps, a check stricter than D10 | 6 | 16 |
| Labels that moved although their edge shares no gap with the added edge | 0 | 1 (`goods_pipe->retry_v1`) |
| Additions after which a label found no place | 7 of 45 | 5 of 45 |
| Unrelated edges drawn on top of each other, on catalog-sync | 0 | 3 |
| Crossings, bends, total length, on catalog-sync | 68, 84, 16,974 px | 40, 72, 16,911 px |

- The 6 outside changes in our router come from one choice: a gap prefers the x of the port next to it, so that lines run straight. Basing that choice on the placement alone would remove them.
- Tracks on fixed slots, so that a new track does not shift the others, were also tried. The mean dropped only from 9.0 to 7.8, because port spreading and track order cause most of the changes. The change was not kept.
- Every failed label placement after an addition is the shared placer running out of room in a full gutter. No route went through a node.

## Route time and the 50-node variant

Each time is the median of 7 runs on an Apple Silicon Mac (arm64) with Node 24.14, timing routing only.

| Fixture | Gap router | libavoid-js 0.5.0-beta.5 |
|---|---|---|
| catalog-sync (30 nodes, 41 edges) | 0.09 ms | 80 ms |
| Dense (50 nodes, 70 edges) | 0.24 ms | 1,840 ms |
| WASM load, once | none | 5 ms |

A scratch script timed libavoid-js `0.4.5`, the older WebIDL build, on the same dense input: about 230 ms, against 1,240 to 1,660 ms for the beta, with the same number of route points. Even 0.4.5 is far slower than our router, and D14 lays out the diagram on every write, as the stage 2 board will while a person drags.

**The dense variant.** Neither router breaks: no edge crosses a node, and every route is orthogonal. Both degrade:
- **Gap router.** 3 labels find no place (`fetch`, `regions`, `persist`), so condition 1 fails on the dense variant. There are 484 crossings. The goods pipeline's 15 bottom ports sit about 9.5 px apart, like a comb, and the Processing to Stores gutter compresses its tracks.
- **libavoid-js.** All labels are placed and there are 207 crossings. 46 pairs of edges share a trunk from a common node, which reads like a bus. 5 pairs of unrelated edges overlap and are ambiguous. Routing takes 1.8 s.

## PNGs and visual judgement

Regenerate them with `pnpm vitest run spikes/router/render.test.ts`. The output goes to `.out/router/`, which is not tracked.

| PNG | Judgement |
|---|---|
| `catalog-sync.gap.png` | Regular and grid-like. Ports are spread evenly, parallel edges never touch, and track spacing is consistent. Most labels sit beside their own line. The Processing to Stores gutter is busy: about 10 long horizontal tracks have to be traced by eye, and `auth check` floats mid-gutter. It reads as a clean but crowded architecture diagram |
| `catalog-sync.gap.lower.png` | A close-up of the lower three layers. The consume and fanout pair runs as two clean parallels. Labels on dashed lines (`seed`, `failed`, `redrive`) are readable |
| `catalog-sync.avoid.png` | Shorter detours and fewer crossings, and edges converge toward the middle of each side. But `admin->auth` runs on top of the last segment of `relay->tickets_v1`, so it reads as admin to tickets_v1. Some lines hug boxes at 6 px, such as the `regions` edge just above auth-svc |
| `catalog-sync.avoid.lower.png` | A close-up. `persist` and `dlq after 5` are stacked tightly just above Redis, and `fetch` floats next to Postgres. The routes are fine, but tight |
| `catalog-sync-dense.gap.png` | Heavy. The 15-edge comb under the goods pipeline is hard to read, and 3 labels are missing. There are no overlaps |
| `catalog-sync-dense.avoid.png` | The api-service fan-out becomes one bus, which looks tidy but hides which collection each edge goes to. There are 5 ambiguous overlaps |

Both are acceptable on the 30-node brief. Neither is clean on the 50-node variant.

## What our router still needs before phase 1

1. **Crossing reduction within the stability rules.** It has 68 crossings against libavoid's 40. Candidates:
   - choose gaps and order ports by the next and previous gap, not only by the node centre;
   - order the tracks inside a gutter to reduce crossings, using the same placement-only keys;
   - use an explicit, stable bus for fan-outs from one side.
2. **A gutter capacity rule.** The gutter height comes from the density, so a busy gutter squeezes its track pitch, and the port pitch on a busy side drops below 10 px. This needs a decision: either a "gutter full" defect with a fix (a larger density, fewer edges or a split layer), or gutters that grow. Gutters that grow would move layers on `edge.add`, which D10 does not allow today.
3. **Label placement as a rule, not a search:**
   - fixed label slots per channel;
   - labels change only with their own route;
   - a defect with a fix when no slot is free.
   Real text measurement replaces the stub.
4. **The remaining edge cases:** self-loops, two edges between the same pair, edges into the left-most gap and around wide layers, and arrowheads when ports are close together.
5. **A defect for overlapping segments.** Make "two edges on top of each other" a checker defect, and keep the test. Replace the `1e-4` tie-break hack with an explicit order key.
6. **Benchmark 4 tests over the full operation set.** Only `edge.add` was tested here.

## What this changes or questions in DESIGN.md

1. **D10's gap-sharing rule is too loose to mean much.** A gutter spans the full width, so "edges that share a gap with a changed edge" covers every edge in that gutter. One added edge could change 27 of 41 routes and still pass, so both routers pass condition 2 easily. Options:
   - define a gap more finely, for example the stretch of a gutter between two columns;
   - add the stricter check used here: a changed edge may change only inside the gaps it shares.
2. **D10 does not name ports.** Adding an edge to a node side moves the other ports on that side. That is allowed today only because the side faces the gutter the new edge uses. It would be clearer to list "edges that share a node side with the changed edge".
3. **D10 does not say whether "changed edge" is transitive.** If it is, almost anything may change. This spike read it as the named edge only.
4. **D10 lists routes but not labels.** With libavoid, label placement cascaded once: a label moved although its edge shares no gap with the added edge. Labels need their own rule.
5. **D14's defect list lacks edge on edge.** libavoid draws unrelated edges on top of each other, and nothing in D14 catches it. Add "two edges share a segment" as a defect.
6. **D11 says labels sit on segments.** They can sit on or beside a segment. A label on the line masks it with a background. Both work, and beside reads better on vertical segments.
7. **D21.** The row for `libavoid-js` stays LGPL-2.1-or-later. Note that its npm `latest` tag is a beta.

## What could not be verified

- **PNG pixels across platforms.** Only SVG bytes were compared, as condition 3 asks. resvg used system fonts here, so pixel equality rests on the text spike.
- **Other platforms and runtimes.** Only CI Linux x64 and macOS arm64 were checked, with Node 24.20 and 24.21. Windows, Intel Macs and browsers were not. libavoid's determinism in a browser, for stage 2, was not checked.
- **The license reading.** Condition 4 for libavoid is a reading of LGPL-2.1, not legal advice.
- **libavoid-js 0.4.5** was timed only in a scratch script outside the repository. Its routes were not compared with 0.5's.
- **Stability coverage.** It was measured over 45 additions on the 30-node diagram only, and for `edge.add` only. It holds by construction and by test, not by proof.
- **Text widths** come from the stub, so real label widths will differ.
- **The visual judgement** is one reviewer's, from the PNGs listed above.
