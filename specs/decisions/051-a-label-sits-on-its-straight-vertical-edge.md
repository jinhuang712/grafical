# 051. A label sits on its straight vertical edge

Decided: 2026-10-30

## The problem

Drawing two reference diagrams of a chat's alerts and a host's states, with a label on every edge, the owner asked why a label never sits on its own edge. The code only ever offered a label above or below a run, or beside an edge that runs straight up and down, although a label was meant to sit on its own run; no decision had rejected it. The labels already have a patch the colour of what lies behind them, drawn over the edge, so a label on its edge breaks the edge, as a flowchart's labels do.

## The choice

- **A new slot `on` for a straight vertical edge:** the label is centred on the edge at the height the beside slot has.
  - It is the first choice, ahead of beside the edge on its left and on its right.
  - Every rule that kept a label clear still holds.
    - No other edge crosses it, and no node or side of a group or lane or wall.
    - A label with no clear slot wraps first and then tries another gutter.
    - When neither works it is refused as `label-blocked`.
- **An edge with a step's badge** keeps its label beside it, since the badge rides the edge itself.
- **A label wraps to fit between edges** where it used to be refused.
  - With three labelled edges from one node to another, the middle label was refused as `label-blocked`.
  - It wraps onto two lines between its neighbours now.
  - With five such edges two labels are still refused.
- **The checks agree.** `text-crossing` already skipped a text's own edge.
  - The separate geometry check skips an edge that passes through the centre of a text it was drawn just before.
    - The patch breaks the edge there.
    - The check still counts every other edge.

## Not chosen

- A stylesheet option for beside or on.
  - The two pictures differ only in where a label sits, and neither needs to be picked by the agent ("Facts over coordinates").

## Consequences

Over the 329 saved drafts, pictures came out 2,216 px less wide in all with bends and crossings unchanged, and over 2,000 fuzz seeds `label-blocked` fell from 62 to 0.
