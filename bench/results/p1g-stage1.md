# Round p1g: the MVP bar measured again

## Expectation

Written before the round runs (EXPERIMENTS.md, rule 1). Asked for by the owner on 2026-10-18.

Every unmet item of GOALS.md, "The MVP bar" was last measured on 2026-10-12. Since then: records in place of prose, `try`, steps, walls, notes, marks, copying a group, the agent stating every order, refusals whose fixes a test holds, and the help restructured (DESIGN.md, "One entry page, help where it is used", "Help for the tool, guides for best practice", "One way to a page, and a wrong command names the right one"). This round measures them on the grafical of d983df4.

The parts, all Haiku, as the stage 1 rerun of 2026-10-12 ran them; each chain ends with a reflection, as in `p1f-reflect`:

- `p1g-stage1` (part `e1e2`): the public brief, a draft and the 8 change requests, grafical, raw and Mermaid, 3 runs each.
- `p1g-scale` (part `scale`): the 10-, 25- and 50-component briefs, all three arms, 3 runs.
- `p1g-intent` (part `intent`): the 10 loose prompts, grafical, one run each.
- `p1g-mvp` (part `mvp`): the private reference brief, grafical, 3 runs, kept outside the repository.

Not run: Opus drafts (the model gap was met on 2026-10-12), and the higher-thinking and `diagram-design` baselines, which have no arm yet.

What is expected, and what each outcome drives:

1. **Iteration** (GOALS.md: at least 90% of change steps done right, each at most 30 s and 15k fresh tokens). 71% on 2026-10-12, and six of the seven misses asked about something the draft had merged away. Expected: about the same, since no change since touches merging. Under 90% again: the next work is how a draft merges, not the help.
2. **Operation errors** (at most 5% of calls refused). On 2026-10-12, 0% for drafts, 20% for the scale drafts, 13% for the loose prompts. DESIGN.md, "Help for the tool, guides for best practice" names the risk: with no type guides in the help, `p1d-guides` went from 3% to 16%. Expected: drafts under 5%, the loose prompts and the scale drafts still over it. Over 13% on the loose prompts, or a Start or End drawn as initial or final: decide with the owner whether the entry page points to the guides more.
3. **Mechanical defects:** the geometry check is expected to find none, as the write path refuses every agent defect. The judges' defect score on the private brief, if the owner keeps the judges (at least 4 of 5).
4. **The picture turned in** (two blind Opus judges, at least 42 of 50 on the private brief), if the owner keeps the judges. 38.0 on 2026-10-12.
5. **Verifiability:** at most one look at the picture per draft, none per change. Expected: unchanged, about one look per change step.
6. Counted, not targets: the help pages and guides read before the first write, `unknown-command` refusals, and the cost per chain.

Cost: one chain runs first, and the owner approves the total from its real cost (rule 4).

## Results

Run on 2026-10-18: 49 Haiku chains, $0.78 in all, against the $1.5 the owner approved after the probe ($0.043 for a draft, 8 changes and a reflection). The owner chose no Opus: no drafts and no judges. The owner reviews the pictures for problems instead of scoring them. The probe ran alone. The rest first ran in two streams, then six chains at a time, because the owner asked for it to go faster: two chains cut off when the streams stopped are kept in `bench/runs/p1g-interrupted` ($0.023 recorded) and ran again.

