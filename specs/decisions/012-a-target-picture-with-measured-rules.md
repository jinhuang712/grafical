# 012. A target picture with measured rules

Decided: 2026-10-11

## The problem

On 2026-10-11 the owner judged the engine's first real output "cluttered, messy, lines are all over the place". An Opus designer then hand-drew three uncluttered versions of the public brief, using only what an engine could compute. Two blind Opus judges scored them against the engine's and a raw model's drafts, out of 60:

| Picture | Score |
|---|---|
| Grouped systems (the target) | 57 |
| Compact overview | 57 |
| Layered, curated | 50 |
| The engine, phase 1 | 22 |
| A raw model | 17 |

## The choice

Both judges picked the grouped version. The compact one hid the messaging and retry mechanics that engineers want. The target is `bench/targets/catalog-sync-grouped.png`, with its SVG beside it. The engine must produce pictures like it from facts alone.

The rules that make it uncluttered stay as a record of the target. No code measures them, and only the limit of two bends is used ("The target picture's rules are not reported"):
1. **Grid:** every node centre sits on the column grid ("Layout computed again on every change").
   - At least half the edges are one straight run, and no edge has more than 2 bends.
2. **Crossings:** at most 1 per 10 edges.
3. **Bundling:** each edge meets its node side at a port of its own ("Edges meet any side").
   - A side with more edges than room merges them.
     - 2 or more unlabelled edges of one type that leave it share one trunk.
     - Those that arrive at it share one port.
     - No junction of the trunk looks like a crossing.
4. **Corridors:** an edge that skips layers runs only in a column that is empty in every layer it passes.
   - Of those columns it takes the one whose route crosses fewest of the edges that placement already fixes ("Edges meet any side").
     - Each crossing weighs as two jogs of travel.
     - Between equals it takes the shortest.
   - A corridor through a group frame that holds neither end of the edge pays as much as a crossing, and the edge keeps out of such a frame's margin and border.
5. **Styles:** at most three edge styles and one emphasis.
   - It was two until "Edges meet any side" added the dotted and plain edges on 2026-10-12.
6. **Edge labels:** at most 40% of edges carry one.
7. **Clear text:** no edge crosses any text: node, edge or group label.
   - This one is an engine-owned defect ("Defects owned by who can fix them").
   - Across a group's label it is the agent's ("The agent states where a group's label sits").

## Not chosen

- Tuning against defect counts alone.
  - The phase 1 engine had zero defects on 5,000 random diagrams and still scored 22 of 60.
- The compact overview as the target.
  - It is as clean, but it folds each system into one node.

## Consequences

The target stays as a record of what the look was built toward.
