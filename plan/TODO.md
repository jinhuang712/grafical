# TODO

Small fixes and follow-ups with no milestone yet. An item moves to ROADMAP.md once it has one.

## ongoing

### [P1][DISCUSSION] A line along a row is not kept below a group's label

- created: 2026-11-04
- status: HALT
- found: writing specs/routing.md from `src/layout/route.ts` on 2026-11-04
- next: the owner chooses whether the router keeps such a line below, or the decision drops the rule

specs/decisions, "Lines meet any side" says a line between two boxes of one row stays in the gutter below when one of its boxes lies under a group's label, and a comment in `route.ts` says so too. The keep-out spans the router reads hold band labels, walls and lane sides, but no group label.

### [P2][DISCUSSION] An aligned box joins a column, and no row slides

- created: 2026-11-04
- status: HALT
- found: writing specs/placement.md from `src/layout/` on 2026-11-04
- next: the owner chooses which is right, and the other is changed

FEATURES.md, "Alignment" and specs/decisions, "Layout computed again on every change" say an aligned box's row slides sideways as one block, and that rows that would follow each other are refused as `alignment-cycle`. The code joins the aligned box to its target's column instead, and has no `alignment-cycle` code.

### [P2][DISCUSSION] The stability tests measure movement instead of limiting it

- created: 2026-11-04
- status: HALT
- found: writing specs/placement.md from `test/layout/stability.ts` on 2026-11-04
- next: the owner chooses whether AGENTS.md changes, or the tests assert a list again

AGENTS.md, "Tests" says the stability tests assert that nothing outside a fixed list changed position, size or route. They assert that every other box keeps its row, its order, its group, its lane and its alignment, and they measure how far boxes move.

### [P2][DISCUSSION] The rules of the target picture are measured but never reported

- created: 2026-11-04
- status: HALT
- found: writing specs/checks.md from `src/check/taste.ts` on 2026-11-04
- next: the owner chooses whether `check --all` reports them, or the code and the decision drop them

specs/decisions, "A target picture with measured rules" says `grafical check --all` reports its eight rules. `src/check/taste.ts` still measures them, but no command calls it, and only its limit of two bends is used.

### [P2][ISSUE] FEATURES.md names the wrong code for a mark file outside the folder

- created: 2026-11-04
- status: OPEN
- found: writing specs/rendering.md from `src/cli/marks.ts` on 2026-11-04
- next: change FEATURES.md, "Marks" to name `mark-file-outside`

FEATURES.md, "Marks" says a path outside the diagram's folder is refused as `mark-file-unsafe`. The code refuses it as `mark-file-outside`.

### [P2][DISCUSSION] FEATURES.md lists the guides as built and as not planned

- created: 2026-11-04
- status: HALT
- found: reading FEATURES.md on 2026-11-04
- next: the owner confirms the guides stay, and *Not planned* drops `grafical guide`

FEATURES.md, "Guides" is built, and *Not planned* says `grafical guide` was replaced by the help (specs/decisions, "The help as the reference"). specs/decisions, "Help for the tool, guides for best practice" brought the guides back later.

### [P2][DISCUSSION] A box beside every box it connects to, in a row

- created: 2026-10-15
- status: HALT
- next: the owner decides whether it becomes an agent defect, as it is for a box placed by steps

"Who chose is punished" (specs/decisions) did not refuse it, because the file could not tell a slot the agent stated from one the engine chose. Since "The agent states every order" the agent states every slot, so it could become an agent defect (`box-aside`), as it is for a box placed by steps.

### [P2][TASK] A corner mark is not checked against the lines near it

- created: 2026-10-15
- status: OPEN
- next: check a corner mark against the lines that leave the box near its corner, and report one that meets a mark

A line that meets a mark is not reported today (FEATURES.md, "Marks").

### [P2][IDEA] Too many heavy lines draw a warning

- created: 2026-10-15
- status: OPEN
- next: count every line heavier than `thin` and warn when more than three lines are heavy or more than a third of all lines

"Lines meet any side" (specs/decisions) says a main path stands out only against thin lines. No code does this yet.

### [P2][DISCUSSION] Steps from another box are the nearest thing to a position

- created: 2026-10-14
- status: HALT
- next: the owner reconsiders "places are facts" if steps grow larger, finer or more common

Steps from another box (specs/decisions, "Steps from another box") are small whole numbers on the grid, a fact like a row. They are also the nearest grafical has come to a position (PHILOSOPHY.md, "What may the agent set?"). Moved here from PHILOSOPHY.md, where it stood as an open doubt.

### [P2][DISCUSSION] One word, two steps

- created: 2026-11-03
- status: HALT
- next: the owner chooses; the text below names the options

