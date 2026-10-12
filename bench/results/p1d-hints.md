## Expectation

Written on 2026-10-12, before any run, as rule 1 asks. The owner asked that the drawing model, not a person, find the better drawing (DESIGN.md D35), so this comparison is measured by the lines alone, with `pnpm bench lines`, and no person rates it.

### What runs

| Part | Round | What | Calls |
|---|---|---|---|
| hints | p1d-hints | Five drafts, grafical as it is, Haiku, 3 runs each | 15 |
| nohints | p1d-nohints | The same, with the tool's hint lines removed by the harness's wrapper | 15 |

The tasks: the public brief (`catalog-sync.md`) and the 25-component brief (`scale-25.md`), whose stage 1 drafts had the most problem lines (a mean of 5 and up to 53); `password-reset`, the one loose prompt the owner rejected for a line; and the two new types, `refund-flow` and `order-states` (`bench/prompts/types.yaml`). Cost: about $0.40, of the owner's $20.

### What is measured

For each final diagram: problems (crossings plus lines with more than two bends), crossings, bends, the hints still left in it, and how many of the hints grafical printed during the run the agent then ran.

### What is expected, and what each outcome decides

1. **Agents follow hints.** In at least 6 of every 10 drafts that were shown a hint, the agent runs at least one. Below 3 in 10: hints are ignored, and the guide or the report must make them harder to miss.
2. **Lines get better.** The hints round has at least 30% fewer problems per draft than the no-hints round, over the same tasks. If agents run hints and the problems do not fall, the cost that ranks them does not measure what a reader sees, and D35's ranking changes.
3. **Nothing breaks.** No draft fails, and a draft costs at most 20% more with hints, for the extra commands.

## Outcome of the first try, 2026-10-12

Both rounds ran on commit c28d014: $0.116 with hints and $0.111 without, 30 drafts, every one with a picture. Measured with `pnpm bench lines`:

| | Hints printed | No hints |
|---|---|---|
| Drafts shown a hint | 9 of 15 | none |
| Drafts that ran a hint | 0 of 9 | none |
| Problems per draft (crossings plus lines over two bends) | 3.87 | 5.53 |
| Crossings per draft | 3.07 | 3.67 |
| Bends per draft | 12.20 | 16.47 |

1. **Agents follow hints: not met, 0 of 9.** The agents looked at their picture once and stopped, as in stage 1. The fewer problems with hints are not the hints' doing, since none ran: one no-hints draft alone has 17 problems, so the two rounds differ by chance.
2. **Lines get better: not tested,** since no hint ran. Applied without judgment, the first hint clearly improved the drafts looked at: the password reset went from 1 crossing, 2 lines over two bends and 12 bends to none, none and 7, and the order states lost the detour of the cancel line.
3. **Nothing breaks: met.** No draft failed, and the costs are level.

Decision, as item 1 set it: hints must be harder to miss. `grafical diagram improve` now takes them, one by one while they help, and the guide's workflow gains a step: if any output shows a hint, run it and render again. The rerun is round p1d-hints2, on the same tasks, against the same no-hints round.

## Outcome of the second try, 2026-10-12

Round p1d-hints2 ran on commit 91f8e43, with `diagram improve` and the guide's fourth step: $0.121, every draft with a picture.

| Task | Problems with improve | Problems without hints |
|---|---|---|
| order-states | 0, 0, 0 | 1, 1, 1 |
| password-reset | 1, 0, 0 | 1, 1, 2 |
| refund-flow | 0, 0, 0 | 0, 0, 0 |
| catalog-sync | 29, 3, 14 | 17, 1, 4 |
| scale-25 | 37, 21, 15 | 14, 18, 22 |
| Mean | 8.00 | 5.53 |

1. **Agents follow hints: met.** 9 of the 11 drafts that showed a hint ran `diagram improve`.
2. **Lines get better: not met over the round,** for a reason the transcripts show. Every improve lowered the problems of the draft it ran on: in catalog-sync r1, crossings 5 -> 0 and bends 28 -> 14; in r3, lines over two bends 6 -> 1 and crossings 5 -> 0. But improve also moved nodes among other kinds, and the agent then moved them back by hand: "The layout hints moved some nodes into rows they do not belong in: an actor into Services, a store into Kafka." Those hand moves left catalog-sync r1 with 29 problems. Agents read a row as a tier, and undo a move across tiers.
3. **Nothing breaks: met.** No draft failed; $0.121 against $0.111.

Decision: `diagram improve` takes only safe hints, which keep each node among its own kind (a swap within a row, or a move into a row of the same family: steps and states, stores, or queues), and never moves a caller or an outside system. Other hints are still shown, marked, for the agent to judge. The rerun is round p1d-hints3.

## Outcome of the third try, 2026-10-12

Round p1d-hints3 ran on commit 8b8d202, with safe hints only: $0.134, every draft with a picture.

