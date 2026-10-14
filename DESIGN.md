<!-- what-we-build: approved 2026-10-15 -->
# Design

> Started 2026-10-11. Rebuilt on 2026-10-15 as principles, dated decisions and open questions.

grafical takes operations from a coding agent, one command or one batch at a time, and keeps a diagram file in YAML that holds the facts they state. After every write it lays the diagram out again from those facts, checks it, and answers with records: what changed, any refusal with its fixes, and counts of how the picture is drawn. `render` turns the same file into SVG and PNG. What each command does is in [FEATURES.md](FEATURES.md), and why grafical sees diagrams this way is in [PHILOSOPHY.md](PHILOSOPHY.md).

```text
agent ──operations──> grafical
                        ├── validate ──> refusals ─────────> agent
                        ├── apply ─────> diagram file (YAML, in git)
                        ├── layout ────> positions, sizes, routes
                        ├── check ─────> defects and counts ──> agent
                        └── render ────> SVG ──resvg──> PNG
```

Code and the other documents cite a section of this file by its heading, such as `DESIGN.md, "Our own gap router"`, and a test checks that every cited heading exists. Renaming a heading means changing every citation of it. Decisions recorded before 2026-10-15 had numbers, D1 to D47; *Former IDs*, at the end, says where each one went.

## Principles

### Operations

- **Operations are the only way a diagram changes.** Every change is a named operation, such as `node.add` or `edge.add`, and a file written by hand is read with the same checks an operation gets. Cost: every new ability needs an operation, and nobody edits the YAML directly. Holds as: only `writeAtomic` in `src/cli/pipeline.ts` writes a diagram file, after `applyOps` in `src/model/apply.ts`, and `readDiagram` in `src/model/io.ts` validates every file it loads.
- **A batch applies all or nothing.** `apply` checks each operation in order, and writes only when every one is valid and the result has no defect the agent must fix. Cost: one bad operation sends a batch of forty back. Holds as: a refused write leaves the file's bytes as they were, and the refusal names the first operation that failed.
- **The caller picks every ID, and an ID never changes.** Rows, groups, lanes, columns, walls, nodes and edges carry IDs the caller chooses. A rename changes the label, never the ID, and an edge's ID defaults to `<from>-><to>`. Cost: the agent must invent unique names, and a taken one is refused. Holds as: no operation changes an ID, and `grafical diff` reports a rename as a rename, not as a removal and an addition.

### The model

- **Places are facts, never coordinates.** A box's place is its row, its order in the row, its group, its column, an alignment, or a number of steps from another box. How far apart things sit is the engine's. Cost: an agent cannot nudge one box, and every new need for placement becomes a new fact. Holds as: no field in `src/model/schema.ts` and no operation holds a position, a box size in pixels or a bend point.
- **The agent's facts stay as stated.** The engine never adds, drops, merges or reorders what the agent stated, rows included, and never chooses a fact for the agent: every row, order, group and place is stated ("The agent states every order"). Cost: a diagram stays as cluttered as the agent made it, and grafical only reports counts. Holds as: the stability tests and `grafical diff` between two steps show no fact changed that no operation named.

### Layout and routing

- **Layout is computed again from the facts after every write, and positions are never stored.** Cost: every write pays for a full layout, and a column grid solved again can move boxes sideways in rows the change did not touch. Holds as: the diagram file holds no coordinate, and rendering an unchanged file gives the same bytes.
- **A change moves only what it names, and a fixed list of what may follow it.** The list is in "Layout computed again on every change". Cost: the engine may not tidy anything beyond the list, even where it would help. Holds as: the stability tests in `test/layout/` apply one operation and assert that nothing outside the list changed position, size or route.
- **The engine routes every line.** Lines run orthogonally through the gaps between rows and boxes. The engine picks each line's sides, ports, tracks and bundles, and no operation can. Cost: an agent cannot fix one ugly line directly, only change the facts around it. Holds as: no operation takes a side, a port or a bend, and the routing lives in `src/layout/route.ts` and `src/layout/side.ts`.

### Text and fonts

- **Text is measured from bundled fonts, never from the system.** grafical ships Inter and a subset of Noto Sans SC, and `harfbuzzjs` measures every label from them. Cost: about 2.75 MB per weight for the Chinese subset, and a character outside it is a defect the agent must fix. Holds as: `src/text/fonts.ts` loads only the bundled files, and resvg is given no system fonts.

### Looks

- **Looks may take any value, while shape and dash follow the kind.** A theme or a stylesheet sets any color, a mark may carry any color, emoji, text or file, and a line may take any width from 0.5 to 8 px. A node's shape and a line's dash pattern come from its kind, so that a reader can trust them. Cost: two diagrams can look different, and the legend has to say what a width or a mark means. Holds as: no operation sets a node's shape or a line's dash apart from its kind.
- **A diagram's look comes from a theme or a stylesheet that its file names.** Cost: a look a team shares lives in a second file, which must be committed beside the diagrams that use it. Holds as: the file names its look in `style:`, and the same diagram file and stylesheet give the same picture.

### Checking and failure

- **Every write is checked, and each defect has an owner.** A defect the agent can fix fails the write and changes nothing. A defect only the engine can avoid is an engine bug: the write goes ahead, and only `grafical check --all` reports it. Cost: an engine bug can reach a picture without the agent knowing. Holds as: the fuzz test lays out random diagrams from fixed seeds and finds no engine-owned defect.
- **A refusal is a record of facts, never prose.** It names its code, the operation, the field and what was found, then facts: the allowed values, the nearest IDs, a limit, and operations that would fix it. Cost: a person reads records less easily than sentences. Holds as: every refusal prints as one `error` record of `key=value` fields.
- **What grafical cannot fully read, it refuses.** A file of a newer format, a field the schema does not know, a mark file that changed and a stylesheet that is missing all fail the load. Nothing is half read. Cost: an older grafical cannot open a newer file at all. Holds as: `readDiagram` returns errors, not a diagram, for any file the schema does not fully accept.

### Output and determinism

- **The same file and stylesheet give the same SVG bytes and PNG pixels, on any machine.** Under one version of grafical, nothing depends on the host: not its fonts, locale, clock or the order of an unordered collection. Cost: fonts are bundled, every list keeps a fixed order, and numbers are written at a fixed precision. Holds as: CI renders the fixtures on macOS and Linux and compares them, PNGs as decoded pixels. On 2026-10-11 even the PNG bytes matched, but the promise stays at pixels, the safer one.
- **Output is records: facts and counts, with no advice.** Cost: an agent must judge a drawing from counts, without being told what is wrong with it. Holds as: every line grafical prints starts with a record word, such as `ok`, `error`, `defect` or `counts`, and holds no sentence.

### File format

- **The file records its format version, and the format only grows.** After the first release, a field may be added, but changing or removing one needs a new major format version. A release that draws an existing file differently says so in its notes. Cost: old fields keep their meaning forever, such as an edge's `accent`. Holds as: every file starts with `grafical: <version>`.
- **Lists are ordered, not indexed.** Rows, the nodes in a row and edges are ordered lists in the file, so inserting a node changes one line. Cost: an order fact is a position in a list, which a person editing by hand could break. Holds as: no numeric order index appears in the schema.

### Interfaces

- **The command line comes first.** Every operation is a command, every command takes `--json`, and every write reports what it changed, so that the agent need not read the diagram again. An MCP server may wrap the same operations later. Cost: each command is a process start, which a batch spreads over many operations. Holds as: `--json` prints the same fields as the records.
- **`show` is the agent's view of a diagram, and the help is its only reference.** An agent learns grafical from `grafical --help` and each command's help, and reads a diagram through `show`, never the YAML. Cost: the help must stay short enough to read before a first draft. Holds as: the help text lives in `src/cli/help.ts`, and the tests apply the example in `apply --help` as printed.

### Performance

- **A write lays out, routes and checks fast enough to run every time.** The targets are in GOALS.md, "Speed". Cost: every search the engine runs, such as choosing a slot, needs a cap, so that a large diagram stays fast. Holds as: `pnpm bench speed` times one operation and one command.

### Security

- **A diagram reads no file outside its folder, and its pictures run nothing.** A mark's file must sit inside the diagram's folder, is pinned by its SHA-256, and is embedded in the SVG, never linked. An SVG with a script, a `foreignObject`, an event handler or a reference outside itself is refused. Cost: diagrams cannot share one icons folder above them. Holds as: such a file is refused as `mark-file-unsafe`, and a changed one as `mark-file-changed`.
- **The viewer listens on 127.0.0.1 only.** Cost: a diagram cannot be watched from another machine. Holds as: `src/cli/view.ts` binds its server to 127.0.0.1.

### Platform and dependencies

- **Every dependency allows use in an MIT project.** grafical is MIT-licensed. Cost: LGPL and GPL libraries are out, such as `libavoid-js` and `elkjs`, whatever they would save. Holds as: every runtime dependency in `package.json` is MIT, ISC, BSD or MPL-2.0 (`@resvg/resvg-js`), the fonts are under the SIL Open Font License, and the Twemoji graphics are CC-BY 4.0, which asks for attribution.

