# 021. The help as the reference

Decided: 2026-10-12

## The problem

Decided on 2026-10-12 by the owner. In a real setup an agent knows only that a `grafical` command exists, and `grafical --help` and `grafical <command> --help` are how it learns the tool. The stage 1 benchmarks hid this: their prompt told every agent to run `grafical guide` first, and the main guide then sent it on to `grafical guide <type>`, two hops past the command an agent would try on its own.

## The choice

- **What the help holds.** `grafical --help` says what grafical is, how to work, what makes a diagram good, and one entry per diagram type in grafical's words. Each command's help adds, after its usage and options, the sections it needs, always in one order: When to use, By diagram type, Kinds, Good to know, Common mistakes, Limits, Batch file, Output, When refused, See also, Example. The text lives in `src/cli/help.ts`.
- **Direction, not numbers.** Advice gives a direction and leaves the call to the model ("one story per diagram"), not a count ("12 to 16 boxes"). Numbers appear only for limits grafical enforces, such as two accents and three levels of groups, taken from the engine's own constants. Thresholds live in warnings, which react to the diagram at hand ("Curation stays with the agent").
- **What the type guides taught moved into it.** Measured the same day (`bench/results/p1d-guides.md`): without the type guides Haiku still knew its diagram types, but not grafical's spelling of them. It drew a flowchart's Start and End as state-machine dots, whose labels are not drawn, left C4 and data-flow lines unlabelled, and was refused 16% of its calls against 3%. So the help says which kind each type uses (`node add`), when each type labels a line (`edge add`), how groups nest and how lists are written (`group add`, `lane add`, `apply`). The worked example per type went; `apply --help` keeps one full example, which the tests build from the help as printed.
- **Clear names.** A name an agent misreads is fixed at the name. Fifteen drafts of the help round gave the legend an edge kind, `line: async`, reading `line` as the line of async edges; the field names how lines look, so the owner renamed it `style` on 2026-10-13. A batch that still says `line` is refused with the new name. A refusal also says how to fix the usual mistakes: which look an edge kind is drawn in, how to quote text that YAML cut at a comma, a free id for one already taken.
- **Budget.** The help read before a first draft, `--help`, `new --help` and `apply --help`, stays under the old guide's 12,000 characters, about 2,800 tokens (GOALS.md, "Token use"). The help is printed at 80 columns on every terminal, so it is the same text for every agent.

## Not chosen

- Keeping `grafical guide` beside the help. Two references drift apart, and an agent that is never told about the guide never reads it.
- Pointing `--help` at the guide. Each hop is a place where an agent stops following.
- A snippet for users to paste into their agent's instructions. It works only where a user adds it.

## Consequences

Changed on 2026-10-17 by "One entry page, help where it is used": the entry page gives the kinds of diagram and every way to draw in place of the diagram types, a command's page shows its line in a batch, its sections by diagram type are by kind of diagram, and the budget below is suspended.

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it": no page has a When refused section, and a refusal no longer says how to fix a mistake; its block says what happened and which commands can change it.
