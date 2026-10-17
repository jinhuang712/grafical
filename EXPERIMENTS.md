# Experiments

> Written 2026-10-11.

How grafical's bets are tested: what each experiment asks, what it measures, how it runs, and how a result turns into a decision. The targets the results are compared with live in [GOALS.md](GOALS.md).

## Hypotheses

Each belief in [PHILOSOPHY.md](PHILOSOPHY.md) and each bet in [PROPOSAL.md](PROPOSAL.md) must be able to fail a measurement.

### A small model drafts as well as a strong one

Haiku with grafical draws a first draft as good as strong models with a skill.

- **Traces to:** Bet 2, "Easy and consistent".
- **Measured by:** blind score, model gap.
- **Experiment:** "E1 First draft".

### A change is one small batch

A change costs one small batch, not a regeneration, and is cheaper and faster than regenerating.

- **Traces to:** "Make the next improvement cheap".
- **Measured by:** dollars, wall time and tokens per change, regenerations.
- **Experiment:** "E2 Iteration".

### A change alters only what it names

A change never alters a fact it did not name.

- **Traces to:** "Only the facts you name change".
- **Measured by:** unnamed fact changes, movement outside the list in DESIGN.md, "Layout computed again on every change".
- **Experiment:** "E2 Iteration".

### No caller computes a coordinate

No caller ever computes a coordinate.

- **Traces to:** "Looks are free; places are facts".
- **Measured by:** coordinates or layout scripts in the agent's transcript.
- **Experiments:** "E1 First draft", "E2 Iteration".

### Mistakes are fixed where they are made

Mistakes are fixed at the step that made them.

- **Traces to:** "Make the next improvement cheap".
- **Measured by:** operation errors, retries to recover.
- **Experiments:** "E1 First draft", "E2 Iteration".

### The text output says when it is done

The agent knows it is done from grafical's text output, without looking at the picture.

- **Traces to:** Verifiability.
- **Measured by:** image reads per run.
- **Experiments:** "E1 First draft", "E2 Iteration".

### Short, stable outputs keep the cache warm

Many short, stable command outputs keep the prompt cache warm.

- **Traces to:** Cost.
- **Measured by:** cache hit rate.
- **Experiments:** "E1 First draft", "E2 Iteration".

### Layered facts are enough at 50 nodes

Layered facts are enough for real diagrams at 50 nodes.

- **Traces to:** Bet 1.
- **Measured by:** defects and clarity by size.
- **Experiment:** "E4 Scale".

### A loose prompt is enough

A loose prompt is enough for Haiku to draw what the owner meant.

- **Traces to:** "Easy and consistent".
- **Measured by:** the owner's acceptance.
- **Experiment:** "E3 Intent".

### Each design decision earns its place

Each design decision helps more than its alternative.

- **Traces to:** DESIGN.md.
- **Measured by:** the metric each ablation names.
- **Experiment:** "E5 Ablations".

"The same file is the same picture" is tested mechanically in CI, not by an experiment (GOALS.md, "Determinism").

## Metrics

### Cost

Dollars per run, per first draft and per change request.

- **Source:** `total_cost_usd` in the headless run's result.

### Wall time

Seconds from prompt to final answer, and the API's share of it.

- **Source:** `duration_ms`, `duration_api_ms`.

### Turns, tool calls

Model turns, and tool calls by tool.

- **Source:** `num_turns`, the transcript.

### Tokens

Fresh tokens: uncached input plus cache writes plus output. GOALS.md, "Iteration" and "Token use" count these.

- **Source:** `input_tokens`, `cache_creation_input_tokens`, `output_tokens`.

### Cache reads

Input tokens served from the prompt cache.

- **Source:** `cache_read_input_tokens`.

### Cache hit rate

Cache reads ÷ (uncached input + cache writes + cache reads), per run and per turn.

- **Source:** the fields above, per turn from `stream-json`.

### Image reads

Times the agent opens a rendered picture to judge it.

- **Source:** the transcript.

### Regenerations

Change requests answered by redrawing the whole diagram.

- **Source:** the transcript, and for grafical the operation log.

### Unnamed fact changes