"Steps from another box" (specs/decisions, "Steps from another box") is a placement: a box sits some cells of the grid from another. "Numbered steps" (FEATURES.md) is a number on a line for a process. The two share a word, and `GLOSSARY.md` lists both. Needs the owner's choice of a new name for one, or a decision to keep both.

### [P2][ISSUE] Many writes in one process run the text measurer out of memory

- created: 2026-10-17
- status: OPEN

`plan` in `src/cli/pipeline.ts` makes a new HarfBuzz measurer for every write. A command line makes one write per process, and `grafical view` keeps one measurer, so no user meets it; but a few thousand writes in one process end in `RuntimeError: memory access out of bounds`, as an audit of refusals did on 2026-10-17. Reusing one measurer, or freeing each, would let tools and tests call the write path in a loop.

### [P2][TASK] Pages read before a first write

- created: 2026-10-17
- status: OPEN

specs/decisions, "One entry page, help where it is used" names a risk: agents may not use the ways to draw the entry page lists, or may draft without opening a command's page. The harness counts grafical calls by outcome, but not which help pages an agent read before its first write. `bench lines` or the metrics should count each `--help` call, each `unknown-command` refusal and each `grafical guide [<name>]` before the first `apply` or edit, per draft, so the next paid round can say which pages and guides agents read.

### [P2][DISCUSSION] A row's label is drawn twice

- created: 2026-10-15
- status: HALT
- next: the owner chooses; the text below names the options

A row that is in a lane and is also the end of a line gets the lane's label and a band label of its own. The band label sits away from the band's top left: top right in one picture, the middle in another.

That place follows a rule: the label goes above the first stretch of its row with no box under it, so that no line into a box's top crosses it. Fixing this needs the owner's choice: drop a band's label when its row is a lane's only row, or only when the two texts match, or put the label at the band's top left and let lines pass it.

### [P2][DISCUSSION] Lines meet a diamond on a slanted side

- created: 2026-10-15
- status: HALT
- next: the owner chooses; the text below names the options

When two lines share a side of a `decision` box, they meet its slanted edge instead of its corner. A flowchart's lines meet a diamond at the corners.

The router has no rule for diamonds: it spreads ports along a diamond's side as along a box's, and the line is cut where it meets the outline. Meeting the corners needs the owner's choice for a second line on a side: move it to the left or right corner, or join it to the first line before the corner, as a fan-in does.

### [P2][DISCUSSION] A fan-out splits at two heights

- created: 2026-10-15
- status: HALT
- next: the owner chooses; the text below names the options

Three unlabelled lines from one box to three boxes in the row below split from their trunk at two heights, a small staircase, where an org chart draws one bar. Related to the staircase left unpunished in specs/decisions, "Who chose is punished".

The split is on purpose: rule 4 of specs/decisions, "A target picture with measured rules" says a trunk that runs straight on with branches on both sides meets them in a junction that reads as a crossing, so each side branches at its own height (`stagger` in `src/layout/route.ts`). One bar needs the owner to change that rule, for example where a junction dot marks the meeting.

### [P2][ISSUE] A step's badge across a lane's side

- created: 2026-10-16
- status: OPEN

`check --all` counts a lane's side across a line's label as `text-crossing`, but not across a step's badge, and the badge's place does not keep off it (specs/decisions, "Step badges ride the line"). The badge should keep off a lane's side as the label does, and `step-collision` should count one it touches.

### [P1][ISSUE] Usage errors ignore --json

- created: 2026-10-18
- status: OPEN

A command line grafical cannot read, such as `grafical show d.grafical.yaml --bogus --json`, prints its block as text on standard error, where every other refusal with `--json` prints JSON on standard output. An agent that asked for JSON gets text it did not ask for.

### [P2][ISSUE] No blank line before a refused batch in try

- created: 2026-10-18
- status: OPEN

`try` with several batches prints an accepted batch's `delta` record and then the next batch's `failed batch=<file> changed=-` on the next line, where every other outcome line has a blank line before the blocks that follow. The records still read, but the blocks of one refusal are harder to tell apart from the records of the batch before.

### [P1][ISSUE] check says ok for a file every write refuses

- created: 2026-10-18
- status: OPEN

A file that the diagram's own checks refuse, such as a group split around a box in one row, loads, and `check` prints `ok` with its warnings and counts: `check` reports defects and warnings, not the whole diagram's errors. Every write is then refused with that error, `already in the file`. `check` should report them, as a write does.

### [P1][DISCUSSION] A box's color and shape come with its kind

- created: 2026-10-30
- status: HALT
- next: the owner chooses; the text below names the options

An agent that wants a green box, a red box and a blue box has no way to say so: a stylesheet sets the fill per kind (`paint.node.kinds`), and a kind also sets the shape. Redrawing two published state and flow diagrams on 2026-10-30, a "fixed" box had to be a `store`, drawn as a cylinder, and a "bug" box an `external`, drawn with a dashed border, only for their colors. A diagram of six states in six colors uses six kinds and gets pills, cylinders and diamonds it did not ask for.

