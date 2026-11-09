# Roadmap

**Current checkpoint:** [CP3: Drawing well](#cp3-drawing-well). The work now is [CP3.4: Rearranging in one command](#cp34-rearranging-in-one-command), and then [CP3.6: Clean edges and labels](#cp36-clean-edges-and-labels).

The work comes in four groups of what grafical can do: draw at all · draw more · draw well · draw the hardest pictures. A release follows once the MVP bar is met. Within a group the numbers are the order of the work.

## Summary

```
Roadmap
├── 🟨 CP1: Drawing at all — what an agent needs to draw with grafical alone
│   ├── ✅ CP1.1: The risky questions — the same pixels on macOS and Linux
│   │   ├── ✅ Our own gap router
│   │   ├── ✅ Text shaping
│   │   ├── ✅ Chinese font subset
│   │   ├── ✅ The npm name
│   │   ├── ✅ Same pixels on both systems
│   │   └── ✅ Package, tests and CI
│   ├── ✅ CP1.2: The loop — a few commands draw a service and its database
│   │   ├── ✅ First operations
│   │   ├── ✅ First batches
│   │   ├── ✅ First render
│   │   ├── ✅ The public brief
│   │   ├── ✅ The full operation set
│   │   ├── ✅ `apply`
│   │   ├── ✅ `show`
│   │   ├── ✅ The live viewer
│   │   ├── ✅ New edge types
│   │   └── ✅ Flowchart and state machine types
│   ├── ✅ CP1.3: Stability — a new node leaves every other fact as it was
│   │   ├── ✅ `diff`
│   │   ├── ✅ The stability rule
│   │   └── ✅ `try`
│   ├── ✅ CP1.4: Replies an agent can act on — records and refusals that name the way out
│   │   ├── ✅ The help
│   │   ├── ✅ Help in place of `grafical guide`
│   │   ├── ✅ Records
│   │   ├── ✅ Every order stated
│   │   ├── ✅ Blocks that name the way out
│   │   ├── ✅ Every warning on every write
│   │   ├── ✅ One entry page of help
│   │   └── ✅ A wrong command names the right one
│   ├── ✅ CP1.5: Speed — 50 ms an operation
│   │   ├── ✅ No slot search
│   │   └── ✅ The worst operation measured
│   ├── ✅ CP1.6: One form for the command line — `grafical -f <file> <noun> --<verb>`
│   │   ├── ✅ The file flag
│   │   ├── ✅ One name for each thing
│   │   ├── ✅ Verbs as flags
│   │   ├── ✅ One way for each situation
│   │   └── ✅ Batches from standard input
│   └── 🟨 CP1.7: The file form — objects with types and styles
│       ├── ✅ Design the model and its form
│       ├── ✅ Build the model
│       ├── ⬜ One library
│       └── ⬜ Tune the form
├── 🟨 CP2: Drawing more — what a picture can hold
│   ├── ✅ CP2.1: Containers — groups · lanes · walls · notes
│   │   ├── ✅ Edges that end at containers
│   │   ├── ✅ Swimlanes
│   │   ├── ✅ Nested groups
│   │   ├── ✅ Walls
│   │   ├── ✅ Notes
│   │   ├── ✅ Copying a group
│   │   └── ✅ Bar names clear of edges
│   ├── ✅ CP2.2: Placement facts — alignment · columns · steps · gaps
│   │   ├── ✅ Equal heights in a layer
│   │   ├── ✅ Columns
│   │   ├── ✅ Steps from another node
│   │   ├── ✅ Optional layer labels
│   │   └── ✅ Region gaps
│   ├── ✅ CP2.3: Kinds of edge — any side · weights · step numbers
│   │   ├── ✅ Edges on any side
│   │   ├── ✅ Hops and dots
│   │   ├── ✅ Edge weights
│   │   ├── ✅ Step numbers
│   │   └── ✅ Edge sides
│   ├── 🟨 CP2.4: Nodes — marks · sizes · offsets
│   │   ├── ✅ Marks
│   │   ├── ⬜ Corner marks checked
│   │   ├── ⬜ Marks by name
│   │   ├── ⬜ Size multiples
│   │   └── ⬜ Offsets
│   ├── ⬜ CP2.5: Deeper containers — five levels · lanes both ways · column headings
│   │   ├── ⬜ Column headings
│   │   ├── ⬜ Lanes both ways
│   │   ├── ⬜ Deeper nesting
│   │   └── ⬜ Bars across groups
│   ├── 🟨 CP2.6: The legend — a small diagram that says what colors and widths mean
│   │   ├── ✅ The richer legend
│   │   ├── ⬜ Design the legend
│   │   └── ⬜ Build the legend
│   └── ⬜ CP2.7: Direction and views — left to right · several pictures of one file
│       ├── ⬜ Flow direction
│       ├── ⬜ Views of one file
│       └── ⬜ Folded groups
├── 🟨 CP3: Drawing well — a picture that looks right
│   ├── ✅ CP3.1: The target look — the rules of a hand-drawn target
│   │   ├── ✅ Layers not drawn
│   │   ├── ✅ Groups as systems
│   │   ├── ✅ One column grid
│   │   ├── ✅ Measured rules
│   │   ├── ✅ Edges on the new engine
│   │   ├── ✅ Themes and stylesheets
│   │   ├── ✅ Bundled fan-outs
│   │   └── ✅ Room around stores
│   ├── 🟨 CP3.2: Steering an edge — side · passage · trunk · bend · stretch
│   │   ├── ✅ Edge shapes
│   │   ├── ✅ `--straight`
│   │   ├── ✅ `--with`
│   │   ├── ✅ `--via`
│   │   ├── ✅ `--bend`
│   │   ├── ✅ `--stretch`
│   │   └── ⬜ The canvas grows for every route
│   ├── 🟨 CP3.3: Looks — colors and labels of every object
│   │   ├── ✅ Node looks
│   │   ├── ✅ Edge looks
│   │   ├── ✅ Container looks
│   │   ├── ✅ Region labels
│   │   ├── ✅ Label looks
│   │   ├── 🟨 Label text
│   │   └── ⬜ Looks for every label
│   ├── 🟨 CP3.4: Rearranging in one command — one move takes `same-layer-pair` from 3 crossings to 0
│   │   ├── 🟨 Move and plug
│   │   └── ⬜ A layer's whole order
│   ├── ⬜ CP3.5: A check before stopping — the agent looks at its picture against a list
│   │   └── ⬜ A check before stopping
│   └── 🟨 CP3.6: Clean edges and labels — the places given draw clean
│       ├── ✅ Labels on straight edges
│       ├── ✅ Choice diamonds
│       ├── ✅ Footnote numbers
│       ├── ✅ Routing cases
│       ├── 🟨 Labels on edges
│       ├── 🟨 Clean edges
│       ├── ⬜ Labels in a crowded gutter
│       ├── ⬜ A diamond's slanted edges
│       ├── ⬜ Badges off a lane's side
│       └── ⬜ Return edges off a self-loop
├── 🟨 CP4: The hardest pictures — every kind of diagram measured with a model
│   ├── ✅ CP4.1: The stage 1 round — Haiku rated 24 of 25 on the public brief
│   │   ├── ✅ The first round
│   │   └── ✅ The rerun
│   ├── 🟨 CP4.2: Errors and cost — cheaper and faster than drawing directly
│   │   ├── ✅ Fewer blocked labels
│   │   ├── ⬜ Measure the rate in a round
│   │   ├── ⬜ Find where Haiku's tokens go
│   │   └── ⬜ Cut the cost of a first draft
│   ├── ⬜ CP4.3: Copying a picture — someone else's picture redrawn better
│   │   ├── ⬜ Choose the reference pictures
│   │   ├── ⬜ Hand an agent a picture
│   │   └── ⬜ Copy reference pictures
│   ├── 🟨 CP4.4: The MVP bar — one round says whether grafical succeeds
│   │   ├── ✅ Run Opus at xhigh effort
│   │   ├── ⬜ Measure the context added
│   │   └── ⬜ Private reference brief
│   ├── ⬜ CP4.5: Every kind of diagram — each kind in a round
│   │   ├── ⬜ State machine
│   │   ├── ⬜ Flowchart
│   │   ├── ⬜ Dependency graph
│   │   ├── ⬜ Architecture
│   │   ├── ⬜ Swimlane
│   │   ├── ⬜ Data flow
│   │   ├── ⬜ Event flow
│   │   ├── ⬜ C4
│   │   └── ⬜ Infrastructure
│   └── ⬜ CP4.6: Size — a clear picture at 50 nodes
│       ├── ⬜ 10 nodes
│       ├── ⬜ 25 nodes
│       └── ⬜ A true 50-node picture
├── ⬜ CP5: Release 0.1.0 — grafical on npm
│   └── ⬜ CP5.1: The npm package
│       ├── ⬜ A package that can be published
│       ├── ⬜ Fix the font name tables
│       ├── ⬜ Credit Twemoji
│       ├── ⬜ Publish 0.1.0
│       └── ⬜ Install from npm
└── ⬜ CP6: Later — features with no plan yet
    ├── ⬜ CP6.1: Diagram types
    │   ├── ⬜ Sequence diagrams
    │   ├── ⬜ Gantt charts
    │   ├── ⬜ Mind maps
    │   ├── ⬜ Pyramids
    │   ├── ⬜ Overlapping sets
    │   └── ⬜ Entity-relationship and class diagrams
    ├── ⬜ CP6.2: Import
    │   ├── ⬜ Mermaid files
    │   ├── ⬜ draw.io files
    │   └── ⬜ Excalidraw files
    ├── ⬜ CP6.3: For teams
    │   ├── ⬜ One catalog of systems
    │   ├── ⬜ Brand fonts
    │   └── ⬜ An MCP server
    ├── ⬜ CP6.4: More combinations of operations
    │   ├── ⬜ Decide the form
    │   └── ⬜ Test the candidates
    └── ⬜ CP6.5: Checks of an agent's own
        └── ⬜ Rules a diagram sets itself
```

## CP1: Drawing at all

**Status:** 🟨

What an agent needs to draw with grafical alone. Most of it was built before the goals were written down on 2026-10-15, so only some of its parts end on a goal.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP1.1: The risky questions](#cp11-the-risky-questions) is met.
  - [CP1.2: The loop](#cp12-the-loop) is met.
  - [CP1.3: Stability](#cp13-stability) is met.
  - [CP1.4: Replies an agent can act on](#cp14-replies-an-agent-can-act-on) is met.
  - [CP1.5: Speed](#cp15-speed) is met.
  - [CP1.6: One form for the command line](#cp16-one-form-for-the-command-line) is met.
  - [CP1.7: The file form](#cp17-the-file-form) is met.

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
  - [R3: Determinism](GOALS.md#r3-determinism): ✅ 2026-10-11, the same file gave the same pixels on macOS and Linux.

### CP1.2: The loop

**Status:** ✅ (2026-10-11 to 2026-10-12)

The smallest path from operations to a picture: an agent built the public brief with operations alone, with no defect.

**Tasks:**

- ✅ First operations: Named operations write one diagram file.
- ✅ First batches: Many operations apply in one call.
- ✅ First render: A diagram file gives a picture.
- ✅ The public brief: An agent built the public brief with operations alone, with no defect.
- ✅ The full operation set: Every editing operation of stage 1 exists.
- ✅ `apply`: A batch applies from one call.
- ✅ `show`: The diagram prints as facts.
- ✅ The live viewer: A window redraws on every change.
- ✅ New edge types: Edges gained new types.
- ✅ Flowchart and state machine types: Nodes gained the types of these diagrams.

**Delivers:**

- [F2.1: Placing every node](../features/F2-layout.md#f21-placing-every-node)
- [F2.2: Layers and order](../features/F2-layout.md#f22-layers-and-order)
- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.2: Batches](../features/F3-editing.md#f32-batches)
- [F3.4: IDs](../features/F3-editing.md#f34-ids)
- [F6.1: The diagram file](../features/F6-output.md#f61-the-diagram-file)
- [F6.2: Render](../features/F6-output.md#f62-render)
- [F5.1: Show](../features/F5-checking.md#f51-show)
- [F6.3: Live viewer](../features/F6-output.md#f63-live-viewer)
- [F1.1.2: Labels and sublabels](../features/F1-elements.md#f112-labels-and-sublabels)
- [F1.2.1: Types](../features/F1-elements.md#f121-types)
- [F1.2.2: Arrowheads at both ends](../features/F1-elements.md#f122-arrowheads-at-both-ends)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.3: Stability

**Status:** ✅ (2026-10-12 to 2026-10-14)

The stability rule enforced by tests, a change printed as operations, and a change tried before it is written (`bench/results/phase2.md`).

**Tasks:**

- ✅ `diff`: A change prints as operations.
- ✅ The stability rule: Tests enforce the stability rule.
- ✅ `try`: A change can be tried before it is written.

**Delivers:**

- [F6.4: Diff](../features/F6-output.md#f64-diff)
- [F3.3: Trying a change](../features/F3-editing.md#f33-trying-a-change)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability): ✅ 2026-10-12, 0 unnamed changes in 169 single operations.

### CP1.4: Replies an agent can act on

**Status:** ✅ (2026-10-12 to 2026-10-19)

Every reply is records or a block that names the commands that can change it.

**Tasks:**

- ✅ The help: The help teaches the agent grafical.
- ✅ Help in place of `grafical guide`: The help took over from `grafical guide`.
- ✅ Records: Records replace prose in every reply.
- ✅ Every order stated: The agent states every order and the engine picks no slot.
- ✅ Blocks that name the way out: Each problem's block says what happened and what caused it and which commands can change it.
- ✅ Every warning on every write: Every write prints every warning.
- ✅ One entry page of help: One page opens the help.
- ✅ A wrong command names the right one: A wrong command prints the right one.

**Delivers:**

- [F3.5: Refusals](../features/F3-editing.md#f35-refusals)
- [F5.2: Counts](../features/F5-checking.md#f52-counts)
- [F5.3: Warnings](../features/F5-checking.md#f53-warnings)
- [F5.4: Check](../features/F5-checking.md#f54-check)
- [F7.1: Help](../features/F7-help.md#f71-help)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.5: Speed

**Status:** ✅ (2026-10-15)

Adding a node without a position took up to 189.7 ms at 50 nodes, against 50 ms.

**Tasks:**

- ✅ No slot search: The agent now states every order, so no slot search runs.
- ✅ The worst operation measured: The worst operation took 18.6 ms on 2026-10-15.

**Exit criteria:**

- **Thresholds**
  - [T2: Speed](GOALS.md#t2-speed): ✅ 2026-10-15, the worst operation took 18.6 ms.

### CP1.6: One form for the command line

**Status:** ✅ (2026-11-06 to 2026-11-08)

Every command names its file the same way, a verb is a flag, each thing has one name and each situation has one shortest way.

**Tasks:**

- ✅ The file flag: Every command takes its file from `-f`, on its own and ahead of the next round.
- ✅ One name for each thing: Every surface uses one name, and the code does except where a word means something else.
- ✅ Verbs as flags: A command is a noun and flags, and the planned commands in the features follow.
- ✅ One way for each situation: `edge --emphasize` went, and the commands were checked for other repeats.
- ✅ Batches from standard input: `apply` reads a batch named `-` from standard input.

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability): ✅ 2026-11-08, the stability tests passed.

### CP1.7: The file form

**Status:** 🟨 (since 2026-11-06)

A diagram is objects with types and styles, in a form of its own, before the first release freezes the file. Saved drafts stay in YAML and still load.

**Tasks:**

- ✅ Design the model and its form: The owner designed them on 2026-11-06.
- ✅ Build the model: grafical reads and writes the form · styles · types · `like`.
- ⬜ One library: A `.grafical` file of types and styles holds the looks a diagram shares, and the stylesheet goes.
- ⬜ Tune the form: Once it is built, the form is tuned against what its diffs show.

**Delivers:**

- [F6.1.1: The object model](../features/F6-output.md#f611-the-object-model)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R3: Determinism](GOALS.md#r3-determinism)
  - [R4: A sound file](GOALS.md#r4-a-sound-file)
- **Do not hold the release**
  - [M4: Diff size](GOALS.md#m4-diff-size)

## CP2: Drawing more

**Status:** 🟨

What a picture can hold grows. A test and a fixture accept each item, with no model run.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP2.1: Containers](#cp21-containers) is met.
  - [CP2.2: Placement facts](#cp22-placement-facts) is met.
  - [CP2.3: Kinds of edge](#cp23-kinds-of-edge) is met.
  - [CP2.4: Nodes](#cp24-nodes) is met.
  - [CP2.5: Deeper containers](#cp25-deeper-containers) is met.
  - [CP2.6: The legend](#cp26-the-legend) is met.
  - [CP2.7: Direction and views](#cp27-direction-and-views) is met.

### CP2.1: Containers

**Status:** ✅ (2026-10-11 to 2026-10-19)

What gathers nodes and what an edge may end at.

**Tasks:**

- ✅ Edges that end at containers: An edge ends at a container.
- ✅ Swimlanes: Bands say who owns what.
- ✅ Nested groups: A group sits inside a group.
- ✅ Walls: Edges cross a wall only where allowed.
- ✅ Notes: A short text sits on a node, an edge or a group.
- ✅ Copying a group: A group can be copied.
- ✅ Bar names clear of edges: A bar keeps its name clear of the edges.

**Delivers:**

- [F1.3.1: Groups](../features/F1-elements.md#f131-groups)
- [F1.3.2: Copying a group](../features/F1-elements.md#f132-copying-a-group)
- [F1.3.4: Lanes](../features/F1-elements.md#f134-lanes)
- [F1.3.6: Walls](../features/F1-elements.md#f136-walls)
- [F1.3.7: Notes](../features/F1-elements.md#f137-notes)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP2.2: Placement facts

**Status:** ✅ (2026-10-13 to 2026-11-06)

Places beside a layer and an order.

**Tasks:**

- ✅ Equal heights in a layer: Nodes of a layer share one height.
- ✅ Columns: Columns are a placement fact.
- ✅ Steps from another node: A node sits some cells from another.
- ✅ Optional layer labels: A layer needs no label and a layer with a look is drawn.
- ✅ Region gaps: The gap between two neighbouring regions may be magnified.

**Delivers:**

- [F2.3: Alignment](../features/F2-layout.md#f23-alignment)
- [F2.6: Spacing](../features/F2-layout.md#f26-spacing)
- [F2.6.1: Region gaps](../features/F2-layout.md#f261-region-gaps)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability): ✅ 2026-11-08, the stability tests passed.

### CP2.3: Kinds of edge

**Status:** ✅ (2026-10-12 to 2026-11-06)

What an edge can say past joining two ends.

**Tasks:**

- ✅ Edges on any side: An edge meets a node on any side.
- ✅ Hops and dots: Crossing edges hop and joins take dots.
- ✅ Edge weights: An edge can be thicker.
- ✅ Step numbers: An edge can carry a step number.
- ✅ Edge sides: An agent states the side an edge leaves or enters by, any side of either end.

**Delivers:**

- [F1.2.3: Weight](../features/F1-elements.md#f123-weight)
- [F1.2.4: Numbered steps](../features/F1-elements.md#f124-numbered-steps)
- [F2.7.1: Edge sides](../features/F2-layout.md#f271-edge-sides)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability): ✅ 2026-11-08, the stability tests passed.

### CP2.4: Nodes

**Status:** 🟨

Nodes carry marks that stay clear of edges, take multiples of their size and sit a fraction of a cell off the grid.

**Tasks:**

- ✅ Marks: A node carries small marks.
- ⬜ Corner marks checked: A corner mark is checked against nearby edges.
- ⬜ Marks by name: A mark can be taken by name.
- ⬜ Size multiples: A node takes multiples of its width and height.
- ⬜ Offsets: A node sits a fraction of a cell off the grid, once the router allows it: [The space the router works in](TODO.md#p1discussion-the-space-the-router-works-in).

**Delivers:**

- [F1.1.6: Emphasis](../features/F1-elements.md#f116-emphasis)
- [F1.1.3: Sizes](../features/F1-elements.md#f113-sizes)
- [F1.1.3.1: Size multiples](../features/F1-elements.md#f1131-size-multiples)
- [F1.1.4: Marks](../features/F1-elements.md#f114-marks)
- [F1.1.5: Marks by name](../features/F1-elements.md#f115-marks-by-name)
- [F2.5: Steps from another node](../features/F2-layout.md#f25-steps-from-another-node)
- [F2.5.1: Offsets](../features/F2-layout.md#f251-offsets)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.5: Deeper containers

**Status:** ⬜

Containers that cross and nest five deep, and columns that carry headings.

**Tasks:**

- ⬜ Column headings: A column carries a heading above its first layer.
- ⬜ Lanes both ways: Lanes that run as layers and as columns in one diagram.
- ⬜ Deeper nesting: Groups up to five levels, with the fuzz test holding at five levels.
- ⬜ Bars across groups: A bar crosses a group's node and overlaps no node or label.

**Delivers:**

- [F2.4: Columns](../features/F2-layout.md#f24-columns)
- [F2.4.1: Column headings](../features/F2-layout.md#f241-column-headings)
- [F4.7: Region labels](../features/F4-look.md#f47-region-labels)
- [F1.3.5: Lanes both ways](../features/F1-elements.md#f135-lanes-both-ways)
- [F1.3.3: Deeper nesting](../features/F1-elements.md#f133-deeper-nesting)
- [F1.2.5: Ends at a group, a layer or a lane](../features/F1-elements.md#f125-ends-at-a-group-a-layer-or-a-lane)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.6: The legend

**Status:** 🟨

A legend is a small diagram, and it can explain what a picture's colors mean.

**Tasks:**

- ✅ The richer legend: The legend covers styles, widths and marks.
- ⬜ Design the legend: The owner designs it: [The legend needs a design of its own](TODO.md#p1discussion-the-legend-needs-a-design-of-its-own).
- ⬜ Build the legend: The design is built.

**Delivers:**

- [F4.2: Legend](../features/F4-look.md#f42-legend)
- [F4.2.1: A legend as a small diagram](../features/F4-look.md#f421-a-legend-as-a-small-diagram)

**Exit criteria:**

- **Constraints**
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.7: Direction and views

**Status:** ⬜

Other ways to read one diagram, which build on the nesting of [CP2.5: Deeper containers](#cp25-deeper-containers).

**Tasks:**

- ⬜ Flow direction: A diagram that reads left to right.
- ⬜ Views of one file: Several pictures of parts of one file.
- ⬜ Folded groups: A group drawn folded into one node in a view.

**Delivers:**

- [F2.8: Flow direction](../features/F2-layout.md#f28-flow-direction)
- [F10.1: Views of one file](../features/F10-many-views.md#f101-views-of-one-file)
- [F10.2: Folded groups](../features/F10-many-views.md#f102-folded-groups)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)
  - [R3: Determinism](GOALS.md#r3-determinism)

## CP3: Drawing well

**Status:** 🟨

A picture looks right. A test and a fixture accept each item, with no model run.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP3.1: The target look](#cp31-the-target-look) is met.
  - [CP3.2: Steering an edge](#cp32-steering-an-edge) is met.
  - [CP3.3: Looks](#cp33-looks) is met.
  - [CP3.4: Rearranging in one command](#cp34-rearranging-in-one-command) is met.
  - [CP3.5: A check before stopping](#cp35-a-check-before-stopping) is met.
  - [CP3.6: Clean edges and labels](#cp36-clean-edges-and-labels) is met.

### CP3.1: The target look

**Status:** ✅ (2026-10-11 to 2026-10-14)

The engine was rebuilt toward a hand-drawn target that judges scored 57 of 60, against 22 for the first engine: layers not drawn, groups as systems, one column grid and measured rules (`bench/results/phase1b.md`, `bench/results/phase1b2.md`, `bench/results/phase1b3.md`). One name sets the whole look.

**Tasks:**

- ✅ Layers not drawn: A layer places nodes and draws nothing.
- ✅ Groups as systems: A group is drawn as one system.
- ✅ One column grid: Every node sits on one column grid.
- ✅ Measured rules: The look is held by measured rules.
- ✅ Edges on the new engine: The rebuilt engine routes every edge.
- ✅ Themes and stylesheets: One name sets the whole look.
- ✅ Bundled fan-outs: A fan-out leaves as one bundle.
- ✅ Room around stores: Stores keep room around them.

**Delivers:**

- [F4.1: Title, subtitle and footnote](../features/F4-look.md#f41-title-subtitle-and-footnote)
- [F4.3: Themes and stylesheets](../features/F4-look.md#f43-themes-and-stylesheets)
- [F4.4: The stylesheet file](../features/F4-look.md#f44-the-stylesheet-file)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP3.2: Steering an edge

**Status:** 🟨 (since 2026-11-06)

A strong model steers an edge with facts and draws it square or round.

**Tasks:**

- ✅ Edge shapes: A command draws edges square or round.
- ✅ `--straight`: An edge with no bend is stated, and an edge that cannot run straight is refused.
- ✅ `--with`: An edge joins another's trunk, which draws a tree with one spine.
- ✅ `--via`: An edge passes a stated object on a stated side.
- ✅ `--bend`: An edge turns at a stated fraction of its longest run.
- ✅ `--stretch`: A detour reaches a stated multiple of its default.
- ⬜ The canvas grows for every route: A step after routing grows the canvas as layout does.

**Delivers:**

- [F2.7.2: Edge shapes](../features/F2-layout.md#f272-edge-shapes)
- [F2.7.4: Steering an edge](../features/F2-layout.md#f274-steering-an-edge)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP3.3: Looks

**Status:** 🟨 (since 2026-11-06)

Every object and every label takes a look of its own.

**Tasks:**

- ✅ Node looks: A node takes colors of its own or a named look.
- ✅ Edge looks: An edge takes a color of its own or a named look.
- ✅ Container looks: A group or a lane takes colors of its own or a named look.
- ✅ Region labels: The label of a diagram · a group · a layer · a lane sits at a fraction, and a column's waits for Column headings.
- ✅ Label looks: An edge's label marks a style for its background, border and color.
- 🟨 Label text: An agent sets the breaks and alignment of the label of a node · an edge · a wall · a lane · a note, and the titles of regions stay one line.
- ⬜ Looks for every label: The label of a node · a group · a lane marks a style as an edge's label does.

**Delivers:**

- [F1.1.7: Node looks](../features/F1-elements.md#f117-node-looks)
- [F1.2.6: Edge looks](../features/F1-elements.md#f126-edge-looks)
- [F1.3.8: Container looks](../features/F1-elements.md#f138-container-looks)
- [F4.6: Label text](../features/F4-look.md#f46-label-text)
- [F4.8: Label looks](../features/F4-look.md#f48-label-looks)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP3.4: Rearranging in one command

**Status:** 🟨 (since 2026-11-07)

The agent fixes a picture by placing nodes, so a move costs one command and shows its effect before the write. On `same-layer-pair` one move of C took crossings from 3 to 0. What a move needs is open in [Rearranging a picture is cheap](TODO.md#p1discussion-rearranging-a-picture-is-cheap).

**Tasks:**

- 🟨 Move and plug: `plug` replaces `edge --ends`, and `move` is not built.
- ⬜ A layer's whole order: One command states the order of every node in a layer.

**Delivers:**

- [F3.8: Move and plug](../features/F3-editing.md#f38-move-and-plug)
- [F3.6: Merging and swapping](../features/F3-editing.md#f36-merging-and-swapping)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)

### CP3.5: A check before stopping

**Status:** ⬜

An agent looks at its picture and checks it against the list in `grafical guide composition` before it stops.

**Tasks:**

- ⬜ A check before stopping: `grafical guide composition` holds the list, and the entry page points to it as the last step.

**Delivers:**

- [F7.2: Guides](../features/F7-help.md#f72-guides)
- [F7.2.1: A check before stopping](../features/F7-help.md#f721-a-check-before-stopping)

**Exit criteria:**

- **Do not hold the release**
  - [B4: Verifiability](GOALS.md#b4-verifiability)

### CP3.6: Clean edges and labels

**Status:** 🟨 (since 2026-10-30)

The engine draws clean edges and labels for the places the agent gives. Drawing reference diagrams with grafical's own commands showed where a picture still looks wrong though no check fails, and the owner's notes on each round's pictures decide what comes next. The open points are in [What clean edges still leave open](TODO.md#p1discussion-what-clean-edges-still-leave-open).

**Tasks:**

- ✅ Labels on straight edges: A label sits on its own straight vertical edge.
- ✅ Choice diamonds: `choice` is a small diamond for an edge that splits.
- ✅ Footnote numbers: A footnote's number stays wholly inside or outside a container.
- ✅ Routing cases: `pnpm bench routes` compares 29 small cases with a saved baseline.
- 🟨 Labels on edges: An edge carries its label by default, and edges do not yet move apart for one.
- 🟨 Clean edges: Edges meet the rules set on 2026-11-07, built on the router as it is.
  - ✅ An edge runs at least 16 px from a node to the first track of a gutter (2026-11-08).
  - ⬜ The end run beside a gap · the level swap · a side to a side across layers · a way round the outside.
- ⬜ Labels in a crowded gutter: An attempt did not land and waits on the owner's choice: [Labels sit close to the edges beside them in a crowded gutter](TODO.md#p2discussion-labels-sit-close-to-the-edges-beside-them-in-a-crowded-gutter).
- ⬜ A diamond's slanted edges: An edge meets a diamond only at a corner, measured with `pnpm bench diff` before it lands.
- ⬜ Badges off a lane's side: A step's badge keeps off a lane's side, and `step-collision` counts one that touches it.
- ⬜ Return edges off a self-loop: The edges that leave and enter a node keep clear of its self-loop.

**Delivers:**

- [F2.7: How edges are drawn](../features/F2-layout.md#f27-how-edges-are-drawn)
- [F2.7.3: Labels on edges](../features/F2-layout.md#f273-labels-on-edges)
- [F2.7.5: Clean edges](../features/F2-layout.md#f275-clean-edges)
- [F1.1.1: Types and shapes](../features/F1-elements.md#f111-types-and-shapes)

**Exit criteria:**

- **Objectives**
  - [O6: A picture reads at a glance](GOALS.md#o6-a-picture-reads-at-a-glance)
- **Constraints**
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)
- **Do not hold the release**
  - [M5: Routing cases](GOALS.md#m5-routing-cases)

## CP4: The hardest pictures

**Status:** 🟨

Each kind of diagram runs through a model, and every goal not yet settled is checked here. Round `p1g` on 2026-10-18 met [B1: Iteration](GOALS.md#b1-iteration) (23 of 24 changes made) and missed [T1: Operation errors](GOALS.md#t1-operation-errors) (19% to 26% of calls refused on large diagrams, 55% on the private reference brief); the owner dropped the judged score the same day. Every round measures the cache and the size of each change.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP4.1: The stage 1 round](#cp41-the-stage-1-round) is met.
  - [CP4.2: Errors and cost](#cp42-errors-and-cost) is met.
  - [CP4.3: Copying a picture](#cp43-copying-a-picture) is met.
  - [CP4.4: The MVP bar](#cp44-the-mvp-bar) is met.
  - [CP4.5: Every kind of diagram](#cp45-every-kind-of-diagram) is met.
  - [CP4.6: Size](#cp46-size) is met.
- **Do not hold the release**
  - [M2: Cache hit rate](GOALS.md#m2-cache-hit-rate)
  - [M4: Diff size](GOALS.md#m4-diff-size)

### CP4.1: The stage 1 round

**Status:** ✅ (2026-10-12)

The first full benchmark round, and its rerun after the edge work (`bench/results/stage1.md`). The MVP bar was not met.

**Tasks:**

- ✅ The first round: The first full benchmark round ran.
- ✅ The rerun: The round ran again after the edge work.

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP4.2: Errors and cost

**Status:** 🟨

The refusals of the private reference brief were mostly `title-blocked`. Haiku spends more with grafical than drawing directly: on 2026-10-18 its first draft took 36.3 s against 27.8 s, 42.2k fresh tokens against 21.3k and $0.015 against $0.008. The owner wants grafical to win these, so grafical gets cheaper until it does.

**Tasks:**

- ✅ Fewer blocked labels: Labels sit on straight vertical edges, and over 2,000 fuzz seeds `label-blocked` fell from 62 to 0 and `title-blocked` from 4 to 1.
- ⬜ Measure the rate in a round: Only a round shows whether Haiku's refused calls fall below 5%.
- ⬜ Find where Haiku's tokens go: Split a first draft's fresh tokens by what spent them.
- ⬜ Cut the cost of a first draft: Spend less on what that split shows.

**Exit criteria:**

- **Comparisons**
  - [C2: Time](GOALS.md#c2-time)
  - [C5: Cost](GOALS.md#c5-cost)
- **Do not hold the release**
  - [C3: Token use](GOALS.md#c3-token-use)
  - [T1: Operation errors](GOALS.md#t1-operation-errors)

### CP4.3: Copying a picture

**Status:** ⬜

An agent given someone else's picture redraws it with grafical, and the result looks better.

**Tasks:**

- ⬜ Choose the reference pictures: The owner picks a fixed set of pictures drawn by others.
- ⬜ Hand an agent a picture: The benchmark harness gives an agent a picture to copy.
- ⬜ Copy reference pictures: Opus redraws each reference picture.

**Delivers:**

- [F9.4: Someone else's picture](../features/F9-import.md#f94-someone-elses-picture)

**Exit criteria:**

- **Objectives**
  - [O4: Copy a picture, better](GOALS.md#o4-copy-a-picture-better)

### CP4.4: The MVP bar

**Status:** 🟨

The MVP bar says whether grafical succeeds. The owner set it on 2026-10-13, changed it on 2026-11-05 and alone changes it. An agent uses only the command line and its help and draws with zero mechanical defects. The goals below pass in one round that includes the private reference brief, with Haiku holding the floor and a strong model reaching for the top, and the round has no engine-owned defect. It was not met on 2026-10-18: in round `p1g` [C2: Time](GOALS.md#c2-time) and [C5: Cost](GOALS.md#c5-cost) were not met and one draft had an engine-owned defect.

A round with the owner's approval of its cost first. The owner's budget for stage 1 is $20, mostly on Haiku. Opus runs only for the baselines, the gap between models and the copied pictures, and both get the same prompt, word for word. The private reference brief's runs stay on the owner's machine, and only numbers are committed.

**Tasks:**

- ✅ Run Opus at xhigh effort: A run of Opus at xhigh effort drawing directly, rated blind by the owner. (reported on 2026-11-05)
- ⬜ Measure the context added: A scan of the transcripts for the context each diagram adds.
- ⬜ Private reference brief: The round on the private reference brief.

**Exit criteria:**

- **Objectives**
  - [O4: Copy a picture, better](GOALS.md#o4-copy-a-picture-better)
  - [O6: A picture reads at a glance](GOALS.md#o6-a-picture-reads-at-a-glance)
- **Comparisons**
  - [C1: Model gap](GOALS.md#c1-model-gap)
  - [C2: Time](GOALS.md#c2-time)
  - [C5: Cost](GOALS.md#c5-cost)
- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)
  - [R3: Determinism](GOALS.md#r3-determinism)
  - [R4: A sound file](GOALS.md#r4-a-sound-file)
- **Do not hold the release**
  - [C4: Context added](GOALS.md#c4-context-added)
  - [C7: Beats the strongest model alone](GOALS.md#c7-beats-the-strongest-model-alone)
  - [M3: Better every round](GOALS.md#m3-better-every-round)

### CP4.5: Every kind of diagram

**Status:** ⬜

Diagrams with no container, diagrams that show what belongs together and who owns it, and diagrams that follow a request or a message across systems.

**Tasks:**

- ⬜ State machine: The prompt `order-states` in a round.
- ⬜ Flowchart: The prompt `refund-flow` in a round.
- ⬜ Dependency graph: The prompt `checkout-dependencies` in a round.
- ⬜ Architecture: The public brief drawn with groups.
- ⬜ Swimlane: The prompt `laptop-swimlane` in a round.
- ⬜ Data flow: The prompt `steps-data-flow` in a round.
- ⬜ Event flow: The prompt `delivery-events` in a round.
- ⬜ C4: The prompt `booking-c4` in a round.
- ⬜ Infrastructure: The prompts `photo-cloud` and `catalog-deployment` in a round.

**Exit criteria:**

- **Do not hold the release**
  - [B1: Iteration](GOALS.md#b1-iteration)
  - [M3: Better every round](GOALS.md#m3-better-every-round)

### CP4.6: Size

**Status:** ⬜

A picture of about 50 nodes that a reader can follow.

**Tasks:**

- ⬜ 10 nodes: The 10-component brief in a round.
- ⬜ 25 nodes: The 25-component brief in a round.
- ⬜ A true 50-node picture: Haiku draws the 50-component brief without merging it down.

**Exit criteria:**

- **Do not hold the release**
  - [B2: Scale](GOALS.md#b2-scale)

## CP5: Release 0.1.0

**Status:** ⬜

Publish `grafical` on npm once [CP4.4: The MVP bar](#cp44-the-mvp-bar) is met. A recorded decision may recalibrate any target, and only the owner changes what the MVP bar holds.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP5.1: The npm package](#cp51-the-npm-package) is met.
- **Do not hold the release**
  - [M1: Enough to say](GOALS.md#m1-enough-to-say)
  - [M2: Cache hit rate](GOALS.md#m2-cache-hit-rate)
  - [M4: Diff size](GOALS.md#m4-diff-size)

### CP5.1: The npm package

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

## CP6: Later

**Status:** ⬜

Features with no plan yet wait here, and one moves into a planned checkpoint when a real need brings it forward.

**Exit criteria:** none, since nothing here is planned.

### CP6.1: Diagram types

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

### CP6.2: Import

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

### CP6.3: For teams

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

### CP6.4: More combinations of operations

**Status:** ⬜

The form is not decided with the owner yet, such as one operation for a common edit or for a common shape. The first candidates were chosen on 2026-10-15 after a field study of other diagram tools; copying a group and numbered steps were built on 2026-10-16.

**Tasks:**

- ⬜ Decide the form: The owner chooses what one operation may combine.
- ⬜ Test the candidates: A candidate stays only if a round shows it helps.

**Delivers:**

- [F3.7: More combinations of operations](../features/F3-editing.md#f37-more-combinations-of-operations)

**Exit criteria:** none yet.

### CP6.5: Checks of an agent's own

**Status:** ⬜

Rules a diagram sets itself, once a real need shows which ones.

**Tasks:**

- ⬜ Rules a diagram sets itself: An object or a type marks a rule that warns or refuses.

**Delivers:**

- [F5.5: Checks of an agent's own](../features/F5-checking.md#f55-checks-of-an-agents-own)

**Exit criteria:** none yet.
