# Routing

Routing draws every edge once the nodes have their places. An edge is made of horizontal and vertical runs: across the gutters between layers, and down through the gaps between nodes. It never runs through a node. The agent says only which two things an edge joins. The router picks everything else, a side unless the agent states it: the side the edge leaves and enters, its place on each side, the corridor it runs down and the track it takes in each gutter. Every value lies on a 4 px grid and every tie has a fixed rule, so the same placement always gives the same routes. It lives in `src/layout/`.

## The steps

Routing works in two turns around placement. Before the nodes have their x, it does what placement needs to know: it gives each edge that ends at a container a stand-in node to aim at, and it picks the edges that cross straight between two neighbours, so that placement can make their gap wide enough. Once every node has its x, it routes all the edges together:

```text
 1. kind        down, up, along its own layer, or straight across to a neighbour
 2. bundles     edges that leave one side together share one trunk
 3. corridors   an edge that skips layers picks an empty column, or a gap in each layer
 4. gutters     an edge along a layer picks the gutter above or below it
 5. sides       an edge may leave or enter a node's side instead of its top or bottom
 6. ports       each edge gets its own place on every side it meets
 7. centres     an edge that can run straight moves back to its nodes' centre
 8. tracks      each gutter stacks its runs into rows of tracks, and seats the labels
```

Each step works on what the steps before it fixed, and no later step undoes one. When an edge was sent above its layer, the whole run is made a second time with every such edge below, to compare the two. Once placement has given the layers their y, the tracks become heights, the routes become points, and each route to a container is cut at its border. An edge from a node in the top layer to a node two layers down passes most of them:

```text
layer 0   [ A ]
            │            leaves A's bottom at its port
gutter      └─────┐      one track of the gutter
layer 1   [ C ]   │   [ D ]
                  │      the corridor: a column empty in layer 1
gutter            └─────┐
                        ▼  enters E's top at its port
layer 2               [ E ]
```

## Kinds of edge

An edge between two layers goes down or up. Between neighbouring layers it runs from the bottom of the upper node straight to the top of the lower one when their ports line up. When they do not, it steps sideways along a track of the gutter, with two bends. An edge that skips layers also needs a way down through the layers between, which a corridor gives it.

An edge between two nodes of one layer runs along the layer instead. When the two nodes are neighbours, it crosses straight through the gap between them. A gap is only as tall as its layer, so it holds few edges:

- With no labels, as many edges as fit share the gap 12 px clear of the nodes' corners.
- With labels, the first edge whose label is at most 200 px wide takes the gap.
  - A second edge joins it when the layer is tall enough: the next such labelled edge, or else the first edge with no label.
- When no label is that narrow, the first edge with no label takes the gap.

Every other edge between the two nodes, and every edge between nodes of one layer that are not neighbours, runs through the gutter above or below the layer.

## Fan-outs and fan-ins

A node with many edges on one side would need a port for each, and the edges would crowd that side. So edges that leave one side in the same style and weight become a bundle: one port and one trunk, which splits near its targets.

- Three or more such edges always bundle.
  - Two bundle only when the side has more edges than ports 16 px apart.
- An edge that carries something of its own never joins a bundle.
  - That is a labelled edge or a numbered edge or a two-way edge or a self-loop or an edge to a container.
- Two or more unlabelled edges of one style into one crowded side of a target share one port as a fan-in.
  - A two-way edge may join a fan-in.

The members of a bundle share a track until their paths part, and their tracks are ordered by where they part, so that no two members cross. A trunk with branches to both sides splits at one knot, and its dot marks a four-way join as a join.

## Corridors and gaps

An edge that skips layers runs down a corridor: a column of the grid that is empty in every layer it passes. Several corridors are usually open, and the router scores each one as a single sum:

```text
cost = distance from the source  (+ 96 if outside the source's port range)
     + for each edge sharing it: distance to its target (+ 96 if outside its range)
     + 192 × (crossings placement makes certain + groups that hold neither end)
```

The sum prefers a corridor near both ends that the edges sharing it reach straight. It weighs most against the crossings that are certain once the nodes are placed:

- An edge straight through a gutter the route runs along.
- An edge along a gutter the route crosses.
- An edge across a layer the route passes.

