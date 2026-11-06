# F1: Elements

```
F1: Elements
├── F1.1: Nodes — the parts of the system
│   ├── F1.1.1: Types and shapes — a box's kind sets its shape
│   ├── F1.1.2: Labels and sublabels — a label and a quieter sublabel
│   ├── F1.1.3: Sizes — sized to the text, or by a step
│   ├── F1.1.4: Marks — up to five small marks on a box
│   ├── F1.1.5: Marks by name — a mark from one bundled icon set
│   ├── F1.1.6: Emphasis — at most two boxes stand out
│   └── F1.1.7: Node looks — colors from the styles a node marks
├── F1.2: Edges — what connects to what
│   ├── F1.2.1: Types — a line's kind sets its style
│   ├── F1.2.2: Arrowheads at both ends — two-way lines
│   ├── F1.2.3: Weight — thicker lines for what matters more
│   ├── F1.2.4: Numbered steps — a number on a line
│   ├── F1.2.5: Ends at a group, a layer or a lane — one arrow to a whole system
│   └── F1.2.6: Edge looks — a color from the styles an edge marks
└── F1.3: Containers — what gathers boxes
    ├── F1.3.1: Groups — a system drawn as one frame
    ├── F1.3.2: Copying a group — a second zone in one operation
    ├── F1.3.3: Deeper nesting — up to five levels
    ├── F1.3.4: Lanes — bands that say who owns what
    ├── F1.3.5: Lanes both ways — a grid of lanes and phases
    ├── F1.3.6: Walls — space that lines cross only where allowed
    ├── F1.3.7: Notes — a short text on a box, a line or a group
    └── F1.3.8: Container looks — colors from the styles a group or a lane marks
```

What a diagram is made of. A node is a part of the system, an edge says that two things connect and how, and a container gathers nodes into systems, lanes and parts that lines keep apart. The agent says what each one is, and grafical gives it its shape.

## F1.1: Nodes

A node is a part of the system: a service, a store, a queue, a person or a step. The agent says what kind it is and what it is called, and grafical gives it its shape and its size. The agent can mark a node or make it stand out.

