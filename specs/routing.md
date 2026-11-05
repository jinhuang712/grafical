# Routing

Routing draws every line once the boxes have their places. A line is made of horizontal and vertical runs: across the gutters between rows, and down through the gaps between boxes. It never runs through a box. The agent says only which two things a line joins. The router picks everything else: the side the line leaves and enters, its place on each side, the corridor it runs down and the track it takes in each gutter. Every value lies on a 4 px grid and every tie has a fixed rule, so the same placement always gives the same routes. It lives in `src/layout/`.

## The steps

Routing works in two turns around placement. Before the boxes have their x, it does what placement needs to know: it gives each line that ends at a container a stand-in box to aim at, and it picks the lines that cross straight between two neighbours, so that placement can make their gap wide enough. Once every box has its x, it routes all the lines together:

```text
 1. kind        down, up, along its own row, or straight across to a neighbour
 2. bundles     lines that leave one side together share one trunk
 3. corridors   a line that skips rows picks an empty column, or a gap in each row
 4. gutters     a line along a row picks the gutter above or below it
 5. sides       a line may leave or enter a box's side instead of its top or bottom
 6. ports       each line gets its own place on every side it meets
 7. centres     a line that can run straight moves back to its boxes' centre
 8. tracks      each gutter stacks its runs into rows of tracks, and seats the labels
```

Each step works on what the steps before it fixed, and no later step undoes one. When a line was sent above its row, the whole run is made a second time with every such line below, to compare the two. Once placement has given the rows their y, the tracks become heights, the routes become points, and each route to a container is cut at its edge. A line from a box in the top row to a box two rows down passes most of them:

```text
row 0     [ A ]
            │            leaves A's bottom at its port
gutter      └─────┐      one track of the gutter
row 1     [ C ]   │   [ D ]
                  │      the corridor: a column empty in row 1
gutter            └─────┐
                        ▼  enters E's top at its port
row 2                 [ E ]
```

## Kinds of line

A line between two rows goes down or up. Between neighbouring rows it runs from the bottom of the upper box straight to the top of the lower one when their ports line up. When they do not, it steps sideways along a track of the gutter, with two bends. A line that skips rows also needs a way down through the rows between, which a corridor gives it.

A line between two boxes of one row runs along the row instead. When the two boxes are neighbours, it crosses straight through the gap between them. A gap is only as tall as its row, so it holds few lines:

- With no labels, as many lines as fit share the gap 12 px clear of the boxes' corners.
- With labels, the first line whose label is at most 200 px wide takes the gap.
  - A second line joins it when the row is tall enough: the next such labelled line, or else the first line with no label.
- When no label is that narrow, the first line with no label takes the gap.

Every other line between the two boxes, and every line between boxes of one row that are not neighbours, runs through the gutter above or below the row.

## Fan-outs and fan-ins

A box with many lines on one side would need a port for each, and the lines would crowd its edge. So lines that leave one side in the same style and weight become a bundle: one port and one trunk, which splits near its targets.

- Three or more such lines always bundle.
  - Two bundle only when the side has more lines than ports 16 px apart.
- A line that carries something of its own never joins a bundle.
  - That is a labelled line or a numbered line or a two-way line or a self-loop or a line to a container.
- Two or more unlabelled lines of one style into one crowded side of a target share one port as a fan-in.
  - A two-way line may join a fan-in.

The members of a bundle share a track until their paths part. Their tracks are ordered by where they part, so that no two members cross. A trunk that runs straight on with branches to both sides would meet them in a junction that reads as a crossing. So it splits into two runs, each branching at its own height.

## Corridors and gaps

A line that skips rows runs down a corridor: a column of the grid that is empty in every row it passes. Several corridors are usually open, and the router scores each one as a single sum:

```text
cost = distance from the source  (+ 96 if outside the source's port range)
     + for each line sharing it: distance to its target (+ 96 if outside its range)
     + 192 × (crossings placement makes certain + groups that hold neither end)
```

The sum prefers a corridor near both ends that the lines sharing it reach straight. It weighs most against the crossings that are certain once the boxes are placed:

- A line straight through a gutter the route runs along.
- A line along a gutter the route crosses.
- A line across a row the route passes.

A tie goes to a corridor a sharing line already took, then to the lower cost, then to the shorter move of the source, then to the leftmost.

When no corridor is free, the line takes a gap between two boxes in each row it passes. A gap holds as many vertical tracks as fit, 16 px apart where there is room and down to 8 px where there is not. Tracks keep out of the margin of a group that holds neither end where they can, and a line that still crosses such a group pays for it in the cost.

