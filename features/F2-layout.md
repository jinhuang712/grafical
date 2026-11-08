# F2: Layout

```
F2: Layout
├── F2.1: Placing every node — grafical gives every node its place
├── F2.2: Layers and order — a node's layer and its place in it
├── F2.3: Alignment — one node above or below another
├── F2.4: Columns — a second placement fact beside layers
│   └── F2.4.1: Column headings — a label above a column
├── F2.5: Steps from another node — a node some cells from another
│   └── F2.5.1: Offsets — a node a fraction of a cell off the grid
├── F2.6: Spacing — compact, normal or airy
│   └── F2.6.1: Region gaps — more room between two regions
├── F2.7: How edges are drawn — grafical routes every edge
│   ├── F2.7.1: Edge sides — the side an edge leaves or enters by
│   ├── F2.7.2: Edge shapes — square or round
│   ├── F2.7.3: Labels on edges — an edge carries its label
│   ├── F2.7.4: Steering an edge — where an edge passes and turns, as facts
│   └── F2.7.5: Clean edges — the rules set on 2026-11-07
└── F2.8: Flow direction — a diagram that reads left to right
```

Where everything goes. The agent states places as facts and never as positions, and grafical turns those facts into a picture with every node placed and every edge drawn, again after every change.

## F2.1: Placing every node

The agent never places a node. grafical works out every node's place and size from the facts, and works them out again after every write.

- Every node takes a column of one grid that all layers share, so nodes in different layers line up.
- The layers stack from the top, with a gutter below each as tall as its edges need.
- A change keeps every fact it does not name, and nodes may shift sideways.
- The file holds no position, so there is nothing to keep in step.