Facts (layer, order, group, alignment) that changed although no operation named them.

- **Source:** grafical's `diff` between before and after.

### Out-of-list movement

Elements that moved although DESIGN.md, "Layout computed again on every change" does not allow it.

- **Source:** the engine's layout, before and after.

### Other changes, no-tool arms

What changed besides the request, counted by the judges.

- **Source:** the judges' answer to "what else changed?".

### Operation errors

Rejected operations ÷ all operations, and the retries until success.

- **Source:** grafical's JSON output.

### Score

Two blind Opus judges, five criteria from 1 to 5 each, 50 points in total.

- **Source:** the judging rules under "Harness", below.

### Faithfulness

Invented components, and important items missing from the brief.

- **Source:** the judges' checklist against the brief.

### Mechanical defects

Overflow, overlap, edges through nodes, label collisions, edges sharing a segment.

- **Source:** a geometry check on the rendered SVG that is separate from grafical's checker: `pnpm bench geometry` (bench/geometry.ts). It reads shapes only, and treats lines of one style that leave or reach one point as a bus or a fan-in.

### Not measured: how readable a picture is

A score of what a reader struggles with (lines to trace, line length, the largest fan-out) was proposed on 2026-10-13 and rejected by the owner: readers and agents prefer different things, and grafical's job is an easy tool and a consistent result, not a picture right for every reader (PHILOSOPHY.md). Crossings and bends stay measured, because they are mechanical and the engine owns them.

### Fixed overhead

Every headless run carries Claude Code's own system prompt. Each round therefore starts with one empty run per model, and results are reported both as measured and minus that baseline.

| Empty run on Haiku, "reply OK" | Cache writes | Cache reads | Cost | Wall time |
|---|---|---|---|---|
| With the host's own setup, 2026-10-11 | 22,018 | 11,421 | $0.0046 | 2.1 s |
| With `--safe-mode`, as the harness runs, 2026-10-11 | 4,265 | 13,129 | $0.0010 | 2.1 s |

### Costs of a resumed session

When a step resumes a session, `total_cost_usd` and `duration_api_ms` are running totals for the whole session, while token counts and wall time are per call. A step's cost is therefore its total minus the previous step's. This was measured in the phase 1 measuring run: the step totals rose by exactly what each step's tokens cost.

## Experiments

### E1 First draft

- **Question:** given a fact brief, how good is the first diagram, and what does it cost?
- **Arms:** a raw model with no tool; the `diagram-design` skill; Mermaid rendered with `mmdc`; grafical. Each runs on Haiku, Sonnet and Opus at medium effort.
- **Input:** a fact brief, and the same prompt for every arm except the line that names its tool.
- **Measured:** score, faithfulness, defects, cost, wall time, turns, tool calls, tokens, cache hit rate, image reads, operation errors.

### E2 Iteration

- **Question:** the core bet. How fast, how cheap and how stable is a change?
- **Input:** each arm's own E1 draft, then a fixed script of 8 change requests sent one after another in the same session. The script covers these change types:
  - add a node between two others;
  - move a node to another layer;
  - rename a node;
  - remove a node;
  - add an edge;
  - reverse an edge;
  - group neighbouring nodes;
  - make the diagram more compact.
- **Requests that name what a draft left out:** a request may name a component the draft merged into another or left out. Since 2026-10-12 (owner's decision, after six of grafical's seven stage 1 misses were such requests), the change prompt says to add it first and then make the change, so every arm is measured on the change itself.
- **Measured, per request:** cost, wall time, tokens, cache hit rate, regenerations, whether the request was done right (judges), unnamed fact changes or other changes, and out-of-list movement.

### E3 Intent

- **Question:** does a loose prompt of about three sentences give Haiku enough to draw what was meant?
- **Input:** 10 loose prompts about fictional systems, in `bench/prompts/intent.yaml`. The agent gets the prompt and no brief.
- **Measured:** the owner accepts or rejects each result without changes. Also cost and wall time.

### E4 Scale

- **Question:** where does each arm break down?
- **Input:** fictional briefs of 10, 25 and 50 components, `bench/briefs/scale-10.md`, `scale-25.md` and `scale-50.md`.
- **Measured:** defects, clarity, score, cost.

