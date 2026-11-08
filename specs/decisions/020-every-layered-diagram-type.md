# 020. Every layered diagram type

Decided: 2026-10-12

## The problem

Decided by the owner on 2026-10-12: C4 context and container diagrams, cloud and infrastructure, event flow, flowcharts, state machines, lane processes, dependency graphs, data flow and deployment.

## The choice

- **Node types.** Five new node types give the shapes these diagram types need.
  - They are a state and a decision and a terminal and the start and end dots of a state machine.
  - The other diagram types need no new shape.
  - Shape, text room and edge ends live in one module: `src/theme/shapes.ts`.
  - Layout, the checker and the renderer share it.
  - A diamond holds text only in its middle: a padded block of width tw and height th fits when tw/w + th/h <= 1, so its node per size step is larger than a plain node's.
  - A dot is one size whatever its size step.
  - A size on a dot is ignored rather than refused, so that a batch that sizes every node still applies.
- **Nested groups.** A group may sit inside another up to three levels deep, as a region holds a network that holds hosts.
  - This reverses part of "Layers unseen, groups as systems".
  - A group's members are its own nodes and its inner groups' nodes, for every rule that asks who is in it.
    - Those rules are its block in each layer and the nodes an edge to it reaches and its lane and which nodes may lie inside its frame.
  - The owner chose alternating fills as the default, and asked for shades as a stylesheet choice.
  - The fuzz test nests groups in about a quarter of its diagrams.
  - It found that an edge into a layer under stacked heads crossed a label.
  - Labels were then seated outer first, and an inner label left the edges room past the outer ones.

## Not chosen

For stage 1:

- Sequence diagrams or entity-relationship and class diagrams or mind maps or timelines.
  - Each needs a layout family of its own, and the core diagram has not yet met the MVP bar.

## Consequences

Each new type needs only shapes, kept in one module. Types that need a layout of their own, such as sequence diagrams, wait.
