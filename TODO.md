# TODO

Small fixes and follow-ups with no milestone yet. An item moves to ROADMAP.md once it has one.

## The legend says only what the agent named

Drop the default words for line styles and widths, draw no legend when the agent names nothing, and print a `legend` record with `text=-` in `show --drawn` for each style and width left unnamed (DESIGN.md, "The legend says only what the agent named").

## Columns hold across rows

Keep every box of a column left of every box of the next column across all rows, not only within each row (DESIGN.md, "Columns hold across rows"). The smallest failing case: two rows, `a` in the first column and `b` in the second, drawn at the same x.