| Task | Problems, safe improve | Problems without hints |
|---|---|---|
| order-states | 0, 0, 0 | 1, 1, 1 |
| password-reset | 1, 0, 1 | 1, 1, 2 |
| refund-flow | 0, 0, 0 | 0, 0, 0 |
| catalog-sync | 7, 7, 4 | 17, 1, 4 |
| scale-25 | 11, 29, 39 | 14, 18, 22 |

1. **Agents follow hints: met.** 7 of the 10 drafts that showed a hint ran `diagram improve`, and no agent moved anything back.
2. **Lines get better: met where hints appeared, not over the round.** On the four tasks where hints were shown, problems fell from 2.42 to 1.67 per draft, 31%. The 25-component drafts were never shown a hint: of the 100 single moves in the messiest one, 57 are refused because they would split a group, and the best of the rest only takes it from 39 problems to 32. Its problems come from a hub, a Kafka topic at the far right that every service's message line runs across the picture to reach; moving its whole group to the middle (`group order`) takes it to 29, and no single-node hint can. With those drafts, the round's mean is 6.60 against 5.53, a difference that comes from three drafts no hint touched.
3. **Nothing breaks: met.** $0.134 against $0.111, for the extra commands.

Decisions: a hint may move a whole group (`group order`), which keeps every node in its row and among its kind, so it is safe; and since agents now run `diagram improve` when shown a hint, the next engine changes are measured offline, by running improve on the saved drafts (`pnpm bench lines --improve`), at no cost.

## Expectation for the fourth try, written before it runs

The owner removed `diagram improve` the same day: the engine now says what to improve (`lines:`) and measures moves (`hint:`), and the agent runs each move itself (D35). Round p1d-hints4 runs the same five tasks, three runs each, on Haiku, about $0.13, against the same no-hints round.

1. **Agents still act.** In at least 6 of every 10 drafts shown a hint, the agent runs at least one hint's commands. Below 3 in 10: telling is not enough, and the owner decides what comes next.
2. **Lines get better where hints appear.** On the tasks where hints are shown, problems per draft are at least 30% below the no-hints round's on the same tasks, as round three's were with `diagram improve`.
3. **Nothing is undone.** No agent moves a node back after running a hint.

<!-- generated by `pnpm bench summary`: edit above this line only -->

# Round p1d-hints

## Versions

- Claude Code: 2.1.296 (Claude Code)
- Models: haiku = claude-haiku-5-5
- grafical commit: c28d014

## Baseline (the empty task)


## Results

Each cell is `mean (min–max)` over its runs. Raw numbers include Claude Code's fixed overhead.

| Step | Arm | Model | Runs | Cost ($) | Wall (s) | API (s) | Turns | Tool calls | Fresh tokens | Cache hit (%) | Image reads | Op errors (%) | Denied | Off-tool | Engine defects | Agent defects | Geometry | Picture | Regens | Score (/50) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| catalog-sync e1 | grafical | haiku | 3 | 0.011 (0.010–0.012) | 43.3 (40.0–49.0) | 41.5 (38.3–47.0) | 6.0 (5.0–8.0) | 4.7 (4.0–6.0) | 33966 (31319–38124) | 84.1 (81.5–86.6) | 1.0 (1.0–1.0) | 30.6 (25.0–33.3) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0), 1 n/a | 0.0 (0.0–0.0), 1 n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| order-states e1 | grafical | haiku | 3 | 0.005 (0.004–0.006) | 13.1 (11.1–17.1) | 11.2 (9.4–14.6) | 6.0 (5.0–8.0) | 5.0 (4.0–7.0) | 14906 (13827–16700) | 90.2 (88.9–92.5) | 1.0 (1.0–1.0) | 33.3 (33.3–33.3) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| password-reset e1 | grafical | haiku | 3 | 0.005 (0.005–0.007) | 18.4 (14.5–22.7) | 16.7 (13.0–20.8) | 5.3 (4.0–7.0) | 4.3 (3.0–6.0) | 17356 (15749–19944) | 88.1 (85.2–90.6) | 1.3 (1.0–2.0) | 41.7 (25.0–50.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| refund-flow e1 | grafical | haiku | 3 | 0.005 (0.005–0.007) | 15.0 (12.6–19.2) | 13.2 (10.8–17.3) | 6.0 (5.0–8.0) | 5.0 (4.0–7.0) | 17557 (15903–19766) | 88.5 (87.1–90.5) | 1.0 (1.0–1.0) | 42.2 (33.3–60.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| scale-25 e1 | grafical | haiku | 3 | 0.012 (0.011–0.014) | 46.5 (41.0–52.9) | 43.2 (38.0–48.8) | 9.7 (8.0–12.0) | 7.7 (6.0–10.0) | 34348 (31504–38357) | 90.3 (88.7–92.1) | 1.0 (1.0–1.0) | 62.6 (50.0–77.8) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |

### Cost of a whole chain (sum of the steps)

| Arm | Model | Chains | Chain cost ($) |
|---|---|---|---|
| grafical | haiku | 15 | 0.008 (0.004–0.014) |

### Draft (e1) minus the empty baseline

| Arm | Model | Cost ($), net | Fresh tokens, net |
|---|---|---|---|

## Failed runs

None.
