# 033. The agent states every order

Decided: 2026-10-15

## The problem

Decided by the owner on 2026-10-15: the engine does not choose for the agent. Until then the engine made one choice of structure: the order of a row, for a box added or moved into it without a position ("The engine picks a new box's slot"), and for the rows `layer tidy` and `diagram tidy` reordered. Both are gone.

## The choice

- **A place is required.** A box added to a row or moved into another row says where it goes.
  - It goes first or last or before or after a box.
  - Without one it is refused.
- **No tidying.** `layer tidy` and `diagram tidy` are removed.
  - An agent that wants fewer crossings compares orders with `grafical try` and its counts ("Records over prose"), and keeps the one it prefers.
- **No exception left.** Every order in the file is one the agent stated, so the rule that the engine never chooses for the agent holds without an exception.

The slot search was also the cause of the speed slip measured on 2026-10-15: it laid the whole diagram out once for every slot of the row, and adding a box without a position took up to 189.7 ms at 50 boxes.

## Not chosen

- Keeping the engine's slot as the default when no place is given.
  - That is the engine choosing structure for the agent.
- Putting a box with no place last.
  - A fixed rule would still choose the order, and the agent might never notice that it chose none.
- Keeping `layer tidy` and `diagram tidy` because the agent asks for them.
  - The agent would choose to reorder, but the engine would still choose the order.

## Consequences

Cost: Haiku's drafts may cross more. Ordering the boxes of a batch together had cut the crossings of its three phase 1b drafts from 8, 7 and 6 to 0, 2 and 1. Not yet measured with the agent stating every order.
