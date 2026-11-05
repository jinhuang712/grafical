# 005. Our own gap router

Decided: 2026-10-11

Replaced in part by specs/decisions, "A line never moves for its label": a label with no room no longer makes its line detour.

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

What phase 1 added to the router: fewer crossings, from 68 to 15 on the public brief, mostly from node order; buses; side exits; room before squeezing; labels by rule; and the edge cases of self-loops, several lines between one pair, lines within a row and lines that skip rows. Until 2026-10-17 a label with no slot made its line detour, which appeared in 60 of 500 very dense fuzz diagrams and in none of the 306 saved drafts ("A line never moves for its label").

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
