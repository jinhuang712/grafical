# 015. Edges that end at containers

Decided: 2026-10-11

## The problem

An arrow to each part of a system adds edges that say no more than one arrow to the system.

## The choice

An edge may end at a group, a layer or a lane, not only at a node. One arrow to "catalog-api" says that callers call that system, without saying which part, and it replaces an arrow to each member. The owner asked for this on 2026-10-11: an arrow may point to a set, a layer or a lane.

A container end is met at its top or bottom when the other end lies above or below all its layers, and at its side when the two share a layer.

## Not chosen

- Routing a container end to the node's border directly.
  - The router places ports and tracks around nodes.
  - A stand-in reuses all of that, including the label slots and the side exits.
- A label column for every band.
  - "Layers unseen, groups as systems" rejected one for every layer.
  - A band's label sits in its own head instead.
- Two lanes as the two ends of one edge.
  - Neighbouring lanes share a border, so the edge between them would have no length.

## Consequences

An edge to a band runs straight on into it from its earliest run that heads there, where that run is clear of every node, text, label and other edge.
