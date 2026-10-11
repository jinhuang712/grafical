## Expectation

Rule 1 was broken: these numbers were measured while the checks were built, and no expectation was written first. The phase 2 exit check is benchmarks 4, 7 and 11 at their targets (ROADMAP.md). None of the three needs an agent run.

## Outcome, 2026-10-12: 7 and 11 met, 4 not met

| Benchmark | Target | Measured | Met |
|---|---|---|---|
| 4 Stability | 0 elements moved outside DESIGN.md D10's list, per change | Nodes in rows whose contents did not change move sideways: 9.8 per change on catalog-sync (30 nodes), 3.5 on catalog-sync-grouped (15 nodes). 46 of 97 and 21 of 56 single operations move at least one | No |
| 7 Mechanical defects | 0 found by a separate geometry check on the rendered SVG | 0 in the seven fixtures, 0 in 300 random diagrams, 0 in round phase1b3's 15 pictures rendered again | Yes |
| 11 Speed | ≤ 50 ms in process per operation at 50 nodes, ≤ 400 ms per command | 6.2 ms median, 16.6 ms worst; node rename 185 ms, check 169 ms; render 323 ms | Yes |
| 11 Determinism | The same SVG bytes and PNG pixels on macOS and Linux | Pinned end to end for three fixtures; CI checks them on both systems at the next push | Pending CI |

Commands: `pnpm bench speed`, `pnpm bench geometry --round <name>`, and the scratch measurement described below for benchmark 4.

## Benchmark 4: why it is not met

The column grid (D10) is solved again from the facts after every change, and one operation can change which columns other rows' nodes take. Structure stays: the stability tests in test/layout/layout.test.ts show that no unnamed node changes layer, order or group in 169 single operations. Positions do not: of the rows whose contents did not change and that moved, 81 moved as one block and 130 spread apart on catalog-sync, and 32 and 40 on catalog-sync-grouped.

The measurement applies every single operation of the stability tests to the two fixtures (a node added to each layer, each node removed, each edge removed, 20 edges added) and counts, for each unnamed node, a sideways move relative to the centre line in a layer whose nodes and alignments did not change. D10's list allows sideways moves only in layers whose contents changed, or that hold a node aligned to one that moved.

Remembering the last layout is not an option: the file alone decides the picture (D15). Meeting the target needs a column solver whose choices stay local to the change. That is open work, and the owner decides whether to do it before the stage 1 benchmarks or to restate the target.
