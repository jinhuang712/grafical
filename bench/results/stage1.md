## Expectation

Written on 2026-10-12, before any stage 1 run, as rule 1 asks. The rounds run on the grafical commit that adds this file or a later one. The owner's blind ratings on the rating page are the final judge; Opus judges score only the MVP bar.

### What runs

| Part | Round | What | Calls |
|---|---|---|---|
| e1e2 | stage1 | E1 draft and the 8 E2 change requests on the public brief: grafical, no tool and Mermaid, Haiku, 3 runs each | 81 |
| opus | stage1-opus | E1 drafts on Opus, grafical and no tool, 3 runs each: the model gap (benchmark 5) | 6 |
| scale | stage1-scale | E4 drafts on the 10-, 25- and 50-component briefs, all three arms, Haiku, 3 runs each | 27 |
| intent | stage1-intent | E3: the 10 loose prompts, grafical, Haiku, one run each | 10 |
| mvp | stage1-mvp | The MVP bar: the private reference brief, grafical, Haiku, 3 runs, kept outside the repository, scored by two Opus judges | 3 |

Cost: the phase 1b rounds cost about $0.01 per Haiku draft and $0.002 per change step, and one Opus judge call cost $0.14. Expected total: about $5, of the owner's $20.

### What is expected, and what each outcome decides

1. **E1 drafts (benchmark 1):** the owner rates grafical's drafts above the no-tool and Mermaid drafts on visual quality and defects, and about level on accuracy and clarity, which depend on what Haiku chooses to draw. Decides nothing alone; it is the first comparison with Mermaid.
2. **E2 changes (benchmarks 2 and 4):** grafical does at least 7 of every 8 requests right, regenerates nothing, and changes no fact it was not asked to; the owner sees "a little" else change on some requests, from sideways movement in untouched rows. Mermaid rewrites `diagram.mmd` on most requests, and its layout moves more. If the owner marks grafical's other changes "a lot" on more than a quarter of requests, a local column solver comes before release.
3. **Model gap (benchmark 5):** Opus with grafical scores at most 4 of 25 above Haiku with grafical, and the gap is smaller than without a tool. If it is larger, the agent-facing guide is the next work, not the engine.
4. **Scale (benchmark 8):** grafical has no mechanical defect at 10, 25 or 50 components, and the owner rates clarity at least 3 of 5 at 50. The no-tool arm shows defects from 25 on. Mermaid stays clean but grows wide. A defect at 25 is an engine bug to fix before release.
5. **Intent (benchmark 10):** the owner accepts at least 7 of the 10 loose-prompt drawings without changes. Below 5 means the guide must teach more about choosing what to draw.
6. **MVP bar (goal 1):** probably not met. The phase 1b drafts on the public brief scored about 34 of 60 with the order criterion, about 28 of 50 without it, against a bar of 42 of 50. Met: phase 3 goes on to release. Not met: the split between the engine's and the agent's points says which side to work on.

## Outcome so far, 2026-10-12

The runs and the MVP judging are done; the owner's blind ratings are not in yet. The rounds ran on commits f3d2cda to e67b36e, which differ only in the benchmark harness, not in grafical.

**Cost:** $2.22 for 55 chains, and $0.80 for Opus judging (one $0.14 test call and the six MVP verdicts): $3.02 of the owner's $20.

**The owner's ratings** are the final judge for E1, E2, the model gap, scale and intent. Every picture is on the owner's rating page under blind letters, with a sixth round, "how it looks", for approving the new features (swimlanes, themes, stylesheets, the live viewer).

### MVP bar (goal 1): not met, closer than expected

Two Opus judges scored Haiku's three drafts of the private reference brief 40, 38 and 37 of 50 (mean 38.3), against a bar of 42. The expectation was about 28. Accuracy and clarity got 4 from every judge; the points went in defects (3 or 4) and fit (3 or 4), which are the engine's side. What the judges listed:

