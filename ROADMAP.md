<!-- what-we-build: approved 2026-10-15 -->
# Roadmap

**Current milestone:** the MVP bar, measured again. Most of what it needs is built; the speed slip, the new checks and the missing baselines come before the next paid round.

✅ done · 🟨 in progress · ⬜ planned

What each milestone delivers is in [FEATURES.md](FEATURES.md), and every exit names checks in [GOALS.md](GOALS.md). The tries, scores and costs of each round are in `bench/results/`.

## Done ✅

- **The risky questions, 2026-10-11.** Spikes chose our own gap router, `harfbuzzjs`, the 8,105-character Chinese font subset and the npm name `grafical`, and showed the same file gives the same pixels on macOS and Linux. The package, its tests and CI on both systems were set up.
- **The loop, 2026-10-11.** The smallest path from operations to a picture: an agent built the public brief with operations alone, with no defect.
- **The target look, 2026-10-11.** The engine was rebuilt toward a hand-drawn target that judges scored 57 of 60, against 22 for the first engine: rows not drawn, groups as systems, one column grid and measured rules ([phase1b](bench/results/phase1b.md), [phase1b2](bench/results/phase1b2.md), [phase1b3](bench/results/phase1b3.md)).
- **The owner's additions, 2026-10-11 and 2026-10-12.** Lines that end at containers, swimlanes, themes and stylesheets, and the live viewer.
- **The vocabulary and stability, 2026-10-12.** The full operation set, `apply`, `show`, `diff` and the help, with the stability rule enforced by tests ([phase2](bench/results/phase2.md)).
- **The stage 1 round, 2026-10-12.** The first full benchmark round, and its rerun after the line work ([stage1](bench/results/stage1.md)). The MVP bar was not met.
- **Clearer lines and more diagram types, 2026-10-12.** New line kinds, lines that meet a box on any side, hops and dots, the flowchart and state machine kinds, nested groups, and the help in place of `grafical guide`.
- **Discrete output and freer placement, 2026-10-13 and 2026-10-14.** Records in place of prose, `try`, bundled fan-outs, equal heights in a row, room around stores, columns, steps from another box, walls, notes, marks, edge weights and the richer legend.

## The MVP bar, measured again 🟨

- ⬜ **Fix the speed slip.** Adding a box without a position takes up to 189.7 ms at 50 boxes, against 50 ms (GOALS.md, "Speed").
- ⬜ **Measure the new checks:** a scan of the transcripts for placement by the agent, the requests no operation could express, and the context each diagram adds (GOALS.md, "No placement by the agent", "Enough to say", "Context added").
- ⬜ **Add the missing baselines:** Opus with a higher thinking budget, and the `diagram-design` skill (GOALS.md, "Fewer turns, less time, fewer tokens").
- ⬜ **Run one paid round,** with the owner's approval of its cost first. The owner's budget for stage 1 is $20, mostly on Haiku. Opus runs only for the baselines and the gap between models, and both get the same prompt, word for word. The private reference brief's runs stay on the owner's machine, and only numbers are committed.
- ⬜ **Show every picture on the owner's rating page.** The owner rates the loose prompts in person.

**Exit:** GOALS.md, "The MVP bar".

## More combinations of operations ⬜

- ⬜ **Decide the form with the owner,** such as one operation for a common edit or for a common shape (FEATURES.md, "Later").
- ⬜ **Prototype it** on the briefs where the agents worked hardest.
- ⬜ **Keep it only if a round shows it helps.**

**Exit:** GOALS.md, "Enough to say", and no check in GOALS.md worse than before.

## Release 0.1.0 ⬜

- ⬜ **Publish `grafical` on npm.**

**Exit:** every check in GOALS.md meets its target. A recorded decision may recalibrate any target except GOALS.md, "The MVP bar".

## Later

What is wanted but not scheduled is in FEATURES.md, "Later". An item gets a milestone here when a benchmark result shows it is needed.
