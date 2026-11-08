# 031. Steps from another node

Decided: 2026-10-14

## The problem

Asked for by the owner on 2026-10-14: "a box that can belong to no row / column meaning no grid is allowed", then "we still want a free-er feature", and "why i bring in the free placement or relative placement is to avoid the row/column contraint!". Of the ways shown that day, the owner chose steps from another node: "this moves it away from the grid but keeps it kinda predictable". The owner also settled who chooses how far: the agent, because "grafical is not responsible for taste, graph correctness and clearness. grafical is a engine only to do the dirty work."

## The choice

- **What a step is.** One cell of the column grid ("Layout computed again on every change"): a layer down or up, a column left or right.
  - A layer passed on the way stays empty, a medium node high.
  - Each step across keeps at least a medium node and a gap between the two columns, so that two steps never look like one.
- **What the engine does.** The node sits in its cell and moves with the node it steps from.
  - The nodes of a layer it lands in keep their order and stand aside, as the column grid puts them before the node arrives.
  - Edges route as they do between any nodes.
  - Nothing else is chosen for the agent: a step that puts the node where it reads badly is the agent's to change.

A prototype on the public brief's draft (`bench/runs/p1d-help3`) freed its seven dependency nodes, from 27 bends, 824 px wide and 1008 px high:
- placed by the engine just below the node that uses each: 29 bends, 1336 px wide;
- placed by the engine below everything that node connects to: 17 bends, 1136 px wide and 912 px high;
- placed one step down from the node that uses each: 20 bends and 1640 px wide and 752 px high, with the seven sharing the topics' layer.
  - Two steps would have given the second picture: the right step depends on the rest of the diagram, and it is the agent's to choose.

## Not chosen

- A free node that the engine places, below what it connects to.
  - It drew best in the prototype, but the engine would choose the layer.
- A side without a distance ("below catalog-sync"), the engine choosing how far.
  - The same reason.
- Layers counted from another node ("2 rows below catalog-sync"), joining that layer's list.
  - It keeps the layer the owner wants a node free of.
- A cell on one grid for the whole picture (`--at 4,2`).
  - Nothing ties the node to the node it belongs with, so it does not move with it.
- Steps in pixels.
  - The gap router ("Our own gap router") runs edges through the gaps between layers and between nodes, so every node sits in a cell of the grid.

## Consequences

This changes "Facts over coordinates" in part, which rejected free positions: a step is a small whole number on the grid, a fact like a layer, not a coordinate.
