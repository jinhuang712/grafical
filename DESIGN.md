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
| D4 | Every element has a stable ID that the caller chooses | Only the facts you name change |
| D5 | Every operation is validated, and its errors say how to fix it | Mistakes are caught at the step |
| D6 | Layout is described by discrete facts | The engine owns every pixel |
| D7 | Layers are rows, and groups are the systems drawn around them | The tool carries the taste |
| D8 | Kinds and styles are short, fixed lists | The tool carries the taste |
| D9 | A person's adjustment will be an ordinary operation | People and agents take the same steps |
| D10 | Layout is recomputed from the facts on every change, like a typesetter | Only the facts you name change |
| D11 | Edges route orthogonally through the gaps, with our own router | The engine owns every pixel |
| D12 | Text is measured from bundled fonts | The same file is the same picture |
| D13 | grafical writes the SVG, and resvg rasterizes it | The same file is the same picture |
| D14 | The checker runs on every write. A defect the agent can fix fails the command, and the engine avoids the rest | Mistakes are caught at the step |
| D15 | Same file, same SVG bytes and PNG pixels | The same file is the same picture |
| D16 | The command line comes first, with JSON output | Built in steps |
| D17 | `show` gives agents a compact view of a diagram | The tool carries the taste |
| D18 | Git is the history, and `diff` reports changes as operations | The same file is the same picture |
| D19 | TypeScript on Node, with an engine that also runs in a browser | People and agents take the same steps |
| D20 | X6 draws the board in stage 2, not the stage 1 output | The same file is the same picture |
| D21 | MIT license, and dependencies must allow it | — |
| D22 | The file records its format version, and the format only grows | The same file is the same picture |
| D23 | The toolchain | — |
| D24 | The engine picks a new node's slot, and `layer.tidy` reorders on request | The tool carries the taste |
| D25 | The target look is a picture, and its rules are measured | The tool carries the taste |
| D26 | Curation is coached, budgeted and shown | The tool carries the taste |
| D27 | A node with no size is sized to its text | The tool carries the taste |
| D28 | An edge may end at a group or a layer | The tool carries the taste |
| D29 | Open questions settled by the owner | The engine arranges; the agent decides what the diagram says |
| D30 | A diagram takes its look from a theme or a shared stylesheet | The tool carries the taste |
| D31 | A live viewer shows the diagram as it is now | A diagram is built in steps |
| D32 | Swimlanes run as rows or as columns | The engine arranges; the agent decides what the diagram says |
| D33 | Lines have a short list of looks, and meet a box on any side | The tool carries the taste |
| D34 | Stage 1 draws every diagram type the layered engine can draw | The engine arranges; the agent decides what the diagram says |
| D35 | The engine names rearrangements that make the lines better, as commands | The engine arranges; the agent decides what the diagram says |

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

### D7 Layers are rows, and groups are the systems drawn around them

A layered architecture diagram reads from top to bottom: callers, entry points, services, messaging, storage. Each layer is a row, and the nodes in a layer sit side by side in their order. Rows are not drawn: no band, no row label in the picture. A layer's label stays in the file and in `show`, for agents. The one exception is a layer an edge ends at, drawn as a band (D28).

A group is a system, such as "catalog-sync" around its relay, topics and pipelines. Its members may sit in several neighbouring rows. The engine draws the group as one box around them, with its label at the top left, and keeps every non-member out of the box. Groups do not nest in stage 1.

This decision changed on 2026-10-11, after blind judging. The first version drew each layer as a labelled band and kept groups within one row. Two Opus judges scored a hand-drawn grouped target 57 of 60, and the engine's banded output 22 (D25).

Rejected:
- Labelled bands for every row. They frame the picture by row, which is rarely what a reader needs, and they use a column of width on labels.
- Groups within one row only. A system almost always spans rows, so this could not draw the systems that make an architecture diagram readable.
- Nested groups, for stage 1.

Reversed in part on 2026-10-12: groups nest, up to three levels, for deployment diagrams (D34).

### D8 Kinds and styles are short, fixed lists

Each node and each edge has a kind from a short list in [FEATURES.md](FEATURES.md). The theme decides how each kind looks. One emphasis value, `accent`, marks the one or two things a reader should see first. Stage 1 ships one theme.

Edges use at most two line styles: solid for a call or a data read, dashed for a message through a queue. A legend in the top right names the styles the diagram uses, and only those.

Rejected: per-node colors and free style attributes. Every invented style is something the reader has to decode, and something a weak model can get wrong.

Changed on 2026-10-12: edges have more looks than two, still from short lists (D33).

### D9 A person's adjustment will be an ordinary operation

In stage 2, a drag on the board becomes the same operation an agent would send, such as `node.move` or `node.align`. It changes the same facts, so the file has one kind of state, whoever made the change. If stage 2 needs a fact that stage 1 lacks, it is added under D22.

Rejected: a separate section for people's adjustments, reserved now and filled in stage 2. Without a defined schema, an empty section does not prevent a later format change, and a second kind of state would let people's and agents' changes disagree.

## The engine

### D10 Layout is recomputed from the facts on every change, like a typesetter

