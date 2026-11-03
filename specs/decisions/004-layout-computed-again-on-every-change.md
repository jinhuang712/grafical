# 004. Layout computed again on every change

Decided: 2026-10-11

## The problem

Every write must leave a tidy picture, and a reader who knew the picture before must still find everything where it was.

## The choice

After every operation, grafical lays out the whole diagram again from the facts, the way LaTeX typesets a document again after every edit. Positions are never stored. Layout must be fast enough to feel instant: GOALS.md, "Speed" allows 50 ms per operation in process.

Placement follows the facts in a fixed order: layers from top to bottom, nodes in each layer by their order, box sizes from their steps, gaps from the density.

**One column grid for the whole diagram.** Every node sits in a column of one grid shared by all rows, and the grid is centred. Within a row, columns follow node order. The engine chooses each node's column so that as many edges as possible run as one straight vertical segment, and so that every group's members fill a block of neighbouring columns with no outsider inside it. A node outside every group that two or more groups use, such as the store a write side and a read side share, is not lined up under either: it takes a column of its own between them, centred on the gap between their boxes. Both judges of the second phase 1b round ranked the target first for exactly that placement (2026-10-11). This replaces the first version's rows, each centred and spread on its own: those made almost every edge between rows jog sideways, which the judges read as staircases. The choice of columns is deterministic, so the same facts always give the same picture.

**Stability means the structure stays, not the pixels.** An operation never changes a fact it does not name. Positions are compared relative to the shared centre line: when the canvas widens, everything shifts by the same amount, and that is not movement. After an operation, only these may move:
- the elements it names;
- the other nodes in each layer whose contents changed, which re-spread sideways and keep their order. A layer's contents include its nodes' alignment facts;
- a layer that has a node aligned to a node that moved, which slides sideways as one block;
- a box placed by steps from a node that moved, which keeps its steps ("Steps from another box");
- the layers below a layer or gutter that changed height, which shift down as one block;
- edges that share a gap with a changed edge, but only inside the gaps they share;
- ports on a node side that a changed edge uses;
- the labels of routes that changed;
- the routes of edges attached to anything that moved.

"Changed" does not cascade: an edge that moved only because it shares a gap does not make its own neighbours movable. Otherwise a layer never moves sideways.

The column grid does not keep this list. It is solved again from the facts after every change, so one operation can move nodes sideways in rows it did not touch: after about half of all single operations on the catalog-sync fixtures (bench/results/phase2.md). Remembering the last layout would break "Output and determinism". On 2026-10-12 the owner restated GOALS.md, "Stability": an operation changes no fact it does not name (layer, order, group, lane, alignment), which the tests and `grafical diff` check, and sideways movement is measured, not gated. The stage 1 judges decide whether the movement hurts a reader; a column solver whose choices stay local to the change is the fix if it does.

One exception: when a gap between two nodes is full, the next edge in id order takes its next-best gap, and that can move a route outside the channels it shares with the changed edge.

**Gutters grow in fixed steps.** The gutter between two layers has a height chosen from fixed steps. When its tracks or edge labels no longer fit at the density's spacing, it grows to the next step, and steps are added past the last one when needed. The layers below shift down. Most edge additions therefore change no gutter height. On the 500-diagram fuzz test, growing made 221 diagrams taller than a fixed gutter would, 23 of them by more than 20%. That is the price of never squeezing lines together.

**Alignment.** An aligned node sits directly above or below its target. Its whole layer slides sideways as one block to put it there, and keeps its even spacing. Within one layer, the first alignment in node order holds. A later alignment that would need a different slide is rejected as `alignment-conflict`, and layers that would each slide to follow the other are rejected as `alignment-cycle`.

## Not chosen

- Left-aligned layers that never re-spread. They keep more pixels still, but rows end up ragged, and the picture stops looking finished. The phase 0 router spike showed this.
- Reordering nodes on every change to reduce crossings. It gives a better picture once, but any change can reshuffle the structure. Order is stated by the agent, when a node is added or moved ("The agent states every order").
- Gutters that grow by any amount, because nearly every edge addition would then move the layers below.
- A "gutter full" defect. Its fix (a larger density, fewer edges, a split layer) costs the agent a round, and moves more than growing would.
- An aligned node that slides alone within its row's spacing, as phase 1 first built it. None of the three alignments in the public brief could hold that way.

## Consequences

Every write pays for a full layout. A gutter grows in fixed steps, which is the price of never squeezing lines together.
