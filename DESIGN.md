<!-- what-we-build: approved 2026-10-15 -->
# Design

> Started 2026-10-11. Rebuilt on 2026-10-15 as principles, dated decisions and open questions.

grafical takes operations from a coding agent, one command or one batch at a time, and keeps a diagram file in YAML that holds the facts they state. After every write it lays the diagram out again from those facts, checks it, and answers with records: what changed, any refusal with what happened and the commands that can change it, and counts of how the picture is drawn. `render` turns the same file into SVG and PNG. What each command does is in [FEATURES.md](FEATURES.md), and why grafical sees diagrams this way is in [PHILOSOPHY.md](PHILOSOPHY.md).

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

- **Every write is checked, and each defect has an owner.** A defect the agent can fix fails the write and changes nothing. A defect only the engine can avoid is an engine bug: the write goes ahead, and only `grafical check --all` reports it. The engine draws in plain forms only: where the facts leave none, the write is refused if the picture would hide something, and reported if it only costs ("The dirty work has edges"). Cost: an engine bug can reach a picture without the agent knowing. Holds as: the fuzz test lays out random diagrams from fixed seeds and finds no engine-owned defect.
- **A refusal says what happened and which commands can change it, and never teaches.** It is a block: its kind and code, the code's one fixed sentence, what caused it, the facts one per line (the field, what was found, the allowed values, the nearest IDs, a limit), and the names of the commands that can change it, never a command line with values filled in ("Refusals say what happened and which commands can change it"). Cost: the agent writes the command itself, from the facts. Holds as: every code has one sentence and its commands in `src/cli/problems.ts`, and `test/cli/problems.test.ts` and `test/check/refusals.test.ts` hold them.
- **What grafical cannot fully read, it refuses.** A file of a newer format, a field the schema does not know, a mark file that changed and a stylesheet that is missing all fail the load. Nothing is half read. Cost: an older grafical cannot open a newer file at all. Holds as: `readDiagram` returns errors, not a diagram, for any file the schema does not fully accept.

### Output and determinism

- **The same file and stylesheet give the same SVG bytes and PNG pixels, on any machine.** Under one version of grafical, nothing depends on the host: not its fonts, locale, clock or the order of an unordered collection. Cost: fonts are bundled, every list keeps a fixed order, and numbers are written at a fixed precision. Holds as: CI renders the fixtures on macOS and Linux and compares them, PNGs as decoded pixels. On 2026-10-11 even the PNG bytes matched, but the promise stays at pixels, the safer one.
- **Output is records: facts and counts, with no advice.** Cost: an agent must judge a drawing from counts, without being told what is wrong with it. Holds as: every line grafical prints starts with a record word, such as `ok`, `failed` or `counts`, or is a line of a problem's block, and the only sentence is a code's fixed description.

### File format

- **The file records its format version, and the format only grows.** After the first release, a field may be added, but changing or removing one needs a new major format version. A release that draws an existing file differently says so in its notes. Cost: old fields keep their meaning forever, such as an edge's `accent`. Holds as: every file starts with `grafical: <version>`.
- **Lists are ordered, not indexed.** Rows, the nodes in a row and edges are ordered lists in the file, so inserting a node changes one line. Cost: an order fact is a position in a list, which a person editing by hand could break. Holds as: no numeric order index appears in the schema.

### Interfaces

- **The command line comes first.** Every operation is a command, every command takes `--json`, and every write reports what it changed, so that the agent need not read the diagram again. An MCP server may wrap the same operations later. Cost: each command is a process start, which a batch spreads over many operations. Holds as: `--json` prints the same fields as the records.
- **`show` is the agent's view of a diagram, and the help is its only reference.** An agent learns grafical from `grafical --help` and each command's help, and reads a diagram through `show`, never the YAML. Cost: the help must stay short enough to read before a first draft. Holds as: the help text lives in `src/cli/help.ts` and the guides in `src/cli/guides.ts`, each command's line in a batch is built from its operation's schema, and the tests apply the example in `apply --help` as printed.

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

Changed on 2026-10-16: a group's label sits in its head at the leftmost seat that leaves the centre of every first-row member free that a line enters or leaves by its top, so those lines run straight through the centres; it is at the top left only when nothing enters there. Until then, when no seat did, a line was pushed off centre instead: in a booking C4 diagram, "Booking app  software system" was wider than the room between the lines into the group's three first-row boxes, and the traveller's line met the web app at its left edge, where the owner drew it through the centre. Now the first two such members move apart until the label fits between their lines, and only a label with no seat at all still grows the box to the right. Over the 306 saved drafts, eight changed, each 24 to 48 px wider, with bends and crossings unchanged; straight lines between boxes that share a centre but run off it fell from 169 to 162. The big-bank fixture's "visits bigbank.com/ib" now meets the web application at its centre, 32 px wider. Over 2,000 fuzz seeds, three diagrams changed.

Changed on 2026-10-17 ("The dirty work has edges"): no box and no line moves for a group's label. The engine seats a label the agent did not place once the lines are drawn, at the leftmost seat in the head that no line and no line's label comes near; where none is, the write is refused as `title-blocked`, and the agent states a place ("The agent states where a group's label sits").

Changed on 2026-10-18 ("A row with a look is drawn"): a row the agent gives a look is drawn too, with its label, though no line ends at it. A row with neither is still not drawn.

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
  3. with neither, no line moves for it: the label takes the slot that costs least on its longest run, and the write is refused as `label-blocked` ("The dirty work has edges").

  On the fuzz test, 2.9% of labels wrapped. Until 2026-10-17 a label with no slot made its line detour, stepping out beyond the crowd onto new rows with the label beside it; detours appeared only in very dense diagrams, 60 of 500 with 153 labels between them, and in none of the 306 saved drafts.
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
| A line that crosses text: a node's or an edge's label. The side of a group, a lane or a band counts as a line across an edge's label | Engine |
| A line across a group's label ("The agent states where a group's label sits") | Agent: take a place the refusal names clear |
| A line's label, or a step's badge, that no gutter of its path holds clear of the other lines, a wall's label that no place along its wall holds clear, or a note's card with no place beside its target ("The dirty work has edges") | Agent: shorten or drop the text, change rows, or make the note a footnote |
| A non-member inside a group's box | Engine |
| A line that bends between two boxes that one x would have joined straight ("Who chose is punished") | Engine |
| A box placed by steps beside every box it connects to ("Who chose is punished") | Agent: place it between them |
| A step's badge that touches a box, another line, a text or another badge ("Step badges ride the line") | Engine |

A write that leaves an agent-owned defect fails and changes nothing. The defect names its elements, the field and the text at fault, and facts: the lines the text takes and the most it may, and the characters no font can draw; and the commands that can change it ("Refusals say what happened and which commands can change it").

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

The rules that make it uncluttered. The checker measures each one. A broken rule is reported by `grafical check --all`, and it does not block a write; since 2026-10-16 every write reports a line that breaks rule 2 ("The dirty work has edges"):
1. **Size:** the canvas is at most 1024 px wide, so that text shows at full size in a document.
2. **Grid:** every node centre sits on the column grid ("Layout computed again on every change"). At least half the edges are one straight segment, and no edge has more than 2 bends.
3. **Crossings:** at most 1 per 10 edges.
4. **Bundling:** each line meets its node side at a port of its own ("Lines meet any side"). A side with more lines than room merges them: 2 or more unlabelled edges of one kind that leave it share one trunk, those that arrive at it share one port, and no junction of the trunk looks like a crossing.
5. **Corridors:** an edge that skips rows runs only in a column that is empty in every row it passes. Of those columns it takes the one whose route crosses fewest of the lines that placement already fixes, each crossing weighed as two jogs of travel, then the shortest ("Lines meet any side"). A corridor through a group box that holds neither end of the line pays as much as a crossing, and the line keeps out of such a box's margin and border.
6. **Styles:** at most three line styles and one accent ("Looks"). It was two until "Lines meet any side" added the dotted and plain lines on 2026-10-12.
7. **Edge labels:** at most 40% of edges carry one.
8. **Clear text:** no line crosses any text: node, edge or group label. This one is an engine-owned defect ("Defects owned by who can fix them"), except across a group's label, which is the agent's ("The agent states where a group's label sits").

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

Changed on 2026-10-16, drawing the owner's dispatch diagram with the gateway as a band: a line turned toward the band's box before it met the band, although the band spans the content. Now a band end met across rows takes its corridor through the rows between as if it lay straight past the other end, and once routed, the line runs straight on into the band from its earliest stretch that heads there, where that stretch is clear of every box, text, label slot and other line. Over 2,000 fuzz seeds, 829 diagrams end a line at a row and 246 of them changed: bends fell from 16,719 to 16,509, crossings from 18,171 to 18,125, and checker defects of any owner from 145 to 123. None of the 306 saved drafts ends a line at a row, and no fixture picture changed.

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

