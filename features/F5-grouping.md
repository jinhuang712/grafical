# F5: Grouping

```
F5: Grouping
├── F5.1: Groups — a system drawn as one frame
├── F5.2: Copying a group — a second zone in one operation
├── F5.3: Deeper nesting — up to five levels
├── F5.4: Swimlanes — bands that say who owns what
├── F5.5: Walls — space that lines cross only where allowed
└── F5.6: Notes — a short text on a box, a line or a group
```

Boxes are gathered into systems, lanes and parts that lines keep apart. A group draws a frame around a system, a lane says who owns what, a wall keeps two parts apart and a note holds detail beside its target.

## F5.1: Groups

A group is a system, drawn as one box around its members, which may sit in several rows.

**Commands:**

- `grafical group add <file> <id> --label <text> [--sublabel <text>] [--nodes a,b,c] [--in <group>]`
- `grafical group join <file> <group> <node or group...>`
- `grafical group leave <file> <node or group...> [--up]`
- `grafical group rename <file> <id> --label <text>`
- `grafical group describe <file> <id> [--text <text>]`
- `grafical group title <file> <id> [top-left|top|top-right|left|right|bottom-left|bottom|bottom-right|outside-top|outside-bottom|outside-left|outside-right]`
- `grafical group order <file> <id> --before <group> | --after <group>`
- `grafical group remove <file> <id> [--out]`

- A group's box spans every row from its top member to its bottom one.
  - The other boxes of those rows sit beside it, and nothing else lies inside it.
- Groups nest, up to three levels (`group-too-deep`).
  - A group inside itself is refused as `group-cycle`.
- `join` moves a box out of its previous group, and also moves a whole group into another.
  - `leave` takes members out of every group, or with `--up` one level out.
