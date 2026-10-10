# Design

> Started 2026-10-11.

How [PHILOSOPHY.md](PHILOSOPHY.md) becomes a working design: each decision, its reason, and what was rejected. The rejected options matter as much as the choices, because they explain why the design looks the way it does.

Decision IDs are permanent. A reversed decision keeps its ID and gains a note that points to its replacement.

## The shape

```text
agent ──operations──> grafical
                        ├── validate ──> operation errors ──> agent
                        ├── apply ─────> diagram file (YAML, in git)
                        ├── layout ────> positions, sizes, routes
                        ├── check ─────> defects ──> agent
                        └── render ────> SVG ──resvg──> PNG
```

In stage 2 the board becomes a second client of the same operations. Nothing else in this picture changes.

## Index

| ID | Decision | Traces to |
|---|---|---|
| D1 | Operations are the only way to change a diagram | Built in steps |
| D2 | Operations state facts, never coordinates | The engine owns every pixel |
| D3 | A batch applies many operations at once, all or nothing | Built in steps |
| D4 | Every element has a stable ID that the caller chooses | Only what you name changes |
| D5 | Every operation is validated, and its errors say how to fix it | Mistakes are caught at the step |
| D6 | Layout is described by discrete facts | The engine owns every pixel |
| D7 | Layers are horizontal bands, stacked top to bottom | The tool carries the taste |
| D8 | Kinds and styles are short, fixed lists | The tool carries the taste |
| D9 | A person's adjustment will be an ordinary operation | People and agents take the same steps |
| D10 | grafical owns placement, and placement is stable by construction | Only what you name changes |
| D11 | Edges route orthogonally through the gaps between layers and nodes | The engine owns every pixel |
| D12 | Text is measured from bundled fonts | The same file is the same picture |
| D13 | grafical writes the SVG, and resvg rasterizes it | The same file is the same picture |
| D14 | The checker runs on every write, and a defect fails the command | Mistakes are caught at the step |
| D15 | Same file, same SVG bytes and PNG pixels | The same file is the same picture |
| D16 | The command line comes first, with JSON output | Built in steps |
| D17 | `show` gives agents a compact view of a diagram | The tool carries the taste |
| D18 | Git is the history, and `diff` reports changes as operations | The same file is the same picture |
| D19 | TypeScript on Node, with an engine that also runs in a browser | People and agents take the same steps |
| D20 | X6 draws the board in stage 2, not the stage 1 output | The same file is the same picture |
| D21 | MIT license, and dependencies must allow it | — |
| D22 | The file records its format version, and the format only grows | The same file is the same picture |
| D23 | The toolchain | — |

## Writing a diagram

### D1 Operations are the only way to change a diagram

Every change is a named operation: `node.add`, `edge.add`, `node.rename`, `layer.move`. grafical applies it to the diagram file. Agents never write the file directly. People may read it, but editing it by hand is not supported in stage 1. grafical validates the file on every load, and refuses a file that fails with the same errors an operation would get.

Rejected: agents writing the whole file. That is the one-shot pattern this project exists to replace. Each rewrite can change parts nobody asked about, and a weak model rewrites more than it should.

### D2 Operations state facts, never coordinates

An operation says which layer, which position in the layer, which group, what to align with, and what to connect. No operation takes an x, a y, a width or a bend point.

Rejected: coordinate operations, as offered by the draw.io and Excalidraw MCP servers. They move the hardest part of the work back to the model, which is exactly where the 2026-10-10 test failed.

### D3 A batch applies many operations at once, all or nothing

`grafical apply` takes a list of operations. grafical validates each one in order, and applies the list only if every operation is valid and the result has no defect. Otherwise nothing changes, and the reply names the first operation that failed.

Rejected: one tool call per operation as the only path, because a 40-node diagram would take 40 model round trips. A free-form script, because it cannot be validated step by step.

### D4 Every element has a stable ID that the caller chooses

