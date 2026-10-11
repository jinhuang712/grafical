# Goals

> Written 2026-10-11. The targets are first estimates, except the MVP bar in goal 1. Recalibrate the others after the phase 1 smoke test and the full run in phase 3, and record each change here with its reason. Only the owner changes the MVP bar. How the benchmarks are run and judged is in [EXPERIMENTS.md](EXPERIMENTS.md).

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
- Free colors or styles per element. A whole diagram takes its look from a theme or a shared stylesheet (added by the owner on 2026-10-11), but no operation colors one node or edge.
- An MCP server. It comes later, as a thin wrapper over the same operations.

## Benchmarks

| # | Benchmark | Measures | Target | Kill threshold |
|---|---|---|---|---|
| 1 | First draft | Blind score (of 50), wall time, tool calls | Haiku ≥ 42, ≤ 2 min, ≤ 10 tool calls | Haiku below 34, the no-tool score in the 2026-10-10 test |
| 2 | Iteration | Seconds and tokens per change request, and the share done right the first time | ≤ 30 s and ≤ 15k tokens per change, ≥ 90% right | Slower or costlier than regenerating with no tool |
| 3 | Token use | Fresh tokens Haiku uses per first draft through the command line, and the fixed overhead: reference text read before the first operation | ≤ 50k per draft, overhead ≤ 3k | Above the no-tool arm. The 2026-10-10 figure of about 80k was counted differently, so the phase 1 smoke test measures the no-tool arm again |
| 4 | Stability | Elements whose position, size or route changed without being on DESIGN.md D10's list, per change | 0 | Any, once phase 2 is done |
| 5 | Model gap | Opus score minus Haiku score on the same task | ≤ 4 | As large as the gap with no tool |
| 6 | Operation errors | Share of operations rejected, and retries needed to recover | ≤ 5%, recovered within 1 retry | Above 20% |
| 7 | Mechanical defects | Overflow, overlap, edges through nodes and label collisions, found by a separate geometry check on the rendered SVG, plus the judges' defect score | 0 found, judges' defect score ≥ 4 of 5 | Any defect in an output is a bug |
| 8 | Scale | Defects and judged clarity at 10, 25 and 50 nodes | 0 defects, clarity ≥ 3 of 5 at 50 nodes | Defects at 25 nodes |
| 9 | Faithfulness | Invented components, and important items missing from the brief | 0 invented, ≤ 1 missing | Any invented component |
| 10 | Intent | Loose prompts of about three sentences given to Haiku, accepted by the owner without changes | ≥ 7 of 10 | Below 5 of 10 |
| 11 | Determinism and speed | SVG bytes and PNG pixels across macOS and Linux. Time in process to apply, lay out and check one operation at 50 nodes. Wall time of one command | Identical (a gate), ≤ 50 ms in process, ≤ 400 ms per command | Any difference, or a render above 2 s |
| 12 | Cost | Dollars per first draft and per change request, on Haiku | Set from the phase 1 smoke test. Per change: below regenerating with no tool | Costlier than the no-tool arm |
| 13 | Cache hit rate | Cache reads ÷ all input tokens, per run | ≥ 85% | Below the no-tool arm |
| 14 | Verifiability | Image reads the agent needs to know it is done. Checks that need a judge or a person | ≤ 1 image read per first draft, 0 per change. For grafical, only taste and faithfulness need a judge. Every other check is mechanical | The agent must look at the picture after each step |

Benchmark 7 does not use grafical's own checker. That checker refuses every write it flags (D14), so it would always report zero.

"Fresh tokens" in benchmarks 2 and 3 exclude cache reads, which benchmark 13 counts. EXPERIMENTS.md defines every metric.

Stage 2 adds a benchmark for the time a person needs to make an adjustment. Its target is set before stage 2 starts.

## Which experiment measures what

| Experiment in EXPERIMENTS.md | Benchmarks |
|---|---|
| E1 First draft | 1, 3, 5, 6, 7, 9, 12, 13, 14 |
| E2 Iteration | 2, 4, 6, 12, 13, 14 |
| E3 Intent | 10 |
| E4 Scale | 8 |
| CI tests | 4, 7, 11 |