- lines of one fan-out drawn as one shared trunk before they branch, which every judge counted as lines sharing a segment;
- two lines from different boxes at the same height, end to end, that read as one line;
- a crossing near the shared store, and a line about 15 px from a store's cylinder;
- a label between two arrowheads, so that it is unclear which it names;
- no legend entry for the dashed border of external boxes.

Decision, as the expectation set it: the engine's side is the next work.

### What was measured, before the owner's ratings

- **E1 drafts:** all 9 Haiku drafts made a picture. Per draft, grafical cost $0.011 and took 48 s, against $0.007 and 47 s with no tool and $0.004 and 16 s with Mermaid. grafical refused 39% of draft calls (33–50%), down from 53–66% in phase 1b but far above the 5% target of benchmark 6.
- **Mechanical defects (benchmark 7):** the separate geometry check found 0 in all 49 grafical pictures of the four public rounds.
- **E2 changes:** a new picture in 17 of 24 grafical change steps, 22 of 24 Mermaid and 23 of 24 with no tool. Of grafical's 7 misses, 6 named something the draft had merged or listed as "Not shown" (Redis, auth-svc, the three upstream publishers, Kafka), and the agent asked instead of inventing it. That is the change script's known flaw, and it hits grafical hardest because its guide teaches merging. The seventh was grafical refusing a new row inside a group's rows (`group-gap`); the agent asked how to resolve it.
- **Unnamed fact changes (benchmark 4, restated):** `grafical diff` between consecutive steps shows that every grafical change step changed only facts its own operations named: 0 unnamed changes. Twice the agent also moved a box to fit a new edge, by an operation of its own.
- **Model gap:** an Opus draft cost $0.26 with grafical and $0.31 with no tool. The scores are the owner's.
- **Scale:** all 27 drafts made a picture, and grafical's 9 have no mechanical defect at 10, 25 or 50 components. Haiku merged hard: one draft of the 50-component brief has 16 boxes.
- **Intent:** 10 drawings wait for the owner's accept or reject.

### Harness notes

- Two scale drafts kept their file as `<name>.grafical.yaml`, as the guide suggests, so the step copies missed it; their files were checked by hand: 0 defects. Later rounds keep any `*.grafical.yaml`.
- `pnpm bench summary` replaced this file's expectation with a template, because the file had no marker line; it was restored from commit f3d2cda.

<!-- generated by `pnpm bench summary`: edit above this line only -->

# Round stage1

## Versions

- Claude Code: 2.1.296 (Claude Code)
- Models: haiku = claude-haiku-5-5
- grafical commit: d775ba6, e67b36e, f3d2cda

## Baseline (the empty task)


## Results

Each cell is `mean (min–max)` over its runs. Raw numbers include Claude Code's fixed overhead.

