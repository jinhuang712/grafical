<!-- what-we-build: approved 2026-10-15 -->
# Goals

Each goal is a check with a number, grouped under the want in [PROPOSAL.md](PROPOSAL.md) that it serves. The benchmark harness measures most of them in rounds of agent runs, and CI measures the rest on every push. [EXPERIMENTS.md](EXPERIMENTS.md) defines each metric and how a round runs. The targets are first estimates, except the MVP bar: a recorded decision may change any other target, and only the owner changes the MVP bar.

A status is ✅ met, ❌ not met, or ⬜ not measured, always with the date of the measurement. Code and documents cite a check by its heading, such as `GOALS.md, "Speed"`.

## The MVP bar

Set by the owner on 2026-10-13 (PHILOSOPHY.md, "What makes grafical good?"). It has two parts.

- **The main bar: easy and consistent.** Haiku, using only the command line and its help, meets the targets of "Iteration", "Stability", "Model gap", "Operation errors", "Determinism" and "Speed", with zero mechanical defects.
- **Beside it: the judged score.** Haiku draws the private reference brief well enough that two blind Opus judges score it at least 42 of 50. 42 is what the `diagram-design` skill scored with Opus and Sonnet on that brief on 2026-10-10.
- **Status:** ❌ not met. On 2026-10-12 the judges scored Haiku's three drafts 40, 34 and 40 (mean 38.0). In round `p1g` on 2026-10-18 "Iteration" was met, and in the main bar "Operation errors" is still not met, and one draft had an engine-owned defect. No judges ran that day, by the owner's choice (`bench/results/p1g-stage1.md`).

## A change is one small step

### Iteration

- **Target:** at most 30 s and 15k fresh tokens per change request, and at least 90% of requests done right the first time.
- **Method:** the benchmark harness runs a draft and 8 change requests on the public brief, 3 runs per arm (EXPERIMENTS.md, "E2 Iteration").
- **Kill threshold:** slower or costlier per change than redrawing with no tool.
- **Status:** ✅ met on the means on 2026-10-18 (round `p1g`): 23 of 24 change steps made the change (96%). Per step, time averaged 7 to 29 s and fresh tokens 1.4k to 12k; one run of grouping took 60 s and 24k, refused by `title-blocked`. On 2026-10-12 it was not met: 17 of 24 (71%), six of the seven misses asking about something the draft had merged away.

### Stability

- **Target:** no fact changes that no operation named: a row, an order, a group, a lane or an alignment. Boxes that move sideways in rows the change did not touch are measured, without a target.
- **Method:** the stability tests apply single operations, and `grafical diff` compares each change step with the one before. Restated by the owner on 2026-10-12.
- **Kill threshold:** any unnamed fact change.
- **Status:** ✅ met on 2026-10-12. 0 unnamed changes in all 169 single operations of the tests and in every change step of the stage 1 round.

## The agent never places anything

### No placement by the agent

- **Target:** no transcript in which the agent works out a position or writes a script to lay out the picture.
- **Method:** the benchmark harness scans every grafical transcript of a round.
- **Kill threshold:** none set.
- **Status:** ⬜ not measured.

## Enough to say what is needed

### Enough to say

- **Target:** number not set. It counts the times an agent wanted to state something that no operation could express, and drew something else or gave up.
- **Method:** read from the refusals and the agents' own notes in a benchmark round. The first measured round sets the target.
- **Kill threshold:** none set.
- **Status:** ⬜ not measured.

## Complete and clear at once

### Mechanical defects

- **Target:** no overflow, overlap, line through a box or label collision, and a defect score from the judges of at least 4 of 5.
- **Method:** `pnpm bench geometry` checks every rendered SVG of a round with a geometry check of its own. It does not use grafical's checker, which refuses every write it flags and so would always report zero (DESIGN.md, "Defects owned by who can fix them").
- **Kill threshold:** any defect in an output is a bug.
- **Status:** ❌ not met on 2026-10-12. The geometry check found no defect in all 49 grafical pictures of the stage 1 round, nor in the 46 of its rerun, but the judges gave the drafts of the reference brief a defect score of 3 or 4. On 2026-10-18 (round `p1g`) it found none in 46 pictures, no judges ran, and one draft of 50 components had an engine-owned `needless-bend`.