## Lines along a row

A line between two boxes of one row that are not neighbours goes round, through the gutter above or below. It takes the side where fewer other lines meet the boxes between its ends, so that it crosses fewer of them, and below on a tie. It stays below in the top row, for a self-loop, and for a member of a bundle or a fan-in. It also stays below where a band's label, a wall or a lane's side lies in the gutter above.

Above is a guess, because a port added on a box's top moves the ports beside it, and a run in the gutter takes room from its labels. So when any line went above, the router also routes every such line below, as a baseline. A line sent above goes back below when its gutter gains a needless bend or a label with no room, or a line that shares one of its boxes newly bends. This repeats until no line goes back.

## Side exits and side entries

A line to a box in the next row that lies wholly to one side would leave from the bottom and turn twice: a Z. It may instead leave by its source's side, at the middle of the row, and turn once into its target: an L. A line that skips rows does the same when its corridor lies in the open beside its source.

An exit needs room: the row clear between the source and the turn, no track close to the turn, and a turn that falls within the target's top or bottom ports. Each side takes at most one exit, and none when a line to a neighbour already uses it.

Where no exit was taken, a line may enter its target's side instead. A side takes several entries, each at its own height: the lines from above enter its upper part, and the lines from below its lower part. Lines to bars and lanes take no side exit, and lines to containers take no side entry.

## Ports

A line meets a box's top or bottom. It meets the left or right side only to reach a neighbour, or for a side exit or entry. The ports of one side go in the order of where each line's run ends in the gutter, walking round from the box's corner, so that the lines leave the side without crossing each other.

The router first spreads the ports evenly across the side, each pulled toward the x its line wants. When that bends a line that could run straight, it tries tighter spacings in turn, from 16 px apart and 16 px from the corners down to 4 px apart. It takes the first that bends no such line, or the first that fits when every one does. As a last resort, ports sit 2 px off the grid, so that no two lines share an x.

Bottom sides are placed before top sides. A line that can run straight down then meets the port its upper box already took, when that port lies at least 8 px inside the lower box.

## Back to the centre

Spreading the ports pushes lines off their boxes' centres. After ports and tracks are placed, a line that runs straight from its source through every gap into a box that shares its centre moves back to that centre, with the lines in its way. It moves only when nothing gets worse: no new crossing, no track or port too close to another, and enough room left in each gap. It stays put when another line joins the same two boxes or a self-loop sits on its side. A turning line, a member of a bundle and a line of a fan-in never move.

## Gutters

A gutter holds rows of tracks, one track pitch apart, which the density sets. The router orders the horizontal runs of each gutter for the fewest crossings and gives each the first free row of tracks. It seats each line's label beside its run at the same time, since a label takes room as a track does. A line from above ends above a line from below at the same x, so that the two do not cross there. A gutter next to a row that holds a store keeps 8 px more room on that side when it has runs.

Placement turns the number of rows a gutter holds into its height. Each track's y is then fixed, and the routes become points.

## Lines that end at a container

The router knows only boxes. A line to a group, a row or a lane is routed to a stand-in: the member of the container that faces the other end. For a bar, the stand-in is a short piece of the bar beside the other end, and stand-ins that lie close together become one. After routing, the route is cut where it meets the container's box or band, so the line ends at the container's edge. A line into a band runs straight on into it past its other end. A line to a container gets a port of its own and never joins a bundle or a fan-in.

A line that passes a bar without ending at it is refused as `bar-crossed`, unless the agent said it may. One that may runs straight through the bar, since in the bar's row only the stand-ins count as boxes.

## Walls

The model has already refused a line between a wall's two sides that the wall does not allow. The router keeps every line out of a wall that runs up and down: out of its gaps, its corridors and its top ports in the wall's rows, and out of the gutter above it. A wall across is only space, so no line is routed round it, and one that crosses it is the defect `wall-crossed`.

## Self-loops

A line from a box to itself loops through the gutter below the box. Its two ends sit about 48 px apart, either side of the box's centre, though the ports may move them. The loop runs at the gutter's third row of tracks.

## Decisions

- [005. Our own gap router](decisions/005-our-own-gap-router.md)
- [015. Lines that end at containers](decisions/015-lines-that-end-at-containers.md)
- [019. Lines meet any side](decisions/019-lines-meet-any-side.md)
- [023. Fan-outs of three bundle](decisions/023-fan-outs-of-three-bundle.md)
- [041. The dirty work has edges](decisions/041-the-dirty-work-has-edges.md)