After every operation, grafical lays out the whole diagram again from the facts, the way LaTeX typesets a document again after every edit. Positions are never stored. Layout must be fast enough to feel instant: benchmark 11 in [GOALS.md](GOALS.md) allows 50 ms per operation in process.

Placement follows the facts in a fixed order: layers from top to bottom, nodes in each layer by their order, box sizes from their steps, gaps from the density.

**One column grid for the whole diagram.** Every node sits in a column of one grid shared by all rows, and the grid is centred. Within a row, columns follow node order. The engine chooses each node's column so that as many edges as possible run as one straight vertical segment, and so that every group's members fill a block of neighbouring columns with no outsider inside it. A node outside every group that two or more groups use, such as the store a write side and a read side share, is not lined up under either: it takes a column of its own between them, centred on the gap between their boxes. Both judges of the second phase 1b round ranked the target first for exactly that placement (2026-10-11). This replaces the first version's rows, each centred and spread on its own: those made almost every edge between rows jog sideways, which the judges read as staircases. The choice of columns is deterministic, so the same facts always give the same picture.

**Stability means the structure stays, not the pixels.** An operation never changes a fact it does not name. The one exception is the slot of a node added without a position, which D24 chooses. Positions are compared relative to the shared centre line: when the canvas widens, everything shifts by the same amount, and that is not movement. After an operation, only these may move:
- the elements it names;
- the other nodes in each layer whose contents changed, which re-spread sideways and keep their order. A layer's contents include its nodes' alignment facts;
- a layer that has a node aligned to a node that moved, which slides sideways as one block;
- the layers below a layer or gutter that changed height, which shift down as one block;
- edges that share a gap with a changed edge, but only inside the gaps they share;
- ports on a node side that a changed edge uses;
- the labels of routes that changed;
- the routes of edges attached to anything that moved.

"Changed" does not cascade: an edge that moved only because it shares a gap does not make its own neighbours movable. Otherwise a layer never moves sideways.

The column grid does not keep this list. It is solved again from the facts after every change, so one operation can move nodes sideways in rows it did not touch: after about half of all single operations on the catalog-sync fixtures (bench/results/phase2.md). Remembering the last layout would break D15. On 2026-10-12 the owner restated benchmark 4: an operation changes no fact it does not name (layer, order, group, lane, alignment), which the tests and `grafical diff` check, and sideways movement is measured, not gated. The stage 1 judges decide whether the movement hurts a reader; a column solver whose choices stay local to the change is the fix if it does.

One exception: when a gap between two nodes is full, the next edge in id order takes its next-best gap, and that can move a route outside the channels it shares with the changed edge.

**Gutters grow in fixed steps.** The gutter between two layers has a height chosen from fixed steps. When its tracks or edge labels no longer fit at the density's spacing, it grows to the next step, and steps are added past the last one when needed. The layers below shift down. Most edge additions therefore change no gutter height. On the 500-diagram fuzz test, growing made 221 diagrams taller than a fixed gutter would, 23 of them by more than 20%. That is the price of never squeezing lines together.

**Alignment.** An aligned node sits directly above or below its target. Its whole layer slides sideways as one block to put it there, and keeps its even spacing. Within one layer, the first alignment in node order holds. A later alignment that would need a different slide is rejected as `alignment-conflict`, and layers that would each slide to follow the other are rejected as `alignment-cycle`.

Rejected:
- Left-aligned layers that never re-spread. They keep more pixels still, but rows end up ragged, and the picture stops looking finished. The phase 0 router spike showed this.
- Reordering nodes on every change to reduce crossings. It gives a better picture once, but any change can reshuffle the structure. Order is chosen once, when a node is added, or when an operation asks for it (D24).
- Gutters that grow by any amount, because nearly every edge addition would then move the layers below.
- A "gutter full" defect. Its fix (a larger density, fewer edges, a split layer) costs the agent a round, and moves more than growing would.
- An aligned node that slides alone within its row's spacing, as phase 1 first built it. None of the three alignments in the public brief could hold that way.

### D11 Edges route orthogonally through the gaps, with our own router

Edges run as horizontal and vertical segments. They travel through the gutters between layers and the gaps between neighbouring nodes, never through a node. A label sits on or beside a segment of its own route, clear of nodes, other labels and other edges.

grafical uses its own gap router. It works in three passes:
1. **Path:** each edge's path through the gutters and gaps depends only on the placement and the edge itself.
2. **Channels:** each gutter and gap assigns ports and tracks from the edges inside it alone.
3. **Assembly:** each route is built from the chosen ports, tracks and gaps.

A change therefore spreads to another channel only through edges that use both.

The phase 0 router spike compared it with `libavoid-js` on the public brief (30 nodes, 41 edges) and on a 50-node variant. Evidence: `spikes/router/REPORT.md` on branch `spike/router`.

