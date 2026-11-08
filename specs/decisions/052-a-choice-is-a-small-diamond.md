# 052. A choice is a small diamond

Decided: 2026-10-30

## The problem

Decided by the owner on 2026-10-30, after two reference diagrams: a chat's alerts, where one question splits into five answers at a small grey diamond that holds no text, the question written on the edge into it. A `decision` with an empty label drew a diamond 136 px wide, because its node is sized for text.

## The choice

- **A new type, `choice`:** a diamond 28 px across in one size whatever the step.
  - Its label is kept in the file and not drawn, as `initial` and `final` are.
  - The question is the label of the edge into it and each answer the label of an edge out; the answers are drawn as the edges of any node are, from its sides.
- **It behaves as a dot for layout:**
  - One size.
  - A port at its centre or spread over its side.
  - No mark at its left and no text to fit.
  - Edges meet its outline where a diamond's sides slant in, as at a `decision`.
- **A `decision` is unchanged:** a question with words inside, as a flowchart draws it.

## Not chosen

- A `decision` that shrinks when its label is empty.
  - The engine would pick the shape from a hidden condition, and the agent could not tell from the file which it would get ("Facts over coordinates").
- A small size step for `decision`.
  - A diamond that small holds no text, so the step would only invite an overflow.

## Consequences

No saved diagram uses it, so nothing drawn before changes. The question moves onto the edge into the diamond.
