# 021. The help as the reference

Decided: 2026-10-12

## The problem

Decided on 2026-10-12 by the owner. In a real setup an agent knows only that a `grafical` command exists, and `grafical --help` and `grafical <command> --help` are how it learns the tool. The stage 1 benchmarks hid this: their prompt told every agent to run `grafical guide` first, and the main guide then sent it on to `grafical guide <type>`, two hops past the command an agent would try on its own.

## The choice

- **The help is the reference.** `grafical --help` and each command's help say how to use the tool, where a real agent looks first.
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

## Not chosen

- Pointing `--help` at the guide.
  - Each hop is a place where an agent stops following.
- A snippet for users to paste into their agent's instructions.
  - It works only where a user adds it.

## Consequences

An agent learns the tool from the pages, and how a kind of diagram is drawn stays in the guides.
