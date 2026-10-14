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
| D36 | The help is the reference; there is no separate guide | The tool carries the taste |
| D37 | Output is discrete: facts and counts, and the agent judges | The command line states facts; the agent understands |
| D38 | A fan-out of three or more unlabelled lines leaves as one bundle | The tool carries the taste |
| D39 | The file fixes the picture; the same facts give mostly the same picture | The same file is the same picture |
| D40 | A node carries marks in five slots, and a mark is an emoji, text or a file | The engine owns every pixel |
| D41 | An edge has a weight: a named level or a width, tuned by the stylesheet | The tool carries the taste |
| D42 | The legend names line widths and marks, and may leave an entry out | The tool carries the taste |
| D43 | A wall is empty space between two named sides, crossed only where it allows | The engine places; the agent states relations |

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

An operation error has a code, the index of the operation, the field, what was found, and facts (D37, 2026-10-13): the closest existing IDs for an unknown ID, the allowed values for a bad value, the value it most likely means, a limit and how many there are, the row or group it concerns, and the operations that would fix it. Until 2026-10-13 it gave "what was expected" and a suggestion as sentences.

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

A group is a system, such as "catalog-sync" around its relay, topics and pipelines. Its members may sit in several rows. The engine draws the group as one box around them, with its label at the top left, and keeps every non-member out of the box. Groups do not nest in stage 1.

