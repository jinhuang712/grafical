# 046. A row's label is optional

Decided: 2026-10-18

## The problem

Decided by the owner on 2026-10-18, with "A row with a look is drawn". A row is unseen by default, and its name shows only when the row is drawn, so a name is a thing a drawn row may have, not a fact every row owes. `layer add` takes `--label` or not; a file's row without `label` reads and writes back without one (FEATURES.md, "Rows and order").

## The choice

- **Drawn without a name.** A drawn row with no label draws no name.
  - A bar is an empty bar.
  - A band has a head's padding but no text, so its boxes keep the room they had.
  - A line meets either as it meets a named one.
- **Nothing takes a label away.** No operation removes a row's label; `layer rename` sets one.
  - A row made without one keeps none until renamed.
- **Where a missing label is read.**
  - The file reader and writer.
  - The batch line: `layer.add` shows only `id`.
  - `show`, the layout and the picture.
  - The checks that place text.
  - A row with no label has no text for them to place.
- **Measured.** No saved draft, fixture or fuzz seed gives a row no label.
  - So no picture changed.

How a band or a bar takes its room is in [placement](../placement.md#bands-bars-and-walls).

## Not chosen

- Keeping `label` required.
  - An agent that wants a row only to place boxes must invent a name nobody sees, and one that wants a bare gateway bar must give it text.
- Every row's name drawn at the left of its row, so that a label always shows.
  - "A row with a look is drawn" rejected it.

## Consequences

A file whose rows have labels reads and writes back the same. A drawn row with no label shows no name.
