# F5: Checking

```
F5: Checking
├── F5.1: Show — the diagram as facts
├── F5.2: Counts — facts about how the picture is drawn
├── F5.3: Warnings — what the picture draws poorly
│   ├── F5.3.1: Bent edges — `bent-edge`
│   ├── F5.3.2: Edges passing a layer — `passing-layer`
│   ├── F5.3.3: Edges across a group — `edge-across-group`
│   ├── F5.3.4: Tight edges — `tight-edges`
│   ├── F5.3.5: Crowded labels — `crowded-label`
│   ├── F5.3.6: Lonely nodes — `lonely-node`
│   ├── F5.3.7: An edge per member — `edge-per-member`
│   ├── F5.3.8: Crossings — `crossing`
│   └── F5.3.9: Nodes aside — `node-aside`
├── F5.4: Check — defects, warnings and counts on demand
└── F5.5: Checks of an agent's own — rules a diagram sets itself
```

How an agent knows a diagram came out right. It reads the diagram as facts, counts and warnings, and checks the file on demand.

## F5.1: Show

The agent's view of a diagram, in place of reading the file.

```sh
grafical -f <file> show [<id>] [--drawn]
```

- `show` prints the diagram in the same words as the operations.
  - It lists the layers and the nodes in order and the groups and the lanes and the edges and the walls and the notes and the marks.
- `show --drawn` prints how the picture is drawn, as records with no advice:
  - Each node's layer and place and size and edges by side.
  - Each edge's sides and bends and length and shortest length and layers skipped and edges crossed and layers passed.
  - Each wall's length and the edges through it.
  - One `gutter` record for each pair of neighbouring layers: `gutter above=<layer> below=<layer> edges=<n> crossings=<n> tight=<n> crowded=<n>`.
    - It counts the edges with a run between the two layers and the crossings and tight pairs and crowded labels there.
    - It shows the agent which choice of layers costs.
  - How each note is drawn.
  - The edges bundled together, and the totals.

- **Design:**
  - [8. Answers are data a script can read](../DESIGNS.md#8-answers-are-data-a-script-can-read)
  - [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [021. The help as the reference](../specs/decisions/021-the-help-as-the-reference.md)
  - [022. Records over prose](../specs/decisions/022-records-over-prose.md)

**Stories:**

- An agent reads the diagram as facts, to see what it drew without reading the file.

## F5.2: Counts

After `apply`, `check` and `render`, grafical prints the drawing's counts as one record:

```text
counts nodes=3 edges=2 crossings=0 bends=1 bent=0 length=224 width=368 height=280 fullest=data:2 busiest=api:2 longest=api->cache:176 passing=0 across=0 tight=0 crowded=0
```

They are facts, with no threshold and no advice: what they mean is the agent's to judge.

Five counts say how the picture is drawn, and each place they count is also a warning in [F5.3: Warnings](#f53-warnings):

- `bent` counts the edges drawn with more than two bends.
- `passing` counts the edges that run through a layer they do not connect.
- `across` counts the edges that cross the frame of a group holding neither of their ends.
- `tight` counts the pairs of runs of two edges closer than 12 px for more than 100 px.
  - Two runs of one bundle are left out.
- `crowded` counts the edge labels with less than 8 px of room on two or more sides.

- **Stance:** [Who owns what?](../PHILOSOPHY.md#who-owns-what)
- **Design:** [8. Answers are data a script can read](../DESIGNS.md#8-answers-are-data-a-script-can-read)
- **How it works:** [The checker](../specs/checks.md)
- **Why:**
  - [022. Records over prose](../specs/decisions/022-records-over-prose.md)
  - [036. Composition counts](../specs/decisions/036-composition-counts.md)

**Stories:**

- An agent reads the counts after a write, to know how the picture is drawn.

## F5.3: Warnings

Every write prints a warning block for each thing the picture draws poorly, and never refuses for one.

- Single commands print them too, and so do `check` and `render`.
- The warnings come before the counts.
- All of them print every time, since every change lays the whole diagram out again.

A warning has no source: the outcome edge names what the write changed, and a warning names the ids it is about ([048. Every write prints every warning](../specs/decisions/048-every-write-prints-every-warning.md)):

```text
ok changed=sync->geo

warning: bent-edge
description: An edge bends more than twice, mostly because it skips layers.
detail:
  edge: sync->geo
  bends: 3
  skip: 1
next: layer --move, node --move, node --swap
```

- **Design:** [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)
- **How it works:** [The checker](../specs/checks.md)
- **Why:**
  - [048. Every write prints every warning](../specs/decisions/048-every-write-prints-every-warning.md)
  - [050. A line from every box of a group is a warning](../specs/decisions/050-a-line-from-every-box-of-a-group-is-a-warning.md)

**Stories:**

- An agent reads the warnings, to find the edge or node its choices made awkward.

### F5.3.1: Bent edges

`bent-edge` names an edge with more than two bends.

- Detail: `edge` and `bends` and `skip` (the layers between its ends' layers).

### F5.3.2: Edges passing a layer

`passing-layer` names an edge that passes among the nodes of layers between its ends and meets none of them.

- Detail: `edge`, `layers`.

### F5.3.3: Edges across a group

`edge-across-group` names an edge through the frame of a group holding neither of its ends.

- Detail: `edge`, `groups`.

### F5.3.4: Tight edges

`tight-edges` names runs of two edges under 12 px apart for over 100 px.

- Detail: `edges`, `over` (the pixels they share).

### F5.3.5: Crowded labels

`crowded-label` names an edge's label with under 8 px of room on two sides.

- Detail: `edge`.

### F5.3.6: Lonely nodes

`lonely-node` names a node no edge reaches.

- It has no edge of its own and none to its group, layer or lane.
- Detail: `node`.

### F5.3.7: An edge per member

`edge-per-member` names a group of two or more where every node has an edge to one end outside it, or from it.

- The edges are alike in kind and label and weight and arrowheads.
- A group inside one with the same edges is left out.
- Detail: `group`, `edges` ([050. A line from every box of a group is a warning](../specs/decisions/050-a-line-from-every-box-of-a-group-is-a-warning.md)).

### F5.3.8: Crossings

`crossing` names a pair of edges that cross, however often.

- Detail: `edges`.

### F5.3.9: Nodes aside

`node-aside` names a node wholly beside every node it connects to, so that its edges reach across.

- It holds for a node placed in a layer or by steps.
- Detail: `node` and `nodes`.

- **Why:** [075. A box beside its neighbours is a warning](../specs/decisions/075-a-box-beside-its-neighbours-is-a-warning.md)

## F5.4: Check

`check` reports the defects the agent can fix, every warning, and the counts. `--all` adds the defects only the engine can avoid, which are engine bugs. A file that every write would refuse gets those errors and nothing else, with exit code 1.

```sh
grafical -f <file> check [--all]
```

- **Design:** [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)
- **How it works:** [The checker](../specs/checks.md)
- **Why:** [008. Defects owned by who can fix them](../specs/decisions/008-defects-owned-by-who-can-fix-them.md)

**Stories:**

- An agent runs `check`, to know the file is sound.

## F5.5: Checks of an agent's own

An agent may state rules for its own diagram, and an object or a type marks the rule it follows. Each rule says whether it warns or refuses. Which rules exist is open until a real need shows.

**Stories:**

- An agent sets a rule for its stores, to keep them in one layer as the diagram grows.
