# F3: Lines

```
F3: Lines
├── F3.1: Kinds — a line's kind sets its style
├── F3.2: Arrowheads at both ends — two-way lines
├── F3.3: Weight — thicker lines for what matters more
├── F3.4: Numbered steps — a number on a line
├── F3.5: Ends at a group, a row or a lane — one arrow to a whole system
└── F3.6: How lines are drawn — grafical routes every line
```

A line says that two things connect and how. The agent states its ends, its kind, its label, its weight and its step number, and grafical draws every line through the gaps between boxes. An end may be a whole group, row or lane instead of one box.

## F3.1: Kinds

A line's kind says what it means and decides its style.

| Kind | Drawn as | Means |
|---|---|---|
| `call` | solid, with an arrowhead | a call |
| `data` | solid, with an arrowhead | a data read |
| `async` | dashed, with an arrowhead | a message through a queue |
| `optional` | dotted, with an arrowhead | a call that happens only sometimes |
| `link` | plain, with no arrowhead | related, with no direction |

**Commands:**

- `grafical edge add <file> <from> <to> [--id <id>] [--label <text>] [--kind <kind>] [--both] [--pass]`
- `grafical edge kind <file> <id> <kind>`
- `grafical edge relabel <file> <id> [--label <text>]`
- `grafical edge reverse <file> <id>`
- `grafical edge retarget <file> <id> [--from <end>] [--to <end>]`
- `grafical edge remove <file> <id>`

- `relabel` without `--label` clears the label.
  - `retarget` moves one or both ends and keeps the line's ID, kind and label.