Layers, groups, nodes and edges each have an ID, such as `relay` or `kafka`. The caller picks it, and it never changes while the element exists. Renaming changes the label, not the ID. An edge ID defaults to `<from>-><to>` when the edge is created, with a suffix when the same pair is connected twice. A reversed edge keeps its ID.

Rejected: generated IDs, because the agent would have to look them up before every operation. Matching by label, because a rename then breaks every reference. Structurizr's manual layouts are lost this way.

### D5 Every operation is validated, and its errors say how to fix it

An operation error has a code, the index of the operation, the field, what was found, what was expected, and a suggestion. An unknown ID suggests the closest existing IDs. A bad value lists the allowed values.

Rejected: prose error messages, because an agent has to interpret them, and that costs a round. Accepting a doubtful operation with a warning, because the warning is easy to ignore and the error then surfaces later.

## The model

### D6 Layout is described by discrete facts

A node's place is its layer, its order within the layer, its group, and an optional alignment with a node in another layer. Its size is a size step, and the box has that step's fixed width and height. The diagram's spacing is a density. The allowed values are listed in [FEATURES.md](FEATURES.md). The theme maps each value to pixels.

Rejected:
- Free positions. They make every diagram look different and give a weak model too many ways to be wrong.
- A general graph layout over a plain node and edge list, such as ELK layered or dagre. Those compute positions globally, so adding one node can reorder others.
- Boxes that grow with their text. A longer label would push every layer below it down.

### D7 Layers are horizontal bands, stacked top to bottom

A layered architecture diagram reads from top to bottom: callers, entry points, services, messaging, storage. Each layer is a band with a label. Nodes in a layer sit side by side in their order. A group draws a box around neighbouring nodes in one layer.

Rejected for stage 1: groups that span several layers, and swimlanes. They are real needs, such as a "write side" and a "read side" column across layers, and they are listed under "Not yet decided".

### D8 Kinds and styles are short, fixed lists

Each node and each edge has a kind from a short list in [FEATURES.md](FEATURES.md). The theme decides how each kind looks. One emphasis value, `accent`, marks the one or two things a reader should see first. Stage 1 ships one theme.

Rejected: per-node colors and free style attributes. Every invented style is something the reader has to decode, and something a weak model can get wrong.

### D9 A person's adjustment will be an ordinary operation

In stage 2, a drag on the board becomes the same operation an agent would send, such as `node.move` or `node.align`. It changes the same facts, so the file has one kind of state, whoever made the change. If stage 2 needs a fact that stage 1 lacks, it is added under D22.

Rejected: a separate section for people's adjustments, reserved now and filled in stage 2. Without a defined schema, an empty section does not prevent a later format change, and a second kind of state would let people's and agents' changes disagree.

## The engine

### D10 grafical owns placement, and placement is stable by construction

Placement follows the facts in a fixed order: layers from top to bottom, nodes in each layer by their order, box sizes from their steps, gaps from the density. Layers are left-aligned. No search or optimization takes part. An operation can therefore change only these, and benchmark 4 in [GOALS.md](GOALS.md) checks that nothing else changes:

- the element it names;
- the nodes after it in the same layer, which shift sideways when it adds, removes or resizes a node;
- the layers below it, which shift down when its layer changes height;
- nodes aligned to a node that moved, and in turn the nodes after them in their own layer;
- the routes of edges attached to anything that moved, and of edges that share a gap with a changed edge.

An alignment that cannot hold together with the order in either layer is rejected as an operation error.

Rejected: optimizing placement to reduce edge crossings. It produces a better first picture, but any change can reshuffle everything. Order changes only when an operation asks for it. Centred layers, for now: centring shifts a whole layer whenever one of its nodes changes. This stays under "Not yet decided".

### D11 Edges route orthogonally through the gaps between layers and nodes

