# 060. A bent line is reported and never refused

Decided: 2026-10-16

Split on 2026-11-06 from specs/decisions, "The dirty work has edges".
Replaced in part by specs/decisions, "Every write prints every warning": a bent line is a warning block.

## The problem

A line with more than two bends only costs a reader: the picture stays correct. Until then only `check --all` said so, and the agent never heard.

## The choice

- **Measured before building** over the 306 saved agent drafts:
  - 81 drafts (26%) have a line with more than two bends.
  - That is 242 lines in all, 192 of them with four.
  - Every one of the 242 joins two boxes that are not in neighbouring rows.
- **Lines with more than two bends** are reported on every write and by `check` and `render`.
  - Single commands report them too.
  - Each gets a `bent line= bends= skip=` record, and the counts get `bent=`.
  - Not refused.
  - Rule 2 of "A target picture with measured rules" said it already, but only `check --all` reported it.
  - The agent never heard.
  - Built on 2026-10-16.
  - To make room in the help read before a draft, `apply --help` lost two passages:
    - The line "Where lines go is grafical's job, never yours", which the rows an agent chooses now contradict.
    - A clause about the engine placing boxes, gone since "The agent states every order".

## Not chosen

- Refusing a line with more than two bends unless the agent allows it, as a wall lets a line through.
  - Proposed on 2026-10-16; the owner chose reporting, which never blocks.
- Refusing every line with more than two bends.
  - Some structures need a line to skip rows, and a dense diagram might not be drawable at all.

## Consequences

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it" and "Every write prints every warning": a line with more than two bends is a `warning: bent-line` block, no longer a `bent line=` record.
