# 021. The help as the reference

Decided: 2026-10-12

- Replaced in part by specs/decisions, "Help for the tool, guides for best practice": the guides came back for best practice.
- Replaced in part by specs/decisions, "One entry page, help where it is used": the budget is suspended.
- Replaced in part by specs/decisions, "Refusals say what happened and which commands can change it": no page has a When refused section.

## The problem

Decided on 2026-10-12 by the owner. In a real setup an agent knows only that a `grafical` command exists, and `grafical --help` and `grafical <command> --help` are how it learns the tool. The stage 1 benchmarks hid this: their prompt told every agent to run `grafical guide` first, and the main guide then sent it on to `grafical guide <type>`, two hops past the command an agent would try on its own.

## The choice

- **The help is the reference.** `grafical --help` and each command's help replace `grafical guide`: an agent learns grafical where a real agent looks first.
- **Direction, not numbers.** Advice gives a direction and leaves the call to the model ("one story per diagram").
  - It gives no count ("12 to 16 boxes").
  - Numbers appear only for limits grafical enforces, taken from the engine's own constants.
  - Thresholds live in warnings, which react to the diagram at hand ("Curation stays with the agent").
- **What the type guides taught moved into it.** Measured the same day (`bench/results/p1d-guides.md`): without the type guides Haiku still knew its diagram types, but not grafical's spelling of them.
  - It drew a flowchart's Start and End as state-machine dots, whose labels are not drawn.
  - It left C4 and data-flow lines unlabelled.
  - It was refused 16% of its calls against 3%.
- **Clear names.** A name an agent misreads is fixed at the name.
  - Fifteen drafts of the help round gave the legend an edge kind as `line: async`.
  - They read `line` as the line of async edges, so the owner renamed the field `style` on 2026-10-13.
- **Budget.** The help read before a first draft stays under the old guide's 12,000 characters, about 2,800 tokens (GOALS.md, "Token use").
  - Suspended on 2026-10-17 by "One entry page, help where it is used".

The pages were reshaped since by "One entry page, help where it is used", "Help for the tool, guides for best practice" and "Refusals say what happened and which commands can change it".

## Not chosen

- Keeping `grafical guide` beside the help.
  - Two references drift apart, and an agent that is never told about the guide never reads it.
- Pointing `--help` at the guide.
  - Each hop is a place where an agent stops following.
- A snippet for users to paste into their agent's instructions.
  - It works only where a user adds it.

## Consequences

Changed on 2026-10-17 by "One entry page, help where it is used": the entry page gives the kinds of diagram and every way to draw in place of the diagram types, a command's page shows its line in a batch, its sections by diagram type are by kind of diagram, and the budget below is suspended.

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it": no page has a When refused section, and a refusal no longer says how to fix a mistake; its block says what happened and which commands can change it.
