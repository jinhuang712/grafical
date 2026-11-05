# 004. Layout computed again on every change

Decided: 2026-10-11

## The problem

Every write must leave a tidy picture, and a reader who knew the picture before must still find everything where it was.

## The choice

After every operation, grafical lays out the whole diagram again from the facts, the way LaTeX typesets a document again after every edit. Positions are never stored. Layout must be fast enough to feel instant: at most 50 ms per operation in process.

**One column grid for the whole diagram.** Every box sits in a column of one grid shared by all rows, chosen so that lines between rows run straight and every group's members stay together. Both judges of the second phase 1b round ranked the target first for exactly that placement (2026-10-11). This replaces the first version's rows, each centred and spread on its own: those made almost every edge between rows jog sideways, which the judges read as staircases. The choice of columns is deterministic, so the same facts always give the same picture.

**Stability means the structure stays, not the pixels.** An operation never changes a fact it does not name. Positions are compared relative to the shared centre line: when the canvas widens, everything shifts by the same amount, and that is not movement. After an operation, only these may move:
- the elements it names;
- the other nodes in each layer whose contents changed, which re-spread sideways and keep their order.
  - A layer's contents include its nodes' alignment facts;
- a layer that has a node aligned to a node that moved, which slides sideways as one block;
- a box placed by steps from a node that moved, which keeps its steps ("Steps from another box");
- the layers below a layer or gutter that changed height, which shift down as one block;
- edges that share a gap with a changed edge, but only inside the gaps they share;
- ports on a node side that a changed edge uses;
- the labels of routes that changed;
- the routes of edges attached to anything that moved.

"Changed" does not cascade: an edge that moved only because it shares a gap does not make its own neighbours movable. Otherwise a layer never moves sideways.

The column grid does not keep this list. It is solved again from the facts after every change, so one operation can move nodes sideways in rows it did not touch: after about half of all single operations on the catalog-sync fixtures (bench/results/phase2.md). Remembering the last layout would break the promise that the same file gives the same picture on any machine. On 2026-10-12 the owner restated stability: an operation changes no fact it does not name (layer, order, group, lane, alignment), which the tests and `grafical diff` check, and sideways movement is measured, not gated. The stage 1 judges decide whether the movement hurts a reader; a column solver whose choices stay local to the change is the fix if it does.

**Gutters grow in fixed steps.** When a gutter's tracks no longer fit, it grows to the next fixed height, and the rows below shift down. Most edge additions therefore change no gutter height. On the 500-diagram fuzz test, growing made 221 diagrams taller than a fixed gutter would, 23 of them by more than 20%. That is the price of never squeezing lines together.

**Alignment.** An aligned box sits directly above or below its target.

## Not chosen

- Left-aligned layers that never re-spread.
  - They keep more pixels still, but rows end up ragged.
  - The picture stops looking finished.
  - The phase 0 router spike showed this.
- Reordering nodes on every change to reduce crossings.
  - It gives a better picture once, but any change can reshuffle the structure.
  - Order is stated by the agent, when a node is added or moved ("The agent states every order").
- Gutters that grow by any amount, because nearly every edge addition would then move the layers below.
- A "gutter full" defect.
  - Its fix costs the agent a round and moves more than growing would.
  - The fix is a larger density, fewer edges or a split layer.
- An aligned node that slides alone within its row's spacing, as phase 1 first built it.
  - None of the three alignments in the public brief could hold that way.

## Consequences

Every write pays for a full layout. A gutter grows in fixed steps, which is the price of never squeezing lines together.
