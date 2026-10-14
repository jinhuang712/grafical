# Roadmap

> Written 2026-10-11. Phase 0 was done on 2026-10-11. Stage 1's benchmarks ran on 2026-10-12 ([results](bench/results/stage1.md)). The MVP bar was not met, so stage 1 has not ended (see "How stage 1 ends"), and phase 1d comes next.

In stage 1, the MVP, agents draw through the command line. A stage 2, where people would edit the same diagram on a board, was dropped by the owner on 2026-10-14 (PHILOSOPHY.md, "Who draws?"). Each phase has an exit check. On 2026-10-11 the owner decided to build all of stage 1 first and to run the checks together at the end, instead of gating each phase on the one before. Benchmarks and targets are defined in [GOALS.md](GOALS.md). What each stage contains is listed in [FEATURES.md](FEATURES.md).

## Stage 1: the MVP

### Phase 0: answer the risky questions

Each spike answers one question, and the answer is recorded in [DESIGN.md](DESIGN.md).

| Question | Answered when | Status |
|---|---|---|
| Which router: our own router through the gaps, or `libavoid-js`? (DESIGN.md, "Our own gap router") | One router meets all four conditions in DESIGN.md, "Our own gap router" on the public brief `bench/briefs/catalog-sync.md` | Done 2026-10-11: our own gap router |
| Which text library, `harfbuzzjs` or `fontkit`, measures the bundled fonts correctly? (DESIGN.md, "Bundled fonts") | Measured widths match the widths resvg draws within 1 px, for mixed Chinese and English labels | Done 2026-10-11: `harfbuzzjs` |
| Is the output deterministic? (DESIGN.md, "Output and determinism") | The same file gives the same SVG bytes and the same PNG pixels on macOS and Linux | Done 2026-10-11: identical |
| Which Chinese character set does the font subset cover? (DESIGN.md, "Bundled fonts") | Chosen, with the subset's file size recorded | Done 2026-10-11: the 8,105-character table, about 2.75 MB per weight |
| Is the npm name `grafical` free? | Checked on the registry, or a new name chosen | Done 2026-10-11: free, the registry returned 404 |

Phase 0 also sets up the package: TypeScript, Biome, vitest, and CI on macOS and Linux. Done on 2026-10-11.

### Phase 1: the loop

The smallest path from operations to a picture: `new`, `layer.add`, `node.add`, `edge.add`, `check` and `render`. For the smoke test it also adds `node.rename`, `node.move`, `node.remove` and `edge.remove`, so that changes can be made, and `apply`, `show` and `guide`, so that an agent's cost is measured on the real design. `grafical --help` gives their syntax. Underneath them:
- layout recomputed on every change, with even spreading and gutters that grow in steps (DESIGN.md, "Layout computed again on every change");
- the slot choice for new nodes (DESIGN.md, "The engine picks a new box's slot");
- the router work listed in DESIGN.md, "Our own gap router";
- how alignment combines with even spreading (DESIGN.md, "Open questions");
- a minimal benchmark harness (`pnpm bench`), as described in [EXPERIMENTS.md](EXPERIMENTS.md).

Exit check:
1. An agent builds the public brief `bench/briefs/catalog-sync.md` with these operations alone, and the PNG has zero defects. Met on 2026-10-11 (Haiku, one run).
2. The target look (phase 1b) is reached.
3. The smoke test in EXPERIMENTS.md has run, and its results are recorded. The smoke test informs phase 2. It has no pass mark, except that a result below a kill threshold in GOALS.md stops the project for a decision.

### Phase 1b: the target look

Added on 2026-10-11. The phase 1 engine drew defect-free pictures that the owner and two Opus judges found cluttered: 22 of 60, against 57 for a hand-drawn target (DESIGN.md, "A target picture with measured rules"). Before the smoke test, the engine is rebuilt toward that target:
- rows not drawn, and groups that span rows drawn as system boxes (DESIGN.md, "Rows unseen, groups as systems");
- one column grid, with columns chosen to straighten edges (DESIGN.md, "Layout computed again on every change");
- two line styles and a legend (DESIGN.md, "Looks"), and bundling from two edges, including fan-ins (DESIGN.md, "Our own gap router");
- the eight measured rules (DESIGN.md, "A target picture with measured rules"), and lines never crossing text (DESIGN.md, "Defects owned by who can fix them");
- subtitle, footnote, the node budget and coaching in `guide` (DESIGN.md, "Curation stays with the agent"), and the operations for groups and the two texts (FEATURES.md).

Exit check: Haiku builds the public brief through the command line, and two blind Opus judges score its picture at least 50 of 60 on the DESIGN.md, "A target picture with measured rules" rubric, with the target scored in the same round. Each picture is also shown on the owner's rating page. Since 2026-10-11 this is a target measured in the final benchmark, not a gate.

First try, 2026-10-11: not met. Three Haiku drafts scored 31, 40 and 41, and the target 56. The causes are in [bench/results/phase1b.md](bench/results/phase1b.md).

Second try, 2026-10-11, after the routing and sizing fixes: not met. The drafts scored 45, 38 and 28, and the target 57. Where the shared store sits now decides most of the gap: [bench/results/phase1b2.md](bench/results/phase1b2.md).

Third try, 2026-10-11, with the shared store placed between the systems: not met. The drafts scored 29, 38 and 35, and the target 56. The judged score now turns on what Haiku chooses to draw: [bench/results/phase1b3.md](bench/results/phase1b3.md).

### Phase 1c: what the owner added on 2026-10-11