As built, 2026-10-12: column lanes keep every row in lane order on every write and in layout, so that each lane takes a block of grid columns. Neighbouring lanes' contents, boxes included, keep 40 px apart, their shared border runs in the middle, and no vertical line runs within 8 px of a border. Row lanes share one header column on the left, as wide as the widest label up to 112 px, left of everything the rows hold. A line to a column lane never leaves its source by a side, because the lane's full-height border would cut a side exit to a stub. A box outside its lane, or inside a lane it is not in, is an engine-owned defect, `lane-stray`. The fuzz test gives lanes to half its diagrams. Since 2026-10-15 a lane's side is a line to labels too: the label of a line that crosses from one column lane into the next sits past their shared side, which then runs close to the first lane's content instead of in the middle; a label in a gutter keeps off every column lane's side, as it keeps off a group's; and a label moved off a route cut at a lane keeps off every lane's side where some place is clear of other lines, if need be just past the cut end, inside the lane the line leaves. Where no place is, it lay across the lane's border, an engine-owned `text-crossing`; since 2026-10-18 the write is refused as `label-blocked` ("The dirty work has edges").

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
  - **Forced crossings counted in full, corrected 2026-10-16.** The count of crossings a slot forces missed in two ways. It weighed each order with the label being placed still where it lay before, so a slot paid for crossings that only that old place caused; it now leaves the label out. And it counted only the pairs of runs the slot names, not the pairs they imply through the order already fixed; it now counts every pair the slot adds to the order. The first came to light once labels kept off group sides ("Defects owned by who can fix them"): with its centred slot closed, a label in a 25-component draft was charged four crossings for a clear slot and went below its line instead, which put a fan-out across that line. The second came to light when the first was fixed: in the dense fixture, a label's slot put one line above another that already lay above a fan-out, so the first line crossed the fan-out too, and the count saw no harm in it. Over the 306 saved drafts, crossings fell from 679 to 676, bends stayed at 3,196, no draft gained a defect, and 11 drafts changed. Keeping labels off group sides had added three crossings in two drafts; two of them are gone. The third is the price of two labels that no longer lie across a group's side: neither has a clear slot unless the two lines cross. No fixture picture changed.
  - **Two side turns in one gap, built 2026-10-15.** The code had allowed one side turn per gap between two boxes of a row, stricter than the rules above. Two now share a gap when their runs along the row's middle keep a track apart, so that neither runs along the other and neither's vertical part crosses the other's run. The owner found it in a swimlane with a column per phase, where two lines bent twice although each could turn once beside its target: bends fell from 8 to 6. No fixture picture changed, nor did any other field-study drawing.
  - **A side entry's port moves aside, built 2026-10-15.** A side entry's line left from the middle of its source's side, so a second line from that side, into a box on the other hand, would have started its turn where the first turned; its run touched the first's, and it bent twice. Such a turn now moves along the source's side toward its target until its run keeps a track from every other run in the gap and its port keeps the side's spread from every port that must sit at a turn. The owner found it in the two-zone web app: the load balancer's lines into both zones now leave its bottom and turn once into each web server's facing side, and bends fell from 6 to 5. No other fixture picture changed, nor did any other field-study drawing.
  - **Several side entries into one side, built 2026-10-16.** A side entry took its target's side for itself, so a second line into that side went into the target's top with two bends. The owner marked one in a booking C4 diagram: the mobile app's line to the API should turn once into its side, above the web app's line. A side now takes as many entries as fit at its port pitch, each at its own height: the lines from above enter its upper part, the nearer the higher, and the lines from below its lower part, the nearer the lower, so that none crosses another's way in. Entries into one side keep apart from each other's turns by a track, and from every other turn in the gap as before. A line's run across the gutter could block another's entry until that line took a side entry itself, so the choice repeats while it adds one. Over the 306 saved drafts, 11 changed, each with one bend fewer (3,190 to 3,179), crossings 676 to 675, widths unchanged; over 2,000 fuzz seeds, 198 diagrams changed, with bends 20,580 to 20,254, crossings 20,336 to 20,257, `needless-bend` and `wall-crossed` five fewer each. The dense fixture's ticket topics now turn once into the relay's side, above the other entry there.
  - **Wide labels between neighbours, built 2026-10-16.** A line between two neighbours in a row runs straight across the gap between them, with its label above it, and the gap widens to hold the label. A label wider than 120 px sent the line round through the gutter under the row instead: two bends and a label hanging off its run, as in a booking C4 diagram's "sends confirmations via" and the dispatch diagram's "trip-requested, trip-cancelled". The limit is now 200 px, about thirty characters: a longer label still goes round, so that one label cannot spread a row without end. Over the 306 saved drafts, three changed (bends 3,196 to 3,190, crossings unchanged), each 80 px wider; over 2,000 fuzz seeds, 282 diagrams changed, with bends 29,157 to 28,591, crossings 34,665 to 34,266, checker defects of any owner 258 to 249, and 5.3% more width. No fixture picture changed.
  - **Lines along a row above it, built 2026-10-16.** A line between two boxes of one row that are not neighbours always ran through the gutter under the row, so every line into the bottom of a box between its ends crossed it, even where none came into their tops. It now takes the gutter above when fewer lines meet the boxes between its ends on their tops than on their bottoms; a tie keeps it below. A line of the same row with both ends from one of its ends to the other is not counted, since it runs inside the run in either gutter. The gutter above holds what the gutter below does not, between its tracks and the row: the heads of the groups that start in the row, and walls and lanes' borders. So a line stays below when one of its boxes lies wholly under a group's label, where no port on its top clears the label, and when its ends span a wall across in the gutter above, a wall up and down that runs through or reaches into it, or a lane's border there. It chooses once the corridors of the lines that skip rows are chosen, which count it below its row, so that its choice moves no other line's corridor. And because a port added to a top side moves the ports beside it, and a run added to a gutter takes room from its labels, the router compares the whole routing with every such line below: a line that took the gutter above goes back below, and everything is routed again, while a line in that gutter or at one of its boxes bends for nothing ("Who chose is punished"), or a label in that gutter finds no room, that did not before. In a saved dispatch draft, "trip-requested" and the line from events to payments-api now run above their row, and the draft went from 9 crossings to 4. `pnpm bench diff`: over the 306 saved drafts, five changed, crossings 675 to 654 and bends 3,179 to 3,178, none worse, widths unchanged; of the fixtures only the dispatch fixture changed, whose "check tokens" now runs above its row and crosses one line instead of two; over 2,000 fuzz seeds, 815 changed, crossings 173,696 to 166,849, bends 145,303 to 145,288, `needless-bend` 753 to 736 and `wall-crossed` 336 to 334. With each diagram generated once and laid out by both engines, crossings fell in 786 diagrams and rose in 20, by 8 at most, and no defect code rose in any diagram. The comparison costs time: one operation at 50 boxes took a median of 9.1 ms and at most 37.0 ms (`pnpm bench speed`), against 10.2 ms and 21.9 ms before, since a diagram with a line above its row is routed at least twice, to compare. Tried first and dropped: choosing before the corridors, which moved corridors through walls the old ones missed (`wall-crossed` up in 17 diagrams); choosing without the comparison, which added 31 `needless-bend` and, in one diagram, two detours with 30 more crossings; keeping below every line whose box has a line that runs straight, which lost every gain in the saved drafts; and counting the lines that run inside the run, which sent a line above a row of such lines and across every line from above.
  - **Straight lines meet their boxes' centres, built 2026-10-16.** A line that runs straight between two boxes that share a centre often met them off it: over the 306 saved drafts, 146 of 1,565 such lines, 17.6 px off on average. The causes, counted: two lines join the same two boxes, 52, and sit evenly either side of the centre, the best two lines can do; a group's label lies over the lower box at the centre, 36, and no line crosses text; another line meets one of the boxes within 16 px of the centre, 11; a line that skips rows, 42, mostly because the lines from the same side of its source that share its corridor all wanted the centre and split it, 8 or 16 px each; and the ports beside it pushed it while room was left, 5. After the ports and tracks are placed, such a line now moves back to the centre, and the lines in its way that share its corridor move with it, port and tracks alike, where nothing bends for it: every other port of the sides keeps the port pitch, no label lies there, every other track of a gap keeps its distance and its distance from the boxes it passes, no line comes within 8 px, and no run crosses where it did not. A line with a self-loop on a side it meets stays, since the loop's run and label sit under that side. 119 lines stay off centre: the 52 pairs, the 36 under labels, 28 where another line's port sits within 16 px of the centre, so that centring would move that line, and 3 others. `pnpm bench diff`: 28 drafts changed, bends 3,178 and crossings 654 unchanged in each; five fixtures changed, bends and crossings unchanged, and the grouped pin was reviewed and renewed: its line from the API callers now meets the API handlers at their centre; over 2,000 fuzz seeds, 71 changed, bends unchanged, crossings 169,825 to 169,824, no defect code changed in any diagram. Tried first and dropped, each for what it cost the fuzz seeds: taking the port spacing that pushes the fewest straight lines when every spacing pushes one (146 to 140, 146 more crossings); weighting a track whose line runs straight from end to end so that its corridor mates make way (111, 93 more bends); and moving the mates' wanted x a pitch aside (108, 177 more bends). Moving tracks while they are placed moves the lines beside them before their ports are known, which bends some; moving them afterwards checks every port first.
- **Engine marks.** Where two lines cross, one hops over the other, so a crossing never reads as a join. Where lines merge on purpose, a dot marks the join. Parallel lines keep a gap. Built 2026-10-12: at a crossing the horizontal line hops over the vertical one in an arc of 4 px, and crossings closer than one hop share a wider arc; a dot sized to the line marks every point where a line leaves or joins one it runs along, which happens only on a crowded side's trunk ("A target picture with measured rules" rule 4). The SVG writer draws both alone, so routes, checks and measures do not change, and the benchmark's geometry check finds no defect in the saved rounds. Parallel lines needed nothing: across the 42 saved drafts no two run closer than 8 px, and most run 12 to 16 px apart. A self-loop was 32 px wide and 20 px deep, too small for its arrowhead to read; its ends now sit 48 px apart and its run takes the gutter's second row, 32 px down.
- **Room around stores**, 2026-10-13 (phase 1e). Three of six judge verdicts on the private reference brief saw lines run close under or beside a cylinder. On fifteen architecture drafts, lines passed within 16 px of a store 0.70 times a store, against 0.03 to 0.15 for every other kind: stores sit where many lines run, along the gutter's first or last track. A gutter now keeps 8 px more room on its side next to a row that holds a store; near passes fell to 0.19 a store, and the pictures grew 1.8% taller.

