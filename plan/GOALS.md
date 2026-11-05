# Goals

Each goal is a check with a number or a test, under the want of the proposal that it serves. The benchmark harness measures most of them in rounds of agent runs, and CI measures the rest on every push. [EXPERIMENTS.md](../EXPERIMENTS.md) defines each metric and how a round runs. The targets are first estimates, except the MVP bar: a recorded decision may change any other target, and only the owner changes the MVP bar.

A status is ✅ met, ❌ not met, or ⬜ not measured, always with the date of the measurement. A goal has an ID that never changes, and code and documents cite it by its name, such as `[T2: Speed](#t2-speed)`.

## Summary

```
Goals
├── Objectives
│   ├── ❌ O1: The MVP bar — Haiku, with only the command line and its help, meets the main checks
│   └── ⬜ O2: No placement by the agent — no transcript works out a position
├── Measures
│   ├── ⬜ M1: Enough to say — what an agent wanted to state and no operation could
│   └── M2: Cache hit rate — 90.2% of input read from the cache on 2026-10-18
├── Benchmarks
│   ├── ✅ B1: Iteration — a change request done right, fast and cheap
│   ├── ⬜ B2: Scale — a clear picture at 50 boxes
│   ├── ⬜ B3: Faithfulness — nothing invented, little missing
│   ├── ❌ B4: Verifiability — few looks at the picture
│   └── ✅ B5: Intent — a loose prompt is enough
├── Comparisons
│   ├── ✅ C1: Model gap — Opus against Haiku
│   ├── ❌ C2: Time — less than the same model drawing directly
│   ├── ❌ C3: Token use — fewer fresh tokens than the same model drawing directly
│   ├── ⬜ C4: Context added — less than the same model drawing directly
│   ├── ❌ C5: Cost — less than the same model drawing directly
│   └── ⬜ C7: Beats the strongest model alone — Haiku with grafical against Opus at xhigh effort
├── Thresholds
│   ├── ❌ T1: Operation errors — at most 5% of operations refused
│   └── ✅ T2: Speed — 50 ms an operation, 400 ms a command
└── Constraints
    ├── ✅ R1: Stability — no fact changes that no operation named
    ├── ✅ R2: Mechanical defects — no overflow, overlap, line through a box or label collision
    └── ✅ R3: Determinism — the same pixels on macOS and Linux
```

## Goals

### Objectives

#### O1: The MVP bar

