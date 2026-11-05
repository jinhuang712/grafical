# TODO

## ongoing

### [P1][DISCUSSION] How freely an agent can adjust a picture

- description:
  - A model that draws directly can adjust a picture to the pixel.
  - grafical is not that free yet, and the owner sees much room to improve.
  - The owner takes it one dimension at a time, and lines, line labels, bars across groups, region gaps, node sizes and the looks of edges and containers are decided.
  - The owner needs nothing for the canvas's proportions, since a wide picture is fine.
  - Still open are where a box sits beside another, where no gap has shown, and where notes and step badges sit.
  - Agents' reflections name lines and the canvas more than a box a few pixels off, read by sample on 2026-11-06.
  - Option one keeps places as facts and turns each gap into a new discrete fact.
  - Option two adds a small adjustment within one cell of the grid.
  - Option three allows adjustment to the pixel.
  - [M1: Enough to say](GOALS.md#m1-enough-to-say) could count the gaps.
- created: 2026-11-05
- status: HALT
- found: choosing what to measure on 2026-11-05
- next: the owner takes the next dimension, and the three options are settled after the last
- related: [055. A weak model draws well and a stronger one superbly](../specs/decisions/055-a-weak-model-draws-well-and-a-stronger-one-superbly.md)

### [P1][DISCUSSION] The legend needs a design of its own

- description:
  - The owner sees a legend as a small diagram.
  - A picture may have one or none.
  - Its entries may run across, down or in a grid.
  - It is open what goes in it and how each sample is drawn.
  - `diagram legend` explains line styles and widths and marks but not a node's fill.
  - A key of small nodes such as "Works" and "Bug" and "Fixed" is drawn as a group of plain nodes.
  - Every one of them gets `lonely-box`, six warnings for a picture that is right.
- created: 2026-10-30
- updated: 2026-11-06
- status: HALT
- next: the owner designs the legend in a talk of its own
- related: [057. A box may take a look of its own](../specs/decisions/057-a-box-may-take-a-look-of-its-own.md)

### [P1][DISCUSSION] The diagram file's format and object model

- description:
  - The draft is in [the object model](../specs/object-model.md), and each fork goes to a decision as it closes.
  - Open: what happens to a node in a region that its `<order>` leaves out.
  - Open: how an edge reaches a node inside an instance, and how IDs inside an instance are named.
  - Open: whether a node's own label is a `<label>` too.
  - Open: whether a class takes parameters.
  - Open: what a condition in a style rule may say.
  - Open: what a constraint may say.
- created: 2026-11-06
- status: HALT
- next: the owner chooses what happens to a node an `<order>` leaves out
- evidence: on the dispatch fixture YAML takes 1.1 ms to parse against about 200 ms for a command, and the file is 264 lines

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
- next: labels on lines may settle this, so look again once they are built
- related: [066. A line's label sits on its line](../specs/decisions/066-a-line-s-label-sits-on-its-line.md)

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
