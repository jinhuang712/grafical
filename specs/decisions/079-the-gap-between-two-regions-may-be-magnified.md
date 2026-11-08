# 079. The gap between two regions may be magnified

Decided: 2026-11-06

## The problem

Two layers set close leave little room for labels, and only the density of the whole picture could change that. The owner holds that layers, groups and columns are all regions, and that a little air in one place solves a crowd in that place.

## The choice

Density stays the default for the whole picture. The gap between two neighbouring regions may take a multiple of that default, such as 1.25 or 1.5 or 2.

## Not chosen

- A size in pixels.
  - A multiple says how much more, and it follows the density and the theme.
- Levels for each gap, such as tight and wide.
  - They would repeat the density, and a level is too coarse to settle one crowd.
- A command for each kind of region.
  - All three are the same fact.
- Leaving spacing wholly to the engine.
  - That rule stopped an agent from settling a crowd it could see.

## Consequences

Positions are on a 4 px grid, so a multiple rounds to it.

Built on 2026-11-06:

- A multiple is 1.25, 1.5 or 2, and none falls below 1.
- The owner named the flag `--magnified`, the name of every multiple in grafical.
- The file holds a gap in a `<gap>` block, since groups and columns have no `<order>` of their own to hold a `gap` line.
