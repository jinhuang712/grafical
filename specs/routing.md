# Routing

Routing draws every line once the boxes are placed. Lines run in horizontal and vertical stretches through the gutters between rows and the gaps between neighbouring boxes, never through a box. The router picks each line's sides, ports, corridor and tracks; no operation can. It works on the 4 px grid, so the same placement always gives the same routes. As it fills each gutter, it also seats the labels of the lines there. It lives in `src/layout/` ([the architecture](ARCHITECTURE.md#routing)).

## The steps

```text
before placement
  container ends get stand-in boxes       (planEnds)
  lines between neighbours are picked     (planSideways)
after placement
  stand-ins move to the facing box        (refineEnds)
  keep-out spans: band labels, walls, lane sides, labels between neighbours
route
  1. each line's kind, sides and gutters  (makePlan)
  2. fan-outs and fan-ins                 (assignBuses)
  3. a corridor, or a gap per row         (chooseGaps)
  4. vertical tracks in the gaps          (assignGapTracks)
  5. gutter above or below for same-row lines   (chooseUturnGutters)
  6. side exits, then side entries        (chooseSideExits, chooseSideEntries)
  7. ports on every side                  (placePorts → assignPorts)
  8. straight lines back to their centres (straightenPorts, centreLines)
  9. each gutter's rows, and the labels   (buildVisits, routeGutter)
compare: route again with every same-row line below, keep what is no worse
assemble: rows become y; routes are cut at containers   (assemble, cutRoute)
```

## Kinds of line

`makePlan` gives each line one of four kinds: down to a lower row, up to a higher row, between two boxes of one row through a gutter, or between neighbours in a row. A line between neighbours runs straight across the gap between them, and `planSideways` picks which lines of a pair take the gap:

- With no labels, as many lines as fit at the side pitch share the gap, kept 12 px from the corners.
- With labels, the first line whose label is at most 200 px wide takes the gap.
  - A second one joins it when the row is tall enough for both: the next such labelled line, or else the first line with no label.
- When no label is that narrow, only the first line with no label takes the gap.

Every other line between the pair goes round through a gutter as a line along a row.

## Fan-outs and fan-ins

Lines that leave one side of a box in the same style and weight become a bus: one port and one trunk that splits near its targets.

- Three or more such lines always bundle.
  - Two bundle when the side has more lines than ports: `floor((width − 32) / 16) + 1`.
- A labelled line, a numbered line, a two-way line, a self-loop and a line to a container never join a bus.
- Lines into one crowded side of a target share one port as a fan-in, two or more of them.
- Members of a bus share a track until their paths part.
- The order of their tracks follows where they part, so that they do not cross.
- A trunk that goes straight on with branches on both sides is split into two runs, each branching at its own height.
- So no junction reads as a crossing.

Every unlabelled line that leaves one side past the same rows chooses one corridor with the others, whether or not they form a bus.

## Corridors and gaps

A line that skips rows runs down a corridor: a column of the grid that is empty in every row it passes. `chooseGaps` scores each corridor as one sum:

```text
cost = distance to the source  (+ 96 if the source cannot reach it straight)
     + for each line sharing it: distance to its target (+ 96 if not straight)
     + 192 × (crossings that placement makes certain + groups that hold neither end)
```

A crossing that placement makes certain is a line straight through a gutter the route runs along, a line along a gutter the route passes straight through, or a sideways line across a row it passes. A tie goes first to a corridor a sharing line already took, then to the lower cost, then to the shorter move of the source, then to the leftmost. The line keeps 24 px from boxes where there is room. When no corridor is free, the line takes a gap between boxes in each row it passes. A gap holds as many tracks as fit 8 px apart on the 4 px grid, and the outermost gaps never fill.

Vertical tracks in a gap try 16 px apart, then 12, then 8, keeping 8 and then 4 px from the tracks above. Gap tracks keep out of the margin of a group that holds neither end, from 8 px outside its border to 24 px inside, where they can. A line may still cross such a group's box, at a cost.

## Lines along a row

A line between two boxes of one row that are not neighbours runs through the gutter below the row, or above it when fewer lines meet the boxes between its ends on their tops than on their bottoms. A tie keeps it below. The count leaves out lines between neighbours and lines with both ends inside the span. It also stays below in row 0, for a self-loop and for a member of a bus or a fan-in, and where a band's label, a wall or a lane's side lies in the gutter above.

