# TODO

## ongoing

### [P1][DISCUSSION] How freely an agent can adjust a picture

- description:
  - The owner takes this one dimension at a time, and each decided one is in `specs/decisions/`.
  - Open: where a node sits beside another, where no gap has shown yet.
  - Open: where notes and step badges sit.
- created: 2026-11-05
- updated: 2026-11-06
- status: HALT
- next: the owner names the next dimension when a real picture shows a gap
- related: [055. A weak model draws well and a stronger one superbly](../specs/decisions/055-a-weak-model-draws-well-and-a-stronger-one-superbly.md)

### [P1][DISCUSSION] The legend needs a design of its own

- description:
  - The owner sees a legend as a small diagram.
  - A picture may have one or none.
  - Its entries may run across, down or in a grid.
  - It is open what goes in it and how each sample is drawn.
  - `diagram legend` explains line styles and widths and marks but not a node's fill.
  - A key of small nodes such as "Works" and "Bug" and "Fixed" is drawn as a group of plain nodes.
  - Every one of them gets `lonely-node`, six warnings for a picture that is right.
- created: 2026-10-30
- updated: 2026-11-06
- status: HALT
- next: the owner designs the legend in a talk of its own
- related: [057. A box may take a look of its own](../specs/decisions/057-a-box-may-take-a-look-of-its-own.md)

### [P2][DISCUSSION] What the first report run asks of the tool

- description:
  - A Haiku session on the catalog-sync brief spent its fixes on the order of boxes in a row, and it has no way to state a row's whole order at once.
  - It compared the `counts` lines of two writes by hand to see whether crossings fell.
  - It read `unquoted-text` as naming the field and not the fix, while a refusal never writes the fix.
  - `render` writes the SVG beside the PNG though it asked for neither by name.
  - The session took 782 s on a render of 0.24 s, and where that time went is not known.
  - Its picture has 17 crossings, and it did not use `gap`, `label` or a stated side.
  - A second run followed `diagram.grafical`, and it wrote `last: true` on every node.
  - It did not see layer labels in its picture, since a layer is not drawn.
  - It met `render`'s default names as a surprise.
  - `passing-layer` named the problem and gave it no move to make.
  - It could not see the trade between width and crossings, though `try` shows it.
  - The numbers of both runs are in [the report runs](../bench/results/report-2026-11-06.md).
- created: 2026-11-06
- status: HALT
- next: go through each with the owner
- updated: 2026-11-07
- related: [The benchmark harness](../specs/benchmark.md)

### [P1][DISCUSSION] A good picture and taste

- description:
  - [PHILOSOPHY.md](../PHILOSOPHY.md) holds that no score settles a picture for everyone and that grafical does not supply the taste.
  - Twelve points now say what a good picture is, and symmetry and even space lean toward taste.
  - No checkpoint runs O5: Routes the eye can follow or O6: A picture reads at a glance yet.
- created: 2026-11-08
- status: HALT
- next: the owner says whether the stance changes and when the two goals run
- related: [098. A picture is judged by how it reads](../specs/decisions/098-a-picture-is-judged-by-how-it-reads.md)

### [P1][DISCUSSION] The router is not smart enough

- description:
  - The owner holds that how edges are routed today is neither advanced nor smart.
  - Three ways are open: a search over the open space · a pass that rips up the worst lines · more rules.
  - A search is the only one of the three that lets a node sit in a gutter, and it risks speed, stability and about 3000 lines of rewrite.
  - 29 cases in `bench/routes/` measure any of them, and small cases show lines tangled in one gutter more than paths that fail.
  - The search trial stopped on 2026-11-07, and the owner settles the open points before another run.
  - Open: lines may share a run only if every start-to-end pair the run implies is a real edge, and whether false lines count as a hard number.
  - Open: what the engine does in a narrow gap where another route still reads.
  - Open: the least end run of a main line, where 20 px was proposed.
  - Open: labels, stability, the six edge facts on a search, and `ladder` against the new rules.
  - Trying the six edge facts on the cases, `via` and `with` cleaned up what they could reach, and a stated top in the first layer and a side `via` on a tight layer were refused by how the router is built.
  - A spike of [093. A node may sit off its cell by a fraction](../specs/decisions/093-a-node-may-sit-off-its-cell-by-a-fraction.md) on 2026-11-07 drew offsets across with no defect, and offsets down ran lines through nodes.
