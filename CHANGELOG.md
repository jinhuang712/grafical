# Changelog

What changed in each release of grafical, from the side of the agent that draws and the person who asks.

## Unreleased

grafical has not been released; the first release is 0.1.0 (ROADMAP.md, "Release 0.1.0").

- `node add` into a row that already has boxes, and `node move --layer`, need a place: `--first`, `--last`, `--before` or `--after`. Without one the write is refused as `missing-field`, with the row and its boxes. grafical no longer picks the slot.
- `layer tidy` and `diagram tidy` are removed. Compare orders with `grafical try` instead.
- Columns hold across rows: every box of a column now sits left of every box of the next column in any row, not only in its own row. A picture that uses columns may grow wider.