- **Edge ends at containers** (DESIGN.md, "Lines that end at containers"): an arrow may end at a group or a layer. Done.
- **Swimlanes:** lanes that run as rows or as columns, one way per diagram, with nodes allowed outside every lane. Done (DESIGN.md, "Swimlanes run one way").
- **Styling:** built-in themes and a shared stylesheet file that a diagram names, set by an operation, so that an agent can apply the theme a person asks for in plain words. Changing the stylesheet changes every diagram that uses it. Done (DESIGN.md, "Themes and stylesheets").
- **A live viewer:** `grafical view <file>` opens a window that shows the diagram as it is now, and redraws it within a moment of every change an agent makes. It shows; it does not edit. Done (DESIGN.md, "A viewer that only shows").
- **Warnings the agent sees but that never block:** a picture wider than the page, a crowded row, a group of one node, and an edge that crosses a row of unrelated nodes. Done (DESIGN.md, "Curation stays with the agent"). Replaced on 2026-10-13 by counts (DESIGN.md, "Records over prose").

### Phase 1d: clearer lines and more diagram types

Added by the owner on 2026-10-12, after the stage 1 round, where every comment on grafical's pictures named the lines. Both parts are built together:
- **Lines** (DESIGN.md, "Lines meet any side"): the kinds `link` and `optional`, arrowheads at both ends, a thick main path, curved drawing from a stylesheet, lines that meet a box on any side with each in its own slot, hops at crossings, dots where lines merge, and a hint when `diagram tidy` would remove crossings.
- **Diagram types** (DESIGN.md, "Every layered diagram type"): the node kinds `state`, `decision`, `terminal`, `initial` and `final`, groups nested up to three levels, and teaching for each type, first as `grafical guide <type>` and then in the help (DESIGN.md, "The help as the reference"), for C4, cloud, event flow, flowcharts, state machines, swimlane processes, dependency graphs, data flow and deployment.

Exit check: each new type has a fixture the owner has looked at, and the stage 1 benchmarks run again, with the MVP bar.

### Phase 1e: discrete output and freer placement

Added by the owner on 2026-10-13, after the help rounds showed that tidy lines (no crossings) can still make a picture hard to follow, and that the layered grid, where a row is the only placement fact, had stopped improving it: the MVP score went from 38.3 to 38.0 across a phase of line work. Built in this order:
- **Discrete output** (DESIGN.md, "Records over prose"): `grafical show --drawn` prints how a diagram is drawn as facts and counts, `grafical try` prints a batch's counts before and after it, the counts replace warnings and hints, and refusals give mappings, not sentences. Done.
- **Guides, not a grid:** columns, a second placement fact beside rows. A box may follow a row, a column, both or neither; one with neither sits near what it connects to. A design decision first, and a prototype on three hard pictures (the private reference brief, the public brief and photo sharing), because placement must stay stable (DESIGN.md, "Layout computed again on every change") and deterministic (DESIGN.md, "Output and determinism"). Columns were built on 2026-10-14 (DESIGN.md, "Columns beside rows"), and so were boxes in no row, placed by steps from another box (DESIGN.md, "Steps from another box").
- **Bundled fan-outs:** lines from one box to several others leave as one line and split near their targets, with a dot at the split.
- **Then, as facts the agent states:** the flow's direction (down or right), dividers and walls between parts of a picture (a wall lets lines cross only through a named gate), and notes attached to a box, line or group. On 2026-10-14 the owner held the flow's direction for later, and walls were built the same day: empty space between two named sides, which a label turns into a divider (DESIGN.md, "Walls as space"); and notes, as a callout or a footnote (DESIGN.md, "Notes as callouts or footnotes").
- **The full list, with the order the owner agreed** (FEATURES.md, "Placing", "Grouping"): bundled fan-outs with equal heights in a row and room around stores first, then the rest. Each stays only if it measurably helps.

Exit check: the MVP bar in both its parts (GOALS.md, "The MVP bar") measured again.

### Phase 2: the vocabulary and stability

Everything else that FEATURES.md marks `stage 1`: the full operation set, `apply`, `show`, `diff` and the reference for agents (`guide`, now the help, DESIGN.md, "The help as the reference"). The stability rule (DESIGN.md, "Layout computed again on every change") is enforced by tests. The separate geometry check for GOALS.md, "Mechanical defects" is built.

Exit check: GOALS.md, "Stability", "Mechanical defects", "Determinism" and "Speed" meet their targets. These three need no agent runs.

First measurement, 2026-10-12: 7 and 11 met, and 4 not met. Unnamed nodes in unchanged rows move sideways after half of all single operations. The owner restated GOALS.md, "Stability" the same day: no unnamed fact changes, which holds, with sideways movement measured but not gated ([bench/results/phase2.md](bench/results/phase2.md)). The cross-platform gate, GOALS.md, "Determinism", waits for CI.

### Phase 3: benchmark and release

Extend the benchmark harness to every arm and experiment, then run E1 to E4 from EXPERIMENTS.md, with at least three runs per cell.

Exit check: every other check in GOALS.md meets its target. A recorded decision may recalibrate any target except GOALS.md, "The MVP bar". Then release 0.1.0 on npm.

## Later

Items marked `later` in FEATURES.md are not scheduled. They are planned after stage 1, or earlier if benchmark results show one is needed.

## How stage 1 ends

1. Everything in phases 1b, 1c and 2 is built, with its tests.
2. The end-to-end test and the benchmarks of phase 3 run together, within a $20 budget, mostly on Haiku. Opus runs only where the gap between Opus and Haiku is measured, and both models get the same prompt, word for word. The private reference brief is used for the MVP bar; its runs stay on the owner's machine, and only numbers are committed.
3. Every picture goes to the owner's rating page. The owner rates the intent experiment (E3) in person.
4. The exit checks of phases 1, 1b, 2 and 3 are read from those results.
