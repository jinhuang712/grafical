# Roadmap

**Current checkpoint:** [CP2: Richer pictures](#cp2-richer-pictures). First grafical draws, then it gains styles and features, then every kind of diagram runs as an experiment, and then it is released.

## Summary

```
Roadmap
├── ✅ CP1: Stage 1 built — everything an agent needs to draw with grafical alone
│   ├── ✅ CP1.1: The risky questions — the spikes and the package
│   │   ├── ✅ Our own gap router
│   │   ├── ✅ Text shaping
│   │   ├── ✅ Chinese font subset
│   │   ├── ✅ The npm name
│   │   ├── ✅ Same pixels on both systems
│   │   └── ✅ Package, tests and CI
│   ├── ✅ CP1.2: The loop — operations to a picture
│   │   ├── ✅ First operations
│   │   ├── ✅ First batches
│   │   ├── ✅ First render
│   │   └── ✅ The public brief
│   ├── ✅ CP1.3: The target look — the engine rebuilt toward a target
│   │   ├── ✅ Rows not drawn
│   │   ├── ✅ Groups as systems
│   │   ├── ✅ One column grid
│   │   ├── ✅ Measured rules
│   │   └── ✅ Lines on the new engine
│   ├── ✅ CP1.4: The owner's additions — containers, lanes, themes and the viewer
│   │   ├── ✅ Lines that end at containers
│   │   ├── ✅ Swimlanes
│   │   ├── ✅ Themes and stylesheets
│   │   └── ✅ The live viewer
│   ├── ✅ CP1.5: The vocabulary and stability — the full operation set
│   │   ├── ✅ The full operation set
│   │   ├── ✅ `apply`
│   │   ├── ✅ `show`
│   │   ├── ✅ `diff`
│   │   ├── ✅ The help
│   │   └── ✅ The stability rule
│   ├── ✅ CP1.6: The stage 1 round — the first full benchmark round
│   │   ├── ✅ The first round
│   │   └── ✅ The rerun
│   ├── ✅ CP1.7: Clearer lines and more diagram types — line kinds and diagram types
│   │   ├── ✅ New line kinds
│   │   ├── ✅ Lines on any side
│   │   ├── ✅ Hops and dots
│   │   ├── ✅ Flowchart and state machine kinds
│   │   ├── ✅ Nested groups
│   │   └── ✅ Help in place of `grafical guide`
│   ├── ✅ CP1.8: Discrete output and freer placement — records, columns, steps, walls and notes
│   │   ├── ✅ Records
│   │   ├── ✅ `try`
│   │   ├── ✅ Bundled fan-outs
│   │   ├── ✅ Equal heights in a row
│   │   ├── ✅ Room around stores
│   │   ├── ✅ Columns
│   │   ├── ✅ Steps from another box
│   │   ├── ✅ Walls
│   │   ├── ✅ Notes
│   │   ├── ✅ Marks
│   │   ├── ✅ Edge weights
│   │   └── ✅ The richer legend
│   └── ✅ CP1.9: Refusals that name the way out — refusals with the commands that change them
│       ├── ✅ Every order stated
│       ├── ✅ Blocks that name the way out
│       ├── ✅ Every warning on every write
│       ├── ✅ One entry page of help
│       ├── ✅ A wrong command names the right one
│       ├── ✅ Optional row labels
│       ├── ✅ Copying a group
│       ├── ✅ Step numbers
│       └── ✅ Bar names clear of lines
├── 🟨 CP2: Richer pictures — the styles and features that sit on top of drawing
│   ├── ✅ CP2.1: Fix the speed slip
│   │   ├── ✅ No slot search
│   │   └── ✅ The worst operation measured
│   ├── 🟨 CP2.2: The command line
│   │   ├── ✅ The file flag
│   │   ├── ⬜ One name for each thing
│   │   ├── ✅ Verbs as flags
│   │   ├── ⬜ One way for each situation
│   │   └── ✅ Batches from standard input
│   ├── 🟨 CP2.3: The object model
│   │   ├── ✅ Design the model and its form
│   │   ├── 🟨 Build the model
│   │   ├── ⬜ Move the saved files
│   │   └── ⬜ Tune the form
│   ├── ⬜ CP2.4: Edges and labels
│   │   ├── ⬜ Edge sides
│   │   ├── ✅ Edge shapes
│   │   ├── ⬜ Labels on edges
│   │   ├── ⬜ Label text
│   │   ├── ⬜ Region gaps
│   │   ├── ✅ Edge looks
│   │   └── ⬜ Region labels
│   ├── 🟨 CP2.5: Pictures worth keeping
│   │   ├── ✅ Labels on straight lines
│   │   ├── ✅ Choice diamonds
│   │   ├── ✅ Footnote numbers
│   │   ├── ⬜ Labels in a crowded gutter
│   │   ├── ⬜ A diamond's slanted lines
│   │   ├── ⬜ Badges off a lane's side
│   │   └── ⬜ Return lines off a self-loop
│   ├── ⬜ CP2.6: Nodes
│   │   ├── ⬜ Corner marks checked
│   │   ├── ⬜ Marks by name
│   │   ├── ✅ Node looks
│   │   └── ⬜ Size multiples
│   ├── ⬜ CP2.7: Containers
│   │   ├── ⬜ Column headings
│   │   ├── ⬜ Lanes both ways
│   │   ├── ⬜ Deeper nesting
│   │   ├── ⬜ Bars across groups
│   │   └── ✅ Container looks
│   ├── ⬜ CP2.8: The legend
│   │   ├── ⬜ Design the legend
│   │   └── ⬜ Build the legend
│   └── ⬜ CP2.9: Direction and views
│       ├── ⬜ Flow direction
│       ├── ⬜ Views of one file
│       └── ⬜ Folded groups
├── 🟨 CP3: Experiments — every kind of diagram measured with a model
│   ├── ⬜ CP3.1: Nodes and edges
│   │   ├── ⬜ State machine
│   │   ├── ⬜ Flowchart
│   │   └── ⬜ Dependency graph
│   ├── ⬜ CP3.2: Containers
│   │   ├── ⬜ Architecture
│   │   └── ⬜ Swimlane
│   ├── ⬜ CP3.3: Systems
│   │   ├── ⬜ Data flow
│   │   ├── ⬜ Event flow
│   │   ├── ⬜ C4
│   │   └── ⬜ Infrastructure
│   ├── ⬜ CP3.4: Size
│   │   ├── ⬜ 10 boxes
│   │   ├── ⬜ 25 boxes
│   │   └── ⬜ A true 50-box picture
│   ├── 🟨 CP3.5: Errors and cost
│   │   ├── ✅ Fewer blocked labels
│   │   ├── ⬜ Measure the rate in a round
│   │   ├── ⬜ Find where Haiku's tokens go
│   │   └── ⬜ Cut the cost of a first draft
│   └── 🟨 CP3.6: The MVP bar
│       ├── ⬜ Measure the context added
│       ├── ✅ Run Opus at xhigh effort
│       ├── ⬜ Private reference brief
│       ├── ⬜ Choose the reference pictures
│       ├── ⬜ Hand an agent a picture
│       └── ⬜ Copy reference pictures
├── ⬜ CP4: Release 0.1.0 — grafical on npm
│   └── ⬜ CP4.1: The npm package
│       ├── ⬜ A package that can be published
│       ├── ⬜ Fix the font name tables
│       ├── ⬜ Credit Twemoji
│       ├── ⬜ Publish 0.1.0
│       └── ⬜ Install from npm
└── ⬜ CP5: Later — features with no plan yet
    ├── ⬜ CP5.1: Diagram types
    │   ├── ⬜ Sequence diagrams
    │   ├── ⬜ Gantt charts
    │   ├── ⬜ Mind maps
    │   ├── ⬜ Pyramids
    │   ├── ⬜ Overlapping sets
    │   └── ⬜ Entity-relationship and class diagrams
    ├── ⬜ CP5.2: Import
    │   ├── ⬜ Mermaid files
    │   ├── ⬜ draw.io files
    │   └── ⬜ Excalidraw files
    ├── ⬜ CP5.3: For teams
    │   ├── ⬜ One catalog of systems
    │   ├── ⬜ Brand fonts
    │   └── ⬜ An MCP server
    ├── ⬜ CP5.4: More combinations of operations
    │   ├── ⬜ Decide the form
    │   └── ⬜ Test the candidates
    └── ⬜ CP5.5: Checks of an agent's own
        └── ⬜ Rules a diagram sets itself
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

**Tasks:**

- ✅ Our own gap router: A spike chose our own gap router.
- ✅ Text shaping: A spike chose `harfbuzzjs`.
- ✅ Chinese font subset: A spike chose the 8,105-character subset.
- ✅ The npm name: A spike chose the name `grafical`.
- ✅ Same pixels on both systems: The same file gives the same pixels on macOS and Linux.
- ✅ Package, tests and CI: The package and its tests run in CI on both systems.

**Exit criteria:**

- **Constraints**
  - [R3: Determinism](GOALS.md#r3-determinism)

### CP1.2: The loop

**Status:** ✅ (2026-10-11)

The smallest path from operations to a picture: an agent built the public brief with operations alone, with no defect.

**Tasks:**

- ✅ First operations: Named operations write one diagram file.
- ✅ First batches: Many operations apply in one call.
- ✅ First render: A diagram file gives a picture.
- ✅ The public brief: An agent built the public brief with operations alone, with no defect.

**Delivers:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.4: IDs](../features/F3-editing.md#f34-ids)
- [F6.1: The diagram file](../features/F6-output.md#f61-the-diagram-file)
- [F1.1.2: Labels and sublabels](../features/F1-elements.md#f112-labels-and-sublabels)
- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [F6.2: Render](../features/F6-output.md#f62-render)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.3: The target look

**Status:** ✅ (2026-10-11)

The engine was rebuilt toward a hand-drawn target that judges scored 57 of 60, against 22 for the first engine: rows not drawn, groups as systems, one column grid and measured rules (`bench/results/phase1b.md`, `bench/results/phase1b2.md`, `bench/results/phase1b3.md`).

**Tasks:**

- ✅ Rows not drawn: A row places boxes and draws nothing.
- ✅ Groups as systems: A group is drawn as one system.
- ✅ One column grid: Every box sits on one column grid.
- ✅ Measured rules: The look is held by measured rules.
- ✅ Lines on the new engine: The rebuilt engine routes every line.

**Delivers:**

- [F2.2: Layers and order](../features/F2-layout.md#f22-layers-and-order)
- [F1.3.1: Groups](../features/F1-elements.md#f131-groups)
- [F2.1: Placing every node](../features/F2-layout.md#f21-placing-every-node)
- [F1.1.6: Emphasis](../features/F1-elements.md#f116-emphasis)
- [F2.6: Spacing](../features/F2-layout.md#f26-spacing)
- [F4.1: Title, subtitle and footnote](../features/F4-look.md#f41-title-subtitle-and-footnote)
- [F2.7: How edges are drawn](../features/F2-layout.md#f27-how-edges-are-drawn)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.4: The owner's additions

**Status:** ✅ (2026-10-11 and 2026-10-12)

Lines that end at containers, swimlanes, themes and stylesheets, and the live viewer.

**Tasks:**

- ✅ Lines that end at containers: A line ends at a container.
- ✅ Swimlanes: Bands say who owns what.
- ✅ Themes and stylesheets: One name sets the whole look.
- ✅ The live viewer: A window redraws on every change.

**Delivers:**

- [F1.2.5: Ends at a group, a layer or a lane](../features/F1-elements.md#f125-ends-at-a-group-a-layer-or-a-lane)
- [F1.3.4: Lanes](../features/F1-elements.md#f134-lanes)
- [F4.3: Themes and stylesheets](../features/F4-look.md#f43-themes-and-stylesheets)
- [F4.4: The stylesheet file](../features/F4-look.md#f44-the-stylesheet-file)
- [F6.3: Live viewer](../features/F6-output.md#f63-live-viewer)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.5: The vocabulary and stability

**Status:** ✅ (2026-10-12)

The full operation set, `apply`, `show`, `diff` and the help, with the stability rule enforced by tests (`bench/results/phase2.md`).

**Tasks:**

- ✅ The full operation set: Every editing operation of stage 1 exists.
- ✅ `apply`: A batch applies from one call.
- ✅ `show`: The diagram prints as facts.
- ✅ `diff`: A change prints as operations.
- ✅ The help: The help teaches the agent grafical.
- ✅ The stability rule: Tests enforce the stability rule.

**Delivers:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.6: Merging and swapping](../features/F3-editing.md#f36-merging-and-swapping)
- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [F5.1: Show](../features/F5-checking.md#f51-show)
- [F6.4: Diff](../features/F6-output.md#f64-diff)
- [F7.1: Help](../features/F7-help.md#f71-help)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)

### CP1.6: The stage 1 round

**Status:** ✅ (2026-10-12)

The first full benchmark round, and its rerun after the line work (`bench/results/stage1.md`). The MVP bar was not met.

**Tasks:**

- ✅ The first round: The first full benchmark round ran.
- ✅ The rerun: The round ran again after the line work.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.7: Clearer lines and more diagram types

**Status:** ✅ (2026-10-12)

New line kinds, lines that meet a box on any side, hops and dots, the flowchart and state machine kinds, nested groups, and the help in place of `grafical guide`.

**Tasks:**

- ✅ New line kinds: Lines gained new kinds.
- ✅ Lines on any side: A line meets a box on any side.
- ✅ Hops and dots: Crossing lines hop and joins take dots.
- ✅ Flowchart and state machine kinds: Boxes gained the kinds of these diagrams.
- ✅ Nested groups: A group sits inside a group.
- ✅ Help in place of `grafical guide`: The help took over from `grafical guide`.

**Delivers:**

- [F1.2.1: Types](../features/F1-elements.md#f121-types)
- [F1.2.2: Arrowheads at both ends](../features/F1-elements.md#f122-arrowheads-at-both-ends)
- [F2.7: How edges are drawn](../features/F2-layout.md#f27-how-edges-are-drawn)
- [F1.1.1: Types and shapes](../features/F1-elements.md#f111-types-and-shapes)
- [F1.3.1: Groups](../features/F1-elements.md#f131-groups)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.8: Discrete output and freer placement

**Status:** ✅ (2026-10-13 and 2026-10-14)

Records in place of prose, `try`, bundled fan-outs, equal heights in a row, room around stores, columns, steps from another box, walls, notes, marks, edge weights and the richer legend.

**Tasks:**

- ✅ Records: Records replace prose in every reply.
- ✅ `try`: A change can be tried before it is written.
- ✅ Bundled fan-outs: A fan-out leaves as one bundle.
- ✅ Equal heights in a row: Boxes of a row share one height.
- ✅ Room around stores: Stores keep room around them.
- ✅ Columns: Columns are a placement fact.
- ✅ Steps from another box: A box sits some cells from another.
- ✅ Walls: Lines cross a wall only where allowed.
- ✅ Notes: A short text sits on a box, a line or a group.
- ✅ Marks: A box carries small marks.
- ✅ Edge weights: A line can be thicker.
- ✅ The richer legend: The legend covers styles, widths and marks.

**Delivers:**

- [F5.2: Counts](../features/F5-checking.md#f52-counts)
- [F5.4: Check](../features/F5-checking.md#f54-check)
- [F3.3: Trying a change](../features/F3-editing.md#f33-trying-a-change)
- [F1.1.3: Sizes](../features/F1-elements.md#f113-sizes)
- [F2.4: Columns](../features/F2-layout.md#f24-columns)
- [F2.5: Steps from another node](../features/F2-layout.md#f25-steps-from-another-node)
- [F1.3.6: Walls](../features/F1-elements.md#f136-walls)
- [F1.3.7: Notes](../features/F1-elements.md#f137-notes)
- [F1.1.4: Marks](../features/F1-elements.md#f114-marks)
- [F1.2.3: Weight](../features/F1-elements.md#f123-weight)
- [F4.2: Legend](../features/F4-look.md#f42-legend)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.9: Refusals that name the way out

**Status:** ✅ (2026-10-15 to 2026-10-19)

The agent states every order and the engine no longer picks a slot. Each refusal, defect and warning prints as a block that says what happened, what caused it and which commands can change it; every write prints every warning; one entry page of help, and a wrong command names the right one; a row's label is optional and a row with a look is drawn; a group can be copied; a line can carry a step's number; a bar's name keeps clear of the lines.

**Tasks:**

- ✅ Every order stated: The agent states every order and the engine picks no slot.
- ✅ Blocks that name the way out: Each problem's block says what happened and what caused it and which commands can change it.
- ✅ Every warning on every write: Every write prints every warning.
- ✅ One entry page of help: One page opens the help.
- ✅ A wrong command names the right one: A wrong command prints the right one.
- ✅ Optional row labels: A row needs no label and a row with a look is drawn.
- ✅ Copying a group: A group can be copied.
- ✅ Step numbers: A line can carry a step number.
- ✅ Bar names clear of lines: A bar keeps its name clear of the lines.

**Delivers:**

- [F2.2: Layers and order](../features/F2-layout.md#f22-layers-and-order)
- [F3.5: Refusals](../features/F3-editing.md#f35-refusals)
- [F5.3: Warnings](../features/F5-checking.md#f53-warnings)
- [F7.1: Help](../features/F7-help.md#f71-help)
- [F7.2: Guides](../features/F7-help.md#f72-guides)
- [F1.3.2: Copying a group](../features/F1-elements.md#f132-copying-a-group)
- [F1.2.4: Numbered steps](../features/F1-elements.md#f124-numbered-steps)
- [F1.2.5: Ends at a group, a layer or a lane](../features/F1-elements.md#f125-ends-at-a-group-a-layer-or-a-lane)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

## CP2: Richer pictures

**Status:** 🟨

What grafical can draw grows on top of [CP1: Stage 1 built](#cp1-stage-1-built). A test and a fixture accept each item, with no model run.

The numbers are the order of the work, since each step rests on the one before.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP2.1: Fix the speed slip](#cp21-fix-the-speed-slip) is met.
  - [CP2.2: The command line](#cp22-the-command-line) is met.
  - [CP2.3: The object model](#cp23-the-object-model) is met.
  - [CP2.4: Edges and labels](#cp24-edges-and-labels) is met.
  - [CP2.5: Pictures worth keeping](#cp25-pictures-worth-keeping) is met.
  - [CP2.6: Nodes](#cp26-nodes) is met.
  - [CP2.7: Containers](#cp27-containers) is met.
  - [CP2.8: The legend](#cp28-the-legend) is met.
  - [CP2.9: Direction and views](#cp29-direction-and-views) is met.

### CP2.1: Fix the speed slip

**Status:** ✅ (2026-10-15)

Adding a box without a position took up to 189.7 ms at 50 boxes, against 50 ms.

**Tasks:**

- ✅ No slot search: The agent now states every order, so no slot search runs.
- ✅ The worst operation measured: The worst operation took 18.6 ms on 2026-10-15.

**Exit criteria:**

- **Thresholds**
  - [T2: Speed](GOALS.md#t2-speed)

### CP2.2: The command line

**Status:** 🟨 (since 2026-11-06)

The command line gets one form:

- Every command names its file the same way.
- A verb is a flag.
- Each thing has one name.
- Each situation has one shortest way.

**Tasks:**

- ✅ The file flag: Every command takes its file from `-f`, on its own and ahead of the next round.
- ⬜ One name for each thing: Every surface and the code use one name.
- ✅ Verbs as flags: A command is a noun and flags, and the planned commands in the features follow.
- ⬜ One way for each situation: `edge --emphasize` goes, and the commands are checked for other repeats.
- ✅ Batches from standard input: `apply` reads a batch named `-` from standard input.

**Delivers:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [F1.2.3: Weight](../features/F1-elements.md#f123-weight)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)

### CP2.3: The object model

**Status:** 🟨 (since 2026-11-06)

A diagram is objects with types and styles, in a form of its own, before the first release freezes the file.

**Tasks:**

- ✅ Design the model and its form: The owner designed them on 2026-11-06.
- 🟨 Build the model: grafical reads and writes the form, styles and types; `like` is not built.
- ⬜ Move the saved files: Fixtures and saved drafts move to it.
- ⬜ Tune the form: Once it is built, the form is tuned against what its diffs show.

**Delivers:**

- [F6.1.1: The object model](../features/F6-output.md#f611-the-object-model)
- [F5.1: Show](../features/F5-checking.md#f51-show)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R3: Determinism](GOALS.md#r3-determinism)
  - [R4: A sound file](GOALS.md#r4-a-sound-file)
- **Do not hold the release**
  - [M4: Diff size](GOALS.md#m4-diff-size)

### CP2.4: Edges and labels

**Status:** ⬜

A strong model steers a line and draws it as a curve, and a line carries its label.

**Tasks:**

- ⬜ Edge sides: An agent states the side a line leaves or enters by.
- ✅ Edge shapes: A command draws lines square or round.
- ⬜ Labels on edges: A line carries its label by default, measured over the saved drafts before it lands.
- ⬜ Label text: An agent sets a label's breaks and its alignment.
- ⬜ Region gaps: The gap between two regions takes a multiple.
- ✅ Edge looks: An edge takes a color of its own or a named look.
- ⬜ Region labels: A region's label sits at a fraction of a side, inside or outside.

**Delivers:**

- [F2.7.1: Edge sides](../features/F2-layout.md#f271-edge-sides)
- [F2.7.2: Edge shapes](../features/F2-layout.md#f272-edge-shapes)
- [F2.7.3: Labels on edges](../features/F2-layout.md#f273-labels-on-edges)
- [F4.6: Label text](../features/F4-look.md#f46-label-text)
- [F2.6.1: Region gaps](../features/F2-layout.md#f261-region-gaps)
- [F1.2.6: Edge looks](../features/F1-elements.md#f126-edge-looks)
- [F4.7: Region labels](../features/F4-look.md#f47-region-labels)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.5: Pictures worth keeping

**Status:** 🟨 (since 2026-10-30)

Drawing reference diagrams with grafical's own commands showed where a picture still looks wrong though no check fails. Each round's final pictures go on a review page, and the owner's notes decide what comes next.

**Tasks:**

- ✅ Labels on straight lines: A label sits on its own straight vertical line.
- ✅ Choice diamonds: `choice` is a small diamond for a line that splits.
- ✅ Footnote numbers: A footnote's number stays wholly inside or outside a container.
- ⬜ Labels in a crowded gutter: An attempt did not land and waits on the owner's choice: [Labels sit close to the lines beside them in a crowded gutter](TODO.md#p2discussion-labels-sit-close-to-the-lines-beside-them-in-a-crowded-gutter).
- ⬜ A diamond's slanted lines: A line meets a diamond only at a corner, measured with `pnpm bench diff` before it lands.
- ⬜ Badges off a lane's side: A step's badge keeps off a lane's side, and `step-collision` counts one that touches it.
- ⬜ Return lines off a self-loop: The lines that leave and enter a node keep clear of its self-loop.

**Delivers:**

- [F2.7: How edges are drawn](../features/F2-layout.md#f27-how-edges-are-drawn)
- [F1.1.1: Types and shapes](../features/F1-elements.md#f111-types-and-shapes)
- [F1.3.7: Notes](../features/F1-elements.md#f137-notes)

**Exit criteria:**

- **Constraints**
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.6: Nodes

**Status:** ⬜

Nodes carry marks that stay clear of edges and colors of their own.

**Tasks:**

- ⬜ Corner marks checked: A corner mark is checked against nearby lines.
- ⬜ Marks by name: A mark can be taken by name.
- ✅ Node looks: A box takes colors of its own or a named look.
- ⬜ Size multiples: A node takes multiples of its width and height.

**Delivers:**

- [F1.1.4: Marks](../features/F1-elements.md#f114-marks)
- [F1.1.5: Marks by name](../features/F1-elements.md#f115-marks-by-name)
- [F1.1.7: Node looks](../features/F1-elements.md#f117-node-looks)
- [F1.1.3: Sizes](../features/F1-elements.md#f113-sizes)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.7: Containers

**Status:** ⬜

Containers that cross and nest and take colors of their own, and columns that carry headings.

**Tasks:**

- ⬜ Column headings: A column carries a heading above its first row.
- ⬜ Lanes both ways: Lanes that run as rows and as columns in one diagram.
- ⬜ Deeper nesting: Groups up to five levels, with the fuzz test holding at five levels.
- ⬜ Bars across groups: A bar crosses a group's box and overlaps no box or label.
- ✅ Container looks: A group or a lane takes colors of its own or a named look.

**Delivers:**

- [F2.4.1: Column headings](../features/F2-layout.md#f241-column-headings)
- [F1.3.5: Lanes both ways](../features/F1-elements.md#f135-lanes-both-ways)
- [F1.3.3: Deeper nesting](../features/F1-elements.md#f133-deeper-nesting)
- [F1.3.8: Container looks](../features/F1-elements.md#f138-container-looks)
- [F1.2.5: Ends at a group, a layer or a lane](../features/F1-elements.md#f125-ends-at-a-group-a-layer-or-a-lane)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.8: The legend

**Status:** ⬜

A legend is a small diagram, and it can explain what a picture's colors mean.

**Tasks:**

- ⬜ Design the legend: The owner designs it: [The legend needs a design of its own](TODO.md#p1discussion-the-legend-needs-a-design-of-its-own).
- ⬜ Build the legend: The design is built.

**Delivers:**

- [F4.2.1: A legend as a small diagram](../features/F4-look.md#f421-a-legend-as-a-small-diagram)

**Exit criteria:**

- **Constraints**
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.9: Direction and views

**Status:** ⬜

Other ways to read one diagram, which build on the nesting of [CP2.7: Containers](#cp27-containers).

**Tasks:**

- ⬜ Flow direction: A diagram that reads left to right.
- ⬜ Views of one file: Several pictures of parts of one file.
- ⬜ Folded groups: A group drawn folded into one box in a view.

**Delivers:**

- [F2.8: Flow direction](../features/F2-layout.md#f28-flow-direction)
- [F10.1: Views of one file](../features/F10-many-views.md#f101-views-of-one-file)
- [F10.2: Folded groups](../features/F10-many-views.md#f102-folded-groups)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)
  - [R3: Determinism](GOALS.md#r3-determinism)

## CP3: Experiments

**Status:** 🟨

Each kind of diagram runs through a model, and every goal not yet settled is checked here. Round `p1g` on 2026-10-18 met [B1: Iteration](GOALS.md#b1-iteration) (23 of 24 changes made) and missed [T1: Operation errors](GOALS.md#t1-operation-errors) (19% to 26% of calls refused on large diagrams, 55% on the private reference brief); the owner dropped the judged score the same day.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP3.1: Nodes and edges](#cp31-nodes-and-edges) is met.
  - [CP3.2: Containers](#cp32-containers) is met.
  - [CP3.3: Systems](#cp33-systems) is met.
  - [CP3.4: Size](#cp34-size) is met.
  - [CP3.5: Errors and cost](#cp35-errors-and-cost) is met.
  - [CP3.6: The MVP bar](#cp36-the-mvp-bar) is met.

### CP3.1: Nodes and edges

**Status:** ⬜

Diagrams with no container.

**Tasks:**

- ⬜ State machine: The prompt `order-states` in a round.
- ⬜ Flowchart: The prompt `refund-flow` in a round.
- ⬜ Dependency graph: The prompt `checkout-dependencies` in a round.

**Exit criteria:**

- **Do not hold the release**
  - [B4: Verifiability](GOALS.md#b4-verifiability)

### CP3.2: Containers

**Status:** ⬜

Diagrams that show what belongs together and who owns it.

**Tasks:**

- ⬜ Architecture: The public brief drawn with groups.
- ⬜ Swimlane: The prompt `laptop-swimlane` in a round.

**Exit criteria:**

- **Do not hold the release**
  - [M3: Better every round](GOALS.md#m3-better-every-round)

### CP3.3: Systems

**Status:** ⬜

Diagrams that follow a request or a message across systems.

**Tasks:**

- ⬜ Data flow: The prompt `steps-data-flow` in a round.
- ⬜ Event flow: The prompt `delivery-events` in a round.
- ⬜ C4: The prompt `booking-c4` in a round.
- ⬜ Infrastructure: The prompts `photo-cloud` and `catalog-deployment` in a round.

**Exit criteria:**

- **Do not hold the release**
  - [B1: Iteration](GOALS.md#b1-iteration)

### CP3.4: Size

**Status:** ⬜

A picture of about 50 boxes that a reader can follow.

**Tasks:**

- ⬜ 10 boxes: The 10-component brief in a round.
- ⬜ 25 boxes: The 25-component brief in a round.
- ⬜ A true 50-box picture: Haiku draws the 50-component brief without merging it down.

**Exit criteria:**

- **Do not hold the release**
  - [B2: Scale](GOALS.md#b2-scale)

### CP3.5: Errors and cost

**Status:** 🟨

The refusals of the private reference brief were mostly `title-blocked`. Haiku spends more with grafical than drawing directly: on 2026-10-18 its first draft took 36.3 s against 27.8 s, 42.2k fresh tokens against 21.3k and $0.015 against $0.008. The owner wants grafical to win these, so grafical gets cheaper until it does.

**Tasks:**

- ✅ Fewer blocked labels: Labels sit on straight vertical lines, and over 2,000 fuzz seeds `label-blocked` fell from 62 to 0 and `title-blocked` from 4 to 1.
- ⬜ Measure the rate in a round: Only a round shows whether Haiku's refused calls fall below 5%.
- ⬜ Find where Haiku's tokens go: Split a first draft's fresh tokens by what spent them.
- ⬜ Cut the cost of a first draft: Spend less on what that split shows.

**Delivers:**

- [F3.5: Refusals](../features/F3-editing.md#f35-refusals)
- [F7.1: Help](../features/F7-help.md#f71-help)
- [F3.2: Batches](../features/F3-editing.md#f32-batches)

**Exit criteria:**

- **Comparisons**
  - [C2: Time](GOALS.md#c2-time)
  - [C5: Cost](GOALS.md#c5-cost)
- **Do not hold the release**
  - [C3: Token use](GOALS.md#c3-token-use)
  - [T1: Operation errors](GOALS.md#t1-operation-errors)

### CP3.6: The MVP bar

**Status:** 🟨

A round with the owner's approval of its cost first. The owner's budget for stage 1 is $20, mostly on Haiku. Opus runs only for the baselines, the gap between models and the copied pictures, and both get the same prompt, word for word. The private reference brief's runs stay on the owner's machine, and only numbers are committed.

**Tasks:**

- ⬜ Measure the context added: A scan of the transcripts for the context each diagram adds.
- ✅ Run Opus at xhigh effort: A run of Opus at xhigh effort drawing directly, rated blind by the owner. (reported on 2026-11-05)
- ⬜ Private reference brief: The round on the private reference brief.
- ⬜ Choose the reference pictures: The owner picks a fixed set of pictures drawn by others.
- ⬜ Hand an agent a picture: The benchmark harness gives an agent a picture to copy.
- ⬜ Copy reference pictures: Opus redraws each reference picture.

**Delivers:**

- [F9.4: Someone else's picture](../features/F9-import.md#f94-someone-elses-picture)

**Exit criteria:**

- **Objectives**
  - [O1: The MVP bar](GOALS.md#o1-the-mvp-bar)
  - [O4: Copy a picture, better](GOALS.md#o4-copy-a-picture-better)
- **Comparisons**
  - [C1: Model gap](GOALS.md#c1-model-gap)
- **Do not hold the release**
  - [C4: Context added](GOALS.md#c4-context-added)
  - [C7: Beats the strongest model alone](GOALS.md#c7-beats-the-strongest-model-alone)

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

**Tasks:**

- ⬜ A package that can be published: `package.json` is still private at version 0.0.0.
- ⬜ Fix the font name tables: The subsets' name tables still say "Thin" and the OFL reserved font name "Source" needs checking.
- ⬜ Credit Twemoji: CC-BY 4.0 asks for attribution of its graphics and `LICENSE` does not name it.
- ⬜ Publish 0.1.0: The first version on npm.
- ⬜ Install from npm: The install steps use npm in place of a clone.

**Delivers:**

- [F11.1: The npm package](../features/F11-getting-grafical.md#f111-the-npm-package)

**Exit criteria:** none yet.

## CP5: Later

**Status:** ⬜

Features with no plan yet wait here, and one moves into a planned checkpoint when a real need brings it forward.

**Exit criteria:** none, since nothing here is planned.

### CP5.1: Diagram types

**Status:** ⬜

Diagrams with a layout of their own.

**Tasks:**

- ⬜ Sequence diagrams: Messages in time order.
- ⬜ Gantt charts: Tasks over time.
- ⬜ Mind maps: Ideas around one topic.
- ⬜ Pyramids: Layers of a whole.
- ⬜ Overlapping sets: What two sets share.
- ⬜ Entity-relationship and class diagrams: Tables and classes.

**Delivers:**

- [F8.1: Sequence diagrams](../features/F8-diagram-types.md#f81-sequence-diagrams)
- [F8.2: Gantt charts](../features/F8-diagram-types.md#f82-gantt-charts)
- [F8.3: Mind maps](../features/F8-diagram-types.md#f83-mind-maps)
- [F8.4: Pyramids](../features/F8-diagram-types.md#f84-pyramids)
- [F8.5: Overlapping sets](../features/F8-diagram-types.md#f85-overlapping-sets)
- [F8.6: Entity-relationship and class diagrams](../features/F8-diagram-types.md#f86-entity-relationship-and-class-diagrams)

**Exit criteria:** none yet.

### CP5.2: Import

**Status:** ⬜

A diagram started from an existing file.

**Tasks:**

- ⬜ Mermaid files: Start from a Mermaid file.
- ⬜ draw.io files: Start from a draw.io file.
- ⬜ Excalidraw files: Start from an Excalidraw file.

**Delivers:**

- [F9.1: Mermaid files](../features/F9-import.md#f91-mermaid-files)
- [F9.2: draw.io files](../features/F9-import.md#f92-drawio-files)
- [F9.3: Excalidraw files](../features/F9-import.md#f93-excalidraw-files)

**Exit criteria:** none yet.

### CP5.3: For teams

**Status:** ⬜

What a team needs past one diagram in one repository.

**Tasks:**

- ⬜ One catalog of systems: One list many diagrams share.
- ⬜ Brand fonts: A team's own typeface.
- ⬜ An MCP server: Operations without a shell.

**Delivers:**

- [F10.3: One catalog of systems](../features/F10-many-views.md#f103-one-catalog-of-systems)
- [F4.5: Brand fonts](../features/F4-look.md#f45-brand-fonts)
- [F11.2: An MCP server](../features/F11-getting-grafical.md#f112-an-mcp-server)

**Exit criteria:** none yet.

### CP5.4: More combinations of operations

**Status:** ⬜

The form is not decided with the owner yet, such as one operation for a common edit or for a common shape. The first candidates were chosen on 2026-10-15 after a field study of other diagram tools; copying a group and numbered steps were built on 2026-10-16.

**Tasks:**

- ⬜ Decide the form: The owner chooses what one operation may combine.
- ⬜ Test the candidates: A candidate stays only if a round shows it helps.

**Delivers:**

- [F3.7: More combinations of operations](../features/F3-editing.md#f37-more-combinations-of-operations)

**Exit criteria:** none yet.

### CP5.5: Checks of an agent's own

**Status:** ⬜

Rules a diagram sets itself, once a real need shows which ones.

**Tasks:**

- ⬜ Rules a diagram sets itself: An object or a type marks a rule that warns or refuses.

**Delivers:**

- [F5.5: Checks of an agent's own](../features/F5-checking.md#f55-checks-of-an-agents-own)

**Exit criteria:** none yet.
