# Architecture

grafical takes operations from a coding agent, one command or one batch at a time, and keeps a diagram file in YAML that holds the facts they state. After every write it lays the diagram out again from those facts, checks it, and answers with records: what changed, any refusal with what happened and the commands that can change it, and counts of how the picture is drawn. `render` turns the same file into SVG and PNG.

```text
agent ──operations──> grafical
                        ├── validate ──> refusals ─────────> agent
                        ├── apply ─────> diagram file (YAML, in git)
                        ├── layout ────> positions, sizes, routes
                        ├── check ─────> defects and counts ──> agent
                        └── render ────> SVG ──resvg──> PNG
```

The commitments the parts must meet are in [DESIGNS.md](../DESIGNS.md), and the forks behind their shape in [specs/decisions](decisions/README.md).

## The command line

Reads a command or a batch, runs the steps above in order, and prints the answer as records. It also holds the help, the guides, the refusal texts, the live viewer and `show`.

Folder: `src/cli/`.

## The model

Defines the diagram: rows, boxes, lines, groups, lanes, columns, walls, notes and marks. Turns an operation into a change of the facts, validates every file it loads, and compares two files as operations. How it works is in [the model](model.md), and how the files are laid out in [the file formats](file-formats.md).

Folder: `src/model/`.

## The layout

Computes the picture from the facts: sizes the boxes, places them on one column grid, spaces the rows, routes every line through the gaps and seats every label. It stores no position.

Folder: `src/layout/`.

## The text measurer

Measures every label from the bundled fonts, wraps it, and tells the layout how much room it takes.

Folder: `src/text/`.

## The theme

Holds the built-in themes and the stylesheet's values: colors, line widths, shapes and type sizes, by role ([the file formats](file-formats.md)).

Folder: `src/theme/`.

## The checker

Looks at the laid-out picture and reports defects, warnings and counts. A defect the agent can fix fails the write; one only the engine can avoid is reported by `check --all`.

Folder: `src/check/`.

## The renderer

Writes the SVG from the laid-out picture and turns it into a PNG with `resvg`, with no browser.

Folder: `src/render/`.

## The shared records

What the parts pass to each other and back to the caller: the scene the layout computes, the checker reads and the renderer draws; the problems, with their codes and facts; and the records grafical prints. The library entry point that the command line is built on sits here too.

Folder: the files at the top of `src/`.

## The benchmark harness

Runs agents against briefs, records what they did and what it cost, and measures the pictures. It is not part of the command line a user installs.

Folder: `bench/`.
