# 051. A label sits on its straight vertical line

Decided: 2026-10-30

Drawing two reference diagrams of a chat's alerts and a host's states, with a label on every line, the owner asked why a label never sits on its own line. The code only ever offered a label above or below a run, or beside a line that runs straight up and down, although "Labels by rule" said "on its own run"; no decision had rejected it. The labels already have a patch the colour of what lies behind them, drawn over the line, so a label on its line breaks the line, as a flowchart's labels do.

- **A new slot, `on`, for a straight vertical line:** the label is centred on the line, at the height the beside slot has. It is the first choice, ahead of beside, left of the line and right of it. Every rule that kept a label clear still holds: no other line, no group, lane or wall side and no box crosses it, and a label with no clear slot wraps, then tries another gutter, then is refused as `label-blocked`.
- **A line that turns has no `on` slot.** A label on a run that bends would lie across the bend, and the run is one the label sits above or below as before. A step's badge rides the line itself, so a line with a badge keeps its label beside it.
- **A label wraps to fit between lines,** where it used to be refused: with three lines from one box to another, each labelled, the middle label was refused as `label-blocked`; it wraps onto two lines between its neighbours now, and with five such lines two labels are still refused.
- **The checks agree.** `text-crossing` already skipped a text's own line. The separate geometry check (GOALS.md, "Mechanical defects") skips a line that passes through the centre of a text it was drawn just before, because the patch breaks it there, and it still counts every other line.

Rejected:
- A stylesheet option for beside or on. The two pictures differ only in where a label sits, and neither needs to be picked by the agent ("Facts over coordinates").
- On the line for runs that turn. The label would lie over a corner, where the line's direction changes under the patch.