Edges run as horizontal and vertical segments. They travel between layers and between neighbouring nodes, never through a node. Labels sit on segments without overlapping nodes or other labels.

Phase 0 compares two routers: our own router through the gaps, and `libavoid-js`, a WASM build of the Adaptagrams libavoid router. A router passes only if it meets all of these:
- no edge crosses a node, and no labels collide;
- adding one edge changes no other route outside D10's list;
- it gives the same SVG bytes on macOS and Linux;
- its license fits D21.

The choice is recorded here.

Rejected: ELK for routing. ELK layered computes its own placement, and according to ELK's documentation it cannot route orthogonally around nodes that are already placed. Its fixed-layout algorithm only reuses bend points it is given. Sources, checked on 2026-10-10: the [ELK fixed algorithm reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-fixed.html) and the [ELK libavoid post](https://eclipse.dev/elk/blog/posts/2022/22-11-17-libavoid.html). Graphviz, because it is another placement engine and a native binary.

### D12 Text is measured from bundled fonts

grafical ships its own fonts: Inter for Latin text and a Simplified Chinese subset of Noto Sans SC, both under the SIL Open Font License. Text width comes from those font files, never from the system. Labels wrap at spaces, hyphens, underscores and slashes in Latin text, and between characters in Chinese text. A label that still does not fit its box is a defect. Its fix is a larger size step or a shorter label.

Rejected: system fonts, because they differ between machines, and the same file would give a different picture. Measuring in a browser, because grafical runs without one.

### D13 grafical writes the SVG, and resvg rasterizes it

The engine writes the SVG itself, with a fixed element and attribute order. `@resvg/resvg-js` turns it into a PNG using the same bundled fonts. No browser takes part.

Rejected: X6 for stage 1 output. Running it outside a browser is unproven, and it would make X6 a hard dependency before the board needs it. A headless browser, because it is slow and large.

### D14 The checker runs on every write, and a defect fails the command

After each operation or batch, grafical lays out the diagram and checks it. A defect is one of these:
- text that overflows its box;
- two nodes that overlap;
- an edge that crosses a node;
- two labels that collide;
- a character the bundled fonts cannot draw.

A write that leaves a defect fails and changes nothing. Each defect names its elements, what was found, what was expected, and an operation that would fix it.

Rejected: warnings, because a picture with a known defect looks like success. Checking only at render time, because the error then surfaces long after the operation that caused it.

### D15 Same file, same SVG bytes and PNG pixels

Under one version of grafical, the same file gives the same SVG bytes and the same PNG pixels on any machine.

The file is YAML with a fixed layout. Mappings have sorted keys. Layers, the nodes in a layer, and edges are ordered lists, so inserting a node changes one line, not an index on every later node. The SVG has a fixed order and no timestamps. Fonts are bundled. CI renders the fixtures on macOS and Linux and compares them.

Rejected: anything that depends on the host, such as system fonts, locale, time or unordered collections. Numeric order indexes, because one insertion rewrites every later index and makes git diffs noisy.

## Interfaces

### D16 The command line comes first, with JSON output

Each operation is a command, such as `grafical node add …`, and every command accepts `--json`. Every write reports the IDs it changed, any operation errors and any defects, so the agent does not need to read the diagram again. An MCP server comes later, as a thin wrapper over the same operations.

Rejected: an MCP server only, because the command line works in every agent and every shell script. A library API first, because agents use commands.

### D17 `show` gives agents a compact view of a diagram

`grafical show` prints the layers, the nodes in order, the groups and the edges in a few lines, in the same vocabulary as the operations. `grafical guide` prints the operation reference within 3k tokens. Together they keep the fixed overhead within benchmark 3's budget.

Rejected: having agents read the YAML file, because it holds more than they need and costs more tokens.

### D18 Git is the history, and `diff` reports changes as operations

The file holds the current state only, and git keeps the history. `grafical diff` compares the file on disk with a git revision, `HEAD` by default, and reports the difference as operations, such as `node.rename relay` or `edge.add relay->kafka`.

