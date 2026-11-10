# 033. The agent states every order

Decided: 2026-10-15

## The problem

Decided by the owner on 2026-10-15: the engine does not choose for the agent. Until then the engine made one choice of structure: the order of a layer, for a node added or moved into it without a position.

## The choice

- **A place is required.** A node added to a layer or moved into another layer says where it goes.
  - It goes first or last or before or after a node.
  - Without one it is refused.
- **No tidying.** No command reorders a layer for the agent.
  - An agent that wants fewer crossings compares orders with `--try` and its counts ("Records over prose"), and keeps the one it prefers.
- **No exception left.** Every order in the file is one the agent stated, so the rule that the engine never chooses for the agent holds without an exception.

The slot search was also the cause of the speed slip measured on 2026-10-15: it laid the whole diagram out once for every slot of the layer, and adding a node without a position took up to 189.7 ms at 50 nodes.

## Not chosen

- Keeping the engine's slot as the default when no place is given.
  - That is the engine choosing structure for the agent.
- Putting a node with no place last.
  - A fixed rule would still choose the order, and the agent might never notice that it chose none.
- A command that reorders a layer when the agent asks for it.
  - The agent would choose to reorder, but the engine would still choose the order.

## Consequences

Cost: Haiku's drafts may cross more. Ordering the nodes of a draft together had cut the crossings of its three phase 1b drafts from 8, 7 and 6 to 0, 2 and 1. Not yet measured with the agent stating every order.