PHILOSOPHY.md, "What may the agent set?" says looks are free, so this is a gap and not a rule. The options, none chosen:

- A named look in the stylesheet, such as `looks: {fixed: {fill: ..., stroke: ...}}`.
  - The operation `node look <id> <name>` gives a box one.
  - The agent states a name and the stylesheet states the colors.
  - A theme change still restyles every box at once.
- A fill and a border on the box, as a mark already takes `--bg` and `--border`: `node look <id> --fill <color> --border <color>`.
  - Simple, but the colors sit in every box of the file.
  - A theme change leaves them as they are.
- Keep it tied to the kind and add kinds.
  - Rejected for now: a kind says what a box is, and "a green box" is not a thing that exists.

The shape stays the kind's in the first two. Needs the owner's choice.

### [P2][DISCUSSION] The legend cannot show a box's look

- created: 2026-10-30
- status: HALT
- next: the owner chooses; the text below names the options

`diagram legend` explains line styles, widths and marks. A key made of small boxes, one per fill or border, such as "Works", "Bug" and "Fixed", is drawn today as a group of plain boxes, and every one of them gets `lonely-box`, six warnings for a picture that is right.

Either a legend entry for a box's look, once a box can have a look of its own (see "A box's color and shape come with its kind"), or `lonely-box` should leave out a group whose boxes the agent drew as a key.

### [P2][IDEA] A box beside the chain is moved by steps, but its order is not checked

- created: 2026-10-30
- status: OPEN

`node move --from <box> --down 1 --left 1` stairs a chain of states across a group, and the order of the row below it then decides the crossings. Changing a state diagram's chain from a column to a staircase took it from 3 crossings to 5, with no hint that the row below no longer matched the order above. `try` shows the change in counts, but neither help nor a warning says that a staircase and the order of the row it lands on go together.

### [P2][TASK] Help pages trip agents on three fields

- created: 2026-10-30
- status: OPEN

Three fields tripped one agent in a single session, each refused at once and clearly, but each with a wrong first guess:

- A box placed with `align` also needs `first`, `last`, `before` or `after`, and the refusal (`missing-field`, `place`) is the only place that says so.
- `group title` takes `at`, and an agent that wrote `place` was refused with `likely: at`.
- A label with a comma written in a batch without quotes is refused as `unknown-field` or `unquoted-text`.
  - Which one depends on where the comma falls.

`node add --help` and `group title --help` could show each in their batch line.

### [P2][ISSUE] A pair of lines back and forth, and a self-loop, cross

- created: 2026-10-30
- status: OPEN

Two states with a line each way, such as "the reaper decides to park the host" and "the reaper leaves the host active", draw as two long parallel lines, and the return line of one pair crossed a self-loop on the box it returns to. A self-loop is drawn and its label sits to its side, but the lines that leave and enter the same box are not kept clear of it.

### [P2][DISCUSSION] Labels sit close to the lines beside them in a gutter with many runs

- created: 2026-10-30
- status: HALT
- next: the owner chooses; the text below names the options

Four labelled lines out of one box run side by side in one gutter, each label 4 px from the next line (`ROUTE.labelClear`), and the picture reads crowded though no warning fires (`crowded-label` counts under 8 px on two sides). Tried on 2026-10-30: asking for 8 px, flat, made 421 of 500 fuzz diagrams 5.5% taller with crossings 40,260 to 40,326, and the dispatch fixture 2 crossings worse, and one fuzz diagram a text overlap; asking for 8 px first and falling back to 4 where a label finds no slot, and keeping it only where the gutter's own crossings did not rise, still left the dispatch fixture 4 crossings worse (20 to 24), since the rows of a gutter change what the next gutter's lines cross. Neither was landed. An empty row between the two rows only lengthened the lines (crowded 0 to 1, height +88), and `airy` density helped little. Needs the owner's choice: more air in every gutter at the price of crossings, or a taller gutter only where a crowded-label warning would fire.

### [P2][DISCUSSION] A diamond's lines leave at its slanted edge, a little

- created: 2026-10-30
- status: HALT
- next: the owner chooses; the text below names the options

With `decision` ports kept to the middle 32 px of a diamond's top and bottom, a line leaves closer to the corner, but still meets the slanted edge a few px inside it. Tried on 2026-10-30: over 500 fuzz seeds 201 diagrams changed, bends +113 and crossings +32, and of 329 saved drafts 2 changed with bends +2; not landed. A `choice` (specs/decisions, "A choice is a small diamond") is the small diamond the reference diagrams use, with every line at its corner.