A tie goes to a corridor a sharing edge already took, then to the lower cost, then to the shorter move of the source, then to the leftmost.

When no corridor is free, the edge takes a gap between two nodes in each layer it passes. A gap holds as many vertical tracks as fit, 16 px apart where there is room and down to 8 px where there is not. Tracks keep out of the margin of a group that holds neither end where they can, and an edge that still crosses such a group pays for it in the cost.

## Edges along a layer

An edge between two nodes of one layer that are not neighbours goes round, through the gutter above or below. It takes the side where fewer other edges meet the nodes between its ends, so that it crosses fewer of them, and below on a tie. It stays below in the top layer, for a self-loop, and for a member of a bundle or a fan-in. It also stays below where a band's label, a wall or a lane's side lies in the gutter above.

Above is a guess, because a port added on a node's top moves the ports beside it, and a run in the gutter takes room from its labels. So when any edge went above, the router also routes every such edge below, as a baseline. An edge sent above goes back below when its gutter gains a needless bend or a label with no room, or an edge that shares one of its nodes newly bends. This repeats until no edge goes back.

## Side exits and side entries

An edge to a node in the next layer that lies wholly to one side would leave from the bottom and turn twice: a Z. It may instead leave by its source's side, at the middle of the layer, and turn once into its target: an L. An edge that skips layers does the same when its corridor lies in the open beside its source.

An exit needs room: the layer clear between the source and the turn, no track close to the turn, and a turn that falls within the target's top or bottom ports. Each side takes at most one exit, and none when an edge to a neighbour already uses it.

Where no exit was taken, an edge may enter its target's side instead. A side takes several entries, each at its own height: the edges from above enter its upper part, and the edges from below its lower part. Edges to bars and lanes take no side exit, and edges to containers take no side entry.

## Stated sides

An agent may state the side an edge leaves by, the side it enters by, or both. Such an edge keeps its own port and joins no bundle or fan-in, and it chooses a side exit or a side entry before the others do. What each kind of edge can take:

| Edge | Sides it can take |
|---|---|
| between neighbours | left or right facing the other, or top or bottom, going round through that gutter |
| along a layer | top or bottom at each end |
| down or up | any side of either end |

A side that faces away from the other end takes the edge round its own node. Out of a top or into a bottom, it runs through the gutter on that side and down its own layer beside the node. Out of or into a left or right side, the turn stands beside the node and the gutter's run takes the edge on.

A stated top is out of reach in the first layer, under a band's label or where a wall or a lane's border closes the gutter. An edge the router cannot draw by a stated side is refused as `side-blocked`, which gives the stated side and the side it would have drawn. The router never takes another side in its place.

## Ports

An edge meets a node's top or bottom. It meets the left or right side only to reach a neighbour, or for a side exit or entry. The ports of one side go in the order of where each edge's run ends in the gutter, walking round from the node's corner, so that the edges leave the side without crossing each other.

The router first spreads the ports evenly across the side, each pulled toward the x its edge wants. When that bends an edge that could run straight, it tries tighter spacings in turn, from 16 px apart and 16 px from the corners down to 4 px apart. It takes the first that bends no such edge, or the first that fits when every one does. As a last resort, ports sit 2 px off the grid, so that no two edges share an x.

Bottom sides are placed before top sides. An edge that can run straight down then meets the port its upper node already took, when that port lies at least 8 px inside the lower node.

## Back to the centre

Spreading the ports pushes edges off their nodes' centres. After ports and tracks are placed, an edge that runs straight from its source through every gap into a node that shares its centre moves back to that centre, with the edges in its way. It moves only when nothing gets worse: no new crossing, no track or port too close to another, and enough room left in each gap. It stays put when another edge joins the same two nodes or a self-loop sits on its side. A turning edge, a member of a bundle and an edge of a fan-in never move.

## Gutters

A gutter holds rows of tracks, one track pitch apart, which the density sets. Its first track lies 16 px below the layer above and its last 16 px above the layer below, so that an edge runs at least 16 px from a node before it turns. The router orders the horizontal runs of each gutter for the fewest crossings and gives each the first free row of tracks. It seats each edge's label beside its run at the same time, since a label takes room as a track does. An edge from above ends above an edge from below at the same x, so that the two do not cross there. A gutter next to a layer that holds a store keeps 8 px more room on that side when it has runs.

