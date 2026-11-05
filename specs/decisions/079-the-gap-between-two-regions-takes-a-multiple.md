# 079. The gap between two regions takes a multiple

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

The range of a multiple, and whether it may fall below 1, is chosen when it is built. Positions are on a 4 px grid, so a multiple rounds to it.
