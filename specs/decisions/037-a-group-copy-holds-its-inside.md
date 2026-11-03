# 037. A group copy holds its inside

Decided: 2026-10-16

## The problem

Decided by the owner on 2026-10-16, before building FEATURES.md, "Copying a group", one of the first candidates of ROADMAP.md, "More combinations of operations". A second zone, region or shard is the same boxes, groups and lines again, and drawing it took one operation for each.

## The choice

- **What the copy holds.** The group's inner groups at every level, its boxes, and the lines whose two ends are among them or the group itself. Every id it makes is the original's with the suffix, except the copy's own id, which the agent names, and a line id of the form `<from>-><to>`, which becomes its copied ends' id, so that `diff` shows a plain `edge.add`. Each copied box keeps its label, kind, size, sublabel, marks, accent, lane and column. The copied group keeps the sublabel and sits in the group the original sits in, so it nests as deep.
- **Lines to everything else only when asked.** With `--outside`, every line between the group and something outside it is copied too, its inside end moved to the copy: `lb->web` gives `lb->web-b`. Without it, the copy holds only what is in the group. A second zone usually talks to the same load balancer, but a standby often does not talk to what its primary does, so the agent states which.
- **The label is stated.** `--label` is required, as for `group add`. Two groups with one label are almost always a mistake.
- **The place is stated, as for `group order`.** Each copied box joins its original's row, before the first or after the last box of the group named, in every row of the copy. A group with no box in one of those rows is refused as `no-shared-layer`, and `allowed` lists the groups that have a box in every one. The group copied always does.
- **A fact that cannot hold twice is refused, never left off.** An alignment to a box outside the group, or steps from one, would put the box and its copy in one place. Each is refused as `copy-conflict`, naming the box and the fact. Alignments and steps to boxes inside the group point to their copies. A lane or a column whose order would move the copy away from the place stated is refused the same way: that follows the owner's choice for alignments and steps.
- **Notes and walls are not copied.** They name what they are about, and the copy is not part of them until the agent says so.

## Not chosen

- Copying the lines to the outside every time. The agent would have to remove the ones it did not mean.
- Never copying them. A zone would need one `edge add` per line to the outside.
- The original's label on the copy. The agent would rename it almost every time.
- Leaving off an alignment, steps, a lane or a column that the copy cannot keep. Nothing would tell the agent that its copy is not a copy.
- Letting the row follow its columns afterwards, as it does after other operations. The copy would not sit where it was stated, and the `group-split` refusal that followed named copied boxes that were never written.

## Consequences

Cost: lines copied with `--outside` must sometimes be changed one by one with `edge retarget` or `edge remove`, as for a standby that nothing calls. A group whose boxes sit in two columns of one row cannot be copied beside itself while they keep their columns.
