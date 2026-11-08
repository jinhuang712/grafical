# 057. A node may take a look of its own

Decided: 2026-11-06

## The problem

A node's colors came with its type, and the type also sets its shape. On 2026-10-30 a "fixed" node had to be a cylinder and a "bug" node a dashed node only for their colors.

## The choice

A node takes its colors from the styles it marks. The shape stays the type's.

## Not chosen

- Colors set on the node itself.
  - A team could not change one look in one place.
- More types.
  - A type says what a node is and not how it looks.

## Consequences

Colors a style sets stay when the theme changes, so a dark theme may leave them wrong. A dark fill can hide the theme's dark text, and grafical does not judge that. A third value for the text may follow if pictures show the need.
