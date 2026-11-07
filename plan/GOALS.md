# Goals

Each goal is a check with a number or a test, listed by its kind with the want of the proposal that it serves. The benchmark harness measures most of them in rounds of agent runs, and CI measures the rest on every push. `specs/benchmark.md` defines each metric and how a round runs. The targets are first estimates, except the MVP bar: a recorded decision may change any other target, and only the owner changes the MVP bar.

[O1: The MVP bar](#o1-the-mvp-bar) alone says whether grafical succeeds. The constraints must always hold. Every other goal is recorded to find causes and decides nothing.

A status is ✅ met, ❌ not met, or ⬜ not measured, always with the date of the measurement. Code and documents cite a goal by its name, such as `[T2: Speed](#t2-speed)`.

## Summary

```
Goals
├── Objectives
│   ├── ❌ O1: The MVP bar — cheaper · faster · no strong model needed · copies a picture and beats it
│   ├── ⬜ O4: Copy a picture, better — an agent redraws someone's picture and it looks better
│   └── ⬜ O5: Routes the eye can follow — 13 checks read from the picture itself
├── Measures
│   ├── ⬜ M1: Enough to say — what an agent wanted to state and no operation could
│   ├── M2: Cache hit rate — 90.2% of input read from the cache on 2026-10-18
│   ├── M3: Better every round — the owner's blind rating, 24 of 25 on 2026-10-12
│   ├── M4: Diff size — 17.3 changed lines and 231 characters a change step on 2026-11-06
│   └── M5: Routing cases — 16 crossings and 125 bends over 29 cases on 2026-11-07
├── Benchmarks
│   ├── ✅ B1: Iteration — a change request done right, fast and cheap
│   ├── ⬜ B2: Scale — a clear picture at 50 boxes
│   └── ❌ B4: Verifiability — few looks at the picture
├── Comparisons
│   ├── ✅ C1: Model gap — Opus against Haiku
│   ├── ❌ C2: Time — less than the same model drawing directly
│   ├── ❌ C3: Token use — fewer fresh tokens than the same model drawing directly
│   ├── ⬜ C4: Context added — less than the same model drawing directly
│   ├── ❌ C5: Cost — less than the same model drawing directly
│   └── ✅ C7: Beats the strongest model alone — Haiku with grafical against Opus at xhigh effort
├── Thresholds
│   ├── ❌ T1: Operation errors — at most 5% of operations refused
│   └── ✅ T2: Speed — 50 ms an operation, 400 ms a command
└── Constraints
    ├── ✅ R1: Stability — no fact changes that no operation named
    ├── ✅ R2: Mechanical defects — no overflow, overlap, line through a box or label collision
    ├── ✅ R3: Determinism — the same pixels on macOS and Linux
    └── ✅ R4: A sound file — strict, one spelling, and any text
```

## Goals

### Objectives

#### O1: The MVP bar

Set by the owner on 2026-10-13 and changed on 2026-11-05. An agent uses only the command line and its help, draws with zero mechanical defects and meets the targets of four goals, with Haiku holding the floor and a strong model reaching for the top:

- [C5: Cost](#c5-cost)
- [C2: Time](#c2-time)
- [C1: Model gap](#c1-model-gap)
- [O4: Copy a picture, better](#o4-copy-a-picture-better)

[M3: Better every round](#m3-better-every-round) is the fifth thing the owner watches, and it has no edge to pass.

**Want:** every want of the proposal, as the headline.

**Checks:**

- [F3: Editing](../features/F3-editing.md)
- [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)

**Acceptance:** those four goals are met in one round that includes the private reference brief, every constraint holds, and the round has no engine-owned defect.

**Status:** ❌ not met on 2026-10-18. In round `p1g` [C2: Time](#c2-time) and [C5: Cost](#c5-cost) were not met, and one draft had an engine-owned defect (`bench/results/p1g-stage1.md`). [O4: Copy a picture, better](#o4-copy-a-picture-better) has not run.

#### O4: Copy a picture, better

Given a picture someone else drew, an agent redraws it with grafical, shows the same content and looks better than the original.

**Want:** Copy a picture and beat it.

**Checks:**

- [F2: Layout](../features/F2-layout.md)
- [F4: Look](../features/F4-look.md)
- [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)

**Acceptance:** on a fixed set of reference pictures, Opus redraws each one with the same content, and the owner rates the redrawing above the original. The time each takes is recorded with no limit. The pictures stay outside the repository and only scores are committed, since their licenses are not known.

**Status:** ⬜ not run.

#### O5: Routes the eye can follow

A route is judged by looking at the picture against every check below, and counts only support what the eye finds. A picture with no crossings can still fail, as a `pyramid` render did on 2026-11-07. The checks are in the order the owner set on 2026-11-07, so an earlier one wins where two pull against each other.

| # | Tier | Check | Read by | From |
|---|---|---|---|---|
| 1 | must | No mechanical defect | the geometry check | [R2: Mechanical defects](#r2-mechanical-defects) |
| 2 | must | No line the picture implies and the facts lack | open | proposed |
| 3 | must | An end run of at least 16 px, 24 px at ease | not built | the owner's rule |
| 4 | shape | The eye follows a line end to end | the owner | standard 1 |
| 5 | shape | No step | the owner | the owner's rule |
| 6 | shape | A pair of lines level at both ends | not built | the owner's rule |
| 7 | shape | One form for lines of one sort | the owner | the owner's rule |
| 8 | shape | A simple shape | the bend count and the owner | standard 3 |
| 9 | better | Few and clean crossings | the crossing count and the owner | standard 4 |
| 10 | better | No detour | the detour count | standard 2 |
| 11 | better | A rhythm of parallel lines | the owner | standard 5 |
| 12 | better | Lines land well | the owner | standard 6 |
| 13 | better | What matters stands out | the owner | standard 7 |

The standards are in `specs/decisions, "A good route is one the eye can follow"`, and the owner's rules are in `specs/decisions, "The router draws clean lines and the agent makes their room"`.

**Want:** A picture that is complete and clear at once.

**Checks:**

- [F2.7: How edges are drawn](../features/F2-layout.md#f27-how-edges-are-drawn)
- [5. The engine routes every edge, in plain forms](../DESIGNS.md#5-the-engine-routes-every-edge-in-plain-forms)

**Acceptance:** the owner looks at every case in `bench/routes/` and finds each check met or names why it cannot be.

**Status:** ⬜ not run. On 2026-11-07 the owner looked at `pair-both-ways`, `two-layers-skip`, `ladder` and `pyramid` only. The open points are in [The router is not smart enough](TODO.md#p1discussion-the-router-is-not-smart-enough).

### Measures

#### M1: Enough to say

How often an agent wanted to state something that no operation could express, and drew something else or gave up.

**Want:** Never place a node by hand.

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

#### M3: Better every round

The pictures keep getting better, compared with the round before and not with another tool.

**Want:** A picture that is complete and clear at once.

**Checks:**

- [F4: Look](../features/F4-look.md)
- [F2.7: How edges are drawn](../features/F2-layout.md#f27-how-edges-are-drawn)

**How:** the owner rates each round's first drafts of the public brief blind, on the page `pnpm bench gallery` makes.

**Formula:**

```
M3 = mean owner rating of Haiku's first drafts of the public brief (of 25), per round
```

**Last value:** 24 of 25 on 2026-10-12.

#### M4: Diff size

How much a change touches in the `.grafical` file. It is watched while the form is tuned, and a smaller number is no aim in itself, since the file also serves strictness and plain objects.

**Want:** Keep the diagram beside the code.

**Checks:**

- [F6.1.1: The object model](../features/F6-output.md#f611-the-object-model)

**How:** the change steps of a round, written in each form and compared with `git diff`.

**Formula:**

```
M4 = mean changed lines, and mean changed characters, per change step
```

**Last value:** on 2026-11-06, over the 24 change steps of round `p1g`:

| Form | Changed lines | Changed characters | File lines |
|---|---|---|---|
| `.grafical` | 17.3 | 231 | 417 |
| YAML with one element on each line | 2.9 | 217 | 57 |
| YAML as it is | 8.7 | 173 | 180 |

#### M5: Routing cases

What the router does on small cases that each test one standard of a good route. It finds causes and decides nothing, and three of the seven standards have no number, so the owner's eye reads those.

**Want:** A picture that is complete and clear at once.

**Checks:**

- [F2.7: How edges are drawn](../features/F2-layout.md#f27-how-edges-are-drawn)
- [5. The engine routes every edge, in plain forms](../DESIGNS.md#5-the-engine-routes-every-edge-in-plain-forms)

**How:** `pnpm bench routes`, over the cases in `bench/routes/`, with the pictures for the owner.

**Formula:**

```
M5 = total crossings and total bends over the cases
     with the cases better and worse than the saved baseline
```

**Last value:** 16 crossings and 125 bends over 29 cases on 2026-11-07, 0 defects.

### Benchmarks

#### B1: Iteration

A change request is done right, quickly and cheaply.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [4. A change keeps every fact it does not name](../DESIGNS.md#4-a-change-keeps-every-fact-it-does-not-name)

**Problem set:** the public brief: a draft and 8 change requests, 3 runs per arm.

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

A picture of 50 nodes has no defect and a clarity of at least 3 of 5.

**Want:** A picture that is complete and clear at once.

**Checks:**

- [F2.7: How edges are drawn](../features/F2-layout.md#f27-how-edges-are-drawn)
- [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)

**Problem set:** fictional briefs of 10, 25 and 50 components, 3 runs each, rated blind by the owner.

**Formula:**

```
B2 = owner's clarity rating (1 to 5) of a picture of 50 boxes, with defects counted by the geometry check
target = no defect, clarity >= 3
kill = a defect at 25 boxes
```

**Last score:** ⬜ not shown at 50 nodes. On 2026-10-12 all 9 drafts had no defect, and the 50-component drafts scored a clarity of 5, 5 and 4. But Haiku merged that brief into 15 to 19 nodes, so no picture of 50 nodes was judged. On 2026-10-18 one draft drew 51 nodes, with 174 crossings and an engine-owned defect; its clarity was not rated.

#### B4: Verifiability

The agent knows it is done from grafical's text output, with at most 1 look at the picture per first draft and none per change. Only taste needs the owner, and every other check is mechanical.

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

**Last result:** ❌ not met. Haiku took 36.3 s with grafical against 27.8 s directly on 2026-10-18 (round `p1g`), and Opus 39 s against 54 s on 2026-10-12.

#### C3: Token use

A diagram costs fewer fresh tokens than the same model uses drawing directly.

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

**Last result:** ❌ not met. Haiku used 42.2k with grafical against 21.3k directly on 2026-10-18 (round `p1g`), and Opus 23.7k against 26.5k on 2026-10-12.

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

**Last result:** ❌ not met. Haiku cost $0.015 with grafical against $0.008 directly on 2026-10-18 (round `p1g`), and Opus $0.259 against $0.312 on 2026-10-12.

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

**Last result:** ✅ met by the owner's report on 2026-11-05: in a blind rating Haiku with grafical was far above Opus at xhigh effort drawing directly. The scores were not recorded. On 2026-10-12 at the default thinking budget: 24 against 5 of 25.

### Thresholds

#### T1: Operation errors

At most 5% of operations are refused, each recovered within 1 retry.

**Want:** Never place a node by hand, Get a good picture from a small model.

**Checks:**

- [F3.5: Refusals](../features/F3-editing.md#f35-refusals)
- [7. A refusal gives the facts, and the agent writes the fix](../DESIGNS.md#7-a-refusal-gives-the-facts-and-the-agent-writes-the-fix)

**Limit:** 5%; above 20% is the kill threshold.

**How:** the benchmark harness counts refused calls in each round.

**Status:** ❌ not met on 2026-10-18 (round `p1g`). The public brief's drafts were refused 0% of their calls and its changes 21%, nearly all in one grouping step; the scale drafts 19% to 26%, the loose prompts 12%, and two drafts of the private reference brief 55%, mostly `title-blocked`.

#### T2: Speed

At most 50 ms in process to apply, lay out and check one operation at 50 nodes, and at most 400 ms for one command.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [13. Every search the engine runs has a cap](../DESIGNS.md#13-every-search-the-engine-runs-has-a-cap)
- [4. A change keeps every fact it does not name](../DESIGNS.md#4-a-change-keeps-every-fact-it-does-not-name)

**Limit:** 50 ms an operation and 400 ms a command; a render above 2 s is the kill threshold.

**How:** `pnpm bench speed`, on random diagrams of about 50 nodes.

**Status:** ✅ met on 2026-11-05. One operation took a median of 10.2 ms and at most 32.8 ms. Commands took 207 to 219 ms, and a render 420 ms.

### Constraints

#### R1: Stability

No fact changes that no operation named: a layer, an order, a group, a lane or an alignment. Nodes that move sideways in layers the change did not touch are measured, without a target.

**Want:** Fix one thing without losing the rest.

**Checks:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [4. A change keeps every fact it does not name](../DESIGNS.md#4-a-change-keeps-every-fact-it-does-not-name)

**Condition:** every operation changes only the facts it names.

**How:** the stability tests apply single operations, and `grafical diff` compares each change step with the one before. Any unnamed fact change is a failure.

**Status:** ✅ met on 2026-10-12. 0 unnamed changes in all 169 single operations of the tests and in every change step of the stage 1 round.

#### R2: Mechanical defects

No overflow, overlap, line through a node or label collision.

**Want:** A picture that is complete and clear at once.

**Checks:**

- [F5.4: Check](../features/F5-checking.md#f54-check)
- [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)

**Condition:** no rendered picture has any of the four. Any defect in an output is a bug.

**How:** `pnpm bench geometry` checks every rendered SVG of a round with a geometry check of its own. It does not use grafical's checker, which refuses every write it flags and so would always report zero.

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

#### R4: A sound file

The `.grafical` file does what a plain data file cannot promise:

- Every reference names an object, or the file is refused.
- An ID may be any word, since no word is reserved.
- One set of facts gives one set of bytes.
- Any text fits with no trouble.
- An unknown field or block is refused.
- An order names every member of its region and nothing else.

**Want:** Keep the diagram beside the code.

**Checks:**

- [F6.1.1: The object model](../features/F6-output.md#f611-the-object-model)
- [10. What grafical cannot fully read, it refuses](../DESIGNS.md#10-what-grafical-cannot-fully-read-it-refuses)

**Condition:** any of these that does not hold is a failure.

**How:** `test/model/grafical-format.test.ts`, over the fixtures and 200 random diagrams.

**Status:** ✅ met on 2026-11-07, by the 9 tests of that file.
