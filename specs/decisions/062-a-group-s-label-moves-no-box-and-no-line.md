# 062. A group's label moves no box and no line

Decided: 2026-10-17

Split on 2026-11-06 from specs/decisions, "The dirty work has edges".

## The problem

The engine widened a group's box so that no line ran under a title, and the owner found the empty space it left.

## The choice

- **A crowded default title** no longer widens its box or moves two boxes apart ("Rows unseen, groups as systems").
  - Where no seat in the head keeps clear of the lines into the first row, the write is refused as `title-blocked`.
  - The agent then states a place.
  - Built on 2026-10-17.
  - The router no longer keeps lines off a label the engine seats either: it had pushed a line off its box's centre wherever the seat left the line no other room, which the owner did not choose when it was offered.
  - The engine now seats the label once the lines are drawn, at the leftmost seat none comes near.
  - The owner confirmed this on 2026-10-17 when shown its cost.
    - The two-zones fixture's private subnets had lines moved 16 px off their boxes' centres.
    - They now state their labels beside their rows, 176 px wider.
  - Over the 306 saved drafts, 58 of 396 group labels are now refused with at least one place clear for each.
    - They sit in 40 of the 183 drafts with groups.
    - For 13 the engine had moved boxes apart or grown a box.
    - For 45 it had pushed a line off its box's centre.
  - 72 drafts changed, with bends from 3,178 to 3,165 and crossings from 654 to 658.
  - Over 2,000 fuzz seeds, 338 changed.
    - One label has no place clear: a group around a single dot that lines enter from every side.

## Not chosen

- Keeping the fallback and reporting that it ran.
  - The empty space would stay in the picture.

## Consequences

An agent meets `title-blocked` and states a place.
