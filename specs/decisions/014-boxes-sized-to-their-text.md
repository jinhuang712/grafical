# 014. Boxes sized to their text

Decided: 2026-10-11

## The problem

An agent should not size boxes in pixels, yet every label must fit its box.

## The choice

A box given no size is fitted to its text (FEATURES.md, "Sizes"). The fit test is the checker's overflow rule ("Defects owned by who can fix them"), so such a box overflows only when its text does not fit the largest size either. The file stores no size for it, so the size is recomputed from the text on every layout ("Layout computed again on every change"): a rename that shortens the label shrinks the box again.

Since 2026-10-13 (phase 1e), every box of a row is drawn as tall as the row's tallest box, its width its own, so that the tops of a row line up: five of six judge verdicts on the private reference brief named one box taller than its neighbours. Dots and diamonds keep their shapes, and the size a node is fitted to does not change. A self-loop now runs two gutter rows below its box, since the box reaches the bottom of its row.

A diagram can turn fitting off (FEATURES.md, "Sizes"). The switch is a diagram fact in the file, because the file alone decides the picture ("Output and determinism").

This was added on 2026-10-11. In the three phase 1b drafts, text overflow was the most common reason grafical refused Haiku's first batch, which it refused in 46% of draft calls (first reported as 66%, which counted every read of the guide as a refusal). The fix it suggested was to remove the node and add it again larger.

## Not chosen

- Auto size choosing the small box for short text.
  - Boxes of three widths in one row look uneven, and the medium box is the target's grid.
- Storing the chosen size in the file.
  - A later rename could then not shrink the box, and the file would hold a value the engine derived.
- A setting outside the diagram file, such as a user config.
  - The same file would then draw differently on two machines.

## Consequences

A rename that shortens a label shrinks its box again, and text that fits no size is refused as `overflow`.
