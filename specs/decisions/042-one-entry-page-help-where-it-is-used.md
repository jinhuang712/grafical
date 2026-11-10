# 042. One entry page, help where it is used

Decided: 2026-10-17

## The problem

Decided by the owner on 2026-10-17. The owner asked whether agents draw layers and groups because the help suggests nothing else ("only these commands? then I'll draw it like this"), and forbade putting all the help and the guides in one place. The help read before a draft had 60 characters left of its budget (11,940 of 12,000), and one page listed 15 of the 60 operations, so the reflect round's first agent found `group.label-at`'s field only from a refusal. A first restructure the same day, a map with guides and references, was withdrawn before it was committed (Rejected, below): the owner found it flat, and asked how an agent reads help and why a refusal's code should need looking up.

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
- **The entry page** (`grafical --help`) is enough for a first draft and says:
  - What grafical is and how to work.
  - Every way to draw, one line each by the story it tells.
  - It says what grafical does not draw.
- **A command's page** is read when the command is used and holds:
  - Its usage and options.
  - Its own sections.
- **Arguments named as fields.** A command's arguments are named as its operation's fields: `[at]` and `<nodes...>` and `<members...>` and `<edges...>` and `<allow...>`.
  - They were `[place]` and `<member...>` and `<id...>` and `<pass...>`.
  - A command's page is then also its operation's, and a test holds every argument and option to a field.
- **Depth.** As before, every page is at most two hops from the entry page.
  - The hops are `grafical node --help` and then `grafical node --add --help`.
- **No size limit for now.** The owner suspended the help's size limits the same day: first the help and grafical's refusals must be right, then it is decided whether a page needs a limit.
  - The budget of "The help as the reference" and its test are suspended with them.
    - The budget was 12,000 characters for the help read before a first draft.
  - That day the help read before a first draft took 11,280 characters where it had taken 11,940.

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

## Consequences

Risk, to measure in the next paid round: whether agents use the ways to draw the entry page lists where the request fits, and which command pages they open before their first write. Since 2026-11-05 the harness counts the pages, guides and unknown commands before a first write.
