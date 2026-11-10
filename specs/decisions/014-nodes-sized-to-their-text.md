# 014. Nodes sized to their text

Decided: 2026-10-11

## The problem

An agent should not size nodes in pixels, yet every label must fit its node.

## The choice

A node given no size is fitted to its text. The fit test is the checker's overflow rule ("Defects owned by who can fix them"), so such a node overflows only when its text does not fit the largest size either. The file stores no size for it, so the size is recomputed from the text on every layout ("Layout computed again on every change"): a rename that shortens the label shrinks the node again.

Since 2026-10-13 (phase 1e), every node of a layer is drawn as tall as the layer's tallest node, its width its own, so that the tops of a layer line up: five of six judge verdicts on the private reference brief named one node taller than its neighbours. Dots and diamonds keep their shapes, and the size a node is fitted to does not change. A self-loop now runs two gutter layers below its node, since the node reaches the bottom of its layer.

A diagram can turn fitting off. The switch is a diagram fact in the file, because the file alone decides the picture.

This was added on 2026-10-11. In the three phase 1b drafts, text overflow was the most common reason grafical refused Haiku's first draft, which it refused in 46% of draft calls (first reported as 66%, which counted every read of the guide as a refusal). The fix it suggested was to remove the node and add it again larger.

## Not chosen

- Auto size choosing the small node for short text.
  - Nodes of three widths in one layer look uneven, and the medium node is the target's grid.
- Storing the chosen size in the file.
  - A later rename could then not shrink the node, and the file would hold a value the engine derived.
- A setting outside the diagram file, such as a user config.
  - The same file would then draw differently on two machines.

## Consequences

A rename that shortens a label shrinks its node again, and text that fits no size is refused as `overflow`.
