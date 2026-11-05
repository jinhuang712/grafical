# 029. Walls as space

Decided: 2026-10-14

## The problem

Decided by the owner on 2026-10-14. On 2026-10-13 the owner asked for "breaks" and "invisible walls that anything cannot be put into", and chose "dividers and walls" for phase 1e. Shown a wall drawn as a line with gates, the owner answered "walls can have thickness", then "a space! not a layer, not a line, not a thick line", that it "doesn't have to be entirely across the whole image, could be partial", and that lines cross it "only when the wall allows". The model below was then approved as shown.

## The choice

A wall is empty space between two named sides. The agent names what it separates. Which way the wall runs, how long it is and how thick are the engine's. A wall with a label draws a dashed divider through its middle, so dividers are walls with labels, not a second fact.

Lines cross a wall only where it allows, and its label must stay readable:
- A line between the sides is refused before layout unless the wall allows it.
  - Any other line whose route passes through the wall's space is an agent-owned defect, since the boxes the agent placed lead it there.
- A wall's label with no place along its wall is refused, since 2026-10-17 ("A wall's label stays along its wall").
- Walls across were built first on 2026-10-14, and walls up and down the same day.

## Not chosen

- A line between two rows, with gates.
  - The owner: a wall is "a space", "not a line".
- A row drawn as a band, whose boxes are the gates.
  - The owner: "not a layer".
- A thick line.
  - The owner: "not a thick line".
- A wall across the whole picture only.
  - The owner: "could be partial".
- Lines that cross freely, and a sealed wall.
  - The owner: lines cross "only when the wall allows".
- A wall placed by coordinates or by size.
  - Where it goes and how thick it is are the engine's ("Facts over coordinates").
- Rerouting a line round a wall.
  - Routing round a partial obstacle is left for later.

## Consequences

A wall's label takes the first place no crossing line comes near, and a wall with no such place is refused as `label-blocked`.
