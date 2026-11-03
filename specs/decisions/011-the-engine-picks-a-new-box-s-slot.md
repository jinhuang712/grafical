# 011. The engine picks a new box's slot

Decided: 2026-10-11

## The problem

The order of the boxes in a row decides most crossings, and a weak model gets it wrong when it adds a box without saying where.

## The choice

Node order within a layer decides most edge crossings, and it is exactly the kind of choice a weak model gets wrong. So when `node.add` gives no position, the engine places the node in the slot of its layer that gives the fewest crossings, and saves that slot as an ordinary order fact. In a batch, slots are chosen after every operation in the batch is applied, so edges added later in the same batch count. A tie goes to the last slot.

Then the nodes of the batch that had no position are ordered together: each in turn moves to the slot of its layer with the lowest route cost, while the cost drops. The cost counts crossings plus edges with more than two bends, then crossings, bends and length. Nodes placed before the batch, or given a position in it, keep their order, and no move may split a group or break an alignment. This was added on 2026-10-11: one node at a time, a node added early in a draft is placed before the edges that decide its best slot exist. On Haiku's three phase 1b drafts, ordering together cut crossings from 8, 7 and 6 to 0, 2 and 1.

`layer.tidy <layer>` reorders the nodes of one layer to reduce crossings. It runs once, as a named operation, so its changes are expected. Nothing reorders a layer otherwise ("Layout computed again on every change").

The engine tries every slot with the real router. One layout of a 15-node diagram takes about 0.6 ms, and a 15-node draft batch about 50 ms in all. Ordering together stops after 1,500 layouts, so a large batch stays fast.

## Not chosen

- Appending a node last when no position is given. The agent's order would then decide the crossings, and that order is the main reason a diagram looks messy.
- Reordering automatically on every change, for the reason in "Layout computed again on every change".

## Consequences

Two fixes on 2026-10-14, found while dogfooding. A batch with only one node without a position put that node last in its row, every time: the node was taken out of its row before its slot was asked for, and the slot search, which counts the node's own place as removed, did not find it. Since the first build, only batches with two or more such nodes had their slots chosen. Second, both searches take only slots that can be drawn: no group split or left without one box, no alignment broken, and no node put between a group and the end of a line that meets the group beside it ("Lines that end at containers"). Moving a node into a row with no position used to pick a slot that split its group, and the refusal suggested joining the wrong node to the group. When no slot can be drawn, the search falls back to the slots that keep the groups whole, so the refusal names what is in the way: `edge-blocked` now gives the row and the nodes between the line's two ends, and `group-split` gives three fixes, joining the node to the group or moving it out to either side of the members.

Changed on 2026-10-14 by "Who chose is punished": a new node's slot is the one with the lowest route cost, as when ordering together, not the one with the fewest crossings alone, and the route cost counts a box that lies beside every box it connects to as it counts a crossing.

Reversed on 2026-10-15 by "The agent states every order": the engine no longer picks a slot, and `layer.tidy` and `diagram.tidy` are removed.