### E5 Ablations

- **Question:** does each design decision earn its place? Each ablation runs grafical twice, changing only that decision, on Haiku.

| Decision | A | B | Deciding metric |
|---|---|---|---|
| DESIGN.md, "Operations" batches | Batches allowed | One operation per call | Cost and wall time per draft |
| DESIGN.md, "Interfaces" `guide` | A 1k-token guide | A 3k-token guide | Score and operation errors |
| DESIGN.md, "Interfaces" `show` | `show` | Reading the YAML file | Tokens and operation errors |
| DESIGN.md, "The engine picks a new box's slot" slot choice | The engine picks the slot | New nodes go last | Score and crossings. Never ran: since DESIGN.md, "The agent states every order", the agent states every slot |
| DESIGN.md, "Defects owned by who can fix them" checking | A check after every write | One check at the end | Operation errors and retries |
| DESIGN.md, "Interfaces" output | Compact JSON reports | Full reports | Tokens and cache hit rate |
| DESIGN.md, "Every layered diagram type" type guides | The type guides | No type guides: the main guide alone | Problem lines, refused writes, and whether a draft uses its type's kinds and parts. Ran 2026-10-12 (`bench/results/p1d-guides.md`); the guides then moved into the help (DESIGN.md, "The help as the reference") |
| DESIGN.md, "The help as the reference" help | The guide, as round `p1d-guides` ran it | The help alone, the prompt naming only the `grafical` command (`stage1 --part help`) | The same, and whether agents open `--help` before their first write |

An ablation runs when its decision is built or questioned, not all at once.

## Harness

- **The same prompt for every model:** a run's prompt depends on its arm and step only, never on the model, so that Haiku and Opus get it word for word. A test pins this.
- **Runner:** headless Claude Code, `claude -p --output-format stream-json --verbose --safe-mode --model <model> --max-budget-usd 1`.
  - `--safe-mode` turns off the host's own customizations, so every run sees the same setup.
  - E1 starts a session, and each E2 request resumes it.
  - Each chain gets a new, empty working directory holding only the brief and, for the grafical arm, a `grafical` command.
  - Both arms get the same tools: Bash, Read, Write and Edit. The prompt alone tells the grafical arm to draw with grafical, and the `offTool` metric counts any Bash command that draws another way.
  - A first measuring run had allowed the grafical arm only `grafical *` commands. Claude Code then blocked `grafical apply …; echo`, and the agent fell back to one command per call.
- **What an engine change did:** `pnpm bench diff <ref>` compares the working tree's engine with the one at `<ref>` over the saved drafts, the fixtures and fuzz seeds, at no cost (bench/diff.ts).
- **Measuring before a round:** `pnpm bench chain --arm <arm>` runs one chain, a first draft and its change requests, and prints each step's cost. Rule 4 below uses it.
- **The end of stage 1:** `pnpm bench stage1 --part <e1e2|opus|scale|intent|mvp>` runs one part, `--dry-run` lists its chains and calls, and `--only <chain>` runs one chain to measure its cost first. The `mvp` part runs in `grafical-private/runs/`, outside the repository.
- **The Mermaid arm** draws with `mmdc` (mermaid-cli), installed outside the repository in `~/.cache/grafical-bench/mermaid`, or `GRAFICAL_BENCH_MMDC`, with a puppeteer config that points at the local Chrome. It keeps its diagram in `diagram.mmd`.
- **A reflection after each chain** (from 2026-10-17, asked for by the owner to bring product feedback back): once a chain's last step is done, the harness resumes its session once more, with no tools, so that nothing can change, and asks for a short report under four headings: how the agent drew it and what else it considered, each change it made after its first full draft and why, where the tool got in the way, and what it would draw with no limits (`bench/prompts/reflect.md`). The report goes to `<chain>/reflection/reflection.md`, beside `steps/`, so that no metric counts it; its cost goes to `cost.json` there, and the run prints it with the steps'. The drawing steps are word for word as before, so rounds still compare. `pnpm bench reflections --round <name>` prints every chain's report as one document.
- **Each step also records:**
  - whether a new picture exists;
  - whether a change step changed the grafical diagram file at all. One measured step answered a move request with a single `show` call and still reported success;
  - the engine-owned defects that `grafical check --all` finds.