| | Our gap router | `libavoid-js` 0.5.0-beta.5 |
|---|---|---|
| No edge through a node, no label collisions | Pass | Pass, after tuning |
| Adding one edge stays inside D10's list (45 additions) | Pass | Pass |
| Same SVG bytes on macOS and Linux | Pass | Pass |
| License | MIT, our code | LGPL-2.1-or-later, with conditions on bundled builds |
| Route time, 30 nodes and 50 nodes | 0.09 ms, 0.24 ms | 80 ms, 1,840 ms |
| Unrelated edges drawn on top of each other | 0 | 3 |
| Crossings on the public brief | 68 | 40 |

What phase 1 added to the router:
- **Fewer crossings.** Gaps and port orders follow the neighbouring gaps, and each gutter orders its tracks. The public brief went from 68 crossings to 15. Most of that gain comes from node order, chosen by D24: with the spike's node orders, the router alone gives 45.
- **Buses.** A fan-out of three or more unlabelled edges in one line style leaves a node side through one port and shares one trunk. A call and a data read are both solid (D8), so they share a trunk. Members that pass the same rows choose one corridor together, so that the trunk passes those rows as one line and branches near its targets. D25 lowers this to two edges, and adds fan-ins: edges that share a target side arrive through one port.
- **Side exits.** An edge to the next row up or down, to a node wholly on one side of its source, leaves from that side at the middle of the row and turns once into its target: an L with one bend instead of a Z with two. It needs the source's row clear between the two, with no node and no line through it, and takes one gap of that row for itself. Fan-outs and fan-ins keep their shared port. A side with an edge to a neighbour takes none. If the target's port cannot sit at the turn, the edge leaves from its bottom or top as before. The owner asked for this on 2026-10-11: lines may leave a box in any direction.
- **Room before squeezing.**
  - Ports and gap tracks keep 8 px clear of lines that enter the same gutter from the other side.
  - A gap holds as many tracks as fit 8 px apart.
  - When a node side or a gap is overcrowded, a port or a track may sit 2 px off the 4 px grid, so that no two lines share an x.
- **Labels by rule.** A label sits on its own run, or beside a straight stretch of its line. If no slot is clear, it does the first of these that works:
  1. wrap onto 2 or 3 lines;
  2. use another gutter on its path;
  3. detour: its line steps out beyond the crowd onto new rows, and the label sits beside it.

  On the fuzz test, 2.9% of labels wrapped. Detours appeared only in very dense diagrams: 60 of 500, with 153 labels between them.
- **Edge cases:** self-loops, several edges between one pair, edges within a layer, edges that skip layers, and the left-most gap.

The phase 1 fuzz test lays out 500 random diagrams with fixed seeds in CI, and more on request. None has an engine-owned defect (D14). Before the phase 1 robustness work, 48% had one. 35,000 seeds in all passed, which is evidence, not a proof.

Rejected:
- `libavoid-js`. It is LGPL-2.1-or-later, and its npm `latest` is a beta from one maintainer. It took 1.8 s at 50 nodes, too slow to lay out on every change, and it drew unrelated edges on top of each other. Its one advantage, fewer crossings, is the router's to earn in phase 1.
- ELK for routing. ELK layered computes its own placement, and according to ELK's documentation it cannot route orthogonally around nodes that are already placed. Its fixed-layout algorithm only reuses bend points it is given. Sources, checked on 2026-10-10: the [ELK fixed algorithm reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-fixed.html) and the [ELK libavoid post](https://eclipse.dev/elk/blog/posts/2022/22-11-17-libavoid.html). Graphviz, because it is another placement engine and a native binary.

### D12 Text is measured from bundled fonts

grafical ships its own fonts, both under the SIL Open Font License, in Regular (400) and SemiBold (600):
- Inter 4.1 for Latin text;
- Noto Sans SC 2.004 for Chinese text, subset to the Table of General Standard Chinese Characters (8,105 characters) plus ASCII and common punctuation, and pinned to static weights from the variable font.

Each character is drawn from Inter if Inter has it, and from Noto Sans SC otherwise. `harfbuzzjs` shapes and measures the text from these files, never from the system. Labels wrap at spaces, hyphens, underscores and slashes in Latin text, and between characters in Chinese text. A label that still does not fit its box is a defect. Its fix is a larger size step or a shorter label.

The phase 0 text spike measured 160 labels at 12 and 14 px. Widths from `harfbuzzjs` matched the widths resvg draws within 0.0001 px. Evidence: `spikes/text/REPORT.md` on branch `spike/text-measurement`.

Before the first release, the font build must rewrite the subsets' name tables, which still say "Thin", and check the OFL reserved font name "Source".

Rejected:
- System fonts, because they differ between machines, and the same file would give a different picture.
- Measuring in a browser, because grafical runs without one.
- `fontkit`. It was just as accurate, but it is about 10 times slower and has had one npm release in two years. `harfbuzzjs` uses the same shaping engine that resvg ports.
- The GB 2312 subset (6,763 characters). It is the older standard. The 8,105-character subset costs about 516 KB more per weight.

### D13 grafical writes the SVG, and resvg rasterizes it

The engine writes the SVG itself, with a fixed element and attribute order. `@resvg/resvg-js` turns it into a PNG using the same bundled fonts. No browser takes part.

