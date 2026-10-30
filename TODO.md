# TODO

Small fixes and follow-ups with no milestone yet. An item moves to ROADMAP.md once it has one.

## Many writes in one process run the text measurer out of memory

`plan` in `src/cli/pipeline.ts` makes a new HarfBuzz measurer for every write. A command line makes one write per process, and `grafical view` keeps one measurer, so no user meets it; but a few thousand writes in one process end in `RuntimeError: memory access out of bounds`, as an audit of refusals did on 2026-10-17. Reusing one measurer, or freeing each, would let tools and tests call the write path in a loop.

## Pages read before a first write

DESIGN.md, "One entry page, help where it is used" names a risk: agents may not use the ways to draw the entry page lists, or may draft without opening a command's page. The harness counts grafical calls by outcome, but not which help pages an agent read before its first write. `bench lines` or the metrics should count each `--help` call, each `unknown-command` refusal and each `grafical guide [<name>]` before the first `apply` or edit, per draft, so the next paid round can say which pages and guides agents read.

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

## Usage errors ignore --json

A command line grafical cannot read, such as `grafical show d.grafical.yaml --bogus --json`, prints its block as text on standard error, where every other refusal with `--json` prints JSON on standard output. An agent that asked for JSON gets text it did not ask for.

## No blank line before a refused batch in try

`try` with several batches prints an accepted batch's `delta` record and then the next batch's `failed batch=<file> changed=-` on the next line, where every other outcome line has a blank line before the blocks that follow. The records still read, but the blocks of one refusal are harder to tell apart from the records of the batch before.

## check says ok for a file every write refuses

A file that the diagram's own checks refuse, such as a group split around a box in one row, loads, and `check` prints `ok` with its warnings and counts: `check` reports defects and warnings, not the whole diagram's errors. Every write is then refused with that error, `already in the file`. `check` should report them, as a write does.

## A box's color and shape come with its kind

An agent that wants a green box, a red box and a blue box has no way to say so: a stylesheet sets the fill per kind (`paint.node.kinds`), and a kind also sets the shape. Redrawing two published state and flow diagrams on 2026-10-30, a "fixed" box had to be a `store`, drawn as a cylinder, and a "bug" box an `external`, drawn with a dashed border, only for their colors. A diagram of six states in six colors uses six kinds and gets pills, cylinders and diamonds it did not ask for.

PHILOSOPHY.md, "What may the agent set?" says looks are free, so this is a gap and not a rule. DESIGN.md, "Open questions" has the options. Needs the owner's choice.

## The legend cannot show a box's look

`diagram legend` explains line styles, widths and marks. A key made of small boxes, one per fill or border, such as "Works", "Bug" and "Fixed", is drawn today as a group of plain boxes, and every one of them gets `lonely-box`, six warnings for a picture that is right.

Either a legend entry for a box's look, once a box can have a look of its own (see "A box's color and shape come with its kind"), or `lonely-box` should leave out a group whose boxes the agent drew as a key.

## A box beside the chain is moved by steps, but its order is not checked

`node move --from <box> --down 1 --left 1` stairs a chain of states across a group, and the order of the row below it then decides the crossings. Changing a state diagram's chain from a column to a staircase took it from 3 crossings to 5, with no hint that the row below no longer matched the order above. `try` shows the change in counts, but neither help nor a warning says that a staircase and the order of the row it lands on go together.

## Help pages trip agents on three fields

Three fields tripped one agent in a single session, each refused at once and clearly, but each with a wrong first guess:

- A box placed with `align` also needs `first`, `last`, `before` or `after`, and the refusal (`missing-field`, `place`) is the only place that says so.
- `group title` takes `at`, and an agent that wrote `place` was refused with `likely: at`.
- A label with a comma, written in a batch without quotes, is refused as `unknown-field` or `unquoted-text` depending on where the comma falls.

`node add --help` and `group title --help` could show each in their batch line.

## A pair of lines back and forth, and a self-loop, cross

Two states with a line each way, such as "the reaper decides to park the host" and "the reaper leaves the host active", draw as two long parallel lines, and the return line of one pair crossed a self-loop on the box it returns to. A self-loop is drawn and its label sits to its side, but the lines that leave and enter the same box are not kept clear of it.
