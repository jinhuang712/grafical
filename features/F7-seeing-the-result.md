# F7: Seeing the result

```
F7: Seeing the result
├── F7.1: Show — the diagram as facts
├── F7.2: Counts — facts about how the picture is drawn
├── F7.3: Warnings — what the picture draws poorly
├── F7.4: Check — defects, warnings and counts on demand
├── F7.5: Render — SVG and PNG, the same everywhere
├── F7.6: Live viewer — a window that redraws as the agent draws
├── F7.7: Diff — a change as operations
├── F7.8: Help — the agent's whole reference
└── F7.9: Guides — how common diagrams are usually drawn
```

What the agent and the owner see of a diagram. The agent reads it as facts, counts and warnings, checks it and renders it to SVG and PNG. The owner can watch it redraw as the agent works, and a reviewer can read a change as operations.

## F7.1: Show

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
  - [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
  - [8. Answers are data a script can read](../DESIGNS.md#8-answers-are-data-a-script-can-read)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [021. The help as the reference](../specs/decisions/021-the-help-as-the-reference.md)
  - [022. Records over prose](../specs/decisions/022-records-over-prose.md)

**Stories:**

- An agent reads the diagram as facts, to see what it drew without reading the YAML.

## F7.2: Counts

After `apply`, `check` and `render`, grafical prints the drawing's counts as one record:

```text
counts nodes=3 lines=2 crossings=0 bends=1 bent=0 length=224 width=368 height=280 fullest=data:2 busiest=api:2 longest=api->cache:176 passing=0 across=0 tight=0 crowded=0
```

They are facts, with no threshold and no advice: what they mean is the agent's to judge.

Five counts say how the picture is drawn, and each place they count is also a warning in [F7.3: Warnings](#f73-warnings):

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

## F7.3: Warnings

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

## F7.4: Check

```sh
grafical check <file> [--all]
```

`check` reports the defects the agent can fix, every warning, and the counts. `--all` adds the defects only the engine can avoid, which are engine bugs.

- **Design:** [6. Every write is checked, and each defect has an owner](../DESIGNS.md#6-every-write-is-checked-and-each-defect-has-an-owner)
- **How it works:** [The checker](../specs/checks.md)
- **Why:** [008. Defects owned by who can fix them](../specs/decisions/008-defects-owned-by-who-can-fix-them.md)

**Stories:**

- An agent runs `check`, to know the file is sound.

## F7.5: Render

```sh
grafical render <file> [--svg [<out>]] [--png [<out>]] [--scale 1-4]
```

- With neither flag, `render` writes `<name>.svg` and `<name>.png` beside the file.
  - One flag writes only that one.
- The SVG carries the title and a description for screen readers.
- The PNG is drawn with no browser, at a scale from 1 to 4.
- The same file gives the same SVG and the same PNG pixels on macOS and Linux.

- **Design:** [9. The same file gives the same picture on any machine](../DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
- **How it works:** [The renderer](../specs/rendering.md)
- **Why:**
  - [007. Our own SVG writer](../specs/decisions/007-our-own-svg-writer.md)
  - [024. Same file exact, same facts mostly](../specs/decisions/024-same-file-exact-same-facts-mostly.md)

**Stories:**

- An agent renders the file, to hand a reader a picture.

## F7.6: Live viewer

A window that shows the diagram as it is now, while an agent draws it.

```sh
grafical view <file> [--port <n>] [--no-open]
```

- The window redraws within a moment of every change to the file from any process.
  - It briefly marks what changed.
- Beside the picture, a list says what each change did as operations.
  - The newest change comes first.
- The window opens at the picture's size and follows it.
  - It serves on 127.0.0.1 only, and only shows: nobody edits on it.
- While the file cannot be read, it keeps the last good picture and shows the errors.
- Ctrl-C stops it.

- **Stance:** [Who draws?](../PHILOSOPHY.md#who-draws)
- **Design:** [14. A diagram reads no file outside its folder, and its pictures run nothing](../DESIGNS.md#14-a-diagram-reads-no-file-outside-its-folder-and-its-pictures-run-nothing)
- **How it works:** [The command line](../specs/ARCHITECTURE.md#the-command-line)
- **Why:** [017. A viewer that only shows](../specs/decisions/017-a-viewer-that-only-shows.md)

**Stories:**

- The owner watches a window that redraws, to see the work as it happens.

## F7.7: Diff

```sh
grafical diff <file> [<git-rev>]
```

`diff` reports how the file differs from a git revision, `HEAD` by default, as a batch of operations that `apply` replays on the revision's file. Outside git it fails with `not-in-git`.

- **Design:**
  - [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
  - [4. A change moves only what it names](../DESIGNS.md#4-a-change-moves-only-what-it-names)
- **How it works:** [The model](../specs/model.md)
- **Why:** [009. Git as the history](../specs/decisions/009-git-as-the-history.md)

**Stories:**

- A reviewer reads how a file differs from a revision, to review a diagram change like code.

## F7.8: Help

How to use grafical: the agent's whole reference for the tool.

```sh
grafical --help
grafical <command> --help
```

The entry page and one page per command hold everything an agent needs to use grafical.

- `--help` says what grafical is and what it does not draw.
- It says how to work and lists every way to draw, one line each by the story it tells.
  - Examples: a box beside a box · one path in order · two parts kept apart.
- Each command's help adds its options · its line in a batch · when to use it · what it draws · common mistakes · limits · an example.
- A command's arguments are named as its batch fields.
- No page says what a refusal means, since the refusal's block says it.
- The help does not say how a kind of diagram is drawn, since the guides do.
- `--help` is the one way to a page, and there is no `grafical help <command>`.
- A command grafical does not have is refused with the word it most likely means.
  - `grafical help apply` gives `error: unknown-command` with `found: help` and `likely: --help`.
  - `grafical node.add --help` gives `found: node.add` and `likely: node add`.

- **Stance:** [How does an agent learn grafical?](../PHILOSOPHY.md#how-does-an-agent-learn-grafical)
- **Design:** [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:**
  - [021. The help as the reference](../specs/decisions/021-the-help-as-the-reference.md)
  - [042. One entry page, help where it is used](../specs/decisions/042-one-entry-page-help-where-it-is-used.md)
  - [044. One way to a page, and a wrong command names the right one](../specs/decisions/044-one-way-to-a-page-and-a-wrong-command-names-the-right-one.md)

**Stories:**

- An agent learns grafical from `--help`, to start without being told how.

## F7.9: Guides

How common kinds of diagram are usually drawn: best practice, for an agent that wants it.

```sh
grafical guide
grafical guide <name>
```

`grafical guide` lists the guides by what a diagram is about:

| About | Guides |
|---|---|
| what exists | architecture · C4 · infrastructure · dependency |
| what moves | data flow · event flow |
| a process | flowchart · swimlane |
| one thing's states | state machine |
| any kind | composition |

- Composition says what makes a diagram good and what to change when a picture looks wrong.
- `grafical guide <name>` prints one guide.
  - `cloud` · `deployment` · `process` · `states` find theirs too.
- A name that is no guide is refused as `unknown-guide` with the likely ones.
- The entry page names `grafical guide` once, and nothing tells an agent to read a guide.

- **Design:** [12. The command line comes first, and the help is the agent's only reference](../DESIGNS.md#12-the-command-line-comes-first-and-the-help-is-the-agents-only-reference)
- **How it works:** [How grafical answers](../specs/answers.md)
- **Why:** [043. Help for the tool, guides for best practice](../specs/decisions/043-help-for-the-tool-guides-for-best-practice.md)

**Stories:**

- An agent reads a guide, to draw a kind of diagram the usual way.
