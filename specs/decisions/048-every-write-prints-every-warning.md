# 048. Every write prints every warning

Decided: 2026-10-18

Replaced in part by specs/decisions, "A line from every box of a group is a warning": an eighth warning joined.

## The problem

Decided by the owner on 2026-10-18, the same day as "Refusals say what happened and which commands can change it", which had kept one warning, a line with more than two bends. The composition counts ("Composition counts") told an agent how many lines pass rows or cross groups, but not which, unless it read `show --drawn`.

## The choice

- **A warning for each place the counts count**, each its own block: `bent-edge` and `passing-layer` and `edge-across-group` and `tight-edges` and `crowded-label` and `lonely-node` and `crossing`.
  - The counts line stays as it was, and `next` names the commands that rearrange the picture.
  - Decided by the owner later the same day: a box reached through its group or row or lane is connected in the picture, so it is no `lonely-node`.
  - Of the 16 boxes with no line of their own in the 329 saved drafts, 8 were reached that way and are no longer warned of.
  - Changed on 2026-10-19 by "A line from every box of a group is a warning": `edge-per-member` is an eighth and prints after `lonely-node`.
- **All of them, every time.** Every write prints every warning the diagram has and not only those the command caused.
  - Every change lays the whole diagram out again ("Layout computed again on every change"), so the set can differ after any change.
- **No source.** Decided by the owner later the same day: a warning has no `source:`, in text or in `--json`; errors and defects keep theirs.
  - The outcome line `ok changed=<ids>` already tells the agent what it just changed, so it can match a warning that names those ids itself.
  - Telling a new warning from an old one needs a second layout per write, of the diagram before it.
    - Measured on a quiet machine, one operation on a 50-box diagram went from a median of 10.3 ms and a worst of 33.9 ms to 19.0 and 67.1 ms.
    - The target is 50 ms.
- **Measured** on round p1g's final drafts:
  - At scale 10 a write prints no warning.
  - At scale 25 it prints 35 blocks in 220 lines.
  - At scale 50 it prints 173 to 232 blocks in 1,117 to 1,490 lines and 31 to 41 KB, most of them crossings.

## Not chosen

- Only the warnings the command caused.
  - The set changes with every layout, and a warning from before may be the one to act on.
- A source on every warning by laying out the diagram before the write.
  - The source would be `already in the file` or the command.
  - That is the second layout per write, which misses the speed target as measured above.
- A source only on the warnings this write made, printed first.
  - It needs the same second layout, so it has the same cost.
- A cache of the last layout beside the file, to compare with.
  - It is a second file that goes stale when the diagram is edited by hand or switched in git.
- One block per crossing point.
  - Two lines that cross twice are one thing to change.

## Consequences

On a 50-box draft a write prints about 170 to 230 warning blocks, most of them crossings.
