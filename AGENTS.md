# AGENTS.md

How agents develop in this repository. Every window loads this file. What grafical is and why it exists are in the documents of the read order.

## Read order

A window that is new or was compacted reads these documents in full and in this order:

1. [PROPOSAL.md](PROPOSAL.md)
2. [PHILOSOPHY.md](PHILOSOPHY.md)
3. [DESIGNS.md](DESIGNS.md)
4. [plan/GOALS.md](plan/GOALS.md)
5. [FEATURES.md](FEATURES.md)
6. [plan/ROADMAP.md](plan/ROADMAP.md)
7. [GLOSSARY.md](GLOSSARY.md)
8. [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md)

Then it scans [plan/TODO.md](plan/TODO.md).

## Layout

| Where | What |
|---|---|
| The root | the reasons and the contract |
| `features/` | one file per feature group |
| `specs/` | how each part works |
| `specs/decisions/` | the forks taken |
| `plan/` | the goals · the roadmap · the open items |
| `plan/evidence/` | the files that open items point to |
| `src/` | the engine with the `grafical` command at `src/cli/main.ts` |
| `bench/` | the benchmark harness |
| `test/` | the tests and the fixtures |

## While you work

- [YES]   read every document you work on yourself and in full.
- [YES]   scan the open items, the roadmap and the goals to see where things stand.
- [NO]    give a document to a subagent to read or write.
- [NO]    check the goals for a small change.
- [WHEN]  you are about to change something: read the document that owns it first.
- [WHEN]  you are about to change a part: read its spec in `specs/` first.
- [WHEN]  a decision is cited or its area changes: read it in `specs/decisions/`.
- [WHEN]  the work needs the code: a subagent may read the code.
- [WHEN]  you make a choice that closes a fork: write its decision at once.
- [WHEN]  something cannot be done now: add it to the open items at once.
- [WHEN]  the documents and the code disagree: tell the owner and let the owner decide.
- [WHEN]  other developers build on the project: say it may need a wiki and let the owner pick its form.
- [WHEN]  a change is done: update the changelog and the feature's status in the same change.
- [WHEN]  an open item is done: delete it in the same change.
- [WHEN]  you change something: check only what you touched against the rules.
- [WHEN]  a checkpoint ends or a release is near: check the goals.
- [WHEN]  the owner stops you: stop at once.
- [WHEN]  the owner stops you: stop every agent you started and every agent those started.

## Rules for the documents

- An item another document points to keeps an ID that never changes.
  - A new item gets a new number.
  - An ID is always written with its name.
- Code and documents cite an item by its name, such as `GOALS.md, "Speed"`.
  - `test/docs/citations.test.ts` checks that the name exists.
- A status mark sits on a `Status:` line and never in a heading.
- Only the owner changes the philosophy.
- Only the owner changes the MVP bar.
- A change that conflicts with the philosophy stops until the owner decides.
- A choice that affects scope, the file format or what a user sees goes to the owner with its options.

## The history before the rewrite

Commits up to and including `f9af06e` (2026-09-11) hold an earlier design that was abandoned. Do not read, restore or quote those files as a source.

The published history was rewritten on 2026-09-26 to remove a company name. It was rewritten again on 2026-10-11 to remove internal service names. An older clone may still hold the unrewritten commits. Never push, merge or force-push that history, and base new work on `origin/main`.

## Nothing internal enters this repository

This repository is public. Names, hosts, topics, databases and architecture of real company systems never go into a file or a commit message.

- Benchmarks on real systems use private briefs kept outside the repository.
- Fixtures and examples use fictional systems.

## Environment

- Node 24 or later with pnpm.
  - The toolchain is in `package.json`.
- macOS is the main development machine.
  - CI runs on macOS and Linux because output must match on both.

## Commands

| Command | Does |
|---|---|
| `pnpm install` | installs the dependencies |
| `pnpm typecheck` | type-checks with `tsc --noEmit` |
| `pnpm lint` | lints and checks the format with Biome |
| `pnpm test` | runs every test but the fuzz test |
| `pnpm fuzz` | runs the fuzz test in `test/fuzz/` |
| `pnpm bench <name>` | runs one part of the benchmark harness |

CI runs `pnpm fuzz` after `pnpm test` so that the other tests report first.

The parts of `pnpm bench`:

- The parts that run agents cost money: `baseline` · `chain` · `smoke` · `stage1` · `judge`.
  - `smoke` and `stage1` need `--approved`.
- `gallery` builds the owner's blind rating page of a round.
- `geometry` checks every picture of a round for mechanical defects.
- `speed` times one operation and one command.
- `lines` measures a round's lines and how often the agent ran `grafical try`.
- `reflections` prints the report each agent writes after its chain.
- `summary` turns a round's runs into its results file in `bench/results/`.
- `diff <ref>` lays out every saved draft and fixture and fuzz seed with the engine at `<ref>` and with the working tree.
  - It prints key=value records of what changed: bends · crossings · sizes · defects.
  - `--seeds <n>` sets the number of fuzz seeds, 2000 by default.
  - `--render <dir>` writes the PNGs before and after.
  - Quote its numbers in an engine commit message.

A command added to `package.json` gets a row here in the same change.

## The development loop

1. Change code, a fixture or a benchmark brief.
2. Render the affected fixture and look at the PNG.
   - A passing test does not show what the picture looks like.