### Testing

- **Output is compared exactly.** The diagram file and the SVG are compared byte for byte, and the PNG as decoded pixels. Cost: any change to the drawing, however small, fails a snapshot, and each changed snapshot must be looked at. Holds as: the snapshots in `test/render/` and the fixtures in `test/fixtures/`. AGENTS.md, "Tests", has the commands.
- **A random seed that once failed runs forever.** The fuzz test lays out random diagrams from fixed seeds, and a failing seed becomes a fixture before the fix. Cost: the test suite grows with every bug found. Holds as: CI runs 500 seeds, and every seed that ever failed runs in every test run.

## Decision: Operations over whole-file rewrites — 2026-10-11

Every change is a named operation: `node.add`, `edge.add`, `node.rename`, `layer.move`. grafical applies it to the diagram file. Agents never write the file directly. People may read it, but editing it by hand is not supported in stage 1. grafical validates the file on every load, and refuses a file that fails with the same errors an operation would get.

Rejected: agents writing the whole file. That is the one-shot pattern this project exists to replace. Each rewrite can change parts nobody asked about, and a weak model rewrites more than it should.

## Decision: Facts over coordinates — 2026-10-11

An operation says which layer, which position in the layer, which group, what to align with, and what to connect. No operation takes an x, a y, a width or a bend point.

Rejected: coordinate operations, as offered by the draw.io and Excalidraw MCP servers. They move the hardest part of the work back to the model, which is exactly where the 2026-10-10 test failed.

A node's place is its layer, its order within the layer, its group, and an optional alignment with a node in another layer. Its size is a size step, and the box has that step's fixed width and height. The diagram's spacing is a density. The allowed values are listed in [FEATURES.md](FEATURES.md). The theme maps each value to pixels.

Rejected:
- Free positions. They make every diagram look different and give a weak model too many ways to be wrong. Changed in part on 2026-10-14 by the owner's decision: a box may be placed by whole steps on the grid from another box ("Steps from another box").
- A general graph layout over a plain node and edge list, such as ELK layered or dagre. Those compute positions globally, so adding one node can reorder others.
- Boxes that grow with their text. A longer label would push every layer below it down.

## Decision: Rows unseen, groups as systems — 2026-10-11

A layered architecture diagram reads from top to bottom: callers, entry points, services, messaging, storage. Each layer is a row, and the nodes in a layer sit side by side in their order. Rows are not drawn: no band, no row label in the picture. A layer's label stays in the file and in `show`, for agents. The one exception is a layer an edge ends at, drawn as a band ("Lines that end at containers").

A group is a system, such as "catalog-sync" around its relay, topics and pipelines. Its members may sit in several rows. The engine draws the group as one box around them, with its label at the top left, and keeps every non-member out of the box. Groups do not nest in stage 1.

