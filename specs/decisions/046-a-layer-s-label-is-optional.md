# 046. A layer's label is optional

Decided: 2026-10-18

## The problem

Decided by the owner on 2026-10-18, with "A layer with a look is drawn". A layer is unseen by default, and its name shows only when the layer is drawn, so a name is a thing a drawn layer may have, not a fact every layer owes. `layer --add` takes `--label` or not; a file's layer without `label` reads and writes back without one.

## The choice

- **Drawn without a name.** A drawn layer with no label draws no name.
  - A bar is an empty bar.
  - A band has a head's padding but no text, so its nodes keep the room they had.
  - An edge meets either as it meets a named one.
- **Nothing takes a label away.** No operation removes a layer's label; `layer --label` sets one.
  - A layer made without one keeps none until renamed.
- **Where a missing label is read.**
  - The file reader and writer.
  - The batch line: `layer.add` shows only `id`.
  - `show`, the layout and the picture.
  - The checks that place text.
  - A layer with no label has no text for them to place.
- **Measured.** No saved draft, fixture or fuzz seed gives a layer no label.
  - So no picture changed.

## Not chosen

- Keeping `label` required.
  - An agent that wants a layer only to place nodes must invent a name nobody sees, and one that wants a bare gateway bar must give it text.
- Every layer's name drawn at the left of its layer, so that a label always shows.
  - "A layer with a look is drawn" rejected it.

## Consequences

A file whose layers have labels reads and writes back the same. A drawn layer with no label shows no name.
