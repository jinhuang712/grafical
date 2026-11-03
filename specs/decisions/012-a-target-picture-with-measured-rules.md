# 012. A target picture with measured rules

Decided: 2026-10-11

## The problem

On 2026-10-11 the owner judged the engine's first real output "cluttered, messy, lines are all over the place". An Opus designer then hand-drew three uncluttered versions of the public brief, using only what an engine could compute. Two blind Opus judges scored them against the engine's and a raw model's drafts, out of 60:

## The choice

| Picture | Score |
|---|---|
| Grouped systems (the target) | 57 |
| Compact overview | 57 |
| Layered, curated | 50 |
| The engine, phase 1 | 22 |
| A raw model | 17 |

Both judges picked the grouped version. The compact one hid the messaging and retry mechanics that engineers want. The target is `bench/targets/catalog-sync-grouped.png`, with its SVG beside it. The engine must produce pictures like it from facts alone.

The rules that make it uncluttered. The checker measures each one. A broken rule is reported by `grafical check --all`, and it does not block a write; since 2026-10-16 every write reports a line that breaks rule 2 ("The dirty work has edges"):
1. **Size:** the canvas is at most 1024 px wide, so that text shows at full size in a document.
2. **Grid:** every node centre sits on the column grid ("Layout computed again on every change").
   - At least half the edges are one straight segment, and no edge has more than 2 bends.
3. **Crossings:** at most 1 per 10 edges.
4. **Bundling:** each line meets its node side at a port of its own ("Lines meet any side").
   - A side with more lines than room merges them.
     - 2 or more unlabelled edges of one kind that leave it share one trunk.
     - Those that arrive at it share one port.
     - No junction of the trunk looks like a crossing.
5. **Corridors:** an edge that skips rows runs only in a column that is empty in every row it passes.
   - Of those columns it takes the one whose route crosses fewest of the lines that placement already fixes ("Lines meet any side").
     - Each crossing weighs as two jogs of travel.
     - Between equals it takes the shortest.
   - A corridor through a group box that holds neither end of the line pays as much as a crossing, and the line keeps out of such a box's margin and border.
6. **Styles:** at most three line styles and one accent ("Looks").
   - It was two until "Lines meet any side" added the dotted and plain lines on 2026-10-12.
7. **Edge labels:** at most 40% of edges carry one.
8. **Clear text:** no line crosses any text: node, edge or group label.
   - This one is an engine-owned defect ("Defects owned by who can fix them").
   - Across a group's label it is the agent's ("The agent states where a group's label sits").

Which of these rules the checker measures today is in [the checker](../checks.md#rules-that-are-no-longer-reported).

## Not chosen

- Tuning against defect counts alone.
  - The phase 1 engine had zero defects on 5,000 random diagrams and still scored 22 of 60.
- The compact overview as the target.
  - It is as clean, but it folds each system into one box.

## Consequences

Every round judges the target picture as an anchor. A broken rule is reported by `check --all` and never refuses a write, except a line bent for no reason, which every write reports since 2026-10-16.
