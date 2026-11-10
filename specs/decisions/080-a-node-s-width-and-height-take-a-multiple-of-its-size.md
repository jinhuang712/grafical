# 080. A node's width and height take a multiple of its size

Decided: 2026-11-10

## The problem

A node came in three sizes, and a strong model tuning a picture could not widen one node a little. A node has a shape, so one multiple does not mean the same for every type. Every node of a layer was drawn as tall as the tallest, so one taller node would have made the whole layer taller.

## The choice

- A node's `width` and `height` each take a multiple: 0.75, 1.25, 1.5 or 2.
  - It applies to the size the node would otherwise have, from its text or its `size`.
- Only the node named grows: the other nodes of its layer keep their shared height and sit centred in the taller layer.
- Both are attributes of a style, and so is `size`, so they are set on the node or in a style ("Every attribute of a style may be set on the object itself").
- A multiple set on a region reaches every node in it: the diagram, a layer, a group, a lane or a column.
  - A node's own value or its styles' beats a region's.
  - Among its regions the largest wins.
- A type with a fixed size, a dot or a `choice`, refuses a multiple set on it, and one from a style or a region leaves it as it is.

## Not chosen

- A size in pixels.
  - A multiple keeps to the sizes the theme sets ("Facts over coordinates").
- Any number.
  - Four values leave the agent little to weigh, and `--try` compares them quickly.
- One more attribute for both at once.
  - It repeats `width` and `height` together, and `size` already makes a node larger both ways.
- Every node of the layer as tall as the tallest.
  - The agent named one node, and growing them all would look like growing the layer.
- A height on the layer only.
  - The owner wants one node taller, and a layer's multiple reaches its nodes anyway.

## Consequences

A node taller than its neighbours brings back the look five of six judges named on 2026-10-13 ("Nodes sized to their text"), now only where the agent asks for it. A wider node widens its column in every layer. At 0.75 the text may no longer fit, which is refused as `overflow`. Each shape needs a rule for what a multiple does to it, such as how a cylinder's top or a diamond's corners follow, and those are chosen when it is built. Widths round to 8 px and heights to 4 px.
