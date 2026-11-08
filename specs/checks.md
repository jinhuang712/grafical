# The checker

The checker looks at a laid-out picture and says what is wrong with it, without changing it and without advice. Every write runs it before the file is written, and `check` and `render` run it on the file as it is. `check` first runs the model's checks of the whole diagram, and a file they refuse is neither laid out nor looked at. What it finds falls into three kinds, by what each costs a reader: defects draw wrong, warnings draw poorly, and counts only say how the picture is drawn. It lives in `src/check/`.

```text
laid-out picture
  ├── defects ──┬── owned by the agent ──> the write is refused
  │             └── owned by the engine ──> written, shown only by check --all
  ├── warnings ──> printed after every write, check and render, never refused
  └── counts ────> the counts record, and the gutter records of show --drawn
```

## Defects and who owns them

Every defect has an owner: whoever can fix it. The agent owns a defect that a fact it stated caused, such as a label too long for its node, since only a change of facts can remove it. The engine owns one that it drew wrong where a plain form was there, such as an edge through a node.

A write with a defect the agent owns is refused and changes nothing. A defect the engine owns is an engine bug: the write goes ahead and the agent is not told, since no command of the agent's can change it. Only `grafical check --all` reports it, so that the tests and the benchmarks count it, and its `next` is always empty.

The defects the agent owns:

- `overflow`: text that does not fit its node or a lane's label outside its head or a note over 4 lines.
- `missing-glyph`: a character neither bundled font can draw.
- `mark-covers`: a mark that covers text or another node.
- `wall-crossed`: an edge through a wall that does not allow it.
- `title-blocked`: a group's label that an edge comes near.
- `side-blocked`: a stated side that no route takes.
- `label-blocked`: an edge's label or a step's badge or a wall's label or a note's card with no clear place.

The defects the engine owns:

- `node-overlap`: nodes that overlap.
- `edge-through-node`: an edge through a node.
- `group-intruder`: a node inside a group it is not in.
- `label-collision`: text that touches other text.
- `step-collision`: a badge that touches anything.
- `text-crossing`: an edge across text.
- `edge-overlap`: two edges that share a run of 8 px or more, so a reader cannot tell them apart.
  - Two unlabelled edges that leave one node in one style are a bundle, and never an overlap.
  - Nor is an overlap whose ends lie within 4 px of a node the two edges share.
- `lane-stray`: a node outside its lane.
- `needless-bend`: an edge between neighbouring layers that bends although one straight run would join it.

## When there is no plain form

The engine draws each thing in a few plain forms: an edge straight or with one or two bends, a label on or beside a run of its own edge, a title at its place, a note where the agent put it. When the facts leave no plain form, what happens depends on what drawing anyway would cost a reader.

Where drawing would hide something a reader needs, the write is refused as a defect the agent owns, and the refusal gives the facts the agent needs to change the diagram:

- An edge's label or a step's badge that no gutter on its way holds clear of the other edges is `label-blocked`.
  - The refusal names the edge, and the edges across the label as `across`.
  - It also names the borders the label crosses and the gutters it tried, each `<layer above>/<layer below>`.
  - Its `next` is `layer --move` and `node --size` and `node --move` and `edge --label` and `edge --number`.
- A wall's label with no clear place along its wall is `label-blocked` with `is: wall`.
  - It names the wall and the edges and nodes in the way.
  - Its `next` is `wall --label` and `node --move`.
- A note's card with no clear place beside its target is `label-blocked` with `is: note`.
  - It names the target and the edges and nodes in the way.
  - Its `next` is `note --add`, `note --remove` and `node --move`.
- A group's label that an edge comes near is `title-blocked`, naming the group and the edges.
  - It also lists as `clear` the other places where no edge would come near, each found by laying the diagram out again.
  - The search for a problem's source leaves `clear` out, since it lays out many prefixes of a batch.
  - Its `next` is `group --label-at`, `node --move` and `edge --remove`.

