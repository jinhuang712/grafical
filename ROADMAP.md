# Roadmap

> Written 2026-10-11. Phase 0 was done on 2026-10-11. Stage 1 is being built. Its end-to-end test and its benchmarks run once all of it is built (see "How stage 1 ends").

grafical ships in two stages. In stage 1, the MVP, agents draw through the command line. In stage 2, people and agents edit the same diagram on a board. Each phase has an exit check. On 2026-10-11 the owner decided to build all of stage 1 first and to run the checks together at the end, instead of gating each phase on the one before. Benchmarks and targets are defined in [GOALS.md](GOALS.md). What each stage contains is listed in [FEATURES.md](FEATURES.md).

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

The smallest path from operations to a picture: `new`, `layer.add`, `node.add`, `edge.add`, `check` and `render`. For the smoke test it also adds `node.rename`, `node.move`, `node.remove` and `edge.remove`, so that changes can be made, and `apply`, `show` and `guide`, so that an agent's cost is measured on the real design. FEATURES.md, "Phase 1 syntax", fixes their syntax. Underneath them:
- layout recomputed on every change, with even spreading and gutters that grow in steps (D10);
- the slot choice for new nodes (D24);
- the router work listed in D11;
- how alignment combines with even spreading (DESIGN.md, "Not yet decided");
- a minimal benchmark harness (`pnpm bench`), as described in [EXPERIMENTS.md](EXPERIMENTS.md).

Exit check:
1. An agent builds the public brief `bench/briefs/catalog-sync.md` with these operations alone, and the PNG has zero defects. Met on 2026-10-11 (Haiku, one run).
2. The target look (phase 1b) is reached.
3. The smoke test in EXPERIMENTS.md has run, and its results are recorded. The smoke test informs phase 2. It has no pass mark, except that a result below a kill threshold in GOALS.md stops the project for a decision.

### Phase 1b: the target look

Added on 2026-10-11. The phase 1 engine drew defect-free pictures that the owner and two Opus judges found cluttered: 22 of 60, against 57 for a hand-drawn target (DESIGN.md D25). Before the smoke test, the engine is rebuilt toward that target:
- rows not drawn, and groups that span rows drawn as system boxes (D7);
- one column grid, with columns chosen to straighten edges (D10);
- two line styles and a legend (D8), and bundling from two edges, including fan-ins (D11);
- the eight measured rules (D25), and lines never crossing text (D14);
- subtitle, footnote, the node budget and coaching in `guide` (D26), and the operations for groups and the two texts (FEATURES.md).

Exit check: Haiku builds the public brief through the command line, and two blind Opus judges score its picture at least 50 of 60 on the D25 rubric, with the target scored in the same round. Each picture is also shown on the owner's rating page. Since 2026-10-11 this is a target measured in the final benchmark, not a gate.

First try, 2026-10-11: not met. Three Haiku drafts scored 31, 40 and 41, and the target 56. The causes are in [bench/results/phase1b.md](bench/results/phase1b.md).

Second try, 2026-10-11, after the routing and sizing fixes: not met. The drafts scored 45, 38 and 28, and the target 57. Where the shared store sits now decides most of the gap: [bench/results/phase1b2.md](bench/results/phase1b2.md).

Third try, 2026-10-11, with the shared store placed between the systems: not met. The drafts scored 29, 38 and 35, and the target 56. The judged score now turns on what Haiku chooses to draw: [bench/results/phase1b3.md](bench/results/phase1b3.md).

### Phase 1c: what the owner added on 2026-10-11

- **Edge ends at containers** (D28): an arrow may end at a group or a layer. Done.
- **Swimlanes:** lanes that run as rows or as columns, one way per diagram, with nodes allowed outside every lane.
- **Styling:** built-in themes and a shared stylesheet file that a diagram names, set by an operation, so that an agent can apply the theme a person asks for in plain words. Changing the stylesheet changes every diagram that uses it.
- **A live viewer:** `grafical view <file>` opens a window that shows the diagram as it is now, and redraws it within a moment of every change an agent makes. It shows; it does not edit (editing is stage 2).
- **Warnings the agent sees but that never block:** a picture wider than the page, a crowded row, a group of one node, and an edge that crosses a row of unrelated nodes.

### Phase 2: the vocabulary and stability

Everything else that FEATURES.md marks `stage 1`: the full operation set, `apply`, `show`, `diff` and `guide`. The stability rule (D10) is enforced by tests. The separate geometry check for benchmark 7 is built.

Exit check: benchmarks 4, 7 and 11 meet their targets. These three need no agent runs.

### Phase 3: benchmark and release

Extend the benchmark harness to every arm and experiment, then run E1 to E4 from EXPERIMENTS.md, with at least three runs per cell.

Exit check: benchmarks 1, 2, 3, 5, 6, 8, 9, 10, 12, 13 and 14 meet their targets. A recorded decision may recalibrate any target except the MVP bar in goal 1. Then release 0.1.0 on npm.

## Stage 2: the board

Stage 2 builds the board features in FEATURES.md. Before it starts:

1. Compare X6 with React Flow again (D20).
2. Decide how the board reaches the file (DESIGN.md, "Not yet decided").
3. Set the target for the new benchmark: how long a person needs for an adjustment.
4. Set the stage 2 exit check.

## Later

Items marked `later` in FEATURES.md are not scheduled. They are planned after stage 2, or earlier if benchmark results show one is needed.

## How stage 1 ends

1. Everything in phases 1b, 1c and 2 is built, with its tests.
2. The end-to-end test and the benchmarks of phase 3 run together, within a $20 budget, mostly on Haiku. Opus runs only where the gap between Opus and Haiku is measured, and both models get the same prompt, word for word. The private reference brief is used for the MVP bar; its runs stay on the owner's machine, and only numbers are committed.
3. Every picture goes to the owner's rating page. The owner rates the intent experiment (E3) in person.
4. The exit checks of phases 1, 1b, 2 and 3 are read from those results.
