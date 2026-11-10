# 036. Composition counts

Decided: 2026-10-16

## The problem

Decided on 2026-10-16 from a request that agents see how a picture is composed, not only how many edges cross. `crossings` and `bends` miss pictures that are wrong in ways an agent can fix by choosing layers differently: an edge that runs over a system it has nothing to do with, two edges drawn almost on top of each other, a label with no air. The counts go on the `counts` record that `check`, `render` and `show --drawn` print, and on the `before` and `after` records of `--try`.

## The choice

- **Three counts of composition:**
  - `across` for edges through a group that holds neither end.
  - `tight` for runs of two edges side by side.
  - `crowded` for labels with little room.
- **Separate counts, never one score.** On 2026-10-13 the philosophy rejected a score of how hard a picture is to read because readers differ.
  - Each count is a fact the agent weighs; `--try` shows the delta of each.
- **Gutters.** `show --drawn` also prints a `gutter` record for each pair of neighbouring layers, with the same counts for the space between them.
  - The agent compares gutters to see which layer order costs; the record gives no advice, and no sum.
- **Measured** over the 306 saved agent drafts on 2026-10-16:
  - `across`: 66 edges in 29 drafts.
  - `tight`: 6 pairs in 3 drafts.
  - `crowded`: 88 labels in 51 drafts.
- **Help.** The three are described in `check --help`'s Output section.

## Not chosen

- One composition score: a weighted sum hides which of the three costs.
- Counting an edge once per group it crosses: the agent's fix is the same, a different layer or group for one end.
- Counting a bundle's own runs as tight: a bundle is drawn as one trunk on purpose.

## Consequences

Each place `passing`, `across`, `tight` and `crowded` count is also a warning, on every write.
