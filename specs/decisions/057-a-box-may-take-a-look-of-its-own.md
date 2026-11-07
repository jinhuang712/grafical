# 057. A box may take a look of its own

Decided: 2026-11-06

## The problem

A box's colors came with its kind, and the kind also sets its shape. On 2026-10-30 a "fixed" box had to be a cylinder and a "bug" box a dashed box only for their colors.

## The choice

A box takes its colors from the styles it marks. The shape stays the kind's.

## Not chosen

- Colors set on the box itself.
  - A team could not change one look in one place.
- More kinds.
  - A kind says what a box is and not how it looks.

## Consequences

Colors a style sets stay when the theme changes, so a dark theme may leave them wrong. A dark fill can hide the theme's dark text, and grafical does not judge that. A third value for the text may follow if pictures show the need.
