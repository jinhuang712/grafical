# Goals

> Written 2026-10-11. The targets are first estimates, except the MVP bar in goal 1. Recalibrate the others after the first full benchmark run in phase 3, and record each change here with its reason. Only the owner changes the MVP bar.

## Goals for stage 1

1. **The MVP bar.** Haiku, using only the command line, draws the private reference brief well enough to score at least 42 of 50 in blind judging, with zero mechanical defects. 42 is what the `diagram-design` skill scored with Opus and Sonnet on that brief on 2026-10-10.
2. A change costs one batch: it takes seconds, uses few tokens, and moves nothing beyond what DESIGN.md D10 allows.
3. No output ever contains a mechanical defect.
4. The diagram file is the whole truth: the same file gives the same picture, and changes can be reviewed in git.
5. Large diagrams work: 50 nodes render without defects and without hiding information.

## Non-goals for stage 1

- People editing on a board. That is stage 2.
- Placing anything by coordinates, for anyone.
- Diagram types other than layered architecture, such as sequence, ER or charts.
- Real-time collaboration, accounts or a hosted service.
- Importing Mermaid, draw.io or Excalidraw files.
- Free colors or styles. Stage 1 has one theme.
- An MCP server. It comes later, as a thin wrapper over the same operations.

## Benchmarks

| # | Benchmark | Measures | Target | Kill threshold |
|---|---|---|---|---|
| 1 | First draft | Blind score (of 50), wall time, tool calls | Haiku ≥ 42, ≤ 2 min, ≤ 10 tool calls | Haiku below 34, the no-tool score in the 2026-10-10 test |
| 2 | Iteration | Seconds and tokens per change request, and the share done right the first time | ≤ 30 s and ≤ 15k tokens per change, ≥ 90% right | Slower or costlier than regenerating with no tool |
| 3 | Token use | Tokens Haiku uses per first draft through the command line, and the fixed overhead: reference text read before the first operation | ≤ 50k per draft, overhead ≤ 3k | Above 80k per draft, the no-tool cost |
| 4 | Stability | Elements whose position, size or route changed without being on DESIGN.md D10's list, per change | 0 | Any, once phase 2 is done |
| 5 | Model gap | Opus score minus Haiku score on the same task | ≤ 4 | As large as the gap with no tool |
| 6 | Operation errors | Share of operations rejected, and retries needed to recover | ≤ 5%, recovered within 1 retry | Above 20% |
| 7 | Mechanical defects | Overflow, overlap, edges through nodes and label collisions, found by a separate geometry check on the rendered SVG, plus the judges' defect score | 0 found, judges' defect score ≥ 4 of 5 | Any defect in an output is a bug |
| 8 | Scale | Defects and judged clarity at 10, 25 and 50 nodes | 0 defects, clarity ≥ 3 of 5 at 50 nodes | Defects at 25 nodes |
| 9 | Faithfulness | Invented components, and important items missing from the brief | 0 invented, ≤ 1 missing | Any invented component |
| 10 | Intent | Loose prompts of about three sentences given to Haiku, accepted by the owner without changes | ≥ 7 of 10 | Below 5 of 10 |
| 11 | Determinism and speed | SVG bytes and PNG pixels across macOS and Linux. Time in process to apply, lay out and check one operation at 50 nodes. Wall time of one command | Identical (a gate), ≤ 50 ms in process, ≤ 400 ms per command | Any difference, or a render above 2 s |

Benchmark 7 does not use grafical's own checker. That checker refuses every write it flags (D14), so it would always report zero.

Stage 2 adds a benchmark for the time a person needs to make an adjustment. Its target is set before stage 2 starts.

## How the benchmarks run

- **Briefs:** each benchmark uses fixed fact briefs. There are two kinds:
  - Public briefs live in `bench/briefs/`. They describe fictional systems and drive fixtures, tests and CI. The first is [`catalog-sync.md`](bench/briefs/catalog-sync.md).
  - Private briefs describe real systems and never enter this repository. The private reference brief is the one from the 2026-10-10 test. It is used only to check the MVP bar, so the 42 of 50 baseline compares like with like.
- **Arms:** four tools, each on Haiku, Sonnet and Opus at medium effort:
  - a raw model with no tool;
  - the `diagram-design` skill;
  - Mermaid rendered with `mmdc`;
  - grafical.
- **Prompts:** every arm gets the same brief and the same prompt, except for the line that names its tool.
- **Judging:** two Opus judges score each picture blind, each with its own random labels. They score five criteria from 1 to 5: accuracy, clarity, visual quality, defects, and fit in a doc at 1000 px wide. That gives 25 points per judge and 50 in total.
- **Runs:** decisions about a release use at least three runs per arm. The 2026-10-10 test had one.
- **Report:** every result records score, tokens, wall time and tool calls per arm.
