# 038. A row with no box as one bar

Decided: 2026-10-16

## The problem

Decided by the owner on 2026-10-16 (behavior: FEATURES.md, "Ends at a group, a row or a lane", "Rows and order"). Redrawing the dispatch diagram, the owner said "gateway becomes a horizontal long layer". A line could already end at a row, drawn as a band across the content ("Lines that end at containers"), but a row with no box was refused as `empty-container`. So a gateway or a message bus had to keep a box inside its band, and the picture said "gateway" twice: once as the band and once as the box.

## The choice

Now a row with no box may be a line end when the line's other end holds a box, and it is drawn as one bar across the content with its label in it. A row with no box that no line ends at is drawn as before, and a row that holds boxes is still a band.

- **How tall.** One line of its label, with room above and below: 40 px.
  - The row takes the bar's height, so it no longer takes a band's head and padding or a box's height.
- **Where its label sits.** In the bar at its left, in the first stretch that no line meets.
  - It keeps 16 px clear of each line's end and of each line that passes the bar.
  - So a band's label takes the first stretch with no box below it.
  - Failing every stretch, it goes left of the content and of every line through the bar.
  - The bar then reaches it.
  - No line runs over the label, and none moves for it ("The dirty work has edges"): the label is seated once the lines are routed.
  - Until 2026-10-19 it was seated before them, clear only of the lines that end at the bar.
  - The router then kept every line that passes the bar off it.
  - Redrawing a microservices diagram, a line from a service to its database went round the bar's name with four bends.
  - Over 2,000 fuzz seeds, 103 changed:
    - Bends went from 146,809 to 146,643 and crossings from 166,085 to 166,086.
    - `label-blocked` went from 7 to 0 and `title-blocked` from 3 to 1.
    - The engine-owned `needless-bend` went from 334 to 332.
  - None of the 329 saved drafts changed.
  - Of the 18 fixtures only clinic-rows changed, with the same bends and crossings.
- **Where a line meets it.** Straight past the line's other end:
  - Down from a box above into the bar's top.
  - Up from a box below into its bottom.
  - At the centre of the facing member when the other end is a group.
  - The engine adds no box to the file or the picture.
  - While routing, a narrow stand-in sits in the bar under or over each other end.
  - Lines whose other ends lie within 48 px share one.
  - So the gap router routes these lines as any other ("Our own gap router").
  - The route is then cut at the bar as for every container end and runs straight on into it.
  - A group whose head lies below a bar keeps a group's gap from it.
- **Lines that pass it.** A line from a row above the bar to a row below it that does not end at it is refused as `bar-crossed` unless it says it may.
  - It says so with `edge add --pass`, or with `edge pass` on a line already drawn.
  - The owner chose this on 2026-10-16 when asked why a passing line never touched the bar.
  - A reader takes a line drawn over a gateway for a line through it, so the agent states each line that goes past.
  - A line that may pass is routed as through any row, over the bar or round its end.
  - It names the bar in `passes` and `passing` ("Records over prose").
  - The flag is named for those records: `across` was already the count of lines through a stranger's group ("Composition counts").
- **Its look.** The agent picks it per row with `layer look <row> box|band`.
  - Without one, a bar is drawn as a box and a band as a band.
  - Since 2026-10-18 a look also draws a row no line ends at ("A row with a look is drawn").
  - A box is a service box's paint with a dark label: the bar is the gateway or the bus itself, not a container.
  - A band is the band's light fill and muted label.
  - On 2026-10-16 the owner asked for both to be chosen through the command line, since looks are the agent's ("Looks").
- **How it is checked.** A line between two rows with no box is refused as `bar-to-bar`: neither end says where the line goes across.
  - A row with no box between the first and last rows of a group is refused as `bar-in-group`.
  - The group's box would stretch over it and the bar would cut it in two ("Rows unseen, groups as systems").
  - A group or a lane with no box is still refused as `empty-container`.
  - The SVG marks a bar's rectangle `class="bar"` for the separate geometry check, which knows shapes only (GOALS.md, "Mechanical defects").
  - The check then lets a line run across it and still treats it as a box for every other test.
- **Tested.** The fuzz test puts a bar in three seeds of ten.
  - It uses a random stream of its own, so that a seed without a bar draws as before.
  - Every line that passes a bar is allowed, and one bar in four is a band.
  - Over 500 seeds, 89 diagrams have a bar.
  - None of the 306 saved drafts and none of the 15 fixtures changed, since a line to a row with no box was refused until now.
  - While it was built, the fuzz test found two ways a line from a bar crossed a group's label, both fixed:
    - A group's head below a bar rose into a line's run in the gutter.
    - Outer groups seated their labels where a line from a bar came down into an inner group. Placement did not count a bar's line among those entering a box's top.

## Not chosen

- A line that passes the bar drawn over it with no fact.
  - The prototype did this; the owner asked why such a line never touched the bar.
- An opening cut in the bar where a line passes, as a hop marks a crossing.
  - Shown to the owner, not chosen; many passing lines would draw the bar in pieces.
- Charging a pass like a crossing, so that the router goes round the bar's end when it can.
  - It hides the question of whether the line goes through the gateway instead of asking it.
- Passing lines only round the bar's ends.
  - Long lines with more bends, for the reason "Walls as space" left routing round a partial obstacle for later.
- An allow list on the row, as a wall has.
  - The owner asked for a flag on the line.
- One look for every bar, set only in a stylesheet.
  - A gateway and a layer in one picture may want different looks.
- A box's height for the bar, 56 px at medium.
  - It would read as one very wide box.
- A band's head and padding around an empty row, about 104 px with the label above the row.
  - Most of it would be empty.
- The label centred in the bar.
  - Groups, bands and walls put their labels at the left.

## Consequences

A bar takes 40 px instead of a band's head and padding. A line that passes a bar is refused unless the agent lets it.
