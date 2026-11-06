# Placement

Placement turns the facts of a diagram into the place and size of every node. The agent states only facts: which layer a node sits in, its order in the layer, its group, its lane, its column and what it aligns to. Placement works out the rest, from which column of the grid each node takes to how tall each layer is and how big the canvas is. It stores nothing: every write places the whole diagram again from its facts. It routes no edge and seats no label, but it leaves the room both need. It lives in `src/layout/`.

## How a diagram is placed

Placement solves the two directions separately. Across, every node takes a column of one grid that all layers share, so that nodes in different layers line up and the edges between them can run straight. Down, the layers are stacked from the top, each followed by a gutter as tall as its edges need.

The two are solved at different times. A gutter's height depends on how many edges run through it, which routing decides, and routing needs every node's x first. So placement works in three turns, with routing between them:

```text
facts ──> boxes placed by steps join their rows ──> sizes ──> each row in lane, then column order
                                                                │
              routing: stand-ins for container ends, lines straight between neighbours
                                                                │
          the column grid ──> the x of every box, group, lane and wall, and the canvas's width
                                                                │
              routing: every line, and the rows of tracks each gutter holds
                                                                │
          the y of every row, head and gutter ──> the canvas's height
```

Every step reads only the facts and the theme, so the same file gives the same places on every machine.

## Sizes

A node's size step gives its size. A node with no step is medium when its text fits a medium node and large when it does not, so a short label never gets a large node. With `sizing: fixed`, a node with no step stays medium.

| Shape | `s` | `m` | `l` |
|---|---|---|---|
| Node | 112 × 48 | 136 × 56 | 184 × 72 |
| Decision diamond | 136 × 64 | 184 × 80 | 232 × 96 |

A dot is 24 px across and a `choice` diamond 28 px, whatever the step. Every plain node in a layer is drawn as tall as the layer's tallest plain node, so their tops line up, while dots and diamonds keep their shapes. A layer is as tall as its tallest shape, and a shorter shape is centred in it. A layer with no node is 56 px high, unless it is drawn as a bar.

## The column grid

A layer is an ordered list, and nothing more: it says which node comes before which. The grid turns those orders into columns that hold across all layers.

```text
row 0     [ A ]   [ B ]
            │       │            the line A→C joins A and C into column 0,
row 1     [ C ]   [ D ]   [ E ]  B→D joins B and D into column 1,
                                 and E takes a column of its own
column      0       1       2
```

The grid is built in four steps:

1. **Constraints.** Each node must lie left of the next in its layer.
   - Lanes and groups and column facts and walls and nodes shared by groups add more constraints of the same kind.
2. **Joins.** Nodes in different layers are joined into one column best first: alignments → steps → lines.
   - An edge's join scores 10 when it spans one layer and `max(1, 6 − span)` when it spans more.
   - It scores 4 more when the node has no other partner and 2 more for the median of its partners.
   - It scores 3 more for each end that continues a straight line.
   - A join that would widen the grid is not made.
   - An edge that skips layers also keeps its column free in the layers it passes, so that it can run down it.
3. **Packing.** Each column takes the leftmost place its constraints allow.
4. **Balance.** Three sweeps pull nodes toward the nodes they connect to, within their constraints.

A node outside every group that two or more groups use, such as a store that a write side and a read side share, joins no edge's column. It lies between the groups' members, and balance pulls it toward the nodes it connects to.

Then each column gets its x: the largest of all the minimum distances that apply to it, from node widths, gaps, groups, lanes and walls. The grid is centred on a multiple of 4 px.

Two neighbours in a layer keep the density's node gap between them. A gap that a labelled line crosses is as wide as the label plus 40 px when the label sits on the line, and plus 24 px when it sits above or below. Two numbered lines between the same neighbours widen it to 60 px plus their arrowheads, so that both badges fit side by side.

## Alignment

An aligned node joins its target's column, so it sits directly above or below it. Alignments are joined before anything else, in the order of layers and then of nodes, so an earlier one wins. One that cannot hold with the order of the layers is refused as `alignment-conflict`, with the nodes in the way. An alignment to an unknown node, to a node in its own layer or to itself is refused as `unknown-node`, `same-layer` or `self-alignment`.

## Columns

A column is a fact the agent states beside layers, and nothing is drawn for it. It is an order that holds in every layer: every node of a column lies left of every node of the next column, with at least a node gap between them. Every write puts each layer in column order. A node in no column takes the rank of the node left of it, or comes first when nothing is left of it. An order that another fact contradicts is refused as `column-order`.

## Lanes

A diagram's lanes all run one way. Layers as members make lanes that run as layers, and nodes as members make lanes that run as columns.

- **Lanes as columns** go left to right in the order of the diagram's `lanes` list.
  - Every layer is put in lane order, so a lane's nodes stay together.
  - A node outside every lane lies left of the lanes when it comes before the layer's first lane node, and right of them otherwise.
  - A lane reaches 20 px past its content, and the contents of neighbouring lanes keep 40 px apart.
  - Its header on top is as tall as its label with 10 px of padding above and below, and 16 px lie between the header and the content.
