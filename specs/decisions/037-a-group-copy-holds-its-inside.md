# 037. A group copy holds its inside

Decided: 2026-10-16

## The problem

Decided by the owner on 2026-10-16, before building the copying of a group, one of the first candidates for more combinations of operations. A second zone, region or shard is the same boxes, groups and lines again, and drawing it took one operation for each.

## The choice

- **What the copy holds.** The group's inner groups at every level, its boxes, and the lines between them, each box with all its facts.
- **Lines to everything else only when asked.** With `--outside`, every line between the group and something outside it is copied too.
  - A second zone usually talks to the same load balancer.
  - A standby often does not talk to what its primary does, so the agent states which.
- **The label is stated.** `--label` is required, as for `group add`.
  - Two groups with one label are almost always a mistake.
- **The place is stated, as for `group order`.** The copy goes before or after a group the agent names, in every row of the copy.
- **A fact that cannot hold twice is refused, never left off.** An alignment or steps to a box outside the group would put the box and its copy in one place.
  - A lane or a column that would move the copy away from the place stated is refused the same way, following the owner's choice for alignments and steps.
- **Notes and walls are not copied.** They name what they are about, and the copy is not part of them until the agent says so.

## Not chosen

- Copying the lines to the outside every time.
  - The agent would have to remove the ones it did not mean.
- Never copying them.
  - A zone would need one `edge add` per line to the outside.
- The original's label on the copy.
  - The agent would rename it almost every time.
- Leaving off what the copy cannot keep: an alignment, steps, a lane or a column.
  - Nothing would tell the agent that its copy is not a copy.
- Letting the row follow its columns afterwards, as it does after other operations.
  - The copy would not sit where it was stated, and the `group-split` refusal that followed named copied boxes that were never written.

## Consequences

Cost: lines copied with `--outside` must sometimes be changed one by one with `edge retarget` or `edge remove`, as for a standby that nothing calls. A group whose boxes sit in two columns of one row cannot be copied beside itself while they keep their columns.
