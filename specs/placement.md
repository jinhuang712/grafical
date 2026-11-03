# Placement

Placement turns the facts of a diagram into the place and size of every box: which column of one grid each box takes, how tall each row is, where groups, lanes, bands, bars and walls sit, and how big the canvas is. It stores nothing: the whole diagram is placed again from its facts on every write. It routes no line and seats no label, but it leaves the room both need. It lives in `src/layout/` ([the architecture](ARCHITECTURE.md#placement)).

## The steps

Placement runs in three turns, and routing works between them:

```text
1. boxes placed by steps join a row        (placeSteps; rows added past the ends)
2. every box gets its size                 (withSizes)
3. each row in lane order, then column     (orderByLanes, orderByColumns)
       routing picks stand-ins for container ends and the lines between neighbours
4. the column grid and the x of everything (placeAcross → buildGrid, solve)
       routing routes every line and counts the tracks each gutter needs
5. the y of every row, and the canvas      (compute)
```

The steps read only the facts and the theme, so the same file gives the same places on every machine.

## Sizes

A box's size step gives its size. A box with no step is medium when its text fits a medium box and large when it does not. With `sizing: fixed`, a box with no step stays medium.

| Shape | `s` | `m` | `l` |
|---|---|---|---|
| Box | 112 × 48 | 136 × 56 | 184 × 72 |
| Decision diamond | 136 × 64 | 184 × 80 | 232 × 96 |

A dot is 24 px across and a `choice` diamond 28 px, whatever the step. Every plain box in a row is drawn as tall as the row's tallest plain box, so their tops line up, while dots and diamonds keep their shapes. A row is as tall as its tallest shape, and a shorter shape is centred in it. A row with no box is 56 px high, unless it is drawn as a bar.

## The column grid

Every box sits in a column of one grid that all rows share, and the grid is centred. Within a row, the columns follow the boxes' order. The grid is built in four steps:

1. **Constraints.** Each box must lie left of the next in its row.
   - Lanes, groups, column facts, boxes shared by groups and walls add more constraints of the same kind.
2. **Joins.** Boxes in different rows are joined into one column, best first: alignments, then steps, then lines.
   - A line's join scores 10 when it spans one row and `max(1, 6 − span)` otherwise.
   - It scores 4 more when the box has no other partner, 2 more for the median partner, and 3 more for each end that continues a straight line.
   - A join that would widen the grid is not made.
   - A line that skips rows also keeps its column free in the rows it passes.
3. **Packing.** Each column takes the leftmost place its constraints allow.
4. **Balance.** Three sweeps pull boxes toward the boxes they connect to, within their constraints.

A box outside every group that two or more groups use, such as a store a write side and a read side share, joins no line's column. It lies right of the leftmost group's members and left of the rightmost group's, and balance pulls it toward the boxes it connects to.

Then each column gets its x: the largest of all the minimum distances that apply to it, from box widths, gaps, groups, lanes and walls. The result is centred on a multiple of 4 px.

Two neighbours in a row keep the density's box gap between them. A gap that a labelled line crosses is as wide as the label plus 24 px. Two numbered lines between the same neighbours widen it to 60 px plus their arrowheads, so that both badges fit side by side.

## Alignment

An aligned box joins its target's column, so it sits directly above or below it. Alignments are joined in the order of rows and then of boxes, so an earlier one wins. One that cannot hold with the constraints is refused as `alignment-conflict`, with the boxes in the way. An alignment to an unknown box, to a box in its own row or to itself is refused as `unknown-node`, `same-layer` or `self-alignment`.

## Columns

A column is a fact the agent states, beside rows, and nothing is drawn for it. Every write puts each row in column order. A box in no column takes the rank of the box left of it, or comes first when nothing is left of it. The grid keeps every box of a column left of every box of the next column in all rows, with at least a box gap between them. An order that another fact contradicts is refused as `column-order`.

## Lanes

A diagram's lanes all run one way. Rows as members make lanes that run as rows, and boxes as members make lanes that run as columns.

- **Lanes as columns** go left to right in the order of the diagram's `lanes` list.
  - A box outside every lane lies left of the lanes when it comes before the row's first lane box, and right of them otherwise.
  - A lane reaches 20 px past its content, and the contents of neighbouring lanes keep 40 px apart.
  - Its header on top is as tall as its label with 10 px of padding above and below.
  - 16 px lie between the header and the lane's content.
- **Lanes as rows** share one header column on the left: the widest label up to 112 px, plus 24 px.
  - Each lane has 16 px of padding at the top and bottom, and its border runs below the gutter's tracks and walls.

## Steps from another box

A box placed by steps lands in the cell its steps name from its anchor: its anchor's row plus the steps down, and its anchor's column plus the steps across. It moves with its anchor, which may itself be placed by steps.

- Past the first or last row, the box lands in a row grafical adds.
  - `show --drawn` names that row `-`.
  - An added row on the way stays empty and is 56 px high, a medium box's height.
- Each step across keeps the two boxes' centres at least a medium box and a box gap apart, so two steps never look like one.
- The box joins its row by column.
  - On a tie, a box with steps to the left goes before.
  - The other boxes of the row keep their order.
- A box already in the cell refuses the write as `step-blocked`.

## Groups

A group's box spans every row from its top member to its bottom one, and the other boxes of those rows sit beside it. Its members fill a block of neighbouring columns with no other box inside. A row inside the span that holds no member is split to the left and right of the box.

A group has 24 px of padding on its sides and bottom, 24 px more for each level of nesting. Groups nest up to three levels deep. A box outside a group keeps at least 16 px from its box, and two group boxes keep 24 px apart.

Its title takes room by the place the agent states for it, and the engine adds room only for the title itself:

| Place | Room it takes |
|---|---|
| `top-left`, `top`, `top-right`, or no place | a head of 40 px above the first row |
| `bottom-left`, `bottom`, `bottom-right` | a foot of 40 px below the last row; the top keeps only its 24 px padding |
| `outside-top`, `outside-bottom` | 40 px outside the box |
| `left`, `right` | a strip inside, as wide as the label plus 4 px |
| `outside-left`, `outside-right` | room past that side only |

A head may lie partly over the tracks of the gutter above when no line comes near it. A title outside one side reaches out on that side only, so the picture moves off its centre line rather than mirroring the room on the other side.

Inner group boxes alternate their fill with depth, the even ones on the canvas's color, unless a stylesheet sets `paint.nesting: shade`.

## Bands, bars and walls

A row a line ends at, or a row with a look, is drawn as a container:

- A row with boxes is a band around them, reaching 16 px past the content.
  - Its head is 32 px high with a label and 16 px without, with 16 px of padding below.
- A row with no box is a bar 40 px high, with no head and no padding.
  - Its row takes the bar's height.

A wall across adds 48 px of space after the pad and the tracks of the gutter below the upper side's lowest row. A wall up and down keeps its two sides apart in the wall's rows, and takes `max(48, label width + 16)` px across. No line runs through a wall's space in its rows, and the wall reaches 16 px past its outermost boxes.

## Rows down the page

Every row's y is added up from the top, so a taller gutter or head moves every row below it down:

```text
title and subtitle, then 28 px
for each row:
  lane tops, group heads and band heads that start here
  the row itself
  end padding of groups, lanes and bands that end here
  the gutter below, then any wall across
bottom margin
```

Routing says how many rows of tracks each gutter holds, a line's label counting as a track. A gutter takes the smallest of its density's fixed heights that holds its tracks: at least `(tracks + 1) × pitch`. Past the last height it grows in steps of 32 px. A gutter with no tracks takes the first height, and the last row has none.

| Density | Gutter heights (px) | Track pitch | Box gap | Margin |
|---|---|---|---|---|
| `compact` | 32, 48, 64, 88, 120 | 12 | 24 | 24 |
| `normal` | 40, 56, 72, 96, 128 | 12 | 32 | 32 |
| `airy` | 56, 80, 104, 136, 168 | 16 | 48 | 40 |

Density changes nothing else.

The canvas is as wide as the widest of its boxes, groups, bands, lanes, side labels and routes, plus its margins. It is never narrower than its title with the legend, its subtitle or its note. Both sides are rounded up to multiples of 8 px across and 4 px down.

## What stays when the diagram changes

No code limits what may move: every write places the whole diagram again from its facts. What stays is the facts. An operation changes only the facts it names, so every other box keeps its row, its order, its group, its lane and its alignment. The stability tests in `test/layout/stability.ts` apply single operations and assert exactly that. They also check that each box is drawn in its row, in its order and inside exactly its groups' boxes. How far boxes move sideways and which routes change is measured and reported, not limited.