1. **Iteration: met on the means.** 23 of 24 grafical change steps made a new picture (96%, against 71% on 2026-10-12), the measure of 2026-10-12. A change step took 7 to 13 s and 1.4k to 5k fresh tokens on average, except grouping the three publishers: 29 s and 12k on average, and 60 s and 24k in its slowest run. The miss: the draft had merged the publishers, the agent added them back, and their lines crossed the catalog-sync group's title. `title-blocked` named where the title fits (`clear=right,outside-right`) but no command, and the agent moved boxes for 15 calls, then asked.
2. **Operation errors: not met.** Refused calls: 0 of 12 in the public brief's drafts; 13 of 62 in its changes (21%), 12 of them in the grouping step and 1 of 44 without it; 19%, 26% and 24% in the drafts of 10, 25 and 50 components; 5 of 41 in the loose prompts (12%); 11 of 20 in two drafts of the private brief (55%), most of them `title-blocked`. The third private draft called `./bin/grafical`, which the harness does not count, so its calls are missing.
3. **Mechanical defects:** the geometry check found none in the 46 grafical pictures. One engine-owned defect: `needless-bend` on `events->wave-planner` in `scale-50.grafical-haiku-r3`. No judges ran, so there is no defect score.
4. **The picture turned in:** not measured; no judges ran.
5. **Verifiability: not met, closer.** One look at the picture per draft; 0 to 0.3 per change step on average, against about one on 2026-10-12.
6. **Help and guides before the first write,** counted by a script over the transcripts, which the harness does not count yet: 161 reads in 22 grafical drafts, about 7 each. Every draft read the entry page and `apply --help`; 20 of 22 read a guide, the list or architecture and once swimlane. No `unknown-command` refusal. This round had no flowchart, so whether a Start or End is drawn as initial or final was not measured.

From the agents' reflections:
- Row labels are not drawn, and 8 chains expected them: `layer add` takes a label, but a row with boxes is drawn only as a band when a line ends at it.
- Some refusals name no fix: `missing-field` for a second box in a row (the place to give), `title-blocked` (the `group title` command for a clear place) and `unquoted-text` (to quote the value).
- `group-conflict` named a node of another group and suggested joining it; the cause was that a group's box covers every row between its members.
- `node rename` keeps the id, and `edge reverse` keeps an id that names the old direction.
- In 4 chains a shell command ran past the 120 s timeout after grafical had printed all of its output. Not grafical; the cause is not confirmed. `ls` runs `eza` in the agents' shell, and an `eza` process was still running when the streams stopped.

<!-- generated by `pnpm bench summary`: edit above this line only -->

# Round p1g-stage1

## Versions

- Claude Code: 2.1.301 (Claude Code)
- Models: haiku = claude-haiku-5-5
- grafical commit: 4f89d81

## Baseline (the empty task)


## Results

Each cell is `mean (min–max)` over its runs. Raw numbers include Claude Code's fixed overhead.

