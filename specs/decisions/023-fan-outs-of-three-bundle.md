# 023. Fan-outs of three bundle

Decided: 2026-10-13

## The problem

Decided on 2026-10-13, as the first feature of phase 1e. The owner called a stage 1 picture "terrible... way too many lines to track", though it had one crossing: one service sent six edges out of one side, each to its own port, turning at six heights on their way to six nodes across two layers. Every architecture draft measured that day had a node with four to seven edges.

## The choice

- **The rule:** three or more unlabelled edges in one edge style that leave one side of a node leave as a bundle.
  - A bundle is one port and one trunk that splits near its targets, with a dot at each split.
  - It holds on any side.
  - A crowded side (more edges than port slots) still bundles two or more, as before ("Edges meet any side").
  - Labelled edges and two-way edges keep a port each.
  - Since 2026-10-16 numbered edges do too ("Step badges ride the edge").
- **Measured** on fifteen architecture drafts:
  - The drafts were three of the private reference brief, nine of the public brief and three of 25 components.
  - The line drawn on the page fell 10% from 97,508 px to 88,220 px, with a shared trunk counted once.
  - Crossings went from 39 to 40 and bends from 357 to 370.
  - On the picture the owner called terrible, the line drawn fell from 5,272 px to 2,408 px and its one crossing went.
- **Labelled edges stay apart.** Bundling them too would cut the line drawn by 22%.
  - But their labels had no place on a shared trunk and were lost.
  - Crossings rose from 39 to 51.
  - A label on each branch near its target would be a separate decision.

## Not chosen

- Bundling labelled edges without a place for their labels: it loses the labels.
- Bundling from two edges: two separate edges are as easy to follow as a trunk that splits.

## Consequences

Labelled and two-way edges keep their own ports. Three or more edges of one style read as one edge until they split.
