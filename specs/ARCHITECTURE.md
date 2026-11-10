# Architecture

grafical takes operations from a coding agent, one command at a time, and keeps a `.grafical` file that holds the facts they state. After every write it lays the diagram out again from those facts, checks it, and answers with records: what changed, any refusal with what happened and the commands that can change it, and counts of how the picture is drawn. `render` turns the same file into SVG and PNG.

```text
agent ──────command───────> command line ──records──> agent
                              │    └──writes──> diagram file (.grafical, in git)
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

## How a write moves through the parts

```text
command line   reads the command and the file
model          applies the operation to a copy and checks the whole diagram
layout         placement, routing and text placement take turns (below)
checker        finds defects, warnings and counts in the laid-out picture
command line   writes the file, unless a defect the agent owns refuses it
command line   prints the outcome and a block per problem
```

The three parts of the layout take turns, because each needs what the one before it decided:

```text
placement   nodes placed by steps, sizes, the order of each layer
routing     stand-ins for container ends, and which edges cross between neighbours
placement   the column grid and the x of every node, with room for those edges and their labels
text        each band's label, which the edges keep clear of
routing     every edge through the gutters, seating each gutter's labels as it goes
text        bar labels and the legend
placement   the y of every layer from the tracks each gutter holds, and the canvas's height
text        lane labels, group titles, wall labels, step badges and notes
```

The text measurer gives every part the size of its text. The theme gives the layout its type sizes and fixed sizes, and the renderer its paint.

## The command line

Reads a command, runs the write through the parts, and prints the answer as records. It also holds the help, the guides, the refusal texts, the live viewer, `show`, `diff` and `--try`, and reads the files of marks and stylesheets. How it answers is in [how grafical answers](answers.md).

Folder: `src/cli/`.

## The model

Defines the diagram: layers, nodes, edges, groups, lanes, columns, walls, notes and marks. Turns an operation into a change of the facts, validates every file it loads, and compares two files as operations. How it works is in [the model](model.md), and how the file is laid out in [the .grafical file](grafical-file.md).

Folder: `src/model/`.

## Placement

Places and sizes every node on one column grid, spaces the layers, and sizes groups, lanes, bands, bars, walls and the canvas. It stores no position. How it works is in [placement](placement.md).

Folder: `src/layout/`.

## Routing

Routes every edge through the gutters between layers and the gaps between nodes, and picks each edge's sides, ports and tracks. How it works is in [routing](routing.md).

Folder: `src/layout/`.

## Text placement

Seats every text outside a node: the labels of edges, step badges, group titles, notes, the labels of walls, bands, bars and lanes, and the legend. How it works is in [text placement](labels.md).

Folder: `src/layout/`.

## The text measurer

Measures every text from the bundled fonts, wraps it, and says whether a node's text fits. How it works is in [the text measurer](text.md).

Folder: `src/text/`.

## The theme

Reads the built-in stylesheets and a diagram's own stylesheet into the look, and holds the fixed sizes and the outline of each type of node. How it works is in [the theme](theme.md).

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

Runs agents against briefs, records what they did and what it cost, and measures the pictures. It is not part of the command line a user installs. How it works is in [The benchmark harness](benchmark.md).

Folder: `bench/`.
