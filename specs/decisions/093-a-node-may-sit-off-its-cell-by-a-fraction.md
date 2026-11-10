# 093. A node may sit off its cell by a fraction

Decided: 2026-11-07

## The problem

Every node sits in a cell of one column grid, and steps move a node only by whole cells. A picture drawn on 2026-11-07 to leave the grid with the commands there are stayed on it, and the owner called it rigid. Layers and columns stay, as bands whose nodes line up by default.

## The choice

A picture keeps its grid, and every node snaps to its cell unless the agent states otherwise on the command line. An agent may take one node off its cell with a fraction of a cell, stated against the grid, such as half a cell to the right. The fraction is 0.25, 0.5 or 0.75, across and down at once if the agent wants, so a node may sit off on a diagonal. The offset is measured from the grid and never from a node. No other node moves for it, and an offset that overlaps anything refuses the write.

## Not chosen

- The engine leaves the grid by default, so a node follows what it connects to.
  - The engine would choose for the agent, and every picture would change.
- A layer whose nodes leave the grid together.
  - The owner wants one node taken out of its band.
- Steps that take a fraction.
  - Their base is another node, and the owner's base is the grid.
- Words such as "between".
  - Columns and steps were kept in place of them, and a word says no distance.
- Widening the grid so that a neighbour stands clear.
  - A node nobody named would move, and an overlap is the agent's to settle.
- Pixels.
  - Nobody places anything by the pixel.

## Consequences

The router runs edges through the gaps between nodes, so an offset changes the gaps it finds. A spike on 2026-11-07 held across and failed down, where edges ran through nodes in a gutter. It is not built, and it waits for the talk on routing.

In a full layer a node has only the gap beside it, so a large offset there is refused until the agent makes room, with a style's margin or by leaving a cell empty.
