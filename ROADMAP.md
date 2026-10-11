# Roadmap

> Written 2026-10-11. Phase 0 was done on 2026-10-11. The current phase is phase 1. No product code exists yet.

grafical ships in two stages. In stage 1, the MVP, agents draw through the command line. In stage 2, people and agents edit the same diagram on a board. Each phase ends with an exit check, and the next phase starts only after it passes. Benchmarks and targets are defined in [GOALS.md](GOALS.md). What each stage contains is listed in [FEATURES.md](FEATURES.md).

## Stage 1: the MVP

### Phase 0: answer the risky questions

Each spike answers one question, and the answer is recorded in [DESIGN.md](DESIGN.md).

| Question | Answered when | Status |
|---|---|---|
| Which router: our own router through the gaps, or `libavoid-js`? (D11) | One router meets all four conditions in D11 on the public brief `bench/briefs/catalog-sync.md` | Done 2026-10-11: our own gap router |
| Which text library, `harfbuzzjs` or `fontkit`, measures the bundled fonts correctly? (D12) | Measured widths match the widths resvg draws within 1 px, for mixed Chinese and English labels | Done 2026-10-11: `harfbuzzjs` |
| Is the output deterministic? (D15) | The same file gives the same SVG bytes and the same PNG pixels on macOS and Linux | Done 2026-10-11: identical |
| Which Chinese character set does the font subset cover? (D12) | Chosen, with the subset's file size recorded | Done 2026-10-11: the 8,105-character table, about 2.75 MB per weight |
| Is the npm name `grafical` free? | Checked on the registry, or a new name chosen | Done 2026-10-11: free, the registry returned 404 |

Phase 0 also sets up the package: TypeScript, Biome, vitest, and CI on macOS and Linux. Done on 2026-10-11.

### Phase 1: the loop

The smallest path from operations to a picture: `new`, `layer.add`, `node.add`, `edge.add`, `check` and `render`. Underneath them:
- layout recomputed on every change, with even spreading and gutters that grow in steps (D10);
- the slot choice for new nodes (D24);
- the router work listed in D11;
- how alignment combines with even spreading (DESIGN.md, "Not yet decided").

Exit check: an agent builds the public brief `bench/briefs/catalog-sync.md` with these operations alone, and the PNG has zero defects.

### Phase 2: the vocabulary and stability

Everything else that FEATURES.md marks `stage 1`: the full operation set, `apply`, `show`, `diff` and `guide`. The stability rule (D10) is enforced by tests. The separate geometry check for benchmark 7 is built.

Exit check: benchmarks 4, 7 and 11 meet their targets. These three need no agent runs.

### Phase 3: benchmark and release

Build the benchmark harness (`pnpm bench`), then run the full suite against the other arms, with at least three runs per arm.

Exit check: benchmarks 1, 2, 3, 5, 6, 8, 9 and 10 meet their targets. A recorded decision may recalibrate any target except the MVP bar in goal 1. Then release 0.1.0 on npm.

## Stage 2: the board

Stage 2 builds the board features in FEATURES.md. Before it starts:

1. Compare X6 with React Flow again (D20).
2. Decide how the board reaches the file (DESIGN.md, "Not yet decided").
3. Set the target for the new benchmark: how long a person needs for an adjustment.
4. Set the stage 2 exit check.

## Later

Items marked `later` in FEATURES.md are not scheduled. They are planned after stage 2, or earlier if benchmark results show one is needed.
