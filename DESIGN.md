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
| D7 | Layers are horizontal bands, stacked top to bottom | The tool carries the taste |
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

### D10 Layout is recomputed from the facts on every change, like a typesetter

After every operation, grafical lays out the whole diagram again from the facts, the way LaTeX typesets a document again after every edit. Positions are never stored. Layout must be fast enough to feel instant: benchmark 11 in [GOALS.md](GOALS.md) allows 50 ms per operation in process.

Placement follows the facts in a fixed order: layers from top to bottom, nodes in each layer by their order, box sizes from their steps, gaps from the density. Each layer is centred, and its nodes are spread evenly, so every row looks tidy. No search takes part, so the same facts always give the same picture.

**Stability means the structure stays, not the pixels.** An operation never changes a fact it does not name. The one exception is the slot of a node added without a position, which D24 chooses. After an operation, only these may move:
- the elements it names;
- the other nodes in each layer whose contents changed, which re-spread sideways and keep their order;
- the layers below a layer or gutter that changed height, which shift down as one block;
- nodes aligned to a node that moved;
- edges that share a gap with a changed edge, but only inside the gaps they share;
- ports on a node side that a changed edge uses;
- the labels of routes that changed;
- the routes of edges attached to anything that moved.

"Changed" does not cascade: an edge that moved only because it shares a gap does not make its own neighbours movable. A layer whose contents did not change never moves sideways. Benchmark 4 checks this list on every change.

**Gutters grow in fixed steps.** The gutter between two layers has a height chosen from fixed steps. When its tracks no longer fit at the density's spacing, it grows to the next step, and the layers below shift down. Most edge additions therefore change no gutter height.

An alignment that cannot hold together with the order in either layer is rejected as an operation error.

Rejected:
- Left-aligned layers that never re-spread. They keep more pixels still, but rows end up ragged, and the picture stops looking finished. The phase 0 router spike showed this.
- Reordering nodes on every change to reduce crossings. It gives a better picture once, but any change can reshuffle the structure. Order is chosen once, when a node is added, or when an operation asks for it (D24).
- Gutters that grow by any amount, because nearly every edge addition would then move the layers below.
- A "gutter full" defect. Its fix (a larger density, fewer edges, a split layer) costs the agent a round, and moves more than growing would.

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

Before phase 1 ends, the router needs:
- **Fewer crossings, within D10:** choose gaps and order ports by the neighbouring gaps, order tracks inside a gutter, and use a stable bus for fan-outs from one side.
- **Label slots by rule:** fixed slots per channel, so that a label moves only with its own route, and a defect when no slot is free.
- **Edge cases:** self-loops, several edges between one pair, the left-most gap, and arrowheads on close ports.

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

A write that leaves an agent-owned defect fails and changes nothing. The defect names its elements, what was found, what was expected, and an operation that would fix it.

Engine-owned defects are about where lines and boxes go, which no operation controls (D2). The engine must avoid them itself, with the room D10 allows: the next gutter step, more track or port separation, another label slot. If it still leaves one, that is an engine bug. The write goes ahead, the agent is never told, and `grafical check --all` reports it so that benchmarks and tests count it. The checker does not count the shared trunk of a bus as an overlap. A bus is a fan-out of unlabelled edges of one kind from one node (D11).

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

`layer.tidy <layer>` reorders the nodes of one layer to reduce crossings. It runs once, as a named operation, so its changes are expected. Nothing reorders a layer otherwise (D10).

Rejected:
- Appending a node last when no position is given. The agent's order would then decide the crossings, and that order is the main reason a diagram looks messy.
- Reordering automatically on every change, for the reason in D10.

## Not yet decided

- **Wide layers:** what happens when a layer is wider than the maximum diagram width. One option is a defect that tells the agent to split the layer. The other is wrapping the layer into rows, which moves nodes the operation did not name.
- **Columns and swimlanes:** groups that span layers, such as a write side and a read side.
- **Alignment and even spreading:** how an alignment fact combines with spreading a layer evenly (D10), and whether nodes line up in columns across layers without a change in one layer moving another sideways. Phase 1 decides.
- **Exact lists:** node kinds, edge kinds, size steps and density values. Phase 2 settles them.
- **File naming:** `<name>.grafical.yaml` is proposed.
- **Undo:** whether undo exists outside git.
- **Stage 2:** how the board reaches the file (a local server while the board is open is proposed), and how snap guides turn a drag into one operation.
