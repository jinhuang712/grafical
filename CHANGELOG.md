# Changelog

What changed in each release of grafical, from the side of the agent that draws and the person who asks.

## Unreleased

grafical has not been released; the first release is 0.1.0 (ROADMAP.md, "Release 0.1.0").

- `node add` into a row that already has boxes, and `node move --layer`, need a place: `--first`, `--last`, `--before` or `--after`. Without one the write is refused as `missing-field`, with the row and its boxes. grafical no longer picks the slot.
- `layer tidy` and `diagram tidy` are removed. Compare orders with `grafical try` instead.
- The legend says only what the agent named: line styles and widths lose their default words ("call or read", "message", "optional", "related", "main path"), and a diagram that names nothing draws no legend. `show --drawn` prints a `legend` record with `text=-` for each style and width left unnamed, with the `weight` to name it by. `diagram legend --hide` is removed; an old file's `false` is read as no words.
- A line between neighbouring rows runs straight when the lower box's other ports, or a group label above it, push its lower end off the upper one: the upper end moves to meet it, where nothing else in the gutter runs across.
- A line's label no longer lies across the border of a group box, and `check --all` reports one that does as `text-crossing`, naming the group and the line.
- Columns hold across rows: every box of a column now sits left of every box of the next column in any row, not only in its own row. A picture that uses columns may grow wider.
