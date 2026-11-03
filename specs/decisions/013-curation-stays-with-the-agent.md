# 013. Curation stays with the agent

Decided: 2026-10-11

## The problem

A good diagram leaves things out, and only the agent knows what can go.

## The choice

A good diagram leaves things out, and only the agent can decide what. grafical helps in three ways:
- **Budget.** `grafical check` warns when a diagram has more than 16 nodes, and suggests merging nodes that share a group and all their edges. The warning does not block. Reversed on 2026-10-13 by "Records over prose": grafical prints counts, not warnings. The number of nodes is one of them.
- **Coaching.** The help (`grafical --help`, "The help as the reference"; at first `grafical guide`) tells agents to merge what a reader does not need apart, such as several topics into one node, and to keep a diagram to one story. It also says to merge only nodes with the same edges, because a merged box claims every edge of every member, and never to wrap one node in a group of its own name. Both were added on 2026-10-11, after the phase 1b judges found merged boxes that drew calls the brief does not have.
- **Honesty.** A diagram may carry a subtitle, one sentence under the title, and a footnote naming what it leaves out ("Not shown: …"). Both are facts in the file, set by operations.

The order of the rows and how to split a wide row are the agent's as well: the engine never reorders rows, and `layer.split` moves the second half of a row into a new row below it, when the agent asks (settled by the owner on 2026-10-11).

## Not chosen

- Refusing diagrams over a node count. Some diagrams need more, and a hard limit would push agents into merging things a reader needs apart.
- Letting the engine drop nodes. That would change facts nobody named (PHILOSOPHY.md).

## Consequences

A diagram stays as cluttered as the agent made it. grafical reports counts and never cuts, merges or reorders.
