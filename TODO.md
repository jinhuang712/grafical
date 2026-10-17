# TODO

Small fixes and follow-ups with no milestone yet. An item moves to ROADMAP.md once it has one.

## A whole-diagram error points at the batch's last operation

Some errors are found only once the whole batch is applied, such as `align-same-layer` after a `node swap` that puts a box in its alignment target's row. They are reported with the index of the batch's last operation, so `error op=<n>` can name an operation that did nothing wrong. The fix test (`test/check/fixes.test.ts`) found one at fuzz seed 80. Reporting the operation that caused it needs the integrity checks to run after each operation, or to know which operation last touched what they name.

## Many writes in one process run the text measurer out of memory

`plan` in `src/cli/pipeline.ts` makes a new HarfBuzz measurer for every write. A command line makes one write per process, and `grafical view` keeps one measurer, so no user meets it; but a few thousand writes in one process end in `RuntimeError: memory access out of bounds`, as an audit of refusals did on 2026-10-17. Reusing one measurer, or freeing each, would let tools and tests call the write path in a loop.

## Pages read before a first write

DESIGN.md, "One entry page, help where it is used" names a risk: agents may not use the ways to draw the entry page lists, or may draft without opening a command's page. The harness counts grafical calls by outcome, but not which help pages an agent read before its first write. `bench lines` or the metrics should count each `--help` call (and `grafical help <command>`) before the first `apply` or edit, per draft, so the next paid round can say which pages agents read.

## A row's label is drawn twice

A row that is in a lane and is also the end of a line gets the lane's label and a band label of its own. The band label sits away from the band's top left: top right in one picture, the middle in another.

That place follows a rule: the label goes above the first stretch of its row with no box under it, so that no line into a box's top crosses it. Fixing this needs the owner's choice: drop a band's label when its row is a lane's only row, or only when the two texts match, or put the label at the band's top left and let lines pass it.

## Lines meet a diamond on a slanted side

When two lines share a side of a `decision` box, they meet its slanted edge instead of its corner. A flowchart's lines meet a diamond at the corners.

The router has no rule for diamonds: it spreads ports along a diamond's side as along a box's, and the line is cut where it meets the outline. Meeting the corners needs the owner's choice for a second line on a side: move it to the left or right corner, or join it to the first line before the corner, as a fan-in does.

## A fan-out splits at two heights

Three unlabelled lines from one box to three boxes in the row below split from their trunk at two heights, a small staircase, where an org chart draws one bar. Related to the staircase left unpunished in DESIGN.md, "Who chose is punished".

The split is on purpose: rule 4 of DESIGN.md, "A target picture with measured rules" says a trunk that runs straight on with branches on both sides meets them in a junction that reads as a crossing, so each side branches at its own height (`stagger` in `src/layout/route.ts`). One bar needs the owner to change that rule, for example where a junction dot marks the meeting.

## A step's badge across a lane's side

`check --all` counts a lane's side across a line's label as `text-crossing`, but not across a step's badge, and the badge's place does not keep off it (DESIGN.md, "Step badges ride the line"). The badge should keep off a lane's side as the label does, and `step-collision` should count one it touches.

## A line cut at a row lane's border has no room for its label

A line that ends at a lane running as a row is cut at the lane's border. When the line then runs only 16 px from the border to its box, and other lines crowd every place beside that stub and past its cut end, its label stays across the border. Fuzz seeds 1126, 1719 and 4951 of 5,000 show it. Fixing it needs the gutter to keep a label's height between the border and the box. Seed 3546 shows the same at a column lane's side: a numbered line turns 100 px before the border it ends at, and its label, widened by the step's badge, has no clear place beside it.

## A line from a group's top lays its label across another line

In fuzz seed 3558 of 5,000, the line w0 leaves group g0 by its top for a row lane. Its label sits beside the line's stub out of the box, 20 to 35 px below the line's run across the gutter, and the vertical part of another line in that gutter, n3->n28, runs through it (`label-collision`, `text-crossing`). It shows with g0's label at any stated place but `outside-top`, and since 2026-10-17 with the label seated by the engine too, whose no-go span above the first row had moved w0's port aside. The label's place below the run suggests the run moved after the label was placed, as a line cut at a lane's border is.