- created: 2026-11-07
- status: HALT
- next: the owner rates the cases, then picks a way
- blocks: [F2.5.1: Offsets](../features/F2-layout.md#f251-offsets)
- related: [095. A good route is one the eye can follow](../specs/decisions/095-a-good-route-is-one-the-eye-can-follow.md)

### [P2][ISSUE] `--main` can make a picture worse

- description:
  - On the `pyramid` case two `--main` edges moved A to the far right, and the picture read worse with the same crossings.
  - On `tree` and `ladder` it changed nothing.
  - It only raises a join's score, so the whole grid can solve differently.
- created: 2026-11-07
- status: OPEN
- found: trying the facts on the routing cases
- next: decide what `--main` should do past taking a column

### [P2][DISCUSSION] A parent that sits off the middle of its children

- description:
  - The `tree` and `pyramid` cases draw well by their counts and read wrong, since the grid packs nodes to the left.
  - This is placement and not routing, so the cases may need a class of their own and a number of their own.
  - An offset moves one node at a time, which is much work for a whole pyramid.
- created: 2026-11-07
- status: HALT
- next: the owner says whether cases split into routing and placement

### [P2][DISCUSSION] Seven line labels sit off their lines

- description:
  - 7 of the 54 labels of the fixtures stay off their lines.
  - [F2.7.3: Labels on edges](../features/F2-layout.md#f273-labels-on-edges) still lists lines that move apart for a label.
  - Classifying the seven costs nothing and comes before any change to the router.
- created: 2026-11-07
- status: HALT
- next: the owner says whether to classify them first

### [P2][TASK] The documents still say box, row and line in prose

- description:
  - Help and refusals say node, layer and edge, and the specs and features still mix in the old words.
  - `specs/routing.md`, `features/F2-layout.md` and `features/F1-elements.md` hold the most.
  - A decision's title stays as it was, since citations name it.
- created: 2026-11-07
- status: OPEN
- next: rename them with the words of the glossary

### [P2][DISCUSSION] The file's `library` against the code's stylesheet

- description:
  - [The .grafical file](../specs/grafical-file.md) says `theme` and `library`, and the code reads `style` and a `.grafical-style.yaml` file.
  - The glossary already gives *stylesheet* as a lost name.
- created: 2026-11-07
- status: HALT
- next: the owner says which one holds

### [P2][DISCUSSION] An HTML export, and an SVG a model can tune afterwards

- description:
  - The owner wants an HTML export.
  - The owner wants an exported SVG that a model may tune pixel by pixel, and grafical stops at the export.
  - `render --svg` writes an SVG with no ID on any element and no group, so a model cannot tell one path from another.
  - Its text names the font `Inter`, so another machine may draw it differently.
  - A tuned SVG is lost at the next `render`, since the file stores no position.
  - The philosophy says "Nobody places anything by the pixel", and only the owner can say how this sits with it.
- created: 2026-11-07
- status: HALT
- next: settle after the placement talk
- related: [The .grafical file](../specs/grafical-file.md)

### [P2][DISCUSSION] A line that is a curve end to end

- description:
  - Lines are drawn square or round today.
  - The owner wants a third shape with no straight run.
  - A curve through a route's points cuts corners and can meet what lies beside it.
  - It is open what happens when it does.
- created: 2026-11-06
- status: HALT
- next: the owner designs it
- related: [059. Lines may be drawn square, round or smooth](../specs/decisions/059-lines-may-be-drawn-square-round-or-smooth.md)

### [P2][DISCUSSION] Small points of the .grafical file

- description:
  - A diagram's optional type and a node's `type` share a word, and the first needs a new name.
  - A colon after an attribute's name may stay or go.
  - The attributes of `<style>` should grow to every look grafical can draw.
- created: 2026-11-06
- status: HALT
- next: settle each one when the file is built
- related: [The .grafical file](../specs/grafical-file.md)

### [P2][DISCUSSION] Labels sit close to the lines beside them in a crowded gutter

- description:
  - Four labelled lines out of one box run side by side in one gutter with each label 4 px from the next line.
  - The picture reads crowded though no warning fires.
  - Asking for 8 px everywhere made 421 of 500 fuzz diagrams 5.5% taller and the dispatch fixture 2 crossings worse.
  - Asking for 8 px only where a label finds room left the dispatch fixture 4 crossings worse.
  - An empty row between the two rows only lengthened the lines.
  - Neither try was landed.
- created: 2026-10-30
- status: HALT
- next: look again now that labels sit on their lines
- related: [066. A line's label sits on its line](../specs/decisions/066-a-line-s-label-sits-on-its-line.md)

### [P2][ISSUE] A label takes most of a short run

- description:
  - The `resync` label of the catalog-sync-grouped fixture sits on a run little longer than itself.
  - The line shows only two short pieces past the label, and the owner finds it less natural than the others.
  - A seat on a run keeps 8 px from each corner today.
- created: 2026-11-06
- status: OPEN
- found: the owner, looking at the catalog-sync-grouped fixture
- next: try a larger clearance, and try a label with a fill once labels mark styles
- related: [066. A line's label sits on its line](../specs/decisions/066-a-line-s-label-sits-on-its-line.md)

### [P2][ISSUE] Arrowheads land off centre and unevenly

- description:
  - The owner sees arrowheads that are sometimes far from the middle of a node's side.
  - Several arrowheads on one side are sometimes spread unevenly.
  - What should happen is not settled, and the rule for ports should be read before any change.
- created: 2026-11-06
- status: OPEN
- found: the owner, looking at the dispatch fixture drawn with `diagram --lines smooth`
- next: render the fixtures and list which sides break the even spread

### [P2][ISSUE] An arrowhead hidden at the far left of the dispatch fixture

- description:
  - The leftmost edge of the dispatch fixture, the dashed one from `push-provider` up to `rider-app`, has an arrowhead that a reader can barely see.
  - It runs up the picture's edge and turns into the node's left side at the very end.
  - The cause is not known.
- created: 2026-11-06
- status: OPEN
- found: the owner, looking at the dispatch fixture drawn with `diagram --lines smooth`
- next: render this edge with square lines to see whether `smooth` or the route hides the arrowhead