Placement turns the number of rows a gutter holds into its height. Each track's y is then fixed, and the routes become points.

## Edges that end at a container

The router knows only nodes. An edge to a group, a layer or a lane is routed to a stand-in: the member of the container that faces the other end. For a bar, the stand-in is a short piece of the bar beside the other end, and stand-ins that lie close together become one. After routing, the route is cut where it meets the container's frame or band, so the edge ends at the container's border. An edge into a band runs straight on into it past its other end. An edge to a container gets a port of its own and never joins a bundle or a fan-in.

An edge that passes a bar without ending at it is refused as `bar-crossed`, unless the agent said it may. One that may runs straight through the bar, since in the bar's layer only the stand-ins count as nodes.

## Walls

The model has already refused an edge between a wall's two sides that the wall does not allow. The router keeps every edge out of a wall that runs up and down: out of its gaps, its corridors and its top ports in the wall's layers, and out of the gutter above it. A wall across is only space, so no edge is routed round it, and one that crosses it is the defect `wall-crossed`.

## Facts that steer an edge

An agent may steer an edge with facts, and each must hold or the write is refused. Two reach the steps above, and the rest are met once every edge is drawn:

| Fact | When | What happens | Refused when |
|---|---|---|---|
| `straight`, `main` | the column grid | the two ends' join scores 1000 more, so it comes first | `straight`: the drawn edge has a bend |
| `via` | corridors | a corridor is cut to the stated side of the object | the edge, wherever it lies level with the object, is on the other side |
| `with` | after routing | the edge follows the trunk to the first run that reaches its end square, and leaves it there | no run reaches, or the way is not clear |
| `bend-at` | after routing | the longest inner run slides between its neighbours, to the fraction | none has neighbours on either side, or the way is not clear |
| `stretch` | after routing | the longest detour reaches that multiple past its neighbours | none has neighbours on one side, or the way is not clear |

A way is clear when it meets no node but its ends and no label, stays 8 px inside the canvas, and runs at least 12 px from any edge along it, its trunk and what shares the trunk aside. Nothing after routing moves a node or another edge, or grows the canvas. An edge with a stated side keeps its own port unless `with` joins it to a trunk, and then it leaves `side-blocked` behind, since the router's route is replaced.

## Self-loops

An edge from a node to itself loops through the gutter below the node. Its two ends sit about 48 px apart, either side of the node's centre, though the ports may move them. The loop runs at the gutter's third row of tracks.

## What the router does not do yet

The owner set rules for clean edges on 2026-11-07, and the router does not meet them yet:

- It keeps 8 px from a node to a track in the gap beside it, where an end run should be at least 16 px and 24 px at ease.
- It never leaves one side and enters another across layers.
- Two edges that swap sides in one gap take a jog.
- It has no way round the outside for a pair with no clean route.

## Decisions

- [005. Our own gap router](decisions/005-our-own-gap-router.md)
- [015. Edges that end at containers](decisions/015-edges-that-end-at-containers.md)
- [019. Edges meet any side](decisions/019-edges-meet-any-side.md)
- [023. Fan-outs of three bundle](decisions/023-fan-outs-of-three-bundle.md)
- [090. A bundle splits at one knot](decisions/090-a-bundle-splits-at-one-knot.md)
- [060. A bent edge is reported and never refused](decisions/060-a-bent-edge-is-reported-and-never-refused.md)
- [061. An edge never moves for its label](decisions/061-an-edge-never-moves-for-its-label.md)
- [095. A good route is one the eye can follow](decisions/095-a-good-route-is-one-the-eye-can-follow.md)
- [096. An edge is steered by facts and never by coordinates](decisions/096-an-edge-is-steered-by-facts-and-never-by-coordinates.md)
- [097. The router draws clean edges and the agent makes their room](decisions/097-the-router-draws-clean-edges-and-the-agent-makes-their-room.md)
- [102. Routing trouble that placement can fix is the agent's](decisions/102-routing-trouble-that-placement-can-fix-is-the-agent-s.md)