Rejected:
- The agent choosing the side a line leaves by. Spreading lines tidily is the kind of choice a weak model gets wrong.
- Free styles per edge, such as a colour or a dash pattern. The reader would have to decode each one. Since 2026-10-13 an edge's width is the exception ("Edge weights").
- Curves drawn freely, outside the routed channels. They could cross boxes and text, and the router could no longer keep lines apart.

## Decision: Every layered diagram type — 2026-10-12

Decided by the owner on 2026-10-12: C4 context and container diagrams, cloud and infrastructure, event flow, flowcharts, state machines, swimlane processes, dependency graphs, data flow and deployment (behavior: FEATURES.md, "Kinds and shapes", "Groups", "Help").

- **Kinds.** Five new kinds give the shapes these types need: a state, a decision, a terminal, and the start and end dots of a state machine. The other types need no new shape. Shape, text room and line ends live in one module, `src/theme/shapes.ts`, which layout, the checker and the renderer share. A diamond holds text only in its middle: a padded block of width tw and height th fits when tw/w + th/h <= 1, so its box per size step is larger than a plain box's. A dot is one size whatever its size step, since a size on a dot is ignored rather than refused, so that a batch that sizes every box still applies.
- **Nested groups.** A group may sit inside another, up to three levels, as a region holds a network that holds hosts. This reverses part of "Rows unseen, groups as systems". A group's members are its own boxes and its inner groups' boxes, for every rule that asks who is in it: its block in each row, the boxes a line to it reaches, its lane, and which boxes may lie inside its box. The owner chose alternating fills as the default, and asked for shades as a stylesheet choice. The fuzz test nests groups in about a quarter of its diagrams, and found that a line into a row under stacked heads crossed a label: labels were then seated outer first, and an inner label left the lines room past the outer ones. Since 2026-10-17 a label is seated after the lines are drawn ("The dirty work has edges").
- **Teaching.** At first `grafical guide <type>` taught each type. Reversed the same day by "The help as the reference": the guides' lessons moved into the help.

Rejected, for stage 1:
- Sequence diagrams, entity-relationship and class diagrams, mind maps and timelines. Each needs a layout family of its own, and the core diagram has not yet met the MVP bar.
- A setting for the diagram's type. The kinds already say what is drawn.

## Decision: The help as the reference — 2026-10-12

Changed on 2026-10-17 by "One entry page, help where it is used": the entry page gives the kinds of diagram and every way to draw in place of the diagram types, a command's page shows its line in a batch, its sections by diagram type are by kind of diagram, and the budget below is suspended.

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it": no page has a When refused section, and a refusal no longer says how to fix a mistake; its block says what happened and which commands can change it.

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

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it": a refusal, a defect and a warning are blocks with a fixed sentence per code, the source and the commands that can change them; the rest of the output stays records.

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

- **The rule:** unlabelled lines in one line style that leave one side of a box leave as a bus, one port and one trunk that splits near its targets, with a dot at each split, when there are three or more of them, on any side. A crowded side (more lines than port slots) still bundles two or more, as before ("Lines meet any side"). Labelled lines and two-way lines keep a port each, and so, since 2026-10-16, do numbered lines ("Step badges ride the line").
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

Made exact on 2026-10-15 by the owner: the order holds across all rows, not only within each one ("Columns hold across rows").

## Decision: A legend for widths and marks — 2026-10-14

Decided by the owner on 2026-10-14. When the reference picture was redrawn with grafical alone, thick lines were used to mean "writes to a store". The legend could only call them "main path", so the emphasis was dropped. Asked whether an agent should name it, the owner answered "yes, the legend needs more flexibility", and chose, of three options, a legend that names everything in the picture that carries meaning. Built the same day (behavior: FEATURES.md, "Legend").

The caller gives words only. Which entries exist follows what is drawn, and where the legend sits and how it wraps are the engine's ("Facts over coordinates"). A name for something the diagram does not draw is kept, and its entry shows once it is drawn. A mark has an entry only when it is named, because a mark with no words tells the reader nothing. Marks with the same name share one entry, and every sample is drawn at one height.

Rejected:
- Free entries, which the agent writes in its own order. It is the most flexible, but the legend could then list what is not drawn and leave out what is.
- Lines and widths only. Marks would stay unexplained, and a mark's meaning is what a reader cannot guess.
- A legend the caller places, at the bottom or the left. Placement is the engine's.
- Default words for each level, such as "heavy". A level's name is the stylesheet's word, not the reader's, so widths with no name share one "main path" entry.

Changed on 2026-10-15 by the owner: line styles and widths lose their default words too, and "main path" goes with them ("The legend says only what the agent named").

## Decision: Walls as space — 2026-10-14

Decided by the owner on 2026-10-14. On 2026-10-13 the owner asked for "breaks" and "invisible walls that anything cannot be put into", and chose "dividers and walls" for phase 1e. Shown a wall drawn as a line with gates, the owner answered "walls can have thickness", then "a space! not a layer, not a line, not a thick line", that it "doesn't have to be entirely across the whole image, could be partial", and that lines cross it "only when the wall allows". The model below was then approved as shown (behavior: FEATURES.md, "Walls").

A wall is empty space between two named sides. The agent names what it separates. Which way the wall runs, how long it is and how thick are the engine's. A wall with a label draws a dashed divider through its middle, so dividers are walls with labels, not a second fact.

How the engine keeps it:
- Across, a wall adds a fixed space to the gutter just below the upper side's lowest row, after the gutter's tracks. Up and down, it takes the boundary between two blocks of grid columns, as a column lane does, and no line runs down through its space in its rows. Rows and columns are shared by the whole picture, so the gap is as long as the picture, but the wall, its rule and its drawing are only as long as the sides.
- A line between the sides is refused before layout unless the wall allows it. Any other line whose route passes through the wall's space is an agent-owned defect, since the boxes the agent placed lead it there.
- No line may cross text, so a wall's label takes the first place along the wall that no crossing line comes within 8 px of. Failing that, it took a place across the picture at that height, and failing that, a place left of every box and line, which a second layout pass made room for; the fuzz test found the last two cases on 2026-10-14. Since 2026-10-17 ("The dirty work has edges") a label with no place along its wall stays at the wall's start, or an up-and-down wall's top, where it no longer steps above or below the wall either, and the write is refused as `label-blocked`.
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

A card keeps clear of every box, line, text and other card, and stays inside the picture. Nothing is moved to make room for it, so a note never breaks stability ("Layout computed again on every change"). A card that found no room in the first layout became a footnote, and a second layout made room for the list. Changed on 2026-10-17 ("The dirty work has edges"): the agent states a footnote, `note add --footnote`, held as the note's `footnote: true`; without it a note is a card, and a card with no room takes its first place anyway and refuses the write as `label-blocked` with `is=note`, so that the agent shortens it or makes it a footnote. Each footnote entry starts with its target's name, so that a reader finds it even where no clear place for the number was found: the fuzz test found such lines among dense random ones. Footnotes are numbered in reading order of their targets.

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

## Decision: The legend says only what the agent named — 2026-10-15

Decided by the owner on 2026-10-15, after a field study that redrew ten published and classic diagrams with grafical. The legend printed "call" on a flowchart, a state machine and two swimlanes, and "related" on an org chart. Those are meanings the agent never stated, and they were wrong in all of those pictures. PHILOSOPHY.md, "What is a diagram?": grafical never adds a fact the agent did not state.

- **An entry needs the agent's words.** A line style or a width gets an entry only when `diagram legend` names it, as a mark already does ("A legend for widths and marks"). A diagram that names nothing draws no legend.
- **The agent sees what it left unnamed.** `show --drawn` prints a `legend` record for each style and width the picture draws, with `text=-` where the agent gave no words. A width's record also gives its `weight`, the word `diagram legend --weight` takes, since its pixels alone cannot name a `thick` line.
- **`--hide` is gone.** It left out an entry that had default words, and with none it did what naming nothing does. Chosen by the owner the same day, over keeping it. A file that still says `false` is read as no words.
- Built on 2026-10-15. Eight fixtures lost their legend: catalog-sync, its grouped version, dense, photo sharing, the two lane fixtures, nested and tiny. Nothing else in their pictures moved. The flowchart and the state machine already named theirs.

Rejected:
- Keeping the default words, "call or read", "message", "optional", "related" and "main path". They suit an architecture diagram, are wrong on a flowchart, and are the engine stating a meaning.
- Default words per diagram type. grafical has no setting for the diagram's type ("Every layered diagram type").

## Decision: Columns hold across rows — 2026-10-15

Decided by the owner on 2026-10-15, after the same field study. A swimlane with lanes across and a column for each phase drew "Receive goods", in the fifth column, right above "Ship", in the fourth. Each row kept its boxes in column order, but boxes of different rows in neighbouring columns could share a place in the grid. The smallest case: two rows, `a` in the first column and `b` in the second, both drawn at the same x.

- **The rule.** Every box of a column lies left of every box of the next column, across all rows, so that the phases of a process line up across lanes. "Columns beside rows" said this in words that allowed both readings.
- **Cost.** A picture that uses columns only to order its rows may grow wider.
- **Built on 2026-10-15.** Placement keeps a row's gap between every box of a column and every box of the next, in any row. The grid already kept their order, but two boxes in different rows could share an x. The field study's swimlane grew from 944 px to 1448 px wide and from 4 bends to 8, because lines between boxes in different columns can no longer run straight.

