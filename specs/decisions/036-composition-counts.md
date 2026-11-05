# 036. Composition counts

Decided: 2026-10-16

Replaced in part by specs/decisions, "Every write prints every warning": each counted place is also a warning.

## The problem

Decided on 2026-10-16 from a request that agents see how a picture is composed, not only how many lines cross. `crossings` and `bends` miss pictures that are wrong in ways an agent can fix by choosing rows differently: a line that runs over a system it has nothing to do with, two lines drawn almost on top of each other, a label with no air. The counts go on the `counts` record that `apply`, `try`, `check` and `show --drawn` print.

## The choice

- **Three counts of composition:**
  - `across` for lines through a group that holds neither end.
  - `tight` for runs of two lines side by side.
  - `crowded` for labels with little room.
- **Separate counts, never one score.** On 2026-10-13 the philosophy rejected a score of how hard a picture is to read because readers differ.
  - Each count is a fact the agent weighs; `try` shows the delta of each.
- **Gutters.** `show --drawn` also prints a `gutter` record for each pair of neighbouring rows, with the same counts for the space between them.
  - The agent compares gutters to see which row order costs; the record gives no advice, and no sum.
- **Measured** over the 306 saved agent drafts on 2026-10-16:
  - `across`: 66 lines in 29 drafts.
  - `tight`: 6 pairs in 3 drafts.
  - `crowded`: 88 labels in 51 drafts.
- **Help.** The three are described in `apply --help`'s Output section.

## Not chosen

- One composition score: a weighted sum hides which of the three costs.
- Counting a line once per group it crosses: the agent's fix is the same, a different row or group for one end.
- Counting a bus's own runs as tight: a bus is drawn as one trunk on purpose.

## Consequences

Changed on 2026-10-18 by "Every write prints every warning": each place `passing`, `across`, `tight` and `crowded` count is also a warning block, on every write.
