# F5: Checking

```
F5: Checking
├── F5.1: Show — the diagram as facts
├── F5.2: Counts — facts about how the picture is drawn
├── F5.3: Warnings — what the picture draws poorly
└── F5.4: Check — defects, warnings and counts on demand
```

How an agent knows a diagram came out right. It reads the diagram as facts, counts and warnings, and checks the file on demand.

## F5.1: Show

The agent's view of a diagram, in place of reading the YAML.

```sh
grafical show <file> [--drawn]
```

- `show` prints the diagram in the same words as the operations.
  - It lists the rows · the boxes in order · the groups · the lanes · the lines · the walls · the notes · the marks.
- `show --drawn` prints how the picture is drawn, as records with no advice:
  - Each box's row · place · size · lines by side.
  - Each line's sides · bends · length · shortest length · rows skipped · lines crossed · rows passed.
  - Each wall's length and the lines through it.
  - One `gutter` record for each pair of neighbouring rows: `gutter above=<row> below=<row> lines=<n> crossings=<n> tight=<n> crowded=<n>`.
    - It counts the lines with a run between the two rows and the crossings · tight pairs · crowded labels there.
    - It shows the agent which choice of rows costs.
  - How each note is drawn.
  - The lines bundled together, and the totals.

- **Design:**
  - [8. Answers are data a script can read](../DESIGNS.md#8-answers-are-data-a-script-can-read)
  - [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [021. The help as the reference](../specs/decisions/021-the-help-as-the-reference.md)
  - [022. Records over prose](../specs/decisions/022-records-over-prose.md)

**Stories:**

- An agent reads the diagram as facts, to see what it drew without reading the YAML.

## F5.2: Counts

After `apply`, `check` and `render`, grafical prints the drawing's counts as one record:

```text
counts nodes=3 lines=2 crossings=0 bends=1 bent=0 length=224 width=368 height=280 fullest=data:2 busiest=api:2 longest=api->cache:176 passing=0 across=0 tight=0 crowded=0
```

They are facts, with no threshold and no advice: what they mean is the agent's to judge.

Five counts say how the picture is drawn, and each place they count is also a warning in [F5.3: Warnings](#f53-warnings):

- `bent` counts the lines drawn with more than two bends.
- `passing` counts the lines that run through a row they do not connect.
- `across` counts the lines that cross the box of a group holding neither of their ends.
- `tight` counts the pairs of runs of two lines closer than 12 px for more than 100 px.
  - Two runs of one bundle are left out.
- `crowded` counts the line labels with less than 8 px of room on two or more sides.

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

The warnings:

- `bent-line`: a line with more than two bends.
  - Detail: `edge` · `bends` · `skip` (the rows between its ends' rows).
- `passing-row`: a line that passes among the boxes of rows between its ends and meets none of them.
  - Detail: `edge`, `rows`.
- `line-across-group`: a line through the box of a group holding neither of its ends.
  - Detail: `edge`, `groups`.
- `tight-lines`: runs of two lines under 12 px apart for over 100 px.
  - Detail: `edges`, `over` (the pixels they share).
- `crowded-label`: a line's label with under 8 px of room on two sides.
  - Detail: `edge`.
- `lonely-box`: a box no line reaches.
  - It has no line of its own and none to its group, row or lane.
  - Detail: `node`.
- `line-per-member`: every box of a group of two or more has a line to one end outside it, or from it.
  - The lines are alike in kind · label · weight · arrowheads.
  - A group inside one with the same lines is left out.
  - Detail: `group`, `edges` ([050. A line from every box of a group is a warning](../specs/decisions/050-a-line-from-every-box-of-a-group-is-a-warning.md)).
- `crossing`: a pair of lines that cross, however often.
  - Detail: `edges`.

A warning has no source: the outcome line names what the write changed, and a warning names the ids it is about ([048. Every write prints every warning](../specs/decisions/048-every-write-prints-every-warning.md)):

```text
ok changed=sync->geo

warning: bent-line
description: A line bends more than twice, mostly because it skips rows.
detail:
  edge: sync->geo
  bends: 3
  skip: 1
next: layer move, node move, node swap
```

- **Design:** [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)
- **How it works:** [The checker](../specs/checks.md)
- **Why:**
  - [048. Every write prints every warning](../specs/decisions/048-every-write-prints-every-warning.md)
  - [050. A line from every box of a group is a warning](../specs/decisions/050-a-line-from-every-box-of-a-group-is-a-warning.md)

**Stories:**

- An agent reads the warnings, to find the line or box its choices made awkward.

## F5.4: Check

```sh
grafical check <file> [--all]
```

`check` reports the defects the agent can fix, every warning, and the counts. `--all` adds the defects only the engine can avoid, which are engine bugs.

- **Design:** [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)
- **How it works:** [The checker](../specs/checks.md)
- **Why:** [008. Defects owned by who can fix them](../specs/decisions/008-defects-owned-by-who-can-fix-them.md)

**Stories:**

- An agent runs `check`, to know the file is sound.
