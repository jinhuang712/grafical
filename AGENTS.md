# AGENTS.md

How agents develop in this repository. What grafical is and why it exists are in the product documents below. Git rules are in [GITFLOW.md](GITFLOW.md).

## Where things are written

What each document holds is listed in [README.md](README.md). Each fact lives in one file, and other files link to it instead of repeating it. README.md may summarize, because it is the entry point.

| File | Change it when |
|---|---|
| `README.md` | The pitch, the example, the status or the document map changes |
| `PROPOSAL.md` | The problem, the bets or the prior art changes |
| `PHILOSOPHY.md` | Only by the owner's deliberate decision |
| `GOALS.md` | A target is met, missed or recalibrated. Only the owner changes the MVP bar |
| `EXPERIMENTS.md` | A hypothesis, metric, experiment, harness rule or schedule changes |
| `DESIGN.md` | A decision is made, reversed, or found to be still open |
| `FEATURES.md` | A feature is added, changes status or is dropped, or a vocabulary list changes |
| `ROADMAP.md` | A milestone starts, ends or changes scope |
| `TODO.md` | A small fix or follow-up is found that has no milestone yet |
| `CHANGELOG.md` | A change a user would notice lands: add it under *Unreleased* in the same change |
| `AGENTS.md` | The toolchain, the loop or the rules change |
| `GITFLOW.md` | A git convention changes |

## The history before the rewrite

Commits up to and including `f9af06e` (2026-09-11) contain an earlier design that was abandoned. Do not read, restore or quote those files as a source.

The published history was rewritten on 2026-09-26 to remove a company name, and again on 2026-10-11 to remove internal service names. An older clone may still hold the unrewritten commits. Never push, merge or force-push that history. Base new work on `origin/main`.

## Nothing internal enters this repository

This repository is public. Names, hosts, topics, databases and architecture of real company systems never go into a file or a commit message. Benchmarks on real systems use private briefs kept outside the repository (EXPERIMENTS.md, "Harness"). Fixtures and examples use fictional systems.

## Environment

- Node 24 or later, pnpm. The toolchain is in `package.json`.
- macOS is the main development machine. CI runs on macOS and Linux, because output must match on both (DESIGN.md, "Output and determinism").
- The engine is in `src/`, with the `grafical` command at `src/cli/main.ts`. The benchmark harness is in `bench/`.

## Commands

| Command | Does | Status |
|---|---|---|
| `pnpm install` | Install dependencies | available |
| `pnpm typecheck` | Type-check with `tsc --noEmit` | available |
| `pnpm lint` | Lint and format check with Biome | available |
| `pnpm test` | Run vitest. Passes while no tests exist | available |
| `pnpm bench <baseline\|chain\|smoke\|stage1\|judge\|gallery\|geometry\|lines\|speed\|diff\|summary>` | Run the benchmark harness (EXPERIMENTS.md). Real runs cost money: `smoke` and `stage1` need `--approved`. `geometry` checks every picture of a round for mechanical defects (GOALS.md, "Mechanical defects"), `speed` times one operation and one command (GOALS.md, "Speed"), and `lines` measures a round's lines and how often the agent ran `grafical try` (DESIGN.md, "Records over prose"); all three cost nothing. `diff <ref>` lays out every saved draft, every fixture and fuzz seeds 1..N (`--seeds <n>`, default 2000) with the engine at `<ref>` and with the working tree, and prints key=value records of what changed (bends, crossings, size, defects); `--render <dir>` writes before and after PNGs. Quote its numbers in an engine commit message; it costs nothing | available |

A command added to `package.json` gets a row here in the same change.

## The development loop

1. Change code, a fixture or a benchmark brief.
2. Render the affected fixture and look at the PNG. A passing test does not show what the picture looks like.
3. Run `pnpm typecheck`, `pnpm lint` and `pnpm test`.
4. Read your own diff before reporting.

When a picture looks bad, first draw the better picture with grafical's own commands, as an agent would: rows, order, groups, alignment, and what to cut. Only what the commands cannot reach is engine work. On 2026-10-16 the owner's composition took a dispatch draft from 21 crossings to 1, where a day of router fixes had moved the saved drafts by 3.

## Definition of done

- Type check, lint and tests pass.
- At least one affected fixture was rendered and looked at.
- For changes to layout, routing or text measurement: the stability and determinism tests pass, and changed PNG snapshots were reviewed one by one. The saved agent drafts (`bench/runs`, in the main checkout only) and fuzz seeds are laid out before and after, and the commit states how many changed and the change in bends, crossings and defects by code. Fixtures that stay the same show that nothing broke, not that anything got better.
- Documents are updated in the same change when behavior, a decision, a target or a milestone changed.
- The report states what changed, with the command output that proves it. "The code looks right" is not proof.

## Tests

- The diagram file is compared byte for byte: the same operations give the same file.
- SVG output is compared byte for byte, as text snapshots.
- PNG output is compared as decoded pixels, not as compressed bytes. DESIGN.md, "Output and determinism" promises the same pixels, not the same PNG bytes.
- Stability tests apply one operation and assert that nothing outside the list in DESIGN.md, "Layout computed again on every change" changed position, size or route.
- Fixtures live in `test/fixtures/`. Public benchmark briefs live in `bench/briefs/`.
- The fuzz test (`test/fuzz/`) lays out random diagrams from fixed seeds and asserts that none has an engine-owned defect (DESIGN.md, "Defects owned by who can fix them"). CI runs 500 seeds. Run more with `FUZZ_SEEDS=5000 pnpm test test/fuzz`. A failing seed becomes a fixture before it is fixed.
- A change to layout or routing must keep the fuzz test, the stability tests and the replay of a real agent run (`test/layout/haiku.test.ts`) passing.
- `node test/debug/check-fixtures.ts <dir>` lays out, checks and renders every fixture with the real engine, for looking at the pictures.

## Decisions and scope

- A new design decision gets its own dated section in DESIGN.md, titled by its choice, with the options it rejected.
- A change that conflicts with PHILOSOPHY.md stops, and the agent asks the owner.
- When a choice affects scope, the file format or user-visible behavior, offer the options and ask. Do not guess.

## Change discipline

- The repository builds and its tests pass after every commit.
- One intent per commit. If the subject needs "and", split it.
- No abstraction without a second caller, and no option without a second value.
- Do not refactor unrelated code in passing. Note it, and change it in its own step.