Rejected:
- Columns that order boxes only within a row, with FEATURES.md reworded. Lanes across with phases could not be drawn, and lanes that run down would stay the only swimlane.

## Decision: Composition counts — 2026-10-16

Changed on 2026-10-18 by "Every write prints every warning": each place `passing`, `across`, `tight` and `crowded` count is also a warning block, on every write.

Decided on 2026-10-16 from a request that agents see how a picture is composed, not only how many lines cross. `crossings` and `bends` miss pictures that are wrong in ways an agent can fix by choosing rows differently: a line that runs over a system it has nothing to do with, two lines drawn almost on top of each other, a label with no air. The counts go on the `counts` record that `apply`, `try`, `check` and `show --drawn` print (FEATURES.md, "Counts").

- **`across`:** lines that cross the box of a group that holds neither of their ends. A group holds an end when the end is the group, a member, or lies inside its box. A line is counted once, however many groups it crosses.
- **`tight`:** pairs of runs of two different lines that run side by side closer than a track (12 px) for more than 100 px. Runs of one bus (lines that leave or arrive at one port, "Fan-outs of three bundle") are never a pair. A pair is a place, not a pair of lines: two lines tight in two places count twice.
- **`crowded`:** line labels with less than 8 px of room on two or more of their four sides. Room on a side is the distance to the nearest line (not the label's own), box, group border, band border or other label that faces it.
- **Separate counts, never one score.** PHILOSOPHY.md rejected a score of how hard a picture is to read on 2026-10-13, because readers differ. Each count is a fact the agent weighs; `try` shows the delta of each.
- **Gutters.** `show --drawn` also prints a `gutter above=<row> below=<row> lines= crossings= tight= crowded=` record for each pair of neighbouring rows that hold boxes: the space from the bottom of the upper row's boxes to the top of the lower row's. `lines` counts the lines with a run in it, even one that only passes through; the other three count the crossings, tight pairs and crowded labels that lie in it (a vertical tight pair counts in every gutter it spans). The agent compares gutters to see which row order costs; the record gives no advice, and no sum.
- **Measured** over the 306 saved agent drafts: `across` 66 lines in 29 drafts, `tight` 6 pairs in 3 drafts, `crowded` 88 labels in 51 drafts (GOALS.md, "Mechanical defects").
- **Help.** The three are described in `apply --help`'s Output section.

Rejected:
- One composition score: a weighted sum hides which of the three costs.
- Counting a line once per group it crosses: the agent's fix is the same, a different row or group for one end.
- Counting a bus's own runs as tight: a bus is drawn as one trunk on purpose.

## Decision: A group copy holds its inside — 2026-10-16

Decided by the owner on 2026-10-16, before building FEATURES.md, "Copying a group", one of the first candidates of ROADMAP.md, "More combinations of operations". A second zone, region or shard is the same boxes, groups and lines again, and drawing it took one operation for each.

- **What the copy holds.** The group's inner groups at every level, its boxes, and the lines whose two ends are among them or the group itself. Every id it makes is the original's with the suffix, except the copy's own id, which the agent names, and a line id of the form `<from>-><to>`, which becomes its copied ends' id, so that `diff` shows a plain `edge.add`. Each copied box keeps its label, kind, size, sublabel, marks, accent, lane and column. The copied group keeps the sublabel and sits in the group the original sits in, so it nests as deep.
- **Lines to everything else only when asked.** With `--outside`, every line between the group and something outside it is copied too, its inside end moved to the copy: `lb->web` gives `lb->web-b`. Without it, the copy holds only what is in the group. A second zone usually talks to the same load balancer, but a standby often does not talk to what its primary does, so the agent states which.
- **The label is stated.** `--label` is required, as for `group add`. Two groups with one label are almost always a mistake.
- **The place is stated, as for `group order`.** Each copied box joins its original's row, before the first or after the last box of the group named, in every row of the copy. A group with no box in one of those rows is refused as `no-shared-layer`, and `allowed` lists the groups that have a box in every one. The group copied always does.
- **A fact that cannot hold twice is refused, never left off.** An alignment to a box outside the group, or steps from one, would put the box and its copy in one place. Each is refused as `copy-conflict`, naming the box and the fact. Alignments and steps to boxes inside the group point to their copies. A lane or a column whose order would move the copy away from the place stated is refused the same way: that follows the owner's choice for alignments and steps.
- **Notes and walls are not copied.** They name what they are about, and the copy is not part of them until the agent says so.

Cost: lines copied with `--outside` must sometimes be changed one by one with `edge retarget` or `edge remove`, as for a standby that nothing calls. A group whose boxes sit in two columns of one row cannot be copied beside itself while they keep their columns.

Rejected:
- Copying the lines to the outside every time. The agent would have to remove the ones it did not mean.
- Never copying them. A zone would need one `edge add` per line to the outside.
- The original's label on the copy. The agent would rename it almost every time.
- Leaving off an alignment, steps, a lane or a column that the copy cannot keep. Nothing would tell the agent that its copy is not a copy.
- Letting the row follow its columns afterwards, as it does after other operations. The copy would not sit where it was stated, and the `group-split` refusal that followed named copied boxes that were never written.

## Decision: A row with no box as one bar — 2026-10-16

Decided by the owner on 2026-10-16 (behavior: FEATURES.md, "Ends at a group, a row or a lane", "Rows and order"). Redrawing the dispatch diagram, the owner said "gateway becomes a horizontal long layer". A line could already end at a row, drawn as a band across the content ("Lines that end at containers"), but a row with no box was refused as `empty-container`. So a gateway or a message bus had to keep a box inside its band, and the picture said "gateway" twice: once as the band and once as the box.

Now a row with no box may be a line end when the line's other end holds a box, and it is drawn as one bar across the content with its label in it. A row with no box that no line ends at is drawn as before, and a row that holds boxes is still a band.

- **How tall.** One line of its label, with room above and below: 40 px. The row takes the bar's height, so it no longer takes a band's head and padding or a box's height.
- **Where its label sits.** In the bar, at its left, in the first stretch that no line meets, 16 px clear of each line's end, as a band's label takes the first stretch with no box below it. Failing every stretch, it goes left of the content, and the bar reaches it. No line runs over the label.
- **Where a line meets it.** Straight past the line's other end: down from a box above into the bar's top, up from a box below into its bottom, and at the centre of the facing member when the other end is a group. The engine adds no box to the file or the picture. While routing, a narrow stand-in sits in the bar under or over each other end, and lines whose other ends lie within 48 px share one, so that the gap router ("Our own gap router") routes these lines as any other. The route is then cut at the bar, as for every container end, and runs straight on into it. A group whose head lies below a bar keeps a group's gap from it.
- **Lines that pass it.** A line from a row above the bar to a row below it, that does not end at it, is refused as `bar-crossed` unless it says it may: `edge add --pass`, or `edge pass` on a line already drawn. The owner chose this on 2026-10-16, asked why a passing line never touched the bar: a reader takes a line drawn over a gateway for a line through it, so the agent states each line that goes past. A line that may pass is routed as through any row, over the bar or round its end, and names the bar in `passes` and `passing` ("Records over prose"). The flag is named for those records: `across` was already the count of lines through a stranger's group ("Composition counts").
- **Its look.** The agent picks it per row, with `layer look <row> box|band`, and without one a bar is drawn as a box and a band as a band. Since 2026-10-18 a look also draws a row no line ends at ("A row with a look is drawn"). A box is a service box's paint with a dark label: the bar is the gateway or the bus itself, not a container. A band is the band's light fill and muted label. The owner asked for both, chosen through the command line, on 2026-10-16: looks are the agent's ("Looks").
- **How it is checked.** A line between two rows with no box is refused as `bar-to-bar`: neither end says where the line goes across. A row with no box between the first and last rows of a group is refused as `bar-in-group`, since the group's box would stretch over it ("Rows unseen, groups as systems") and the bar would cut it in two. A group or a lane with no box is still refused as `empty-container`. The SVG marks a bar's rectangle `class="bar"`, so that the separate geometry check (GOALS.md, "Mechanical defects"), which knows shapes only, lets a line run across it and still treats it as a box for every other test.
- **Tested.** The fuzz test puts a bar in three seeds of ten, on a random stream of its own so that a seed without one draws as before, with every line that passes it allowed, and one bar in four as a band. Over 500 seeds, 89 diagrams have a bar. None of the 306 saved drafts and none of the 15 fixtures changed, since a line to a row with no box was refused until now. While it was built, the fuzz test found two ways a line from a bar crossed a group's label, both fixed: a group's head below a bar rose into a line's run in the gutter, and outer groups seated their labels where a line from a bar came down into an inner group, because placement did not count a bar's line among those entering a box's top.

Rejected:
- A line that passes the bar drawn over it with no fact. The prototype did this; the owner asked why such a line never touched the bar.
- An opening cut in the bar where a line passes, as a hop marks a crossing. Shown to the owner, not chosen; many passing lines would draw the bar in pieces.
- Charging a pass like a crossing, so that the router goes round the bar's end when it can. It hides the question of whether the line goes through the gateway instead of asking it.
- Passing lines only round the bar's ends. Long lines with more bends, for the reason "Walls as space" left routing round a partial obstacle for later.
- An allow list on the row, as a wall has. The owner asked for a flag on the line.
- One look for every bar, set only in a stylesheet. A gateway and a layer in one picture may want different looks.
- A box's height for the bar, 56 px at medium. It would read as one very wide box.
- A band's head and padding around an empty row, about 104 px, with the label above the row. Most of it would be empty.
- The label centred in the bar. Groups, bands and walls put their labels at the left.
## Decision: Step badges ride the line — 2026-10-16

The owner chose numbered steps on 2026-10-15 as one of the first candidates of ROADMAP.md, "More combinations of operations", after the field study (behavior: FEATURES.md, "Numbered steps"). FEATURES.md asked for "a small badge on the line". Built on 2026-10-16.

- **The number is the agent's fact.** A step is a whole number from 1 to 99 on a line, stated with `edge step`, and the file holds it as the line's `step`. grafical draws it and never numbers, renumbers or checks the order: two lines may share a number, for steps at the same time, and numbers may skip. A group copy keeps its lines' numbers, as it keeps their labels.
- **The look.** A ring centred on the line, in the line's colour, filled with what lies behind it, so that the line runs into it and out again, and the number inside in the labels' colour. One size, 18 px across: two digits fit, hence the limit of 99. A footnote's number is a filled circle beside what it is about ("Notes as callouts or footnotes"), so a reader tells the two apart.
- **The place.** The badge rides the straight part that carries the line's label, under the start of the label's text, and the text stands 7 px further off the line than a label without a badge, past the ring. Beside a line up or down, the badge sits on the line level with the text. A line with no label gets a slot of the badge's size. The router finds the slot as it finds any label's ("Our own gap router": along the run or in another gutter, and with no room the write is refused), keeps the badge's end of the slot over the run, and keeps the badge, on both sides of the line, clear of the gutter's other lines, labels and badges and of the line's own arrowheads. A numbered line keeps a port of its own, as a labelled line does ("Fan-outs of three bundle"): a badge on a shared trunk could not say whose step it is. Two numbered lines between the same neighbours widen the gap between them until both badges fit.
- **What it keeps clear of.** Every box, every other line, every text, every other badge, its own arrowheads, and the sides of groups and bands, as a label keeps clear of them. A lane's divider may still run under it, though not under a label since the same day (TODO.md, "A step's badge across a lane's side"). A badge that touches any of them is `step-collision`, owned by the engine ("Defects owned by who can fix them"). A badge the slot still leaves touching something slides along its own line to the nearest clear place, and two badges that leave each other no place alone move together. A line too short to hold one, where it meets a group, a row or a lane it ends at, holds it on its way into that container, past the arrowhead there. A label moved off a line cut at a container takes a place only where its text, as the badge sets it, is clear too: in 2 of 5,000 fuzz seeds the cut left the badge no room under the text in the slot, and the text, set beside the badge, lay across a lane's side or another line.
- **Measured.** No picture without a number changed: `pnpm bench diff` laid out the 306 saved drafts and the fixtures as before. With every line of the 306 saved drafts numbered, no badge touches anything; crossings went from 664 to 665, bends from 3,178 to 3,068, and the pictures grew 10.1% taller and 1.9% wider, where a one-character label on every line makes them 2.7% taller. The height is the text's 7 px past the badge and the room kept from arrowheads, in gutters that then take another track; almost all of the 16.0% more line length is lines running through those taller gutters, and 65 of the 3,475 lines gained a bend. The fuzz test numbers a share of the lines in four seeds of ten, lines to bars included: over 5,000 seeds no badge touches anything. A badge still has no clear place where its line is shorter than the badge and runs between two lines under 11 px away all the way into the container it ends at; the fuzz test met that once while this was built, and not since the router put straight lines back at their boxes' centres.

Rejected:
- The number as text before the label ("2. read"), as in Structurizr and PlantUML. It does not stand out from the words, and a line with no label would need one only for its number.
- A badge beside the line, inside the label's slot. Beside a line it reads like a footnote's number, and in a crowded gutter like the next line's.
- A badge on the line before the text, in a slot made wider for it. It was built first: with every line of the saved drafts numbered, crossings rose 24%, because the wider slots were crossed more often and their lines stepped out of the crowd.
- A badge at the line's start, by its port. Ports sit 16 px apart, so the badges of neighbouring lines would touch, and the lines of a fan-out start as one trunk.
- Numbers the engine chooses, such as creation order. The engine never chooses a fact (PHILOSOPHY.md, "Who owns what?").
- Leaving a badge off where it finds no room, as a footnote's number may be left off. It would drop a fact the agent stated.
- Numbers past 99, or text such as "2a". Either needs a wider badge for a rare need, and the format can grow when one is needed.

## Decision: The agent states where a group's label sits — 2026-10-16

Decided by the owner on 2026-10-16 (behavior: FEATURES.md, "Groups"). In a booking C4 diagram the label "Booking app software system" sat in the head between the lines into the web app and the mobile app, where placement had made room for it ("Rows unseen, groups as systems"), and the owner found it in a weird spot. Asked where a group's label should go, the owner chose to let the agent say it through the command line: eight places inside the box, its four corners and the middle of each side, and four outside it, above, below, left and right.

- **Unstated, seated where no line comes.** Without a place the engine seats the label in the head, at the leftmost seat that no line comes near once the lines are drawn. Until 2026-10-17 it seated the label where the lines into the first row kept their boxes' centres, and moved two of those boxes apart when no seat did, which the owner first chose to keep; under "The dirty work has edges" nothing moves for it, and a label with no clear seat refuses the write as `title-blocked` as a stated one does, with no `place` among its facts.
- **Stated, exactly there, and nothing moves for it.** `group title <group> <place>` (alias `group label`) sets the group's `titleAt`, and the label sits exactly at that place. The engine adds only the label's own room, a head above the first row, a foot below the last, a strip beside the rows or room past a side, and moves no box and no line for it: the router does not see the label. A line that comes nearer the label or its sublabel than the clearance the engine keeps from a label it seats itself refuses the write as `title-blocked`, an agent defect ("Defects owned by who can fix them"). Its elements name the group and the lines; its facts name the place and `clear`, every other place where no line would come near, found by laying the diagram out again with each. The agent takes one of those, or drops the place for the engine's seat. The owner chose this on 2026-10-16, one rule for all twelve places, after seeing them drawn as first built: the engine moved boxes apart and sides out so that no line ran across a stated label, which left empty space in the box, about 168 px for the centred label of the booking diagram and 88 px for a corner, and the owner marked it.
- **The foot.** A label at the bottom, `bottom-left`, `bottom` or `bottom-right`, sits in a foot below the group's last row as tall as a head, and the box's top then keeps only a padding above its first row. Feet nest as heads do.
- **Outside, above or below.** `outside-top` and `outside-bottom` put the label centred in a head's height just outside the box's top or bottom side, and the box keeps a padding inside. The owner chose centred on 2026-10-16, as `top` is inside.
- **Beside the rows.** `left` and `right` put the label in a strip inside the box beside its rows, at the middle height of the side, every member and inner box kept clear of it at any height; `outside-left` and `outside-right` put it just outside that side, and the box's neighbours keep away from it as from the box. The label never wraps, so a long one makes a wide strip. A label outside one side reaches out on that side only, so the picture centres on what it holds rather than on the centre line, as with row lanes, and the label's width is not mirrored as empty space past the other side. The fuzz test found one fault while this was built, fixed: the room a label outside took was counted past a group's members but not past its inner boxes, so a group around one with such a label let a box in.
- **Built** on 2026-10-16, in four steps: the head, the foot, outside above and below, and beside the rows. The same day the widening gave way to the refusal.

Rejected:
- The engine moving the label to the bottom left when the head is crowded, the C4 habit. The engine would choose a look for the agent (PHILOSOPHY.md, "Who owns what?").
- Every label at the bottom left. The owner chose a place per group, stated by the agent.
- Four corners only, or four corners inside and outside. Shown to the owner on 2026-10-16; the owner chose the eight places inside and the four outside.
- Moving boxes apart and sides out so that no line runs across a stated label, built first. Every line kept its box's centre, but the box took empty space the agent never asked for.
- Sliding a stated label along its side to the nearest stretch no line crosses. The label would no longer be where the agent said.
- Moving the lines off their boxes' centres, or bending them, around a stated label. The label would move the agent's lines; offered on 2026-10-16 and not chosen.

## Decision: The dirty work has edges — 2026-10-16

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it" and "Every write prints every warning": a line with more than two bends is a `warning: bent-line` block, no longer a `bent line=` record.

Decided by the owner on 2026-10-16 (PHILOSOPHY.md, "Who owns what?"). The engine had been widening a group's box so that no line ran under a stated title ("The agent states where a group's label sits"), and the owner found the empty space it left. Looking for the cause, the owner named the rule behind it: the engine must not do needless work beyond its edges just to get a picture drawn. Until then an engine-owned defect was the engine's to avoid whatever the agent stated ("Defects owned by who can fix them"), and that duty had no edge: every hard case grew a fallback that drew a crooked form and told the agent nothing.

- **Plain forms.** The engine draws each thing in a few plain forms: a line straight or with one or two bends, a label on or beside a run of its own line, wrapped onto more lines if it must, a title at its place, a note as the agent said. Measuring text, spacing, aligning to the grid, choosing ports and tracks stay the engine's dirty work.
- **Unreadable is refused.** Where drawing the facts in a plain form would hide what a reader needs, such as text under a line, the write is refused as an agent-owned defect that names the fact in the way. The cause is a fact the agent stated: a row, an order, a place, a text.
- **Costly is reported.** Where it only costs, the picture is drawn and every write reports it. The picture stays correct; whether the cost is worth it is the agent's to judge.
- **Engine-owned defects are what is left:** a plain form was there, and the engine drew it wrong, such as a line through a box. Those stay engine bugs.
- **Measured before building**, over the 306 saved agent drafts: 81 drafts (26%) have a line with more than two bends, 242 lines in all, 192 of them with four. Every one of the 242 joins two boxes that are not in neighbouring rows.

What it changes, each built in its own step:
- **Lines with more than two bends** are reported on every write, single commands included, and by `check` and `render`: a `bent line= bends= skip=` record for each, and `bent=` in the counts. Not refused. Rule 2 of "A target picture with measured rules" said it already, but only `check --all` reported it, and the agent never heard. Built on 2026-10-16; to make room in the help read before a draft, `apply --help` lost the line "Where lines go is grafical's job, never yours", which the rows an agent chooses now contradict, and a clause about the engine placing boxes, gone since "The agent states every order".
- **A crowded default title** no longer widens its box or moves two boxes apart ("Rows unseen, groups as systems"). Where no seat in the head keeps clear of the lines into the first row, the write is refused as `title-blocked`, and the agent states a place. Built on 2026-10-17. The router no longer keeps lines off a label the engine seats either: it had pushed a line off its box's centre wherever the seat left the line no other room, which the owner did not choose when it was offered. The engine now seats the label once the lines are drawn, at the leftmost seat none comes near. The owner confirmed this on 2026-10-17, shown its cost: the two-zones fixture's private subnets, whose lines had moved 16 px off their boxes' centres, now state their labels beside their rows, 176 px wider. Over the 306 saved drafts, 58 of 396 group labels, in 40 of the 183 drafts with groups, are now refused, each with at least one place clear: for 13 the engine had moved boxes apart or grown a box, for 45 it had pushed a line off its box's centre. 72 drafts changed, with bends 3,178 to 3,165 and crossings 654 to 658. Over 2,000 fuzz seeds, 338 changed, and one label has no place clear: a group around a single dot that lines enter from every side.
- **A line's label with no room** along its path no longer makes its line step out of the crowd ("Our own gap router", detours). The write is refused, naming the line, and the agent shortens the label, drops it, or changes rows. Built on 2026-10-17 as `label-blocked`, for a step's badge too: the label takes the slot that costs least on its longest run, and the refusal names the line, then the lines and borders across the label, with the gutters it tried as `gutters`, each `<row above>/<row below>`. A label across a line is then the agent's, and no longer an engine-owned `text-crossing` or `label-collision`. Shown three labelled lines between two medium boxes on 2026-10-17, the owner found them crowded and asked whether the box should grow; at the large size of the box they leave, all three labels fit. The owner chose that the agent widens it, never the engine: the refusal carries as `fix` the command that gives a box at either end of the line the first larger size at which the label fits, found by laying the diagram out with it, and none where no size does. None of the 306 saved drafts and none of the fixtures had such a label, so none changed. Over 2,000 fuzz seeds generated as before, 455 diagrams had one, 1,198 lines in all, and are now refused; laid out by both engines, bends went from 149,848 to 146,678, crossings from 185,131 to 170,143 and height down 4.1%, and the engine-owned `needless-bend` from 845 to 514. The fuzz generator now shortens or drops such a label, as an agent does. Since 2026-10-18 the same holds for a label moved off a line cut at a container ("Lines that end at containers") that finds no place beside what is left of the line clear of the other lines and the sides of lanes. It had been drawn across a lane's border, where a line from a row lane to the next row keeps only a 16 px stub, and the fuzz test found it in 3 of 5,000 seeds.
- **A wall's label with no room** along its wall no longer moves left of everything in a second layout ("Walls as space"). The write is refused. Built on 2026-10-17 as `label-blocked` with `is=wall`, naming the wall, then the lines and boxes within the label's clearance. The places past the wall's ends went too, across the picture for a wall across, above or below for a wall up and down: the label would no longer sit on its own line, which grew to reach it. The owner confirmed that on 2026-10-17. No saved draft and no fixture has a labelled wall. Over 2,000 fuzz seeds, 32 labels in 31 diagrams had no place along their wall and are now refused; bends, crossings and engine-owned defects are unchanged, and the pictures 424 px narrower in all.
- **A note** is a card or a footnote as the agent states, no longer a card the engine turns into a footnote ("Notes as callouts or footnotes"). A card with no room is refused. Built on 2026-10-17: `note add --footnote`, the note's `footnote: true` in the file and `footnote` in a batch, `show` prints `footnote`; a note without it is a card. A card with no clear place beside its target takes its first place anyway, and the write is refused as `label-blocked` with `is=note`, naming the target, then the lines and boxes in the card's way. The second layout pass is gone, and so with the walls' every second pass: a diagram is laid out once. No saved draft and no fixture has a note. Over 2,000 fuzz seeds the engine had made 1,201 of 1,967 notes footnotes by itself, 61%; laid out by both engines, 637 diagrams changed, 1,204 cards are now refused, and bends, crossings and engine-owned defects are unchanged. Dense pictures seldom have room for a card, since nothing moves for one, so an agent should expect to state footnotes there.

Rejected:
- Refusing a line with more than two bends unless the agent allows it, as a wall lets a line through. Proposed on 2026-10-16; the owner chose reporting, which never blocks.
- Refusing every line with more than two bends. Some structures need a line to skip rows, and a dense diagram might not be drawable at all.
- Reporting everything, even a label with no room drawn over lines. A picture that hides text is not correct, and a report beside it looks like success ("Defects owned by who can fix them").
- The engine growing a box with no stated size to the size its lines' labels need, as it sizes one to its text. Offered on 2026-10-17 for a line's label with no room; the owner chose that the agent widens it, from the size the refusal names.
- Keeping each fallback and reporting that it ran. The crooked form would still be drawn for the agent, and the empty space or the detour would stay in the picture.

## Decision: One entry page, help where it is used — 2026-10-17

Changed the same day by "Help for the tool, guides for best practice": the kinds of diagram, "A good diagram", the sections by kind of diagram and `try`'s "What to try" moved out of the help into `grafical guide`.

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it": a refusal no longer carries its own fix. It says what happened and names the commands that can change it.

Decided by the owner on 2026-10-17. The owner asked whether agents draw rows and groups because the help suggests nothing else ("only these commands? then I'll draw it like this"), and forbade putting all the help and the guides in one place. The help read before a draft had 60 characters left of its budget (11,940 of 12,000), and `apply --help` listed 15 of the 60 batch operations, so the reflect round's first agent found `group.title`'s field only from a refusal. A first restructure the same day, a map with guides and references, was withdrawn before it was committed (Rejected, below): the owner found it flat, and asked how an agent reads help and why a refusal's code should need looking up.

How an agent reads a command line's help, which this follows:
- It reads the first page once, before it starts, then acts. It opens a command's page when it uses that command and is unsure of its form. It seldom opens a page only because another names it: in the 2026-10-12 round, 4 of 33 drafts opened `diagram legend --help`.
- It reads a refusal most closely, and fixes what the refusal names. In the reflect round's probe, the agent took a place for each `title-blocked` label from its `clear` fact, and the next write passed.
- It cannot try what it does not know exists. A form can be learnt from refusals (`unknown-field ... likely=at`); a wall, a bar or a numbered path cannot.

So:
- **The entry page** (`grafical --help`) is enough for a first draft: what grafical is, how to work, the kind of diagram by what a box stands for and what a line means, and every way to draw, one line each by the story it tells. The four kinds are structure (C4, infrastructure and dependency graphs are structure), flow (data flow and event flow), process (a swimlane is a process with lanes) and states; infrastructure replaces the types cloud and deployment, which differed only in what their nested groups were called. The kinds and the ways to draw replace the list of diagram types, and the page says that any kind may use any way to draw, and what grafical does not draw.
- **A command's page** is read when the command is used: its usage and options, its line in a batch, and its own sections, among them what it does in each kind of diagram ("By kind of diagram") and, on `try`, what to try when the picture looks wrong. A command's line in a batch is built from its operation's schema, so `apply --help` lists no operations: every page shows its own.
- **Arguments named as fields.** A command's arguments are named as its operation's fields: `[at]`, `<nodes...>`, `<members...>`, `<edges...>` and `<allow...>`, which were `[place]`, `<member...>`, `<id...>` and `<pass...>`. A command's page is then also its operation's, and a test holds every argument and option to a field.
- **A refusal carries its own fix.** A code names the kind of problem, so that the agent and the harness can tell one from another; what is wrong and what fits is in the record's facts, never in a page to look up. A refusal whose facts do not say what to change is a defect of that refusal. The codes are one typed list, and a test checks that each is one grafical prints: `alignment-cycle`, which nothing printed, left it.
- **Depth.** Every page is at most two hops from the entry page, `grafical node --help` and then `grafical node add --help`, as before.
- **No size limit for now.** The owner suspended the help's size limits the same day: first the help and grafical's refusals must be right, then it is decided whether a page needs a limit. The budget of "The help as the reference", 12,000 characters for the help read before a first draft, and its test are suspended with them (GOALS.md, "Token use"). That day the entry page, `new --help` and `apply --help` took 11,280 characters together, where they took 11,940.

Rejected:
- One page with all the help and the guides, the 2026-10-12 shape grown longer. The owner forbade it: the budget decides what is left out.
- A map with three guides to read first (`grafical help diagrams`, `compose`, `workflow`) and three references (every operation, every record, every code), each reached by `grafical help <name>`. Built and withdrawn on 2026-10-17, before it was committed. A guide is a hop the agent must choose to take. The references were flat: one operation's entry was about 250 characters in a page of 16,500, one code's about 240 in 27,700. A page of what each code means asks the agent to look up what its refusal should have said.
- A setting or a custom mode for the diagram's kind. grafical has no type mode ("Every layered diagram type"): every diagram is already composed from the same blocks, and the entry page says so.
- A separate `grafical guide` command, as before 2026-10-12. Each hop is a place where an agent stops.

Risk, to measure in the next paid round: whether agents use the ways to draw the entry page lists where the request fits, and which command pages they open before their first write. The harness does not yet count the pages (TODO.md, "Pages read before a first write").

## Decision: Help for the tool, guides for best practice — 2026-10-17

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it": the help no longer says what a refusal means; the refusal's block does.

Decided by the owner on 2026-10-17, the same day as "One entry page, help where it is used". The help says how to use grafical. How a kind of diagram is usually drawn is best practice, kept apart for an agent that wants it. The owner's reasons: an agent that wants to draw straight away may, and a refusal corrects it where it goes wrong; guidance pressed on every agent before it draws makes every diagram alike, where a drawing should keep its freedom; and if grafical is easy to use, an agent draws well without being taught.

- **The help** (`grafical --help` and each command's `--help`) holds how to work, every way to draw by the story it tells, each command's options and its line in a batch, the facts of what it draws (such as that kinds initial and final draw no label), its limits, and what a refusal of it means. It does not say how a kind of diagram is drawn.
- **The guides** (`grafical guide`, `grafical guide <name>`): one per common kind of diagram (architecture, C4, infrastructure, dependency, data flow, event flow, flowchart, swimlane, state machine), and composition for any kind: what makes a diagram good, and what to change when a picture looks wrong. They took the entry page's kinds of diagram and "A good diagram", the command pages' sections by kind of diagram, `try`'s "What to try", the advice on naming boxes and on how much to emphasize, and three rules the morning's restructure had lost: a row per step in a flowchart, people as actor and other systems as external in C4, and what depends on top in a dependency graph. `grafical guide cloud` and a few other names find the guide for their kind. The guides live in `src/cli/guides.ts`.
- **Nothing says to read a guide.** The entry page names `grafical guide` once, as there if wanted, and no command page names it; a test holds both.

Rejected:
- The guides in the help, as the entry page and the command pages held them in the morning: every agent reads them before it draws, and draws alike.
- No mention of the guides at all: an agent could not know they exist.
- Rules every diagram of a kind must follow, as a type setting would make them: grafical refuses only what would draw wrong.

It reverses, in part, "The help as the reference", which rejected keeping `grafical guide` beside the help because an agent never told about it never reads it. Here that is the point.

Risk, to measure in the next paid round: the 2026-10-12 round measured the help without type guides (`bench/results/p1d-guides.md`). Haiku drew a flowchart's Start and End as state-machine dots, whose labels are not drawn, left C4 and data-flow lines unlabelled, and was refused 16% of its calls against 3%. The traps that are the tool's own stay in the help (`node add --help` says initial and final draw no label, and to use terminal for Start and End); the conventions are now the agent's to take or leave. The round should count guide reads and refusals (TODO.md, "Pages read before a first write").

## Decision: One way to a page, and a wrong command names the right one — 2026-10-18

Changed the same day by "Refusals say what happened and which commands can change it": `likely` is the word meant, as a value, not a command line. `grafical help apply` gives `found: help` and `likely: --help`, and `grafical node.add --help` gives `likely: node add`.

Decided by the owner on 2026-10-18, after one Haiku run (a subagent with grafical on its path, not a benchmark round) drew a refund flowchart. 32 of its 37 grafical calls read help. 11 printed the entry page in place of the page asked for, and 12 printed the page asked for but exited 2:
- Commander adds a `help [command]` command to the program and to each group; grafical never chose it. The entry page listed it, so the agent used it. It reads one word, so `grafical help "node add"` printed the entry page, and grafical exited 2 after each page it printed, as if refused.
- A command name grafical does not have, with `--help`, printed the entry page and exited 0: `grafical "node add" --help`, `grafical node.add --help`. Nothing said the name was wrong.

So:
- **`--help` is the one way to a page.** The program and its groups have no `help` command, and no page lists one.
- **A wrong command is refused with the one it most likely means.** `grafical help apply` prints `error code=unknown-command found=help likely="grafical apply --help"` and exits 2. Two names in one word (`"node add"`, `node.add`), `help` before or inside a group (`grafical node help add`), and a misspelling near one name (`nodee`, at most a third of its letters wrong, or one) are read the same way. `likely` is the word meant ("Refusals say what happened and which commands can change it"): `--help` for `help`, the command's name for the rest. A word near no command has no `likely`, with `--help` or without. The record replaces the page commander would print.

Rejected:
- Keeping `help <command>` and fixing its exit code. Two ways to one page are two forms an agent tries, and the second reads one word only.
- The entry page after the record. The agent asked for one page; the record names it, and the entry page is 75 lines the agent has read.

## Decision: A row with a look is drawn — 2026-10-18

Decided by the owner on 2026-10-18 (behavior: FEATURES.md, "Rows and order"). In round p1g (bench/results/p1g-stage1.md), 8 of the 49 chains' reflections said the names they gave rows never appeared in the picture. A row was drawn only when a line ended at it ("Rows unseen, groups as systems", "Lines that end at containers"), and `layer look` chose only between a box and a band for such a row, so an agent had no way to show one. The owner's rule: unseen is the default, not always. A row with something visible is drawn; a row with nothing visible is not.

- **When a row is drawn.** When a line ends at it, as before, or when the agent gives it a look with `layer look <row> box|band`. A row with neither is not drawn, so a diagram with no look draws as it did, byte for byte.
- **How it is drawn.** As a row a line ends at: one with boxes as a band around them, its name in the band's head; one with no boxes as one bar, its name in it ("A row with no box as one bar"). The look chooses a box's paint or the band's.
- **A bar for its look alone.** A row with no boxes and a look is a bar like one a line ends at, and is checked as one. A line that passes it is refused as `bar-crossed` unless `edge pass` lets it, since "A row with no box as one bar" refused a gateway drawn under lines that run over it without saying so. A bar between the first and last rows of a group is refused as `bar-in-group` on the row's look, and `layer look`, which takes the look away, is among the commands that can change it ("Refusals say what happened and which commands can change it").
- **Measured.** None of the 329 saved drafts and none of the 17 fixtures sets a look, and none changed; neither did any of 2,000 fuzz seeds. The fuzz test now gives a row with boxes a look in two seeds of ten, and adds a bar with a look and no line in one, on a stream of its own. With it, 480 of 2,000 seeds changed: bends rose from 146,792 to 146,820 and crossings fell from 166,128 to 166,095, with no engine-owned defect added. The most bends came from a band's name in its head, where no line runs down (seed 919, 15 more); the most crossings from a bar between two rows (seed 795, 15 more). The fixture clinic-rows draws an undrawn row, a bar a line ends at, and a band and a bar drawn for their looks alone.

Changed the same day ("A row's label is optional"): `label` is no longer required on `layer add`.

Rejected:
- Every row's name drawn at the left of its row. "Rows unseen, groups as systems" rejected a label column for every row: it frames the picture by row and takes a column of width. It would also change every picture, where a look changes only the rows the agent wants seen.
- A look that counts only once a line ends at the row, as until now. The agent who names a row and wants it seen has no way to say so.

## Decision: A row's label is optional — 2026-10-18

Decided by the owner on 2026-10-18, with "A row with a look is drawn". A row is unseen by default, and its name shows only when the row is drawn, so a name is a thing a drawn row may have, not a fact every row owes. `layer add` takes `--label` or not; a file's row without `label` reads and writes back without one (FEATURES.md, "Rows and order").

- **Drawn without a name.** A drawn row with no label draws no name: a bar is an empty bar, and a band has a head's padding but no text, so its boxes keep the room they had. A line meets either as it meets a named one.
- **Nothing takes a label away.** No operation removes a row's label; `layer rename` sets one. A row made without one keeps none until renamed.
- **Where a missing label is read.** The file reader and writer, the batch line (`layer.add` shows only `id`), `show`, the layout, the picture and the checks that place text. A row with no label has no text for them to place.
- **Measured.** No saved draft, fixture or fuzz seed gives a row no label, so no picture changed.

Rejected:
- Keeping `label` required. An agent that wants a row only to place boxes must invent a name nobody sees, and one that wants a bare gateway bar must give it text.
- Every row's name drawn at the left of its row, so that a label always shows. "A row with a look is drawn" rejected it.

## Decision: Refusals say what happened and which commands can change it — 2026-10-18

Decided by the owner on 2026-10-18, after round p1g (`bench/results/p1g-stage1.md`). Refusals are the target furthest from met (GOALS.md, "Operation errors"): the scale drafts were refused 19% to 26% of their calls, and two drafts of the private brief 55%. The agents got stuck where a record did not say clearly what had happened or which command could act. One change step met `title-blocked` for 15 calls: the record named the places clear of lines but no command, and the line in the way came from another batch line than the one the agent changed. Others met `missing-field` for a second box in a row and `unquoted-text` with nothing to say what to give, and read `group-conflict` as asking them to join a node of another group.

grafical reports what happened and never teaches. A record gives the facts and the names of the commands that can change them, never a command line with ids or values filled in.

- **One block per problem.** A command prints its outcome first, `ok changed=<ids>` or `failed changed=-`, a usage error too; then a block for each problem, with a blank line between; then, on a write, the counts as before:
  ```text
  <kind>: <code>
  description: <the code's one sentence>
  source: <what caused it>
  detail:
    <key>: <value>
  next: <command names>
  ```
- **Three kinds.** An `error` could not be read or applied, and nothing is written: exit 2 for the command line, 1 for an operation. A `defect` would draw wrong: one the agent owns refuses the write with exit 1, and one the engine owns is grafical's bug, written, and shown only by `check --all` ("Defects owned by who can fix them"). A `warning` is written, with exit 0, and says what draws poorly, such as `warning: bent-line` for a line with more than two bends ("The dirty work has edges"); the seven warnings are in "Every write prints every warning".
- **A description per code.** One fixed sentence for each code, in one table, that says what happened, not what to do. It is never made for the case at hand. A test holds every error, defect and warning code to one short sentence.
- **The source.** A warning has none ("Every write prints every warning"). For a single command, the command line as typed. For an operation of a batch, `<batch file> line <n>: <the operation as written>`, where `<n>` is the file's line the operation starts on, from 1; `--json` keeps the operation's index as well, and gives none for an error no operation caused: one already in the file, or one of the command, such as a file or a batch that cannot be read. A stylesheet that cannot be read has the index of the operation that names it. For a defect found after layout, and for an error of the whole diagram found only once the whole batch is applied, the batch line after the last prefix of the batch without the problem, when every longer prefix has it. Before, such an error named the batch's last operation, which may have done nothing wrong. For what was in the file before the command, and in every prefix of the batch, `already in the file`.
- **How the line is found** (decided the same day, after two reviews). On a refused write only, so a write that succeeds costs nothing more, grafical applies the batch less its last operation, then less its last two, and so on back towards the file, each prefix once for all the problems of the write, and lays it out where a defect is asked about. A problem's line is the one after the first prefix in that order without it. A prefix refused for another problem cannot tell whether this one is there, since a whole diagram's checks stop at the first set that fails and a refused diagram is not laid out: the scan stops there, and the source is the batch file with no line, as it is once the prefixes a refused write may try are spent. Only a prefix refused by a later check than the one that finds the problem can tell: the checks run in turn, so it passed that one, and is without the problem. It may lay out 400 boxes and lines in all, at the size of the larger of the file's diagram and the one the batch would make (the file's alone when the batch is refused for an error, since it then makes none), so 3 prefixes at 113 boxes and lines, 10 at 37, at most 12 and at least 1, shared by all its problems. `--json` then gives no index. So the line is never wrong, and a problem caused early in a long batch has the batch file as its source. A `try` of 80 operations with 10 labels too long (2 prefixes, at 193) takes 0.33 to 0.37 s, and a refused 123-operation draft of a scale-50 brief (3 prefixes) 0.29 to 0.31 s, within GOALS.md, "Speed"; the first took 1.15 s when every line was searched for. Round p1g's title-blocked, caused on line 5 of 8 in a diagram of 37 boxes and lines, keeps its line.

  Rejected:
  - Halving the range of prefixes, which assumed that a problem stays once it appears. A label too long that a rename shortens and a later rename lengthens again was blamed on the line that added it, and a problem the file had, which the batch took away and brought back, on the file.
  - Trying first the operations that name what the problem is about. It saved prefixes, but it rested on the same assumption.
  - Reading a prefix refused for another problem as one without this problem. A batch that passed through a refused state had its overflow blamed on the line that left that state.
- **The detail.** One fact per line, under the names the facts had, in one fixed order; `-` for an empty value, absent keys left out, a list comma separated. The ids that a defect named in one list, `elements`, are split by what each one is: `node`, `edge`, `group`, `row`, `lane` or `wall`. A key named for one thing holds one value, and one named for several, such as `nodes`, `edges` or `ends`, holds a list, even of one, in `--json` as in text: two boxes a defect names go under `nodes`. Found by review the same day: a defect's ids had been lists even of one, an error's and a warning's not.
- **Next.** The names of the commands that can change it, in the order the help lists commands, or `-` where none can, such as for a batch's syntax error or an engine bug. Never ids, values or options. A test holds every name to a real command.
- **Enough to find the change.** The detail carries what the agent needs to find the change itself, and the help and the guides state no rule for it (PHILOSOPHY.md, "How does an agent learn grafical?"); decided by the owner the same day. In round p1g two agents put a bar between rows a group's box covers, were refused with `bar-in-group`, and could not tell why: the record named the group and the row, not that the box covers every row from its top member's to its bottom member's. It now names the bar's row, the group, the line, and the group's `top` and `bottom` rows; a bar drawn for its look alone ("A row with a look is drawn") is named the same way, with no line, and its `next` names `layer look` in place of `edge remove`. The same question was asked of every refusal: `group-conflict` names the group's `top` and `bottom` rows too; `alignment-conflict` names the boxes in the way, those of the other column in the same row or those the order of the rows puts between the two; `align-same-layer` found in the file names its box; `edge-inside`, `edge-blocked`, `bar-to-bar` and `bar-crossed` name the line's two `ends`; `group-across-lanes` names the group's first box in another lane than its first box's, and that lane.
- **`likely` as a value only.** A word grafical does not know is answered with the word it most likely means, never with a command: `grafical help apply` gives `found: help` and `likely: --help`.
- **`--json` says the same:** each problem as `{kind, code, description, source, detail, next}`, beside the outcome and the counts.
- **No "When refused" in the help.** Decided by the owner later the same day: every command page's "When refused" section goes, `apply --help`'s too. A help page says how to use a command, and a refusal explains itself through its block. A second, hand-written copy of what the record says can go stale, as `edge add`'s did when it described a fix wrongly, and it states a rule in words before the agent makes the mistake, against PHILOSOPHY.md, "How does an agent learn grafical?". `apply --help`'s "Output" stays, and takes the outcome of a refusal and the exit codes from the section that went: it describes what the tool prints, not a rule.

It replaces two earlier choices. In "Records over prose" (2026-10-13), a refusal was one record of `key=value` fields with no sentence; it is now a block with its code's one sentence, while the counts, `show --drawn` and `try` stay records. In "One entry page, help where it is used" (2026-10-17), "A refusal carries its own fix": the generated `fix` facts are gone, about 45 of them, and with them the search for the size of a box at which a line's label fits, which laid the diagram out at each larger size ("The dirty work has edges"). The agent still widens the box itself, and `next` names `node resize`.

Rejected:
- Generated fix commands, the `fix` facts of 2026-10-17. They choose for the agent, they teach a form that the agent copies without reading, and each is engine work that a test must keep right: the fix test applied every one.
- A sentence made for each case, such as "move pricing-svc out of row-upstream". It reads well, but it is advice in prose, worded its own way each time, and the agent has to parse English to find the ids ("Records over prose").
- One-line records for refusals, as before. A record of a dozen `key=value` fields said what was there, but not what had happened or which command could act, and `elements=` mixed boxes, lines and groups in one list.
- Generating each page's "When refused" section from the description table. It would stay right, but it is still a copy of what the block says, read before any mistake, as a rule in words.
- Keeping the "When refused" sections hand-written, made correct for the blocks. A second copy goes stale, as `edge add`'s did.

## Decision: Every write prints every warning — 2026-10-18

Decided by the owner on 2026-10-18, the same day as "Refusals say what happened and which commands can change it", which had kept one warning, a line with more than two bends. The composition counts ("Composition counts") told an agent how many lines pass rows or cross groups, but not which, unless it read `show --drawn`.

- **Seven warnings**, each its own block, in this order:
  - `bent-line`: a line with more than two bends ("The dirty work has edges"). Detail: `edge`, `bends`, `skip`.
  - `passing-row`: a line that runs through rows between its ends without meeting a box of them. Detail: `edge`, `rows`.
  - `line-across-group`: a line through the box of a group that holds neither of its ends. Detail: `edge`, and `groups`, every such group.
  - `tight-lines`: runs of two lines under 12 px apart for over 100 px. Detail: `edges`, the pair, and `over`, the pixels they share.
  - `crowded-label`: a line's label with under 8 px of room on two sides. Detail: `edge`.
  - `lonely-box`: a box no line reaches, neither one of its own nor one that ends at its group, row or lane, which reaches every box it holds. Detail: `node`. Decided by the owner later the same day: a box reached through its group, row or lane is connected in the picture. Of the 16 boxes with no line of their own in the 329 saved drafts, 8 were reached that way and are no longer warned of.
  - `crossing`: a pair of lines that cross, however often. Detail: `edges`.

  The first five are a block for each place that `bent`, `passing`, `across`, `tight` and `crowded` count, so the counts line stays as it was. `crossings` still counts points: a pair that crosses twice is one block. `next` names the commands that rearrange the picture: rows (`layer move`), order (`node move`, `node swap`, `group order`), and also `edge relabel` for a label, `node remove` and `edge add` for a box with no lines.
- **All of them, every time.** Every write, single commands included, and `check` and `render` print every warning the diagram has, not only those the command caused. Every change lays the whole diagram out again ("Layout computed again on every change"), so the set can differ after any change.
- **No source.** Decided by the owner later the same day: a warning has no `source:`, in text or in `--json`; errors and defects keep theirs. The outcome line `ok changed=<ids>` already tells the agent what it just changed, so it can match a warning that names those ids itself. Telling a new warning from an old one needs a second layout per write, of the diagram before it: measured on a quiet machine, it took one operation on a 50-box diagram from a median of 10.3 ms and a worst of 33.9 ms to 19.0 and 67.1 ms, against the 50 ms of GOALS.md, "Speed".
- **Measured.** On round p1g's final drafts a write prints no warning at scale 10, 35 blocks in 220 lines at scale 25, and 173 to 232 blocks in 1,117 to 1,490 lines (31 to 41 KB) at scale 50, most of them crossings.

Rejected:
- Only the warnings the command caused. The set changes with every layout, and a warning from before may be the one to act on.
- A source on every warning, `already in the file` or the command, by laying out the diagram before the write: the second layout per write, and the speed target missed, as measured above.
- A source only on the warnings this write made, printed first: the same second layout, so the same cost.
- A cache of the last layout beside the file, to compare with: a second file, which goes stale when the diagram is edited by hand or switched in git.
- One block per crossing point. Two lines that cross twice are one thing to change.

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