Where drawing only costs, the picture is drawn and every write reports it. An edge with more than two bends is the one such case today: it is a `bent-edge` warning and counts in `bent`.

No refusal writes the change for the agent. A block names the commands that can act, never a command line with values.

## Warnings

A warning names something the picture draws poorly. Every write prints every warning the diagram has, not only those the command caused, and so do `check` and `render`, since every write lays the whole diagram out again. A warning never refuses anything. It has no source, because the outcome line already names what the write changed. Each prints as its own block, in this order:

| Code | `next` |
|---|---|
| `bent-edge` | `layer --move` · `node --move` · `node --swap` |
| `passing-layer` | `layer --move` · `node --move` · `node --swap` |
| `edge-across-group` | `group --order` · `node --move` · `node --swap` |
| `tight-edges` | `layer --move` · `node --move` · `node --swap` |
| `crowded-label` | `node --move` · `node --swap` · `edge --label` |
| `lonely-node` | `node --remove` · `edge --add` |
| `node-aside` | `node --move` |
| `edge-per-member` | `edge --add` · `edge --remove` |
| `crossing` | `group --order` · `layer --move` · `node --move` · `node --swap` |

An edge that ends at a group, a layer or a lane reaches every node in it, so none of those nodes is a `lonely-node`.

`edge-per-member` names a group of two or more nodes, the nodes of its inner groups included, in which every node has an edge to one end outside the group, or from it. The edges must agree in direction, outer end, type, label, weight and arrowheads, so that one edge to the group would say the same. `edges` holds the first such edge of each node, in the group's order. A group inside one that has the same edges is left out, so only the outer group is named.

## Counts

The counts record is one line of facts with no threshold, so that the agent can compare two arrangements by numbers. Its keys, in order: `nodes`, `edges`, `crossings`, `bends`, `bent`, `length`, `width`, `height`, `fullest`, `busiest`, `longest`, `passing`, `across`, `tight` and `crowded`. The last five count the places the first five warnings name:

- `bent`: the edges with more than two bends.
- `passing`: the edges with a vertical run in a layer strictly between their ends' layers, within that layer's height and between its outermost nodes.
  - A layer with no node counts as a layer here.
- `across`: the edges with a run through the frame of a group that holds neither end.
  - A group holds an end that is the group or a member, or that lies inside its frame.
  - An edge counts once, however many groups it crosses.
- `tight`: the pairs of runs of two different edges under 12 px apart that share more than 100 px.
  - Edges that share a port are one bundle and never a pair.
  - A pair is a place: two edges tight in two places count twice.
- `crowded`: the labels with under 8 px of room on two or more of their four sides.
  - Room is measured to the sides of nodes and groups and bands and to other edges and labels.
  - Lanes and walls do not count.

`crossings` counts points, so a pair that crosses twice counts twice there and is one `crossing` warning.

## Gutters

The counts say how much, and the gutters say where. `show --drawn` prints a `gutter` record for each pair of neighbouring layers: `gutter above=<layer> below=<layer> edges= crossings= tight= crowded=`. A layer with no node, drawn as a bar, has a gutter too. The gutter is the band from the lowest bottom of the upper layer's nodes to the highest top of the lower layer's, across the whole picture.

- `edges` counts the edges with any run in the band, including those that only pass through.
- `crossings` counts the crossing points inside the band.
- `tight` counts a vertical pair in every gutter it overlaps, and a horizontal pair in the gutter at its height.
- `crowded` counts a label whose centre lies inside the band.

The agent compares gutters to see which order of layers costs. The record gives no advice and no sum.

## Rules that are no longer reported

Decision [012. A target picture with measured rules](decisions/012-a-target-picture-with-measured-rules.md) holds the seven rules as a record: at most one crossing per ten edges, at least half the edges straight, no edge over two bends, at most 40% of edges labelled, at most three edge styles, at most 16 nodes, and no corridor through a node. No code measures them any more. Only the limit of two bends is used, for `bent` and `bent-edge`.
