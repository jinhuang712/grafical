# Architecture

grafical takes operations from a coding agent, one command or one batch at a time, and keeps a diagram file in YAML that holds the facts they state. After every write it lays the diagram out again from those facts, checks it, and answers with records: what changed, any refusal with what happened and the commands that can change it, and counts of how the picture is drawn. `render` turns the same file into SVG and PNG.

```text
agent ──command or batch──> command line ──records──> agent
                              │    └──writes──> diagram file (YAML, in git)
                              │ operations
                              ▼
                            model ── refusals ──> command line
                              │ facts
                              ▼
  text measurer ──> layout: placement ⇄ routing ──> text placement <── theme
                              │ laid-out picture
                              ├──> checker ── defects, warnings, counts ──> command line
                              └──> renderer ──> SVG ──> PNG
```

The commitments the parts must meet are in [DESIGNS.md](../DESIGNS.md), and the forks behind their shape in [specs/decisions](decisions/README.md).

## How a write moves through the parts

```text
command line   reads the command or batch, and the file
model          applies the operations to a copy and checks the whole diagram
layout         placement, routing and text placement take turns (below)
checker        finds defects, warnings and counts in the laid-out picture
command line   writes the file, unless a defect the agent owns refuses it
command line   prints the outcome, a block per problem, and the counts
```

The three parts of the layout take turns, because each needs what the one before it decided:

```text
placement   boxes placed by steps, sizes, the order of each row
routing     stand-ins for container ends, and which lines cross between neighbours
placement   the column grid and the x of every box, with room for those lines and their labels
text        each band's label, which the lines keep clear of
routing     every line through the gutters, seating each gutter's labels as it goes
text        bar labels and the legend
placement   the y of every row from the tracks each gutter holds, and the canvas's height
text        lane labels, group titles, wall labels, step badges and notes
```

The text measurer gives every part the size of its text. The theme gives the layout its type sizes and fixed sizes, and the renderer its paint.

## The command line

Reads a command or a batch, runs the write through the parts, and prints the answer as records. It also holds the help, the guides, the refusal texts, the live viewer, `show`, `diff` and `try`, and reads the files of marks and stylesheets. How it answers is in [how grafical answers](answers.md).

Folder: `src/cli/`.

## The model

Defines the diagram: rows, boxes, lines, groups, lanes, columns, walls, notes and marks. Turns an operation into a change of the facts, validates every file it loads, and compares two files as operations. How it works is in [the model](model.md), and how the files are laid out in [the file formats](file-formats.md).

Folder: `src/model/`.

## Placement

Places and sizes every box on one column grid, spaces the rows, and sizes groups, lanes, bands, bars, walls and the canvas. It stores no position. How it works is in [placement](placement.md).

Folder: `src/layout/`.

## Routing

Routes every line through the gutters between rows and the gaps between boxes, and picks each line's sides, ports and tracks. How it works is in [routing](routing.md).

Folder: `src/layout/`.

## Text placement

Seats every text outside a box: the labels of lines, step badges, group titles, notes, the labels of walls, bands, bars and lanes, and the legend. How it works is in [text placement](labels.md).

Folder: `src/layout/`.

## The text measurer

Measures every text from the bundled fonts, wraps it, and says whether a box's text fits. How it works is in [the text measurer](text.md).

Folder: `src/text/`.

## The theme

Holds the built-in themes, merges a stylesheet into them, and holds the fixed sizes and the outline of each kind of box. How it works is in [the theme](theme.md).

Folder: `src/theme/`.

## The checker

Looks at the laid-out picture and reports defects, warnings and counts. A defect the agent can fix fails the write; one only the engine can avoid is reported by `check --all`. How it works is in [the checker](checks.md).

Folder: `src/check/`.

## The renderer

Writes the SVG from the laid-out picture and turns it into a PNG with `resvg`, with no browser. How it works is in [the renderer](rendering.md).

Folder: `src/render/`.

## The shared records

What the parts pass to each other and back to the caller: the scene the layout computes, the checker reads and the renderer draws; the problems, with their codes and facts; and the records grafical prints. The library entry point that the command line is built on sits here too.

Folder: the files at the top of `src/`.

## The benchmark harness

Runs agents against briefs, records what they did and what it cost, and measures the pictures. It is not part of the command line a user installs.

Folder: `bench/`.