Changed on 2026-10-12 (owner's decision): a group's members no longer need neighbouring rows. A row between two of its rows that holds no member, such as a row an agent adds inside a system for a write buffer, used to be refused (`group-gap`); now the box stretches over it, and that row's nodes sit wholly left or right of the box, each on the side the nodes it connects to are, and on the right when nothing says otherwise. In stage 1, the one grafical change step that failed on its own merits was this refusal.

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
- **Buses.** A fan-out of three or more unlabelled edges in one line style leaves a node side through one port and shares one trunk. A call and a data read are both solid (D8), so they share a trunk. Members that pass the same rows choose one corridor together, so that the trunk passes those rows as one line and branches near its targets. D25 lowers this to two edges, and adds fan-ins: edges that share a target side arrive through one port. Since 2026-10-12 only a node side with more lines than room merges them; every other line has a port of its own (D33).
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

A write that leaves an agent-owned defect fails and changes nothing. The defect names its elements, the field and the text at fault, and facts: the lines the text takes and the most it may, the characters no font can draw, and the operations that would fix it (D37).

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

`grafical show` prints the layers, the nodes in order, the groups and the edges in a few lines, in the same vocabulary as the operations. The help pages carry the operation reference (D36; until 2026-10-12, `grafical guide`). Together they keep the fixed overhead within benchmark 3's budget.

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
| `@twemoji/svg` | MIT for the package, CC-BY 4.0 for the graphics (D40), from its npm page |
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

Two fixes on 2026-10-14, found while dogfooding. A batch with only one node without a position put that node last in its row, every time: the node was taken out of its row before its slot was asked for, and the slot search, which counts the node's own place as removed, did not find it. Since the first build, only batches with two or more such nodes had their slots chosen. Second, both searches take only slots that can be drawn: no group split or left without one box, no alignment broken, and no node put between a group and the end of a line that meets the group beside it (D28). Moving a node into a row with no position used to pick a slot that split its group, and the refusal suggested joining the wrong node to the group. When no slot can be drawn, the search falls back to the slots that keep the groups whole, so the refusal names what is in the way: `edge-blocked` now gives the row and the nodes between the line's two ends, and `group-split` gives three fixes, joining the node to the group or moving it out to either side of the members.

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
4. **Bundling:** each line meets its node side at a port of its own (D33). A side with more lines than room merges them: 2 or more unlabelled edges of one kind that leave it share one trunk, those that arrive at it share one port, and no junction of the trunk looks like a crossing.
5. **Corridors:** an edge that skips rows runs only in a column that is empty in every row it passes. Of those columns it takes the one whose route crosses fewest of the lines that placement already fixes, each crossing weighed as two jogs of travel, then the shortest (D33). A corridor through a group box that holds neither end of the line pays as much as a crossing, and the line keeps out of such a box's margin and border.
6. **Styles:** at most three line styles and one accent (D8). It was two until D33 added the dotted and plain lines on 2026-10-12.
7. **Edge labels:** at most 40% of edges carry one.
8. **Clear text:** no line crosses any text: node, edge or group label. This one is an engine-owned defect (D14).

Rejected:
- Tuning against defect counts alone. The phase 1 engine had zero defects on 5,000 random diagrams and still scored 22 of 60.
- The compact overview as the target. It is as clean, but it folds each system into one box.

### D26 Curation is coached, budgeted and shown

A good diagram leaves things out, and only the agent can decide what. grafical helps in three ways:
- **Budget.** `grafical check` warns when a diagram has more than 16 nodes, and suggests merging nodes that share a group and all their edges. The warning does not block. Reversed on 2026-10-13 by D37: grafical prints counts, not warnings. The number of nodes is one of them.
- **Coaching.** The help (`grafical --help`, D36; at first `grafical guide`) tells agents to merge what a reader does not need apart, such as several topics into one node, and to keep a diagram to one story. It also says to merge only nodes with the same edges, because a merged box claims every edge of every member, and never to wrap one node in a group of its own name. Both were added on 2026-10-11, after the phase 1b judges found merged boxes that drew calls the brief does not have.
- **Honesty.** A diagram may carry a subtitle, one sentence under the title, and a footnote naming what it leaves out ("Not shown: …"). Both are facts in the file, set by operations.

Rejected:
- Refusing diagrams over a node count. Some diagrams need more, and a hard limit would push agents into merging things a reader needs apart.
- Letting the engine drop nodes. That would change facts nobody named (PHILOSOPHY.md).

### D27 A node with no size is sized to its text

A node added without `--size` gets a medium box, or a large one when its text does not fit the medium box. The fit test is the checker's overflow rule (D14), so such a node overflows only when its text does not fit the large box either. The file stores no size for it, so the size is recomputed from the text on every layout (D10): a rename that shortens the label shrinks the box again. A node given a size keeps it, and `node.resize` sets or clears one.

Since 2026-10-13 (phase 1e), every box of a row is drawn as tall as the row's tallest box, its width its own, so that the tops of a row line up: five of six judge verdicts on the private reference brief named one box taller than its neighbours. Dots and diamonds keep their shapes, and the size a node is fitted to does not change. A self-loop now runs two gutter rows below its box, since the box reaches the bottom of its row.

`sizing: fixed` in the file turns this off: a node without a size is always medium, as before, and text that does not fit is refused. It is a diagram fact, set by `grafical new --sizing` or `diagram.sizing`, because the file alone decides the picture (D15). Without it, sizing is auto.

This was added on 2026-10-11. In the three phase 1b drafts, text overflow was the most common reason grafical refused Haiku's first batch, which it refused in 46% of draft calls (first reported as 66%, which counted every read of the guide as a refusal). The fix it suggested was to remove the node and add it again larger.

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
- **Wide layers** (the warning reversed on 2026-10-13 by D37, which prints the width and the nodes in each row as counts): a layer wider than the page is a warning, not a defect, and `layer.split` moves the second half of a layer into a new layer below it. Rejected: a defect that blocks the write until the agent splits, because how to split is a content choice; wrapping the layer, because it moves nodes no operation named.
- **The layer order an agent picks** stays the agent's choice. The engine warns when an edge crosses a layer whose nodes it does not connect. (Since D37, 2026-10-13, it reports the line and the row it passes, as a fact.) Rejected: the engine reordering layers, because which layer comes first is part of the story the agent tells.
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
- **Curves.** A stylesheet may set `paint.edge.shape: curved` (D30). Routes stay the same orthogonal routes through the gaps (D11); only the drawing turns their corners into curves, and a curve never enters a box. Built 2026-10-12: each corner is as round as half of each of its two stretches, halved while it would come within 4 px of a box, a label or another line, and never less round than the orthogonal style's corner. A side exit becomes one sweeping curve, and a corner beside a label or a close line stays small. The stylesheet takes `orthogonal` or `curved` and nothing else, and every built-in theme is orthogonal.
- **Sides.** A line may leave or enter a box on any of its four sides. One side may carry several lines, each in its own slot, evenly spaced, so that lines on one side never pile up or read as one. The engine chooses the side and the slot; the agent does not.
  - **Side entry, built 2026-10-12.** A line between neighbouring rows whose target lies wholly left or right of its source, and that could not leave by a side (D11), runs straight out of the source's top or bottom, beside the target, and turns into the target's facing side at the middle of its row: one bend, where the route through the gutter takes two. The side must be free, the vertical part must run in the open between the target and its neighbour, clear of every line through that gap, and a line that would have joined a fan-in leaves it. The owner asked for exactly this on the flowchart's loop ("should be entering from the right side instead of the bottom") and wanted room between Issue refund and End, where two lines merged; both now enter from the side. Of the pinned pictures only the row-lanes fixture changed: the mobile app's line now turns into the gateway's side instead of merging with the web shop's. Over the fifteen saved no-hint drafts, bends fell from 16.47 to 15.60 per draft.
  - **Own slots, built 2026-10-12.** Every line meets its node side at a port of its own. Only a side with more lines than ports fit at the port pitch, 16 px apart and 16 px in from each corner, still merges as before: its unlabelled lines of one style leave through one trunk or arrive through one port. Turning trunks off everywhere was tried and lost: a side with twenty lines became a wide ribbon that crossed everything below it. So that separate lines need not cross each other, the ports of a side go in the order of where each line's run in the gutter ends, walking round the gutter from the box's left corner, so that a line that turns back into the same row runs outside the lines that go on; lines that share a corridor through a row go in the order of where they leave it, the one that leaves first furthest out; and the unlabelled lines that leave one side past the same rows still choose one corridor together. A line of a fan-out may now leave or enter by a side, unless another line's run in that gutter crosses the vertical part. Over the 42 saved drafts of stage 1 and phase 1d, crossings fell from 5.10 to 4.79 per draft and bends rose from 15.76 to 15.86; eight drafts lost crossings and three gained some. Both pinned pictures changed and were reviewed: in the grouped catalog, the line to geo-svc leaves the pipelines' left side, and the failed line goes over the top instead; in the row lanes, the gateway's line to the catalog leaves its right side, so the mobile app's line enters the gateway's top beside the web shop's, each at its own port. The dot that marks a merge came later the same day (engine marks, below).
  - **Spread slots, built 2026-10-12, after the stage 1 rerun.** The MVP judges no longer counted shared trunks, but counted the separate ports instead: lines leaving one box 16 px apart "in a tight bundle", "crowded together near the corner". The ports of a side now spread evenly over it first, up to 48 px apart, and fall back to 16 px only when the side has no room, or when spreading would bend a line that could run straight. Over 54 saved drafts, crossings went from 4.39 to 4.43 per draft and bends from 16.06 to 16.13: the change is in how the lines look, not in their count. A box too narrow for its lines, such as six lines on a medium box, keeps them 16 px apart; that is a placement question, where the box sits against its targets. Three pins changed and were reviewed.
  - **Lines kept out of strangers' groups, built 2026-10-12, after the stage 1 rerun.** The MVP judges also counted lines that ran down a group's margin or along its border, though the group held neither end. Such a line now keeps out of the margin and the border, from a padding inside the border to a clearance outside it, and a corridor through the inside of such a group pays as much as a crossing. Forbidding margins to every line was tried first and lost (crossings 4.43 to 4.67 per draft over 54 drafts), because lines between the group's own members and lines with no other way lost their room; kept to strangers, the rule changes the counts by almost nothing (problems 5.72 to 5.69, crossings unchanged, bends 16.13 to 16.09). No pinned picture changed.
  - **Corridors that cross least, built 2026-10-12.** An edge that skips rows chose its corridor by distance alone, so the state machine's line from Placed to Cancelled went round the left of Paid and crossed the line to Shipped. A corridor now also pays for every crossing that placement already makes certain: a line straight through a gutter the route runs along, a line along a gutter the route passes straight through, and a sideways line across a row it passes. That line now goes round On hold and crosses nothing. Over the 42 saved drafts, crossings fell from 4.79 to 4.14 per draft and bends from 15.86 to 15.67; eleven drafts lost crossings against the trunk-everywhere router and one, whose store sits far from its readers, still has two more. Weighing a crossing as four or eight jogs gave the same crossings and slightly more bends. The row-lanes pin changed and was reviewed: the order events line no longer crosses the arrow from payments to the ledger.
  - **Side turns for lines that skip rows, built 2026-10-12.** A line that skips rows runs down its corridor at one x. Where that x lies in the open beside its source, in the source's row, the line now leaves by that side and turns once into the corridor; where it lies in the open beside its target, the line turns out of the corridor into the target's side at the middle of its row. The same rules hold as for lines between neighbouring rows: the side must be free, no line may run up or down through the row between the box and the turn, no other line's run may cross the gutter at the turn, and the vertical part keeps clear of the labels at the top of a row it enters. The state machine's line from Placed to Cancelled now leaves Placed's right side, runs down past On hold and enters Cancelled's right side: two bends and no crossing, where the owner saw four bends and a crossing. Over the 42 saved drafts, bends fell from 15.67 to 14.45 per draft and problems from 5.62 to 5.45, and every order-states and password-reset draft now has none; crossings rose from 4.14 to 4.33, all of it in three drafts of 25 components. In those, a line that moved to a side left its gutter to the others, and the gutter then put three runs in an order that crosses twice: it weighs a line through a label as four crossings, and two labels needed the room. A label's slot now also pays for each crossing that the order it fixes would force, as much as 64 px of sliding, which won two of those drafts back their two crossings each: crossings 4.33 to 4.24 per draft. The third keeps its two: the label beside a short run lies over another line's way down, and the slot at the run's other end conflicts with an order another label has fixed. The row-lanes pin changed and was reviewed: the orders database line leaves the orders API's left side and enters the database's left side, two bends instead of four.
- **Engine marks.** Where two lines cross, one hops over the other, so a crossing never reads as a join. Where lines merge on purpose, a dot marks the join. Parallel lines keep a gap. Built 2026-10-12: at a crossing the horizontal line hops over the vertical one in an arc of 4 px, and crossings closer than one hop share a wider arc; a dot sized to the line marks every point where a line leaves or joins one it runs along, which happens only on a crowded side's trunk (D25 rule 4). The SVG writer draws both alone, so routes, checks and measures do not change, and the benchmark's geometry check finds no defect in the saved rounds. Parallel lines needed nothing: across the 42 saved drafts no two run closer than 8 px, and most run 12 to 16 px apart. A self-loop was 32 px wide and 20 px deep, too small for its arrowhead to read; its ends now sit 48 px apart and its run takes the gutter's second row, 32 px down.
- **Hints.** In 49 stage 1 steps the agents never called `diagram tidy`, `layer tidy`, `node swap` or `node align`. A write now says when `diagram tidy` would remove crossings, which is a fact the engine may tell the agent (PHILOSOPHY.md).

- **Room around stores**, 2026-10-13 (phase 1e). Three of six judge verdicts on the private reference brief saw lines run close under or beside a cylinder. On fifteen architecture drafts, lines passed within 16 px of a store 0.70 times a store, against 0.03 to 0.15 for every other kind: stores sit where many lines run, along the gutter's first or last track. A gutter now keeps 8 px more room on its side next to a row that holds a store; near passes fell to 0.19 a store, and the pictures grew 1.8% taller.

Rejected:
- The agent choosing the side a line leaves by. Spreading lines tidily is the kind of choice a weak model gets wrong.
- Free styles per edge, such as a colour or a dash pattern. The reader would have to decode each one. Since 2026-10-13 an edge's width is the exception (D41).
- Curves drawn freely, outside the routed channels. They could cross boxes and text, and the router could no longer keep lines apart.

### D34 Stage 1 draws every diagram type the layered engine can draw

Decided by the owner on 2026-10-12, not yet built: C4 context and container diagrams, cloud and infrastructure, event flow, flowcharts, state machines, swimlane processes, dependency graphs, data flow and deployment.

- **Kinds.** Five new node kinds: `state`, a rounded box; `decision`, a diamond; `terminal`, a pill with text, for a flowchart's Start and End; `initial`, a filled dot; and `final`, a ringed dot, for a state machine's start and end. C4, cloud, event flow, data flow, dependency graphs and swimlane processes need no new shapes. `state` and `terminal` were built on 2026-10-12: a state's corners are rounder than a box's, and a terminal is a pill like an actor but tinted, so the two never read alike. So was `decision`: a diamond holds text only in its middle (a padded block of width tw and height th fits when tw/w + th/h <= 1), so its box per size step is larger than a plain box's, 136x64, 184x80 and 232x96, and a line that meets its box's side is drawn on to the slanted outline. Shape, text room and line ends live in one module, `src/theme/shapes.ts`, that layout, the checker and the renderer share. The benchmark's own geometry check reads a slanted outline as an outline, not as its box. `initial` and `final` followed the same day: a filled dot and a ring around a dot, 24 px whatever the size step, since a size on a dot is ignored rather than refused, so that a batch that sizes every node still applies. A dot's label stays in the file and in `show`, and is not drawn. Its single port sits at its centre, and a group's label keeps clear of the whole dot, because several ports on one side spread over all of it.
- **Nested groups.** A group may sit inside another group, up to three levels, as a region holds a network that holds hosts (`group add --in`). This reverses part of D7. The file and the layout were built on 2026-10-12. A group names the group it sits in (`in`); a node still names its innermost group. A group's members are its own nodes and its inner groups' nodes, for every rule that asks who is in it: its block in each row, the nodes an edge to it reaches, its lane, and which nodes may lie inside its box. Its box lies a padding outside each inner box on every side, and when an inner box starts or ends in the same row as the outer one, its head sits below the outer head and its padding above the outer padding. A box inside a box takes the canvas's fill, so the fills alternate by depth, and outer boxes are drawn first. The owner chose alternating fills as the default and asked for the other look as a choice: a stylesheet may set `paint.nesting: shade`, and then each level is a third of the way nearer the border colour, which is darker on a light theme and stays visible on the dark one. A group more than three deep is refused (`group-too-deep`), and so is one inside itself (`group-cycle`). The operations followed the same day, with the owner's defaults and a choice for the agent each time: `group add --in` makes a group inside another; `group join` and `group leave` take groups as well as nodes, so that a change request such as "put these two in a region" is one step; `group leave` takes a member out of every group, or one level out with `--up`; `group remove` moves the group's nodes and inner groups into the group around it, or out of every group with `--out`. The diff names a moved group as a leave and a join, as it does a moved node. The fuzz test now nests groups in about a quarter of its diagrams, three deep in a sixth, and found that a line into a row under stacked heads crossed one of the labels: each label was seated as if it were alone over the row, while a line into the row passes every head above it. Labels are now seated outer first, and an inner label leaves the lines room past the outer labels too. The four seeds that failed run in every test run.
- **Teaching.** `grafical guide <type>` teaches the agent one diagram type, so the main guide stays within its budget (D17). The flowchart and state machine guides were built on 2026-10-12: each under 3,000 characters, with an example batch that the tests apply and check for defects, and the main guide points to them in its first lines. The other six followed the same day: `c4` (people, other systems and one group around the system's containers, technology in the sublabel, every edge labelled), `cloud` (region, network and subnet as nested groups), `deployment` (environment, cluster and namespace as nested groups, the runtime and count in the sublabel), `event-flow` (producers, one queue per topic, consumers, async edges named by their event), `data-flow` (sources, processes and stores, every edge data and labelled with what moves) and `dependency` (edges pointing down from what depends to what it needs, optional dependencies dotted). Each example draws with no crossing: two of the first drafts had one that no layout can avoid, two nodes that both link to the same two others, and lost a link, because an agent copies the example's shape. Reversed the same day by D36: the guides' lessons moved into the help, and `grafical guide` went.

Rejected, for stage 1:
- Sequence diagrams, entity-relationship and class diagrams, mind maps and timelines. Each needs a layout family of its own, and the core diagram has not yet met the MVP bar.
- A setting for the diagram's type. The kinds already say what is drawn.

### D35 The engine names rearrangements that make the lines better, as commands

Reversed on 2026-10-13 by D37: grafical no longer searches for moves or prints hints. The agent decides what to try, and `grafical try` measures it.

Decided on 2026-10-12. The owner rejected all three phase 1d milestone pictures for their lines ("rearranging would solve this problem") and asked that the drawing model, not a person, find the better drawing: "either theres a mechanism to allow the model to realize theres a better way of drawing this or we add more operations or make the operations more obvious to use". In stage 1, grafical's 25 drafts looked at their own picture 26 times and ran no command after any look, and 49 steps never called `diagram tidy`, `node swap` or `node align`.

- **What the engine tries.** When a line crosses another or bends more than twice, the engine tries rearrangements of the nodes at the ends of such lines, or of every node in a diagram of at most 16: a swap with each node in its row, and a move into the row above or below, where it picks the slot (D24). A move that empties a row also removes the row. Each try is laid out and scored by the route cost of D24: crossings plus lines over two bends, then crossings, bends and length.
- **What counts.** A rearrangement is a hint when it lowers the crossings plus lines over two bends, or keeps them and saves at least two bends without a new crossing. The best three are reported, each one applied for real first and dropped if it leaves a defect.
- **How the agent sees it.** `apply`, `check` and `render` print what to improve, `lines: <n> crossings, <m> lines bending more than twice: a crosses b; c bends 4 times; ...`, and the moves measured to fix it, `hint: <gain>: <commands>`, with the diagram's path filled in. A hint that moves a node among other kinds is marked so. `--json` lists the same, with each hint's operations.
- **Taking them is the agent's.** The workflow in `grafical --help` (at first, the guide's) says: if the output shows `lines:` and `hint:` lines, improve them yourself; run a hint's commands if the moved node still belongs in its new row, then render again and repeat. The engine diagnoses and measures; the model decides and makes each move with its own command.
- **First measurement, 2026-10-12** (`bench/results/p1d-hints.md`): with hints printed but no command to take them, Haiku ran none in the 9 of 15 drafts that showed one, though the first hint, applied blindly, clearly improved the drafts looked at (password reset: crossings 1 -> 0, lines over two bends 2 -> 0, bends 12 -> 7). Hence a command to take them, `diagram improve`, and a workflow step to run it.
- **Safe hints.** In the second round agents ran `diagram improve` in 9 of 11 drafts, and each run lowered the problems, but improve had moved nodes among other kinds and the agents moved them back by hand, which left one draft with 29 problems. A hint is safe when it keeps every node among its own kind: a swap within a row, or a move into a row of the same family (steps and states, stores, queues); callers and outside systems never move. `diagram improve` took only safe hints. The others are still shown, marked as moving a node among other kinds, for the agent to judge: the photo-sharing diagram's best hint, its upload queue beside the API, is one. In the third round agents ran it in 7 of 10 drafts and undid nothing.
- **`diagram improve` removed, the same day.** The owner judged that it made the engine decide: "break improve apart. its proven to be useful. so what about telling the models what to improve and allow models to do it themselves?" It chose the moves and made them; PHILOSOPHY.md puts what the diagram says, rows included, with the agent, and "Only the facts you name change". Its parts stay where they belong: the engine names what to improve (`lines:`) and measures moves (`hint:`), and the agent judges each move and runs it. Offline, `pnpm bench lines --improve` replays an agent that follows the safe hints one by one; on the fifteen drafts made without hints that takes problems from 5.53 to 3.93 per draft.
- **Rows, hubs and order, 2026-10-13.** In the help rounds no agent ran a hint on the public brief: every hint there moved a store or a service among other kinds, and the agents declined them, rightly; one agent instead moved a row by hand, a fix the search never tried. The search now also tries each row moved one or two places up or down, and a node with three or more lines slid to every place in its row, so that it can sit over the nodes it reaches. A row move keeps every node among its kind, but the order of the rows is the story's, so it is marked "reorders rows". Hints that keep both kinds and rows come first; the best of the others keeps the last place when it leaves fewer troubled lines than any safe one, so that small safe gains do not hide a large fix. Each hint names the troubled lines it untangles ("untangles api->photos"), so that the agent can match it to what it sees. `check` at 50 nodes takes 381 ms, within benchmark 11's 400.
- **Cost.** A diagram of up to 16 nodes tries up to 200 rearrangements, in about 25 ms; a larger one fewer, about 1200 divided by its node count, nodes at the most troubled lines first, so that `check` stays within benchmark 11 at 50 nodes (343 ms).

On the rejected pictures, the first hint for the photo-sharing diagram moves its upload queue beside the API (lines over two bends 2 -> 0, bends 8 -> 2), and the first for the state machine moves Cancelled up a row (its crossing goes). The flowchart has no hint: its faults, a line that should enter from the side and too little room before two lines merge, are the router's (D33).

Rejected:
- Applying the best rearrangement automatically. It changes order and rows, facts no operation named (D10), and a row move can change what the picture says, which is the agent's call.
- Asking the agent to look harder. A model's eye is what the tool is meant not to depend on (PHILOSOPHY.md), and the agents already looked and changed nothing.
- More operations for the agent to place lines by hand, such as a side for each end. Choosing sides is the engine's job (D33).

### D36 The help is the reference; there is no separate guide

Decided on 2026-10-12 by the owner. In a real setup an agent knows only that a `grafical` command exists, and `grafical --help` and `grafical <command> --help` are how it learns the tool. The stage 1 benchmarks hid this: their prompt told every agent to run `grafical guide` first, and the main guide then sent it on to `grafical guide <type>`, two hops past the command an agent would try on its own.

- **What the help holds.** `grafical --help` says what grafical is, how to work, what makes a diagram good, and one entry per diagram type in grafical's words. Each command's help adds, after its usage and options, the sections it needs, always in one order: When to use, By diagram type, Kinds, Good to know, Common mistakes, Limits, Batch file, Output, When refused, See also, Example. The text lives in `src/cli/help.ts`.
- **Direction, not numbers.** Advice gives a direction and leaves the call to the model ("one story per diagram"), not a count ("12 to 16 boxes"). Numbers appear only for limits grafical enforces, such as two accents and three levels of groups, taken from the engine's own constants. Thresholds live in warnings, which react to the diagram at hand (D26).
- **What the type guides taught moved into it.** Measured the same day (`bench/results/p1d-guides.md`): without the type guides Haiku still knew its diagram types, but not grafical's spelling of them. It drew a flowchart's Start and End as state-machine dots, whose labels are not drawn, left C4 and data-flow lines unlabelled, and was refused 16% of its calls against 3%. So the help says which kind each type uses (`node add`), when each type labels a line (`edge add`), how groups nest and how lists are written (`group add`, `lane add`, `apply`). The worked example per type went; `apply --help` keeps one full example, which the tests build from the help as printed.
- **Clear names.** A name an agent misreads is fixed at the name. Fifteen drafts of the help round gave the legend an edge kind, `line: async`, reading `line` as the line of async edges; the field names how lines look, so the owner renamed it `style` on 2026-10-13. A batch that still says `line` is refused with the new name. A refusal also says how to fix the usual mistakes: which look an edge kind is drawn in, how to quote text that YAML cut at a comma, a free id for one already taken.
- **Budget.** The help read before a first draft, `--help`, `new --help` and `apply --help`, stays under the old guide's 12,000 characters, about 2,800 tokens (benchmark 3). The help is printed at 80 columns on every terminal, so it is the same text for every agent.

Rejected:
- Keeping `grafical guide` beside the help. Two references drift apart, and an agent that is never told about the guide never reads it.
- Pointing `--help` at the guide. Each hop is a place where an agent stops following.
- A snippet for users to paste into their agent's instructions. It works only where a user adds it.

### D37 Output is discrete: facts and counts, and the agent judges

Decided on 2026-10-13 by the owner (PHILOSOPHY.md, "The command line states facts; the agent understands"). grafical had begun to judge and advise in prose: warnings that a diagram has too many nodes "for one story", hints that pick moves by grafical's own idea of better, refusals that explain in sentences. Understanding a diagram is the coding agent's job; grafical gives it the facts to do it.

- **What the diagram is:** `show`, as now: rows, nodes in order, groups, lanes and edges.
- **How it is drawn:** a discrete report of the drawing: for each box its row, its place in the row, its size and its lines on each side; for each line the sides it leaves and enters, its bends, its length, the lines it crosses and the rows it passes without connecting; and totals. The agent judges the drawing from it without opening the picture.
- **What a change would do:** `grafical try <file> <batch>` applies a batch without writing it and reports the same counts before and after, and a `delta` record of the change in each. The agent decides what to try; grafical measures. It replaces hints (D35), which chose the moves themselves.
- **Warnings become counts:** the number of nodes, the picture's width, the nodes in a row, the lines passing a row, with no threshold and no advice.
- **Refusals stay terse:** the field, what was found, the allowed values, the closest ids, and a mapping where one exists (`async -> dashed`), with no sentences. Since 2026-10-13 they are records too: `error op=0 code=bad-value field=kind found=database likely=store allowed=service,store,...`. The code says what is wrong, and a fixed set of facts says what is there: `near`, `likely`, `allowed`, `free`, `count`, `lines`, `min`, `max`, the `row`, `group` or `node` it concerns, `line` and `column` in the YAML, and `fix`, operations that would fix it. A YAML syntax error gives the text of its line in place of the parser's message.
- **The help is documentation, not output about a diagram:** its principles and examples stay.
- **The form is records**, added on 2026-10-13 after the owner turned down phrases such as "most lines at a box 10 (sync)": one record per line, a word that names it (`ok`, `failed`, `error`, `defect`, `counts`, `box`, `group`, `line`, `wrote`), then `key=value` fields in the logfmt style, such as `line id=a->b from=a to=b leaves=bottom enters=top bends=2 length=372 crosses=- passes=-`. A list is comma separated, a thing and its number is `api:3`, and none is `-`. A value with a space is quoted. The fields are the JSON's, under the same names.
- **How long the lines are**, added the same day, when the owner found a box with one line put in the top row while its partner sat four rows down: the line ran 964 px round the right edge, and nothing in the output said so. Each line now gives `direct`, the shortest a line between its two ends could be (the gap between them across plus the gap down), `detour`, its length over `direct`, and `skip`, the rows between its ends' rows. Each box gives `lines` and `reach`, the length of its lines together, and the counts give every line's `length` together and the `longest` line. On that draft: `length=964 direct=480 detour=2.01 skip=3`, and `grafical try` with the box moved down to its partner's row prints `delta ... bends=-4 length=-1380`.
- **Which lines are bundled**, added on 2026-10-14 after dogfooding: an agent saw three lines leave a box as one trunk and could not tell from the output which lines those were, or that a label would keep a line on its own. Each line now gives `bundle`, the lines it leaves or arrives with through one port (D38), and `show --help` says when lines bundle. It is read from the picture: lines whose ends meet one box at one point.

Rejected:
- Phrases with the numbers in them ("most nodes in a row 4 (outside)"). They read well to a person, but the agent has to parse English to get the number, and each phrase is worded its own way.
- A table with a header row. A column is read by its position, so an agent that reads one row alone cannot tell which number is which.
- Advice in the output, however helpful. It decides for the agent, and one reader's advice is not another's (PHILOSOPHY.md, "Easy and consistent, not right for every reader").
- Hints as discrete commands with numbers. The numbers are facts, but which moves to try is a judgement, and it is the agent's.

### D38 A fan-out of three or more unlabelled lines leaves as one bundle

Decided on 2026-10-13, as the first feature of phase 1e (FEATURES.md). The owner called a stage 1 picture "terrible... way too many lines to track", though it had one crossing: one service sent six lines out of one side, each to its own port, turning at six heights on their way to six boxes across two rows. Every architecture draft measured that day had a box with four to seven lines.

- **The rule:** unlabelled lines in one line style that leave one side of a box leave as a bus, one port and one trunk that splits near its targets, with a dot at each split, when there are three or more of them, on any side. A crowded side (more lines than port slots) still bundles two or more, as before (D33). Labelled lines and two-way lines keep a port each.
- **Measured** on fifteen architecture drafts (three of the private reference brief, nine of the public brief, three of 25 components): the line drawn on the page, a shared trunk counted once, fell 10%, from 97,508 px to 88,220 px; crossings went from 39 to 40 and bends from 357 to 370. On the picture the owner called terrible, the line drawn fell from 5,272 px to 2,408 px and its one crossing went.
- **Labelled lines stay apart.** Bundling them too would cut the line drawn by 22%, but their labels had no place on a shared trunk and were lost, and crossings rose from 39 to 51. A label on each branch near its target would be a separate decision.
- **The target look (D25) changes with it:** each of its two services now sends one trunk to its three stores and services below, where it sent three lines. The owner sees the picture before and after.

Rejected:
- Bundling labelled lines without a place for their labels: it loses the labels.
- Bundling from two lines: two separate lines are as easy to follow as a trunk that splits.

### D39 The file fixes the picture; the same facts give mostly the same picture

Decided on 2026-10-13 by the owner, asked whether two agents that state the same facts must get the same picture: "mostly. but the intermediate grafical.yaml always outputs the exact same diagram."

- **The same file, the exact same picture.** This is D15 as it stands: the same diagram file and stylesheet give the same SVG bytes and PNG pixels, on any machine.
- **The same facts, mostly the same picture.** The file keeps the order of each row's boxes, and a box placed without a stated position takes the slot that suits the lines it has when it arrives (D24). Two agents that state the same facts in another order can get a different order in a row. grafical does not reorder a diagram to one canonical form.

Rejected:
- Canonical placement, the same facts always giving the same picture. Every edit could then move boxes the agent did not touch, against the stability D10 promises.
- Canonical placement within one batch, with later edits kept stable. It was the recommendation, but "mostly" asks for no new rule, and a batch already places its boxes together, knowing all of their lines (D24).

### D40 A node carries marks in five slots, and a mark is an emoji, text or a file

Decided on 2026-10-13 by the owner, who wanted a very important node flagged with `⚠️` at its top-left, and asked that a mark not be limited to a fixed list: "anything. dont constrain it. at the end its a svg/png/textBox or smth".

A node has five slots: `top-left`, `top-right`, `bottom-left`, `bottom-right` and `left`. Each holds at most one mark. `node icon <file> <id> --slot <slot> --icon <mark>` sets it, and without `--icon` it clears it. A mark is one of:
- an emoji, drawn from the bundled Twemoji images, so it does not depend on the machine's fonts (D12, D15);
- a text of up to 6 characters, such as `P0`, drawn in the bundled fonts on a badge. It sits on a badge, and the badge may be styled, see below;
- an SVG or PNG file, named relative to the diagram file and inside its folder.

A text mark's badge is dark by default, and the owner decided on 2026-10-14, after a plain text over a corner looked ugly, that it may be styled. On the same day, asking for it to be "sorta adjustable", the owner added more settings. Each comes from a short list, so the caller still picks from a list and never gives a measure (D2):
- `--bg`, the badge color, by a name (`red`, `amber`, `green`, `blue`, `purple`, `gray`, `dark`) or as `#rrggbb`. The file keeps the hex, so a change to the names never changes an existing file. This is the one place a caller sets a color, an exception to D8;
- `--fg`, the text color, by the same names or `#rrggbb`. Left out, grafical picks light or dark text, whichever reads better on the badge;
- `--border`, a border color. Left out, there is none;
- `--shape`, `square`, `rounded` or `pill`. Left out, rounded;
- `--size`, `s`, `m` or `l`, for any mark: 16, 20 or 28 px high, with the font size and padding that go with it. Left out, `m`.

Setting a slot again replaces its mark with the styles the new command names. A style that holds its default is left out of the file. A picture (an emoji or a file) takes `--size` and no other style, because it has its own colors and outline, and the refusal names the field.

The caller never gives a size in pixels or a position (D2). A picture is a square. A text mark is as wide as its text plus the padding of its size on each side, and at least a square, so `NEW` fits its badge. The slot fixes where it goes:
- a corner mark is centred on its corner: half its height lies outside the box on each axis, at every size, so the corner stays covered and a large mark does not sit on the label. It takes no room, so it moves no other box, text or line (D10);
- a corner mark grows away from its corner, so it stays over the same corner;
- the `left` mark takes a column inside the box, as wide as the mark plus 8 px. The box keeps its size, the text gives up that width, and the text centres in the rest. A node whose size grafical chooses (D27) takes the large box when its text no longer fits the medium one. A diamond and a dot have corner slots only.

The same file gives the same picture (D15):
- the SVG embeds each picture as a data URI, so it never links to a file;
- the diagram stores a file's SHA-256 beside its name. A changed or missing file fails the load with `mark-file-changed` or `mark-file-not-found`. Setting that slot again accepts the file as it is;
- an SVG that holds a script, a `foreignObject`, an event handler or a reference to anything outside itself is refused (`mark-file-unsafe`), and so is a path outside the diagram's folder.

`show` lists each mark as `icon.<slot>`. The checker adds `mark-covers`, for a mark that covers text or another node, and reports a text mark the fonts cannot draw as `missing-glyph` (D14). `diff` reports marks as `node.icon` operations (D18).

The emoji images come from `@twemoji/svg` (MIT for the package, CC-BY 4.0 for the graphics, which asks for attribution). Which emoji it lacks is the limit: an emoji with no image is refused as `mark-not-drawn`.

Rejected:
- A fixed list of icon names. It gives the safest output, but the owner wants any picture, and a list can never hold what people flag nodes with.
- Drawing an emoji with a color emoji font. It would depend on the font on each machine, against D15.
- A mark with a size or an offset. It breaks D2, and each mark would sit differently.
- Several marks in one slot. The slot would have to grow or its marks shrink, and a corner would then cover more of the box.

### D41 An edge has a weight: a named level or a width, tuned by the stylesheet

Decided by the owner on 2026-10-13, built the same day. D33 gave an edge one emphasis, the thick main path. The owner wants some edges thicker than others, in more than one step.

- **Levels.** The built-in themes ship three: `thin` (1.25, the width of every edge today), `thick` (2.5, today's emphasis) and `heavy` (4). An edge with no weight is `thin`.
- **Stylesheet.** A stylesheet (D30) may retune and add levels. `thin` is `paint.edge.strokeWidth` and `thick` is `paint.edge.main.strokeWidth`, the keys that already set them. Every other level is in `paint.edge.weights`, a map from a level name to a width, which holds `heavy` and may add more, such as `critical`. A level name is lowercase letters, digits and hyphens, and `thin` and `thick` are not names there. `thin`, `thick` and `heavy` always exist. A command or a file that names a level the stylesheet lacks is refused with `unknown-weight`, which lists the allowed names. The file is read before its stylesheet, so the pipeline checks the levels once the stylesheet is loaded.
- **A width.** `edge weight` also takes a number of pixels, from 0.5 to 8. This reverses part of D33, which rejected free styles per edge. It reverses the width only. Colour and dash pattern stay with the kind (D8).
- **The file.** An edge holds `weight: <level or number>`. A level is written as its name, a width as a number. `accent: true` on an edge stays valid and means `weight: thick` (D22: the format only grows). `edge emphasize` sets `accent` and clears `weight`. `edge weight` sets `weight` and clears `accent`, and without a weight, or at `thin`, it clears both. So grafical never writes both. When a hand-written file has both, `weight` wins.
- **Arrowhead.** It grows with the width. At the `thin` width it is the thin arrowhead, at the `thick` width it is the main-path arrowhead, and past that it grows by the same step per pixel, up to a length of 12 px. A narrower edge than `thin` keeps the thin arrowhead.
- **Legend.** The legend names "main path" when a diagram has an edge heavier than `thin`. The sample line is drawn at the `thick` width; since D42, at the thinnest width the entry stands for. D33's warning about too many main-path edges is not built, and D41 does not add it. More levels need it more, so it stays in the not-yet list below.
- **Equal widths.** Two edges with the same width look the same, whatever their level names. The legend does not name levels. Changed by D42 on 2026-10-14: a diagram may name each width in the legend.

Rejected:
- Three fixed levels with fixed widths. The owner wants to retune them.
- A numeric width only, with no names. The agent would pick a different number for every edge, and the reader would have to decode each one. The levels give the agent the choice D33 wanted. The number is there for the person who needs an exact width.
- Raising the weight limit with the number of levels. Emphasis works because few edges have it.

### D42 The legend names line widths and marks, and may leave an entry out

Decided by the owner on 2026-10-14. When the reference picture was redrawn with grafical alone, thick lines were used to mean "writes to a store". The legend could only call them "main path", so the emphasis was dropped. Asked whether an agent should name it, the owner answered "yes, the legend needs more flexibility", and chose, of three options, a legend that names everything in the picture that carries meaning. Built the same day.

- **What it lists.** In order: each line style the diagram uses (D8, D33), each line width heavier than `thin`, and each mark the diagram names that a node carries (D40). The caller gives words only. Where the legend goes and how it wraps are the engine's (D2).
- **Widths.** A width the diagram names gets its own entry, its sample drawn at that width. The widths it does not name share one entry, "main path", as in D41, drawn at the thinnest of them. A width is named by its level (`thick`, `heavy`, or a level the stylesheet adds), or by its number for an edge whose weight is a number of pixels. `thin` takes no name: the line styles' entries say what thin lines are. A width lighter than `thin` has an entry only when it is named. The entries go from the thinnest to the widest.
- **Marks.** A mark has an entry only when the diagram names it, because a mark with no words tells the reader nothing. It is named by what it shows: its emoji, its text or its file name. Marks with the same name share one entry, drawn like the first one found (rows top to bottom, nodes in order, slots in order). The sample is drawn at the small size, so every line of the legend has one height.
- **Left out.** A line style or a width may be left out, for a meaning that needs no key. A mark is left out by not naming it.
- **Names for what is not drawn.** A name for something the diagram does not draw is kept, and its entry shows once it is drawn, as a line style's wording always did. `show --drawn` lists the entries that are drawn.
- **Wrapping.** The legend sits right of the title. When it is wider than the room there, it wraps into more lines below the first, each line starting at the same left edge. The room is the content's width, never less than the footnote's least width (D26), less the title and the gap beside it. A legend that fits stays on one line, as before. A subtitle starts below the legend's last line.
- **The file.** `legend` keeps its four line-style keys, and each now holds words or `false` for left out. It gains `weights`, a map from a level or a width to words or `false`, and `marks`, a map from a mark to words. The format only grows (D22).
- **The operation.** `diagram.legend` names one of `style`, `weight` or `mark`, with `text` for its words, `hide: true` to leave it out, or neither for the default. The command keeps `diagram legend <file> <style>`, and takes `--weight <w>` or `--mark <m>` in place of the style, with `--text` or `--hide`.

Rejected:
- Free entries, which the agent writes in its own order. It is the most flexible, but the legend could then list what is not drawn and leave out what is.
- Lines and widths only. Marks would stay unexplained, and a mark's meaning is what a reader cannot guess.
- A legend the caller places, at the bottom or the left. Placement is the engine's (D2).
- Default words for each level, such as "heavy". A level's name is the stylesheet's word, not the reader's, so widths with no name keep D41's one "main path".

### D43 A wall is empty space between two named sides, crossed only where it allows

Decided by the owner on 2026-10-14. On 2026-10-13 the owner asked for "breaks" and "invisible walls that anything cannot be put into", and chose "dividers and walls" for phase 1e. Shown a wall drawn as a line with gates, the owner answered "walls can have thickness", then "a space! not a layer, not a line, not a thick line", that it "doesn't have to be entirely across the whole image, could be partial", and that lines cross it "only when the wall allows". The model below was then approved as shown.

- **What it is.** A wall separates two sides, each a list of nodes and groups. It is empty space between them: nothing is placed in it.
- **Its direction is the engine's.** When every row of one side lies above every row of the other, the wall runs across, between them. When the two sides share rows, and in each shared row one side's nodes all sit left of the other's, it runs up and down between them. Otherwise it is refused (`wall-sides`), and so is a node on both sides.
- **Partial.** A wall is as long as the two sides need: across, from the left edge of the leftmost box of either side to the right edge of the rightmost; up and down, from the top of the highest to the bottom of the lowest.
- **Thickness.** A wall adds a fixed space where it runs: across, to the gutter just below the upper side's lowest row, after the gutter's tracks; up and down, between the grid columns of the two sides. Rows and columns are shared by the whole picture, so the gap is as long as the picture, but the wall, its rule and its drawing are only as long as the sides.
- **Crossing.** A line from one side to the other is refused (`wall-crossed`) unless the wall allows it: the wall's `allow` names the line, or a node or group at one of its ends, such as a gateway. A line that ends at neither side but whose route passes through the wall's space is an agent-owned defect (D14) with the same code and the same fixes, since the boxes the agent placed lead it there.
- **Drawn or not.** A wall without a label is invisible: only its space shows. With a label it draws a dashed line through its middle, with the label at its start: across, at its left end, above the line; up and down, at its top. That is the divider the phase planned, so dividers are walls with labels, not a second fact.
- **Where the label goes.** Lines the wall allows cross its space, and no line may cross text (D14). Across, the label takes the first place along the wall, from its left end, that no crossing line comes within 8 px of; failing that, the first such place across the picture at that height, inside any row lanes; failing that, left of every box and line, which a second layout pass makes room for, as a band's label does (D28). The dashed line reaches a label placed past its end. The fuzz test found the last two cases on 2026-10-14: a wall that many allowed lines cross, and a long label in a narrow picture.
- **Changes.** A node or group that goes leaves the walls' sides and allow lists. A wall left with an empty side goes too, and is listed among the changes.
- **The file.** `walls`, a list of `{id, between, and, allow, label}`, where `between`, `and` and `allow` are lists of ids. The format only grows (D22).
- **The operations.** `wall.add` with `between`, `and`, and optionally `allow` and `label`; `wall.allow` adds ids to what a wall lets through, or takes them away with `off`; `wall.remove`. The commands are `wall add <file> <id> --between <ids> --and <ids> [--allow <ids>] [--label <text>]`, `wall allow <file> <id> <ids...> [--off]` and `wall remove <file> <id>`.
- **Up and down.** Each row the wall spans splits in two: in a row with nodes of the left side, the nodes up to its last one lie left of the wall; in a row with only nodes of the right side, the nodes before its first one. A node between the two sides would stand in the wall, and a row with neither side gives the wall no place: both are refused as `wall-sides`, with the row and the nodes in the way. In the column grid every node left of the wall, in any of its rows, lies left of every node right of it, so that the wall takes a block of columns' boundary, as a column lane does (D32); a wall whose order contradicts another fact is refused the same way. The wall's space lies between those columns, boxes included, and no line may run down through it in its rows. It is as wide as its least space, or as its label wrapped at 96 px. The label sits at its top, centred, at the first height down the wall that no line or box comes near; failing that, above the wall, then below it.
- **Built in steps.** Walls across were built first, on 2026-10-14, and walls up and down the same day.

Rejected:
- A line between two rows, with gates. The owner: a wall is "a space", "not a line".
- A row drawn as a band, whose nodes are the gates. The owner: "not a layer".
- A thick line. The owner: "not a thick line".
- A wall across the whole picture only. The owner: "could be partial".
- Lines that cross freely, and a sealed wall. The owner: lines cross "only when the wall allows".
- A wall placed by coordinates or by size. Where it goes and how thick it is are the engine's (D2); the agent names what it separates.
- Rerouting a line round a wall. A line between the sides is refused before layout, and any other line through a wall's space is reported with fixes. Routing round a partial obstacle is left for later.

## Not yet decided

- **Marks and lines:** a corner mark is not yet checked against the lines that leave the box near its corner. A line that meets a mark is not reported.

- **Too many heavy edges:** D33 says more than three main-path edges, and more than a third of all edges, draw a warning, because a main path stands out only against thin lines. No code does this yet. With D41 the count would be every edge heavier than `thin`.
- **Stage 2:** how the board reaches the file (a local server while the board is open is proposed), and how snap guides turn a drag into one operation.
