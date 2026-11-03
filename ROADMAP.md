<!-- what-we-build: approved 2026-10-15 -->
# Roadmap

**Current checkpoint:** [CP10: The MVP bar, measured again](#cp10-the-mvp-bar-measured-again), with [CP11: Pictures worth keeping](#cp11-pictures-worth-keeping) running beside it. Speed is fixed; operation errors, the new checks, the missing baselines and a paid round remain.

✅ done · 🟨 in progress · ⬜ planned

What each checkpoint delivers is in [FEATURES.md](FEATURES.md), and every exit criterion is a check in [GOALS.md](GOALS.md). The tries, scores and costs of each round are in `bench/results/`.

## Summary

```
Roadmap
├── ✅ CP1: The risky questions
├── ✅ CP2: The loop
├── ✅ CP3: The target look
├── ✅ CP4: The owner's additions
├── ✅ CP5: The vocabulary and stability
├── ✅ CP6: The stage 1 round
├── ✅ CP7: Clearer lines and more diagram types
├── ✅ CP8: Discrete output and freer placement
├── ✅ CP9: Refusals that name the way out
├── 🟨 CP10: The MVP bar, measured again
│   ├── ✅ CP10.1: Fix the speed slip
│   ├── 🟨 CP10.2: Bring operation errors under 5%
│   ├── ⬜ CP10.3: Measure the new checks
│   ├── ⬜ CP10.4: Add the missing baselines
│   └── ⬜ CP10.5: Run one paid round
├── 🟨 CP11: Pictures worth keeping
├── ⬜ CP12: More combinations of operations
└── ⬜ CP13: Release 0.1.0
```

## CP1: The risky questions

**Status:** ✅ (2026-10-11)

Spikes chose our own gap router, `harfbuzzjs`, the 8,105-character Chinese font subset and the npm name `grafical`, and showed the same file gives the same pixels on macOS and Linux. The package, its tests and CI on both systems were set up.

**Exit criteria:**

- **Constraints**
  - [R3: Determinism](GOALS.md#r3-determinism)

## CP2: The loop

**Status:** ✅ (2026-10-11)

The smallest path from operations to a picture: an agent built the public brief with operations alone, with no defect.

**Delivers:**

- [F1.1: Operations](FEATURES.md#f11-operations)
- [F1.2: Batches](FEATURES.md#f12-batches)
- [F7.5: Render](FEATURES.md#f75-render)

**Exit criteria:** none of its own: it ended before the goals were set, or its claim is covered by the checkpoint after it.

## CP3: The target look

**Status:** ✅ (2026-10-11)

The engine was rebuilt toward a hand-drawn target that judges scored 57 of 60, against 22 for the first engine: rows not drawn, groups as systems, one column grid and measured rules ([phase1b](bench/results/phase1b.md), [phase1b2](bench/results/phase1b2.md), [phase1b3](bench/results/phase1b3.md)).

**Delivers:**

- [F3.6: How lines are drawn](FEATURES.md#f36-how-lines-are-drawn)
- [F4.1: Rows and order](FEATURES.md#f41-rows-and-order)
- [F5.1: Groups](FEATURES.md#f51-groups)

**Exit criteria:** none of its own: it ended before the goals were set, or its claim is covered by the checkpoint after it.

## CP4: The owner's additions

**Status:** ✅ (2026-10-11 and 2026-10-12)

Lines that end at containers, swimlanes, themes and stylesheets, and the live viewer.

**Delivers:**

- [F3.5: Ends at a group, a row or a lane](FEATURES.md#f35-ends-at-a-group-a-row-or-a-lane)
- [F5.4: Swimlanes](FEATURES.md#f54-swimlanes)
- [F6.4: Themes and stylesheets](FEATURES.md#f64-themes-and-stylesheets)
- [F7.6: Live viewer](FEATURES.md#f76-live-viewer)

**Exit criteria:** none of its own: it ended before the goals were set, or its claim is covered by the checkpoint after it.

## CP5: The vocabulary and stability

**Status:** ✅ (2026-10-12)

The full operation set, `apply`, `show`, `diff` and the help, with the stability rule enforced by tests ([phase2](bench/results/phase2.md)).

**Delivers:**

- [F1.1: Operations](FEATURES.md#f11-operations)
- [F1.2: Batches](FEATURES.md#f12-batches)
- [F7.1: Show](FEATURES.md#f71-show)
- [F7.7: Diff](FEATURES.md#f77-diff)
- [F7.8: Help](FEATURES.md#f78-help)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)

## CP6: The stage 1 round

**Status:** ✅ (2026-10-12)

The first full benchmark round, and its rerun after the line work ([stage1](bench/results/stage1.md)). The MVP bar was not met.

**Exit criteria:** none of its own: it ended before the goals were set, or its claim is covered by the checkpoint after it.

## CP7: Clearer lines and more diagram types

**Status:** ✅ (2026-10-12)

New line kinds, lines that meet a box on any side, hops and dots, the flowchart and state machine kinds, nested groups, and the help in place of `grafical guide`.

**Delivers:**

- [F2.1: Kinds and shapes](FEATURES.md#f21-kinds-and-shapes)
- [F3.6: How lines are drawn](FEATURES.md#f36-how-lines-are-drawn)
- [F5.1: Groups](FEATURES.md#f51-groups)

**Exit criteria:** none of its own: it ended before the goals were set, or its claim is covered by the checkpoint after it.

## CP8: Discrete output and freer placement

**Status:** ✅ (2026-10-13 and 2026-10-14)

Records in place of prose, `try`, bundled fan-outs, equal heights in a row, room around stores, columns, steps from another box, walls, notes, marks, edge weights and the richer legend.

**Delivers:**

- [F1.3: Trying a change](FEATURES.md#f13-trying-a-change)
- [F4.3: Columns](FEATURES.md#f43-columns)
- [F4.4: Steps from another box](FEATURES.md#f44-steps-from-another-box)
- [F5.5: Walls](FEATURES.md#f55-walls)
- [F5.6: Notes](FEATURES.md#f56-notes)
- [F2.4: Marks](FEATURES.md#f24-marks)
- [F3.3: Weight](FEATURES.md#f33-weight)
- [F6.2: Legend](FEATURES.md#f62-legend)

**Exit criteria:** none of its own: it ended before the goals were set, or its claim is covered by the checkpoint after it.

## CP9: Refusals that name the way out

**Status:** ✅ (2026-10-15 to 2026-10-19)

The agent states every order and the engine no longer picks a slot. Each refusal, defect and warning prints as a block that says what happened, what caused it and which commands can change it; every write prints every warning; one entry page of help, and a wrong command names the right one; a row's label is optional and a row with a look is drawn; a group can be copied; a bar's name keeps clear of the lines.

**Delivers:**

- [F1.5: Refusals](FEATURES.md#f15-refusals)
- [F4.1: Rows and order](FEATURES.md#f41-rows-and-order)
- [F5.2: Copying a group](FEATURES.md#f52-copying-a-group)
- [F7.3: Warnings](FEATURES.md#f73-warnings)
- [F7.8: Help](FEATURES.md#f78-help)
- [F7.9: Guides](FEATURES.md#f79-guides)

**Exit criteria:** none of its own: it ended before the goals were set, or its claim is covered by the checkpoint after it.

## CP10: The MVP bar, measured again

**Status:** 🟨

Most of what it needs is built. Round `p1g` on 2026-10-18 met "Iteration" (23 of 24 changes made) and missed "Operation errors" (19% to 26% of calls refused on large diagrams, 55% on the private reference brief); the owner dropped the judged score the same day. The new checks and the missing baselines come before the next paid round.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP10.1: Fix the speed slip](#cp101-fix-the-speed-slip) is met.
  - [CP10.2: Bring operation errors under 5%](#cp102-bring-operation-errors-under-5) is met.
  - [CP10.3: Measure the new checks](#cp103-measure-the-new-checks) is met.
  - [CP10.4: Add the missing baselines](#cp104-add-the-missing-baselines) is met.
  - [CP10.5: Run one paid round](#cp105-run-one-paid-round) is met.

### CP10.1: Fix the speed slip

**Status:** ✅

Adding a box without a position took up to 189.7 ms at 50 boxes, against 50 ms. The agent now states every order, so no slot search runs, and the worst operation takes 18.6 ms.

**Exit criteria:**

- **Thresholds**
  - [T2: Speed](GOALS.md#t2-speed)

### CP10.2: Bring operation errors under 5%

**Status:** 🟨

The refusals of the private reference brief were mostly `title-blocked`. Since then labels sit on straight vertical lines, and over 2,000 fuzz seeds `label-blocked` fell from 62 to 0 and `title-blocked` from 4 to 1; only a paid round shows whether Haiku's refused calls fall below 5%.

**Exit criteria:**

- **Thresholds**
  - [T1: Operation errors](GOALS.md#t1-operation-errors)

### CP10.3: Measure the new checks

**Status:** ⬜

A scan of the transcripts for placement by the agent, the requests no operation could express, and the context each diagram adds.

**Exit criteria:**

- **Objectives**
  - [O2: No placement by the agent](GOALS.md#o2-no-placement-by-the-agent)
- **Measures**
  - [M1: Enough to say](GOALS.md#m1-enough-to-say)
- **Comparisons**
  - [C4: Context added](GOALS.md#c4-context-added)

### CP10.4: Add the missing baselines

**Status:** ⬜

Opus with a higher thinking budget, and the `diagram-design` skill.

**Exit criteria:**

- **Comparisons**
  - [C2: Time](GOALS.md#c2-time)
  - [C3: Token use](GOALS.md#c3-token-use)
  - [C5: Cost](GOALS.md#c5-cost)
  - [C6: Cache hit rate](GOALS.md#c6-cache-hit-rate)

### CP10.5: Run one paid round

**Status:** ⬜

With the owner's approval of its cost first. The owner's budget for stage 1 is $20, mostly on Haiku. Opus runs only for the baselines and the gap between models, and both get the same prompt, word for word. The private reference brief's runs stay on the owner's machine, and only numbers are committed.

**Exit criteria:**

- **Objectives**
  - [O1: The MVP bar](GOALS.md#o1-the-mvp-bar)
- **Benchmarks**
  - [B1: Iteration](GOALS.md#b1-iteration)
- **Comparisons**
  - [C1: Model gap](GOALS.md#c1-model-gap)
- **Constraints**
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

## CP11: Pictures worth keeping

**Status:** 🟨 (since 2026-10-30)

Drawing reference diagrams with grafical's own commands showed where a picture still looks wrong though no check fails. Built so far: a label sits on its own straight vertical line, `choice` is a small diamond for a line that splits, a footnote's number stays wholly inside or outside a container, and a bar's name keeps clear of passing lines. Two attempts did not land and are in TODO.md (crowded gutters, a diamond's corner). Five more items wait on the owner's choice. Each round's final pictures go on a review page, and the owner's notes decide what comes next.

**Delivers:**

- [F2.1: Kinds and shapes](FEATURES.md#f21-kinds-and-shapes)
- [F3.6: How lines are drawn](FEATURES.md#f36-how-lines-are-drawn)

**Exit criteria:**

- **Objectives**
  - [O3: The picture turned in](GOALS.md#o3-the-picture-turned-in)

## CP12: More combinations of operations

**Status:** ⬜

The form is not decided with the owner yet, such as one operation for a common edit or for a common shape (FEATURES.md, "Later"). The first candidates were chosen on 2026-10-15 after a field study of other diagram tools; copying a group was built on 2026-10-16. A candidate stays only if a round shows it helps.

**Delivers:**

- [F3.4: Numbered steps](FEATURES.md#f34-numbered-steps)
- [F5.2: Copying a group](FEATURES.md#f52-copying-a-group)
- [F5.3: Deeper nesting](FEATURES.md#f53-deeper-nesting)
- [F2.5: Marks by name](FEATURES.md#f25-marks-by-name)

**Exit criteria:**

- **Benchmarks**
  - [B5: Intent](GOALS.md#b5-intent)

## CP13: Release 0.1.0

**Status:** ⬜

Publish `grafical` on npm. Every check in GOALS.md meets its target; a recorded decision may recalibrate any target except the MVP bar.

**Exit criteria:**

- **Benchmarks**
  - [B2: Scale](GOALS.md#b2-scale)
  - [B3: Faithfulness](GOALS.md#b3-faithfulness)
  - [B4: Verifiability](GOALS.md#b4-verifiability)

## Later

What is wanted but not scheduled is in FEATURES.md, "Later". An item gets a checkpoint here when a benchmark result shows it is needed.
