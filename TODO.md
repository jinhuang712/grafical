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

## A line between two boxes of one row always runs under the row

A line between two boxes of one row that are not neighbours always takes the gutter below the row (`uturn` in `src/layout/route.ts`), even when the gutter above crosses fewer lines. Tried on 2026-10-16: taking the side whose boxes between the two ends meet fewer other lines cut crossings over the 306 saved drafts from 676 to 651 in 9 drafts, and over 2,000 fuzz seeds by 5.7%. It is not built, because the gutter above a row does not know the heads of the groups that start in the row: a line came down through a group's label, and labels landed across a group's border (fuzz seeds 27 and 88). Restricted to unlabelled lines under no group label, it still added 15 `needless-bend` and 10 `wall-crossed` over 2,000 seeds, and the second is the agent's defect: the write would be refused for the engine's choice. Building it needs the gutter above a row to treat the group heads and walls in it as it treats them below.
