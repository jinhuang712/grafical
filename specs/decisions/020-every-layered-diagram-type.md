# 020. Every layered diagram type

Decided: 2026-10-12

- Replaced in part by specs/decisions, "The help as the reference": the guides' lessons moved into the help.
- Replaced in part by specs/decisions, "An optional type sets the diagram's space": a type sets the space.

## The problem

Decided by the owner on 2026-10-12: C4 context and container diagrams, cloud and infrastructure, event flow, flowcharts, state machines, swimlane processes, dependency graphs, data flow and deployment.

## The choice

- **Kinds.** Five new kinds give the shapes these types need.
  - They are a state and a decision and a terminal and the start and end dots of a state machine.
  - The other types need no new shape.
  - Shape, text room and line ends live in one module: `src/theme/shapes.ts`.
  - Layout, the checker and the renderer share it.
  - A diamond holds text only in its middle: a padded block of width tw and height th fits when tw/w + th/h <= 1, so its box per size step is larger than a plain box's.
  - A dot is one size whatever its size step.
  - A size on a dot is ignored rather than refused, so that a batch that sizes every box still applies.
- **Nested groups.** A group may sit inside another up to three levels deep, as a region holds a network that holds hosts.
  - This reverses part of "Rows unseen, groups as systems".
  - A group's members are its own boxes and its inner groups' boxes, for every rule that asks who is in it.
    - Those rules are its block in each row and the boxes a line to it reaches and its lane and which boxes may lie inside its box.
  - The owner chose alternating fills as the default, and asked for shades as a stylesheet choice.
  - The fuzz test nests groups in about a quarter of its diagrams.
  - It found that a line into a row under stacked heads crossed a label.
  - Labels were then seated outer first, and an inner label left the lines room past the outer ones.
  - Since 2026-10-17 a label is seated after the lines are drawn ("The dirty work has edges").
- **Teaching.** At first `grafical guide <type>` taught each type.
  - Reversed the same day by "The help as the reference": the guides' lessons moved into the help.

## Not chosen

For stage 1:

- Sequence diagrams or entity-relationship and class diagrams or mind maps or timelines.
  - Each needs a layout family of its own, and the core diagram has not yet met the MVP bar.
- A setting for the diagram's type.
  - The kinds already say what is drawn.
  - Reversed in part on 2026-10-19 by "An optional type sets the diagram's space": a type sets the space, which no kind says.

## Consequences

Each new type needs only shapes, kept in one module. Types that need a layout of their own, such as sequence diagrams, wait.
