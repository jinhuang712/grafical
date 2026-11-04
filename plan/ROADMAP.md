# Roadmap

**Current checkpoint:** [CP2: The MVP bar, measured again](#cp2-the-mvp-bar-measured-again), with [CP3: Pictures worth keeping](#cp3-pictures-worth-keeping) running beside it. Speed is fixed; operation errors, the new checks, the missing baselines and a paid round remain.

## Summary

```
Roadmap
├── ✅ CP1: Stage 1 built — everything an agent needs to draw with grafical alone
│   ├── ✅ CP1.1: The risky questions — the spikes and the package
│   ├── ✅ CP1.2: The loop — operations to a picture
│   ├── ✅ CP1.3: The target look — the engine rebuilt toward a target
│   ├── ✅ CP1.4: The owner's additions — containers, lanes, themes and the viewer
│   ├── ✅ CP1.5: The vocabulary and stability — the full operation set
│   ├── ✅ CP1.6: The stage 1 round — the first full benchmark round
│   ├── ✅ CP1.7: Clearer lines and more diagram types — line kinds and diagram types
│   ├── ✅ CP1.8: Discrete output and freer placement — records, columns, steps, walls and notes
│   └── ✅ CP1.9: Refusals that name the way out — refusals with the commands that change them
├── 🟨 CP2: The MVP bar, measured again — the MVP bar met in one round
│   ├── ✅ CP2.1: Fix the speed slip — speed back under its limit
│   ├── 🟨 CP2.2: Bring operation errors under 5% — fewer refused calls
│   ├── ⬜ CP2.3: Measure the new checks — placement and context measured
│   ├── ⬜ CP2.4: Add the missing baselines — the two baselines that never ran
│   └── ⬜ CP2.5: Run one paid round — a round paid for and measured
├── 🟨 CP3: Pictures worth keeping — pictures that look right where no check fails
├── ⬜ CP4: More combinations of operations — more ways to combine operations
└── ⬜ CP5: Release 0.1.0 — grafical on npm
```

## CP1: Stage 1 built

**Status:** ✅ (2026-10-11 to 2026-10-19)

Everything an agent needs to draw with grafical alone: the operations, the layout and routing, the checks, the help and the benchmark harness. Most of it was built before the goals were written down on 2026-10-15, so only two of its parts end on a goal.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP1.1: The risky questions](#cp11-the-risky-questions) is met.
  - [CP1.2: The loop](#cp12-the-loop) is met.
  - [CP1.3: The target look](#cp13-the-target-look) is met.
  - [CP1.4: The owner's additions](#cp14-the-owners-additions) is met.
  - [CP1.5: The vocabulary and stability](#cp15-the-vocabulary-and-stability) is met.
  - [CP1.6: The stage 1 round](#cp16-the-stage-1-round) is met.
  - [CP1.7: Clearer lines and more diagram types](#cp17-clearer-lines-and-more-diagram-types) is met.
  - [CP1.8: Discrete output and freer placement](#cp18-discrete-output-and-freer-placement) is met.
  - [CP1.9: Refusals that name the way out](#cp19-refusals-that-name-the-way-out) is met.

### CP1.1: The risky questions

**Status:** ✅ (2026-10-11)

Spikes chose our own gap router, `harfbuzzjs`, the 8,105-character Chinese font subset and the npm name `grafical`, and showed the same file gives the same pixels on macOS and Linux. The package, its tests and CI on both systems were set up.

**Exit criteria:**

- **Constraints**
  - [R3: Determinism](GOALS.md#r3-determinism)

### CP1.2: The loop

**Status:** ✅ (2026-10-11)

The smallest path from operations to a picture: an agent built the public brief with operations alone, with no defect.

**Delivers:**

- [F1.1: Operations](../features/F1-drawing-in-steps.md#f11-operations)
- [F1.2: Batches](../features/F1-drawing-in-steps.md#f12-batches)
- [F7.5: Render](../features/F7-seeing-the-result.md#f75-render)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.3: The target look

**Status:** ✅ (2026-10-11)

The engine was rebuilt toward a hand-drawn target that judges scored 57 of 60, against 22 for the first engine: rows not drawn, groups as systems, one column grid and measured rules (`bench/results/phase1b.md`, `bench/results/phase1b2.md`, `bench/results/phase1b3.md`).

**Delivers:**

- [F3.6: How lines are drawn](../features/F3-lines.md#f36-how-lines-are-drawn)
- [F4.1: Rows and order](../features/F4-placing.md#f41-rows-and-order)
- [F5.1: Groups](../features/F5-grouping.md#f51-groups)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.4: The owner's additions

**Status:** ✅ (2026-10-11 and 2026-10-12)

Lines that end at containers, swimlanes, themes and stylesheets, and the live viewer.

**Delivers:**

- [F3.5: Ends at a group, a row or a lane](../features/F3-lines.md#f35-ends-at-a-group-a-row-or-a-lane)
- [F5.4: Swimlanes](../features/F5-grouping.md#f54-swimlanes)
- [F6.4: Themes and stylesheets](../features/F6-the-whole-picture.md#f64-themes-and-stylesheets)
- [F7.6: Live viewer](../features/F7-seeing-the-result.md#f76-live-viewer)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.5: The vocabulary and stability

**Status:** ✅ (2026-10-12)

The full operation set, `apply`, `show`, `diff` and the help, with the stability rule enforced by tests (`bench/results/phase2.md`).

**Delivers:**

- [F1.1: Operations](../features/F1-drawing-in-steps.md#f11-operations)
- [F1.2: Batches](../features/F1-drawing-in-steps.md#f12-batches)
- [F7.1: Show](../features/F7-seeing-the-result.md#f71-show)
- [F7.7: Diff](../features/F7-seeing-the-result.md#f77-diff)
- [F7.8: Help](../features/F7-seeing-the-result.md#f78-help)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)

### CP1.6: The stage 1 round

**Status:** ✅ (2026-10-12)

The first full benchmark round, and its rerun after the line work (`bench/results/stage1.md`). The MVP bar was not met.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.7: Clearer lines and more diagram types

**Status:** ✅ (2026-10-12)

New line kinds, lines that meet a box on any side, hops and dots, the flowchart and state machine kinds, nested groups, and the help in place of `grafical guide`.

**Delivers:**

- [F2.1: Kinds and shapes](../features/F2-boxes.md#f21-kinds-and-shapes)
- [F3.6: How lines are drawn](../features/F3-lines.md#f36-how-lines-are-drawn)
- [F5.1: Groups](../features/F5-grouping.md#f51-groups)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.8: Discrete output and freer placement

**Status:** ✅ (2026-10-13 and 2026-10-14)

Records in place of prose, `try`, bundled fan-outs, equal heights in a row, room around stores, columns, steps from another box, walls, notes, marks, edge weights and the richer legend.

**Delivers:**

- [F1.3: Trying a change](../features/F1-drawing-in-steps.md#f13-trying-a-change)
- [F4.3: Columns](../features/F4-placing.md#f43-columns)
- [F4.4: Steps from another box](../features/F4-placing.md#f44-steps-from-another-box)
- [F5.5: Walls](../features/F5-grouping.md#f55-walls)
- [F5.6: Notes](../features/F5-grouping.md#f56-notes)
- [F2.4: Marks](../features/F2-boxes.md#f24-marks)
- [F3.3: Weight](../features/F3-lines.md#f33-weight)
- [F6.2: Legend](../features/F6-the-whole-picture.md#f62-legend)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.9: Refusals that name the way out

**Status:** ✅ (2026-10-15 to 2026-10-19)

The agent states every order and the engine no longer picks a slot. Each refusal, defect and warning prints as a block that says what happened, what caused it and which commands can change it; every write prints every warning; one entry page of help, and a wrong command names the right one; a row's label is optional and a row with a look is drawn; a group can be copied; a bar's name keeps clear of the lines.

**Delivers:**

- [F1.5: Refusals](../features/F1-drawing-in-steps.md#f15-refusals)
- [F4.1: Rows and order](../features/F4-placing.md#f41-rows-and-order)
- [F5.2: Copying a group](../features/F5-grouping.md#f52-copying-a-group)
- [F7.3: Warnings](../features/F7-seeing-the-result.md#f73-warnings)
- [F7.8: Help](../features/F7-seeing-the-result.md#f78-help)
- [F7.9: Guides](../features/F7-seeing-the-result.md#f79-guides)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

## CP2: The MVP bar, measured again

**Status:** 🟨

Most of what it needs is built. Round `p1g` on 2026-10-18 met "Iteration" (23 of 24 changes made) and missed "Operation errors" (19% to 26% of calls refused on large diagrams, 55% on the private reference brief); the owner dropped the judged score the same day. The new checks and the missing baselines come before the next paid round.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP2.1: Fix the speed slip](#cp21-fix-the-speed-slip) is met.
  - [CP2.2: Bring operation errors under 5%](#cp22-bring-operation-errors-under-5) is met.
  - [CP2.3: Measure the new checks](#cp23-measure-the-new-checks) is met.
  - [CP2.4: Add the missing baselines](#cp24-add-the-missing-baselines) is met.
  - [CP2.5: Run one paid round](#cp25-run-one-paid-round) is met.

### CP2.1: Fix the speed slip

**Status:** ✅

Adding a box without a position took up to 189.7 ms at 50 boxes, against 50 ms. The agent now states every order, so no slot search runs, and the worst operation takes 18.6 ms.

**Exit criteria:**

- **Thresholds**
  - [T2: Speed](GOALS.md#t2-speed)

### CP2.2: Bring operation errors under 5%

**Status:** 🟨

The refusals of the private reference brief were mostly `title-blocked`. Since then labels sit on straight vertical lines, and over 2,000 fuzz seeds `label-blocked` fell from 62 to 0 and `title-blocked` from 4 to 1; only a paid round shows whether Haiku's refused calls fall below 5%.

**Exit criteria:**

- **Thresholds**
  - [T1: Operation errors](GOALS.md#t1-operation-errors)

### CP2.3: Measure the new checks

**Status:** ⬜

A scan of the transcripts for placement by the agent, and the context each diagram adds. The same round first counts the requests no operation could express, which CP4: More combinations of operations ends on.

**Exit criteria:**

- **Objectives**
  - [O2: No placement by the agent](GOALS.md#o2-no-placement-by-the-agent)
- **Comparisons**
  - [C4: Context added](GOALS.md#c4-context-added)

### CP2.4: Add the missing baselines

**Status:** ⬜

Opus with a higher thinking budget, and the `diagram-design` skill.

**Exit criteria:**

- **Comparisons**
  - [C2: Time](GOALS.md#c2-time)
  - [C3: Token use](GOALS.md#c3-token-use)
  - [C5: Cost](GOALS.md#c5-cost)
  - [C6: Cache hit rate](GOALS.md#c6-cache-hit-rate)

### CP2.5: Run one paid round

**Status:** ⬜

With the owner's approval of its cost first. The owner's budget for stage 1 is $20, mostly on Haiku. Opus runs only for the baselines and the gap between models, and both get the same prompt, word for word. The private reference brief's runs stay on the owner's machine, and only numbers are committed.

**Exit criteria:**

- **Objectives**
  - [O1: The MVP bar](GOALS.md#o1-the-mvp-bar)
- **Benchmarks**
  - [B1: Iteration](GOALS.md#b1-iteration)
  - [B5: Intent](GOALS.md#b5-intent)
- **Comparisons**
  - [C1: Model gap](GOALS.md#c1-model-gap)
- **Constraints**
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

## CP3: Pictures worth keeping

**Status:** 🟨 (since 2026-10-30)

Drawing reference diagrams with grafical's own commands showed where a picture still looks wrong though no check fails. Built so far: a label sits on its own straight vertical line, `choice` is a small diamond for a line that splits, a footnote's number stays wholly inside or outside a container, and a bar's name keeps clear of passing lines. Two attempts did not land and wait on the owner's choice:

- [Labels sit close to the lines beside them in a crowded gutter](TODO.md#p2discussion-labels-sit-close-to-the-lines-beside-them-in-a-crowded-gutter)
- [A diamond's lines leave at its slanted edge a little](TODO.md#p2discussion-a-diamonds-lines-leave-at-its-slanted-edge-a-little)

Each round's final pictures go on a review page, and the owner's notes decide what comes next.

**Delivers:**

- [F2.1: Kinds and shapes](../features/F2-boxes.md#f21-kinds-and-shapes)
- [F3.6: How lines are drawn](../features/F3-lines.md#f36-how-lines-are-drawn)

**Exit criteria:**

- **Objectives**
  - [O3: The picture turned in](GOALS.md#o3-the-picture-turned-in)

## CP4: More combinations of operations

**Status:** ⬜

The form is not decided with the owner yet, such as one operation for a common edit or for a common shape ([Later, if needed](../FEATURES.md#later-if-needed)). The first candidates were chosen on 2026-10-15 after a field study of other diagram tools; copying a group was built on 2026-10-16. A candidate stays only if a round shows it helps.

**Delivers:**

- [F3.4: Numbered steps](../features/F3-lines.md#f34-numbered-steps)
- [F5.2: Copying a group](../features/F5-grouping.md#f52-copying-a-group)
- [F5.3: Deeper nesting](../features/F5-grouping.md#f53-deeper-nesting)
- [F2.5: Marks by name](../features/F2-boxes.md#f25-marks-by-name)

**Exit criteria:**

- **Measures**
  - [M1: Enough to say](GOALS.md#m1-enough-to-say)

## CP5: Release 0.1.0

**Status:** ⬜

Publish `grafical` on npm once every goal meets its target. A recorded decision may recalibrate any target except the MVP bar.

**Exit criteria:**

- **Benchmarks**
  - [B2: Scale](GOALS.md#b2-scale)
  - [B3: Faithfulness](GOALS.md#b3-faithfulness)
  - [B4: Verifiability](GOALS.md#b4-verifiability)