- **Stance:** [What does a change do?](../PHILOSOPHY.md#what-does-a-change-do)
- **Design:**
  - [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
  - [4. A change keeps every fact it does not name](../DESIGNS.md#4-a-change-keeps-every-fact-it-does-not-name)
- **How it works:** [Placement](../specs/placement.md)
- **Why:**
  - [002. Facts over coordinates](../specs/decisions/002-facts-over-coordinates.md)
  - [004. Layout computed again on every change](../specs/decisions/004-layout-computed-again-on-every-change.md)

**Stories:**

- An agent states facts, to get a laid-out picture without computing one position.

## F2.2: Layers and order

A node sits in a layer, in an order. A layer only places, and is not drawn unless it has a look or an edge ends at it.

- **Commands:**
  - [`layer`](../CLI.md#layer)
  - [`node`](../CLI.md#node)

- A new layer goes to the bottom unless `--before` or `--after` places it.
- A node added to a layer or moved into another layer says where it goes: `--first` or `--last` or `--before` or `--after`.
  - Without one it is refused as `missing-field`, with the layer and the nodes in it.
  - Only the first node of an empty layer needs none ([033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md)).
- A layer's label is optional.
  - It is drawn only with the layer: in a band's head, or in a bar.
  - A drawn layer with no label draws no name.
  - A band without one has no head ([046. A layer's label is optional](../specs/decisions/046-a-layer-s-label-is-optional.md)).
- `layer --split` moves the second half of a layer into a new layer below it.
  - With `--from <node>` it moves the nodes from that node on.
- A layer can be removed only when it is empty, and the edges that end at it go with it.
- `layer --look` draws a layer and its label even when no edge ends at it.
  - `box` draws it with a node's paint and a dark label.
  - `band` draws it with the band's light fill and grey label.
  - Without a look, a layer is drawn only when an edge ends at it.
  - Then a layer with no node is drawn as a bar and a layer with nodes as a band.
  - A layer with no node and a look is a bar and is checked as one ([045. A layer with a look is drawn](../specs/decisions/045-a-layer-with-a-look-is-drawn.md)).
  - An edge that passes it needs `--pass` (`bar-crossed`).
  - It may not lie between the first and last layers of a group (`bar-in-group`).
  - Taking the look away with `layer --look` clears `bar-in-group`.

- **Stance:** [What may the agent set?](../PHILOSOPHY.md#what-may-the-agent-set)
- **Design:**
  - [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
  - [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
- **How it works:**
  - [The model](../specs/model.md)
  - [Placement: the column grid](../specs/placement.md#the-column-grid)
- **Why:**
  - [003. Layers unseen, groups as systems](../specs/decisions/003-layers-unseen-groups-as-systems.md)
  - [033. The agent states every order](../specs/decisions/033-the-agent-states-every-order.md)
  - [045. A layer with a look is drawn](../specs/decisions/045-a-layer-with-a-look-is-drawn.md)
  - [046. A layer's label is optional](../specs/decisions/046-a-layer-s-label-is-optional.md)

**Stories:**

- An agent states each node's layer and order, to decide the story's layout in facts.

## F2.3: Alignment

A node sits directly above or below a node in another layer.

- **Commands:** [`node`](../CLI.md#node)

- It joins its target's column to sit there.
- An alignment that cannot hold with the order of either layer is refused as `alignment-conflict`.
- Without `--to` the alignment is cleared.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: alignment](../specs/placement.md#alignment)
- **Why:** [002. Facts over coordinates](../specs/decisions/002-facts-over-coordinates.md)

**Stories:**

- An agent aligns two nodes in different layers, to give an edge between them a straight run.

## F2.4: Columns

A second placement fact beside layers. Nothing is drawn: a column is a guide.

- **Commands:** [`column`](../CLI.md#column)

- Every node of a column sits left of every node of the next column in all layers.
  - At least a layer's gap lies between them.
  - Columns go left to right in the order they were added, unless placed `--before` or `--after` another.
- A group as a member brings its nodes.
  - A node in no column keeps its place beside the node left of it.
- An order that another fact contradicts is refused as `column-order`, naming two nodes whose order cannot hold.
- A diagram has columns or lanes that run as columns, not both (`column-lanes`).
- Removing a column leaves its nodes where they are.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: columns](../specs/placement.md#columns)
- **Why:**
  - [027. Columns beside layers](../specs/decisions/027-columns-beside-layers.md)
  - [035. Columns hold across layers](../specs/decisions/035-columns-hold-across-layers.md)
  - [056. A column may carry a heading](../specs/decisions/056-a-column-may-carry-a-heading.md)

**Stories:**

- An agent sets columns, to keep nodes of different layers in one left-to-right order.

### F2.4.1: Column headings

A column may carry a heading above its first layer, such as a quarter.

- **Commands:** [`column`](../CLI.md#column)

- An edge that comes near a heading refuses the write.

- **Why:** [056. A column may carry a heading](../specs/decisions/056-a-column-may-carry-a-heading.md)

## F2.5: Steps from another node

A node in no layer, placed some cells of the grid from another node.

- **Commands:** [`node`](../CLI.md#node)

- Each step is a whole number from 1 to 10, and at least one is given.
  - A step is one cell of the grid: a layer down or up, a column left or right.
- The node moves with the node it steps from, which may itself be placed by steps.
- Past the first or last layer, the node lands in a layer grafical adds.
  - `show --drawn` names that layer `-`.
  - The nodes of a layer it lands in stand aside.
- A cell another fact keeps is refused as `step-blocked`, a node that steps from itself as `step-cycle`.
  - Steps combined with a layer or a position or an alignment or a column or a lane are refused as `conflicting-position`.
- `node --move --layer` puts the node back in a layer.
  - `node --move` with steps and no `--from` keeps the node it steps from, and with `--from` alone keeps the steps.
- A node wholly beside every node it connects to is a warning, `node-aside`.
  - The warning names those nodes.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: steps from another node](../specs/placement.md#steps-from-another-node)
- **Why:**
  - [031. Steps from another node](../specs/decisions/031-steps-from-another-node.md)
  - [032. Who chose is punished](../specs/decisions/032-who-chose-is-punished.md)

**Stories:**

- An agent places a node some steps from another, to draw a staircase or a side path.

### F2.5.1: Offsets

A node snaps to its cell, unless an agent takes it off with a fraction of a cell. Across, down or both make a diagonal.

- The fraction is 0.25, 0.5 or 0.75.
- The offset is measured from the grid and never from a node.
- An offset that overlaps anything refuses the write.
- No other node moves for it.
- It waits for the router, which lays its tracks with no idea that a node sits in a gutter: [The router is not smart enough](../plan/TODO.md#p1discussion-the-router-is-not-smart-enough).

- **Why:** [093. A node may sit off its cell by a fraction](../specs/decisions/093-a-node-may-sit-off-its-cell-by-a-fraction.md)

## F2.6: Spacing

A diagram's spacing is compact, normal or airy, and it changes nothing else.

- **Commands:** [`diagram`](../CLI.md#diagram)

- **Design:** [4. A change keeps every fact it does not name](../DESIGNS.md#4-a-change-keeps-every-fact-it-does-not-name)
- **How it works:** [Placement: layers down the page](../specs/placement.md#layers-down-the-page)
- **Why:** [004. Layout computed again on every change](../specs/decisions/004-layout-computed-again-on-every-change.md)

**Stories:**

- An agent picks a density, to trade size for air.

### F2.6.1: Region gaps

The gap between two neighbouring regions may be magnified, by a multiple of its default. A region is a layer, a group or a column, and both must be of one kind.

- **Commands:** [`gap`](../CLI.md#gap)

- A multiple may be 1.25, 1.5 or 2.
- It follows the density, so a multiple of a compact gap stays narrower than one of an airy gap.
- Without `--magnified`, the gap goes back to its default.
- Two regions that are not neighbours of one kind are refused as `not-neighbours`.
- Two groups are neighbours when a node of one stands next to a node of the other in a layer, or when one ends in the layer above the other's first.
- A gap whose regions stop being neighbours stays stated and does nothing, and a gap goes when its region goes.

- **Why:** [079. The gap between two regions may be magnified](../specs/decisions/079-the-gap-between-two-regions-may-be-magnified.md)

**Stories:**

- An agent opens the gap between two layers, to settle one crowded place.

## F2.7: How edges are drawn

The agent says what connects. grafical draws every edge.

- An edge is made of horizontal and vertical runs through the gaps between layers and nodes, never through a node or across text.
- An edge may leave or enter a node on any side.
  - Each edge has its own place on a side, spread evenly.
- Three or more unlabelled edges of one style that leave one side of a node leave as one edge and split near their targets, with a dot at each split.
  - Labelled edges and two-way edges keep their own place.
- Where two edges cross, one hops over the other.
  - Where edges join on purpose, a dot marks the join.
- A label sits on its edge and the edge passes through it, unless the agent takes it off.
  - With no room on the edge it has three ways: it sits beside the edge · it wraps · it moves to another gap on its way.
  - Where no gap on its way has room, no edge moves for it and the write is refused as `label-blocked` ([061. An edge never moves for its label](../specs/decisions/061-an-edge-never-moves-for-its-label.md)).
  - The refusal names the edge, the edges across the label and the gaps it tried.
  - `node --size` is among the commands that can change it.
  - grafical never widens a node for its edges.
  - A step's number is refused the same way.
- A stylesheet may draw the corners curved, with `paint.edge.shape: curved`.
  - The routes stay the same.
- grafical never widens a column gap for an edge: the agent does it with `gap --between`.

- **Design:** [5. The engine routes every edge, in plain forms](../DESIGNS.md#5-the-engine-routes-every-edge-in-plain-forms)
- **How it works:**
  - [Routing](../specs/routing.md#the-steps)
  - [Text placement: edge labels](../specs/labels.md#edge-labels)
- **Why:**
  - [005. Our own gap router](../specs/decisions/005-our-own-gap-router.md)
  - [019. Edges meet any side](../specs/decisions/019-edges-meet-any-side.md)
  - [023. Fan-outs of three bundle](../specs/decisions/023-fan-outs-of-three-bundle.md)
  - [061. An edge never moves for its label](../specs/decisions/061-an-edge-never-moves-for-its-label.md)
  - [051. A label sits on its straight vertical edge](../specs/decisions/051-a-label-sits-on-its-straight-vertical-edge.md)
  - [065. Unreadable is refused and costly is reported](../specs/decisions/065-unreadable-is-refused-and-costly-is-reported.md)
  - [095. A good route is one the eye can follow](../specs/decisions/095-a-good-route-is-one-the-eye-can-follow.md)

**Stories:**

- An agent states what connects, to get edges that avoid nodes and text without drawing any.

### F2.7.1: Edge sides

An agent may state the side an edge leaves by or enters by. A side left unstated stays grafical's.

- **Commands:** [`edge`](../CLI.md#edge)

- A side the command does not name stays as it was.
- Without `--out` or `--in`, the edge's sides are grafical's again.
- Where the edge cannot go by the stated side, the write is refused as `side-blocked`.
  - It gives the stated side and the side it would have drawn.
- A side that faces away from the other end takes the edge round its own node.
- A stated side can cost more bends or crossings, and the counts show them.

- **Why:** [058. An agent may state the side of an edge](../specs/decisions/058-an-agent-may-state-the-side-of-an-edge.md)

### F2.7.2: Edge shapes

All the edges of a diagram share one shape, and the routes stay the same.

- **Commands:** [`diagram`](../CLI.md#diagram)

- `square` has sharp corners, as a new diagram does.
- `round` rounds the corners and keeps the straight runs.

- **Why:** [059. Edges may be drawn square or round](../specs/decisions/059-edges-may-be-drawn-square-or-round.md)

### F2.7.3: Labels on edges

An edge carries its label, and the edge passes through it. An agent may take one label off its edge.

- **Commands:** [`edge`](../CLI.md#edge)

- A label sits on its edge by default, on an edge that turns too.
- A label on a vertical run sits at the run's middle, or the nearest clear place to it.
- `beside` puts the label next to its edge.
- `edge --label-at` on an edge with no label is refused as `bad-value`, and clearing a label clears its seat.
- Edges do not yet move apart for a label, past wrapping it.

- **Why:** [066. An edge's label sits on its edge](../specs/decisions/066-an-edge-s-label-sits-on-its-edge.md)

### F2.7.4: Steering an edge

An agent steers an edge with facts and never with a coordinate. Every step here is stated on one edge, and the engine still routes the edge.

- **Commands:** [`edge`](../CLI.md#edge)

| Flag | What it states | Refused as |
|---|---|---|
| `--via` | the node or group an edge passes and on which side | `via-blocked` |
| `--straight` | an edge with no bend | `not-straight` |
| `--main` | the main flow, whose ends take one column first | none |
| `--with` | one trunk with an edge that shares an end | `no-trunk` |
| `--bend` | where between its neighbours the longest inner run sits | `bend-blocked` |
| `--stretch` | how far a detour reaches | `stretch-blocked` |

- A value goes back to the engine with the same flag and no value.
- `--with` draws a tree with one spine: each child leaves the trunk square into its own side.
  - A side the agent stated holds, and with none the edge takes the first side that reaches the trunk.
- `--bend` needs an inner run whose neighbours lie on either side of it, and `--stretch` one whose neighbours lie on the same side.
- An edge with a label or a step's number takes none of `--with` · `--bend` · `--stretch`, since the text would stay behind.
- A step that meets a node or a label or comes within 12 px along another edge refuses the write.
- `--stretch` stops at the canvas, so a detour past it is refused.
- `--main` and `--straight` change only which nodes share a column, so a node may shift sideways.

- **Design:** [5. The engine routes every edge, in plain forms](../DESIGNS.md#5-the-engine-routes-every-edge-in-plain-forms)
- **How it works:** [Routing: facts that steer an edge](../specs/routing.md#facts-that-steer-an-edge)
- **Why:** [096. An edge is steered by facts and never by coordinates](../specs/decisions/096-an-edge-is-steered-by-facts-and-never-by-coordinates.md)

**Stories:**

- A strong model states where an edge passes, to tune a picture without a coordinate.

### F2.7.5: Clean edges

Edges meet the rules the owner set on 2026-11-07, so that the eye can follow them.

- An edge may leave one side and enter another across layers, such as out of the right of a node and into the left of another.
- The run at each end of an edge is at least 16 px, and 24 px at ease.
- Two edges that swap sides in one gap leave level, enter level and take no jog.
- Edges of one sort take one form in a picture.
- Where places leave a pair no clean route, one edge goes round the outside.
  - The write reports that the agent may move a node.

- **Why:** [097. The router draws clean edges and the agent makes their room](../specs/decisions/097-the-router-draws-clean-edges-and-the-agent-makes-their-room.md)

## F2.8: Flow direction

Layers become columns, so that a diagram reads left to right.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)

**Stories:**

- An agent turns a diagram on its side, to draw a pipeline that reads left to right.
