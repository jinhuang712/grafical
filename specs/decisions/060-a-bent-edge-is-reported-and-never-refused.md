# 060. A bent edge is reported and never refused

Decided: 2026-10-16

## The problem

An edge with more than two bends only costs a reader: the picture stays correct. Until then only `check --all` said so, and the agent never heard.

## The choice

- **Measured before building** over the 306 saved agent drafts:
  - 81 drafts (26%) have an edge with more than two bends.
  - That is 242 edges in all, 192 of them with four.
  - Every one of the 242 joins two nodes that are not in neighbouring layers.
- **Edges with more than two bends** are reported on every write and by `check` and `render`.
  - Single commands report them too.
  - Each gets a `bent-edge` warning, and the counts get `bent=`.
  - Not refused.
  - Built on 2026-10-16.

## Not chosen

- Refusing an edge with more than two bends unless the agent allows it, as a wall lets an edge through.
  - Proposed on 2026-10-16; the owner chose reporting, which never blocks.
- Refusing every edge with more than two bends.
  - Some structures need an edge to skip layers, and a dense diagram might not be drawable at all.

## Consequences

An edge with more than two bends is a warning, and the write goes through.
