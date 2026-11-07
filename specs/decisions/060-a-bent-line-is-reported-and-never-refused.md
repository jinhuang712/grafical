# 060. A bent line is reported and never refused

Decided: 2026-10-16

## The problem

A line with more than two bends only costs a reader: the picture stays correct. Until then only `check --all` said so, and the agent never heard.

## The choice

- **Measured before building** over the 306 saved agent drafts:
  - 81 drafts (26%) have a line with more than two bends.
  - That is 242 lines in all, 192 of them with four.
  - Every one of the 242 joins two boxes that are not in neighbouring rows.
- **Lines with more than two bends** are reported on every write and by `check` and `render`.
  - Single commands report them too.
  - Each gets a `bent-edge` warning, and the counts get `bent=`.
  - Not refused.
  - Rule 2 of "A target picture with measured rules" said it already, but only `check --all` reported it.
  - The agent never heard.
  - Built on 2026-10-16.

## Not chosen

- Refusing a line with more than two bends unless the agent allows it, as a wall lets a line through.
  - Proposed on 2026-10-16; the owner chose reporting, which never blocks.
- Refusing every line with more than two bends.
  - Some structures need a line to skip rows, and a dense diagram might not be drawable at all.

## Consequences

A line with more than two bends is a warning, and the write goes through.