3. Run the checks: `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm fuzz`.
4. Read your own diff before reporting.

When a picture looks bad, first draw the better picture with grafical's own commands as an agent would. Use rows, order, groups, alignment and what to cut. Only what the commands cannot reach is engine work. On 2026-10-16 the owner's composition took a dispatch draft from 21 crossings to 1, where a day of router fixes had moved the saved drafts by 3.

## Definition of done

- Type check, lint and tests pass.
- At least one affected fixture was rendered and looked at.
- A change to layout, routing or text measurement meets four more checks.
  - The stability and determinism tests pass.
  - Every changed PNG snapshot was reviewed on its own.
  - The saved agent drafts and fuzz seeds were laid out before and after with `pnpm bench diff`.
  - The commit states how many changed and the change in bends, crossings and defects by code.
- The saved drafts are in `bench/runs` in the main checkout only.
- A fixture that stays the same shows that nothing broke and not that anything got better.
- A document changes in the same change as the fact it holds.
- The report states what changed with the command output that proves it.
  - "The code looks right" is not proof.

## Tests

- The diagram file is compared byte for byte.
  - The same operations give the same file.
- SVG output is compared byte for byte as text snapshots.
- PNG output is compared as decoded pixels and not as compressed bytes.
  - The promise is the same pixels and not the same PNG bytes.
- Stability tests apply one operation and assert what stayed the same.
- Fixtures live in `test/fixtures/`.
- Public benchmark briefs live in `bench/briefs/`.
- The fuzz test lays out random diagrams from fixed seeds.
  - It asserts that none has a defect the engine owns.
  - CI runs 100 seeds and every seed past them that once failed.
  - Run more with `FUZZ_SEEDS=5000 pnpm fuzz`.
  - A failing seed becomes a fixture before it is fixed.
- The refusal test in `test/check/refusals.test.ts` refuses random changes to the fixtures and to fuzz diagrams.
  - It asserts that every refusal has its code's description.
  - It asserts that `next` names only commands that exist in the help's order.
  - CI runs 12 seeds.
  - Run more with `REFUSAL_SEEDS=150 pnpm test test/check/refusals.test.ts`.
- A new refusal code needs its sentence and its commands in `src/cli/problems.ts`.
  - `test/cli/problems.test.ts` holds that list.
- A change to layout or routing keeps three tests passing.
  - The fuzz test.
  - The stability tests.
  - The replay of a real agent run in `test/layout/haiku.test.ts`.
- `node test/debug/check-fixtures.ts <dir>` lays out and renders every fixture with the real engine.
  - It is for looking at the pictures.

## Change discipline

- The repository builds and its tests pass after every commit.
- One intent per commit.
  - If the subject needs "and", split it.
- No abstraction without a second caller.
- No option without a second value.
- Do not refactor unrelated code in passing.
  - Note it and change it in its own step.

## Git

Branches, worktrees and how work lands follow the owner's global instructions. This section holds only what is particular to this repository.

### Identity

This is a personal and public repository. A company identity never appears in commit metadata.

| Setting | Value |
|---|---|
| `user.name` | `jinhuang712` |
| `user.email` | `36698563+jinhuang712@users.noreply.github.com` |

Set both in the repository so that the global identity stays untouched:

```sh
git config --local user.name jinhuang712
git config --local user.email "36698563+jinhuang712@users.noreply.github.com"
```

- Run `git config user.email` before the first commit in a new clone.
- A commit with a company email address is a defect.
- Use plain `git` and no company git tooling.

### Remote

`origin` is `https://github.com/jinhuang712/grafical`, a public repository. There are no pull requests and no release branches yet.

- Never force-push `main`.
- Never rewrite a commit that is on the remote.
- Push only once a change is verified and the owner has agreed on its scope.

### Commit messages

```text
<type>(<scope>): <subject>
```

| Type | For |
|---|---|
| `feat` | a new capability |
| `fix` | correcting wrong behavior |
| `refactor` | the same behavior in a new shape |
| `perf` | the same behavior made faster |
| `test` | tests and fixtures only |
| `docs` | documents only |
| `build` | packaging · dependencies · toolchain |
| `ci` | CI configuration |
| `bench` | a benchmark run and its results |
| `chore` | anything else that deserves its own commit |

- The scope is optional.
- The scope is the folder or module touched in lowercase, such as `layout`.
- A breaking change adds `!` after the type or scope.
  - Its `BREAKING CHANGE:` footer says what callers must do differently.
- The subject is lowercase except for names and identifiers.
- The subject has no trailing period and at most 72 characters.
- The subject says the effect and not the process.
  - Write `keep layer order on node.remove` and not `fixed some layout stuff`.
- A change that carries out a decision names it in the body by its title, such as `specs/decisions, "Our own gap router"`.
- The body explains why, since the diff already shows what.
- No agent attribution: no `Co-Authored-By`, no `Generated with` and no session links.

### Staging

- Stage only the files the task changed.
  - Never use `git add -A` or `git add .` as a shortcut.
- Read `git status --short` and `git diff --staged` before every commit.
- Never discard uncommitted changes you did not make.
- Do not commit while a design is still under discussion.

### What is tracked

Source, documents, fixtures and test snapshots are tracked. Dependencies, build output, render output and benchmark runs are not, and the patterns live in `.gitignore`. Generated output is never committed, except the snapshot files that tests compare against.