Because a port added on top moves its neighbours and a run takes room from the labels, the router first routes with every such line below, as a baseline. Then it sends back below each line in the gutter above whose gutter or boxes gain a line that bends for nothing, or a label that finds no room, until nothing is worse than the baseline.

## Side exits and side entries

A line to a box in the next row that lies wholly to one side may leave by its source's side at the middle of the row and turn once into its target: an L with one bend instead of a Z with two. A line that skips rows does the same when its corridor lies in the open beside its source.

- The source's row must be clear between the source and the turn, up to 16 px from the next box.
- No gap track may lie within 8 px of the turn, and no run may cross the gutter there.
- Each side takes at most one exit, and none when a line between neighbours uses it.
- The turn must fall within the target's top or bottom port range, nearest its centre; otherwise the line leaves from the bottom or top as before.

Where no exit was taken, a line may instead enter its target's side, between two real boxes, leaving its fan-in to do so. A side takes several entries, each at its own height: the lines from above enter its upper part, the nearer the higher, and the lines from below its lower part, the nearer the lower. Entries keep 8 px apart across the gap, and two turns may share a gap when their runs keep 8 px apart. Lines to bars and lanes take no side exit, and lines to containers take no side entry.

## Ports

A line uses the left or right side of a box only between neighbours or for a side exit or entry; otherwise it meets the top or bottom. The ports of a side go in the order of where each line's run ends in the gutter, walking round the gutter from the box's left corner, so that a line that turns back into its own row runs outside the lines that go on.

`assignPorts` first tries a spread pitch, `min(48, floor((width − 32) / count / 4) × 4)`, when that is over 16 px, and pulls each port toward the x it wants. Then it falls back through six steps: a 16 px pitch with 16 px from each corner, 16 with 8, 12 with 8, 12 with 4 px from the far side's lines, 8, and 4. A step is taken only when no line that could run straight bends. When every step bends one, the first that fits is used. The last resort puts ports 2 px off the 4 px grid, so that no two lines share an x. Ports keep 8 px, and at worst 4 px, from lines that enter the gutter from its other side.

Bottom sides are placed before top sides. A line that can run straight down meets the port its upper box took, when that port lies at least 8 px inside the lower box.

## Back to the centre

After ports and tracks are placed, a line that runs straight from its source through every gap into a box that shares its centre moves back to that centre, unless it is a turn or a member of a bus. Lines sharing its corridor from the same side that stand within 16 px in its way move with it. It moves only when nothing gets worse:

- The new x stays 8 px inside each box and off the keep-out spans on top.
- The gap keeps `min(16, its old room)` of room, and the line stays off group margins.
- Other ports stay 16 px away, other tracks `max(8, min(16, their old distance))`, and other ends 8 px.
- No new crossing appears.

It stays put when another line joins the same two boxes, or a self-loop sits on its side.

## Gutters

A gutter holds rows of tracks one track pitch apart, which the density sets. `routeGutter` orders the runs in a gutter for few crossings and gives each the first free row. A line from the top ends above a line from the bottom at the same x. A line that must step sideways steps at least 12 px. A gutter next to a row that holds a store keeps 8 px more room on that side when it has runs, since stores sit where many lines run.

Routing hands placement the number of rows each gutter holds, and placement gives the gutter its height. Each track's y is then `gutter top + pad + (row + 1) × pitch`.

## Lines that end at a container

A line to a group, a row or a lane is routed to a stand-in box: before placement the middle box of the container that faces the other end, and after it the nearest one. When the two ends share a row, the stand-in is the member beside the other end. For a bar, the stand-in is a 32 px piece of the bar under or over the other end, and neighbouring stand-ins less than 48 px apart become one. The route is then cut where it meets the container's box or band, and a line into a band runs straight on into it past its other end. A line to a container gets a port of its own and never joins a bus or a fan-in.

A line that passes a bar without ending at it is refused as `bar-crossed` unless it says it may. One that may runs straight through the bar in its corridor, since in the bar's row only the stand-ins count as boxes.

## Walls

The model has already refused a line between a wall's two sides that the wall does not allow. The router keeps lines out of a wall that runs up and down in its rows, in its gaps, corridors and top ports, and closes the gutter above to them. A wall across is only space: lines are not routed round it, and one that crosses it is `wall-crossed`.

## Self-loops

A self-loop wants its ends 48 px apart, either side of the box's centre, though its ports may move. It always uses the gutter below its box and starts in its third row of tracks, 36 px down at a 12 px pitch.
