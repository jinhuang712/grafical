# TODO

## ongoing

### [P1][DISCUSSION] A box's color and shape come with its kind

- description:
  - An agent that wants a green box and a red box has no way to say so.
  - A stylesheet sets the fill per kind in `paint.node.kinds`, and the kind also sets the shape.
  - On 2026-10-30 a "fixed" box had to be a cylinder and a "bug" box a dashed box only for their colors.
  - Looks are free in the philosophy, so this is a gap and not a rule.
  - Option one is a named look in the stylesheet that `node look <id> <name>` gives a box.
    - A theme change still restyles every box at once.
  - Option two is `node look <id> --fill <color> --border <color>` on the box itself.
    - It is simple, but a theme change leaves those colors as they are.
  - Option three is more kinds, rejected for now because a kind says what a box is.
  - In options one and two the shape stays the kind's.
- created: 2026-10-30
- status: HALT
- next: the owner chooses an option
- blocks: [The legend cannot show a box's look](#p2discussion-the-legend-cannot-show-a-boxs-look)

### [P1][DISCUSSION] A line along a row is not kept below a group's label

- description:
  - The decision on lines meeting any side says a line between two boxes of one row stays in the gutter below when one box lies under a group's label.
  - A comment in the router says so too.
  - The keep-out spans the router reads hold band labels and walls and lane sides but no group label.
  - The changelog still promises that such a line stays below.
- created: 2026-11-04
- status: HALT
- found: writing the routing spec from the router's code on 2026-11-04
- next: the owner chooses whether the router keeps such a line below or the decision drops the rule
- related: [019. Lines meet any side](../specs/decisions/019-lines-meet-any-side.md)

### [P2][DISCUSSION] An aligned box joins a column and no row slides

- description:
  - [F2.3: Alignment](../features/F2-layout.md#f23-alignment) says an aligned box's row slides sideways as one block.
  - The code joins the aligned box to its target's column instead.
- created: 2026-11-04
- status: HALT
- found: writing the placement spec from the layout code on 2026-11-04
- next: the owner chooses which is right and the other is changed
- related: [004. Layout computed again on every change](../specs/decisions/004-layout-computed-again-on-every-change.md)

### [P2][DISCUSSION] The stability tests measure movement instead of limiting it

- description:
  - The old rule for the tests said they assert that nothing outside a fixed list moved.
  - The tests assert that every other box keeps its row and order and group and lane and alignment.
  - They measure how far boxes move instead of limiting it.
  - AGENTS.md now describes what the tests do.
  - [4. A change moves only what it names](../DESIGNS.md#4-a-change-moves-only-what-it-names) and [F2.1: Placing every box](../features/F2-layout.md#f21-placing-every-box) still promise a fixed list.
  - [004. Layout computed again on every change](../specs/decisions/004-layout-computed-again-on-every-change.md) says the column grid does not keep that list.
- created: 2026-11-04
- status: HALT
- found: writing the placement spec from [test/layout/stability.ts](../test/layout/stability.ts) on 2026-11-04
- next: the owner chooses whether the tests should assert a list again

### [P2][DISCUSSION] The rules of the target picture are measured but never reported

- description:
  - The decision on a target picture says `grafical check --all` reports its eight rules.
  - [src/check/taste.ts](../src/check/taste.ts) still measures them, but no command calls it.
  - Only its limit of two bends is used.
- created: 2026-11-04
- status: HALT
- found: writing the checker spec from the code on 2026-11-04
- next: the owner chooses whether `check --all` reports them or the code and the decision drop them
- related: [012. A target picture with measured rules](../specs/decisions/012-a-target-picture-with-measured-rules.md)

### [P2][DISCUSSION] Guidelines 14 and 15 come from no stance

- description:
  - Every guideline in DESIGNS.md links to the stance it derives from.
  - [14. A diagram reads no file outside its folder, and its pictures run nothing](../DESIGNS.md#14-a-diagram-reads-no-file-outside-its-folder-and-its-pictures-run-nothing) has none.
  - [15. Every dependency allows use in an MIT project](../DESIGNS.md#15-every-dependency-allows-use-in-an-mit-project) has none.
  - Either the philosophy gains a stance they come from or they move elsewhere.
- created: 2026-11-05
- status: HALT
- found: rewriting DESIGNS.md to the skill's guide on 2026-11-05
- next: the owner chooses

### [P2][DISCUSSION] The first checkpoints have no exit criteria

- description:
  - The roadmap guide asks every checkpoint for exit criteria that point to a goal.
  - Seven sub-checkpoints of [CP1: Stage 1 built](ROADMAP.md#cp1-stage-1-built) were built before the goals existed and say they have none.
  - [CP4.1: The npm package](ROADMAP.md#cp41-the-npm-package) says none yet too.
  - A goal may now exit many checkpoints, so these may point to goals already in use.
- created: 2026-11-05
- status: HALT
- next: the owner matches each of these checkpoints to the goals that check it
- related: [054. A goal may exit many checkpoints](../specs/decisions/054-a-goal-may-exit-many-checkpoints.md)

### [P2][DISCUSSION] The philosophy does not say pictures keep getting better

- description:
  - [What makes grafical good?](../PHILOSOPHY.md#what-makes-grafical-good) says easy and consistent and not right for every reader.
  - [O1: The MVP bar](GOALS.md#o1-the-mvp-bar) now adds a copied picture that looks better than the original.
  - [M3: Better every round](GOALS.md#m3-better-every-round) rests on the owner's rating.
  - Only the owner changes the philosophy.
- created: 2026-11-05
- status: HALT
- next: the owner chooses whether the stance changes

### [P2][DISCUSSION] The limit on help read before a first operation

- description:
  - [C3: Token use](GOALS.md#c3-token-use) keeps a limit of 3k tokens that the owner suspended on 2026-10-17.
  - A suspended limit in a goal is neither a target nor a measure.
- created: 2026-11-05
- status: HALT
- next: the owner chooses whether it moves out of the goal or stays

### [P2][DISCUSSION] A box beside every box it connects to in a row

- description:
  - A box placed by steps wholly beside every box it connects to is an agent defect as `box-aside`.
  - The same box placed in a row is not refused.
  - The file could not once tell a slot the agent stated from one the engine chose.
  - Since the agent states every order it could become an agent defect too.
- created: 2026-10-15
- status: HALT
- next: the owner decides whether it becomes an agent defect
- related: [032. Who chose is punished](../specs/decisions/032-who-chose-is-punished.md)

### [P2][DISCUSSION] Steps from another box are the nearest thing to a position

- description:
  - Steps from another box are small whole numbers on the grid and a fact like a row.
  - They are also the nearest grafical has come to a position.
- created: 2026-10-14
- status: HALT
- next: the owner reconsiders "places are facts" if steps grow larger or finer or more common
- related: [031. Steps from another box](../specs/decisions/031-steps-from-another-box.md)

### [P2][DISCUSSION] How freely an agent can adjust a picture

- description:
  - A model that draws directly can adjust a picture to the pixel.
  - grafical is not that free yet, and the owner sees much room to improve.
  - Option one keeps places as facts and turns each gap into a new discrete fact.
  - Option two adds a small adjustment within one cell of the grid.
  - Option three allows adjustment to the pixel.
  - [M1: Enough to say](GOALS.md#m1-enough-to-say) could count the gaps.
- created: 2026-11-05
- status: HALT
- found: choosing what to measure on 2026-11-05
- next: the owner reopens this once the documents are settled

### [P2][DISCUSSION] One word for two steps

- description:
  - [F2.5: Steps from another box](../features/F2-layout.md#f25-steps-from-another-box) is a placement some cells of the grid from another box.
  - [F1.2.4: Numbered steps](../features/F1-elements.md#f124-numbered-steps) is a number on a line for a process.
  - The two share a word and GLOSSARY.md lists both.
- created: 2026-11-03
- status: HALT
- next: the owner chooses a new name for one or keeps both

### [P2][DISCUSSION] A row's label is drawn twice

- description:
  - A row in a lane that is also the end of a line gets the lane's label and a band label of its own.
  - The band label goes above the first stretch of its row with no box under it.
  - That keeps lines into a box's top from crossing it, but moves it from the band's top left.
  - Option one drops a band's label when its row is a lane's only row.
  - Option two drops it only when the two texts match.
  - Option three puts the label at the band's top left and lets lines pass it.
- created: 2026-10-15
- status: HALT
- next: the owner chooses an option

### [P2][DISCUSSION] Lines meet a diamond on a slanted side

- description:
  - When two lines share a side of a `decision` box they meet its slanted edge instead of its corner.
  - A flowchart's lines meet a diamond at the corners.
  - The router spreads ports along a diamond's side as along a box's.
  - Option one moves a second line to the left or right corner.
  - Option two joins it to the first line before the corner as a fan-in does.
- created: 2026-10-15
- status: HALT
- next: the owner chooses an option

### [P2][DISCUSSION] A diamond's lines leave at its slanted edge a little

- description:
  - With `decision` ports kept to the middle 32 px of a diamond's top and bottom a line still meets the slanted edge a few px inside the corner.
  - A try on 2026-10-30 changed 201 of 500 fuzz diagrams with 113 more bends and 32 more crossings.
  - It changed 2 of 329 saved drafts with 2 more bends and was not landed.
  - A `choice` is the small diamond the reference diagrams use with every line at its corner.
- created: 2026-10-30
- status: HALT
- next: the owner chooses whether `decision` needs this at all
- related: [052. A choice is a small diamond](../specs/decisions/052-a-choice-is-a-small-diamond.md)

### [P2][DISCUSSION] A fan-out splits at two heights

- description:
  - Three unlabelled lines from one box to three boxes below split from their trunk at two heights.
  - An org chart draws one bar instead.
  - The split is on purpose since a trunk with branches on both sides would meet them in a junction that reads as a crossing.
  - One bar needs the owner to change that rule, for example where a junction dot marks the meeting.
- created: 2026-10-15
- status: HALT
- next: the owner chooses whether to change the rule
- related: [012. A target picture with measured rules](../specs/decisions/012-a-target-picture-with-measured-rules.md)

### [P2][DISCUSSION] Labels sit close to the lines beside them in a crowded gutter

- description:
  - Four labelled lines out of one box run side by side in one gutter with each label 4 px from the next line.
  - The picture reads crowded though no warning fires.
  - Asking for 8 px everywhere made 421 of 500 fuzz diagrams 5.5% taller and the dispatch fixture 2 crossings worse.
  - Asking for 8 px only where a label finds room left the dispatch fixture 4 crossings worse.
  - An empty row between the two rows only lengthened the lines.
  - Neither try was landed.
- created: 2026-10-30
- status: HALT
- next: the owner chooses more air in every gutter or a taller gutter only where a crowded-label warning would fire

### [P2][DISCUSSION] The legend cannot show a box's look

- description:
  - `diagram legend` explains line styles and widths and marks but not a box's fill.
  - A key of small boxes such as "Works" and "Bug" and "Fixed" is drawn as a group of plain boxes.
  - Every one of them gets `lonely-box`, six warnings for a picture that is right.
  - Either a legend entry for a box's look or a `lonely-box` that leaves out a key would fix it.
- created: 2026-10-30
- status: HALT
- next: waits on the choice of how a box gets a look of its own

### [P2][ISSUE] A step's badge across a lane's side

- description:
  - `check --all` counts a lane's side across a line's label as `text-crossing` but not across a step's badge.
  - The badge's place does not keep off a lane's side.
  - The badge should keep off it as the label does, and `step-collision` should count one it touches.
- created: 2026-10-16
- status: OPEN
- related: [039. Step badges ride the line](../specs/decisions/039-step-badges-ride-the-line.md)

### [P2][ISSUE] A pair of lines back and forth crosses a self-loop

- description:
  - Two states with a line each way draw as two long parallel lines.
  - The return line of one pair crossed a self-loop on the box it returns to.
  - The lines that leave and enter a box are not kept clear of its self-loop.
- created: 2026-10-30
- status: OPEN

### [P2][TASK] Help pages trip agents on three fields

- description:
  - One agent guessed three fields wrong in one session and was refused at once each time.
  - A box placed with `align` also needs `first` or `last` or `before` or `after`, and only the refusal says so.
  - `group title` takes `at`, and an agent that wrote `place` was refused with `likely: at`.
  - A label with a comma in a batch without quotes is refused as `unknown-field` or `unquoted-text`.
  - `node add --help` and `group title --help` could show each in their batch line.
- created: 2026-10-30
- status: OPEN

### [P2][IDEA] Too many heavy lines draw a warning

- description:
  - A main path stands out only against thin lines.
  - A warning could fire when more than three lines or a third of all lines are heavier than `thin`.
- created: 2026-10-15
- status: OPEN
- related: [019. Lines meet any side](../specs/decisions/019-lines-meet-any-side.md)

### [P2][IDEA] A staircase and the order of the row below it go together

- description:
  - `node move --from <box> --down 1 --left 1` stairs a chain of states across a group.
  - The order of the row below it then decides the crossings.
  - Changing a state diagram's chain from a column to a staircase took it from 3 crossings to 5 with no hint why.
  - Neither the help nor a warning says that a staircase and the order of the row it lands on go together.
- created: 2026-10-30
- status: OPEN
