# 106. Styles set spacing as CSS does, and a later style wins

Decided: 2026-11-10

## The problem

A density set all spacing in three levels, a gap took a multiple only between two neighbouring regions, and the values sat in the code. Marking one more style on many objects dropped the styles they had. `--style` also named a stylesheet.

## The choice

- A style holds a margin for each side: `margin-top` · `margin-right` · `margin-bottom` · `margin-left`.
- The diagram's style also holds `row-gap` and `column-gap`.
- Each is in pixels on the 4 px grid.
- Every region marks styles as a node and an edge do.
- `--style` marks styles in four forms:
  - `a,b` marks exactly these.
  - `+a` adds one.
  - `-a` takes one away.
  - `-` clears them.
- Where two styles say the same thing, the one later in the file wins.
- `--stylesheet` names a stylesheet.
- Density and `gap` go, and `default` holds today's spacing.

## Not chosen

- One multiple for the whole picture.
  - It is a density under another name.
- One margin for all four sides.
  - One fact would have two spellings.
- The order of marking decides.
  - Adding one style would need a place in each list.

## Consequences

- A team's spacing lives in its stylesheet, and one diagram's in a style it marks.
- A margin on a node widens its column in every layer.
- Once built, it replaces "The gap between two regions may be magnified" and the order rule of "A style may be as rich as it likes".