Set by the owner on 2026-10-13 ([What makes grafical good?](../PHILOSOPHY.md#what-makes-grafical-good)). Haiku uses only the command line and its help, draws with zero mechanical defects and meets the targets of six goals:

- [B1: Iteration](#b1-iteration)
- [R1: Stability](#r1-stability)
- [C1: Model gap](#c1-model-gap)
- [T1: Operation errors](#t1-operation-errors)
- [R3: Determinism](#r3-determinism)
- [T2: Speed](#t2-speed)

**Want:** every want of the proposal, as the headline.

**Checks:**

- [F3: Editing](../features/F3-editing.md)
- [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)

**Acceptance:** the six named checks (B1: Iteration, R1: Stability, C1: Model gap, T1: Operation errors, R3: Determinism, T2: Speed) are met in one round on the private reference brief, and the round has no engine-owned defect.

**Status:** ❌ not met on 2026-10-18. In round `p1g` [B1: Iteration](#b1-iteration) was met, [T1: Operation errors](#t1-operation-errors) was not, and one draft had an engine-owned defect (`bench/results/p1g-stage1.md`).

#### O2: No placement by the agent

No transcript has the agent work out a position or write a script to lay out the picture.

**Want:** Never place a box by hand.

**Checks:**

- [F2: Layout](../features/F2-layout.md)
- [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)

**Acceptance:** the benchmark harness scans every grafical transcript of a round, and finds none.

**Status:** ⬜ not measured.

### Measures

#### M1: Enough to say

How often an agent wanted to state something that no operation could express, and drew something else or gave up. The first measured round sets a target.

**Want:** Never place a box by hand.

**Checks:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)

**How:** read from the refusals and the agents' own notes in a benchmark round.

**Formula:**

```
M1 = times an agent wanted to state something no operation could express
     per round, counted from refusals and from the agents' reflections
```

**Last value:** not measured.

#### M2: Cache hit rate

The share of input an agent reads from the cache. A higher share is no aim in itself, since [C5: Cost](#c5-cost) already holds what it saves.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F7.1: Help](../features/F7-help.md#f71-help)
- [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)

**How:** the benchmark harness, per run.

**Formula:**

```
M2 = cache reads / (uncached input + cache writes + cache reads)
```

**Last value:** 90.2% for Haiku with grafical on 2026-10-18 (round `p1g`), the mean of 3 first drafts of the public brief.

### Benchmarks

#### B1: Iteration

A change request is done right, quickly and cheaply.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [4. A change moves only what it names](../DESIGNS.md#4-a-change-moves-only-what-it-names)

**Problem set:** the public brief: a draft and 8 change requests, 3 runs per arm ([E2 Iteration](../EXPERIMENTS.md#e2-iteration)).

**Formula:**

```
done right = change steps that made the change / change steps asked
time       = mean wall seconds per change step
tokens     = mean fresh tokens per change step  (uncached input + cache writes + output)
target     = done right >= 90%, time <= 30 s, tokens <= 15k
kill = slower or costlier per change than redrawing with no tool
```

**Last score:** ✅ met on the means on 2026-10-18 (round `p1g`): 23 of 24 change steps made the change (96%). Per step, time averaged 7 to 29 s and fresh tokens 1.4k to 12k; one run of grouping took 60 s and 24k, refused by `title-blocked`.

#### B2: Scale

A picture of 50 boxes has no defect and a clarity of at least 3 of 5.

**Want:** A picture that is complete and clear at once.

**Checks:**

- [F2.7: How lines are drawn](../features/F2-layout.md#f27-how-lines-are-drawn)
- [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)

**Problem set:** fictional briefs of 10, 25 and 50 components, 3 runs each, rated blind by the owner ([E4 Scale](../EXPERIMENTS.md#e4-scale)).

**Formula:**

```
B2 = owner's clarity rating (1 to 5) of a picture of 50 boxes, with defects counted by the geometry check
target = no defect, clarity >= 3
kill = a defect at 25 boxes
```

**Last score:** ⬜ not shown at 50 boxes. On 2026-10-12 all 9 drafts had no defect, and the 50-component drafts scored a clarity of 5, 5 and 4. But Haiku merged that brief into 15 to 19 boxes, so no picture of 50 boxes was judged. On 2026-10-18 one draft drew 51 boxes, with 174 crossings and an engine-owned defect; its clarity was not rated.

#### B3: Faithfulness

The picture invents no component and misses at most 1 important item of the brief.

**Want:** A picture that is complete and clear at once.

**Checks:** [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)

**Problem set:** the briefs of each first-draft round ([E1 First draft](../EXPERIMENTS.md#e1-first-draft)), checked against the judges' checklist.

**Formula:**

```
invented = components in the draft that the brief does not name
missing  = important items of the brief that the draft does not show
target   = invented = 0, missing <= 1
kill = any invented component
```

**Last score:** ⬜ not measured as a count.

#### B4: Verifiability

The agent knows it is done from grafical's text output, with at most 1 look at the picture per first draft and none per change. Only taste and faithfulness need a judge, and every other check is mechanical.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F5.2: Counts](../features/F5-checking.md#f52-counts)
- [F5.3: Warnings](../features/F5-checking.md#f53-warnings)
- [8. Answers are data a script can read](../DESIGNS.md#8-answers-are-data-a-script-can-read)

**Problem set:** the runs of a round; the benchmark harness counts the images each agent opens.

**Formula:**

```
looks per draft  = image reads in a first-draft run
looks per change = image reads in a change step, averaged over the steps
target           = looks per draft <= 1, looks per change = 0
kill = the agent must look at the picture after each step
```

**Last score:** ❌ not met on 2026-10-18 (round `p1g`), closer: drafts looked once, and changes 0 to 0.3 times per step on average.

#### B5: Intent

A loose prompt of about three sentences is enough for Haiku to draw what the owner meant.

**Want:** Get a good picture from a small model.

**Checks:**

- [F7.1: Help](../features/F7-help.md#f71-help)
- [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)

**Problem set:** 10 loose prompts about fictional systems (`bench/prompts/intent.yaml`), rated by the owner in person ([E3 Intent](../EXPERIMENTS.md#e3-intent)).

**Formula:**

```
B5 = drawings the owner accepts without changes / 10
target = at least 7 of 10
kill = fewer than 5 of 10
```

**Last score:** ✅ 9 of 10 on 2026-10-12.

### Comparisons

The checks in this section are comparative. A number such as 35.6k tokens means nothing alone, so grafical is held against a model drawing directly with no tool. [C1: Model gap](#c1-model-gap) compares two models with grafical instead. The first drafts of the stage 1 round on the public brief, 2026-10-12, 3 runs each, mean per draft:

| Arm | Owner's rating (of 25) | Cost | Time | Fresh tokens | From the cache |
|---|---|---|---|---|---|
| Haiku with grafical | 24 | $0.011 | 48 s | 35.6k | 83.2% |
| Opus with grafical | 24 | $0.259 | 39 s | 23.7k | 84.6% |
| Opus without grafical | 5 | $0.312 | 54 s | 26.5k | 87.1% |
| Haiku without grafical | 5 | $0.007 | 47 s | 20.5k | 88.7% |
| Haiku with Mermaid | 5 | $0.004 | 16 s | 13.3k | 83.1% |

The owner marked every draft without grafical, and every Mermaid draft, too bad to rate. Opus ran at its default thinking budget, and [C7: Beats the strongest model alone](#c7-beats-the-strongest-model-alone) holds the run at xhigh effort.

#### C1: Model gap

Opus's score minus Haiku's on the same task is at most 4.

**Want:** Get a good picture from a small model.

**Checks:**

- [F7.1: Help](../features/F7-help.md#f71-help)
- [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)

**Against:** Opus, on the same brief.

**How:** Opus and Haiku draw the same brief, 3 runs each, rated blind by the owner.

**Formula:**

```
C1 = mean owner rating of Opus (of 25) - mean owner rating of Haiku (of 25)
target = at most 4
kill = as large as the gap with no tool
```

**Last result:** ✅ a gap of 0 on 2026-10-12: both 24 of 25.

#### C2: Time

A diagram takes less wall time than the same model takes drawing directly.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [F7.1: Help](../features/F7-help.md#f71-help)
- [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)

**Against:** the same model drawing directly.

**How:** the benchmark harness, from each run's wall time.

**Formula:**

```
C2 = mean wall seconds per first draft with grafical - the same with the same model drawing directly
target = below 0
```

**Last result:** ❌ not met. Haiku took 36.3 s with grafical against 27.8 s directly on 2026-10-18 (round `p1g`), and Opus 39 s against 54 s on 2026-10-12. Open in [Haiku pays more with grafical than drawing directly](TODO.md#p2task-haiku-pays-more-with-grafical-than-drawing-directly).

#### C3: Token use

A diagram costs fewer fresh tokens than the same model uses drawing directly. Also, the help an agent reads before its first operation stays under 3k tokens; suspended by the owner on 2026-10-17 while the help's correctness comes first ([042. One entry page, help where it is used](../specs/decisions/042-one-entry-page-help-where-it-is-used.md)).

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [F7.1: Help](../features/F7-help.md#f71-help)
- [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)

**Against:** the same model drawing directly.

**How:** the benchmark harness, from each run's token counts. Fresh tokens leave out cache reads.

**Formula:**

```
C3 = mean fresh tokens per first draft with grafical - the same with the same model drawing directly
fresh tokens = uncached input + cache writes + output
target = below 0
```

**Last result:** ❌ not met. Haiku used 42.2k with grafical against 21.3k directly on 2026-10-18 (round `p1g`), and Opus 23.7k against 26.5k on 2026-10-12. Open in [Haiku pays more with grafical than drawing directly](TODO.md#p2task-haiku-pays-more-with-grafical-than-drawing-directly). The help read before the first operation was not measured, because the round recorded no empty baseline.

#### C4: Context added

A diagram adds fewer tokens to the agent's conversation than the same model adds drawing directly. What stays in the conversation is what the agent carries into all its later work.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F5.2: Counts](../features/F5-checking.md#f52-counts)
- [F5.3: Warnings](../features/F5-checking.md#f53-warnings)
- [8. Answers are data a script can read](../DESIGNS.md#8-answers-are-data-a-script-can-read)

**Against:** the same model drawing directly.

**How:** the benchmark harness, from each transcript.

**Formula:**

```
C4 = tokens the conversation gains per first draft with grafical - the same with the same model drawing directly
target = below 0
```

**Last result:** ⬜ not measured.

#### C5: Cost

A diagram costs less money than the same model pays drawing directly.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [F7.1: Help](../features/F7-help.md#f71-help)
- [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)

**Against:** the same model drawing directly.

**How:** the benchmark harness, from each run's cost.

**Formula:**

```
C5 = mean total_cost_usd per first draft with grafical - the same with the same model drawing directly
target = below 0
```

**Last result:** ❌ not met. Haiku cost $0.015 with grafical against $0.008 directly on 2026-10-18 (round `p1g`), and Opus $0.259 against $0.312 on 2026-10-12. Open in [Haiku pays more with grafical than drawing directly](TODO.md#p2task-haiku-pays-more-with-grafical-than-drawing-directly).

#### C7: Beats the strongest model alone

Haiku with grafical is rated above Opus at xhigh effort drawing directly, on the same brief.

**Want:** Get a good picture from a small model.

**Checks:**

- [F2: Layout](../features/F2-layout.md)
- [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)

**Against:** Opus at xhigh effort drawing directly.

**How:** both draw the public brief, 3 runs each, rated blind by the owner.

**Formula:**

```
C7 = mean owner rating of Haiku with grafical (of 25) - mean owner rating of Opus at xhigh drawing directly (of 25)
target = above 0
```

**Last result:** ⬜ not run at xhigh effort. On 2026-10-12 at the default thinking budget: 24 against 5 of 25.

### Thresholds

#### T1: Operation errors

At most 5% of operations are refused, each recovered within 1 retry.

**Want:** Never place a box by hand · Get a good picture from a small model.

**Checks:**

- [F3.5: Refusals](../features/F3-editing.md#f35-refusals)
- [7. A refusal gives the facts, and the agent writes the fix](../DESIGNS.md#7-a-refusal-gives-the-facts-and-the-agent-writes-the-fix)

**Limit:** 5%; above 20% is the kill threshold.

**How:** the benchmark harness counts refused calls in each round.

**Status:** ❌ not met on 2026-10-18 (round `p1g`). The public brief's drafts were refused 0% of their calls and its changes 21%, nearly all in one grouping step; the scale drafts 19% to 26%, the loose prompts 12%, and two drafts of the private reference brief 55%, mostly `title-blocked`.

#### T2: Speed

At most 50 ms in process to apply, lay out and check one operation at 50 boxes, and at most 400 ms for one command.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [13. Every search the engine runs has a cap](../DESIGNS.md#13-every-search-the-engine-runs-has-a-cap)
- [4. A change moves only what it names](../DESIGNS.md#4-a-change-moves-only-what-it-names)

**Limit:** 50 ms an operation and 400 ms a command; a render above 2 s is the kill threshold.

**How:** `pnpm bench speed`, on random diagrams of about 50 boxes.

**Status:** ✅ met on 2026-10-15, after [033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md) removed the slot search. One operation took a median of 8.1 ms and at most 18.6 ms. Commands took 185 to 198 ms, and a render 368 ms.

### Constraints

#### R1: Stability

No fact changes that no operation named: a row, an order, a group, a lane or an alignment. Boxes that move sideways in rows the change did not touch are measured, without a target.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [4. A change moves only what it names](../DESIGNS.md#4-a-change-moves-only-what-it-names)

**Condition:** every operation changes only the facts it names ([004. Layout computed again on every change](../specs/decisions/004-layout-computed-again-on-every-change.md)).

**How:** the stability tests apply single operations, and `grafical diff` compares each change step with the one before. Any unnamed fact change is a failure.

**Status:** ✅ met on 2026-10-12. 0 unnamed changes in all 169 single operations of the tests and in every change step of the stage 1 round.

#### R2: Mechanical defects

No overflow, overlap, line through a box or label collision.

**Want:** A picture that is complete and clear at once.

**Checks:**

- [F5.4: Check](../features/F5-checking.md#f54-check)
- [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)

**Condition:** no rendered picture has any of the four. Any defect in an output is a bug.

**How:** `pnpm bench geometry` checks every rendered SVG of a round with a geometry check of its own. It does not use grafical's checker, which refuses every write it flags and so would always report zero ([008. Defects owned by who can fix them](../specs/decisions/008-defects-owned-by-who-can-fix-them.md)).

**Status:** ✅ met on 2026-10-18 (round `p1g`): the geometry check found none in 46 pictures. One draft of 50 components had an engine-owned `needless-bend`, which is none of the four, fixed the same day (2f101d9).

#### R3: Determinism

The same file gives the same SVG bytes and the same PNG pixels on macOS and Linux.

**Want:** Keep the diagram beside the code.

**Checks:**

- [F6.2: Render](../features/F6-output.md#f62-render)
- [9. The same file gives the same picture on any machine](../DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)

**Condition:** any difference is a failure.

**How:** CI renders the pinned fixtures on both systems and compares them on every push.

**Status:** ✅ met on 2026-10-14, in CI run 38584033554.
