# 057. A box may take a look of its own

Decided: 2026-11-06

Replaced in part by specs/decisions, "A style may be as rich as it likes": a box takes its colors from the styles it marks.

## The problem

A box's colors came with its kind, and the kind also sets its shape. On 2026-10-30 a "fixed" box had to be a cylinder and a "bug" box a dashed box only for their colors.

## The choice

A box may take colors in two ways: a fill and a border set on the box, or the name of a look in the stylesheet. A box holds one of the two, and the last one set clears the other. The shape stays the kind's. A line's weight already works this way, as a width or a named level.

## Not chosen

- Only colors on the box.
  - A team could not change one look in one place.
- Only named looks.
  - An agent would have to write a second file before it could color one box.
- More kinds.
  - A kind says what a box is and not how it looks.
- A named look with colors on top.
  - A box would need a rule for which color wins.

## Consequences

Colors set on a box stay when the theme changes, so a dark theme may leave them wrong. A dark fill can hide the theme's dark text, and grafical does not judge that. A third value for the text may follow if pictures show the need.