The writer splits each label into runs that use one font, and writes one `<text>` element per run, at x positions from its own measurements. resvg-js 2.6.2 does not choose a font per character: given a font stack, it draws the whole label from Noto Sans SC as soon as Inter lacks one of its characters. The phase 0 text spike measured errors of up to 15.67 px from this.

Rejected:
- One `<text>` element with a font stack, for the reason above.
- X6 for stage 1 output. Running it outside a browser is unproven, and it would make X6 a hard dependency before the board needs it.
- A headless browser, because it is slow and large.

### D14 The checker runs on every write. A defect the agent can fix fails the command, and the engine avoids the rest

After each operation or batch, grafical lays out the diagram and checks it. Each defect has an owner: whoever can fix it.

| Defect | Owner |
|---|---|
| Text that overflows its box | Agent: shorten the label or take a larger size step |
| A character the bundled fonts cannot draw | Agent: replace it |
| Two nodes that overlap | Engine |
| An edge that crosses a node | Engine |
| Two labels that collide | Engine |
| Two edges that share a segment, so a reader cannot tell them apart | Engine |
| A line that crosses text: a node, edge or group label | Engine |
| A non-member inside a group's box | Engine |

A write that leaves an agent-owned defect fails and changes nothing. The defect names its elements, what was found, what was expected, and an operation that would fix it.

Engine-owned defects are about where lines and boxes go, which no operation controls (D2). The engine must avoid them itself, with the room D10 allows: the next gutter step, more track or port separation, another label slot. If it still leaves one, that is an engine bug. The write goes ahead, the agent is never told, and `grafical check --all` reports it so that benchmarks and tests count it. The checker does not count the shared trunk of a bus as an overlap. A bus is a fan-out of unlabelled edges in one line style from one node (D11).

Text is checked against its line box, which includes the fonts' full ascent and descent. The box must stay 8 px from the node's sides and 4 px from its top and bottom.

Rejected:
- Warnings for agent-owned defects, because a picture with a known defect looks like success.
- Checking only at render time, because the error then surfaces long after the operation that caused it.
- Failing the write on engine-owned defects, as D14 first said. The phase 1 measuring run showed the cost: Haiku met an edge overlap and a label collision that only the router could fix, retried 11 times, and gave up.

### D15 Same file, same SVG bytes and PNG pixels

Under one version of grafical, the same file gives the same SVG bytes and the same PNG pixels on any machine.

The file is YAML with a fixed layout. The keys of each mapping appear in one fixed order, shown in FEATURES.md, "The diagram file". Layers, the nodes in a layer, and edges are ordered lists, so inserting a node changes one line, not an index on every later node. The SVG has a fixed order and no timestamps, and its numbers have fixed precision. Fonts are bundled, and resvg loads no system fonts. CI renders the fixtures on macOS and Linux and compares them.

On 2026-10-11 the phase 0 text spike rendered a mixed Chinese and Latin scene on macOS arm64 and Linux x64. The SVG bytes, the PNG pixels and even the PNG bytes were identical, in CI run 38114286868. The promise stays at pixels, because that is the safer one.

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

As built, 2026-10-12: the output is a YAML batch, one operation per line, such as `- { op: node.rename, id: relay, label: catalog relay }`, so `grafical apply` replays it on the revision's file and gets the file on disk; `--json` gives the same operations as a list. The operations come in an order in which each one is valid when it runs. A small edit comes back as exactly the operation that made it. Groups, lanes and edges keep creation order in the file and an operation can only append one, so any whose order changed are removed and added again; operations alone never change that order. A file the revision does not have comes back as `diagram.new` and the operations that build it. A test replays the differences between 120 pairs of random diagrams, both ways, file for file. Outside git, or at an unknown revision, the command fails with `not-in-git` or `bad-revision`.

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
| `libavoid-js` | LGPL-2.1-or-later. Not used, see D11 |
| `harfbuzzjs` | MIT |
| `subset-font`, used only to build the font subsets | BSD-3-Clause |
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
| `harfbuzzjs` | Text shaping and measurement |
| `subset-font` | Building the bundled font subsets, at development time only |
| vitest | Tests |
| Biome | Lint and format |

Rejected: a CLI framework with plugins, because grafical's command set is small and fixed.

### D24 The engine picks a new node's slot, and `layer.tidy` reorders on request

Node order within a layer decides most edge crossings, and it is exactly the kind of choice a weak model gets wrong. So when `node.add` gives no position, the engine places the node in the slot of its layer that gives the fewest crossings, and saves that slot as an ordinary order fact. In a batch, slots are chosen after every operation in the batch is applied, so edges added later in the same batch count. A tie goes to the last slot.

Then the nodes of the batch that had no position are ordered together: each in turn moves to the slot of its layer with the lowest route cost, while the cost drops. The cost counts crossings plus edges with more than two bends, then crossings, bends and length. Nodes placed before the batch, or given a position in it, keep their order, and no move may split a group or break an alignment. This was added on 2026-10-11: one node at a time, a node added early in a draft is placed before the edges that decide its best slot exist. On Haiku's three phase 1b drafts, ordering together cut crossings from 8, 7 and 6 to 0, 2 and 1.

