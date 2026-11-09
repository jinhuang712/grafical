# 004. Layout computed again on every change

Decided: 2026-10-11

## The problem

Every write must leave a tidy picture, and a reader who knew the picture before must still find everything where it was.

## The choice

After every operation, grafical lays out the whole diagram again from the facts, the way LaTeX typesets a document again after every edit. Positions are never stored. Layout must be fast enough to feel instant: at most 50 ms per operation in process.

**One column grid for the whole diagram.** Every node sits in a column of one grid shared by all layers, chosen so that edges between layers run straight and every group's members stay together. Both judges of the second phase 1b round ranked the target first for exactly that placement (2026-10-11). This replaces the first version's layers, each centred and spread on its own: those made almost every edge between layers jog sideways, which the judges read as staircases. The choice of columns is deterministic, so the same facts always give the same picture.

A change keeps every fact it does not name, and positions may shift ("A change keeps the structure and positions may shift").

**Gutters grow in fixed steps.** When a gutter's tracks no longer fit, it grows to the next fixed height, and the layers below shift down. Most edge additions therefore change no gutter height. On the 500-diagram fuzz test, growing made 221 diagrams taller than a fixed gutter would, 23 of them by more than 20%. That is the price of never squeezing edges together.

**Alignment.** An aligned node sits directly above or below its target.

## Not chosen

- Left-aligned layers that never re-spread.
  - They keep more pixels still, but layers end up ragged.
  - The picture stops looking finished.
  - The phase 0 router spike showed this.
- Reordering nodes on every change to reduce crossings.
  - It gives a better picture once, but any change can reshuffle the structure.
  - Order is stated by the agent, when a node is added or moved ("The agent states every order").
- Gutters that grow by any amount, because nearly every edge addition would then move the layers below.
- A "gutter full" defect.
  - Its fix costs the agent a round and moves more than growing would.
  - The fix is a larger density, fewer edges or a split layer.
- An aligned node that slides alone within its layer's spacing, as phase 1 first built it.
  - None of the three alignments in the public brief could hold that way.

## Consequences

Every write pays for a full layout. A gutter grows in fixed steps, which is the price of never squeezing edges together.
