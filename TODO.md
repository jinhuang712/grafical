# TODO

Small fixes and follow-ups with no milestone yet. An item moves to ROADMAP.md once it has one.

## A row's label is drawn twice

A row that is in a lane and is also the end of a line gets the lane's label and a band label of its own. The band label sits away from the band's top left: top right in one picture, the middle in another.

That place follows a rule: the label goes above the first stretch of its row with no box under it, so that no line into a box's top crosses it. Fixing this needs the owner's choice: drop a band's label when its row is a lane's only row, or only when the two texts match, or put the label at the band's top left and let lines pass it.

## Lines meet a diamond on a slanted side

When two lines share a side of a `decision` box, they meet its slanted edge instead of its corner. A flowchart's lines meet a diamond at the corners.

The router has no rule for diamonds: it spreads ports along a diamond's side as along a box's, and the line is cut where it meets the outline. Meeting the corners needs the owner's choice for a second line on a side: move it to the left or right corner, or join it to the first line before the corner, as a fan-in does.

## A fan-out splits at two heights

Three unlabelled lines from one box to three boxes in the row below split from their trunk at two heights, a small staircase, where an org chart draws one bar. Related to the staircase left unpunished in DESIGN.md, "Who chose is punished".

The split is on purpose: rule 4 of DESIGN.md, "A target picture with measured rules" says a trunk that runs straight on with branches on both sides meets them in a junction that reads as a crossing, so each side branches at its own height (`stagger` in `src/layout/route.ts`). One bar needs the owner to change that rule, for example where a junction dot marks the meeting.

## Labels across a band's or a lane's border

`check --all` counts a group's border as a line across an edge's label, but not a band's or a lane's. A label moved beside a line cut at a container already keeps off band borders. The checker should count them too, and the gutters keep labels off them.

## Command-line errors from the parser are sentences

An unknown option, a missing argument and an unknown command print the parser's own sentence, such as `error: unknown option '--bogus'`, with exit code 2, instead of an `error code=` record (DESIGN.md, "Records over prose").