- **Lanes as layers** share one header column on the left: the widest label up to 112 px, plus 24 px.
  - Each lane has 16 px of padding at the top and bottom, and its border runs below the gutter's tracks and walls.

A lane's side keeps lines 8 px off on either side.

## Steps from another box

A node placed by steps has no layer of its own. It lands in the cell its steps name from its anchor: its anchor's layer plus the steps down, and its anchor's column plus the steps across. So it moves with its anchor, which may itself be placed by steps.

- Past the first or last layer, the node lands in a layer grafical adds.
  - `show --drawn` names that layer `-`.
  - An added layer on the way stays empty and is 56 px high, a medium node's height.
- Each step across keeps the two nodes' centres at least a medium node and a node gap apart, so two steps never look like one.
- The node joins its layer by column.
  - On a tie, a node with steps to the left goes before.
  - The other nodes of the layer keep their order.
- A node already in the cell refuses the write as `step-blocked`.

## Groups

A group is drawn as one node around its members. Its node spans every layer from its top member to its bottom one, and in each of those layers its members fill a block of neighbouring columns with no other node inside. The other nodes of those layers sit beside it. A layer inside the span that holds no member is split to the left and right of the node.

A group has 24 px of padding on its sides and bottom, and 24 px more for each level of nesting, up to three levels. A node outside a group keeps at least 16 px from its node, and two group nodes keep 24 px apart. Inner group nodes alternate their fill with depth, the even ones on the canvas's color, unless a stylesheet sets `paint.nesting: shade`.

A group's title takes room by the place the agent states for it, and the engine adds room only for the title itself:

| Place | Room it takes |
|---|---|
| `top-left` · `top` · `top-right`, or no place | a head of 40 px above the first layer |
| `bottom-left` · `bottom` · `bottom-right` | a foot of 40 px below the last layer; the top keeps only its 24 px padding |
| `outside-top` · `outside-bottom` | 40 px outside the node |
| `left` · `right` | a strip inside, as wide as the label plus 4 px |
| `outside-left` · `outside-right` | room past that side only |

A head may lie partly over the tracks of the gutter above when no edge comes near it. A title outside one side reaches out on that side only, so the picture moves off its centre line rather than mirroring the room on the other side.

## Bands, bars and walls

A layer is not drawn, unless an edge ends at it or it has a look. Then it is drawn as a container:

- A layer with nodes is a band around them, reaching 16 px past the content.
  - Its head is 32 px high with a label and 16 px without, with 16 px of padding below.
- A layer with no node is a bar 40 px high, with no head and no padding.
  - Its layer takes the bar's height.

A wall is space between its two sides. A wall across adds 48 px below the upper side's lowest layer, after that gutter's tracks. A wall up and down keeps its two sides apart in the wall's layers and takes `max(48, label width + 16)` px across. No edge runs through a wall's space in its layers, and the wall reaches 16 px past its outermost nodes.

## Rows down the page

Once routing has said how many layers of tracks each gutter holds, every layer's y is added up from the top. A taller gutter or head moves every layer below it down:

```text
title and subtitle, then 28 px
for each row:
  lane tops, group heads and band heads that start here
  the row itself
  end padding of groups, lanes and bands that end here
  the gutter below, then any wall across
bottom margin
```

An edge's label counts as a track. A gutter takes the smallest of its density's fixed heights that holds its tracks: at least `(tracks + 1) × pitch`. Past the last height it grows in steps of 32 px. A gutter with no tracks takes the first height, and the last layer has none.

| Density | Gutter heights (px) | Track pitch | Node gap | Margin |
|---|---|---|---|---|
| `compact` | 32 · 48 · 64 · 88 · 120 | 12 | 24 | 24 |
| `normal` | 40 · 56 · 72 · 96 · 128 | 12 | 32 | 32 |
| `airy` | 56 · 80 · 104 · 136 · 168 | 16 | 48 | 40 |

Density changes nothing else.

The canvas is as wide as the widest of its nodes, groups, bands, lanes, side labels and routes, plus its margins. It is never narrower than its title with the legend, its subtitle or its note. Both sides are rounded up to multiples of 8 px across and 4 px down.

## What stays when the diagram changes

No code limits what may move: every write places the whole diagram again from its facts. What stays is the facts. An operation changes only the facts it names, so every other node keeps its layer, its order, its group, its lane and its alignment, and so its place relative to its neighbours.

The stability tests in `test/layout/stability.ts` apply single operations and assert exactly that. They also check that each node is drawn in its layer, in its order and inside exactly its groups' nodes. How far nodes move sideways and which routes change is measured and reported, not limited.

## Decisions

- [002. Facts over coordinates](decisions/002-facts-over-coordinates.md)
- [003. Rows unseen, groups as systems](decisions/003-rows-unseen-groups-as-systems.md)
- [004. Layout computed again on every change](decisions/004-layout-computed-again-on-every-change.md)
- [027. Columns beside rows](decisions/027-columns-beside-rows.md)
- [031. Steps from another box](decisions/031-steps-from-another-box.md)
- [035. Columns hold across rows](decisions/035-columns-hold-across-rows.md)
