# 077. A line meets a diamond at a corner

Decided: 2026-11-06

## The problem

With `decision` ports kept to the middle 32 px of a diamond's top and bottom, a line still met the slanted edge a few px inside the corner. A try on 2026-10-30 moved 201 of 500 fuzz diagrams, with 113 more bends and 32 more crossings, and it did not land.

## The choice

A line meets a diamond only at one of its four corners. Lines that come to one side join before the corner, as a fan-in does. The owner would also take lines that go to different corners, and joining is chosen as the simpler rule.

## Not chosen

- Leaving it, since `choice` already draws every line at a corner.
  - The owner holds that a line leaves no slanted edge.
- Keeping ports to the middle of a side.
  - That was the try that did not land.

## Consequences

How many bends and crossings joining costs is not measured, and the numbers above are from another way. Lines that join can no longer be told apart at the diamond.