`layer.tidy <layer>` reorders the nodes of one layer to reduce crossings. It runs once, as a named operation, so its changes are expected. Nothing reorders a layer otherwise (D10).

The engine tries every slot with the real router. One layout of a 15-node diagram takes about 0.6 ms, and a 15-node draft batch about 50 ms in all. Ordering together stops after 1,500 layouts, so a large batch stays fast.

Rejected:
- Appending a node last when no position is given. The agent's order would then decide the crossings, and that order is the main reason a diagram looks messy.
- Reordering automatically on every change, for the reason in D10.

### D25 The target look is a picture, and its rules are measured

On 2026-10-11 the owner judged the engine's first real output "cluttered, messy, lines are all over the place". An Opus designer then hand-drew three uncluttered versions of the public brief, using only what an engine could compute. Two blind Opus judges scored them against the engine's and a raw model's drafts, out of 60:

| Picture | Score |
|---|---|
| Grouped systems (the target) | 57 |
| Compact overview | 57 |
| Layered, curated | 50 |
| The engine, phase 1 | 22 |
| A raw model | 17 |

Both judges picked the grouped version. The compact one hid the messaging and retry mechanics that engineers want. The target is `bench/targets/catalog-sync-grouped.png`, with its SVG beside it. The engine must produce pictures like it from facts alone.

The rules that make it uncluttered. The checker measures each one. A broken rule is reported by `grafical check --all`, and it does not block a write:
1. **Size:** the canvas is at most 1024 px wide, so that text shows at full size in a document.
2. **Grid:** every node centre sits on the column grid (D10). At least half the edges are one straight segment, and no edge has more than 2 bends.
3. **Crossings:** at most 1 per 10 edges.
4. **Bundling:** 2 or more edges that share a source side, or a target side, share one trunk, and no junction of the trunk looks like a crossing.
5. **Corridors:** an edge that skips rows runs only in a column that is empty in every row it passes.
6. **Styles:** at most three line styles and one accent (D8). It was two until D33 added the dotted and plain lines on 2026-10-12.
7. **Edge labels:** at most 40% of edges carry one.
8. **Clear text:** no line crosses any text: node, edge or group label. This one is an engine-owned defect (D14).

Rejected:
- Tuning against defect counts alone. The phase 1 engine had zero defects on 5,000 random diagrams and still scored 22 of 60.
- The compact overview as the target. It is as clean, but it folds each system into one box.

### D26 Curation is coached, budgeted and shown

A good diagram leaves things out, and only the agent can decide what. grafical helps in three ways:
- **Budget.** `grafical check` warns when a diagram has more than 16 nodes, and suggests merging nodes that share a group and all their edges. The warning does not block.
- **Coaching.** `grafical guide` tells agents to merge what a reader does not need apart, such as several topics into one node, and to keep a diagram to one story. It also says to merge only nodes with the same edges, because a merged box claims every edge of every member, and never to wrap one node in a group of its own name. Both were added on 2026-10-11, after the phase 1b judges found merged boxes that drew calls the brief does not have.
- **Honesty.** A diagram may carry a subtitle, one sentence under the title, and a footnote naming what it leaves out ("Not shown: …"). Both are facts in the file, set by operations.

Rejected:
- Refusing diagrams over a node count. Some diagrams need more, and a hard limit would push agents into merging things a reader needs apart.
- Letting the engine drop nodes. That would change facts nobody named (PHILOSOPHY.md).

### D27 A node with no size is sized to its text

A node added without `--size` gets a medium box, or a large one when its text does not fit the medium box. The fit test is the checker's overflow rule (D14), so such a node overflows only when its text does not fit the large box either. The file stores no size for it, so the size is recomputed from the text on every layout (D10): a rename that shortens the label shrinks the box again. A node given a size keeps it, and `node.resize` sets or clears one.

`sizing: fixed` in the file turns this off: a node without a size is always medium, as before, and text that does not fit is refused. It is a diagram fact, set by `grafical new --sizing` or `diagram.sizing`, because the file alone decides the picture (D15). Without it, sizing is auto.

This was added on 2026-10-11. In the three phase 1b drafts, text overflow was the most common reason grafical refused Haiku's first batch, which it refused in 66% of draft calls. The fix it suggested was to remove the node and add it again larger.

Rejected:
- Auto size choosing the small box for short text. Boxes of three widths in one row look uneven, and the medium box is the target's grid.
- Storing the chosen size in the file. A later rename could then not shrink the box, and the file would hold a value the engine derived.
- A setting outside the diagram file, such as a user config. The same file would then draw differently on two machines.

### D28 An edge may end at a group or a layer

An edge joins two nodes, or a node and a container, or two containers. A container is a group, drawn as its system box (D7), a layer, or a lane (D32). A layer an edge ends at is drawn as a band across the content, with its label in a head above the row, over the first stretch of the row with no node below it. One arrow to "catalog-api" says that callers call that system, without saying which part, and it replaces an arrow to each member.

