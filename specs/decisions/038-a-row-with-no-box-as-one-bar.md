# 038. A row with no box as one bar

Decided: 2026-10-16

Replaced in part by specs/decisions, "A bar may cross a group": a bar no longer has to stay out of a group.

## The problem

Decided by the owner on 2026-10-16. Redrawing the dispatch diagram, the owner said "gateway becomes a horizontal long layer". A line could already end at a row, drawn as a band across the content ("Lines that end at containers"), but a row with no box was refused as `empty-container`. So a gateway or a message bus had to keep a box inside its band, and the picture said "gateway" twice: once as the band and once as the box.

## The choice

Now a row with no box may be a line end when the line's other end holds a box, and it is drawn as one bar across the content with its label in it. A row with no box that no line ends at is drawn as before, and a row that holds boxes is still a band.

- **One bar, 40 px high** with its label in it at the left.
  - No line runs over the label, and none moves for it ("Unreadable is refused and costly is reported").
  - Until 2026-10-19 the label was seated before the lines and clear only of the lines that end at the bar.
  - The router kept every line that passes the bar off it.
  - Redrawing a microservices diagram, a line from a service to its database went round the bar's name with four bends.
  - Seating the label after the lines changed 103 of 2,000 fuzz seeds:
    - Bends went from 146,809 to 146,643.
    - `label-blocked` went from 7 to 0.
    - `title-blocked` went from 3 to 1.
    - The engine-owned `needless-bend` went from 334 to 332.
  - None of the 329 saved drafts changed.
- **Lines meet it straight past their other ends.** The engine adds no box to the file or the picture.
- **Lines that pass it say so.** A line from a row above the bar to a row below it that does not end at it is refused as `bar-crossed` unless it says it may, with `edge add --pass` or `edge pass`.
  - The owner chose this on 2026-10-16 when asked why a passing line never touched the bar.
  - A reader takes a line drawn over a gateway for a line through it, so the agent states each line that goes past.
  - The flag is named for its records: `across` was already the count of lines through a stranger's group ("Composition counts").
- **Its look is the agent's.** `layer look <row> box|band` draws it as a box or a band.
  - A box is a service box's paint with a dark label: the bar is the gateway or the bus itself, not a container.
  - On 2026-10-16 the owner asked for both to be chosen through the command line, since looks are the agent's.
- **What cannot hold is refused.** A line between two rows with no box is refused as `bar-to-bar`: neither end says where the line goes across.
  - A row with no box between the first and last rows of a group is refused as `bar-in-group`.
  - The group's box would stretch over it and the bar would cut it in two ("Rows unseen, groups as systems").
- **Tested.** The fuzz test puts a bar in three seeds of ten; over 500 seeds, 89 diagrams have a bar.
  - None of the 306 saved drafts and none of the 15 fixtures changed, since a line to a row with no box was refused until now.
  - While it was built the fuzz test found two ways a line from a bar crossed a group's label, both fixed.

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
