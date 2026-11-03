# 045. A row with a look is drawn

Decided: 2026-10-18

## The problem

Decided by the owner on 2026-10-18 (behavior: FEATURES.md, "Rows and order"). In round p1g (bench/results/p1g-stage1.md), 8 of the 49 chains' reflections said the names they gave rows never appeared in the picture. A row was drawn only when a line ended at it ("Rows unseen, groups as systems", "Lines that end at containers"), and `layer look` chose only between a box and a band for such a row, so an agent had no way to show one. The owner's rule: unseen is the default, not always. A row with something visible is drawn; a row with nothing visible is not.

## The choice

- **When a row is drawn.** When a line ends at it, as before, or when the agent gives it a look with `layer look <row> box|band`. A row with neither is not drawn, so a diagram with no look draws as it did, byte for byte.
- **How it is drawn.** As a row a line ends at: one with boxes as a band around them, its name in the band's head; one with no boxes as one bar, its name in it ("A row with no box as one bar"). The look chooses a box's paint or the band's.
- **A bar for its look alone.** A row with no boxes and a look is a bar like one a line ends at, and is checked as one. A line that passes it is refused as `bar-crossed` unless `edge pass` lets it, since "A row with no box as one bar" refused a gateway drawn under lines that run over it without saying so. A bar between the first and last rows of a group is refused as `bar-in-group` on the row's look, and `layer look`, which takes the look away, is among the commands that can change it ("Refusals say what happened and which commands can change it").
- **Measured.** None of the 329 saved drafts and none of the 17 fixtures sets a look, and none changed; neither did any of 2,000 fuzz seeds. The fuzz test now gives a row with boxes a look in two seeds of ten, and adds a bar with a look and no line in one, on a stream of its own. With it, 480 of 2,000 seeds changed: bends rose from 146,792 to 146,820 and crossings fell from 166,128 to 166,095, with no engine-owned defect added. The most bends came from a band's name in its head, where no line runs down (seed 919, 15 more); the most crossings from a bar between two rows (seed 795, 15 more). The fixture clinic-rows draws an undrawn row, a bar a line ends at, and a band and a bar drawn for their looks alone.

## Not chosen

- Every row's name drawn at the left of its row. "Rows unseen, groups as systems" rejected a label column for every row: it frames the picture by row and takes a column of width. It would also change every picture, where a look changes only the rows the agent wants seen.
- A look that counts only once a line ends at the row, as until now. The agent who names a row and wants it seen has no way to say so.

## Consequences

Changed the same day ("A row's label is optional"): `label` is no longer required on `layer add`.
