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
| `ROADMAP.md` | A phase starts, ends or changes scope |
| `AGENTS.md` | The toolchain, the loop or the rules change |
| `GITFLOW.md` | A git convention changes |

## The history before the rewrite

Commits up to and including `f9af06e` (2026-09-11) contain an earlier design that was abandoned. Do not read, restore or quote those files as a source.

The published history was rewritten on 2026-09-26 to remove a company name, and again on 2026-10-11 to remove internal service names. An older clone may still hold the unrewritten commits. Never push, merge or force-push that history. Base new work on `origin/main`.

## Nothing internal enters this repository

This repository is public. Names, hosts, topics, databases and architecture of real company systems never go into a file or a commit message. Benchmarks on real systems use private briefs kept outside the repository (GOALS.md, "How the benchmarks run"). Fixtures and examples use fictional systems.

## Environment

- Node 24 or later, pnpm. The full toolchain is DESIGN.md D23.
- macOS is the main development machine. CI runs on macOS and Linux, because output must match on both (D15).
- The package is set up. No product code exists yet.

## Commands

| Command | Does | Status |
|---|---|---|
| `pnpm install` | Install dependencies | available |
| `pnpm typecheck` | Type-check with `tsc --noEmit` | available |
| `pnpm lint` | Lint and format check with Biome | available |
| `pnpm test` | Run vitest. Passes while no tests exist | available |
| `pnpm bench <baseline\|chain\|smoke\|judge\|gallery\|geometry\|summary>` | Run the benchmark harness (EXPERIMENTS.md). Real runs cost money: `smoke` needs `--approved`. `geometry` checks every picture of a round for mechanical defects (benchmark 7) and costs nothing | available |

A command added to `package.json` gets a row here in the same change.

## The development loop

1. Change code, a fixture or a benchmark brief.
2. Render the affected fixture and look at the PNG. A passing test does not show what the picture looks like.
3. Run `pnpm typecheck`, `pnpm lint` and `pnpm test`.
4. Read your own diff before reporting.

## Definition of done

- Type check, lint and tests pass.
- At least one affected fixture was rendered and looked at.
- For changes to layout, routing or text measurement: the stability and determinism tests pass, and changed PNG snapshots were reviewed one by one.
- Documents are updated in the same change when behavior, a decision, a target or a phase changed.
- The report states what changed, with the command output that proves it. "The code looks right" is not proof.

## Tests

- The diagram file is compared byte for byte: the same operations give the same file.
- SVG output is compared byte for byte, as text snapshots.
- PNG output is compared as decoded pixels, not as compressed bytes. D15 promises the same pixels, not the same PNG bytes.
- Stability tests apply one operation and assert that nothing outside DESIGN.md D10's list changed position, size or route.
- Fixtures live in `test/fixtures/`. Public benchmark briefs live in `bench/briefs/`.
- The fuzz test (`test/fuzz/`) lays out random diagrams from fixed seeds and asserts that none has an engine-owned defect (DESIGN.md D14). CI runs 500 seeds. Run more with `FUZZ_SEEDS=5000 pnpm test test/fuzz`. A failing seed becomes a fixture before it is fixed.
- A change to layout or routing must keep the fuzz test, the stability tests and the replay of a real agent run (`test/layout/haiku.test.ts`) passing.
- `node test/debug/check-fixtures.ts <dir>` lays out, checks and renders every fixture with the real engine, for looking at the pictures.

## Decisions and scope

- A new design decision gets the next free ID in DESIGN.md, with the options it rejected.
- A change that conflicts with PHILOSOPHY.md stops, and the agent asks the owner.
- When a choice affects scope, the file format or user-visible behavior, offer the options and ask. Do not guess.

## Change discipline

- The repository builds and its tests pass after every commit.
- One intent per commit. If the subject needs "and", split it.
- No abstraction without a second caller, and no option without a second value.
- Do not refactor unrelated code in passing. Note it, and change it in its own step.
