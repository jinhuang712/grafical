# TODO

Small fixes and follow-ups with no milestone yet. An item moves to ROADMAP.md once it has one.

## A line between neighbouring rows bends for no reason

`test/fixtures/two-zones.grafical.yaml`: `check --all` reports `defect code=needless-bend owner=engine elements=web-b->nat-b count=2`. The top side of `web-b` also takes the line from `alb`. Its test in `test/check/bends.test.ts` is marked to fail until the line runs straight.

## A row's label is drawn twice

A row that is in a lane and is also the end of a line gets the lane's label and a band label of its own. The band label sits away from the band's top left: top right in one picture, the middle in another.

## A line label lies across a group's border

A line from a box inside a group to a box outside it can have its label drawn across the group's border. Seen twice in a C4 container diagram, on lines leaving the system's group to the right. The checker does not report it.

## Lines meet a diamond on a slanted side

When two lines share a side of a `decision` box, they meet its slanted edge instead of its corner. A flowchart's lines meet a diamond at the corners.

## A fan-out splits at two heights

Three unlabelled lines from one box to three boxes in the row below split from their trunk at two heights, a small staircase, where an org chart draws one bar. Related to the staircase left unpunished in DESIGN.md, "Who chose is punished".