A container end is met at its top or bottom when the other end lies above or below all its rows, and at its side when the two share a row. The router knows only nodes, so a container end is routed to the node of the container that faces the other end, the one nearest it, and the route is cut where it meets the container's box. Such an edge never shares a port or a trunk with the stand-in's own edges.

Three rules are facts, so they are operation errors:
- `edge-inside`: neither end may lie inside the other. A node in a group, a group with a member in a layer, a layer and a group that overlap, a node or a layer in a lane, and a layer and a column lane, which always cross, all count.
- `empty-container`: a container end must hold at least one node.
- `edge-blocked`: an end that shares a row with a group must sit right beside it in one of those rows, with no node between.

Removing a group or a lane removes the edges that end at it, as removing a node does.

The owner asked for this on 2026-10-11: an arrow may point to a set, a layer or a swimlane. Lanes are containers too (D32); two lanes are never the two ends of one edge (`lane-to-lane`), because neighbouring lanes share a border and the line between them would have no length.

Rejected:
- Routing a container end to the box's border directly. The router places ports and tracks around nodes. A stand-in reuses all of that, including the label slots and the side exits.
- A label column for every band. D7 rejected one for every row. A band's label sits in its own head instead.

### D29 Open questions settled by the owner

On 2026-10-11 the owner settled the questions that had stayed open since phase 0:
- **Wide layers:** a layer wider than the page is a warning, not a defect, and `layer.split` moves the second half of a layer into a new layer below it. Rejected: a defect that blocks the write until the agent splits, because how to split is a content choice; wrapping the layer, because it moves nodes no operation named.
- **The layer order an agent picks** stays the agent's choice. The engine warns when an edge crosses a layer whose nodes it does not connect. Rejected: the engine reordering layers, because which layer comes first is part of the story the agent tells.
- **Alignment on the column grid:** `node.align` stays as it is. It joins two nodes in one column of the grid (D10).
- **Exact lists:** the five node kinds, three edge kinds, three size steps and three densities stay as they are. Rejected: more node kinds, such as gateway or cache, because each new choice is one more a weak model can get wrong.
- **File naming:** `<name>.grafical.yaml`.
- **Undo:** git only. Every change is a commit that can be reverted. Rejected: a `grafical undo` command, which would duplicate git with less safety.

### D30 A diagram takes its look from a theme or a shared stylesheet

A theme sets every value of the look: the colors of each node kind, of groups, bands, lines and text; line widths; corner radii; and type sizes and weights. grafical ships a few built-in themes. A stylesheet file, `<name>.grafical-style.yaml`, starts from a built-in theme and overrides any of its values. A diagram names its theme or stylesheet in the file, `style: <name or relative path>`, and the default theme applies when it names none. Changing a stylesheet changes every diagram that names it, which is how a team keeps one look.

An operation sets it (`diagram.style`, and `grafical new --style`), so that an agent can apply the look a person asks for in plain words before drawing. Layout reads the same values, so a theme with larger type changes the layout as well as the colors.

The same file is the same picture still holds, read as: the same diagram file and the same stylesheet give the same picture (D15). Both live in git.

As built: the themes are `default`, `dark` (light lines on a dark ground) and `print` (greys with stronger lines). A stylesheet holds `grafical-style: 1`, an optional `base` theme, and partial `paint` and `type` values, each checked: colours as `#rrggbb`, type weights 400 or 600 only. Whether a line is solid or dashed follows its kind (D8), so a stylesheet can change the dash pattern of messages but cannot dash a call. The default theme draws exactly as before stylesheets existed.

Rejected:
- Colors or styles on one node or edge (D8). A model would have to choose them, and the look would drift.
- A stylesheet found by folder, without the diagram naming it. The diagram file would no longer say what decides its picture.
- CSS. A stylesheet holds named values, not selectors, so that every value has one meaning and the engine can check it.

### D31 A live viewer shows the diagram as it is now

`grafical view <file>` serves the picture on a local port and opens it in a window, without browser tabs when Chrome is installed. The page redraws within a moment of every change to the file, from any process: the window shows what an agent is drawing while it draws. Elements that changed are marked briefly. The viewer only shows; editing on a board is stage 2. It keeps no log: the file and git hold the history.

As built: the page is served on 127.0.0.1 only, on a free port unless `--port` names one, and receives each new picture over server-sent events. The viewer watches the diagram's folder, because a write replaces the file by renaming over it, and redraws when the file or a stylesheet changes. The picture is the same SVG that `render` writes, scaled to fit the window. Marks are boxes laid over it that fade in under two seconds: a new node or edge, changed text, a node that changed size, kind or accent, and an edge with new ends, kind or label. A node that only moved because the layout re-flowed is not marked. While the file cannot be read, the page keeps the last good picture and shows the errors. The viewer may start before the file exists, so a person can open the window and then ask an agent to draw. Defects and warnings are listed under the picture.

A list of changes beside the picture, newest first, says what each change did, as the operations `grafical diff` finds between the last good file and the new one (D18), in a few words each: `node add search "search-api" in services`, `lane join webteam search`. It starts with the file's size when the window opens, keeps the last 200 changes for a window opened later, and shows errors in their place. The owner asked for it on 2026-10-12, after seeing the window run: the picture alone does not say what an agent just did. The window opens at the picture's size, with the list beside it, within a 1440 × 900 screen, and asks to follow the picture when it grows or shrinks, where the browser lets a page resize its own window.