| Step | Arm | Model | Runs | Cost ($) | Wall (s) | API (s) | Turns | Tool calls | Fresh tokens | Cache hit (%) | Image reads | Op errors (%) | Denied | Off-tool | Engine defects | Agent defects | Geometry | Picture | Regens | Score (/50) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| e1 | grafical | haiku | 3 | 0.015 (0.012–0.019) | 36.3 (4.6–57.0) | 46.5 (43.0–50.4) | 5.7 (1.0–9.0) | 7.7 (6.0–10.0) | 42205 (28728–63333) | 90.2 (85.0–94.7) | 1.0 (1.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| e1 | mermaid | haiku | 3 | 0.005 (0.004–0.005) | 21.0 (18.4–24.7) | 15.6 (13.1–17.6) | 5.0 (4.0–6.0) | 4.0 (3.0–5.0) | 13940 (13249–14375) | 91.5 (89.3–93.4) | 0.3 (0.0–1.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e1 | raw | haiku | 3 | 0.008 (0.006–0.009) | 27.8 (24.6–32.7) | 25.4 (22.3–30.3) | 6.7 (6.0–7.0) | 5.0 (4.0–6.0) | 21291 (18938–22774) | 91.2 (89.7–93.4) | 1.0 (1.0–1.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-edge | grafical | haiku | 3 | 0.002 (0.002–0.002) | 7.4 (6.4–8.9) | 4.1 (3.2–5.9) | 2.3 (2.0–3.0) | 1.3 (1.0–2.0) | 1421 (981–2068) | 99.3 (99.2–99.5) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-edge | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 8.4 (8.1–8.7) | 4.1 (3.9–4.2) | 2.7 (2.0–3.0) | 1.7 (1.0–2.0) | 1243 (1156–1414) | 99.0 (98.9–99.2) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-edge | raw | haiku | 3 | 0.001 (0.001–0.002) | 7.0 (5.0–8.9) | 4.6 (2.3–6.7) | 2.0 (1.0–3.0) | 1.0 (0.0–2.0) | 1491 (421–2428) | 99.0 (98.5–99.6) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 2/3 | 0.0 (0.0–0.0) | – |
| e2-add-node | grafical | haiku | 3 | 0.004 (0.003–0.005) | 13.4 (12.5–13.8) | 9.6 (8.9–10.2) | 4.0 (3.0–5.0) | 3.0 (2.0–4.0) | 4972 (3150–8014) | 98.4 (97.6–98.9) | 0.3 (0.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-node | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 9.1 (8.7–9.6) | 5.7 (5.2–6.0) | 2.7 (2.0–3.0) | 1.7 (1.0–2.0) | 1891 (1709–2000) | 98.5 (98.4–98.6) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-add-node | raw | haiku | 3 | 0.002 (0.001–0.003) | 10.1 (6.2–14.9) | 7.6 (3.7–12.1) | 3.0 (1.0–6.0) | 2.0 (0.0–5.0) | 3691 (986–7930) | 97.7 (95.6–98.9) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 2/3 | 0.0 (0.0–0.0) | – |
| e2-compact | grafical | haiku | 3 | 0.004 (0.003–0.006) | 12.2 (11.1–13.7) | 7.9 (6.5–9.7) | 4.7 (4.0–6.0) | 3.3 (3.0–4.0) | 4230 (2185–7615) | 99.0 (98.3–99.4) | 0.3 (0.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-compact | mermaid | haiku | 3 | 0.003 (0.002–0.006) | 20.0 (10.4–34.0) | 13.0 (6.4–22.6) | 5.3 (4.0–7.0) | 4.3 (3.0–6.0) | 4972 (2871–8302) | 98.3 (97.9–98.6) | 1.0 (0.0–2.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-compact | raw | haiku | 3 | 0.002 (0.002–0.002) | 8.5 (7.9–8.9) | 5.2 (4.6–5.6) | 2.7 (2.0–3.0) | 1.7 (1.0–2.0) | 1707 (1521–1937) | 99.0 (98.8–99.1) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-group-nodes | grafical | haiku | 3 | 0.009 (0.003–0.019) | 28.9 (12.8–60.1) | 24.6 (9.2–54.2) | 7.7 (3.0–16.0) | 6.3 (2.0–15.0) | 11968 (3403–24177) | 98.2 (97.0–98.9) | 0.3 (0.0–1.0) | 26.7 (0.0–80.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 2/3 | 0.0 (0.0–0.0) | – |
| e2-group-nodes | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 7.7 (4.8–9.3) | 4.0 (2.4–5.1) | 2.0 (1.0–3.0) | 1.0 (0.0–2.0) | 1270 (532–1671) | 98.9 (98.8–99.1) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 2/3 | 0.0 (0.0–0.0) | – |
| e2-group-nodes | raw | haiku | 3 | 0.001 (0.001–0.002) | 7.3 (4.4–9.5) | 4.2 (1.8–5.7) | 2.0 (1.0–3.0) | 1.0 (0.0–2.0) | 1181 (552–1735) | 99.2 (99.0–99.3) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 1/3 | 0.0 (0.0–0.0) | – |
| e2-move-node | grafical | haiku | 3 | 0.003 (0.002–0.004) | 11.5 (8.2–14.1) | 7.3 (4.4–9.2) | 4.0 (3.0–5.0) | 2.7 (2.0–3.0) | 4364 (2154–7741) | 98.4 (97.2–99.1) | 0.3 (0.0–1.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-move-node | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 9.6 (8.6–11.4) | 5.7 (4.7–7.6) | 2.7 (2.0–3.0) | 1.7 (1.0–2.0) | 1956 (1676–2291) | 98.4 (98.2–98.6) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-move-node | raw | haiku | 3 | 0.003 (0.002–0.004) | 12.0 (8.4–17.4) | 8.4 (6.1–11.7) | 4.0 (2.0–6.0) | 2.7 (1.0–4.0) | 4893 (2045–9337) | 97.6 (96.1–98.7) | 0.3 (0.0–1.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-remove-node | grafical | haiku | 3 | 0.002 (0.002–0.002) | 7.6 (6.0–9.6) | 4.0 (2.7–6.2) | 2.3 (2.0–3.0) | 1.3 (1.0–2.0) | 1382 (857–2084) | 99.3 (99.1–99.5) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-remove-node | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 8.2 (7.8–8.7) | 4.0 (3.4–4.4) | 3.3 (2.0–4.0) | 2.3 (1.0–3.0) | 1355 (948–1622) | 98.9 (98.8–99.2) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-remove-node | raw | haiku | 3 | 0.002 (0.002–0.002) | 10.3 (8.7–12.3) | 7.3 (5.8–9.7) | 4.3 (3.0–5.0) | 3.3 (2.0–4.0) | 2703 (2632–2777) | 98.5 (98.3–98.9) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-rename-node | grafical | haiku | 3 | 0.002 (0.002–0.002) | 9.0 (7.6–10.4) | 5.6 (4.4–6.5) | 3.0 (3.0–3.0) | 2.0 (2.0–2.0) | 1827 (1587–2127) | 99.3 (99.1–99.4) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-rename-node | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 7.9 (7.5–8.2) | 3.6 (3.3–3.9) | 2.7 (2.0–3.0) | 1.7 (1.0–2.0) | 1135 (890–1385) | 99.0 (98.8–99.3) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-rename-node | raw | haiku | 3 | 0.002 (0.001–0.002) | 9.4 (6.8–12.2) | 5.9 (4.3–8.9) | 3.0 (3.0–3.0) | 2.0 (2.0–2.0) | 1955 (1699–2463) | 98.9 (98.9–98.9) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-reverse-edge | grafical | haiku | 3 | 0.003 (0.002–0.004) | 11.4 (8.3–13.2) | 7.1 (4.3–9.3) | 3.3 (2.0–5.0) | 2.3 (1.0–4.0) | 2690 (1892–3333) | 99.1 (99.0–99.4) | 0.0 (0.0–0.0) | 11.1 (0.0–33.3) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | 0.0 (0.0–0.0) | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-reverse-edge | mermaid | haiku | 3 | 0.001 (0.001–0.001) | 10.0 (8.7–11.2) | 5.2 (4.8–5.7) | 2.7 (2.0–3.0) | 1.7 (1.0–2.0) | 1585 (1469–1643) | 98.9 (98.9–98.9) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |
| e2-reverse-edge | raw | haiku | 3 | 0.002 (0.002–0.002) | 10.2 (9.4–10.9) | 6.5 (5.6–8.2) | 3.0 (3.0–3.0) | 2.0 (2.0–2.0) | 2241 (1996–2449) | 98.8 (98.7–99.0) | 0.0 (0.0–0.0) | n/a | n/a | n/a | n/a | n/a | – | 3/3 | 0.0 (0.0–0.0) | – |

### Cost of a whole chain (sum of the steps)

| Arm | Model | Chains | Chain cost ($) |
|---|---|---|---|
| grafical | haiku | 3 | 0.044 (0.040–0.051) |
| mermaid | haiku | 3 | 0.017 (0.014–0.019) |
| raw | haiku | 3 | 0.022 (0.021–0.023) |

### Draft (e1) minus the empty baseline

| Arm | Model | Cost ($), net | Fresh tokens, net |
|---|---|---|---|

## Failed runs

None.
