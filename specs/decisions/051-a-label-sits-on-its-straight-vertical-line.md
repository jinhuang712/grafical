# 051. A label sits on its straight vertical line

Decided: 2026-10-30

## The problem

Drawing two reference diagrams of a chat's alerts and a host's states, with a label on every line, the owner asked why a label never sits on its own line. The code only ever offered a label above or below a run, or beside a line that runs straight up and down, although a label was meant to sit on its own run; no decision had rejected it. The labels already have a patch the colour of what lies behind them, drawn over the line, so a label on its line breaks the line, as a flowchart's labels do.

## The choice

- **A new slot, `on`, for a straight vertical line:** the label is centred on the line at the height the beside slot has.
  - It is the first choice, ahead of beside the line on its left and on its right.
  - Every rule that kept a label clear still holds.
    - No other line crosses it, and no box or side of a group, lane or wall.
    - A label with no clear slot wraps first and then tries another gutter.
    - When neither works it is refused as `label-blocked`.
- **A line that turns has no `on` slot.** A label on a run that bends would lie across the bend, and the run is one the label sits above or below as before.
  - A step's badge rides the line itself, so a line with a badge keeps its label beside it.
- **A label wraps to fit between lines** where it used to be refused.
  - With three labelled lines from one box to another, the middle label was refused as `label-blocked`.
  - It wraps onto two lines between its neighbours now.
  - With five such lines two labels are still refused.
- **The checks agree.** `text-crossing` already skipped a text's own line.
  - The separate geometry check skips a line that passes through the centre of a text it was drawn just before.
    - The patch breaks the line there.
    - The check still counts every other line.

## Not chosen

- A stylesheet option for beside or on.
  - The two pictures differ only in where a label sits, and neither needs to be picked by the agent ("Facts over coordinates").
- On the line for runs that turn.
  - The label would lie over a corner, where the line's direction changes under the patch.

## Consequences

Over the 329 saved drafts, pictures came out 2,216 px less wide in all with bends and crossings unchanged, and over 2,000 fuzz seeds `label-blocked` fell from 62 to 0.
