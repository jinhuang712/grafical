# 018. Swimlanes run one way

Decided: 2026-10-11

## The problem

A diagram must show who owns what, and lanes that run both ways at once would leave a box's place unclear.

## The choice

A swimlane names who owns what. A diagram's lanes all run one way, as rows or as columns, and the way follows from what the members are: rows make lanes that run as rows, and boxes make lanes that run as columns. The way therefore cannot disagree with the members. A lane's members name it, as a group's do ("Rows unseen, groups as systems").

## Not chosen

- Rows and columns in one diagram, as a grid of lanes and phases.
  - It is the most expressive form and the most work, and no brief needs it yet.
- Listing members on the lane.
  - Every other membership in the file is named by the member, and `show` then prints it on the member's line.
- A setting for the way lanes run.
  - It would be one more fact that could disagree with the members.

## Consequences

As built, 2026-10-12: column lanes keep every row in lane order on every write and in layout, so that each lane takes a block of grid columns. Neighbouring lanes' contents, boxes included, keep 40 px apart, their shared border runs in the middle, and no vertical line runs within 8 px of a border. Row lanes share one header column on the left, as wide as the widest label up to 112 px, left of everything the rows hold. A line to a column lane never leaves its source by a side, because the lane's full-height border would cut a side exit to a stub. A box outside its lane, or inside a lane it is not in, is an engine-owned defect, `lane-stray`. The fuzz test gives lanes to half its diagrams. Since 2026-10-15 a lane's side is a line to labels too: the label of a line that crosses from one column lane into the next sits past their shared side, which then runs close to the first lane's content instead of in the middle; a label in a gutter keeps off every column lane's side, as it keeps off a group's; and a label moved off a route cut at a lane keeps off every lane's side where some place is clear of other lines, if need be just past the cut end, inside the lane the line leaves. Where no place is, it lay across the lane's border, an engine-owned `text-crossing`; since 2026-10-18 the write is refused as `label-blocked` ("The dirty work has edges").
