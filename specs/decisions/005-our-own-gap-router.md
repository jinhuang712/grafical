# 005. Our own gap router

Decided: 2026-10-11

## The problem

Lines must stay clear of boxes and text, and a change must move only the lines it touches. The routers on offer either lay everything out again or have licenses an MIT project cannot take.

## The choice

Edges run as horizontal and vertical segments. They travel through the gutters between layers and the gaps between neighbouring nodes, never through a node. A label sits on or beside a segment of its own route, clear of nodes, other labels and other edges.

grafical uses its own gap router. It works in three passes:
1. **Path:** each edge's path through the gutters and gaps depends only on the placement and the edge itself.
2. **Channels:** each gutter and gap assigns ports and tracks from the edges inside it alone.
3. **Assembly:** each route is built from the chosen ports, tracks and gaps.

A change therefore spreads to another channel only through edges that use both.

The phase 0 router spike compared it with `libavoid-js` on the public brief (30 nodes, 41 edges) and on a 50-node variant. The spike code and its report were not kept; the numbers here are what remains.

| | Our gap router | `libavoid-js` 0.5.0-beta.5 |
|---|---|---|
| No edge through a node, no label collisions | Pass | Pass, after tuning |
| Adding one edge stays inside the list in "Layout computed again on every change" (45 additions) | Pass | Pass |
| Same SVG bytes on macOS and Linux | Pass | Pass |
| License | MIT, our code | LGPL-2.1-or-later, with conditions on bundled builds |
| Route time, 30 nodes and 50 nodes | 0.09 ms, 0.24 ms | 80 ms, 1,840 ms |
| Unrelated edges drawn on top of each other | 0 | 3 |
| Crossings on the public brief | 68 | 40 |

What phase 1 added to the router:
- **Fewer crossings.** Gaps and port orders follow the neighbouring gaps, and each gutter orders its tracks.
  - The public brief went from 68 crossings to 15.
  - Most of that gain comes from node order, chosen by "The engine picks a new box's slot".
  - With the spike's node orders, the router alone gives 45.
- **Buses.** A fan-out of three or more unlabelled edges in one line style leaves a node side through one port and shares one trunk.
  - A call and a data read are both solid ("Looks"), so they share a trunk.
  - Members that pass the same rows choose one corridor together, so that the trunk passes those rows as one line and branches near its targets.
  - "A target picture with measured rules" lowers this to two edges, and adds fan-ins: edges that share a target side arrive through one port.
  - Since 2026-10-12 only a node side with more lines than room merges them; every other line has a port of its own ("Lines meet any side").
- **Side exits.** An edge to a node in the next row up or down that lies wholly on one side of its source leaves from that side.
  - It leaves at the middle of the row and turns once into its target.
  - That is an L with one bend instead of a Z with two.
  - It needs the source's row clear between the two, with no node and no line through it.
  - It takes one gap of that row for itself.
  - Fan-outs and fan-ins keep their shared port.
  - A side with an edge to a neighbour takes none.
  - If the target's port cannot sit at the turn, the edge leaves from its bottom or top as before.
  - The owner asked for this on 2026-10-11: lines may leave a box in any direction.
- **Room before squeezing.**
  - Ports and gap tracks keep 8 px clear of lines that enter the same gutter from the other side.
  - A gap holds as many tracks as fit 8 px apart.
  - When a node side or a gap is overcrowded, a port or a track may sit 2 px off the 4 px grid.
  - Then no two lines share an x.
- **Labels by rule.** A label sits on a straight vertical line, above or below a run or beside it ("A label sits on its straight vertical line").
  - If no slot is clear, it does the first of these that works:
  1. wrap onto 2 or 3 lines;
  2. use another gutter on its path;
  3. with neither, no line moves for it: the write is refused as `label-blocked` ("The dirty work has edges").
     - The label takes the slot that costs least on its longest run.

  On the fuzz test, 2.9% of labels wrapped. Until 2026-10-17 a label with no slot made its line detour, stepping out beyond the crowd onto new rows with the label beside it; detours appeared only in very dense diagrams, 60 of 500 with 153 labels between them, and in none of the 306 saved drafts.
- **Edge cases:**
  - Self-loops.
  - Several edges between one pair.
  - Edges within a layer.
  - Edges that skip layers.
  - The left-most gap.

The fuzz test lays out 100 random diagrams with fixed seeds in CI, 500 until 2026-10-19, and more on request. None has an engine-owned defect ("Defects owned by who can fix them"). Before the phase 1 robustness work, 48% had one. 35,000 seeds in all passed, which is evidence, not a proof.

## Not chosen

- `libavoid-js`.
  - It is LGPL-2.1-or-later, and its npm `latest` is a beta from one maintainer.
  - It took 1.8 s at 50 nodes, too slow to lay out on every change.
  - It drew unrelated edges on top of each other.
  - Its one advantage was fewer crossings, which the router had to earn in phase 1.
- ELK for routing.
  - ELK layered computes its own placement, and according to ELK's documentation it cannot route orthogonally around nodes that are already placed.
  - Its fixed-layout algorithm only reuses bend points it is given.
  - Sources, checked on 2026-10-10: the [ELK fixed algorithm reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-fixed.html) and the [ELK libavoid post](https://eclipse.dev/elk/blog/posts/2022/22-11-17-libavoid.html).
  - Graphviz, because it is another placement engine and a native binary.

## Consequences

grafical owns its router and maintains it. A change spreads to another channel only through the lines that use both.
