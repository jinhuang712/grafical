# Roadmap

**Current checkpoint:** [CP2: Drawing more](#cp2-drawing-more). The work now is [CP2.5: Nodes](#cp25-nodes), then [CP2.6: Regions](#cp26-regions) and [CP2.7: The legend](#cp27-the-legend).

The work comes in four groups of what grafical can do: draw at all · draw more · draw well · draw the hardest pictures. A release follows once the MVP bar is met. Within a group the numbers are the order of the work.

## Summary

```
Roadmap
├── ✅ CP1: Drawing at all — what an agent needs to draw with grafical alone
│   ├── ✅ CP1.1: The risky questions — the same pixels on macOS and Linux
│   │   ├── ✅ Our own gap router
│   │   ├── ✅ Text shaping
│   │   ├── ✅ Chinese font subset
│   │   ├── ✅ The npm name
│   │   ├── ✅ Same pixels on both systems
│   │   └── ✅ Package, tests and CI
│   ├── ✅ CP1.2: The loop — a few commands draw a service and its database
│   │   ├── ✅ First operations
│   │   ├── ✅ First render
│   │   ├── ✅ The public brief
│   │   ├── ✅ The full operation set
│   │   ├── ✅ `show`
│   │   ├── ✅ The live viewer
│   │   ├── ✅ New edge types
│   │   └── ✅ Flowchart and state machine types
│   ├── ✅ CP1.3: Stability — a new node leaves every other fact as it was
│   │   ├── ✅ `diff`
│   │   ├── ✅ The stability rule
│   │   └── ✅ `--try`
│   ├── ✅ CP1.4: Replies an agent can act on — records and refusals that name the way out
│   │   ├── ✅ The help
│   │   ├── ✅ Help in place of `grafical guide`
│   │   ├── ✅ Records
│   │   ├── ✅ Every order stated
│   │   ├── ✅ Blocks that name the way out
│   │   ├── ✅ Warnings on every write
│   │   ├── ✅ One entry page of help
│   │   └── ✅ A wrong command names the right one
│   ├── ✅ CP1.5: Speed — 50 ms an operation
│   │   ├── ✅ No slot search
│   │   └── ✅ The worst operation measured
│   ├── ✅ CP1.6: One form for the command line — `grafical -f <file> <noun> --<verb>`
│   │   ├── ✅ The file flag
│   │   ├── ✅ One name for each thing
│   │   ├── ✅ Verbs as flags
│   │   └── ✅ One way for each situation
│   └── ✅ CP1.7: The file form — objects with types and styles
│       ├── ✅ Design the model and its form
│       ├── ✅ Build the model
│       ├── ✅ Stylesheets as .grafical files
│       ├── ✅ The colon after an attribute
│       ├── ✅ The README's pictures in the file form
│       └── ✅ No YAML diagram
├── 🟨 CP2: Drawing more — what a picture can hold
│   ├── ✅ CP2.1: Containers — groups · lanes · walls · notes
│   │   ├── ✅ Edges that end at containers
│   │   ├── ✅ Swimlanes
│   │   ├── ✅ Nested groups
│   │   ├── ✅ Walls
│   │   ├── ✅ Notes
│   │   ├── ✅ Copying a group
│   │   └── ✅ Bar names clear of edges
│   ├── ✅ CP2.2: Placement facts — alignment · columns · steps
│   │   ├── ✅ Equal heights in a layer
│   │   ├── ✅ Columns
│   │   ├── ✅ Steps from another node
│   │   └── ✅ Optional layer labels
│   ├── ✅ CP2.3: Kinds of edge — any side · weights · step numbers
│   │   ├── ✅ Edges on any side
│   │   ├── ✅ Hops and dots
│   │   ├── ✅ Edge weights
│   │   ├── ✅ Step numbers
│   │   └── ✅ Edge sides
│   ├── ✅ CP2.4: Commands and styles — one command is one write and styles set spacing
│   │   ├── ✅ One command is one write
│   │   ├── ✅ A `diff` that replays
│   │   ├── ✅ A typo that makes an object
│   │   ├── ✅ `--set` on every noun
│   │   ├── ✅ Answers that say what happened
│   │   └── ✅ Styles set spacing
│   ├── 🟨 CP2.5: Nodes — a node takes a multiple of its size, an object holds a style's attributes and marks stay clear of edges
│   │   ├── ✅ Marks
│   │   ├── ✅ Attributes on the object
│   │   ├── ⬜ Size multiples
│   │   └── ⬜ Corner marks checked
│   ├── ⬜ CP2.6: Regions — every region carries its label and a bar runs across a group
│   │   ├── ⬜ Column headings
│   │   └── ⬜ Bars across groups
│   └── 🟨 CP2.7: The legend — a key the agent lays out as a small diagram
│       ├── ✅ The richer legend
│       ├── ⬜ Design the legend
│       └── ⬜ Build the legend
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
│   ├── 🟨 CP3.2: Steering an edge — passage · trunk · shape
│   │   ├── ✅ Edge shapes
│   │   ├── ✅ `--with`
│   │   ├── ✅ `--via`
│   │   ├── ⬜ The canvas grows for every route
│   │   └── ⬜ A curve end to end
│   ├── 🟨 CP3.3: Looks — colors and labels of every object
│   │   ├── ✅ Node looks
│   │   ├── ✅ Edge looks
│   │   ├── ✅ Container looks
│   │   ├── ✅ Region labels
│   │   ├── ✅ Label looks
│   │   ├── 🟨 Label text
│   │   ├── ⬜ Looks for every label
│   │   ├── ⬜ Every look in a style
│   │   └── ⬜ Colors by hue
│   ├── 🟨 CP3.4: Rearranging in one command — one move takes `same-layer-pair` from 3 crossings to 0
│   │   ├── ⬜ What a move needs
│   │   ├── ✅ Moving
│   │   ├── ✅ A layer's whole order
│   │   ├── ⬜ How freely an agent adjusts a picture
│   │   └── ⬜ A parent off the middle of its children
│   ├── ⬜ CP3.5: A check before stopping — the agent looks at its picture against a list
│   │   └── ⬜ A check before stopping
│   ├── 🟨 CP3.6: Clean edges and labels — the places given draw clean
│   │   ├── ✅ Labels on straight edges
│   │   ├── ✅ Choice diamonds
│   │   ├── ✅ Footnote numbers
│   │   ├── ✅ Routing cases
│   │   ├── 🟨 Labels on edges
│   │   ├── 🟨 Clean edges
│   │   ├── ⬜ What clean edges leave open
│   │   ├── ⬜ Labels in a crowded gutter
│   │   ├── ⬜ Seven labels off their edges
│   │   ├── ⬜ A label on a short run
│   │   ├── ⬜ A hidden arrowhead
│   │   ├── ⬜ A diamond's slanted edges
│   │   ├── ⬜ Badges off a lane's side
│   │   ├── ⬜ Return edges off a self-loop
│   │   └── ⬜ Even ports
│   └── ⬜ CP3.7: Steering proven — each fact shown to help on a picture that needs it
│       ├── ⬜ `--straight`
│       ├── ⬜ `--bend`
│       └── ⬜ `--stretch`
├── 🟨 CP4: The hardest pictures — every kind of diagram measured with a model
│   ├── ✅ CP4.1: The stage 1 round — Haiku rated 24 of 25 on the public brief
│   │   ├── ✅ The first round
│   │   └── ✅ The rerun
│   ├── 🟨 CP4.2: Errors and cost — cheaper and faster than drawing directly
│   │   ├── ✅ Fewer blocked labels
│   │   ├── ⬜ Measure the rate in a round
│   │   ├── ⬜ Find where Haiku's tokens go
│   │   ├── ⬜ Cut the cost of a first draft
│   │   ├── ⬜ What the first report run asked
│   │   ├── ✅ An edge ID in a shell
│   │   └── ⬜ A render that hung
│   ├── ⬜ CP4.3: Copying a picture — someone else's picture redrawn better
│   │   ├── ⬜ Choose the reference pictures
│   │   ├── ⬜ Hand an agent a picture
│   │   └── ⬜ Copy reference pictures
│   ├── 🟨 CP4.4: The MVP bar — one round says whether grafical succeeds
│   │   ├── ✅ Run Opus at xhigh effort
│   │   ├── ⬜ Measure the context added
│   │   ├── ⬜ Private reference brief
│   │   └── ⬜ Taste and the sixteen points
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
    │   ├── ⬜ Entity-relationship and class diagrams
    │   └── ⬜ A name for a diagram's type
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
    ├── ⬜ CP6.5: Checks of an agent's own
    │   └── ⬜ Rules a diagram sets itself
    ├── ⬜ CP6.6: Documents to their guides
    │   └── ⬜ What the check of 2026-11-09 left
    ├── ⬜ CP6.7: Other outputs
    │   ├── ⬜ An HTML export
    │   └── ⬜ An SVG a model can tune
    ├── ⬜ CP6.8: Direction and views
    │   ├── ⬜ Flow direction
    │   ├── ⬜ Views of one file
    │   └── ⬜ Folded groups
    ├── ⬜ CP6.9: More on nodes and containers
    │   ├── ⬜ Marks by name
    │   ├── ⬜ Lanes both ways
    │   └── ⬜ Deeper nesting
    └── ⬜ CP6.10: Off the grid
        ├── ⬜ The space the router works in
        └── ⬜ Offsets
```

## CP1: Drawing at all

**Status:** ✅ (2026-10-11 to 2026-11-09)

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
- ✅ First render: A diagram file gives a picture.
- ✅ The public brief: An agent built the public brief with operations alone, with no defect.
- ✅ The full operation set: Every editing operation of stage 1 exists.
- ✅ `show`: The diagram prints as facts.
- ✅ The live viewer: A window redraws on every change.
- ✅ New edge types: Edges gained new types.
- ✅ Flowchart and state machine types: Nodes gained the types of these diagrams.

**Delivers:**

- [F2.1: Placing every node](../features/F2-layout.md#f21-placing-every-node)
- [F2.2: Layers and order](../features/F2-layout.md#f22-layers-and-order)
- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.3: IDs](../features/F3-editing.md#f33-ids)
- [F6.2: Render](../features/F6-output.md#f62-render)
- [F5.1: Show](../features/F5-checking.md#f51-show)
- [F6.3: Live viewer](../features/F6-output.md#f63-live-viewer)
- [F1.1.2: Labels and sublabels](../features/F1-elements.md#f112-labels-and-sublabels)
- [F1.2.1: Types](../features/F1-elements.md#f121-types)
- [F1.2.2: Arrowheads at both ends](../features/F1-elements.md#f122-arrowheads-at-both-ends)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP1.3: Stability

**Status:** ✅ (2026-10-12 to 2026-10-14)

The stability rule enforced by tests, a change printed as command lines, and a change tried before it is written (`bench/results/phase2.md`).

**Tasks:**

- ✅ `diff`: A change prints as command lines.
- ✅ The stability rule: Tests enforce the stability rule.
- ✅ `--try`: A change can be tried before it is written.

**Delivers:**

- [F6.4: Diff](../features/F6-output.md#f64-diff)
- [F3.2: Trying a change](../features/F3-editing.md#f32-trying-a-change)

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
- ✅ Warnings on every write: A write reports the warnings it brings and clears.
- ✅ One entry page of help: One page opens the help.
- ✅ A wrong command names the right one: A wrong command prints the right one.

**Delivers:**

- [F3.4: Refusals](../features/F3-editing.md#f34-refusals)
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

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability): ✅ 2026-11-08, the stability tests passed.

### CP1.7: The file form

**Status:** ✅ (2026-11-06 to 2026-11-09)

A diagram is objects with types and styles, in a form of its own, before the first release freezes the file.

**Tasks:**

- ✅ Design the model and its form: The owner designed them on 2026-11-06.
- ✅ Build the model: grafical reads and writes the form · styles · types · `like`.
- ✅ Stylesheets as .grafical files: The built-in stylesheets are `.grafical` files that `grafical library` lists, a stylesheet of one's own starts from one, and no value of a look is written in the code (2026-11-09).
- ✅ The colon after an attribute: The owner kept it on 2026-11-09, since only a change to what the file already holds must come before the release.
- ✅ The README's pictures in the file form: Both pictures are drawn from `.grafical` files (2026-11-09).
- ✅ No YAML diagram: grafical reads and writes a diagram only in the file form, every alias kept for old saved runs went, and `bench diff` lays out the fixtures and the fuzz seeds (2026-11-09).

**Delivers:**

- [F6.1: The diagram file](../features/F6-output.md#f61-the-diagram-file)
- [F6.1.1: The object model](../features/F6-output.md#f611-the-object-model)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability): ✅ 2026-11-09, the stability tests passed.
  - [R3: Determinism](GOALS.md#r3-determinism): ✅ 2026-11-09, CI run 42601744905 drew the same pixels on macOS and Linux.
  - [R4: A sound file](GOALS.md#r4-a-sound-file): ✅ 2026-11-09, the 9 tests of the file form passed.
- **Do not hold the release**
  - [M4: Diff size](GOALS.md#m4-diff-size): 17.3 changed lines a change step on 2026-11-06.

## CP2: Drawing more

**Status:** 🟨

What a picture can hold grows. A test and a fixture accept each item, with no model run.

**Exit criteria:**

- **Sub-checkpoints**
  - [CP2.1: Containers](#cp21-containers) is met.
  - [CP2.2: Placement facts](#cp22-placement-facts) is met.
  - [CP2.3: Kinds of edge](#cp23-kinds-of-edge) is met.
  - [CP2.4: Commands and styles](#cp24-commands-and-styles) is met.
  - [CP2.5: Nodes](#cp25-nodes) is met.
  - [CP2.6: Regions](#cp26-regions) is met.
  - [CP2.7: The legend](#cp27-the-legend) is met.

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

**Delivers:**

- [F2.3: Alignment](../features/F2-layout.md#f23-alignment)

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

### CP2.4: Commands and styles

**Status:** ✅ (2026-11-10)

One command is one write, every noun makes or changes an object with `--set`, and styles set spacing as CSS does.

**Tasks:**

- ✅ One command is one write: `apply` · batch files · `try` went, every write takes `--try` and `diff` prints command lines (2026-11-10).
- ✅ A `diff` that replays: `diff` orders its lines so that each leaves a diagram the model accepts, and only a picture in between that would draw wrong refuses one, which the owner holds as expected (2026-11-10).
  - Of 90 fuzz diagrams replayed from an empty file, 7 are refused partway against 12 before: `title-blocked` 5 · `label-blocked` 2.
  - At the model level 0 of the diff test's 120 replays fail against 9, and 7 of 900 where a node placed by steps moves with the column grid.
  - A fuzz test keeps the list of refused seeds, which may only shrink.
- ✅ A typo that makes an object: `--set` on a mistyped ID still makes a new object, and the answer now says `MADE` where the agent meant a change (2026-11-10).
  - Refusing a new ID near an existing one was not chosen, since it guesses what the agent meant.
- ✅ `--set` on every noun: Every noun takes `--set` · `--move` · `--remove`, and the model's operations are the commands (2026-11-10).
- ✅ Answers that say what happened: Every answer starts with a keyword and gives its records in tagged sections, and a write names what it made, changed and removed and only the warnings it brought or cleared (2026-11-10).
  - A write now lays out the diagram as it was before, and one operation at 50 nodes takes up to 87.3 ms against the 50 ms of T2: Speed.
  - Related: decision 108 "An answer says what happened, and a write reports only what it changed".
- ✅ Styles set spacing: a margin on each side · `row-gap` · `column-gap` · `--style` in four forms · `--stylesheet`, and density and `gap` went (2026-11-10).
  - The default stylesheet and `compact` draw every fixture and fuzz seed as before, and `airy` draws 243 of 2000 seeds shorter.

**Delivers:**

- [F3.1: Operations](../features/F3-editing.md#f31-operations)
- [F3.2: Trying a change](../features/F3-editing.md#f32-trying-a-change)
- [F6.4: Diff](../features/F6-output.md#f64-diff)
- [F2.6: Spacing](../features/F2-layout.md#f26-spacing)
- [F3.7: Moving](../features/F3-editing.md#f37-moving)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability): ✅ 2026-11-10, the stability tests passed.
  - [R4: A sound file](GOALS.md#r4-a-sound-file): ✅ 2026-11-10, the tests of the file form passed.

### CP2.5: Nodes

**Status:** 🟨

A node takes a multiple of its size, any object holds the attributes of a style itself, and a node's marks stay clear of the edges beside them.

**Tasks:**

- ✅ Marks: A node carries small marks.
- ✅ Attributes on the object: Every attribute of a style is set on an object it fits with a flag of its name, beats the object's styles and means the same on every object (2026-11-10).
  - A lane's and a column's margins now give room outside their own box instead of reaching their members, and every region takes all four sides.
  - 18 fixtures and 300 fuzz seeds laid out as before.
  - Related: decision 109 "Every attribute of a style may be set on the object itself" · decision 111 "An attribute means the same on every object it fits".
- ⬜ Size multiples: `width` · `height` take 0.75 · 1.25 · 1.5 · 2 on a node or in a style, and only the node named grows.
  - Next: build it, and show the owner each shape in a picture before its rule is written down.
  - Related: decision 080 "A node's width and height take a multiple of its size".
- ⬜ Corner marks checked: A corner mark is checked against nearby edges.

**Delivers:**

- [F1.1.6: Emphasis](../features/F1-elements.md#f116-emphasis)
- [F1.1.3: Sizes](../features/F1-elements.md#f113-sizes)
- [F1.1.8: Size multiples](../features/F1-elements.md#f118-size-multiples)
- [F1.1.4: Marks](../features/F1-elements.md#f114-marks)
- [F1.1.7: Node looks](../features/F1-elements.md#f117-node-looks)
- [F1.2.6: Edge looks](../features/F1-elements.md#f126-edge-looks)
- [F1.3.8: Container looks](../features/F1-elements.md#f138-container-looks)
- [F2.6: Spacing](../features/F2-layout.md#f26-spacing)
- [F4.8: Label looks](../features/F4-look.md#f48-label-looks)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.6: Regions

**Status:** ⬜

Every region carries its label, and a bar runs across a group. A column is the one region with no label yet.

**Tasks:**

- ⬜ Column headings: A column carries a heading above its first layer.
- ⬜ Bars across groups: A bar crosses a group's node and overlaps no node or label.

**Delivers:**

- [F2.4: Columns](../features/F2-layout.md#f24-columns)
- [F2.4.1: Column headings](../features/F2-layout.md#f241-column-headings)
- [F4.7: Region labels](../features/F4-look.md#f47-region-labels)
- [F1.2.5: Ends at a group, a layer or a lane](../features/F1-elements.md#f125-ends-at-a-group-a-layer-or-a-lane)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP2.7: The legend

**Status:** 🟨

An agent lays out its legend as a small diagram, and it can explain what a picture's colors mean.

**Tasks:**

- ✅ The richer legend: The legend covers styles, widths and marks.
- ⬜ Design the legend: The owner designs it as a small diagram: what goes in it · how its entries run · how each sample is drawn.
  - A picture may have one legend or none, and its entries may run across, down or in a grid.
  - `legend --set` explains line styles and widths and marks but not a node's fill.
  - A key of small nodes such as "Works" and "Bug" and "Fixed" is drawn as a group of plain nodes.
  - Every one of them gets `lonely-node`, six warnings for a picture that is right.
  - Related: decision 057 "A node may take a look of its own".
- ⬜ Build the legend: The design is built.

**Delivers:**

- [F4.2: Legend](../features/F4-look.md#f42-legend)
- [F4.2.1: A legend as a small diagram](../features/F4-look.md#f421-a-legend-as-a-small-diagram)

**Exit criteria:**

- **Constraints**
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

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
  - [CP3.7: Steering proven](#cp37-steering-proven) is met.

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

- [F4.1: Title, subtitle and caption](../features/F4-look.md#f41-title-subtitle-and-caption)
- [F4.3: Built-in stylesheets](../features/F4-look.md#f43-built-in-stylesheets)
- [F4.4: A stylesheet of your own](../features/F4-look.md#f44-a-stylesheet-of-your-own)

**Exit criteria:** none, since it was built before the goals were written on 2026-10-15.

### CP3.2: Steering an edge

**Status:** 🟨 (since 2026-11-06)

A strong model steers an edge with facts and draws it square or round.

**Tasks:**

- ✅ Edge shapes: A command draws edges square or round.
- ✅ `--with`: An edge joins another's trunk, which draws a tree with one spine.
- ✅ `--via`: An edge passes a stated object on a stated side.
- ⬜ The canvas grows for every route: A step after routing grows the canvas as layout does.
- ⬜ A curve end to end: A third edge shape with no straight run, and what happens when it meets what lies beside it.
  - Edges are drawn square or round today.
  - A curve through a route's points cuts corners and can meet what lies beside it.
  - Next: the owner designs it.
  - Related: decision 059 "Edges may be drawn square or round".

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

- ✅ Node looks: A node takes its colors from the styles it marks.
- ✅ Edge looks: An edge takes its color from the styles it marks.
- ✅ Container looks: A group or a lane takes its colors from the styles it marks.
- ✅ Region labels: The label of a diagram · a group · a layer · a lane sits at a fraction, and a column's waits for Column headings.
- ✅ Label looks: An edge's label marks a style for its background, border and color.
- 🟨 Label text: An agent sets the breaks and alignment of the label of a node · an edge · a wall · a lane · a note, and the titles of regions stay one line.
- ⬜ Looks for every label: The label of a node · a group · a lane marks a style as an edge's label does.
- ⬜ Every look in a style: `<style>` holds fill · border · border-width · color · weight, and grows to every look grafical draws.
- ⬜ Colors by hue: Every built-in stylesheet holds `red` · `amber` · `green` · `blue` · `purple` · `gray`, each drawn to read on its own ground.
  - Next: show the owner each hue on each built-in stylesheet in a picture before its values are kept.
  - Related: decision 110 "Built-in styles name colors by hue, and each stylesheet draws them its own way".

**Delivers:**

- [F1.1.7: Node looks](../features/F1-elements.md#f117-node-looks)
- [F1.2.6: Edge looks](../features/F1-elements.md#f126-edge-looks)
- [F1.3.8: Container looks](../features/F1-elements.md#f138-container-looks)
- [F4.6: Label text](../features/F4-look.md#f46-label-text)
- [F4.8: Label looks](../features/F4-look.md#f48-label-looks)
- [F4.3: Built-in stylesheets](../features/F4-look.md#f43-built-in-stylesheets)

**Exit criteria:**

- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)
  - [R2: Mechanical defects](GOALS.md#r2-mechanical-defects)

### CP3.4: Rearranging in one command

**Status:** 🟨 (since 2026-11-07)

The agent fixes a picture by placing nodes, so a move costs one command and shows its effect before the write. On `same-layer-pair` one move of C took crossings from 3 to 0. What a move needs is not settled yet.

**Tasks:**

- ⬜ What a move needs: A move costs one command and shows its effect before the write.
  - Placement alone took `same-layer-pair` · `swapped-pair` · `crowded-gutter` · `ladder` to no crossing with no change to the router.
  - A Haiku session spent its fixes on the order of a layer and could not state the whole order at once.
  - Swap · spacing · order take many nodes in one command and never pair by pair.
  - Open: whether the hand drawings in `plan/evidence/worst-four-cases.png` become the target pictures.
  - Evidence: `plan/evidence/ladder-options.png` · `plan/evidence/two-layers-skip-outside.png`.
  - Related: decision 033 "The agent states every order".
- ✅ Moving: Every noun with a place takes `--move`, and `edge --set` sets an edge's ends (2026-11-10).
- ✅ A layer's whole order: `node --move` with every node of a layer states its order (2026-11-10).
- ⬜ How freely an agent adjusts a picture: Where a node sits beside another · where notes and step badges sit.
  - The owner takes this one dimension at a time, and each decided one is a decision.
  - Next: the owner names the next dimension when a real picture shows a gap.
  - Related: decision 055 "A weak model draws well and a stronger one superbly".
- ⬜ A parent off the middle of its children: `tree` and `pyramid` read wrong because the grid packs nodes to the left.
  - The cases draw well by their counts and read wrong.
  - This is placement and not routing, so the cases may need a class and a number of their own.
  - An offset moves one node at a time, which is much work for a whole pyramid.

**Delivers:**

- [F3.7: Moving](../features/F3-editing.md#f37-moving)
- [F3.5: Merging](../features/F3-editing.md#f35-merging)

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

The engine draws clean edges and labels for the places the agent gives. Drawing reference diagrams with grafical's own commands showed where a picture still looks wrong though no check fails, and the owner's notes on each round's pictures decide what comes next.

**Tasks:**

- ✅ Labels on straight edges: A label sits on its own straight vertical edge.
- ✅ Choice diamonds: `choice` is a small diamond for an edge that splits.
- ✅ Footnote numbers: A footnote's number stays wholly inside or outside a container.
- ✅ Routing cases: `pnpm bench routes` compares 29 small cases with a saved baseline.
- 🟨 Labels on edges: An edge carries its label by default, and edges do not yet move apart for one.
- 🟨 Clean edges: Edges meet the rules set on 2026-11-07, built on the router as it is.
  - ✅ An edge runs at least 16 px from a node to the first track of a gutter (2026-11-08).
  - ⬜ The end run beside a gap · the level swap · a side to a side across layers · a way round the outside.
- ⬜ What clean edges leave open: A shared run that implies a false edge · a narrow gap where another route reads · the least end run of a main edge.
  - Placement widens a gap for an edge through an empty column, while decision 097 says the router never widens a gap.
  - A stated top in the first layer and a side `via` on a tight layer are refused by how the router is built.
  - Open: edges share a run only if every start-to-end pair it implies is a real edge, and whether false edges count as a hard number.
  - Open: the least end run of a main edge, where 20 px was proposed.
  - Evidence: `plan/evidence/end-runs.png` · `plan/evidence/two-layers-skip-jogs.png` · `plan/evidence/false-line.png`.
  - Related: decision 095 "A good route is one the eye can follow".
- ⬜ Labels in a crowded gutter: Labels sit 4 px from the next edge, and two attempts at 8 px made pictures larger or added crossings.
  - Four labelled edges out of one node run side by side in one gutter, and the picture reads crowded though no warning fires.
  - Asking for 8 px everywhere made 421 of 500 fuzz diagrams 5.5% taller and the dispatch fixture 2 crossings worse.
  - Asking for 8 px only where a label finds room left the dispatch fixture 4 crossings worse.
  - An empty layer between the two layers only lengthened the edges.
  - Neither try was landed.
  - Next: look again now that labels sit on their edges.
  - Related: decision 066 "An edge's label sits on its edge".
- ⬜ Seven labels off their edges: 7 of the 54 labels of the fixtures stay off their edges.
  - F2.7.3 "Labels on edges" still lists edges that move apart for a label.
  - Classifying the seven costs nothing and comes before any change to the router.
- ⬜ A label on a short run: The `resync` label of the catalog-sync-grouped fixture takes most of its run.
  - The edge shows only two short pieces past the label, and the owner finds it less natural than the others.
  - A seat on a run keeps 8 px from each corner today.
  - Next: try a larger clearance, and a label with a fill now that labels mark styles.
- ⬜ A hidden arrowhead: The dashed edge at the far left of the dispatch fixture barely shows its arrowhead.
  - The edge runs from `push-provider` up the picture's edge and turns into the left side of `rider-app` at the very end.
  - The cause is not known.
  - Next: render it with square edges to see whether the route hides the arrowhead.
- ⬜ A diamond's slanted edges: An edge meets a diamond only at a corner, measured with `pnpm bench diff` before it lands.
- ⬜ Badges off a lane's side: A step's badge keeps off a lane's side, and `step-collision` counts one that touches it.
- ⬜ Return edges off a self-loop: The edges that leave and enter a node keep clear of its self-loop.
- ⬜ Even ports: One port sits at the middle of a side and k ports at its k+1 even shares, and a try is parked on the branch `wt-centred-ports`.
  - The owner saw arrowheads far from the middle of a side and several on one side spread unevenly, on the dispatch fixture.
  - The code spreads ports evenly first and then pulls each toward the x its edge wants.
  - The features say "spread evenly" today.

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

### CP3.7: Steering proven

**Status:** ⬜

Three facts that steer an edge are built, and no picture has shown that any of them helps. The owner keeps them as needed, and each is tried on a picture that needs it once rearranging is built.

**Tasks:**

- ⬜ `--straight`: A picture where an edge with no bend reads better.
- ⬜ `--bend`: A picture where a stated turn reads better.
- ⬜ `--stretch`: A picture where a wider detour reads better.

**Delivers:**

- [F2.7.6: Straight edges](../features/F2-layout.md#f276-straight-edges)
- [F2.7.7: Bends](../features/F2-layout.md#f277-bends)
- [F2.7.8: Stretches](../features/F2-layout.md#f278-stretches)

**Exit criteria:**

- **Objectives**
  - [O6: A picture reads at a glance](GOALS.md#o6-a-picture-reads-at-a-glance)
- **Constraints**
  - [R1: Stability](GOALS.md#r1-stability)

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
- ⬜ What the first report run asked: The two sessions of 2026-11-06 compared counts by hand · read a refusal as the fix · spent 782 s on a render of 0.24 s.
  - A Haiku session on the catalog-sync brief spent its fixes on the order of a layer and could not state it whole.
  - It compared the `counts` of two writes by hand to see whether crossings fell.
  - It read `unquoted-text` as naming the field and not the fix.
  - `render` writes the SVG beside the PNG though it asked for neither by name.
  - The session took 782 s on a render of 0.24 s, and where that time went is not known.
  - Its picture has 17 crossings, and it did not widen a gap, place a label or state a side.
  - A second run followed `diagram.grafical` and wrote `last: true` on every node.
  - It did not see layer labels in its picture, since a layer is not drawn.
  - `passing-layer` named the problem and gave it no move to make.
  - It could not see the trade between width and crossings, though `--try` shows it.
  - The numbers of both runs are in `bench/results/report-2026-11-06.md`.
- ✅ An edge ID in a shell: An edge's ID follows the rule of every other ID, so no `->` reaches a shell (2026-11-10).
  - An unquoted `->` in an edge ID had made zsh write a stray file.
- ⬜ A render that hung: An agent reported it once on 2026-11-09, and it was not reproduced.
  - Next: render that run's diagram again and time it.

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
- ⬜ Taste and the sixteen points: The owner says whether symmetry and even space fit the stance on taste.
  - PHILOSOPHY holds that no score settles a picture for everyone and that grafical does not supply the taste.
  - Whether a small model can see these faults is not measured.
  - Related: decision 098 "A picture is judged by how it reads".

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
- ⬜ A name for a diagram's type: A diagram's optional type and a node's `type` share a word, and the first needs a name of its own.

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

- [F3.6: More combinations of operations](../features/F3-editing.md#f36-more-combinations-of-operations)

**Exit criteria:** none yet.

### CP6.5: Checks of an agent's own

**Status:** ⬜

Rules a diagram sets itself, once a real need shows which ones.

**Tasks:**

- ⬜ Rules a diagram sets itself: An object or a type marks a rule that warns or refuses.

**Delivers:**

- [F5.5: Checks of an agent's own](../features/F5-checking.md#f55-checks-of-an-agents-own)

**Exit criteria:** none yet.

### CP6.6: Documents to their guides

**Status:** ⬜

The check of the core documents on 2026-11-09 left points that are not settled. How each is done is not decided.

**Tasks:**

- ⬜ What the check of 2026-11-09 left:
  - The goals' numbers have gaps.
  - Guideline 14 repeats a stance of the philosophy word for word.
  - Guidelines 5 and 6 name mechanisms.
  - The feature files list flags that CLI.md holds.
  - About 70 lines repeat "and" or "or".

**Exit criteria:** none yet.

### CP6.7: Other outputs

**Status:** ⬜

Outputs past SVG and PNG that the owner wants.

**Tasks:**

- ⬜ An HTML export: A diagram exported as HTML.
  - The owner wants it.
- ⬜ An SVG a model can tune: An exported SVG with IDs and groups that a model may tune by the pixel after grafical stops.
  - `render --svg` writes no ID on any element and no group, so a model cannot tell one path from another.
  - Its text names the font `Inter`, so another machine may draw it differently.
  - A tuned SVG is lost at the next `render`, since the file stores no position.
  - The philosophy says "Nobody places anything by the pixel", and only the owner can say how this sits with it.

**Exit criteria:** none yet.

### CP6.8: Direction and views

**Status:** ⬜

Other ways to read one diagram, which build on the nesting of [CP6.9: More on nodes and containers](#cp69-more-on-nodes-and-containers).

**Tasks:**

- ⬜ Flow direction: A diagram that reads left to right.
- ⬜ Views of one file: Several pictures of parts of one file.
- ⬜ Folded groups: A group drawn folded into one node in a view.

**Delivers:**

- [F2.8: Flow direction](../features/F2-layout.md#f28-flow-direction)
- [F10.1: Views of one file](../features/F10-many-views.md#f101-views-of-one-file)
- [F10.2: Folded groups](../features/F10-many-views.md#f102-folded-groups)

**Exit criteria:** none yet.

### CP6.9: More on nodes and containers

**Status:** ⬜

Marks by name, lanes that run both ways and groups nested five deep, once a real picture needs them.

**Tasks:**

- ⬜ Marks by name: A mark can be taken by name.
- ⬜ Lanes both ways: Lanes that run as layers and as columns in one diagram.
- ⬜ Deeper nesting: Groups up to five levels, with the fuzz test holding at five levels.

**Delivers:**

- [F1.1.5: Marks by name](../features/F1-elements.md#f115-marks-by-name)
- [F1.3.5: Lanes both ways](../features/F1-elements.md#f135-lanes-both-ways)
- [F1.3.3: Deeper nesting](../features/F1-elements.md#f133-deeper-nesting)

**Exit criteria:** none yet.

### CP6.10: Off the grid

**Status:** ⬜

A node off its cell, which waits for a router that works outside the layers and the gutters.

**Tasks:**

- ⬜ The space the router works in: The router sees nodes only in layers and runs only on a gutter's tracks, and offsets down · lanes both ways · copied pictures ask for more.
  - A router over the open space would reach them and would have to win back stability and speed.
  - A search trial on 2026-11-07 cut crossings, and its pictures read worse.
  - A spike of decision 093 "A node may sit off its cell by a fraction" on 2026-11-07 drew offsets across with no defect.
  - In that spike offsets down ran edges through nodes.
  - Next: once rearranging is built, list what each planned capability still needs of the space.
  - Related: decision 005 "Our own gap router".
- ⬜ Offsets: A node sits a fraction of a cell off the grid, once the router allows it.

**Delivers:**

- [F2.5: Steps from another node](../features/F2-layout.md#f25-steps-from-another-node)
- [F2.5.1: Offsets](../features/F2-layout.md#f251-offsets)

**Exit criteria:** none yet.
