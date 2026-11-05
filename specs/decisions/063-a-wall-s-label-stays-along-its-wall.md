# 063. A wall's label stays along its wall

Decided: 2026-10-17

Split on 2026-11-06 from specs/decisions, "The dirty work has edges".

## The problem

A wall's label with no room moved left of everything in a second layout or past the wall's ends, away from its wall.

## The choice

- **A wall's label with no room** along its wall no longer moves left of everything in a second layout ("Walls as space").
  - The write is refused.
  - Built on 2026-10-17 as `label-blocked` with `is=wall`.
  - It names the wall, then the lines and boxes within the label's clearance.
  - The places past the wall's ends went too.
    - For a wall across they were across the picture, and for a wall up and down above or below it.
    - There the label no longer sat on its own line, which grew to reach it.
  - The owner confirmed that on 2026-10-17.
  - No saved draft and no fixture has a labelled wall.
  - Over 2,000 fuzz seeds, 32 labels in 31 diagrams had no place along their wall and are now refused.
  - Bends, crossings and engine-owned defects are unchanged.
  - The pictures are 424 px narrower in all.

## Not chosen

- Keeping the fallback and reporting that it ran.
  - The label would no longer sit on its own line.

## Consequences

An agent meets `label-blocked` with `is=wall` and shortens the label or changes the facts around the wall.