- `group title` (or `group label`) says where the group's label sits.
  - It takes one of these places:
    - In its head: at the left, the middle or the right.
    - In a foot below its last row: at the left, the middle or the right.
      - A foot takes the head's room, and the head keeps only its padding.
    - Just outside its top or bottom side, centred.
    - Beside its rows at the middle height, inside or outside its left or right side.
  - It sits exactly there and takes only its own room: no box and no line moves for it.
  - A line that comes near it refuses the write as `title-blocked`, naming the lines and the places where none would.
  - Without a place the engine seats the label at the leftmost spot of the head that no line comes near.
  - Where a line comes near every spot, the write is refused as `title-blocked` too ([040. The agent states where a group's label sits](../specs/decisions/040-the-agent-states-where-a-group-s-label-sits.md)).
  - All twelve places the owner chose are built.
- `group order` puts a group's boxes before or after another group's as one block in every row the two share.
  - The boxes of its inner groups move with it.
  - A group ordered beside itself or beside a group around or inside it is refused as `bad-reference`.
- `remove` keeps the members: they move into the group around it, or with `--out` out of every group.
  - Lines that end at the group go with it.
- A box inside a box takes the canvas's fill, so the fills alternate by depth.
  - A stylesheet may set `paint.nesting: shade` instead.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:**
  - [Placement: groups](../specs/placement.md#groups)
  - [Text placement: group titles](../specs/labels.md#group-titles)
- **Why:**
  - [003. Rows unseen, groups as systems](../specs/decisions/003-rows-unseen-groups-as-systems.md)
  - [040. The agent states where a group's label sits](../specs/decisions/040-the-agent-states-where-a-group-s-label-sits.md)

**Stories:**

- An agent groups boxes into a system, to show which parts belong together.

## F5.2: Copying a group

A second zone, region or shard in one operation.

```sh
grafical group copy <file> <id> <into> --label <text> --suffix <suffix> --before <group> | --after <group> [--outside]
```

- The copy holds the group's inner groups, its boxes and the lines between them.
  - It sits in the group the original sits in.
  - Every id it makes ends in the suffix except `<into>`.
  - A line id `<from>-><to>` follows its copied ends.
- `--outside` also copies the lines between the group and everything outside it, their inside end moved to the copy.
- Each copied box sits in its original's row.
  - It keeps its original's label · kind · size · marks · lane · column.
  - `--before` or `--after` puts the copy before or after a group in every row of the copy as `group order` does ([033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md)).
  - A group with no box in one of those rows is refused as `no-shared-layer`.
- An alignment or steps to a box outside the group are refused as `copy-conflict` ([037. A group copy holds its inside](../specs/decisions/037-a-group-copy-holds-its-inside.md)).
  - So is a lane or a column that would move the copy from its place.
  - The refusal names the box.
  - Notes and walls are not copied.

- **Design:** [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
- **How it works:** [The model](../specs/model.md)
- **Why:** [037. A group copy holds its inside](../specs/decisions/037-a-group-copy-holds-its-inside.md)

**Stories:**

- An agent copies a group with its lines, to draw a second region or shard in one step.

## F5.3: Deeper nesting

Groups nest up to five levels instead of three, as a cloud's account, region, network, zone and subnet do. The fuzz test must hold at five levels first.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: groups](../specs/placement.md#groups)
- **Why:** [003. Rows unseen, groups as systems](../specs/decisions/003-rows-unseen-groups-as-systems.md)

**Stories:**

- An agent nests groups five deep, to draw a cloud's account down to its subnet.

## F5.4: Swimlanes

A swimlane is a labelled band that says who owns what. A diagram's lanes all run one way, as rows or as columns.

**Commands:**

- `grafical lane add <file> <id> --label <text> [--members a,b]`
- `grafical lane join <file> <lane> <member...>`
- `grafical lane leave <file> <member...>`
- `grafical lane rename <file> <id> --label <text>`
- `grafical lane remove <file> <id>`

- Rows as members make lanes that run as rows, with the label on the left.
  - Boxes as members make lanes that run as columns, with the label on top.
  - A group stands for its rows or boxes.
  - Both in one diagram is refused as `lane-mixed`.
- A row lane's rows must be neighbours (`lane-gap`), and a row added between two rows of a lane joins it.
- Column lanes go left to right in creation order, and every row keeps that order.
  - A box outside every lane sits right of the lanes, or left of them when it comes first in its row.
- A group lies inside one lane (`group-across-lanes`).
- `lane remove` keeps the members and removes the lines that end at the lane.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:**
  - [Placement: lanes](../specs/placement.md#lanes)
  - [Text placement: lane labels](../specs/labels.md#bands-bars-and-lanes)
- **Why:** [018. Swimlanes run one way](../specs/decisions/018-swimlanes-run-one-way.md)

**Stories:**

- An agent sets lanes, to show who owns which step.

## F5.5: Walls

Empty space between two parts of a picture, which lines cross only where the wall allows.

**Commands:**

- `grafical wall add <file> <id> --between a,b --and c,d [--allow e,f] [--label <text>]`
- `grafical wall allow <file> <id> <allow...> [--off]`
- `grafical wall relabel <file> <id> [--label <text>]`
- `grafical wall remove <file> <id>`

- Each side is a list of boxes and groups.
  - When one side lies above the other, the wall runs across.
  - When they sit side by side in their rows, it runs up and down.
  - Otherwise it is refused as `wall-sides`, and so is a box on both sides.
- A wall is only as long as its two sides need.
- A line from one side to the other is refused as `wall-crossed`.
  - `allow` lets it cross by naming the line or a box or group at one of its ends, such as a gateway.
  - Any other line drawn through the wall is a defect with the same code.
- Without a label, a wall is invisible: only its space shows.
  - With a label, it draws a dashed divider through its middle.
  - The label sits along it at the first place no line comes near.
  - Where none is, the write is refused as `label-blocked` ([041. The dirty work has edges](../specs/decisions/041-the-dirty-work-has-edges.md)).
  - `wall relabel` changes the label, or drops it without `--label`.
- A box or group that is removed leaves the wall's sides, and a wall left with an empty side goes.

- **Design:**
  - [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
  - [5. The engine routes every line, in plain forms](../DESIGNS.md#5-the-engine-routes-every-line-in-plain-forms)
- **How it works:**
  - [Placement: walls](../specs/placement.md#bands-bars-and-walls)
  - [Routing: walls](../specs/routing.md#walls)
  - [Text placement: wall labels](../specs/labels.md#wall-labels)
- **Why:** [029. Walls as space](../specs/decisions/029-walls-as-space.md)

**Stories:**

- An agent sets a wall between two parts, to keep them apart and let only named lines cross.

## F5.6: Notes

A short text attached to a box, a line or a group, to keep detail out of extra boxes.

```sh
grafical note add <file> --on <id> --text <text> [--footnote]
grafical note remove <file> --on <id>
```

- A note is a card beside its target, joined by a dotted line.
  - With `--footnote` it is a small number on the target, with the text in a numbered list at the bottom.
  - The file holds a footnote as `footnote: true`.
  - A card with no place beside its target clear of every box, line and text is refused as `label-blocked` ([041. The dirty work has edges](../specs/decisions/041-the-dirty-work-has-edges.md)).
  - The agent then shortens it or makes it a footnote.
- A target has one note, and adding another replaces it.
  - A note goes with its target.
- A note that takes more than four lines is an `overflow`.

- **Design:** [5. The engine routes every line, in plain forms](../DESIGNS.md#5-the-engine-routes-every-line-in-plain-forms)
- **How it works:** [Text placement: notes](../specs/labels.md#notes)
- **Why:** [030. Notes as callouts or footnotes](../specs/decisions/030-notes-as-callouts-or-footnotes.md)

**Stories:**

- An agent attaches a note, to keep detail out of extra boxes.
