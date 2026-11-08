# 019. Edges meet any side

Decided: 2026-10-12

## The problem

Decided by the owner on 2026-10-12. In the stage 1 round every comment on grafical's pictures named the edges, and the owner's view was that the agent lacked the means to make a picture clear, not only that the router drew edges badly.

## The choice

Edges may meet a node on any side, and the router chooses the slot and every side the agent left unstated. Each step below was built on its own, measured, and kept because it helped.

- **Types**, 2026-10-12: two types were added for an edge with no direction and for a call that happens only sometimes.
  - The agent can say what an edge means where the old types forced a wrong one.
- **Per edge**, 2026-10-12: arrowheads at both ends and emphasis for the main path.
  - A main path stands out only against thin edges.
- **Curves**, 2026-10-12: a stylesheet may draw corners curved while the routes stay the same orthogonal routes and a curve never enters a node.
- **Side entry**, 2026-10-12: an edge between neighbouring layers may turn once into its target's side instead of bending twice through the gutter.
  - The owner asked for exactly this on the flowchart's loop ("should be entering from the right side instead of the bottom").
  - Over the fifteen saved no-hint drafts, bends fell from 16.47 to 15.60 per draft.
- **Own slots**, 2026-10-12: every edge meets its side at a port of its own; only a side with more edges than ports still merges them.
  - Turning trunks off everywhere was tried and lost: a side with twenty edges became a wide ribbon that crossed everything below it.
  - Over the 42 saved drafts of stage 1 and phase 1d, crossings fell from 5.10 to 4.79 per draft and bends rose from 15.76 to 15.86.
- **Spread slots**, 2026-10-12 after the stage 1 rerun: ports spread over a side first because the judges saw edges leaving one node 16 px apart "in a tight bundle".
  - Over 54 saved drafts, crossings went from 4.39 to 4.43 per draft and bends from 16.06 to 16.13: the change is in how the edges look.
- **Edges kept out of strangers' groups**, 2026-10-12 after the stage 1 rerun: an edge keeps out of the margin and border of a group that holds neither of its ends.
  - Forbidding margins to every edge was tried first and lost: crossings rose from 4.43 to 4.67 per draft, because edges between a group's own members lost their room.
- **Corridors that cross least**, 2026-10-12: an edge that skips layers pays for every crossing that placement already makes certain and not only for distance.
  - Over the 42 saved drafts, crossings fell from 4.79 to 4.14 per draft and bends from 15.86 to 15.67.
  - Weighing a crossing as four or eight jogs gave the same crossings and slightly more bends.
- **Side turns for edges that skip layers**, 2026-10-12: such an edge may leave or enter by a side at the start or end of its corridor.
  - Over the 42 saved drafts, bends fell from 15.67 to 14.45 per draft.
  - Crossings rose from 4.14 to 4.33 in three drafts of 25 components, and a label's slot paying for forced crossings won back two of them (4.24).
- **Forced crossings counted in full**, 2026-10-16: the count of crossings a label's slot forces now leaves the label out of its old place and counts every pair the slot implies.
  - Over the 306 saved drafts, crossings fell from 679 to 676.
- **Two side turns in one gap**, 2026-10-15: two turns may share a gap when their runs keep apart.
  - In a lane process of the field study, bends fell from 8 to 6.
- **A side entry's port moves aside**, 2026-10-15: so that a second edge from that side turns once.
  - In the two-zone web app, bends fell from 6 to 5.
- **Several side entries into one side**, 2026-10-16: a side takes as many entries as fit at heights of their own.
  - Over the 306 saved drafts, 11 changed with one bend fewer each.
  - Over 2,000 fuzz seeds, bends fell from 20,580 to 20,254 and crossings from 20,336 to 20,257.
- **Wide labels between neighbours**, 2026-10-16: an edge between neighbours keeps its label above a straight edge for labels up to 200 px where 120 px sent it round.
  - Over 2,000 fuzz seeds bends fell from 29,157 to 28,591 and crossings from 34,665 to 34,266, with 5.3% more width.
- **Edges along a layer above it**, 2026-10-16: an edge between two nodes of one layer may take the gutter above when fewer edges meet the nodes between its ends from above.
  - In a saved dispatch draft, crossings went from 9 to 4.
  - Over the 306 saved drafts, crossings fell from 675 to 654.
  - Over 2,000 fuzz seeds, crossings fell from 173,696 to 166,849.
  - They fell in 786 diagrams and rose in 20, by 8 at most.
  - The comparison costs time: one operation at 50 nodes went from a median of 10.2 ms and a worst of 21.9 ms to 9.1 ms and 37.0 ms.
  - Tried first and dropped:
    - Choosing before the corridors (`wall-crossed` rose in 17 diagrams).
    - Choosing without the comparison (31 more `needless-bend`).
    - Two other ways of counting.
- **Straight edges meet their nodes' centres**, 2026-10-16: a straight edge pushed off its nodes' shared centre moves back where nothing bends for it.
  - Over the 306 saved drafts, 146 of 1,565 such edges had been 17.6 px off on average.
  - 119 stay off, for reasons the router cannot remove.
  - Three other ways were tried and dropped, each costing the fuzz seeds 93 to 177 more bends or 146 more crossings.
- **Engine marks**, 2026-10-12: a crossing hops so it never reads as a join and a dot marks a join on purpose.
  - Parallel edges needed nothing: across the 42 saved drafts no two run closer than 8 px.
- **Room around stores**, 2026-10-13 (phase 1e): three of six judge verdicts saw edges run close under or beside a cylinder.
  - Edges passed within 16 px of a store 0.70 times a store, against 0.03 to 0.15 for every other type.
  - With the extra room it was 0.19, and the pictures grew 1.8% taller.

## Not chosen

- A dash pattern per edge.
  - The reader would have to decode each one.
- Curves drawn freely, outside the routed channels.
  - They could cross nodes and text, and the router could no longer keep edges apart.

## Consequences

An edge may meet any side of a node. Some labels then have no clear slot unless two edges cross.
