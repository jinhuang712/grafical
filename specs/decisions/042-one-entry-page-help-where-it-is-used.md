# 042. One entry page, help where it is used

Decided: 2026-10-17

## The problem

Decided by the owner on 2026-10-17. The owner asked whether agents draw rows and groups because the help suggests nothing else ("only these commands? then I'll draw it like this"), and forbade putting all the help and the guides in one place. The help read before a draft had 60 characters left of its budget (11,940 of 12,000), and `apply --help` listed 15 of the 60 batch operations, so the reflect round's first agent found `group.title`'s field only from a refusal. A first restructure the same day, a map with guides and references, was withdrawn before it was committed (Rejected, below): the owner found it flat, and asked how an agent reads help and why a refusal's code should need looking up.

## The choice

How an agent reads a command line's help, which this follows:
- It reads the first page once before it starts, then acts.
  - It opens a command's page when it uses that command and is unsure of its form.
  - It seldom opens a page only because another names it: in the 2026-10-12 round, 4 of 33 drafts opened `diagram legend --help`.
- It reads a refusal most closely, and fixes what the refusal names.
  - In the reflect round's probe, the agent took a place for each `title-blocked` label from its `clear` fact.
  - The next write passed.
- It cannot try what it does not know exists.
  - A form can be learnt from refusals (`unknown-field ... likely=at`); a wall, a bar or a numbered path cannot.

So:
- **The entry page** (`grafical --help`) is enough for a first draft. It says:
  - What grafical is and how to work.
  - The kind of diagram, by what a box stands for and what a line means.
  - Every way to draw, one line each by the story it tells.
  - The four kinds:
    - Structure: C4, infrastructure and dependency graphs.
    - Flow: data flow and event flow.
    - Process: a swimlane is a process with lanes.
    - States.
  - Infrastructure replaces the types cloud and deployment, which differed only in what their nested groups were called.
  - The kinds and the ways to draw replace the list of diagram types.
  - The page says that any kind may use any way to draw.
  - It says what grafical does not draw.
- **A command's page** is read when the command is used. It holds:
  - Its usage and options and its line in a batch.
  - Its own sections, among them what it does in each kind of diagram ("By kind of diagram").
  - On `try`, what to try when the picture looks wrong.
  - A command's line in a batch is built from its operation's schema, so `apply --help` lists no operations: every page shows its own.
- **Arguments named as fields.** A command's arguments are named as its operation's fields: `[at]`, `<nodes...>`, `<members...>`, `<edges...>` and `<allow...>`, which were `[place]`, `<member...>`, `<id...>` and `<pass...>`.
  - A command's page is then also its operation's, and a test holds every argument and option to a field.
- **A refusal carries its own fix.** A code names the kind of problem so that the agent and the harness can tell one from another.
  - What is wrong and what fits is in the record's facts and never in a page to look up.
  - A refusal whose facts do not say what to change is a defect of that refusal.
  - The codes are one typed list, and a test checks that each is one grafical prints.
  - `alignment-cycle` left it, since nothing printed it.
- **Depth.** As before, every page is at most two hops from the entry page.
  - The hops are `grafical node --help` and then `grafical node add --help`.
- **No size limit for now.** The owner suspended the help's size limits the same day: first the help and grafical's refusals must be right, then it is decided whether a page needs a limit.
  - The budget of "The help as the reference" and its test are suspended with them (GOALS.md, "Token use").
    - The budget was 12,000 characters for the help read before a first draft.
  - That day the entry page, `new --help` and `apply --help` took 11,280 characters together where they had taken 11,940.

How the help is built today is in [how grafical answers](../answers.md#the-help-and-the-guides).

## Not chosen

- One page with all the help and the guides, the 2026-10-12 shape grown longer.
  - The owner forbade it: the budget decides what is left out.
- A map with three guides to read first and three references, each reached by `grafical help <name>`.
  - The guides were `grafical help diagrams`, `compose` and `workflow`.
  - The references were every operation, every record and every code.
  - Built and withdrawn on 2026-10-17, before it was committed.
  - A guide is a hop the agent must choose to take.
  - The references were flat.
    - One operation's entry was about 250 characters in a page of 16,500.
    - One code's was about 240 in 27,700.
  - A page of what each code means asks the agent to look up what its refusal should have said.
- A setting or a custom mode for the diagram's kind. grafical has no type mode ("Every layered diagram type"): every diagram is already composed from the same blocks, and the entry page says so.
  - Reversed in part on 2026-10-19 by "An optional type sets the diagram's space", for the spaces other than rows.
- A separate `grafical guide` command, as before 2026-10-12.
  - Each hop is a place where an agent stops.

## Consequences

Changed the same day by "Help for the tool, guides for best practice": the kinds of diagram, "A good diagram", the sections by kind of diagram and `try`'s "What to try" moved out of the help into `grafical guide`.

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it": a refusal no longer carries its own fix. It says what happened and names the commands that can change it.

Risk, to measure in the next paid round: whether agents use the ways to draw the entry page lists where the request fits, and which command pages they open before their first write. The harness does not yet count the pages (TODO.md, "Pages read before a first write").
