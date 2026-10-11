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