Rejected:
- Opening the viewer on every `new`. Benchmarks and scripts would open windows nobody watches.
- A log of operations beside the file. The owner wants the live picture, and git already holds the history.

### D32 Swimlanes run as rows or as columns

A swimlane is a labelled band that names who owns what. A diagram's lanes all run one way. Lanes that run as rows each span neighbouring layers, with the lane's label in a header on the left. Lanes that run as columns each span the whole height, with the label in a header on top, and each node joins at most one lane. A node, or a layer, may stay outside every lane. A group lies inside one lane. An edge may end at a lane (D28).

As built, 2026-10-12:
- **The file.** A lane's members name it, as a group's do (D7): a layer carries `lane:` when lanes run as rows, a node when they run as columns. The way lanes run follows from which members name them, so it cannot disagree with them, and a file that has both is refused (`lane-mixed`). `lanes:` lists each lane's id and label after `groups`.
- **The operations.** `lane.add`, `lane.join` and `lane.leave` take layer, node or group ids. A group stands for its layers or its nodes. While no lane has a member, the first layer or node decides the way, and groups alone mean columns.
- **Row lanes.** A lane's layers must be neighbours (`lane-gap`), and a layer added between two layers of a lane joins it, as does the new layer of a split. The lanes share one header column on the left, as wide as the widest label up to 112 px, where labels wrap. The header sits left of everything the rows hold, lines included, and the picture centres on the whole block. A border between two lanes runs below the gutter's tracks, and the heads below it take their full room.
- **Column lanes.** They go left to right in list order. The engine keeps every row in lane order, on every write and in layout: a node outside every lane sits right of the lanes, or left of them when it came first in its row. In the grid, every node of a lane lies left of every node of the next lane, so each lane takes a block of columns. Neighbouring lanes' contents, boxes included, keep 40 px apart, and their shared border runs in the middle. No vertical line runs within 8 px of a border.
- **Groups.** A group lies inside one lane, or outside every lane (`group-across-lanes`).
- **Edges.** An edge may end at a lane (D28). An edge to a column lane never leaves its source by a side, because the lane's full-height border would cut a side exit to a stub. One that meets a column lane beside it gets room for its label between the node and the lane, and the lane's border moves to that lane's side of the gap. A label that a cut left away from its line, or across the border, moves beside the line that remains, clear of boxes, lines and text.
- **Checks.** A lane label outside its header is an overflow, which the agent fixes with `lane rename`. A node outside its lane, or inside a lane it is not in, is `lane-stray`, an engine-owned defect (D14). The fuzz test gives lanes to half its diagrams.

Rejected:
- Rows and columns in one diagram, as a grid of lanes and phases. It is the most expressive form and the most work, and no brief needs it yet.
- Listing members on the lane. Every other membership in the file is named by the member, and `show` then prints it on the member's line.
- A setting for the way lanes run. It would be one more fact that could disagree with the members.

### D33 Lines have a short list of looks, and meet a box on any side

Decided by the owner on 2026-10-12, not yet built. In the stage 1 round every comment on grafical's pictures named the lines, and the owner's view was that the agent lacked the means to make a picture clear, not only that the router drew lines badly.

- **Kinds.** Built 2026-10-12. The kind still decides the look (D8): `call` and `data` solid, `async` dashed, and two new kinds: `link`, a plain line with no arrowhead, for "related, no direction", and `optional`, dotted with an arrowhead, for a call that happens only sometimes or a soft dependency. The legend names each style a diagram uses: by default "call or read", "message", "optional" and "related". A stylesheet may set the dash of `async` and `optional` lines.
- **Per edge.** Built 2026-10-12. An edge may carry arrowheads at both ends (`both`), and may be emphasized (`accent`), drawn thick with a larger arrowhead, to mark the main path; the legend then names "main path". A link takes no arrowheads (`both-on-link`). A two-way edge never shares a trunk from its start, where its second arrowhead sits, and a main-path edge shares one only with other main-path edges. Emphasis is the edge's accent, like a node's (D8): a weight from a short list, never a colour, so it keeps to the rule that no operation colours one element (GOALS.md). More than three main-path edges, and more than a third of all edges, draw a warning, because a main path stands out only against thin lines.
- **Curves.** A stylesheet may set `paint.edge.shape: curved` (D30). Routes stay the same orthogonal routes through the gaps (D11); only the drawing turns their corners into curves, and a curve never enters a box.
- **Sides.** A line may leave or enter a box on any of its four sides. One side may carry several lines, each in its own slot, evenly spaced, so that lines on one side never pile up or read as one. The engine chooses the side and the slot; the agent does not.
- **Engine marks.** Where two lines cross, one hops over the other, so a crossing never reads as a join. Where lines merge on purpose, a dot marks the join. Parallel lines keep a gap.
- **Hints.** In 49 stage 1 steps the agents never called `diagram tidy`, `layer tidy`, `node swap` or `node align`. A write now says when `diagram tidy` would remove crossings, which is a fact the engine may tell the agent (PHILOSOPHY.md).

