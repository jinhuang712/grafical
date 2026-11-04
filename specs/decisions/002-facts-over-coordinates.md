# 002. Facts over coordinates

Decided: 2026-10-11

## The problem

An agent must say where every box goes, but coordinates are the work models get wrong, and a free position would let one change move everything around it.

## The choice

An operation says which layer, which position in the layer, which group, what to align with, and what to connect. No operation takes an x, a y, a width or a bend point.

A node's place is its layer, its order within the layer, its group, and an optional alignment with a node in another layer. Its size is a size step, and the box has that step's fixed width and height. The diagram's spacing is a density. The theme maps each value to pixels.

## Not chosen

Coordinate operations, as offered by the draw.io and Excalidraw MCP servers. They move the hardest part of the work back to the model, which is exactly where the 2026-10-10 test failed.

- Free positions.
  - They make every diagram look different and give a weak model too many ways to be wrong.
  - Changed in part on 2026-10-14 by the owner's decision: a box may be placed by whole steps on the grid from another box ("Steps from another box").
- A general graph layout over a plain node and edge list, such as ELK layered or dagre.
  - Those compute positions globally, so adding one node can reorder others.
- Boxes that grow with their text.
  - A longer label would push every layer below it down.

## Consequences

An agent cannot nudge one box, and every new need for placement becomes a new fact, as columns and steps from another box later did.