- **Composition, measured on 2026-10-16** over the 306 saved agent drafts (`across`, `tight` and `crowded` of DESIGN.md, "Composition counts"): 66 lines run across a group that holds neither end, in 29 drafts; 6 pairs of runs are tight, in 3 drafts; 88 labels are crowded, in 51 drafts. Not targets: facts to compare a change against.

### Scale

- **Target:** no defect, and a clarity of at least 3 of 5 at 50 boxes.
- **Method:** Haiku drafts briefs of 10, 25 and 50 components, 3 runs each, rated blind by the owner (EXPERIMENTS.md, "E4 Scale").
- **Kill threshold:** a defect at 25 boxes.
- **Status:** ⬜ not shown at 50 boxes. On 2026-10-12 all 9 drafts had no defect, and the 50-component drafts scored a clarity of 5, 5 and 4. But Haiku merged that brief into 15 to 19 boxes, so no picture of 50 boxes was judged. On 2026-10-18 one draft drew 51 boxes, with 174 crossings and an engine-owned defect; its clarity was not rated.

### Faithfulness

- **Target:** no invented component, and at most 1 important item of the brief missing.
- **Method:** the judges' checklist in each first-draft round (EXPERIMENTS.md, "E1 First draft").
- **Kill threshold:** any invented component.
- **Status:** ⬜ not measured as a count.

## Fewer turns, less time, fewer tokens

The checks in this section are comparative. A number such as 35.6k tokens means nothing alone, so grafical is held against three baselines that draw the same brief:

- **A stronger model with a higher thinking budget, without grafical,** such as Opus with extended thinking.
- **The same model without grafical:** Haiku drawing on its own.
- **Other tools,** such as Mermaid and the `diagram-design` skill.

The rule, set by the owner on 2026-10-15: grafical gets a picture the owner accepts for less than each baseline pays for a picture the owner accepts. A baseline that draws no accepted picture loses the comparison, whatever it spends. The first drafts of the stage 1 round on the public brief, 2026-10-12, 3 runs each, mean per draft:

| Arm | Owner's rating (of 25) | Cost | Time | Fresh tokens | From the cache |
|---|---|---|---|---|---|
| Haiku with grafical | 24 | $0.011 | 48 s | 35.6k | 83.2% |
| Opus with grafical | 24 | $0.259 | 39 s | 23.7k | 84.6% |
| Opus without grafical | 5 | $0.312 | 54 s | 26.5k | 87.1% |
| Haiku without grafical | 5 | $0.007 | 47 s | 20.5k | 88.7% |
| Haiku with Mermaid | 5 | $0.004 | 16 s | 13.3k | 83.1% |

The owner marked every draft without grafical, and every Mermaid draft, too bad to rate, so none was accepted. Opus ran at its default thinking budget, so the higher-thinking baseline has not run yet, and neither has the `diagram-design` skill.

### The picture turned in

- **Target:** a judged score of at least 42 of 50 for the picture the agent turns in at the end. How many drafts or calls it took to get there is not counted: "Time", "Token use" and "Cost" measure what they cost.
- **Method:** Haiku draws the brief from the command line and its help, 3 runs, and the final picture of each is judged blind (EXPERIMENTS.md, "E1 First draft").
- **Kill threshold:** a score below 34, the no-tool score of the 2026-10-10 test.
- **Status:** ❌ not met on 2026-10-12: 38.0 on the private reference brief.

### Time

- **Target:** an accepted diagram in less wall time than each baseline takes for an accepted one.
- **Method:** the benchmark harness, from each run's wall time, first drafts and change requests.
- **Kill threshold:** a baseline that gets accepted diagrams in less time.
- **Status:** ✅ met on 2026-10-12 against the baselines that ran, none of which drew an accepted picture. ⬜ The higher-thinking baseline and the `diagram-design` skill have not run.

### Token use

- **Target:** an accepted diagram for fewer fresh tokens than each baseline uses for an accepted one. Also, the help an agent reads before its first operation stays under 3k tokens; suspended by the owner on 2026-10-17 while the help's correctness comes first (DESIGN.md, "One entry page, help where it is used").
- **Method:** the benchmark harness, from each run's token counts. Fresh tokens leave out cache reads.
- **Kill threshold:** a baseline that gets accepted diagrams for fewer tokens.
- **Status:** ✅ met on 2026-10-12 against the baselines that ran. ⬜ The higher-thinking baseline and the `diagram-design` skill have not run, and the help read before the first operation was not measured, because the round recorded no empty baseline.

### Context added

