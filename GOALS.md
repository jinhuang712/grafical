# Goals

Each goal is a check with a number or a test, under the want in [PROPOSAL.md](PROPOSAL.md) that it serves. The benchmark harness measures most of them in rounds of agent runs, and CI measures the rest on every push. [EXPERIMENTS.md](EXPERIMENTS.md) defines each metric and how a round runs. The targets are first estimates, except the MVP bar: a recorded decision may change any other target, and only the owner changes the MVP bar.

A status is ✅ met, ❌ not met, or ⬜ not measured, always with the date of the measurement. A goal has an ID that never changes, and code and documents cite it by its name, such as `GOALS.md, "Speed"`.

## Summary

```
Goals
├── Objectives
│   ├── ❌ O1: The MVP bar — Haiku, with only the command line and its help, meets the main checks
│   ├── ⬜ O2: No placement by the agent — no transcript works out a position
│   └── ⬜ O3: The picture turned in — the owner names what is wrong with the final picture
├── Measures
│   └── ⬜ M1: Enough to say — what an agent wanted to state and no operation could
├── Benchmarks
│   ├── ✅ B1: Iteration — a change request done right, fast and cheap
│   ├── ⬜ B2: Scale — a clear picture at 50 boxes
│   ├── ⬜ B3: Faithfulness — nothing invented, little missing
│   ├── ❌ B4: Verifiability — few looks at the picture
│   └── ✅ B5: Intent — a loose prompt is enough
├── Comparisons
│   ├── ✅ C1: Model gap — Opus against Haiku
│   ├── ✅ C2: Time — against each baseline
│   ├── ✅ C3: Token use — against each baseline
│   ├── ⬜ C4: Context added — against each baseline
│   ├── ✅ C5: Cost — against each baseline
│   └── ✅ C6: Cache hit rate — against each baseline
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

Set by the owner on 2026-10-13 (PHILOSOPHY.md, "What makes grafical good?"). It has two parts.

- **The main bar: easy and consistent.** Haiku uses only the command line and its help.
  - It meets the targets of "Iteration", "Stability", "Model gap", "Operation errors", "Determinism" and "Speed".
  - It draws with zero mechanical defects.
- **No judged score.** Until 2026-10-18 the bar also asked two blind Opus judges to score Haiku's picture of the private reference brief at least 42 of 50. The owner dropped it that day: a judge's number says little now that grafical's pictures are well past those drawn with no tool or with Mermaid, and what is left to improve is not how the pictures look.
  - The owner looks at each round's pictures and names their problems instead ("The picture turned in").

**Want:** every want in PROPOSAL, as the headline.

**Acceptance:** the six named checks (B1: Iteration, R1: Stability, C1: Model gap, T1: Operation errors, R3: Determinism, T2: Speed) are met in one round on the private reference brief, and the round has no engine-owned defect.

**Status:** ❌ not met on 2026-10-18. In round `p1g` "Iteration" was met, "Operation errors" was not, and one draft had an engine-owned defect (`bench/results/p1g-stage1.md`).

#### O2: No placement by the agent

No transcript has the agent work out a position or write a script to lay out the picture.

**Want:** The agent never places anything.

**Acceptance:** the benchmark harness scans every grafical transcript of a round, and finds none.

**Status:** ⬜ not measured.

#### O3: The picture turned in

The owner looks at the picture the agent turns in at the end and names what is wrong with it; no score (owner, 2026-10-18). How many drafts or calls it took to get there is not counted: "Time", "Token use" and "Cost" measure what they cost.

**Want:** Complete and clear at once.

**Acceptance:** each round's final pictures go on a review page with a box for the owner's notes beside each, and the notes are read back. Pictures of private briefs stay on the owner's machine.

**Status:** ⬜ the 25 public pictures of round `p1g` await the owner's notes. Until 2026-10-18 the target was a judged score of at least 42 of 50: 38.0 on 2026-10-12.

### Measures

#### M1: Enough to say

How often an agent wanted to state something that no operation could express, and drew something else or gave up. The first measured round sets a target.

**Want:** Enough to say what is needed, without pixel work.

**How:** read from the refusals and the agents' own notes in a benchmark round.

**Formula:**

```
M1 = times an agent wanted to state something no operation could express
     per round, counted from refusals and from the agents' reflections
