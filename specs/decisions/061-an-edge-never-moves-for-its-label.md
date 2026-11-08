# 061. An edge never moves for its label

Decided: 2026-10-17

## The problem

An edge's label with no room made its edge step out of the crowd, a detour nobody asked for.

## The choice

- **An edge's label with no room** along its path no longer makes its edge step out of the crowd ("Our own gap router", detours).
  - The write is refused and names the edge.
  - The agent shortens the label, drops it or changes layers.
  - Built on 2026-10-17 as `label-blocked`, for a step's badge too.
    - The label takes the slot that costs least on its longest run.
    - The refusal names the edge, then the edges and borders across the label.
    - It names the gutters it tried as `gutters`, each `<row above>/<row below>`.
  - A label across an edge is then the agent's, and no longer an engine-owned `text-crossing` or `label-collision`.
  - Shown three labelled edges between two medium nodes on 2026-10-17, the owner found them crowded.
    - The owner asked whether the node should grow.
    - At the large size of the node they leave, all three labels fit.
  - The owner chose that the agent widens it and never the engine, and `next` names the command.
  - None of the 306 saved drafts and none of the fixtures had such a label, so none changed.
  - Over 2,000 fuzz seeds generated as before, 455 diagrams had one with 1,198 edges in all and are now refused.
  - Laid out by both engines:
    - Bends went from 149,848 to 146,678 and crossings from 185,131 to 170,143.
    - Height went down 4.1%.
    - The engine-owned `needless-bend` went from 845 to 514.
  - The fuzz generator now shortens or drops such a label, as an agent does.
  - Since 2026-10-18 the same holds for a label moved off an edge cut at a container ("Edges that end at containers") that finds no place beside what is left of the edge clear of the other edges and the sides of lanes.
  - It had been drawn across a lane's border, where an edge from a layer lane to the next layer keeps only a 16 px stub.
  - The fuzz test found it in 3 of 5,000 seeds.

## Not chosen

- The engine growing a node with no stated size to the size its edges' labels need, as it sizes one to its text.
  - Offered on 2026-10-17 for an edge's label with no room; the owner chose that the agent widens it, and no refusal writes the command.

## Consequences

An agent meets `label-blocked` and shortens the label, drops it, widens a node or changes layers.
