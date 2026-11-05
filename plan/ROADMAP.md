# Roadmap

**Current checkpoint:** [CP2: Richer pictures](#cp2-richer-pictures). First grafical draws, then it gains styles and features, then every kind of diagram runs as an experiment, and then it is released.

## Summary

```
Roadmap
├── ✅ CP1: Stage 1 built — everything an agent needs to draw with grafical alone
│   ├── ✅ CP1.1: The risky questions — the spikes and the package
│   │   ├── ✅ CP1.1.1: Our own gap router
│   │   ├── ✅ CP1.1.2: Text shaping
│   │   ├── ✅ CP1.1.3: Chinese font subset
│   │   ├── ✅ CP1.1.4: The npm name
│   │   ├── ✅ CP1.1.5: Same pixels on both systems
│   │   └── ✅ CP1.1.6: Package, tests and CI
│   ├── ✅ CP1.2: The loop — operations to a picture
│   │   ├── ✅ CP1.2.1: First operations
│   │   ├── ✅ CP1.2.2: First batches
│   │   ├── ✅ CP1.2.3: First render
│   │   └── ✅ CP1.2.4: The public brief
│   ├── ✅ CP1.3: The target look — the engine rebuilt toward a target
│   │   ├── ✅ CP1.3.1: Rows not drawn
│   │   ├── ✅ CP1.3.2: Groups as systems
│   │   ├── ✅ CP1.3.3: One column grid
│   │   ├── ✅ CP1.3.4: Measured rules
│   │   └── ✅ CP1.3.5: Lines on the new engine
│   ├── ✅ CP1.4: The owner's additions — containers, lanes, themes and the viewer
│   │   ├── ✅ CP1.4.1: Lines that end at containers
│   │   ├── ✅ CP1.4.2: Swimlanes
│   │   ├── ✅ CP1.4.3: Themes and stylesheets
│   │   └── ✅ CP1.4.4: The live viewer
│   ├── ✅ CP1.5: The vocabulary and stability — the full operation set
│   │   ├── ✅ CP1.5.1: The full operation set
│   │   ├── ✅ CP1.5.2: `apply`
│   │   ├── ✅ CP1.5.3: `show`
│   │   ├── ✅ CP1.5.4: `diff`
│   │   ├── ✅ CP1.5.5: The help
│   │   └── ✅ CP1.5.6: The stability rule
│   ├── ✅ CP1.6: The stage 1 round — the first full benchmark round
│   │   ├── ✅ CP1.6.1: The first round
│   │   └── ✅ CP1.6.2: The rerun
│   ├── ✅ CP1.7: Clearer lines and more diagram types — line kinds and diagram types
│   │   ├── ✅ CP1.7.1: New line kinds
│   │   ├── ✅ CP1.7.2: Lines on any side
│   │   ├── ✅ CP1.7.3: Hops and dots
│   │   ├── ✅ CP1.7.4: Flowchart and state machine kinds
│   │   ├── ✅ CP1.7.5: Nested groups
│   │   └── ✅ CP1.7.6: Help in place of `grafical guide`
│   ├── ✅ CP1.8: Discrete output and freer placement — records, columns, steps, walls and notes
│   │   ├── ✅ CP1.8.1: Records
│   │   ├── ✅ CP1.8.2: `try`
│   │   ├── ✅ CP1.8.3: Bundled fan-outs
│   │   ├── ✅ CP1.8.4: Equal heights in a row
│   │   ├── ✅ CP1.8.5: Room around stores
│   │   ├── ✅ CP1.8.6: Columns
│   │   ├── ✅ CP1.8.7: Steps from another box
│   │   ├── ✅ CP1.8.8: Walls
│   │   ├── ✅ CP1.8.9: Notes
│   │   ├── ✅ CP1.8.10: Marks
│   │   ├── ✅ CP1.8.11: Edge weights
│   │   └── ✅ CP1.8.12: The richer legend
│   └── ✅ CP1.9: Refusals that name the way out — refusals with the commands that change them
│       ├── ✅ CP1.9.1: Every order stated
│       ├── ✅ CP1.9.2: Blocks that name the way out
│       ├── ✅ CP1.9.3: Every warning on every write
│       ├── ✅ CP1.9.4: One entry page of help
│       ├── ✅ CP1.9.5: A wrong command names the right one
│       ├── ✅ CP1.9.6: Optional row labels
│       ├── ✅ CP1.9.7: Copying a group
│       ├── ✅ CP1.9.8: Step numbers
│       └── ✅ CP1.9.9: Bar names clear of lines
├── 🟨 CP2: Richer pictures — the styles and features that sit on top of drawing
│   ├── ✅ CP2.1: Fix the speed slip
│   │   ├── ✅ CP2.1.1: No slot search
│   │   └── ✅ CP2.1.2: The worst operation measured
│   ├── 🟨 CP2.2: Pictures worth keeping
│   │   ├── ✅ CP2.2.1: Labels on straight lines
│   │   ├── ✅ CP2.2.2: Choice diamonds
│   │   ├── ✅ CP2.2.3: Footnote numbers
│   │   ├── ✅ CP2.2.4: Bar names clear of lines
│   │   ├── ⬜ CP2.2.5: Labels in a crowded gutter
│   │   └── ⬜ CP2.2.6: A diamond's slanted lines
│   ├── ⬜ CP2.3: Boxes
│   │   ├── ⬜ CP2.3.1: Alignment
│   │   ├── ⬜ CP2.3.2: Corner marks checked
│   │   └── ⬜ CP2.3.3: Marks by name
│   ├── ⬜ CP2.4: Containers
│   │   ├── ⬜ CP2.4.1: Lanes both ways
│   │   └── ⬜ CP2.4.2: Deeper nesting
│   └── ⬜ CP2.5: Direction and views
│       ├── ⬜ CP2.5.1: Flow direction
│       ├── ⬜ CP2.5.2: Views of one file
│       └── ⬜ CP2.5.3: Folded groups
├── 🟨 CP3: Experiments — every kind of diagram measured with a model
│   ├── ⬜ CP3.1: Boxes and lines
│   │   ├── ⬜ CP3.1.1: State machine
│   │   ├── ⬜ CP3.1.2: Flowchart
│   │   └── ⬜ CP3.1.3: Dependency graph
│   ├── ⬜ CP3.2: Containers
│   │   ├── ⬜ CP3.2.1: Architecture
│   │   └── ⬜ CP3.2.2: Swimlane
│   ├── ⬜ CP3.3: Systems
│   │   ├── ⬜ CP3.3.1: Data flow
│   │   ├── ⬜ CP3.3.2: Event flow
│   │   ├── ⬜ CP3.3.3: C4
│   │   └── ⬜ CP3.3.4: Infrastructure
│   ├── ⬜ CP3.4: Size
│   │   ├── ⬜ CP3.4.1: 10 boxes
│   │   ├── ⬜ CP3.4.2: 25 boxes
│   │   └── ⬜ CP3.4.3: A true 50-box picture
│   ├── 🟨 CP3.5: Errors and cost
│   │   ├── ✅ CP3.5.1: Fewer blocked labels
│   │   ├── ⬜ CP3.5.2: Measure the rate in a round
│   │   ├── ⬜ CP3.5.3: Find where Haiku's tokens go
│   │   └── ⬜ CP3.5.4: Cut the cost of a first draft
│   └── 🟨 CP3.6: The MVP bar
│       ├── ⬜ CP3.6.1: Measure the context added
│       ├── ✅ CP3.6.2: Run Opus at xhigh effort
│       ├── ⬜ CP3.6.3: Private reference brief
│       └── ⬜ CP3.6.4: Copy reference pictures
├── ⬜ CP4: Release 0.1.0 — grafical on npm
│   └── ⬜ CP4.1: The npm package
│       ├── ⬜ CP4.1.1: A package that can be published
│       ├── ⬜ CP4.1.2: Publish 0.1.0
│       └── ⬜ CP4.1.3: Install from npm
└── ⬜ CP5: Later — features with no plan yet
    ├── ⬜ CP5.1: Diagram types
    │   ├── ⬜ CP5.1.1: Sequence diagrams
    │   ├── ⬜ CP5.1.2: Gantt charts
    │   ├── ⬜ CP5.1.3: Mind maps
    │   ├── ⬜ CP5.1.4: Pyramids
    │   ├── ⬜ CP5.1.5: Overlapping sets
    │   └── ⬜ CP5.1.6: Entity-relationship and class diagrams
    ├── ⬜ CP5.2: Import
    │   ├── ⬜ CP5.2.1: Mermaid files
    │   ├── ⬜ CP5.2.2: draw.io files
    │   └── ⬜ CP5.2.3: Excalidraw files
    ├── ⬜ CP5.3: For teams
    │   ├── ⬜ CP5.3.1: One catalog of systems
    │   ├── ⬜ CP5.3.2: Brand fonts
    │   └── ⬜ CP5.3.3: An MCP server
    └── ⬜ CP5.4: More combinations of operations
        ├── ⬜ CP5.4.1: Decide the form
        └── ⬜ CP5.4.2: Test the candidates
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

#### CP1.1.1: Our own gap router

**Status:** ✅

A spike chose our own gap router.

#### CP1.1.2: Text shaping

**Status:** ✅

A spike chose `harfbuzzjs`.

#### CP1.1.3: Chinese font subset

**Status:** ✅

A spike chose the 8,105-character subset.

#### CP1.1.4: The npm name

**Status:** ✅

A spike chose the name `grafical`.

#### CP1.1.5: Same pixels on both systems

**Status:** ✅

The same file gives the same pixels on macOS and Linux.

#### CP1.1.6: Package, tests and CI

**Status:** ✅

The package and its tests run in CI on both systems.

### CP1.2: The loop

**Status:** ✅ (2026-10-11)

The smallest path from operations to a picture: an agent built the public brief with operations alone, with no defect.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

#### CP1.2.1: First operations

**Status:** ✅

Named operations write one diagram file.

**Delivers:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.4: IDs](../features/F3-editing.md#f34-ids)
- [F6.1: The diagram file](../features/F6-output.md#f61-the-diagram-file)
- [F1.1.2: Labels and sublabels](../features/F1-elements.md#f112-labels-and-sublabels)

#### CP1.2.2: First batches

**Status:** ✅

Many operations apply in one call.

**Delivers:**

- [F3.2: Batches](../features/F3-editing.md#f32-batches)

#### CP1.2.3: First render

**Status:** ✅

A diagram file gives a picture.

**Delivers:**

- [F6.2: Render](../features/F6-output.md#f62-render)

#### CP1.2.4: The public brief

**Status:** ✅

An agent built the public brief with operations alone, with no defect.

### CP1.3: The target look

**Status:** ✅ (2026-10-11)

The engine was rebuilt toward a hand-drawn target that judges scored 57 of 60, against 22 for the first engine: rows not drawn, groups as systems, one column grid and measured rules (`bench/results/phase1b.md`, `bench/results/phase1b2.md`, `bench/results/phase1b3.md`).

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

#### CP1.3.1: Rows not drawn

**Status:** ✅

A row places boxes and draws nothing.

**Delivers:**

- [F2.2: Rows and order](../features/F2-layout.md#f22-rows-and-order)

#### CP1.3.2: Groups as systems

**Status:** ✅

A group is drawn as one system.

**Delivers:**

- [F1.3.1: Groups](../features/F1-elements.md#f131-groups)

#### CP1.3.3: One column grid

**Status:** ✅

Every box sits on one column grid.

**Delivers:**

- [F2.1: Placing every box](../features/F2-layout.md#f21-placing-every-box)

#### CP1.3.4: Measured rules

**Status:** ✅

The look is held by measured rules.

**Delivers:**

- [F1.1.6: Emphasis](../features/F1-elements.md#f116-emphasis)
- [F2.6: Spacing](../features/F2-layout.md#f26-spacing)
- [F4.1: Title, subtitle and footnote](../features/F4-look.md#f41-title-subtitle-and-footnote)

#### CP1.3.5: Lines on the new engine

**Status:** ✅

The rebuilt engine routes every line.

**Delivers:**

- [F2.7: How lines are drawn](../features/F2-layout.md#f27-how-lines-are-drawn)

### CP1.4: The owner's additions

**Status:** ✅ (2026-10-11 and 2026-10-12)

Lines that end at containers, swimlanes, themes and stylesheets, and the live viewer.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

#### CP1.4.1: Lines that end at containers

**Status:** ✅

A line ends at a container.

**Delivers:**

- [F1.2.5: Ends at a group, a row or a lane](../features/F1-elements.md#f125-ends-at-a-group-a-row-or-a-lane)

#### CP1.4.2: Swimlanes

**Status:** ✅

Bands say who owns what.

**Delivers:**

- [F1.3.4: Swimlanes](../features/F1-elements.md#f134-swimlanes)

#### CP1.4.3: Themes and stylesheets

**Status:** ✅

One name sets the whole look.

**Delivers:**

- [F4.3: Themes and stylesheets](../features/F4-look.md#f43-themes-and-stylesheets)
- [F4.4: The stylesheet file](../features/F4-look.md#f44-the-stylesheet-file)

#### CP1.4.4: The live viewer

**Status:** ✅

A window redraws on every change.

**Delivers:**

- [F6.3: Live viewer](../features/F6-output.md#f63-live-viewer)

### CP1.5: The vocabulary and stability

**Status:** ✅ (2026-10-12)

The full operation set, `apply`, `show`, `diff` and the help, with the stability rule enforced by tests (`bench/results/phase2.md`).

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)

#### CP1.5.1: The full operation set

**Status:** ✅

Every editing operation of stage 1 exists.

**Delivers:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.6: Merging and swapping](../features/F3-editing.md#f36-merging-and-swapping)

#### CP1.5.2: `apply`

**Status:** ✅

A batch applies from one call.

**Delivers:**

- [F3.2: Batches](../features/F3-editing.md#f32-batches)

#### CP1.5.3: `show`

**Status:** ✅

The diagram prints as facts.

**Delivers:**

- [F5.1: Show](../features/F5-checking.md#f51-show)

#### CP1.5.4: `diff`

**Status:** ✅

A change prints as operations.

**Delivers:**

- [F6.4: Diff](../features/F6-output.md#f64-diff)

#### CP1.5.5: The help

**Status:** ✅

The help teaches the agent grafical.

**Delivers:**

- [F7.1: Help](../features/F7-help.md#f71-help)

#### CP1.5.6: The stability rule

**Status:** ✅

Tests enforce the stability rule.

### CP1.6: The stage 1 round

**Status:** ✅ (2026-10-12)

The first full benchmark round, and its rerun after the line work (`bench/results/stage1.md`). The MVP bar was not met.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

#### CP1.6.1: The first round

**Status:** ✅

The first full benchmark round ran.

#### CP1.6.2: The rerun

**Status:** ✅

The round ran again after the line work.

### CP1.7: Clearer lines and more diagram types

**Status:** ✅ (2026-10-12)

New line kinds, lines that meet a box on any side, hops and dots, the flowchart and state machine kinds, nested groups, and the help in place of `grafical guide`.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

#### CP1.7.1: New line kinds

**Status:** ✅

Lines gained new kinds.

**Delivers:**

- [F1.2.1: Kinds](../features/F1-elements.md#f121-kinds)
- [F1.2.2: Arrowheads at both ends](../features/F1-elements.md#f122-arrowheads-at-both-ends)

#### CP1.7.2: Lines on any side

**Status:** ✅

A line meets a box on any side.

**Delivers:**

- [F2.7: How lines are drawn](../features/F2-layout.md#f27-how-lines-are-drawn)

#### CP1.7.3: Hops and dots

**Status:** ✅

Crossing lines hop and joins take dots.

**Delivers:**

- [F2.7: How lines are drawn](../features/F2-layout.md#f27-how-lines-are-drawn)

#### CP1.7.4: Flowchart and state machine kinds

**Status:** ✅

Boxes gained the kinds of these diagrams.

**Delivers:**

- [F1.1.1: Kinds and shapes](../features/F1-elements.md#f111-kinds-and-shapes)

#### CP1.7.5: Nested groups

**Status:** ✅

A group sits inside a group.

**Delivers:**

- [F1.3.1: Groups](../features/F1-elements.md#f131-groups)

#### CP1.7.6: Help in place of `grafical guide`

**Status:** ✅

The help took over from `grafical guide`.

### CP1.8: Discrete output and freer placement

**Status:** ✅ (2026-10-13 and 2026-10-14)

Records in place of prose, `try`, bundled fan-outs, equal heights in a row, room around stores, columns, steps from another box, walls, notes, marks, edge weights and the richer legend.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

#### CP1.8.1: Records

**Status:** ✅

Records replace prose in every reply.

**Delivers:**

- [F5.2: Counts](../features/F5-checking.md#f52-counts)
- [F5.4: Check](../features/F5-checking.md#f54-check)

#### CP1.8.2: `try`

**Status:** ✅

A change can be tried before it is written.

**Delivers:**

- [F3.3: Trying a change](../features/F3-editing.md#f33-trying-a-change)

#### CP1.8.3: Bundled fan-outs

**Status:** ✅

A fan-out leaves as one bundle.

#### CP1.8.4: Equal heights in a row

**Status:** ✅

Boxes of a row share one height.

**Delivers:**

- [F1.1.3: Sizes](../features/F1-elements.md#f113-sizes)

#### CP1.8.5: Room around stores

**Status:** ✅

Stores keep room around them.

#### CP1.8.6: Columns

**Status:** ✅

Columns are a placement fact.

**Delivers:**

- [F2.4: Columns](../features/F2-layout.md#f24-columns)

#### CP1.8.7: Steps from another box

**Status:** ✅

A box sits some cells from another.

**Delivers:**

- [F2.5: Steps from another box](../features/F2-layout.md#f25-steps-from-another-box)

#### CP1.8.8: Walls

**Status:** ✅

Lines cross a wall only where allowed.

**Delivers:**

- [F1.3.6: Walls](../features/F1-elements.md#f136-walls)

#### CP1.8.9: Notes

**Status:** ✅

A short text sits on a box, a line or a group.

**Delivers:**

- [F1.3.7: Notes](../features/F1-elements.md#f137-notes)

#### CP1.8.10: Marks

**Status:** ✅

A box carries small marks.

**Delivers:**

- [F1.1.4: Marks](../features/F1-elements.md#f114-marks)

#### CP1.8.11: Edge weights

**Status:** ✅

A line can be thicker.

**Delivers:**

- [F1.2.3: Weight](../features/F1-elements.md#f123-weight)

#### CP1.8.12: The richer legend

**Status:** ✅

The legend covers styles, widths and marks.

**Delivers:**

- [F4.2: Legend](../features/F4-look.md#f42-legend)

### CP1.9: Refusals that name the way out

**Status:** ✅ (2026-10-15 to 2026-10-19)

The agent states every order and the engine no longer picks a slot. Each refusal, defect and warning prints as a block that says what happened, what caused it and which commands can change it; every write prints every warning; one entry page of help, and a wrong command names the right one; a row's label is optional and a row with a look is drawn; a group can be copied; a line can carry a step's number; a bar's name keeps clear of the lines.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

#### CP1.9.1: Every order stated

**Status:** ✅

The agent states every order and the engine picks no slot.

**Delivers:**

- [F2.2: Rows and order](../features/F2-layout.md#f22-rows-and-order)

#### CP1.9.2: Blocks that name the way out

**Status:** ✅

Each refusal, defect and warning says what happened, what caused it and which commands can change it.

**Delivers:**

- [F3.5: Refusals](../features/F3-editing.md#f35-refusals)

#### CP1.9.3: Every warning on every write

**Status:** ✅

Every write prints every warning.

**Delivers:**

- [F5.3: Warnings](../features/F5-checking.md#f53-warnings)

#### CP1.9.4: One entry page of help

**Status:** ✅

One page opens the help.

**Delivers:**

- [F7.1: Help](../features/F7-help.md#f71-help)
- [F7.2: Guides](../features/F7-help.md#f72-guides)

#### CP1.9.5: A wrong command names the right one

**Status:** ✅

A wrong command prints the right one.

**Delivers:**

- [F7.1: Help](../features/F7-help.md#f71-help)

#### CP1.9.6: Optional row labels

**Status:** ✅

A row needs no label and a row with a look is drawn.

**Delivers:**

- [F2.2: Rows and order](../features/F2-layout.md#f22-rows-and-order)

#### CP1.9.7: Copying a group

**Status:** ✅

A group can be copied.

**Delivers:**

- [F1.3.2: Copying a group](../features/F1-elements.md#f132-copying-a-group)

#### CP1.9.8: Step numbers

**Status:** ✅

A line can carry a step number.

**Delivers:**

- [F1.2.4: Numbered steps](../features/F1-elements.md#f124-numbered-steps)

#### CP1.9.9: Bar names clear of lines

**Status:** ✅

A bar keeps its name clear of the lines.

**Delivers:**

- [F1.2.5: Ends at a group, a row or a lane](../features/F1-elements.md#f125-ends-at-a-group-a-row-or-a-lane)

## CP2: Richer pictures

**Status:** 🟨

What grafical can draw grows on top of [CP1: Stage 1 built](#cp1-stage-1-built). A test and a fixture accept each item, with no model run.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP2.1: Fix the speed slip](#cp21-fix-the-speed-slip) is met.
  - [CP2.2: Pictures worth keeping](#cp22-pictures-worth-keeping) is met.
  - [CP2.3: Boxes](#cp23-boxes) is met.
  - [CP2.4: Containers](#cp24-containers) is met.
  - [CP2.5: Direction and views](#cp25-direction-and-views) is met.

### CP2.1: Fix the speed slip

**Status:** ✅ (2026-10-15)

Adding a box without a position took up to 189.7 ms at 50 boxes, against 50 ms.

**Exit criteria:**

- **Thresholds**
  - [T2: Speed](GOALS.md#t2-speed)

#### CP2.1.1: No slot search

**Status:** ✅

The agent now states every order, so no slot search runs.

#### CP2.1.2: The worst operation measured

**Status:** ✅

The worst operation takes 18.6 ms.

### CP2.2: Pictures worth keeping

**Status:** 🟨 (since 2026-10-30)

Drawing reference diagrams with grafical's own commands showed where a picture still looks wrong though no check fails. Each round's final pictures go on a review page, and the owner's notes decide what comes next.

**Exit criteria:**

- **Constraints**
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

#### CP2.2.1: Labels on straight lines

**Status:** ✅

A label sits on its own straight vertical line.

**Delivers:**

- [F2.7: How lines are drawn](../features/F2-layout.md#f27-how-lines-are-drawn)

#### CP2.2.2: Choice diamonds

**Status:** ✅

`choice` is a small diamond for a line that splits.

**Delivers:**

- [F1.1.1: Kinds and shapes](../features/F1-elements.md#f111-kinds-and-shapes)

#### CP2.2.3: Footnote numbers

**Status:** ✅

A footnote's number stays wholly inside or outside a container.

**Delivers:**

- [F1.3.7: Notes](../features/F1-elements.md#f137-notes)

#### CP2.2.4: Bar names clear of lines

**Status:** ✅

A bar's name keeps clear of passing lines.

**Delivers:**

- [F1.2.5: Ends at a group, a row or a lane](../features/F1-elements.md#f125-ends-at-a-group-a-row-or-a-lane)

#### CP2.2.5: Labels in a crowded gutter

**Status:** ⬜

An attempt did not land and waits on the owner's choice: [Labels sit close to the lines beside them in a crowded gutter](TODO.md#p2discussion-labels-sit-close-to-the-lines-beside-them-in-a-crowded-gutter).

**Delivers:**

- [F2.7: How lines are drawn](../features/F2-layout.md#f27-how-lines-are-drawn)

#### CP2.2.6: A diamond's slanted lines

**Status:** ⬜

An attempt did not land and waits on the owner's choice: [A diamond's lines leave at its slanted edge a little](TODO.md#p2discussion-a-diamonds-lines-leave-at-its-slanted-edge-a-little).

**Delivers:**

- [F2.7: How lines are drawn](../features/F2-layout.md#f27-how-lines-are-drawn)

### CP2.3: Boxes

**Status:** ⬜

Boxes line up and carry marks that stay clear of lines.

**Exit criteria:** none yet.

#### CP2.3.1: Alignment

**Status:** ⬜

The docs and the code differ, and the owner chooses which holds: [An aligned box joins a column and no row slides](TODO.md#p2discussion-an-aligned-box-joins-a-column-and-no-row-slides).

**Delivers:**

- [F2.3: Alignment](../features/F2-layout.md#f23-alignment)

#### CP2.3.2: Corner marks checked

**Status:** ⬜

A corner mark is checked against nearby lines.

**Delivers:**

- [F1.1.4: Marks](../features/F1-elements.md#f114-marks)

#### CP2.3.3: Marks by name

**Status:** ⬜

A mark can be taken by name.

**Delivers:**

- [F1.1.5: Marks by name](../features/F1-elements.md#f115-marks-by-name)

### CP2.4: Containers

**Status:** ⬜

Containers that cross and nest.

**Exit criteria:** none yet.

#### CP2.4.1: Lanes both ways

**Status:** ⬜

Lanes that run as rows and as columns in one diagram.

**Delivers:**

- [F1.3.5: Lanes both ways](../features/F1-elements.md#f135-lanes-both-ways)

#### CP2.4.2: Deeper nesting

**Status:** ⬜

Groups up to five levels, with the fuzz test holding at five levels.

**Delivers:**

- [F1.3.3: Deeper nesting](../features/F1-elements.md#f133-deeper-nesting)

### CP2.5: Direction and views

**Status:** ⬜

Other ways to read one diagram, which build on the nesting of [CP2.4: Containers](#cp24-containers).

**Exit criteria:** none yet.

#### CP2.5.1: Flow direction

**Status:** ⬜

A diagram that reads left to right.

**Delivers:**

- [F2.8: Flow direction](../features/F2-layout.md#f28-flow-direction)

#### CP2.5.2: Views of one file

**Status:** ⬜

Several pictures of parts of one file.

**Delivers:**

- [F10.1: Views of one file](../features/F10-many-views.md#f101-views-of-one-file)

#### CP2.5.3: Folded groups

**Status:** ⬜

A group drawn folded into one box in a view.

**Delivers:**

- [F10.2: Folded groups](../features/F10-many-views.md#f102-folded-groups)

## CP3: Experiments

**Status:** 🟨

Each kind of diagram runs through a model, and every goal not yet settled is checked here. Round `p1g` on 2026-10-18 met [B1: Iteration](GOALS.md#b1-iteration) (23 of 24 changes made) and missed [T1: Operation errors](GOALS.md#t1-operation-errors) (19% to 26% of calls refused on large diagrams, 55% on the private reference brief); the owner dropped the judged score the same day.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP3.1: Boxes and lines](#cp31-boxes-and-lines) is met.
  - [CP3.2: Containers](#cp32-containers) is met.
  - [CP3.3: Systems](#cp33-systems) is met.
  - [CP3.4: Size](#cp34-size) is met.
  - [CP3.5: Errors and cost](#cp35-errors-and-cost) is met.
  - [CP3.6: The MVP bar](#cp36-the-mvp-bar) is met.

### CP3.1: Boxes and lines

**Status:** ⬜

Diagrams with no container.

**Exit criteria:**

- **Do not hold the release**
  - [B4: Verifiability](GOALS.md#b4-verifiability)

#### CP3.1.1: State machine

**Status:** ⬜

The prompt `order-states` in a round.

#### CP3.1.2: Flowchart

**Status:** ⬜

The prompt `refund-flow` in a round.

#### CP3.1.3: Dependency graph

**Status:** ⬜

The prompt `checkout-dependencies` in a round.

### CP3.2: Containers

**Status:** ⬜

Diagrams that show what belongs together and who owns it.

**Exit criteria:**

- **Do not hold the release**
  - [M3: Better every round](GOALS.md#m3-better-every-round)

#### CP3.2.1: Architecture

**Status:** ⬜

The public brief drawn with groups.

#### CP3.2.2: Swimlane

**Status:** ⬜

The prompt `laptop-swimlane` in a round.

### CP3.3: Systems

**Status:** ⬜

Diagrams that follow a request or a message across systems.

**Exit criteria:**

- **Do not hold the release**
  - [B1: Iteration](GOALS.md#b1-iteration)

#### CP3.3.1: Data flow

**Status:** ⬜

The prompt `steps-data-flow` in a round.

#### CP3.3.2: Event flow

**Status:** ⬜

The prompt `delivery-events` in a round.

#### CP3.3.3: C4

**Status:** ⬜

The prompt `booking-c4` in a round.

#### CP3.3.4: Infrastructure

**Status:** ⬜

The prompts `photo-cloud` and `catalog-deployment` in a round.

### CP3.4: Size

**Status:** ⬜

A picture of about 50 boxes that a reader can follow.

**Exit criteria:**

- **Do not hold the release**
  - [B2: Scale](GOALS.md#b2-scale)

#### CP3.4.1: 10 boxes

**Status:** ⬜

The 10-component brief in a round.

#### CP3.4.2: 25 boxes

**Status:** ⬜

The 25-component brief in a round.

#### CP3.4.3: A true 50-box picture

**Status:** ⬜

Haiku draws the 50-component brief without merging it down.

### CP3.5: Errors and cost

**Status:** 🟨

The refusals of the private reference brief were mostly `title-blocked`. Haiku spends more with grafical than drawing directly: [Haiku pays more with grafical than drawing directly](TODO.md#p1task-haiku-pays-more-with-grafical-than-drawing-directly).

**Exit criteria:**

- **Comparisons**
  - [C2: Time](GOALS.md#c2-time)
  - [C5: Cost](GOALS.md#c5-cost)
- **Do not hold the release**
  - [C3: Token use](GOALS.md#c3-token-use)
  - [T1: Operation errors](GOALS.md#t1-operation-errors)

#### CP3.5.1: Fewer blocked labels

**Status:** ✅

Labels sit on straight vertical lines, and over 2,000 fuzz seeds `label-blocked` fell from 62 to 0 and `title-blocked` from 4 to 1.

**Delivers:**

- [F3.5: Refusals](../features/F3-editing.md#f35-refusals)

#### CP3.5.2: Measure the rate in a round

**Status:** ⬜

Only a round shows whether Haiku's refused calls fall below 5%.

**Delivers:**

- [F3.5: Refusals](../features/F3-editing.md#f35-refusals)

#### CP3.5.3: Find where Haiku's tokens go

**Status:** ⬜

Split a first draft's fresh tokens by what spent them.

**Delivers:**

- [F7.1: Help](../features/F7-help.md#f71-help)

#### CP3.5.4: Cut the cost of a first draft

**Status:** ⬜

Spend less on what that split shows.

**Delivers:**

- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [F7.1: Help](../features/F7-help.md#f71-help)

### CP3.6: The MVP bar

**Status:** 🟨

A round with the owner's approval of its cost first. The owner's budget for stage 1 is $20, mostly on Haiku. Opus runs only for the baselines and the gap between models, and both get the same prompt, word for word. The private reference brief's runs stay on the owner's machine, and only numbers are committed.

**Exit criteria:**

- **Objectives**
  - [O1: The MVP bar](GOALS.md#o1-the-mvp-bar)
  - [O4: Copy a picture, better](GOALS.md#o4-copy-a-picture-better)
- **Comparisons**
  - [C1: Model gap](GOALS.md#c1-model-gap)
- **Do not hold the release**
  - [C4: Context added](GOALS.md#c4-context-added)
  - [C7: Beats the strongest model alone](GOALS.md#c7-beats-the-strongest-model-alone)

#### CP3.6.1: Measure the context added

**Status:** ⬜

A scan of the transcripts for the context each diagram adds.

#### CP3.6.2: Run Opus at xhigh effort

**Status:** ✅ (reported on 2026-11-05)

A run of Opus at xhigh effort drawing directly, rated blind by the owner.

#### CP3.6.3: Private reference brief

**Status:** ⬜

The round on the private reference brief.

#### CP3.6.4: Copy reference pictures

**Status:** ⬜

Haiku redraws each reference picture: [Choose the reference pictures](TODO.md#p2task-choose-the-reference-pictures).

**Delivers:**

- [F9.4: Someone else's picture](../features/F9-import.md#f94-someone-elses-picture)

## CP4: Release 0.1.0

**Status:** ⬜

Publish `grafical` on npm once [O1: The MVP bar](GOALS.md#o1-the-mvp-bar) is met. A recorded decision may recalibrate any target except the MVP bar.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP4.1: The npm package](#cp41-the-npm-package) is met.
- **Do not hold the release**
  - [M1: Enough to say](GOALS.md#m1-enough-to-say)
  - [M2: Cache hit rate](GOALS.md#m2-cache-hit-rate)

### CP4.1: The npm package

**Status:** ⬜

grafical installed from npm.

**Exit criteria:** none yet.

#### CP4.1.1: A package that can be published

**Status:** ⬜

`package.json` is still private at version 0.0.0, and the fonts need work first: [Fix the font name tables before the first release](TODO.md#p2task-fix-the-font-name-tables-before-the-first-release).

#### CP4.1.2: Publish 0.1.0

**Status:** ⬜

The first version on npm.

**Delivers:**

- [F11.1: The npm package](../features/F11-getting-grafical.md#f111-the-npm-package)

#### CP4.1.3: Install from npm

**Status:** ⬜

The install steps use npm in place of a clone.

## CP5: Later

**Status:** ⬜

Features with no plan yet wait here, and one moves into a planned checkpoint when a real need brings it forward.

**Exit criteria:** none, since nothing here is planned.

### CP5.1: Diagram types

**Status:** ⬜

Diagrams with a layout of their own.

**Exit criteria:** none yet.

#### CP5.1.1: Sequence diagrams

**Status:** ⬜

Messages in time order.

**Delivers:**

- [F8.1: Sequence diagrams](../features/F8-diagram-types.md#f81-sequence-diagrams)

#### CP5.1.2: Gantt charts

**Status:** ⬜

Tasks over time.

**Delivers:**

- [F8.2: Gantt charts](../features/F8-diagram-types.md#f82-gantt-charts)

#### CP5.1.3: Mind maps

**Status:** ⬜

Ideas around one topic.

**Delivers:**

- [F8.3: Mind maps](../features/F8-diagram-types.md#f83-mind-maps)

#### CP5.1.4: Pyramids

**Status:** ⬜

Layers of a whole.

**Delivers:**

- [F8.4: Pyramids](../features/F8-diagram-types.md#f84-pyramids)

#### CP5.1.5: Overlapping sets

**Status:** ⬜

What two sets share.

**Delivers:**

- [F8.5: Overlapping sets](../features/F8-diagram-types.md#f85-overlapping-sets)

#### CP5.1.6: Entity-relationship and class diagrams

**Status:** ⬜

Tables and classes.

**Delivers:**

- [F8.6: Entity-relationship and class diagrams](../features/F8-diagram-types.md#f86-entity-relationship-and-class-diagrams)

### CP5.2: Import

**Status:** ⬜

A diagram started from an existing file.

**Exit criteria:** none yet.

#### CP5.2.1: Mermaid files

**Status:** ⬜

Start from a Mermaid file.

**Delivers:**

- [F9.1: Mermaid files](../features/F9-import.md#f91-mermaid-files)

#### CP5.2.2: draw.io files

**Status:** ⬜

Start from a draw.io file.

**Delivers:**

- [F9.2: draw.io files](../features/F9-import.md#f92-drawio-files)

#### CP5.2.3: Excalidraw files

**Status:** ⬜

Start from an Excalidraw file.

**Delivers:**

- [F9.3: Excalidraw files](../features/F9-import.md#f93-excalidraw-files)

### CP5.3: For teams

**Status:** ⬜

What a team needs past one diagram in one repository.

**Exit criteria:** none yet.

#### CP5.3.1: One catalog of systems

**Status:** ⬜

One list many diagrams share.

**Delivers:**

- [F10.3: One catalog of systems](../features/F10-many-views.md#f103-one-catalog-of-systems)

#### CP5.3.2: Brand fonts

**Status:** ⬜

A team's own typeface.

**Delivers:**

- [F4.5: Brand fonts](../features/F4-look.md#f45-brand-fonts)

#### CP5.3.3: An MCP server

**Status:** ⬜

Operations without a shell.

**Delivers:**

- [F11.2: An MCP server](../features/F11-getting-grafical.md#f112-an-mcp-server)

### CP5.4: More combinations of operations

**Status:** ⬜

The form is not decided with the owner yet, such as one operation for a common edit or for a common shape. The first candidates were chosen on 2026-10-15 after a field study of other diagram tools; copying a group and numbered steps were built on 2026-10-16.

**Exit criteria:** none yet.

#### CP5.4.1: Decide the form

**Status:** ⬜

The owner chooses what one operation may combine.

#### CP5.4.2: Test the candidates

**Status:** ⬜

A candidate stays only if a round shows it helps.

**Delivers:**

- [F3.7: More combinations of operations](../features/F3-editing.md#f37-more-combinations-of-operations)