```

**Last value:** not measured.

### Benchmarks

#### B1: Iteration

A change request is done right, quickly and cheaply.

**Want:** A change is one small step.

**Problem set:** the public brief: a draft and 8 change requests, 3 runs per arm (EXPERIMENTS.md, "E2 Iteration").

**Formula:**

```
done right = change steps that made the change / change steps asked
time       = mean wall seconds per change step
tokens     = mean fresh tokens per change step  (uncached input + cache writes + output)
target     = done right >= 90%, time <= 30 s, tokens <= 15k
```

**Kill threshold:** slower or costlier per change than redrawing with no tool.

**Last score:** ✅ met on the means on 2026-10-18 (round `p1g`): 23 of 24 change steps made the change (96%). Per step, time averaged 7 to 29 s and fresh tokens 1.4k to 12k; one run of grouping took 60 s and 24k, refused by `title-blocked`. On 2026-10-12 it was not met: 17 of 24 (71%), six of the seven misses asking about something the draft had merged away.

#### B2: Scale

A picture of 50 boxes has no defect and a clarity of at least 3 of 5.

**Want:** Complete and clear at once.

**Problem set:** fictional briefs of 10, 25 and 50 components, 3 runs each, rated blind by the owner (EXPERIMENTS.md, "E4 Scale").

**Formula:**

```
B2 = owner's clarity rating (1 to 5) of a picture of 50 boxes, with defects counted by the geometry check
target = no defect, clarity >= 3
```

**Kill threshold:** a defect at 25 boxes.

**Last score:** ⬜ not shown at 50 boxes. On 2026-10-12 all 9 drafts had no defect, and the 50-component drafts scored a clarity of 5, 5 and 4. But Haiku merged that brief into 15 to 19 boxes, so no picture of 50 boxes was judged. On 2026-10-18 one draft drew 51 boxes, with 174 crossings and an engine-owned defect; its clarity was not rated.

#### B3: Faithfulness

The picture invents no component and misses at most 1 important item of the brief.

**Want:** Complete and clear at once.

**Problem set:** the briefs of each first-draft round (EXPERIMENTS.md, "E1 First draft"), checked against the judges' checklist.

**Formula:**

```
invented = components in the draft that the brief does not name
missing  = important items of the brief that the draft does not show
target   = invented = 0, missing <= 1
```

**Kill threshold:** any invented component.

**Last score:** ⬜ not measured as a count.

#### B4: Verifiability

The agent knows it is done from grafical's text output, with at most 1 look at the picture per first draft and none per change. Only taste and faithfulness need a judge, and every other check is mechanical.

**Want:** Fewer turns, less time, fewer tokens.

**Problem set:** the runs of a round; the benchmark harness counts the images each agent opens.

**Formula:**

```
looks per draft  = image reads in a first-draft run
looks per change = image reads in a change step, averaged over the steps
target           = looks per draft <= 1, looks per change = 0
```

**Kill threshold:** the agent must look at the picture after each step.

**Last score:** ❌ not met on 2026-10-18 (round `p1g`), closer: drafts looked once, and changes 0 to 0.3 times per step on average. On 2026-10-12 changes looked up to once per step: 1.0 when adding a node, 0.3 when adding a line.

#### B5: Intent

A loose prompt of about three sentences is enough for Haiku to draw what the owner meant.

**Want:** A small model draws like a large one.

**Problem set:** 10 loose prompts about fictional systems (`bench/prompts/intent.yaml`), rated by the owner in person (EXPERIMENTS.md, "E3 Intent").

**Formula:**

```
B5 = drawings the owner accepts without changes / 10
target = at least 7 of 10
```

**Kill threshold:** fewer than 5 of 10.

**Last score:** ✅ 9 of 10 on 2026-10-12.

### Comparisons

The checks in this section are comparative. A number such as 35.6k tokens means nothing alone, so grafical is held against three baselines that draw the same brief:

- **A stronger model with a higher thinking budget:** Opus with extended thinking, drawing without grafical.
- **The same model without grafical:** Haiku drawing on its own.
- **Other tools,** such as Mermaid and the `diagram-design` skill.

The rule, set by the owner on 2026-10-15: grafical gets a picture the owner accepts for less than each baseline pays for a picture the owner accepts. A baseline that draws no accepted picture loses the comparison, whatever it spends. The first drafts of the stage 1 round on the public brief, 2026-10-12, 3 runs each, mean per draft:

| Arm | Owner's rating (of 25) | Cost | Time | Fresh tokens | From the cache |
|---|---|---|---|---|---|
| Haiku with grafical | 24 | $0.011 | 48 s | 35.6k | 83.2% |
| Opus with grafical | 24 | $0.259 | 39 s | 23.7k | 84.6% |
| Opus without grafical | 5 | $0.312 | 54 s | 26.5k | 87.1% |
| Haiku without grafical | 5 | $0.007 | 47 s | 20.5k | 88.7% |
| Haiku with Mermaid | 5 | $0.004 | 16 s | 13.3k | 83.1% |

The owner marked every draft without grafical, and every Mermaid draft, too bad to rate, so none was accepted. Opus ran at its default thinking budget, so the higher-thinking baseline has not run yet, and neither has the `diagram-design` skill. Each comparison below is therefore met against the baselines that ran, and open against the two that did not.

#### C1: Model gap

Opus's score minus Haiku's on the same task is at most 4.

**Want:** A small model draws like a large one.

**Against:** Opus, on the same brief.

**How:** Opus and Haiku draw the same brief, 3 runs each, rated blind by the owner.

**Formula:**

```
C1 = mean owner rating of Opus (of 25) - mean owner rating of Haiku (of 25)
target = at most 4
```

**Kill threshold:** as large as the gap with no tool.

**Last result:** ✅ a gap of 0 on 2026-10-12: both 24 of 25.

#### C2: Time

An accepted diagram takes less wall time than each baseline takes for an accepted one.

**Want:** Fewer turns, less time, fewer tokens.

**Against:** the three baselines above.

**How:** the benchmark harness, from each run's wall time, first drafts and change requests.

**Formula:**

```
C2 = wall seconds from prompt to final answer, per accepted diagram, grafical against each baseline
```

**Kill threshold:** a baseline that gets accepted diagrams in less time.

**Last result:** ✅ against the baselines that ran, none of which drew an accepted picture, on 2026-10-12. ⬜ The higher-thinking baseline and the `diagram-design` skill have not run.

#### C3: Token use

An accepted diagram costs fewer fresh tokens than each baseline uses for an accepted one. Also, the help an agent reads before its first operation stays under 3k tokens; suspended by the owner on 2026-10-17 while the help's correctness comes first (specs/decisions, "One entry page, help where it is used").

**Want:** Fewer turns, less time, fewer tokens.

**Against:** the three baselines above.

**How:** the benchmark harness, from each run's token counts. Fresh tokens leave out cache reads.

**Formula:**

```
C3 = uncached input + cache writes + output tokens, per accepted diagram, grafical against each baseline
```

**Kill threshold:** a baseline that gets accepted diagrams for fewer tokens.

**Last result:** ✅ against the baselines that ran, on 2026-10-12. ⬜ The higher-thinking baseline and the `diagram-design` skill have not run, and the help read before the first operation was not measured, because the round recorded no empty baseline.

#### C4: Context added

An accepted diagram adds fewer tokens to the agent's conversation than each baseline adds for an accepted one. What stays in the conversation is what the agent carries into all its later work.

**Want:** Fewer turns, less time, fewer tokens.

**Against:** the three baselines above.

**How:** the benchmark harness, from each transcript.

**Formula:**

```
C4 = tokens in the conversation when the task ends - tokens when the task starts, per accepted diagram
```

**Kill threshold:** a baseline that adds less to the conversation for accepted diagrams.

**Last result:** ⬜ not measured.

#### C5: Cost

An accepted diagram costs less money than each baseline pays for an accepted one, for first drafts and for change requests.

**Want:** Fewer turns, less time, fewer tokens.

**Against:** the three baselines above.

**How:** the benchmark harness, from each run's cost.

**Formula:**

```
C5 = total_cost_usd per accepted diagram, grafical against each baseline
```

**Kill threshold:** a baseline that gets accepted diagrams for less.

**Last result:** ✅ against the baselines that ran, on 2026-10-12. ⬜ The higher-thinking baseline and the `diagram-design` skill have not run.

#### C6: Cache hit rate

A higher share of input is read from the cache than in each baseline that draws accepted diagrams.

**Want:** Fewer turns, less time, fewer tokens.

**Against:** the three baselines above.

**How:** the benchmark harness, per run.

**Formula:**

```
C6 = cache reads / (uncached input + cache writes + cache reads)
```

**Kill threshold:** a baseline that draws accepted diagrams with a higher share.

**Last result:** ✅ against the baselines that ran, on 2026-10-12. ⬜ The higher-thinking baseline and the `diagram-design` skill have not run.

### Thresholds

#### T1: Operation errors

At most 5% of operations are refused, each recovered within 1 retry.

**Want:** The agent never places anything, and a small model draws like a large one.

**Limit:** 5%; above 20% is the kill threshold.

**How:** the benchmark harness counts refused calls in each round.

**Status:** ❌ not met on 2026-10-18 (round `p1g`). The public brief's drafts were refused 0% of their calls and its changes 21%, nearly all in one grouping step; the scale drafts 19% to 26%, the loose prompts 12%, and two drafts of the private reference brief 55%, mostly `title-blocked`. On 2026-10-12: drafts 0%, scale drafts 20%, loose prompts 13%.

#### T2: Speed

At most 50 ms in process to apply, lay out and check one operation at 50 boxes, and at most 400 ms for one command.

**Want:** Fewer turns, less time, fewer tokens.

**Limit:** 50 ms an operation and 400 ms a command; a render above 2 s is the kill threshold.

**How:** `pnpm bench speed`, on random diagrams of about 50 boxes.

**Status:** ✅ met on 2026-10-15, after specs/decisions, "The agent states every order" removed the slot search. One operation took a median of 8.1 ms and at most 18.6 ms. Commands took 185 to 198 ms, and a render 368 ms. Earlier the same day, adding a box without a position took up to 189.7 ms, because the slot search laid the diagram out once for every slot.

### Constraints

#### R1: Stability

No fact changes that no operation named: a row, an order, a group, a lane or an alignment. Boxes that move sideways in rows the change did not touch are measured, without a target.

**Want:** A change is one small step.

**Condition:** every operation changes only the facts it names (specs/decisions, "Layout computed again on every change").

**How:** the stability tests apply single operations, and `grafical diff` compares each change step with the one before. Restated by the owner on 2026-10-12. Any unnamed fact change is a failure.

**Status:** ✅ met on 2026-10-12. 0 unnamed changes in all 169 single operations of the tests and in every change step of the stage 1 round.

#### R2: Mechanical defects

No overflow, overlap, line through a box or label collision. Until 2026-10-18 it also asked for a defect score from the judges of at least 4 of 5, which the owner dropped with the judged score (O1: The MVP bar).

**Want:** Complete and clear at once.

**Condition:** no rendered picture has any of the four. Any defect in an output is a bug.

**How:** `pnpm bench geometry` checks every rendered SVG of a round with a geometry check of its own. It does not use grafical's checker, which refuses every write it flags and so would always report zero (specs/decisions, "Defects owned by who can fix them").

**Status:** ✅ met on 2026-10-18 (round `p1g`): the geometry check found none in 46 pictures. One draft of 50 components had an engine-owned `needless-bend`, which is none of the four, fixed the same day (2f101d9). On 2026-10-12 the geometry check also found none, but the judges' defect score of 3 or 4 missed the part of the target dropped since.

**Composition, measured on 2026-10-16** over the 306 saved agent drafts (`across`, `tight` and `crowded` of specs/decisions, "Composition counts"): 66 lines run across a group that holds neither end, in 29 drafts; 6 pairs of runs are tight, in 3 drafts; 88 labels are crowded, in 51 drafts. Not targets: facts to compare a change against.

#### R3: Determinism

The same file gives the same SVG bytes and the same PNG pixels on macOS and Linux.

**Want:** The diagram is a file.

**Condition:** any difference is a failure.

**How:** CI renders the pinned fixtures on both systems and compares them on every push.

**Status:** ✅ met on 2026-10-14, in CI run 38584033554.

## Former numbers

Until 2026-10-15 the checks had numbers, and the dated results in `bench/results/` still use them. Benchmark 1 is "The picture turned in" and "Time", 2 "Iteration", 3 "Token use", 4 "Stability", 5 "Model gap", 6 "Operation errors", 7 "Mechanical defects", 8 "Scale", 9 "Faithfulness", 10 "Intent", 11 "Determinism" and "Speed", 12 "Cost", 13 "Cache hit rate" and 14 "Verifiability". Goal 1 is "The MVP bar".
