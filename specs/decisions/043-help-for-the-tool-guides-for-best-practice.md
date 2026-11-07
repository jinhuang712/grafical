# 043. Help for the tool, guides for best practice

Decided: 2026-10-17

## The problem

Decided by the owner on 2026-10-17, the same day as "One entry page, help where it is used". The help says how to use grafical. How a kind of diagram is usually drawn is best practice, kept apart for an agent that wants it. The owner's reasons: an agent that wants to draw straight away may, and a refusal corrects it where it goes wrong; guidance pressed on every agent before it draws makes every diagram alike, where a drawing should keep its freedom; and if grafical is easy to use, an agent draws well without being taught.

## The choice

- **The help** (`grafical --help` and each command's `--help`) holds:
  - How to work, and every way to draw by the story it tells.
  - Each command's options and its line in a batch.
  - The facts of what it draws, such as that kinds initial and final draw no label.
  - Its limits.
  - It does not say how a kind of diagram is drawn.
- **The guides** (`grafical guide` and `grafical guide <name>`):
  - One per common kind of diagram: architecture and C4 and infrastructure and dependency and data flow and event flow and flowchart and swimlane and state machine.
  - Composition, for any kind: what makes a diagram good and what to change when a picture looks wrong.
  - They took these from the help:
    - The entry page's kinds of diagram and "A good diagram".
    - The command pages' sections by kind of diagram, and `try`'s "What to try".
    - The advice on naming boxes and on how much to emphasize.
  - They also took three rules the morning's restructure had lost:
    - A row per step in a flowchart.
    - People as actor and other systems as external in C4.
    - What depends on top in a dependency graph.
  - `grafical guide cloud` and a few other names find the guide for their kind.
  - The guides live in `src/cli/guides.ts`.
- **One step points to a guide.** The entry page names `grafical guide` once, as there if wanted, and its last step points to `grafical guide composition` ("An agent checks its own picture against a list").
  - No command page names it, and a test holds that.

## Not chosen

- The guides in the help, as the entry page and the command pages held them in the morning.
  - Every agent reads them before it draws and draws alike.
- Rules every diagram of a kind must follow, as a type setting would make them: grafical refuses only what would draw wrong.

## Consequences

Risk, to measure in the next paid round: the 2026-10-12 round measured the help without type guides (`bench/results/p1d-guides.md`). Haiku drew a flowchart's Start and End as state-machine dots, whose labels are not drawn, left C4 and data-flow lines unlabelled, and was refused 16% of its calls against 3%. The traps that are the tool's own stay in the help (`node add --help` says initial and final draw no label, and to use terminal for Start and End); the conventions are now the agent's to take or leave. The harness counts guide reads and refused commands since 2026-11-05.