Changed on 2026-10-12 (owner's decision): a group's members no longer need neighbouring rows. A row between two of its rows that holds no member, such as a row an agent adds inside a system for a write buffer, used to be refused (`group-gap`); now the box stretches over it, and that row's nodes sit wholly left or right of the box, each on the side the nodes it connects to are, and on the right when nothing says otherwise. In stage 1, the one grafical change step that failed on its own merits was this refusal.

This decision changed on 2026-10-11, after blind judging. The first version drew each layer as a labelled band and kept groups within one row. Two Opus judges scored a hand-drawn grouped target 57 of 60, and the engine's banded output 22 ("A target picture with measured rules").

Rejected:
- Labelled bands for every row. They frame the picture by row, which is rarely what a reader needs, and they use a column of width on labels.
- Groups within one row only. A system almost always spans rows, so this could not draw the systems that make an architecture diagram readable.
- Nested groups, for stage 1.

Reversed in part on 2026-10-12: groups nest, up to three levels, for deployment diagrams ("Every layered diagram type").

## Decision: Layout computed again on every change — 2026-10-11

After every operation, grafical lays out the whole diagram again from the facts, the way LaTeX typesets a document again after every edit. Positions are never stored. Layout must be fast enough to feel instant: GOALS.md, "Speed" allows 50 ms per operation in process.

Placement follows the facts in a fixed order: layers from top to bottom, nodes in each layer by their order, box sizes from their steps, gaps from the density.

**One column grid for the whole diagram.** Every node sits in a column of one grid shared by all rows, and the grid is centred. Within a row, columns follow node order. The engine chooses each node's column so that as many edges as possible run as one straight vertical segment, and so that every group's members fill a block of neighbouring columns with no outsider inside it. A node outside every group that two or more groups use, such as the store a write side and a read side share, is not lined up under either: it takes a column of its own between them, centred on the gap between their boxes. Both judges of the second phase 1b round ranked the target first for exactly that placement (2026-10-11). This replaces the first version's rows, each centred and spread on its own: those made almost every edge between rows jog sideways, which the judges read as staircases. The choice of columns is deterministic, so the same facts always give the same picture.

**Stability means the structure stays, not the pixels.** An operation never changes a fact it does not name. Positions are compared relative to the shared centre line: when the canvas widens, everything shifts by the same amount, and that is not movement. After an operation, only these may move:
- the elements it names;
- the other nodes in each layer whose contents changed, which re-spread sideways and keep their order. A layer's contents include its nodes' alignment facts;
- a layer that has a node aligned to a node that moved, which slides sideways as one block;
- a box placed by steps from a node that moved, which keeps its steps ("Steps from another box");
- the layers below a layer or gutter that changed height, which shift down as one block;
- edges that share a gap with a changed edge, but only inside the gaps they share;
- ports on a node side that a changed edge uses;
- the labels of routes that changed;
- the routes of edges attached to anything that moved.

"Changed" does not cascade: an edge that moved only because it shares a gap does not make its own neighbours movable. Otherwise a layer never moves sideways.

The column grid does not keep this list. It is solved again from the facts after every change, so one operation can move nodes sideways in rows it did not touch: after about half of all single operations on the catalog-sync fixtures (bench/results/phase2.md). Remembering the last layout would break "Output and determinism". On 2026-10-12 the owner restated GOALS.md, "Stability": an operation changes no fact it does not name (layer, order, group, lane, alignment), which the tests and `grafical diff` check, and sideways movement is measured, not gated. The stage 1 judges decide whether the movement hurts a reader; a column solver whose choices stay local to the change is the fix if it does.

One exception: when a gap between two nodes is full, the next edge in id order takes its next-best gap, and that can move a route outside the channels it shares with the changed edge.

**Gutters grow in fixed steps.** The gutter between two layers has a height chosen from fixed steps. When its tracks or edge labels no longer fit at the density's spacing, it grows to the next step, and steps are added past the last one when needed. The layers below shift down. Most edge additions therefore change no gutter height. On the 500-diagram fuzz test, growing made 221 diagrams taller than a fixed gutter would, 23 of them by more than 20%. That is the price of never squeezing lines together.

**Alignment.** An aligned node sits directly above or below its target. Its whole layer slides sideways as one block to put it there, and keeps its even spacing. Within one layer, the first alignment in node order holds. A later alignment that would need a different slide is rejected as `alignment-conflict`, and layers that would each slide to follow the other are rejected as `alignment-cycle`.

Rejected:
- Left-aligned layers that never re-spread. They keep more pixels still, but rows end up ragged, and the picture stops looking finished. The phase 0 router spike showed this.
- Reordering nodes on every change to reduce crossings. It gives a better picture once, but any change can reshuffle the structure. Order is stated by the agent, when a node is added or moved ("The agent states every order").
- Gutters that grow by any amount, because nearly every edge addition would then move the layers below.
- A "gutter full" defect. Its fix (a larger density, fewer edges, a split layer) costs the agent a round, and moves more than growing would.
- An aligned node that slides alone within its row's spacing, as phase 1 first built it. None of the three alignments in the public brief could hold that way.

## Decision: Our own gap router — 2026-10-11

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
| Adding one edge stays inside the list in "Layout computed again on every change" (45 additions) | Pass | Pass |
| Same SVG bytes on macOS and Linux | Pass | Pass |
| License | MIT, our code | LGPL-2.1-or-later, with conditions on bundled builds |
| Route time, 30 nodes and 50 nodes | 0.09 ms, 0.24 ms | 80 ms, 1,840 ms |
| Unrelated edges drawn on top of each other | 0 | 3 |
| Crossings on the public brief | 68 | 40 |

What phase 1 added to the router:
- **Fewer crossings.** Gaps and port orders follow the neighbouring gaps, and each gutter orders its tracks. The public brief went from 68 crossings to 15. Most of that gain comes from node order, chosen by "The engine picks a new box's slot": with the spike's node orders, the router alone gives 45.
- **Buses.** A fan-out of three or more unlabelled edges in one line style leaves a node side through one port and shares one trunk. A call and a data read are both solid ("Looks"), so they share a trunk. Members that pass the same rows choose one corridor together, so that the trunk passes those rows as one line and branches near its targets. "A target picture with measured rules" lowers this to two edges, and adds fan-ins: edges that share a target side arrive through one port. Since 2026-10-12 only a node side with more lines than room merges them; every other line has a port of its own ("Lines meet any side").
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

The phase 1 fuzz test lays out 500 random diagrams with fixed seeds in CI, and more on request. None has an engine-owned defect ("Defects owned by who can fix them"). Before the phase 1 robustness work, 48% had one. 35,000 seeds in all passed, which is evidence, not a proof.

Rejected:
- `libavoid-js`. It is LGPL-2.1-or-later, and its npm `latest` is a beta from one maintainer. It took 1.8 s at 50 nodes, too slow to lay out on every change, and it drew unrelated edges on top of each other. Its one advantage, fewer crossings, is the router's to earn in phase 1.
- ELK for routing. ELK layered computes its own placement, and according to ELK's documentation it cannot route orthogonally around nodes that are already placed. Its fixed-layout algorithm only reuses bend points it is given. Sources, checked on 2026-10-10: the [ELK fixed algorithm reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-fixed.html) and the [ELK libavoid post](https://eclipse.dev/elk/blog/posts/2022/22-11-17-libavoid.html). Graphviz, because it is another placement engine and a native binary.

## Decision: Bundled fonts — 2026-10-11

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

## Decision: Our own SVG writer — 2026-10-11

The engine writes the SVG itself, with a fixed element and attribute order. `@resvg/resvg-js` turns it into a PNG using the same bundled fonts. No browser takes part.

The writer splits each label into runs that use one font, and writes one `<text>` element per run, at x positions from its own measurements. resvg-js 2.6.2 does not choose a font per character: given a font stack, it draws the whole label from Noto Sans SC as soon as Inter lacks one of its characters. The phase 0 text spike measured errors of up to 15.67 px from this.

Rejected:
- One `<text>` element with a font stack, for the reason above.
- X6 for the output. Running it outside a browser is unproven.
- A headless browser, because it is slow and large.

## Decision: Defects owned by who can fix them — 2026-10-11

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
| A line that bends between two boxes that one x would have joined straight ("Who chose is punished") | Engine |
| A box placed by steps beside every box it connects to ("Who chose is punished") | Agent: place it between them |

A write that leaves an agent-owned defect fails and changes nothing. The defect names its elements, the field and the text at fault, and facts: the lines the text takes and the most it may, the characters no font can draw, and the operations that would fix it ("Records over prose").

Engine-owned defects are about where lines and boxes go, which no operation controls ("Facts over coordinates"). The engine must avoid them itself, with the room "Layout computed again on every change" allows: the next gutter step, more track or port separation, another label slot. If it still leaves one, that is an engine bug. The write goes ahead, the agent is never told, and `grafical check --all` reports it so that benchmarks and tests count it. The checker does not count the shared trunk of a bus as an overlap. A bus is a fan-out of unlabelled edges in one line style from one node ("Our own gap router").

Text is checked against its line box, which includes the fonts' full ascent and descent. The box must stay 8 px from the node's sides and 4 px from its top and bottom.

Rejected:
- Warnings for agent-owned defects, because a picture with a known defect looks like success.
- Checking only at render time, because the error then surfaces long after the operation that caused it.
- Failing the write on engine-owned defects, as this decision first said. The phase 1 measuring run showed the cost: Haiku met an edge overlap and a label collision that only the router could fix, retried 11 times, and gave up.

## Decision: Git as the history — 2026-10-11

The file holds the current state only, and git keeps the history. `grafical diff` compares the file with a git revision and reports the difference as operations, which `apply` replays on the revision's file (behavior: FEATURES.md, "Diff"). Undo is git too: every change is a commit that can be reverted.

As built, 2026-10-12: the operations come in an order in which each one is valid when it runs, and a small edit comes back as exactly the operation that made it. Groups, lanes and lines keep creation order in the file, and an operation can only append one, so any whose order changed are removed and added again. A test replays the differences between 120 pairs of random diagrams, both ways, file for file.

Rejected:
- An operation log inside the file, which could replay any past version. The file grows without limit, git merges get harder, and git already keeps the history.
- A `grafical undo` command. It would duplicate git with less safety.

## Decision: TypeScript on Node — 2026-10-11

grafical is written in TypeScript and runs on Node 24 or later. The engine (model, layout, routing, measurement and SVG writing) uses no Node-only APIs. That was for a board that would run the engine in a browser while a person drags. The board was dropped on 2026-10-14 (PHILOSOPHY.md, "Who draws?"), and the choice of TypeScript on Node stands without it.

Rejected: Go, which builds a single binary, because a browser build would have needed a second engine or a large WASM build. Rust, because development is slower.

## Decision: The engine picks a new box's slot — 2026-10-11

Node order within a layer decides most edge crossings, and it is exactly the kind of choice a weak model gets wrong. So when `node.add` gives no position, the engine places the node in the slot of its layer that gives the fewest crossings, and saves that slot as an ordinary order fact. In a batch, slots are chosen after every operation in the batch is applied, so edges added later in the same batch count. A tie goes to the last slot.

Then the nodes of the batch that had no position are ordered together: each in turn moves to the slot of its layer with the lowest route cost, while the cost drops. The cost counts crossings plus edges with more than two bends, then crossings, bends and length. Nodes placed before the batch, or given a position in it, keep their order, and no move may split a group or break an alignment. This was added on 2026-10-11: one node at a time, a node added early in a draft is placed before the edges that decide its best slot exist. On Haiku's three phase 1b drafts, ordering together cut crossings from 8, 7 and 6 to 0, 2 and 1.

Two fixes on 2026-10-14, found while dogfooding. A batch with only one node without a position put that node last in its row, every time: the node was taken out of its row before its slot was asked for, and the slot search, which counts the node's own place as removed, did not find it. Since the first build, only batches with two or more such nodes had their slots chosen. Second, both searches take only slots that can be drawn: no group split or left without one box, no alignment broken, and no node put between a group and the end of a line that meets the group beside it ("Lines that end at containers"). Moving a node into a row with no position used to pick a slot that split its group, and the refusal suggested joining the wrong node to the group. When no slot can be drawn, the search falls back to the slots that keep the groups whole, so the refusal names what is in the way: `edge-blocked` now gives the row and the nodes between the line's two ends, and `group-split` gives three fixes, joining the node to the group or moving it out to either side of the members.

Changed on 2026-10-14 by "Who chose is punished": a new node's slot is the one with the lowest route cost, as when ordering together, not the one with the fewest crossings alone, and the route cost counts a box that lies beside every box it connects to as it counts a crossing.

`layer.tidy <layer>` reorders the nodes of one layer to reduce crossings. It runs once, as a named operation, so its changes are expected. Nothing reorders a layer otherwise ("Layout computed again on every change").

The engine tries every slot with the real router. One layout of a 15-node diagram takes about 0.6 ms, and a 15-node draft batch about 50 ms in all. Ordering together stops after 1,500 layouts, so a large batch stays fast.


Reversed on 2026-10-15 by "The agent states every order": the engine no longer picks a slot, and `layer.tidy` and `diagram.tidy` are removed.

Rejected:
- Appending a node last when no position is given. The agent's order would then decide the crossings, and that order is the main reason a diagram looks messy.
- Reordering automatically on every change, for the reason in "Layout computed again on every change".

## Decision: A target picture with measured rules — 2026-10-11

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
2. **Grid:** every node centre sits on the column grid ("Layout computed again on every change"). At least half the edges are one straight segment, and no edge has more than 2 bends.
3. **Crossings:** at most 1 per 10 edges.
4. **Bundling:** each line meets its node side at a port of its own ("Lines meet any side"). A side with more lines than room merges them: 2 or more unlabelled edges of one kind that leave it share one trunk, those that arrive at it share one port, and no junction of the trunk looks like a crossing.
5. **Corridors:** an edge that skips rows runs only in a column that is empty in every row it passes. Of those columns it takes the one whose route crosses fewest of the lines that placement already fixes, each crossing weighed as two jogs of travel, then the shortest ("Lines meet any side"). A corridor through a group box that holds neither end of the line pays as much as a crossing, and the line keeps out of such a box's margin and border.
6. **Styles:** at most three line styles and one accent ("Looks"). It was two until "Lines meet any side" added the dotted and plain lines on 2026-10-12.
7. **Edge labels:** at most 40% of edges carry one.
8. **Clear text:** no line crosses any text: node, edge or group label. This one is an engine-owned defect ("Defects owned by who can fix them").

Rejected:
- Tuning against defect counts alone. The phase 1 engine had zero defects on 5,000 random diagrams and still scored 22 of 60.
- The compact overview as the target. It is as clean, but it folds each system into one box.

## Decision: Curation stays with the agent — 2026-10-11

A good diagram leaves things out, and only the agent can decide what. grafical helps in three ways:
- **Budget.** `grafical check` warns when a diagram has more than 16 nodes, and suggests merging nodes that share a group and all their edges. The warning does not block. Reversed on 2026-10-13 by "Records over prose": grafical prints counts, not warnings. The number of nodes is one of them.
- **Coaching.** The help (`grafical --help`, "The help as the reference"; at first `grafical guide`) tells agents to merge what a reader does not need apart, such as several topics into one node, and to keep a diagram to one story. It also says to merge only nodes with the same edges, because a merged box claims every edge of every member, and never to wrap one node in a group of its own name. Both were added on 2026-10-11, after the phase 1b judges found merged boxes that drew calls the brief does not have.
- **Honesty.** A diagram may carry a subtitle, one sentence under the title, and a footnote naming what it leaves out ("Not shown: …"). Both are facts in the file, set by operations.

The order of the rows and how to split a wide row are the agent's as well: the engine never reorders rows, and `layer.split` moves the second half of a row into a new row below it, when the agent asks (settled by the owner on 2026-10-11).

Rejected:
- Refusing diagrams over a node count. Some diagrams need more, and a hard limit would push agents into merging things a reader needs apart.
- Letting the engine drop nodes. That would change facts nobody named (PHILOSOPHY.md).

## Decision: Boxes sized to their text — 2026-10-11

A box given no size is fitted to its text (FEATURES.md, "Sizes"). The fit test is the checker's overflow rule ("Defects owned by who can fix them"), so such a box overflows only when its text does not fit the largest size either. The file stores no size for it, so the size is recomputed from the text on every layout ("Layout computed again on every change"): a rename that shortens the label shrinks the box again.

Since 2026-10-13 (phase 1e), every box of a row is drawn as tall as the row's tallest box, its width its own, so that the tops of a row line up: five of six judge verdicts on the private reference brief named one box taller than its neighbours. Dots and diamonds keep their shapes, and the size a node is fitted to does not change. A self-loop now runs two gutter rows below its box, since the box reaches the bottom of its row.

A diagram can turn fitting off (FEATURES.md, "Sizes"). The switch is a diagram fact in the file, because the file alone decides the picture ("Output and determinism").

This was added on 2026-10-11. In the three phase 1b drafts, text overflow was the most common reason grafical refused Haiku's first batch, which it refused in 46% of draft calls (first reported as 66%, which counted every read of the guide as a refusal). The fix it suggested was to remove the node and add it again larger.

Rejected:
- Auto size choosing the small box for short text. Boxes of three widths in one row look uneven, and the medium box is the target's grid.
- Storing the chosen size in the file. A later rename could then not shrink the box, and the file would hold a value the engine derived.
- A setting outside the diagram file, such as a user config. The same file would then draw differently on two machines.

## Decision: Lines that end at containers — 2026-10-11

A line may end at a group, a row or a lane, not only at a box (behavior: FEATURES.md, "Ends at a group, a row or a lane"). One arrow to "catalog-api" says that callers call that system, without saying which part, and it replaces an arrow to each member. The owner asked for this on 2026-10-11: an arrow may point to a set, a layer or a swimlane.

A container end is met at its top or bottom when the other end lies above or below all its rows, and at its side when the two share a row. The router knows only boxes, so a container end is routed to the box of the container that faces the other end, the nearest one, and the route is cut where it meets the container's box. Such a line never shares a port or a trunk with the stand-in's own lines. A row a line ends at is drawn as a band across the content, with its label in a head above the row, over the first stretch of the row with no box below it.

Rejected:
- Routing a container end to the box's border directly. The router places ports and tracks around boxes. A stand-in reuses all of that, including the label slots and the side exits.
- A label column for every band. "Rows unseen, groups as systems" rejected one for every row. A band's label sits in its own head instead.
- Two lanes as the two ends of one line. Neighbouring lanes share a border, so the line between them would have no length.

## Decision: Themes and stylesheets — 2026-10-11

A theme sets every value of the look: the colors of each box kind, of groups, bands, lines and text, line widths, corner radii, and type sizes and weights. A stylesheet file starts from a built-in theme and overrides any of its values, and a diagram names its theme or stylesheet in its file (behavior: FEATURES.md, "Themes and stylesheets"). Changing a stylesheet changes every diagram that names it, which is how a team keeps one look. An operation sets it, so that an agent can apply the look a person asks for in plain words.

Layout reads the same values, so a theme with larger type changes the layout as well as the colors. "The same file is the same picture" still holds, read as: the same diagram file and the same stylesheet give the same picture ("Output and determinism"). Both live in git. Whether a line is solid or dashed follows its kind ("Looks"), so a stylesheet can change the dash pattern of messages but cannot dash a call.

Rejected:
- Colors or styles on one node or edge. A model would have to choose them, and the look would drift. Reversed in part: a mark takes its own colors ("Marks of any kind") and a line its own width ("Edge weights"), and on 2026-10-14 the owner settled that looks may take any value (PHILOSOPHY.md, "What may the agent set?").
- A stylesheet found by folder, without the diagram naming it. The diagram file would no longer say what decides its picture.
- CSS. A stylesheet holds named values, not selectors, so that every value has one meaning and the engine can check it.

## Decision: A viewer that only shows — 2026-10-11

`grafical view` shows the diagram as it is now while an agent draws it, and redraws within a moment of every change to the file, from any process (behavior: FEATURES.md, "Live viewer"). It only shows: nobody edits on it. It keeps no log, because the file and git hold the history. The owner asked on 2026-10-12, after seeing the window run, for a list of changes beside the picture, because the picture alone does not say what an agent just did.

As built: the page is served on 127.0.0.1 and receives each new picture over server-sent events. The viewer watches the diagram's folder, because a write replaces the file by renaming over it, and redraws when the file or a stylesheet changes. The picture is the same SVG that `render` writes. What changed is found by comparing the last good file with the new one, so a box that only moved because the layout re-flowed is not marked. The list of changes holds the operations `grafical diff` finds between the two files, and keeps the last 200 for a window opened later.

Rejected:
- Opening the viewer on every `new`. Benchmarks and scripts would open windows nobody watches.
- A log of operations beside the file. The owner wants the live picture, and git already holds the history.

## Decision: Swimlanes run one way — 2026-10-11

A swimlane names who owns what. A diagram's lanes all run one way, as rows or as columns, and the way follows from what the members are: rows make lanes that run as rows, and boxes make lanes that run as columns (behavior: FEATURES.md, "Swimlanes"). The way therefore cannot disagree with the members. A lane's members name it, as a group's do ("Rows unseen, groups as systems").

As built, 2026-10-12: column lanes keep every row in lane order on every write and in layout, so that each lane takes a block of grid columns. Neighbouring lanes' contents, boxes included, keep 40 px apart, their shared border runs in the middle, and no vertical line runs within 8 px of a border. Row lanes share one header column on the left, as wide as the widest label up to 112 px, left of everything the rows hold. A line to a column lane never leaves its source by a side, because the lane's full-height border would cut a side exit to a stub. A box outside its lane, or inside a lane it is not in, is an engine-owned defect, `lane-stray`. The fuzz test gives lanes to half its diagrams.

Rejected:
- Rows and columns in one diagram, as a grid of lanes and phases. It is the most expressive form and the most work, and no brief needs it yet.
- Listing members on the lane. Every other membership in the file is named by the member, and `show` then prints it on the member's line.
- A setting for the way lanes run. It would be one more fact that could disagree with the members.

## Decision: Lines meet any side — 2026-10-12

Decided by the owner on 2026-10-12. In the stage 1 round every comment on grafical's pictures named the lines, and the owner's view was that the agent lacked the means to make a picture clear, not only that the router drew lines badly.

- **Kinds.** Built 2026-10-12. The kind still decides the look ("Looks"). Two kinds were added, for a line with no direction and for a call that happens only sometimes, so that the agent can say what a line means where the old kinds forced a wrong one (FEATURES.md, "Kinds").
- **Per edge.** Built 2026-10-12. An edge may carry arrowheads at both ends and may be emphasized to mark the main path (FEATURES.md, "Arrowheads at both ends", "Weight"). A two-way edge never shares a trunk from its start, where its second arrowhead sits, and a main-path edge shares one only with other main-path edges. Emphasis is the edge's accent, like a node's ("Looks"): a weight from a short list, never a colour, so it keeps to the rule that no operation colours one element (GOALS.md). More than three main-path edges, and more than a third of all edges, draw a warning, because a main path stands out only against thin lines.
- **Curves.** A stylesheet may set `paint.edge.shape: curved` ("Themes and stylesheets"). Routes stay the same orthogonal routes through the gaps ("Our own gap router"); only the drawing turns their corners into curves, and a curve never enters a box. Built 2026-10-12: each corner is as round as half of each of its two stretches, halved while it would come within 4 px of a box, a label or another line, and never less round than the orthogonal style's corner. A side exit becomes one sweeping curve, and a corner beside a label or a close line stays small. The stylesheet takes `orthogonal` or `curved` and nothing else, and every built-in theme is orthogonal.
- **Sides.** A line may leave or enter a box on any of its four sides. One side may carry several lines, each in its own slot, evenly spaced, so that lines on one side never pile up or read as one. The engine chooses the side and the slot; the agent does not.
  - **Side entry, built 2026-10-12.** A line between neighbouring rows whose target lies wholly left or right of its source, and that could not leave by a side ("Our own gap router"), runs straight out of the source's top or bottom, beside the target, and turns into the target's facing side at the middle of its row: one bend, where the route through the gutter takes two. The side must be free, the vertical part must run in the open between the target and its neighbour, clear of every line through that gap, and a line that would have joined a fan-in leaves it. The owner asked for exactly this on the flowchart's loop ("should be entering from the right side instead of the bottom") and wanted room between Issue refund and End, where two lines merged; both now enter from the side. Of the pinned pictures only the row-lanes fixture changed: the mobile app's line now turns into the gateway's side instead of merging with the web shop's. Over the fifteen saved no-hint drafts, bends fell from 16.47 to 15.60 per draft.
  - **Own slots, built 2026-10-12.** Every line meets its node side at a port of its own. Only a side with more lines than ports fit at the port pitch, 16 px apart and 16 px in from each corner, still merges as before: its unlabelled lines of one style leave through one trunk or arrive through one port. Turning trunks off everywhere was tried and lost: a side with twenty lines became a wide ribbon that crossed everything below it. So that separate lines need not cross each other, the ports of a side go in the order of where each line's run in the gutter ends, walking round the gutter from the box's left corner, so that a line that turns back into the same row runs outside the lines that go on; lines that share a corridor through a row go in the order of where they leave it, the one that leaves first furthest out; and the unlabelled lines that leave one side past the same rows still choose one corridor together. A line of a fan-out may now leave or enter by a side, unless another line's run in that gutter crosses the vertical part. Over the 42 saved drafts of stage 1 and phase 1d, crossings fell from 5.10 to 4.79 per draft and bends rose from 15.76 to 15.86; eight drafts lost crossings and three gained some. Both pinned pictures changed and were reviewed: in the grouped catalog, the line to geo-svc leaves the pipelines' left side, and the failed line goes over the top instead; in the row lanes, the gateway's line to the catalog leaves its right side, so the mobile app's line enters the gateway's top beside the web shop's, each at its own port. The dot that marks a merge came later the same day (engine marks, below).
  - **Spread slots, built 2026-10-12, after the stage 1 rerun.** The MVP judges no longer counted shared trunks, but counted the separate ports instead: lines leaving one box 16 px apart "in a tight bundle", "crowded together near the corner". The ports of a side now spread evenly over it first, up to 48 px apart, and fall back to 16 px only when the side has no room, or when spreading would bend a line that could run straight. Over 54 saved drafts, crossings went from 4.39 to 4.43 per draft and bends from 16.06 to 16.13: the change is in how the lines look, not in their count. A box too narrow for its lines, such as six lines on a medium box, keeps them 16 px apart; that is a placement question, where the box sits against its targets. Three pins changed and were reviewed.
  - **Lines kept out of strangers' groups, built 2026-10-12, after the stage 1 rerun.** The MVP judges also counted lines that ran down a group's margin or along its border, though the group held neither end. Such a line now keeps out of the margin and the border, from a padding inside the border to a clearance outside it, and a corridor through the inside of such a group pays as much as a crossing. Forbidding margins to every line was tried first and lost (crossings 4.43 to 4.67 per draft over 54 drafts), because lines between the group's own members and lines with no other way lost their room; kept to strangers, the rule changes the counts by almost nothing (problems 5.72 to 5.69, crossings unchanged, bends 16.13 to 16.09). No pinned picture changed.
  - **Corridors that cross least, built 2026-10-12.** An edge that skips rows chose its corridor by distance alone, so the state machine's line from Placed to Cancelled went round the left of Paid and crossed the line to Shipped. A corridor now also pays for every crossing that placement already makes certain: a line straight through a gutter the route runs along, a line along a gutter the route passes straight through, and a sideways line across a row it passes. That line now goes round On hold and crosses nothing. Over the 42 saved drafts, crossings fell from 4.79 to 4.14 per draft and bends from 15.86 to 15.67; eleven drafts lost crossings against the trunk-everywhere router and one, whose store sits far from its readers, still has two more. Weighing a crossing as four or eight jogs gave the same crossings and slightly more bends. The row-lanes pin changed and was reviewed: the order events line no longer crosses the arrow from payments to the ledger.
  - **Side turns for lines that skip rows, built 2026-10-12.** A line that skips rows runs down its corridor at one x. Where that x lies in the open beside its source, in the source's row, the line now leaves by that side and turns once into the corridor; where it lies in the open beside its target, the line turns out of the corridor into the target's side at the middle of its row. The same rules hold as for lines between neighbouring rows: the side must be free, no line may run up or down through the row between the box and the turn, no other line's run may cross the gutter at the turn, and the vertical part keeps clear of the labels at the top of a row it enters. The state machine's line from Placed to Cancelled now leaves Placed's right side, runs down past On hold and enters Cancelled's right side: two bends and no crossing, where the owner saw four bends and a crossing. Over the 42 saved drafts, bends fell from 15.67 to 14.45 per draft and problems from 5.62 to 5.45, and every order-states and password-reset draft now has none; crossings rose from 4.14 to 4.33, all of it in three drafts of 25 components. In those, a line that moved to a side left its gutter to the others, and the gutter then put three runs in an order that crosses twice: it weighs a line through a label as four crossings, and two labels needed the room. A label's slot now also pays for each crossing that the order it fixes would force, as much as 64 px of sliding, which won two of those drafts back their two crossings each: crossings 4.33 to 4.24 per draft. The third keeps its two: the label beside a short run lies over another line's way down, and the slot at the run's other end conflicts with an order another label has fixed. The row-lanes pin changed and was reviewed: the orders database line leaves the orders API's left side and enters the database's left side, two bends instead of four.
- **Engine marks.** Where two lines cross, one hops over the other, so a crossing never reads as a join. Where lines merge on purpose, a dot marks the join. Parallel lines keep a gap. Built 2026-10-12: at a crossing the horizontal line hops over the vertical one in an arc of 4 px, and crossings closer than one hop share a wider arc; a dot sized to the line marks every point where a line leaves or joins one it runs along, which happens only on a crowded side's trunk ("A target picture with measured rules" rule 4). The SVG writer draws both alone, so routes, checks and measures do not change, and the benchmark's geometry check finds no defect in the saved rounds. Parallel lines needed nothing: across the 42 saved drafts no two run closer than 8 px, and most run 12 to 16 px apart. A self-loop was 32 px wide and 20 px deep, too small for its arrowhead to read; its ends now sit 48 px apart and its run takes the gutter's second row, 32 px down.
- **Room around stores**, 2026-10-13 (phase 1e). Three of six judge verdicts on the private reference brief saw lines run close under or beside a cylinder. On fifteen architecture drafts, lines passed within 16 px of a store 0.70 times a store, against 0.03 to 0.15 for every other kind: stores sit where many lines run, along the gutter's first or last track. A gutter now keeps 8 px more room on its side next to a row that holds a store; near passes fell to 0.19 a store, and the pictures grew 1.8% taller.

Rejected:
- The agent choosing the side a line leaves by. Spreading lines tidily is the kind of choice a weak model gets wrong.
- Free styles per edge, such as a colour or a dash pattern. The reader would have to decode each one. Since 2026-10-13 an edge's width is the exception ("Edge weights").
- Curves drawn freely, outside the routed channels. They could cross boxes and text, and the router could no longer keep lines apart.

## Decision: Every layered diagram type — 2026-10-12

Decided by the owner on 2026-10-12: C4 context and container diagrams, cloud and infrastructure, event flow, flowcharts, state machines, swimlane processes, dependency graphs, data flow and deployment (behavior: FEATURES.md, "Kinds and shapes", "Groups", "Help").

- **Kinds.** Five new kinds give the shapes these types need: a state, a decision, a terminal, and the start and end dots of a state machine. The other types need no new shape. Shape, text room and line ends live in one module, `src/theme/shapes.ts`, which layout, the checker and the renderer share. A diamond holds text only in its middle: a padded block of width tw and height th fits when tw/w + th/h <= 1, so its box per size step is larger than a plain box's. A dot is one size whatever its size step, since a size on a dot is ignored rather than refused, so that a batch that sizes every box still applies.
- **Nested groups.** A group may sit inside another, up to three levels, as a region holds a network that holds hosts. This reverses part of "Rows unseen, groups as systems". A group's members are its own boxes and its inner groups' boxes, for every rule that asks who is in it: its block in each row, the boxes a line to it reaches, its lane, and which boxes may lie inside its box. The owner chose alternating fills as the default, and asked for shades as a stylesheet choice. The fuzz test nests groups in about a quarter of its diagrams, and found that a line into a row under stacked heads crossed a label: labels are now seated outer first, and an inner label leaves the lines room past the outer ones.
- **Teaching.** At first `grafical guide <type>` taught each type. Reversed the same day by "The help as the reference": the guides' lessons moved into the help.

Rejected, for stage 1:
- Sequence diagrams, entity-relationship and class diagrams, mind maps and timelines. Each needs a layout family of its own, and the core diagram has not yet met the MVP bar.
- A setting for the diagram's type. The kinds already say what is drawn.

## Decision: The help as the reference — 2026-10-12

Decided on 2026-10-12 by the owner. In a real setup an agent knows only that a `grafical` command exists, and `grafical --help` and `grafical <command> --help` are how it learns the tool. The stage 1 benchmarks hid this: their prompt told every agent to run `grafical guide` first, and the main guide then sent it on to `grafical guide <type>`, two hops past the command an agent would try on its own.

- **What the help holds.** `grafical --help` says what grafical is, how to work, what makes a diagram good, and one entry per diagram type in grafical's words. Each command's help adds, after its usage and options, the sections it needs, always in one order: When to use, By diagram type, Kinds, Good to know, Common mistakes, Limits, Batch file, Output, When refused, See also, Example. The text lives in `src/cli/help.ts`.
- **Direction, not numbers.** Advice gives a direction and leaves the call to the model ("one story per diagram"), not a count ("12 to 16 boxes"). Numbers appear only for limits grafical enforces, such as two accents and three levels of groups, taken from the engine's own constants. Thresholds live in warnings, which react to the diagram at hand ("Curation stays with the agent").
- **What the type guides taught moved into it.** Measured the same day (`bench/results/p1d-guides.md`): without the type guides Haiku still knew its diagram types, but not grafical's spelling of them. It drew a flowchart's Start and End as state-machine dots, whose labels are not drawn, left C4 and data-flow lines unlabelled, and was refused 16% of its calls against 3%. So the help says which kind each type uses (`node add`), when each type labels a line (`edge add`), how groups nest and how lists are written (`group add`, `lane add`, `apply`). The worked example per type went; `apply --help` keeps one full example, which the tests build from the help as printed.
- **Clear names.** A name an agent misreads is fixed at the name. Fifteen drafts of the help round gave the legend an edge kind, `line: async`, reading `line` as the line of async edges; the field names how lines look, so the owner renamed it `style` on 2026-10-13. A batch that still says `line` is refused with the new name. A refusal also says how to fix the usual mistakes: which look an edge kind is drawn in, how to quote text that YAML cut at a comma, a free id for one already taken.
- **Budget.** The help read before a first draft, `--help`, `new --help` and `apply --help`, stays under the old guide's 12,000 characters, about 2,800 tokens (GOALS.md, "Token use"). The help is printed at 80 columns on every terminal, so it is the same text for every agent.

Rejected:
- Keeping `grafical guide` beside the help. Two references drift apart, and an agent that is never told about the guide never reads it.
- Pointing `--help` at the guide. Each hop is a place where an agent stops following.
- A snippet for users to paste into their agent's instructions. It works only where a user adds it.

## Decision: Records over prose — 2026-10-13

Decided on 2026-10-13 by the owner (PHILOSOPHY.md, "Who owns what?"). grafical had begun to judge and advise in prose: warnings that a diagram has too many nodes "for one story", hints that pick moves by grafical's own idea of better, refusals that explain in sentences. Understanding a diagram is the coding agent's job; grafical gives it the facts to do it.

- **What the diagram is:** `show`, as now: rows, nodes in order, groups, lanes and edges.
- **How it is drawn:** a discrete report of each box, each line and the totals (FEATURES.md, "Show"). The agent judges the drawing from it without opening the picture.
- **What a change would do:** `grafical try` measures a batch without writing it (FEATURES.md, "Trying a change"). The agent decides what to try; grafical measures. It replaces hints, which chose the moves themselves: on 2026-10-12 the engine searched for rearrangements and printed the best as commands, and for a day `diagram improve` ran them.
- **Warnings become counts:** the number of nodes, the picture's width, the nodes in a row, the lines passing a row, with no threshold and no advice.
- **Refusals stay terse:** a code that says what is wrong and a fixed set of facts about what is there, with no sentences (FEATURES.md, "Refusals"). Since 2026-10-13 they are records too.
- **The help is documentation, not output about a diagram:** its principles and examples stay.
- **The form is records**, added on 2026-10-13 after the owner turned down phrases such as "most lines at a box 10 (sync)": one record per line, a word that names it, then `key=value` fields in the logfmt style, such as `line id=a->b from=a to=b leaves=bottom enters=top bends=2 length=372 crosses=- passes=-`. The fields are the JSON's, under the same names.
- **How long the lines are**, added the same day, when the owner found a box with one line put in the top row while its partner sat four rows down: the line ran 964 px round the right edge, and nothing in the output said so. Each line now gives its length, the shortest it could be and the rows it skips, and each box and the totals give the length of their lines together (FEATURES.md, "Show"). On that draft: `length=964 direct=480 detour=2.01 skip=3`, and `grafical try` with the box moved down to its partner's row prints `delta ... bends=-4 length=-1380`.
- **Which lines are bundled**, added on 2026-10-14 after dogfooding: an agent saw three lines leave a box as one trunk and could not tell from the output which lines those were, or that a label would keep a line on its own. Each line now names the lines it leaves or arrives with through one port ("Fan-outs of three bundle"). It is read from the picture: lines whose ends meet one box at one point.

Rejected:
- Phrases with the numbers in them ("most nodes in a row 4 (outside)"). They read well to a person, but the agent has to parse English to get the number, and each phrase is worded its own way.
- A table with a header row. A column is read by its position, so an agent that reads one row alone cannot tell which number is which.
- Advice in the output, however helpful. It decides for the agent, and one reader's advice is not another's (PHILOSOPHY.md, "What makes grafical good?").
- Hints as discrete commands with numbers. The numbers are facts, but which moves to try is a judgement, and it is the agent's.

## Decision: Fan-outs of three bundle — 2026-10-13

Decided on 2026-10-13, as the first feature of phase 1e (FEATURES.md). The owner called a stage 1 picture "terrible... way too many lines to track", though it had one crossing: one service sent six lines out of one side, each to its own port, turning at six heights on their way to six boxes across two rows. Every architecture draft measured that day had a box with four to seven lines.

- **The rule:** unlabelled lines in one line style that leave one side of a box leave as a bus, one port and one trunk that splits near its targets, with a dot at each split, when there are three or more of them, on any side. A crowded side (more lines than port slots) still bundles two or more, as before ("Lines meet any side"). Labelled lines and two-way lines keep a port each.
- **Measured** on fifteen architecture drafts (three of the private reference brief, nine of the public brief, three of 25 components): the line drawn on the page, a shared trunk counted once, fell 10%, from 97,508 px to 88,220 px; crossings went from 39 to 40 and bends from 357 to 370. On the picture the owner called terrible, the line drawn fell from 5,272 px to 2,408 px and its one crossing went.
- **Labelled lines stay apart.** Bundling them too would cut the line drawn by 22%, but their labels had no place on a shared trunk and were lost, and crossings rose from 39 to 51. A label on each branch near its target would be a separate decision.
- **The target look ("A target picture with measured rules") changes with it:** each of its two services now sends one trunk to its three stores and services below, where it sent three lines. The owner sees the picture before and after.

Rejected:
- Bundling labelled lines without a place for their labels: it loses the labels.
- Bundling from two lines: two separate lines are as easy to follow as a trunk that splits.

## Decision: Same file exact, same facts mostly — 2026-10-13

Decided on 2026-10-13 by the owner, asked whether two agents that state the same facts must get the same picture: "mostly. but the intermediate grafical.yaml always outputs the exact same diagram."

- **The same file, the exact same picture.** This is "Output and determinism" as it stands: the same diagram file and stylesheet give the same SVG bytes and PNG pixels, on any machine.
- **The same facts, mostly the same picture.** The file keeps the order of each row's boxes, as the agent stated it ("The agent states every order"). Two agents that add the same boxes at other places get another order in a row. grafical does not reorder a diagram to one canonical form.

Rejected:
- Canonical placement, the same facts always giving the same picture. Every edit could then move boxes the agent did not touch, against the stability "Layout computed again on every change" promises.
- Canonical placement within one batch, with later edits kept stable. It was the recommendation, but "mostly" asks for no new rule, and a batch already places its boxes together, knowing all of their lines ("The engine picks a new box's slot").

## Decision: Marks of any kind — 2026-10-13

Decided on 2026-10-13 by the owner, who wanted a very important box flagged with `⚠️` at its top-left, and asked that a mark not be limited to a fixed list: "anything. dont constrain it. at the end its a svg/png/textBox or smth". On 2026-10-14, after a plain text over a corner looked ugly, the owner let a text mark's badge be styled, and asked for it to be "sorta adjustable" (behavior: FEATURES.md, "Marks").

What keeps marks within the principles:
- A mark has a slot and a size step, never a position or a size in pixels, so where it goes stays the engine's ("Facts over coordinates"). A corner mark is centred on its corner and takes no room, so it moves no other box, text or line. The `left` mark takes a column inside the box, and the box keeps its size.
- The same file gives the same picture ("Output and determinism"). Emoji are drawn from the bundled Twemoji images, not from a font. The SVG embeds each picture as a data URI, and the file stores a picture file's SHA-256, so a changed file fails the load instead of drawing differently. A named color is stored as its hex, so a change to the names never changes an existing file.
- A picture runs nothing: an SVG with a script, a `foreignObject`, an event handler or an outside reference is refused, and so is a path outside the diagram's folder ("Security").

The emoji images come from `@twemoji/svg`: MIT for the package, and CC-BY 4.0 for the graphics, which asks for attribution.

Rejected:
- A fixed list of icon names. It gives the safest output, but the owner wants any picture, and a list can never hold what people flag boxes with.
- Drawing an emoji with a color emoji font. It would depend on the font on each machine.
- A mark with a size or an offset in pixels. Each mark would sit differently.
- Several marks in one slot. The slot would have to grow or its marks shrink, and a corner would then cover more of the box.

## Decision: Edge weights — 2026-10-13

Decided by the owner on 2026-10-13, built the same day. "Lines meet any side" gave a line one emphasis, the thick main path. The owner wants some lines thicker than others, in more than one step (behavior: FEATURES.md, "Weight").

A weight is a named level or a width. The levels are the agent's usual choice, and a stylesheet may retune and add them: `thin` is `paint.edge.strokeWidth`, `thick` is `paint.edge.main.strokeWidth`, and every other level lives in `paint.edge.weights`. The file is read before its stylesheet, so the levels are checked once the stylesheet is loaded. A width in pixels reverses part of "Lines meet any side", which rejected free styles per line. It reverses the width only: colour and dash stay with the kind ("Looks").

In the file, `accent: true` on a line stays valid and means `weight: thick` ("File format": the format only grows). grafical never writes both, and when a hand-written file has both, `weight` wins. Two lines of the same width look the same, whatever their level names.

Rejected:
- Three fixed levels with fixed widths. The owner wants to retune them.
- A numeric width only, with no names. The agent would pick a different number for every line, and the reader would have to decode each one. The levels give the agent the choice "Lines meet any side" wanted, and the number is there for the person who needs an exact width.
- Raising the weight limit with the number of levels. Emphasis works because few lines have it.

## Decision: Columns beside rows — 2026-10-13

Asked for by the owner on 2026-10-13 ("not just layers, we shall involve another thing called columns") and approved the same day in the phase 1e list: "Columns, optional … build it after bundled fan-outs", "as long as they help and have gains". A prototype that day, in a scratch copy of the engine, gave photo sharing 5 bends instead of 6 and a picture 744 px wide instead of 840, and the private reference draft 0 crossings instead of 1 and 23 bends instead of 27. The public brief, already in column order, did not change. The step was then left out of a question about what to build next, by mistake, and the owner asked for it again on 2026-10-14 (behavior: FEATURES.md, "Columns").

A column is a guide, and nothing is drawn. Every box of a column lies left of every box of the next, in every row: each row is kept in column order on every write, as rows are for column lanes ("Swimlanes run one way"), and the column grid takes the same order. A box in no column keeps its place beside the box left of it, and so does a new one, at the place the agent stated ("The agent states every order"). Columns and lanes that run as columns are two ways to say one thing, so a diagram has one or the other.

Rejected:
- Drawing columns as bands. Lanes that run as columns are already that, and a column is a guide.
- A box in no column that drifts to the mean column of what it connects to on every write, as the prototype did. A line added elsewhere would move it, against "Layout computed again on every change". A box that belongs to no row and no column is a separate step ("Steps from another box").

## Decision: A legend for widths and marks — 2026-10-14

Decided by the owner on 2026-10-14. When the reference picture was redrawn with grafical alone, thick lines were used to mean "writes to a store". The legend could only call them "main path", so the emphasis was dropped. Asked whether an agent should name it, the owner answered "yes, the legend needs more flexibility", and chose, of three options, a legend that names everything in the picture that carries meaning. Built the same day (behavior: FEATURES.md, "Legend").

The caller gives words only. Which entries exist follows what is drawn, and where the legend sits and how it wraps are the engine's ("Facts over coordinates"). A name for something the diagram does not draw is kept, and its entry shows once it is drawn. A mark has an entry only when it is named, because a mark with no words tells the reader nothing. Marks with the same name share one entry, and every sample is drawn at one height.

Rejected:
- Free entries, which the agent writes in its own order. It is the most flexible, but the legend could then list what is not drawn and leave out what is.
- Lines and widths only. Marks would stay unexplained, and a mark's meaning is what a reader cannot guess.
- A legend the caller places, at the bottom or the left. Placement is the engine's.
- Default words for each level, such as "heavy". A level's name is the stylesheet's word, not the reader's, so widths with no name share one "main path" entry.

## Decision: Walls as space — 2026-10-14

Decided by the owner on 2026-10-14. On 2026-10-13 the owner asked for "breaks" and "invisible walls that anything cannot be put into", and chose "dividers and walls" for phase 1e. Shown a wall drawn as a line with gates, the owner answered "walls can have thickness", then "a space! not a layer, not a line, not a thick line", that it "doesn't have to be entirely across the whole image, could be partial", and that lines cross it "only when the wall allows". The model below was then approved as shown (behavior: FEATURES.md, "Walls").

A wall is empty space between two named sides. The agent names what it separates. Which way the wall runs, how long it is and how thick are the engine's. A wall with a label draws a dashed divider through its middle, so dividers are walls with labels, not a second fact.

How the engine keeps it:
- Across, a wall adds a fixed space to the gutter just below the upper side's lowest row, after the gutter's tracks. Up and down, it takes the boundary between two blocks of grid columns, as a column lane does, and no line runs down through its space in its rows. Rows and columns are shared by the whole picture, so the gap is as long as the picture, but the wall, its rule and its drawing are only as long as the sides.
- A line between the sides is refused before layout unless the wall allows it. Any other line whose route passes through the wall's space is an agent-owned defect, since the boxes the agent placed lead it there.
- No line may cross text, so a wall's label takes the first place along the wall that no crossing line comes within 8 px of. Failing that, it takes a place across the picture at that height, and failing that, a place left of every box and line, which a second layout pass makes room for. The fuzz test found the last two cases on 2026-10-14.
- Walls across were built first, on 2026-10-14, and walls up and down the same day.

Rejected:
- A line between two rows, with gates. The owner: a wall is "a space", "not a line".
- A row drawn as a band, whose boxes are the gates. The owner: "not a layer".
- A thick line. The owner: "not a thick line".
- A wall across the whole picture only. The owner: "could be partial".
- Lines that cross freely, and a sealed wall. The owner: lines cross "only when the wall allows".
- A wall placed by coordinates or by size. Where it goes and how thick it is are the engine's ("Facts over coordinates").
- Rerouting a line round a wall. Routing round a partial obstacle is left for later.

## Decision: Notes as callouts or footnotes — 2026-10-14

Decided by the owner on 2026-10-14. The phase planned notes: a short text that keeps detail out of extra boxes, attached to what it is about and placed by the engine. Asked whether a note should be a card beside its target or a numbered footnote, the owner chose "both, grafical picks" (behavior: FEATURES.md, "Notes").

A card keeps clear of every box, line, text and other card, and stays inside the picture. Nothing is moved to make room for it, so a note never breaks stability ("Layout computed again on every change"). A card that finds no room in the first layout becomes a footnote, and a second layout makes room for the list. Each footnote entry starts with its target's name, so that a reader finds it even where no clear place for the number was found: the fuzz test found such lines among dense random ones. Footnotes are numbered in reading order of their targets.

Rejected:
- Callouts only. A dense picture has no room, and moving boxes to make room would break stability.
- Footnotes only. A reader looks away from what the note is about, even when there is room beside it.
- A note that the agent places. Where it goes is the engine's ("Facts over coordinates").
- Several notes on one target. One note holds a sentence or two, and more is a box or a second diagram.

## Decision: Steps from another box — 2026-10-14

Asked for by the owner on 2026-10-14: "a box that can belong to no row / column meaning no grid is allowed", then "we still want a free-er feature", and "why i bring in the free placement or relative placement is to avoid the row/column contraint!". Of the ways shown that day, the owner chose steps from another box: "this moves it away from the grid but keeps it kinda predictable". The owner also settled who chooses how far: the agent, because "grafical is not responsible for taste, graph correctness and clearness. grafical is a engine only to do the dirty work." (behavior: FEATURES.md, "Steps from another box")

- **What a step is.** One cell of the column grid ("Layout computed again on every change"): a row down or up, a column left or right. A row passed on the way stays empty, a medium box high. Each step across keeps at least a medium box and a gap between the two columns, so that two steps never look like one.
- **What the engine does.** The box sits in its cell and moves with the box it steps from. The boxes of a row it lands in keep their order and stand aside, as the column grid puts them before the box arrives. Lines route as they do between any boxes. Nothing else is chosen for the agent: a step that puts the box where it reads badly is the agent's to change.

This changes "Facts over coordinates" in part, which rejected free positions: a step is a small whole number on the grid, a fact like a row, not a coordinate.

A prototype on the public brief's draft (`bench/runs/p1d-help3`) freed its seven dependency boxes, from 27 bends, 824 px wide and 1008 px high:
- placed by the engine just below the box that uses each: 29 bends, 1336 px wide;
- placed by the engine below everything that box connects to: 17 bends, 1136 px wide, 912 px high;
- placed one step down from the box that uses each: 20 bends, 1640 px wide, 752 px high, the seven sharing the topics' row. Two steps would have given the second picture: the right step depends on the rest of the diagram, and it is the agent's to choose.

Rejected:
- A free box that the engine places, below what it connects to. It drew best in the prototype, but the engine would choose the row.
- A side without a distance ("below catalog-sync"), the engine choosing how far. The same reason.
- Rows counted from another box ("2 rows below catalog-sync"), joining that row's list. It keeps the row the owner wants a box free of.
- A cell on one grid for the whole picture (`--at 4,2`). Nothing ties the box to the box it belongs with, so it does not move with it.
- Steps in pixels. The gap router ("Our own gap router") runs lines through the gaps between rows and between boxes, so every box sits in a cell of the grid.

## Decision: Who chose is punished — 2026-10-14

Asked for by the owner on 2026-10-14, on the public brief's draft with steps: "we should punish things like this". The owner named a box placed far from the two boxes it connects to, "making so unncessarily long edges"; two lines between a box and the box right under it "bent for no reason"; and the staircase of a busy box's lines. A rule against rows that hold stores and services together was rejected: "thats a taste problem". Who punishes follows who chose ("Defects owned by who can fix them", "Steps from another box"): what the engine chose, it must avoid; what the agent stated, refuses the write.

- **A line bent for no reason** is an engine defect, `needless-bend`: a line between boxes in neighbouring rows, from the upper one's bottom into the lower one's top, that bends although each of its ports lies within the other box's side. The router places bottom sides before top sides, and a busy box's ports can be pushed off the middle by their neighbours; a line that can run straight down now meets the port its upper box took. On the public brief's draft, catalog-sync's two lines to and from the retry topic right under it ran straight, and the draft lost 4 of its 27 bends. 3,000 fuzz seeds show none.
- **A box beside every box it connects to**, with lines to two or more boxes whose centres lie at least its own width apart, wholly left or right of them. Where the engine chose the slot, the route cost counts it as a crossing, and the slot search compares the whole route cost (crossings plus lines over two bends plus such boxes, then crossings, bends and length) instead of crossings alone, which changes "The engine picks a new box's slot". The 74 drafts of the last three rounds (p1d-help2, p1d-help3, p1e-records), rebuilt as one batch each with both changes, have 656 bends instead of 684, 90 crossings instead of 93, and 8 drafts with such a box instead of 11. In the one of the 8 looked at, moving the box between its two users adds a crossing or two that its rows make certain. Where the agent placed the box by steps ("Steps from another box"), the agent chose its cell, so it is an agent defect, `box-aside`, that fails the write and names the boxes it connects to.
- **The staircase** of a busy box's lines is not punished yet. On the public brief's draft it comes from the boxes that sit under the busy box's own column in a row its lines must pass, so that its lines step around them; the owner proposed spreading the boxes apart so that the lines have room. Not yet decided.

Rejected:
- Rows that mix stores with services or outside services. Which boxes share a row is the agent's choice, a matter of taste ("Steps from another box", the owner on 2026-10-14).
- Refusing a box beside its users in a row. The file does not tell a slot the agent stated from one the engine chose, so the agent would be refused for the engine's choice.
- Drawing with no grafical at all. Opus 5.5, given the same brief and prompt with any tool, drew it with Graphviz in 65 seconds for $0.39: every kind in a band of its own, but curved lines that cross many times, small text and details the brief did not ask for. The owner: "wayyyyyyyy worse".

## Decision: The agent states every order — 2026-10-15

Decided by the owner on 2026-10-15: the engine does not choose for the agent. Until then the engine made one choice of structure: the order of a row, for a box added or moved into it without a position ("The engine picks a new box's slot"), and for the rows `layer tidy` and `diagram tidy` reordered. Both are gone.

- **A place is required.** A box added to a row, or moved into another row, says where it goes: first, last, or before or after a box (FEATURES.md, "Rows and order"). Without one it is refused as `missing-field`, with the row and the boxes already in it. The first box of an empty row needs none, because it has only one place.
- **No tidying.** `layer tidy` and `diagram tidy` are removed. An agent that wants fewer crossings compares orders with `grafical try` and its counts ("Records over prose"), and keeps the one it prefers.
- **No exception left.** Every order in the file is one the agent stated, so "The agent's facts stay as stated" holds without an exception.

The slot search was also the cause of the speed slip measured on 2026-10-15 (GOALS.md, "Speed"): it laid the whole diagram out once for every slot of the row, and adding a box without a position took up to 189.7 ms at 50 boxes.

Cost: Haiku's drafts may cross more. Ordering the boxes of a batch together had cut the crossings of its three phase 1b drafts from 8, 7 and 6 to 0, 2 and 1. Not yet measured with the agent stating every order.

Rejected:
- Keeping the engine's slot as the default when no place is given. That is the engine choosing structure for the agent.
- Putting a box with no place last. A fixed rule would still choose the order, and the agent might never notice that it chose none.
- Keeping `layer tidy` and `diagram tidy` because the agent asks for them. The agent would choose to reorder, but the engine would still choose the order.

## Open questions

- **A box beside every box it connects to, in a row:** "Who chose is punished" did not refuse it, because the file could not tell a slot the agent stated from one the engine chose. Since "The agent states every order" the agent states every slot, so it could become an agent defect, as it is for a box placed by steps. Not decided.
- **Marks and lines:** a corner mark is not yet checked against the lines that leave the box near its corner. A line that meets a mark is not reported.

- **Too many heavy edges:** "Lines meet any side" says more than three main-path edges, and more than a third of all edges, draw a warning, because a main path stands out only against thin lines. No code does this yet. With "Edge weights" the count would be every edge heavier than `thin`.

## Former IDs

Until 2026-10-15 each decision had a number. Commit messages and the dated results in `bench/results/` still use them. D9 and D20 were reversed when the board was dropped, D23 listed the toolchain that `package.json` holds, and D35 was reversed by "Records over prose".

| Former ID | Now |
|---|---|
| D1 | "Operations over whole-file rewrites" |
| D2 | "Facts over coordinates" |
| D3 | "Operations" |
| D4 | "Operations" |
| D5 | "Checking and failure" |
| D6 | "Facts over coordinates" |
| D7 | "Rows unseen, groups as systems" |
| D8 | "Looks" |
| D9 | PHILOSOPHY.md, "Who draws?" |
| D10 | "Layout computed again on every change" |
| D11 | "Our own gap router" |
| D12 | "Bundled fonts" |
| D13 | "Our own SVG writer" |
| D14 | "Defects owned by who can fix them" |
| D15 | "Output and determinism" |
| D16 | "Interfaces" |
| D17 | "Interfaces" |
| D18 | "Git as the history" |
| D19 | "TypeScript on Node" |
| D20 | PHILOSOPHY.md, "Who draws?" |
| D21 | "Platform and dependencies" |
| D22 | "File format" |
| D23 | "Platform and dependencies" |
| D24 | "The engine picks a new box's slot" |
| D25 | "A target picture with measured rules" |
| D26 | "Curation stays with the agent" |
| D27 | "Boxes sized to their text" |
| D28 | "Lines that end at containers" |
| D29 | "Curation stays with the agent" |
| D30 | "Themes and stylesheets" |
| D31 | "A viewer that only shows" |
| D32 | "Swimlanes run one way" |
| D33 | "Lines meet any side" |
| D34 | "Every layered diagram type" |
| D35 | "Records over prose" |
| D36 | "The help as the reference" |
| D37 | "Records over prose" |
| D38 | "Fan-outs of three bundle" |
| D39 | "Same file exact, same facts mostly" |
| D40 | "Marks of any kind" |
| D41 | "Edge weights" |
| D42 | "A legend for widths and marks" |
| D43 | "Walls as space" |
| D44 | "Notes as callouts or footnotes" |
| D45 | "Columns beside rows" |
| D46 | "Steps from another box" |
| D47 | "Who chose is punished" |