Rejected:
- The agent choosing the side a line leaves by. Spreading lines tidily is the kind of choice a weak model gets wrong.
- Free styles per edge, such as a colour or a dash pattern. The reader would have to decode each one.
- Curves drawn freely, outside the routed channels. They could cross boxes and text, and the router could no longer keep lines apart.

### D34 Stage 1 draws every diagram type the layered engine can draw

Decided by the owner on 2026-10-12, not yet built: C4 context and container diagrams, cloud and infrastructure, event flow, flowcharts, state machines, swimlane processes, dependency graphs, data flow and deployment.

- **Kinds.** Five new node kinds: `state`, a rounded box; `decision`, a diamond; `terminal`, a pill with text, for a flowchart's Start and End; `initial`, a filled dot; and `final`, a ringed dot, for a state machine's start and end. C4, cloud, event flow, data flow, dependency graphs and swimlane processes need no new shapes. `state` and `terminal` were built on 2026-10-12: a state's corners are rounder than a box's, and a terminal is a pill like an actor but tinted, so the two never read alike. So was `decision`: a diamond holds text only in its middle (a padded block of width tw and height th fits when tw/w + th/h <= 1), so its box per size step is larger than a plain box's, 136x64, 184x80 and 232x96, and a line that meets its box's side is drawn on to the slanted outline. Shape, text room and line ends live in one module, `src/theme/shapes.ts`, that layout, the checker and the renderer share. The benchmark's own geometry check reads a slanted outline as an outline, not as its box. `initial` and `final` followed the same day: a filled dot and a ring around a dot, 24 px whatever the size step, since a size on a dot is ignored rather than refused, so that a batch that sizes every node still applies. A dot's label stays in the file and in `show`, and is not drawn. Its single port sits at its centre, and a group's label keeps clear of the whole dot, because several ports on one side spread over all of it.
- **Nested groups.** A group may sit inside another group, up to three levels, as a region holds a network that holds hosts (`group add --in`). This reverses part of D7.
- **Teaching.** `grafical guide <type>` teaches the agent one diagram type, so the main guide stays within its budget (D17). The flowchart and state machine guides were built on 2026-10-12: each under 3,000 characters, with an example batch that the tests apply and check for defects, and the main guide points to them in its first lines.

Rejected, for stage 1:
- Sequence diagrams, entity-relationship and class diagrams, mind maps and timelines. Each needs a layout family of its own, and the core diagram has not yet met the MVP bar.
- A setting for the diagram's type. The kinds already say what is drawn.

### D35 The engine names rearrangements that make the lines better, as commands

Decided on 2026-10-12. The owner rejected all three phase 1d milestone pictures for their lines ("rearranging would solve this problem") and asked that the drawing model, not a person, find the better drawing: "either theres a mechanism to allow the model to realize theres a better way of drawing this or we add more operations or make the operations more obvious to use". In stage 1, grafical's 25 drafts looked at their own picture 26 times and ran no command after any look, and 49 steps never called `diagram tidy`, `node swap` or `node align`.

- **What the engine tries.** When a line crosses another or bends more than twice, the engine tries rearrangements of the nodes at the ends of such lines, or of every node in a diagram of at most 16: a swap with each node in its row, and a move into the row above or below, where it picks the slot (D24). A move that empties a row also removes the row. Each try is laid out and scored by the route cost of D24: crossings plus lines over two bends, then crossings, bends and length.
- **What counts.** A rearrangement is a hint when it lowers the crossings plus lines over two bends, or keeps them and saves at least two bends without a new crossing. The best three are reported, each one applied for real first and dropped if it leaves a defect.
- **How the agent sees it.** `apply`, `check` and `render` print `hint: <gain>: <commands>`, with the diagram's path filled in, and `--json` lists them with their operations. The guide tells the agent to run a hint unless it moves a node into a row where it does not belong.
- **Cost.** A diagram of up to 16 nodes tries up to 200 rearrangements, in about 25 ms; a larger one fewer, about 1200 divided by its node count, nodes at the most troubled lines first, so that `check` stays within benchmark 11 at 50 nodes (343 ms).

On the rejected pictures, the first hint for the photo-sharing diagram moves its upload queue beside the API (lines over two bends 2 -> 0, bends 8 -> 2), and the first for the state machine moves Cancelled up a row (its crossing goes). The flowchart has no hint: its faults, a line that should enter from the side and too little room before two lines merge, are the router's (D33).

Rejected:
- Applying the best rearrangement automatically. It changes order and rows, facts no operation named (D10), and a row move can change what the picture says, which is the agent's call.
- Asking the agent to look harder. A model's eye is what the tool is meant not to depend on (PHILOSOPHY.md), and the agents already looked and changed nothing.
- More operations for the agent to place lines by hand, such as a side for each end. Choosing sides is the engine's job (D33).

## Not yet decided

- **Stage 2:** how the board reaches the file (a local server while the board is open is proposed), and how snap guides turn a drag into one operation.