- **Target:** an accepted diagram adds fewer tokens to the agent's conversation than each baseline adds for an accepted one. What stays in the conversation is what the agent carries into all its later work.
- **Method:** the benchmark harness, from each transcript: the size of the conversation when the task ends, less its size when the task starts.
- **Kill threshold:** a baseline that adds less to the conversation for accepted diagrams.
- **Status:** ⬜ not measured.

### Cost

- **Target:** an accepted diagram for less money than each baseline pays for an accepted one, for first drafts and for change requests.
- **Method:** the benchmark harness, from each run's cost.
- **Kill threshold:** a baseline that gets accepted diagrams for less.
- **Status:** ✅ met on 2026-10-12 against the baselines that ran. ⬜ The higher-thinking baseline and the `diagram-design` skill have not run.

### Cache hit rate

- **Target:** a higher share of input read from the cache than each baseline that draws accepted diagrams.
- **Method:** the benchmark harness: cache reads divided by all input tokens, per run.
- **Kill threshold:** a baseline that draws accepted diagrams with a higher share.
- **Status:** ✅ met on 2026-10-12 against the baselines that ran. ⬜ The higher-thinking baseline and the `diagram-design` skill have not run.

### Verifiability

- **Target:** at most 1 look at the picture per first draft, and none per change. Only taste and faithfulness need a judge, and every other check is mechanical.
- **Method:** the benchmark harness counts the images each agent opens.
- **Kill threshold:** the agent must look at the picture after each step.
- **Status:** ❌ not met on 2026-10-18 (round `p1g`), closer: drafts looked once, and changes 0 to 0.3 times per step on average. On 2026-10-12 changes looked up to once per step: 1.0 when adding a node, 0.3 when adding a line.

### Operation errors

- **Target:** at most 5% of operations refused, each recovered within 1 retry.
- **Method:** the benchmark harness counts refused calls in each round.
- **Kill threshold:** above 20%.
- **Status:** ❌ not met on 2026-10-18 (round `p1g`). The public brief's drafts were refused 0% of their calls and its changes 21%, nearly all in one grouping step; the scale drafts 19% to 26%, the loose prompts 12%, and two drafts of the private reference brief 55%, mostly `title-blocked`. On 2026-10-12: drafts 0%, scale drafts 20%, loose prompts 13%.

### Speed

- **Target:** at most 50 ms in process to apply, lay out and check one operation at 50 boxes, and at most 400 ms for one command.
- **Method:** `pnpm bench speed`, on random diagrams of about 50 boxes.
- **Kill threshold:** a render above 2 s.
- **Status:** ✅ met on 2026-10-15, after DESIGN.md, "The agent states every order" removed the slot search. One operation took a median of 8.1 ms and at most 18.6 ms. Commands took 185 to 198 ms, and a render 368 ms. Earlier the same day, adding a box without a position took up to 189.7 ms, because the slot search laid the diagram out once for every slot.

## A small model draws like a large one

### Model gap

- **Target:** Opus's score minus Haiku's at most 4, on the same task.
- **Method:** Opus and Haiku draw the same brief, 3 runs each, rated blind by the owner.
- **Kill threshold:** as large as the gap with no tool.
- **Status:** ✅ met on 2026-10-12: a gap of 0, both 24 of 25.

### Intent

- **Target:** at least 7 of 10 loose prompts of about three sentences, drawn by Haiku, accepted by the owner without changes.
- **Method:** the owner rates each drawing in person (EXPERIMENTS.md, "E3 Intent").
- **Kill threshold:** fewer than 5 of 10.
- **Status:** ✅ met on 2026-10-12: 9 of 10 accepted.

## The diagram is a file

### Determinism

- **Target:** the same SVG bytes and PNG pixels on macOS and Linux.
- **Method:** CI renders the pinned fixtures on both systems and compares them on every push.
- **Kill threshold:** any difference.
- **Status:** ✅ met on 2026-10-14, in CI run 38584033554.

## Former numbers

Until 2026-10-15 the checks had numbers, and the dated results in `bench/results/` still use them. Benchmark 1 is "The picture turned in" and "Time", 2 "Iteration", 3 "Token use", 4 "Stability", 5 "Model gap", 6 "Operation errors", 7 "Mechanical defects", 8 "Scale", 9 "Faithfulness", 10 "Intent", 11 "Determinism" and "Speed", 12 "Cost", 13 "Cache hit rate" and 14 "Verifiability". Goal 1 is "The MVP bar".
