# F4: Placing

```
F4: Placing
├── F4.1: Rows and order — a box's row and its place in it
├── F4.2: Alignment — one box above or below another
├── F4.3: Columns — a second placement fact beside rows
└── F4.4: Steps from another box — a box some cells from another
```

The agent says where a box sits as a fact and never as a position. A box sits in a row in a stated order, below or above another box, in a column, or some steps from another box. grafical turns those facts into places and keeps them after every change.

## F4.1: Rows and order

A box sits in a row, in an order. A row only places, and is not drawn unless it has a look or a line ends at it.

**Commands:**

- `grafical layer add <file> <id> [--label <text>] [--before <row> | --after <row>]`
- `grafical layer rename <file> <id> --label <text>`
- `grafical layer look <file> <id> [box|band]`
- `grafical layer move <file> <id> --first | --last | --before <row> | --after <row>`
- `grafical layer remove <file> <id>`
- `grafical layer split <file> <id> <new-id> --label <text> [--from <node>]`
- `grafical node add <file> <id> --layer <row> --label <text> [--kind <kind>] [--sublabel <text>] [--size s|m|l] [--first | --last | --before <node> | --after <node>] [--align <node>] [--accent]`
- `grafical node move <file> <id> [--layer <row>] [--first | --last | --before <node> | --after <node>]`

- A new row goes to the bottom unless `--before` or `--after` places it.
- A box added to a row or moved into another row says where it goes: `--first` · `--last` · `--before` · `--after`.
  - Without one it is refused as `missing-field`, with the row and the boxes in it.
  - Only the first box of an empty row needs none ([033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md)).
- A row's label is optional.
  - It is drawn only with the row: in a band's head, or in a bar.
  - A drawn row with no label draws no name.
  - A band without one has no head ([046. A row's label is optional](../specs/decisions/046-a-row-s-label-is-optional.md)).
- `layer split` moves the second half of a row into a new row below it.
  - With `--from <node>` it moves the boxes from that box on.
- A row can be removed only when it is empty, and the lines that end at it go with it.
- `layer look` draws a row and its label even when no line ends at it.
  - `box` draws it with a box's paint and a dark label.
  - `band` draws it with the band's light fill and grey label.
  - Without a look, a row is drawn only when a line ends at it.
  - Then a row with no box is drawn as a box and a row with boxes as a band.
  - A row with no box and a look is a bar and is checked as one ([045. A row with a look is drawn](../specs/decisions/045-a-row-with-a-look-is-drawn.md)).
  - A line that passes it needs `--pass` (`bar-crossed`).
  - It may not lie between the first and last rows of a group (`bar-in-group`).
  - Taking the look away with `layer look` clears `bar-in-group`.

- **Stance:** [What may the agent set?](../PHILOSOPHY.md#what-may-the-agent-set)
- **Design:**
  - [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
  - [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
- **How it works:**
  - [The model](../specs/model.md)
  - [Placement: the column grid](../specs/placement.md#the-column-grid)
- **Why:**
  - [003. Rows unseen, groups as systems](../specs/decisions/003-rows-unseen-groups-as-systems.md)
  - [033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md)
  - [045. A row with a look is drawn](../specs/decisions/045-a-row-with-a-look-is-drawn.md)
  - [046. A row's label is optional](../specs/decisions/046-a-row-s-label-is-optional.md)

**Stories:**

- An agent states each box's row and order, to decide the story's layout in facts.

## F4.2: Alignment

```sh
grafical node align <file> <id> [--to <node>]
```

A box sits directly above or below a box in another row.

- Its row slides sideways as one block to put it there.
- An alignment that cannot hold with the order of either row is refused as `alignment-conflict` or `alignment-cycle`.
- Without `--to` the alignment is cleared.

Gap: the code joins the aligned box to its target's column instead, and has no `alignment-cycle`.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: alignment](../specs/placement.md#alignment)
- **Why:** [002. Facts over coordinates](../specs/decisions/002-facts-over-coordinates.md)

**Stories:**

- An agent aligns two boxes in different rows, to give a line between them a straight run.

## F4.3: Columns

A second placement fact beside rows. Nothing is drawn: a column is a guide.

**Commands:**

- `grafical column add <file> <id> [--nodes a,b] [--before <column> | --after <column>]`
- `grafical column join <file> <column> <member...>`
- `grafical column leave <file> <member...>`
- `grafical column remove <file> <id>`

- Every box of a column sits left of every box of the next column in all rows.
  - At least a row's gap lies between them.
  - Columns go left to right in the order they were added, unless placed `--before` or `--after` another.
- A group as a member brings its boxes.
  - A box in no column keeps its place beside the box left of it.
- An order that another fact contradicts is refused as `column-order`, naming two boxes whose order cannot hold.
- A diagram has columns or lanes that run as columns, not both (`column-lanes`).
- Removing a column leaves its boxes where they are.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: columns](../specs/placement.md#columns)
- **Why:**
  - [027. Columns beside rows](../specs/decisions/027-columns-beside-rows.md)
  - [035. Columns hold across rows](../specs/decisions/035-columns-hold-across-rows.md)

**Stories:**

- An agent sets columns, to keep boxes of different rows in one left-to-right order.

## F4.4: Steps from another box

A box in no row, placed some cells of the grid from another box.

```sh
grafical node add <file> <id> --from <node> [--down <n> | --up <n>] [--left <n> | --right <n>] --label <text> [--kind <kind>]
grafical node move <file> <id> [--from <node>] [--down <n> | --up <n>] [--left <n> | --right <n>]
```

- Each step is a whole number from 1 to 10, and at least one is given.
  - A step is one cell of the grid: a row down or up, a column left or right.
- The box moves with the box it steps from, which may itself be placed by steps.
- Past the first or last row, the box lands in a row grafical adds.
  - `show --drawn` names that row `-`.
  - The boxes of a row it lands in stand aside.
- A cell another fact keeps is refused as `step-blocked`, a box that steps from itself as `step-cycle`.
  - Steps combined with a row · a position · an alignment · a column · a lane are refused as `conflicting-position`.
- `node move --layer` puts the box back in a row.
  - `node move` with steps and no `--from` keeps the box it steps from, and with `--from` alone keeps the steps.
- A box placed by steps wholly beside every box it connects to is refused as `box-aside`.
  - The refusal names those boxes.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: steps from another box](../specs/placement.md#steps-from-another-box)
- **Why:**
  - [031. Steps from another box](../specs/decisions/031-steps-from-another-box.md)
  - [032. Who chose is punished](../specs/decisions/032-who-chose-is-punished.md)

**Stories:**

- An agent places a box some steps from another, to draw a staircase or a side path.