- **Design:**
  - [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
  - [9. The same file gives the same picture on any machine](../DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
  - [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **How it works:**
  - [The theme: fixed sizes and outlines](../specs/theme.md#fixed-sizes-and-outlines)
  - [Placement: sizes](../specs/placement.md#sizes)
  - [The text measurer](../specs/text.md)
  - [The renderer: marks](../specs/rendering.md#marks)
  - [The theme](../specs/theme.md)
- **Why:**
  - [006. Bundled fonts](../specs/decisions/006-bundled-fonts.md)
  - [014. Boxes sized to their text](../specs/decisions/014-boxes-sized-to-their-text.md)
  - [020. Every layered diagram type](../specs/decisions/020-every-layered-diagram-type.md)
  - [025. Marks of any kind](../specs/decisions/025-marks-of-any-kind.md)
  - [052. A choice is a small diamond](../specs/decisions/052-a-choice-is-a-small-diamond.md)
  - [077. A line meets a diamond at a corner](../specs/decisions/077-a-line-meets-a-diamond-at-a-corner.md)
  - [057. A box may take a look of its own](../specs/decisions/057-a-box-may-take-a-look-of-its-own.md)

**Stories:**

- An agent says what a node is, to get the shape a reader expects.
- An agent names a node and adds a port or a topic, to say more without another node.
- An agent leaves sizes to grafical or picks a step, to keep text inside its node.
- An agent marks a node that matters, to draw the reader's eye to it.
- An agent names an mark, to avoid finding a file for every node.
- An agent picks the one or two nodes to read first, to give the picture a start.
- An agent colors a node by what it means, to show a status and keep its shape.

### F1.1.1: Types and shapes

A node's kind says what it is and decides how it is drawn.

| Kind | Drawn as |
|---|---|
| `service` | a node |
| `store` | a cylinder |
| `queue` | a node in its own tint |
| `external` | a node with a dashed border |
| `actor` | a pill |
| `state` | a node with rounder corners |
| `terminal` | a tinted pill, a flowchart's start or end |
| `decision` | a diamond, its text in the middle |
| `initial` · `final` | a filled dot · a ringed dot |
| `choice` | a small diamond with no text |

- `initial` and `final` are a state machine's start and end.
- `choice` is where an edge splits into several, and the question goes on the edge into it.
- An edge meets a diamond only at a corner, and lines that come to one side join before it.
- The labels of `initial` and `final` and `choice` stay in the file and are not drawn.

```sh
grafical -f <file> node --kind <id> <kind>
```

A type of your own names a sort of node with its own shape and look. A change to it reaches every node of it.

```sh
grafical -f <file> type --add <id> --base <type> [--shape <shape>] [--fill <color>] [--border <color>]
grafical -f <file> node --type <id> <type>
```

- **Why:**
  - [087. A type holds attributes, and a group may follow a group](../specs/decisions/087-a-type-holds-attributes-and-a-group-may-follow-a-group.md)
  - [088. A type may choose its shape](../specs/decisions/088-a-type-may-choose-its-shape.md)

### F1.1.2: Labels and sublabels

A node has a label, and optionally a quieter sublabel, such as a port or a topic.

```sh
grafical -f <file> node --label <id> --label <text>
grafical -f <file> node --sublabel <id> [--text <text>]
```

- Labels wrap at spaces and hyphens and underscores and slashes.
  - Chinese text also wraps between characters.
- A label that still does not fit its node is refused as `overflow`, with the edges it takes and the most it may.
- A character the bundled fonts cannot draw is refused as `missing-glyph`.
- `describe` without `--text` clears the sublabel.

### F1.1.3: Sizes

A node is sized to its text, unless the agent gives it a size step.

```sh
grafical -f <file> node --size <id> [--size s|m|l]
grafical -f <file> diagram --sizing auto|fixed
```

- A node without a size is medium, or large when its text does not fit the medium node.
  - A rename that shortens the label shrinks it again.
- `resize` without `--size` returns the node to that.
- Every node in a layer is drawn as tall as the layer's tallest, so their tops line up.
  - Dots and diamonds keep their shapes.
- `sizing: fixed` turns this off: a node without a size is always medium, and text that does not fit is refused.
- A node may take a multiple of its width, its height or both, such as 1.5.
  - `grafical -f <file> node --size <id> [--width <n>] [--height <n>] [--times <n>]`
  - A taller node makes its layer taller.
  - A dot or a `choice` keeps its size and refuses a multiple.
  - Why: [080. A node takes multiples of its width and height](../specs/decisions/080-a-node-takes-multiples-of-its-width-and-height.md)

### F1.1.4: Marks

A node can carry up to five marks, such as `⚠️` on a node that matters, or `P0` on a badge.

```sh
grafical -f <file> node --mark <id> --slot <slot> [--icon <mark>] [--bg <color>] [--fg <color>] [--border <color>] [--shape <shape>] [--size s|m|l]
```

- A node has five slots of one mark each: `top-left` and `top-right` and `bottom-left` and `bottom-right` and `left`.
  - A diamond and a dot have corner slots only.
  - Without `--icon`, the slot is cleared.
- A mark is an emoji or a text of up to 6 characters or an SVG or PNG file inside the diagram's folder.
- A text mark sits on a badge.
  - `--bg` and `--fg` and `--border` take a color as `#rrggbb` or by name: `red` or `amber` or `green` or `blue` or `purple` or `gray` or `dark`.
  - `--shape` is `square`, `rounded` (the default) or `pill`.
  - Without `--fg`, grafical picks the light or dark text that reads better.
- `--size` is `s` or `m` or `l` for any mark: 16 or 20 or 28 px high.
  - `m` is the default.
- A corner mark sits centred on its corner and moves nothing else.
  - The `left` mark takes a column inside the node, and the text gives up that width.
- A mark file that changes or goes missing fails the load (`mark-file-changed`, `mark-file-not-found`).
  - Setting the slot again accepts the file as it is.
  - An SVG with a script or an event handler or an outside reference is refused as `mark-file-unsafe`.
  - A path outside the diagram's folder is refused as `mark-file-outside`.
- An emoji with no image is refused as `mark-not-drawn`.
  - A mark that covers text or another node is a defect, `mark-covers`.

A corner mark is not yet checked against the edges that leave the node near its corner.

### F1.1.5: Marks by name

A mark taken by name from one mark set that grafical bundles, so that an agent need not find a file for every node.

```sh
grafical -f <file> node --mark <id> --slot <slot> --icon <set>:<name>
```

- The set is a permissively licensed one, such as Lucide (ISC) or Tabler (MIT).
  - A cloud vendor's own marks stay files the agent brings.
- An unknown name is refused, with `near` and `likely`.

### F1.1.6: Emphasis

At most two nodes stand out, as what a reader should see first.

```sh
grafical -f <file> node --emphasize <id> [--off]
```

### F1.1.7: Node looks

A node takes its colors from the styles it marks, so that a color says something without changing the shape.

```sh
grafical -f <file> style --add <id> [--fill <color>] [--border <color>] [--border-width <n>]
grafical -f <file> node --style <id> <styles...>
```

- A color is `#` and hex digits.
- A node may mark several styles, and a later one overrides an earlier one.
- `node --style` with no styles clears them.
- A style the diagram lacks is refused as `unknown-style`.
- The shape stays the type's.

- **Why:**
  - [057. A box may take a look of its own](../specs/decisions/057-a-box-may-take-a-look-of-its-own.md)
  - [089. A style may be as rich as it likes](../specs/decisions/089-a-style-may-be-as-rich-as-it-likes.md)

## F1.2: Edges

An edge says that two things connect and how. The agent states its ends, its kind, its label, its weight and its step number. An end may be a whole group, layer or lane instead of one node.

- **Design:**
  - [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
  - [5. The engine routes every edge, in plain forms](../DESIGNS.md#5-the-engine-routes-every-edge-in-plain-forms)
  - [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **How it works:**
  - [The renderer: how lines are drawn](../specs/rendering.md#how-lines-are-drawn)
  - [The theme: line weights](../specs/theme.md#line-weights)
  - [Text placement: step badges](../specs/labels.md#step-badges)
  - [Routing: lines that end at a container](../specs/routing.md#lines-that-end-at-a-container)
  - [Placement: bands, bars and walls](../specs/placement.md#bands-bars-and-walls)
- **Why:**
  - [015. Lines that end at containers](../specs/decisions/015-lines-that-end-at-containers.md)
  - [019. Lines meet any side](../specs/decisions/019-lines-meet-any-side.md)
  - [026. Edge weights](../specs/decisions/026-edge-weights.md)
  - [038. A row with no box as one bar](../specs/decisions/038-a-row-with-no-box-as-one-bar.md)
  - [078. A bar may cross a group](../specs/decisions/078-a-bar-may-cross-a-group.md)
  - [039. Step badges ride the line](../specs/decisions/039-step-badges-ride-the-line.md)

**Stories:**

- An agent says what an edge means, to get the style a reader expects.
- An agent marks an edge both ways, to show a call that answers.
- An agent thickens the main path, to make it the first thing a reader follows.
- An agent numbers the edges of a request, to let a reader follow it in order.
- An agent points an edge at a whole system, to avoid one arrow per part.

### F1.2.1: Types

An edge's kind says what it means and decides its style.

| Kind | Drawn as | Means |
|---|---|---|
| `call` | solid, with an arrowhead | a call |
| `data` | solid, with an arrowhead | a data read |
| `async` | dashed, with an arrowhead | a message through a queue |
| `optional` | dotted, with an arrowhead | a call that happens only sometimes |
| `link` | plain, with no arrowhead | related, with no direction |

**Commands:**

- `grafical -f <file> edge --add <from> <to> [--id <id>] [--label <text>] [--type <kind>] [--both] [--pass]`
- `grafical -f <file> edge --kind <id> <kind>`
- `grafical -f <file> edge --label <id> [--label <text>]`
- `grafical -f <file> edge --reverse <id>`
- `grafical -f <file> edge --ends <id> [--from <end>] [--to <end>]`
- `grafical -f <file> edge --remove <id>`

- `relabel` without `--label` clears the label.
  - `retarget` moves one or both ends and keeps the edge's ID, kind and label.

### F1.2.2: Arrowheads at both ends

An edge can carry an arrowhead at each end, for a call that answers.

```sh
grafical -f <file> edge --both <id> [--off]
```

A `link` takes no arrowheads, so `both` on a link is refused as `both-on-link`.

### F1.2.3: Weight

Some edges are thicker than others, to say they matter more.

```sh
grafical -f <file> edge --weight <id...> [--weight <level|pixels>]
grafical -f <file> edge --emphasize <id...> [--off]
```

- A weight is a level or a width from 0.5 to 8 px.
  - The levels are `thin`, `thick` and `heavy`.
  - The built-in themes draw the levels 1.25, 2.5 and 4 px wide.
- Without `--weight`, the edge is thin again.
- `emphasize` makes an edge `thick`, the main path.
- A stylesheet may retune the levels and add more, such as `critical`.
  - A level the stylesheet lacks is refused as `unknown-weight`, with the allowed names.
- The arrowhead grows with the width.

### F1.2.4: Numbered steps

A number on an edge, so that a reader can follow a request or a process in order.

```sh
grafical -f <file> edge --number <id> [--n <number>]
```

- The agent states each number, a whole number from 1 to 99.
  - grafical draws it as a small ring on the edge, under the start of its label.
  - grafical never numbers or renumbers: lines may share a number and numbers may skip.
  - `show` adds `[step <n>]` to the edge, and `show --drawn` adds `step=<n>` to its record.
- Without `--n`, the step is cleared.
  - In a batch: `{op: edge.step, id: <line>, n: <number>}`.
- A numbered line keeps its own port as a labelled one does.
  - It never joins a bundle.

### F1.2.5: Ends at a group, a layer or a lane

One arrow can point at a whole system instead of each of its parts.

- Either end of an edge may be a node or a group or a layer or a lane.
  - A layer an edge ends at is drawn as a band with its label above it.
  - A band in a lane of the same name draws the name once.
  - An edge meets the band straight past its other end where nothing is in the way.
- A layer with no node may be an end too, when the other end holds a node: a gateway or a message bus that every request passes.
  - It is drawn as one 40 px bar across the content with its label at the left ([038. A row with no box as one bar](../specs/decisions/038-a-row-with-no-box-as-one-bar.md)).
  - Each edge meets it straight past its other end.
- An edge that passes a bar without ending at it is refused (`bar-crossed`) unless it may: `edge --add --pass`, or `edge --pass <file> <id> [--off]` for an edge already drawn.
  - It then names the bar in `passes`.
  - A layer with no node and a look is a bar too, though no edge ends at it ([F2.2: Layers and order](F2-layout.md#f22-layers-and-order)).
- An end may not lie inside the other (`edge-inside`).
  - A group or a lane end must hold a node (`empty-container`).
  - An end that shares a layer with a group must sit right beside it there (`edge-blocked`).
  - An edge between two layers with no node is refused (`bar-to-bar`), and so is a bar between the first and last layers of a group (`bar-in-group`).
- Two lanes are never the two ends of one edge (`lane-to-lane`).
- Removing a group or a lane removes the edges that end at it.

### F1.2.6: Edge looks

An edge takes its color from the styles it marks, so that a color says something about one path.

```sh
grafical -f <file> style --add <id> --color <color>
grafical -f <file> edge --style <id> <styles...>
```

- The arrowhead takes the color too.
- A dash stays the type's.

- **Why:** [081. An edge may take a color of its own](../specs/decisions/081-an-edge-may-take-a-color-of-its-own.md)

## F1.3: Containers

Nodes are gathered into systems, lanes and parts that lines keep apart. A group draws a frame around a system, a lane says who owns what, a wall keeps two parts apart and a note holds detail beside its target.

- **Design:**
  - [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
  - [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
  - [5. The engine routes every edge, in plain forms](../DESIGNS.md#5-the-engine-routes-every-edge-in-plain-forms)
- **How it works:**
  - [Placement: groups](../specs/placement.md#groups)
  - [Text placement: group titles](../specs/labels.md#group-titles)
  - [The model](../specs/model.md)
  - [Placement: lanes](../specs/placement.md#lanes)
  - [Text placement: lane labels](../specs/labels.md#bands-bars-and-lanes)
  - [Placement: walls](../specs/placement.md#bands-bars-and-walls)
  - [Routing: walls](../specs/routing.md#walls)
  - [Text placement: wall labels](../specs/labels.md#wall-labels)
  - [Text placement: notes](../specs/labels.md#notes)
- **Why:**
  - [003. Rows unseen, groups as systems](../specs/decisions/003-rows-unseen-groups-as-systems.md)
  - [018. Swimlanes run one way](../specs/decisions/018-swimlanes-run-one-way.md)
  - [029. Walls as space](../specs/decisions/029-walls-as-space.md)
  - [030. Notes as callouts or footnotes](../specs/decisions/030-notes-as-callouts-or-footnotes.md)
  - [037. A group copy holds its inside](../specs/decisions/037-a-group-copy-holds-its-inside.md)
  - [040. The agent states where a group's label sits](../specs/decisions/040-the-agent-states-where-a-group-s-label-sits.md)

**Stories:**

- An agent groups nodes into a system, to show which parts belong together.
- An agent copies a group with its edges, to draw a second region or shard in one step.
- An agent nests groups five deep, to draw a cloud's account down to its subnet.
- An agent sets lanes, to show who owns which step.
- An agent crosses lanes with phases, to show who does what and when.
- An agent sets a wall between two parts, to keep them apart and let only named lines cross.
- An agent attaches a note, to keep detail out of extra nodes.

### F1.3.1: Groups

A group is a system, drawn as one node around its members, which may sit in several layers.

**Commands:**

- `grafical -f <file> group --add <id> --label <text> [--sublabel <text>] [--nodes a,b,c] [--in <group>]`
- `grafical -f <file> group --join <group> <node or group...>`
- `grafical -f <file> group --leave <node or group...> [--up]`
- `grafical -f <file> group --label <id> --label <text>`
- `grafical -f <file> group --sublabel <id> [--text <text>]`
- `grafical -f <file> group --label-at <id> [top-left|top|top-right|left|right|bottom-left|bottom|bottom-right|outside-top|outside-bottom|outside-left|outside-right]`
- `grafical -f <file> group --order <id> --before <group> | --after <group>`
- `grafical -f <file> group --remove <id> [--out]`

- A group's node spans every layer from its top member to its bottom one.
  - The other nodes of those layers sit beside it, and nothing else lies inside it.
- Groups nest, up to three levels (`group-too-deep`).
  - A group inside itself is refused as `group-cycle`.
- `join` moves a node out of its previous group, and also moves a whole group into another.
  - `leave` takes members out of every group, or with `--up` one level out.
- `group --label-at` (or `group --label`) says where the group's label sits.
  - It takes one of these places:
    - In its head: at the left, the middle or the right.
    - In a foot below its last layer: at the left, the middle or the right.
      - A foot takes the head's room, and the head keeps only its padding.
    - Just outside its top or bottom side, centred.
    - Beside its layers at the middle height, inside or outside its left or right side.
  - It sits exactly there and takes only its own room: no node and no edge moves for it.
  - An edge that comes near it refuses the write as `title-blocked`, naming the edges and the places where none would.
  - Without a place the engine seats the label at the leftmost spot of the head that no edge comes near.
  - Where an edge comes near every spot, the write is refused as `title-blocked` too ([040. The agent states where a group's label sits](../specs/decisions/040-the-agent-states-where-a-group-s-label-sits.md)).
- `group --order` puts a group's nodes before or after another group's as one block in every layer the two share.
  - The nodes of its inner groups move with it.
  - A group ordered beside itself or beside a group around or inside it is refused as `bad-reference`.
- `remove` keeps the members: they move into the group around it, or with `--out` out of every group.
  - Lines that end at the group go with it.
- A node inside a node takes the canvas's fill, so the fills alternate by depth.
  - A stylesheet may set `paint.nesting: shade` instead.

### F1.3.2: Copying a group

A second zone, region or shard in one operation.

```sh
grafical -f <file> group --copy <id> <into> --label <text> --suffix <suffix> --before <group> | --after <group> [--outside]
```

- The copy holds the group's inner groups, its nodes and the edges between them.
  - It sits in the group the original sits in.
  - Every id it makes ends in the suffix except `<into>`.
  - An edge id `<from>-><to>` follows its copied ends.
- `--outside` also copies the edges between the group and everything outside it, their inside end moved to the copy.
- Each copied node sits in its original's layer.
  - It keeps its original's label and kind and size and marks and lane and column.
  - `--before` or `--after` puts the copy before or after a group in every layer of the copy as `group --order` does ([033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md)).
  - A group with no node in one of those layers is refused as `no-shared-layer`.
- An alignment or steps to a node outside the group are refused as `copy-conflict` ([037. A group copy holds its inside](../specs/decisions/037-a-group-copy-holds-its-inside.md)).
  - So is a lane or a column that would move the copy from its place.
  - The refusal names the node.
  - Notes and walls are not copied.

### F1.3.3: Deeper nesting

Groups nest up to five levels instead of three, as a cloud's account, region, network, zone and subnet do.

### F1.3.4: Lanes

A lane is a labelled band that says who owns what. A diagram's lanes all run one way, as layers or as columns.

**Commands:**

- `grafical -f <file> lane --add <id> --label <text> [--members a,b]`
- `grafical -f <file> lane --join <lane> <member...>`
- `grafical -f <file> lane --leave <member...>`
- `grafical -f <file> lane --label <id> --label <text>`
- `grafical -f <file> lane --remove <id>`

- Layers as members make lanes that run as layers, with the label on the left.
  - Nodes as members make lanes that run as columns, with the label on top.
  - A group stands for its layers or nodes.
  - Both in one diagram is refused as `lane-mixed`.
- A layer lane's layers must be neighbours (`lane-gap`), and a layer added between two layers of a lane joins it.
- Column lanes go left to right in creation order, and every layer keeps that order.
  - A node outside every lane sits right of the lanes, or left of them when it comes first in its layer.
- A group lies inside one lane (`group-across-lanes`).
- `lane --remove` keeps the members and removes the edges that end at the lane.

### F1.3.5: Lanes both ways

Lanes that run as layers and lanes that run as columns in one diagram, as a grid of lanes and phases.

### F1.3.6: Walls

Empty space between two parts of a picture, which lines cross only where the wall allows.

**Commands:**

- `grafical -f <file> wall --add <id> --between a,b --and c,d [--allow e,f] [--label <text>]`
- `grafical -f <file> wall --allow <id> <allow...> [--off]`
- `grafical -f <file> wall --label <id> [--label <text>]`
- `grafical -f <file> wall --remove <id>`

- Each side is a list of nodes and groups.
  - When one side lies above the other, the wall runs across.
  - When they sit side by side in their layers, it runs up and down.
  - Otherwise it is refused as `wall-sides`, and so is a node on both sides.
- A wall is only as long as its two sides need.
- An edge from one side to the other is refused as `wall-crossed`.
  - `allow` lets it cross by naming the edge or a node or group at one of its ends, such as a gateway.
  - Any other edge drawn through the wall is a defect with the same code.
- Without a label, a wall is invisible: only its space shows.
  - With a label, it draws a dashed divider through its middle.
  - The label sits along it at the first place no edge comes near.
  - Where none is, the write is refused as `label-blocked` ([063. A wall's label stays along its wall](../specs/decisions/063-a-wall-s-label-stays-along-its-wall.md)).
  - `wall --label` changes the label, or drops it without `--label`.
- A node or group that is removed leaves the wall's sides, and a wall left with an empty side goes.

### F1.3.7: Notes

A short text attached to a node, an edge or a group, to keep detail out of extra nodes.

```sh
grafical -f <file> note --add --on <id> --text <text> [--footnote]
grafical -f <file> note --remove --on <id>
```

- A note is a card beside its target, joined by a dotted line.
  - With `--footnote` it is a small number on the target, with the text in a numbered list at the bottom.
  - The file holds a footnote as `footnote: true`.
  - A card with no place beside its target clear of every node, line and text is refused as `label-blocked` ([064. A note is what the agent states](../specs/decisions/064-a-note-is-what-the-agent-states.md)).
  - The agent then shortens it or makes it a footnote.
- A target has one note, and adding another replaces it.
  - A note goes with its target.
- A note that takes more than four edges is an `overflow`.

### F1.3.8: Container looks

A group or a lane takes its colors from the styles it marks, so that color tells one system from another.

```sh
grafical -f <file> group --style <id> <styles...>
grafical -f <file> lane --style <id> <styles...>
```

- **Why:** [083. A group or a lane may take a look of its own](../specs/decisions/083-a-group-or-a-lane-may-take-a-look-of-its-own.md)