Rejected: an operation log inside the file, which could replay any past version. The file grows without limit, git merges get harder, and git already keeps the history.

## Platform

### D19 TypeScript on Node, with an engine that also runs in a browser

grafical is written in TypeScript and runs on Node 24 or later. The engine (model, layout, routing, measurement and SVG writing) uses no Node-only APIs. The stage 2 board can then run the same engine in the browser while a person drags.

Rejected: Go, which builds a single binary, because the board would need a second engine or a large WASM build. Rust, because development is slower, and the stage 2 board still needs a browser build.

### D20 X6 draws the board in stage 2, not the stage 1 output

In stage 2, AntV X6 draws the board from the geometry the engine computes, and handles selection, dragging and snapping. Before stage 2 starts, X6 is compared again with React Flow. On 2026-10-10 the latest X6 release on npm was 3.1.8, under MIT, and its maintainers had made no public statement about its future.

Rejected: using X6 in stage 1, as explained in D13.

### D21 MIT license, and dependencies must allow it

grafical is MIT-licensed. Every dependency must allow use in an MIT project. Licenses below come from the npm registry on 2026-10-11, except where marked.

| Dependency | License |
|---|---|
| `@resvg/resvg-js` | MPL-2.0 |
| `commander` | MIT |
| `zod` | MIT |
| `yaml` | ISC |
| `libavoid-js`, if D11 chooses it | LGPL-2.1-or-later, from its npm page |
| `harfbuzzjs` or `fontkit` | Unverified: the registry timed out |
| Inter, Noto Sans SC | SIL Open Font License |
| `elkjs` | EPL-2.0 OR GPL-3.0-or-later. Not used, see D11 |

### D22 The file records its format version, and the format only grows

Every diagram file starts with `grafical: <format version>`. Until the first release, the format may change freely. After it, new fields may be added, and changing or removing one is a breaking change that needs a new major format version. A file with a newer format than the installed grafical understands is refused, never guessed at. A grafical release that changes the picture for an existing file says so in its release notes.

Rejected: no version field, because a file could then not be told apart from an older or newer one. Reading unknown fields loosely, because a half-understood diagram is worse than a refused one.

### D23 The toolchain

| Tool | Use |
|---|---|
| TypeScript 7 | Language and type checking |
| Node 24 or later | Runtime |
| pnpm | Package manager |
| `commander` | Command-line parsing |
| `zod` | Operation schemas, validation and error details |
| `yaml` | Reading and writing the diagram file |
| `@resvg/resvg-js` | PNG output |
| `harfbuzzjs` or `fontkit` | Text measurement, chosen in phase 0 |
| vitest | Tests |
| Biome | Lint and format |

Rejected: a CLI framework with plugins, because grafical's command set is small and fixed.

## Not yet decided

- **Router:** our own router through the gaps, or `libavoid-js`. Phase 0 decides (D11).
- **Text library:** `harfbuzzjs` or `fontkit`. Phase 0 decides (D12).
- **Chinese subset:** which character set the Noto Sans SC subset covers. Candidates are GB 2312 (6,763 characters) and the Table of General Standard Chinese Characters (8,105 characters).
- **Wide layers:** what happens when a layer is wider than the maximum diagram width. One option is a defect that tells the agent to split the layer. The other is wrapping the layer into rows, which moves nodes the operation did not name.
- **Columns and swimlanes:** groups that span layers, such as a write side and a read side.
- **Centred layers:** whether layers may be centred, and how D10 would count the shift.
- **Exact lists:** node kinds, edge kinds, size steps and density values. Phase 2 settles them.
- **File naming:** `<name>.grafical.yaml` is proposed.
- **Undo:** whether undo exists outside git.
- **Stage 2:** how the board reaches the file (a local server while the board is open is proposed), and how snap guides turn a drag into one operation.
