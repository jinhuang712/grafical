# The benchmark harness

The harness puts a real agent in front of a real task and records what it cost and what it drew. grafical's goals are about agents, and a unit test cannot show how many tokens an agent spends or what picture it ends with, so a round of agent runs is the only way to measure them. The code is in `bench/`, and `pnpm bench` runs each part.

## A round

A round is a set of chains. A chain is one agent session: a first draft of a brief, then the change requests of a fixed script, then a report from the agent. Each chain belongs to an arm, which says what the agent draws with.

```text
brief ──> first draft ──> change 1 ──> ... ──> change 8 ──> reflection
              │              │                     │            │
              └──────────────┴── one step each ────┘            │
                             │                                  │
                             ▼                                  ▼
             transcript · diagram file · picture        reflection.md
                             │
                             ▼
       summary ──> bench/results/ ──> gallery ──> the owner's notes and ratings
```

The runner is headless Claude Code: `claude -p --output-format stream-json --verbose --safe-mode --model <model> --max-budget-usd 1`. `--safe-mode` turns off the host's own customizations, so every run sees the same setup. A first draft starts a session and each change request resumes it.

Each chain gets a new, empty working directory that holds only the brief and, for the grafical arm, a `grafical` command. Every arm gets the same tools: Bash, Read, Write and Edit. A first measuring run had allowed the grafical arm only `grafical *` commands, and Claude Code then blocked `grafical apply …; echo`, so the agent fell back to one command per call. The prompt alone now tells the arm to draw with grafical, and the `offTool` metric counts any Bash command that draws another way.

A run's prompt depends on its arm and step only, never on the model, so Haiku and Opus get it word for word. A test pins this.

## Arms

The grafical arm draws with grafical. The direct arm draws with no tool, and it is what the comparisons in the goals are held against. The harness also keeps a Mermaid arm, which draws with `mmdc` (mermaid-cli) installed outside the repository in `~/.cache/grafical-bench/mermaid` or at `GRAFICAL_BENCH_MMDC`, and keeps its diagram in `diagram.mmd`.

## Inputs

Public briefs live in `bench/briefs/`. They describe fictional systems and drive fixtures, tests, CI and tuning. The first is `catalog-sync.md`, and `scale-10.md`, `scale-25.md` and `scale-50.md` hold fictional systems of those sizes.

Private briefs describe real systems and never enter this repository. The private reference brief is the one from the test of 2026-10-10, and it is used only to check the MVP bar. Its runs happen outside the repository in `.local/grafical-private/runs/`, and only their numbers are committed. grafical is tuned on public briefs only, so the MVP bar measures what it has learned and not what it has memorized.

Loose prompts of about three sentences live in `bench/prompts/`: `intent.yaml` and, one for each diagram type, `types.yaml`. The agent gets the prompt and no brief.

The change script is `bench/changes/catalog-sync.yaml`, 8 requests sent one after another in one session. It covers adding a node between two others, moving a node to another layer, renaming a node, removing a node, adding an edge, reversing an edge, grouping neighbours and making the diagram more compact. A request may name a component the draft merged or left out. Since 2026-10-12 the change prompt says to add it first and then make the change, so every arm is measured on the change itself.

## What each step records

Each step records the metrics below, the transcript, the final diagram file and picture, and their hashes. It also records whether a new picture exists, whether a change step changed the diagram file at all, and the engine-owned defects that `grafical check --all` finds. One measured step answered a move request with a single `show` call and still reported success, which is why a change to the file is recorded. Raw runs go to `bench/runs/`, which is not tracked. Each result records the Claude Code version, the model IDs and grafical's commit, and summary tables are committed under `bench/results/`.

| Metric | What it counts | Source |
|---|---|---|
| Cost | dollars per run | `total_cost_usd` |
| Wall time | seconds from prompt to answer | `duration_ms` · `duration_api_ms` |
| Turns and tool calls | model turns · calls by tool | `num_turns` · the transcript |
| Fresh tokens | uncached input + cache writes + output | `input_tokens` · `cache_creation_input_tokens` · `output_tokens` |
| Cache reads | input served from the cache | `cache_read_input_tokens` |
| Cache hit rate | cache reads ÷ all input | the fields above, per turn |
| Image reads | times the agent opens a picture | the transcript |
| Read before a write | `--help` commands · `grafical guide` commands · calls refused as `unknown-command`, up to the first command that tries to change a file | the transcript |
| Regenerations | changes answered by redrawing everything | the transcript · the operation log |
| Unnamed fact changes | facts changed that no operation named | `grafical diff` |
| Operation errors | refused ÷ all operations · retries | grafical's JSON output |
| Mechanical defects | overflow · overlap · edges through nodes · label collisions · shared runs | `pnpm bench geometry` |

The geometry check reads the rendered SVG and does not use grafical's checker. It reads shapes only, and it treats edges of one style that leave or reach one point as a bus or a fan-in.

Every headless run carries Claude Code's own system prompt, so each round starts with one empty run per model and reports results both as measured and minus that baseline. An empty run on Haiku with `--safe-mode` took 4,265 cache writes, 13,129 cache reads, $0.0010 and 2.1 s on 2026-10-11.

When a step resumes a session, `total_cost_usd` and `duration_api_ms` are running totals, while token counts and wall time are per call. A step's cost is therefore its total minus the previous step's.

## The reflection

Since 2026-10-17 the harness resumes each session once more when its last step is done. This run has no tools, so nothing can change. It asks how the agent drew the diagram and what else it considered, each change it made after its first full draft and why, where the tool got in the way, and what it would draw with no limits (`bench/prompts/reflect.md`). The report goes to `<chain>/reflection/reflection.md`, beside `steps/`, so no metric counts it. The drawing steps stay word for word as before, so rounds still compare.

## A report run

A report run is how a test picture gets made. One clean session draws one picture, or takes the change script too, and the reflection above ends it. `pnpm bench report` writes `report.md` beside the picture, with what the session cost and did and then the agent's own report. It prints the plan and runs nothing unless it gets `--approved`.

## The owner's ratings

`pnpm bench gallery` puts each round's pictures on one page under blind letters, and the owner rates them and writes notes that are read back. Since 2026-11-05 the rating is out of 25 again, because the goals rest on it. No model judges a picture.

## Running a part

`pnpm bench chain --arm <arm>` runs one chain and prints each step's cost. `pnpm bench stage1 --part <e1e2|opus|scale|intent|mvp>` runs one part of a round, `--dry-run` lists its chains and calls, and `--only <chain>` runs one chain to measure its cost first. `--round <name>` runs a part again into a new round, since a round's directory is never reused.

## The routing cases

`bench/routes/` holds the pictures that test the router, and `cases.yaml` says what each tests, which standard of a good route it tests and, where known, the fewest crossings its facts allow. `pnpm bench routes` lays them out and compares crossings, bends, length, the worst detour and defects with `baseline.yaml`, at no cost. `--write` saves a new baseline, and `--render <dir>` writes each picture so that the owner can look. Counts do not cover every standard, so a change to the router goes to the owner with its pictures. Each case is small enough to judge one thing, so whole pictures stay out and wait for an end-to-end round. A shape the owner finds bad becomes a case, and cases are only added.

## Decisions

- [053. Success rests on cost, time, model gap and copying](decisions/053-success-rests-on-cost-time-model-gap-and-copying.md)