- **Design:** [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [The renderer: how lines are drawn](../specs/rendering.md#how-lines-are-drawn)
- **Why:** [019. Lines meet any side](../specs/decisions/019-lines-meet-any-side.md)

**Stories:**

- An agent says what a line means, to get the style a reader expects.

## F3.2: Arrowheads at both ends

```sh
grafical edge both <file> <id> [--off]
```

A `link` takes no arrowheads, so `both` on a link is refused as `both-on-link`.

- **Design:** [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [The theme: line weights](../specs/theme.md#line-weights)

**Stories:**

- An agent marks a line both ways, to show a call that answers.

## F3.3: Weight

Some lines are thicker than others, to say they matter more.

```sh
grafical edge weight <file> <id...> [--weight <level|pixels>]
grafical edge emphasize <file> <id...> [--off]
```

- A weight is a level or a width from 0.5 to 8 px.
  - The levels are `thin`, `thick` and `heavy`.
  - The built-in themes draw the levels 1.25, 2.5 and 4 px wide.
- Without `--weight`, the line is thin again.
- `emphasize` makes a line `thick`, the main path.
- A stylesheet may retune the levels and add more, such as `critical`.
  - A level the stylesheet lacks is refused as `unknown-weight`, with the allowed names.
- The arrowhead grows with the width.

- **Design:** [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [The theme: line weights](../specs/theme.md#line-weights)
- **Why:** [026. Edge weights](../specs/decisions/026-edge-weights.md)

**Stories:**

- An agent thickens the main path, to make it the first thing a reader follows.

## F3.4: Numbered steps

A number on a line, so that a reader can follow a request or a process in order.

```sh
grafical edge step <file> <id> [--n <number>]
```

- The agent states each number, a whole number from 1 to 99.
  - grafical draws it as a small ring on the line, under the start of its label.
  - grafical never numbers or renumbers: lines may share a number and numbers may skip.
  - `show` adds `[step <n>]` to the line, and `show --drawn` adds `step=<n>` to its record.
- Without `--n`, the step is cleared.
  - In a batch: `{op: edge.step, id: <line>, n: <number>}`.
- A numbered line keeps its own port as a labelled one does.
  - It never joins a bundle.

- **Design:** [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
- **How it works:** [Text placement: step badges](../specs/labels.md#step-badges)
- **Why:** [039. Step badges ride the line](../specs/decisions/039-step-badges-ride-the-line.md)

**Stories:**

- An agent numbers the lines of a request, to let a reader follow it in order.

## F3.5: Ends at a group, a row or a lane

One arrow can point at a whole system instead of each of its parts.

- Either end of a line may be a box · a group · a row · a lane.
  - A row a line ends at is drawn as a band with its label above it.
  - A line meets the band straight past its other end where nothing is in the way.
- A row with no box may be an end too, when the other end holds a box: a gateway or a message bus that every request passes.
  - It is drawn as one 40 px bar across the content with its label at the left ([038. A row with no box as one bar](../specs/decisions/038-a-row-with-no-box-as-one-bar.md)).
  - Each line meets it straight past its other end.
- A line that passes a bar without ending at it is refused (`bar-crossed`) unless it may: `edge add --pass`, or `edge pass <file> <id> [--off]` for a line already drawn.
  - It then names the bar in `passes`.
  - A row with no box and a look is a bar too, though no line ends at it ([F4.1: Rows and order](F4-placing.md#f41-rows-and-order)).
- An end may not lie inside the other (`edge-inside`).
  - A group or a lane end must hold a box (`empty-container`).
  - An end that shares a row with a group must sit right beside it there (`edge-blocked`).
  - A line between two rows with no box is refused (`bar-to-bar`), and so is a bar between the first and last rows of a group (`bar-in-group`).
- Two lanes are never the two ends of one line (`lane-to-lane`).
- Removing a group or a lane removes the lines that end at it.

- **Design:** [5. The engine routes every line, in plain forms](../DESIGNS.md#5-the-engine-routes-every-line-in-plain-forms)
- **How it works:**
  - [Routing: lines that end at a container](../specs/routing.md#lines-that-end-at-a-container)
  - [Placement: bands, bars and walls](../specs/placement.md#bands-bars-and-walls)
- **Why:**
  - [015. Lines that end at containers](../specs/decisions/015-lines-that-end-at-containers.md)
  - [038. A row with no box as one bar](../specs/decisions/038-a-row-with-no-box-as-one-bar.md)

**Stories:**

- An agent points a line at a whole system, to avoid one arrow per part.

## F3.6: How lines are drawn

The agent says what connects. grafical draws every line.

- A line is made of horizontal and vertical runs through the gaps between rows and boxes, never through a box or across text.
- A line may leave or enter a box on any side.
  - Each line has its own place on a side, spread evenly.
- Three or more unlabelled lines of one style that leave one side of a box leave as one line and split near their targets, with a dot at each split.
  - Labelled lines and two-way lines keep their own place.
- Where two lines cross, one hops over the other.
  - Where lines join on purpose, a dot marks the join.
- A label sits beside its line.
  - When there is no room, it wraps or moves to another gap on its way.
  - Where no gap on its way has room, no line moves for it and the write is refused as `label-blocked` ([041. The dirty work has edges](../specs/decisions/041-the-dirty-work-has-edges.md)).
  - The refusal names the line, the lines across the label and the gaps it tried.
  - `node resize` is among the commands that can change it.
  - grafical never widens a box for its lines.
  - A step's number is refused the same way.
- A stylesheet may draw the corners curved, with `paint.edge.shape: curved`.
  - The routes stay the same.

- **Design:** [5. The engine routes every line, in plain forms](../DESIGNS.md#5-the-engine-routes-every-line-in-plain-forms)
- **How it works:**
  - [Routing](../specs/routing.md#the-steps)
  - [Text placement: line labels](../specs/labels.md#line-labels)
- **Why:**
  - [005. Our own gap router](../specs/decisions/005-our-own-gap-router.md)
  - [019. Lines meet any side](../specs/decisions/019-lines-meet-any-side.md)
  - [023. Fan-outs of three bundle](../specs/decisions/023-fan-outs-of-three-bundle.md)
  - [041. The dirty work has edges](../specs/decisions/041-the-dirty-work-has-edges.md)
  - [051. A label sits on its straight vertical line](../specs/decisions/051-a-label-sits-on-its-straight-vertical-line.md)

**Stories:**

- An agent states what connects, to get lines that avoid boxes and text without drawing any.