| Step | Arm | Model | Runs | Cost ($) | Wall (s) | API (s) | Turns | Tool calls | Fresh tokens | Cache hit (%) | Image reads | Op errors (%) | Denied | Off-tool | Engine defects | Agent defects | Geometry | Picture | Regens | Score (/50) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| e1 | grafical | haiku | 3 | 0.011 (0.009–0.013) | 48.0 (36.8–53.9) | 46.1 (34.8–52.1) | 5.3 (5.0–6.0) | 4.3 (4.0–5.0) | 35564 (29740–39239) | 83.2 (82.3–84.6) | 1.0 (1.0–1.0) | 38.9 (33.3–50.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 3/3 | 0.0 (0.0–0.0) | – |
| e1 | mermaid | haiku | 3 | 0.004 (0.003–0.005) | 16.3 (12.9–21.5) | 14.2 (10.9–18.9) | 4.0 (3.0–5.0) | 3.0 (2.0–4.0) | 13294 (11298–17243) | 83.1 (79.0–85.5) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e1 | raw | haiku | 3 | 0.007 (0.006–0.008) | 47.1 (25.6–82.4) | 26.8 (24.0–31.9) | 6.7 (6.0–7.0) | 4.7 (4.0–5.0) | 20508 (19224–22579) | 88.7 (87.4–89.6) | 1.0 (1.0–1.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-edge | grafical | haiku | 3 | 0.002 (0.001–0.003) | 8.7 (5.0–11.4) | 7.4 (4.4–9.7) | 3.3 (1.0–5.0) | 2.0 (0.0–3.0) | 3377 (733–5879) | 98.7 (97.4–99.6) | 0.3 (0.0–1.0) | 27.8 (0.0–50.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 2/3 | 0.0 (0.0–0.0) | – |
| e2-add-edge | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 5.4 (5.3–5.5) | 3.7 (3.5–3.9) | 3.0 (3.0–3.0) | 2.0 (2.0–2.0) | 1360 (1297–1485) | 98.5 (98.5–98.6) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-edge | raw | haiku | 3 | 0.001 (0.001–0.002) | 6.2 (4.6–8.7) | 5.1 (3.6–7.3) | 3.0 (2.0–5.0) | 2.0 (1.0–4.0) | 1847 (1150–2826) | 98.8 (98.7–98.9) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-node | grafical | haiku | 3 | 0.009 (0.006–0.013) | 31.8 (22.1–43.5) | 28.3 (19.5–38.8) | 11.7 (9.0–16.0) | 10.3 (8.0–15.0) | 14555 (10711–18021) | 97.8 (97.3–98.3) | 1.0 (1.0–1.0) | 18.9 (9.1–33.3) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-node | mermaid | haiku | 3 | 0.002 (0.001–0.002) | 8.8 (7.4–10.6) | 7.0 (5.2–9.1) | 4.7 (4.0–5.0) | 3.7 (3.0–4.0) | 3589 (2403–5446) | 96.5 (95.0–97.5) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-node | raw | haiku | 3 | 0.002 (0.001–0.004) | 11.0 (8.1–14.9) | 9.5 (7.2–13.7) | 4.7 (2.0–10.0) | 3.7 (1.0–9.0) | 4885 (2859–8633) | 96.8 (96.1–97.2) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-compact | grafical | haiku | 3 | 0.001 (0.001–0.002) | 4.2 (3.9–4.7) | 3.0 (2.6–3.5) | 2.0 (2.0–2.0) | 1.0 (1.0–1.0) | 1199 (1074–1408) | 99.1 (99.0–99.2) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 3/3 | 0.0 (0.0–0.0) | – |
| e2-compact | mermaid | haiku | 3 | 0.005 (0.002–0.008) | 23.1 (8.5–35.7) | 18.3 (6.8–29.6) | 9.0 (3.0–14.0) | 7.7 (2.0–12.0) | 8506 (3855–14320) | 97.5 (97.0–98.2) | 0.3 (0.0–1.0) | n/a | n/a | n/a | n/a | n/a | – | 1/3 | 0.0 (0.0–0.0) | – |
| e2-compact | raw | haiku | 3 | 0.001 (0.001–0.001) | 5.0 (4.5–5.5) | 4.1 (3.7–4.8) | 2.3 (2.0–3.0) | 1.3 (1.0–2.0) | 1417 (1178–1850) | 98.9 (98.7–99.1) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-group-nodes | grafical | haiku | 3 | 0.001 (0.001–0.002) | 6.6 (4.5–10.6) | 5.5 (3.9–8.7) | 1.7 (1.0–2.0) | 0.7 (0.0–1.0) | 1630 (875–3102) | 99.1 (98.2–99.6) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 1/3 | 0.0 (0.0–0.0) | – |
| e2-group-nodes | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 6.5 (5.4–7.6) | 4.9 (3.7–6.0) | 3.3 (3.0–4.0) | 2.3 (2.0–3.0) | 1961 (1453–2294) | 98.1 (97.6–98.5) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-group-nodes | raw | haiku | 3 | 0.001 (0.001–0.001) | 5.1 (3.2–6.3) | 3.7 (2.3–4.7) | 1.7 (1.0–2.0) | 0.7 (0.0–1.0) | 1280 (409–1900) | 98.9 (98.3–99.5) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 2/3 | 0.0 (0.0–0.0) | – |
| e2-move-node | grafical | haiku | 3 | 0.002 (0.001–0.002) | 6.9 (4.7–8.2) | 5.8 (3.6–7.4) | 2.3 (2.0–3.0) | 1.3 (1.0–2.0) | 1879 (993–2829) | 99.1 (98.7–99.4) | 0.0 (0.0–0.0) | 33.3 (0.0–100.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 1/3 | 0.0 (0.0–0.0) | – |
| e2-move-node | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 5.9 (5.7–6.0) | 4.3 (4.2–4.5) | 3.0 (3.0–3.0) | 2.0 (2.0–2.0) | 1786 (1722–1877) | 97.9 (97.8–98.0) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-move-node | raw | haiku | 3 | 0.002 (0.001–0.003) | 8.4 (6.2–12.6) | 7.4 (5.3–11.5) | 3.7 (2.0–7.0) | 2.3 (1.0–5.0) | 3945 (2059–7603) | 97.4 (96.0–98.2) | 0.3 (0.0–1.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-remove-node | grafical | haiku | 3 | 0.001 (0.001–0.002) | 4.1 (3.3–5.0) | 3.2 (2.7–4.0) | 2.0 (2.0–2.0) | 1.0 (1.0–1.0) | 926 (569–1511) | 99.4 (99.0–99.6) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 2/3 | 0.0 (0.0–0.0) | – |
| e2-remove-node | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 4.9 (4.7–5.0) | 3.3 (3.3–3.4) | 4.0 (4.0–4.0) | 3.0 (3.0–3.0) | 1492 (1454–1519) | 98.2 (98.1–98.3) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-remove-node | raw | haiku | 3 | 0.002 (0.001–0.003) | 8.2 (5.7–12.0) | 7.0 (4.6–10.5) | 4.0 (3.0–5.0) | 3.0 (2.0–4.0) | 2761 (1963–3921) | 98.4 (98.2–98.6) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-rename-node | grafical | haiku | 3 | 0.001 (0.001–0.001) | 5.1 (4.7–5.9) | 3.6 (3.1–3.8) | 2.0 (2.0–2.0) | 1.0 (1.0–1.0) | 1223 (1138–1322) | 99.0 (98.7–99.2) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 3/3 | 0.0 (0.0–0.0) | – |
| e2-rename-node | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 4.7 (4.6–4.9) | 3.3 (3.0–3.5) | 3.0 (3.0–3.0) | 2.0 (2.0–2.0) | 1147 (1078–1184) | 98.6 (98.5–98.7) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-rename-node | raw | haiku | 3 | 0.001 (0.001–0.001) | 4.4 (4.0–5.1) | 3.5 (3.2–4.0) | 2.3 (2.0–3.0) | 1.3 (1.0–2.0) | 1223 (1000–1638) | 98.9 (98.6–99.0) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-reverse-edge | grafical | haiku | 3 | 0.001 (0.001–0.002) | 4.8 (3.9–6.3) | 3.6 (2.7–5.1) | 2.0 (2.0–2.0) | 1.0 (1.0–1.0) | 1295 (835–1617) | 99.2 (98.9–99.4) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 2/3 | 0.0 (0.0–0.0) | – |
| e2-reverse-edge | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 5.7 (5.2–6.6) | 4.1 (3.7–4.8) | 3.0 (3.0–3.0) | 2.0 (2.0–2.0) | 1458 (1421–1520) | 98.5 (98.4–98.5) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-reverse-edge | raw | haiku | 3 | 0.001 (0.001–0.002) | 5.4 (4.6–6.6) | 4.5 (3.7–5.6) | 2.3 (2.0–3.0) | 1.3 (1.0–2.0) | 1666 (1367–2216) | 98.7 (98.5–98.8) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |

### Cost of a whole chain (sum of the steps)

| Arm | Model | Chains | Chain cost ($) |
|---|---|---|---|
| grafical | haiku | 3 | 0.032 (0.027–0.034) |
| mermaid | haiku | 3 | 0.017 (0.013–0.020) |
| raw | haiku | 3 | 0.019 (0.017–0.022) |

### Draft (e1) minus the empty baseline

| Arm | Model | Cost ($), net | Fresh tokens, net |
|---|---|---|---|

## Failed runs

None.
