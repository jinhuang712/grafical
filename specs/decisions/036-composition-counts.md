# 036. Composition counts

Decided: 2026-10-16

## The problem

Decided on 2026-10-16 from a request that agents see how a picture is composed, not only how many lines cross. `crossings` and `bends` miss pictures that are wrong in ways an agent can fix by choosing rows differently: a line that runs over a system it has nothing to do with, two lines drawn almost on top of each other, a label with no air. The counts go on the `counts` record that `apply`, `try`, `check` and `show --drawn` print (FEATURES.md, "Counts").

## The choice

- **`across`:** lines that cross the box of a group that holds neither of their ends. A group holds an end when the end is the group, a member, or lies inside its box. A line is counted once, however many groups it crosses.
- **`tight`:** pairs of runs of two different lines that run side by side closer than a track (12 px) for more than 100 px. Runs of one bus (lines that leave or arrive at one port, "Fan-outs of three bundle") are never a pair. A pair is a place, not a pair of lines: two lines tight in two places count twice.
- **`crowded`:** line labels with less than 8 px of room on two or more of their four sides. Room on a side is the distance to the nearest line (not the label's own), box, group border, band border or other label that faces it.
- **Separate counts, never one score.** PHILOSOPHY.md rejected a score of how hard a picture is to read on 2026-10-13, because readers differ. Each count is a fact the agent weighs; `try` shows the delta of each.
- **Gutters.** `show --drawn` also prints a `gutter above=<row> below=<row> lines= crossings= tight= crowded=` record for each pair of neighbouring rows that hold boxes: the space from the bottom of the upper row's boxes to the top of the lower row's. `lines` counts the lines with a run in it, even one that only passes through; the other three count the crossings, tight pairs and crowded labels that lie in it (a vertical tight pair counts in every gutter it spans). The agent compares gutters to see which row order costs; the record gives no advice, and no sum.
- **Measured** over the 306 saved agent drafts: `across` 66 lines in 29 drafts, `tight` 6 pairs in 3 drafts, `crowded` 88 labels in 51 drafts (GOALS.md, "Mechanical defects").
- **Help.** The three are described in `apply --help`'s Output section.

## Not chosen

- One composition score: a weighted sum hides which of the three costs.
- Counting a line once per group it crosses: the agent's fix is the same, a different row or group for one end.
- Counting a bus's own runs as tight: a bus is drawn as one trunk on purpose.

## Consequences

Changed on 2026-10-18 by "Every write prints every warning": each place `passing`, `across`, `tight` and `crowded` count is also a warning block, on every write.