- **Records:** for each run, a summary of every metric above, the transcript, the final diagram file and picture, and their hashes. Raw runs go to `bench/runs/`, which is not tracked. Summary tables are committed under `bench/results/`.
- **Versions:** each result records the Claude Code version, the model IDs and grafical's commit.
- **Judging:** two Opus judges score each picture blind, each with its own random labels. They score accuracy, clarity, visual quality, defects, and fit in a doc at 1000 px wide, each from 1 to 5. That gives 25 points per judge and 50 in total. For E2 they also list what changed besides each request. They see only the brief, the request and the pictures.
  - **Order**, a sixth criterion, scores clutter: few, straight, easy lines, no tangles or staircases, no line across text. With it a judge gives 30 points and a pair 60. It was added on 2026-10-11, after the owner called the phase 1 pictures "cluttered, messy, lines are all over the place" (DESIGN.md, "A target picture with measured rules").
  - The MVP bar in GOALS.md stays on the first five criteria, out of 50, so that it compares with its 2026-10-10 baseline.
  - The DESIGN.md, "A target picture with measured rules" target picture is judged in every round as an anchor.
  - **Two scores per picture** (from 2026-10-11, after the owner's principle that the engine arranges and the agent decides what the diagram says): an engine score, from order, visual quality, defects and fit (20 per judge), and an agent score, from accuracy and clarity (10 per judge). Results report both next to the total, so that a round shows which side lost its points.
- **The owner's ratings:** every round's pictures also go to the owner's rating page, made by `pnpm bench gallery`, under blind letters. The owner's ratings are read back and reported next to the judges' scores.
  - From the end of stage 1 (owner, 2026-10-12): the owner's blind ratings are the final judge, and judging must stay cheap. Opus judges score only the MVP bar, whose 42 of 50 baseline came from Opus judges. Every other round is scored by the owner alone.
- **Briefs:** there are two kinds.
  - Public briefs live in `bench/briefs/`. They describe fictional systems and drive fixtures, tests, CI and tuning. The first is [`catalog-sync.md`](bench/briefs/catalog-sync.md).
  - Private briefs describe real systems and never enter this repository. The private reference brief is the one from the 2026-10-10 test, used only to check the MVP bar so that its 42 of 50 baseline compares like with like. Runs on private briefs happen outside the repository, and only their scores are committed, never their content or pictures.
- **No tuning on private briefs:** grafical is tuned on public briefs only, so the MVP bar measures what it has learned, not what it has memorized.

## Rules for a result

1. **Write the expectation first.** Before a round runs, its results file states what is expected and which decision the outcome drives.
2. **Repeat.** Every cell runs at least three times. Report the mean and the range.
3. **Call differences honestly.** A difference counts only if the ranges do not overlap. Otherwise it is "no clear difference": add runs, or record it as such.
4. **Measure before spending.** Each round first runs one cell, reports its real cost, and proposes a total. The owner approves the total before the rest runs. Each run is capped at $1.
5. **Keep failures.** A run that fails, errors or hits its cap is reported, not dropped or rerun silently.

## Schedule

### End of phase 1

Smoke test: E1 and E2 on the public brief, grafical against a raw model, Haiku only, 3 runs each. It tests the core bet before phase 2 is built. E2 uses the four change types phase 1 supports: add a node between two others, move a node to another layer, rename a node, remove a node.

### Phase 2

E5 ablations, as their decisions are built.

### Phase 3

E1 to E4 with all arms and models, at least 3 runs each, and the MVP bar on the private reference brief.

### End of stage 1

Since 2026-10-11, the smoke test, E1 to E5 and the MVP bar run together once all of stage 1 is built (ROADMAP.md, "The MVP bar, measured again"). The owner set a $20 budget, mostly Haiku: Opus runs only for GOALS.md, "Model gap", the gap between Opus and Haiku. The owner rates E3 in person.
