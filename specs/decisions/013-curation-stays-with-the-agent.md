# 013. Curation stays with the agent

Decided: 2026-10-11

## The problem

A good diagram leaves things out, and only the agent knows what can go.

## The choice

A good diagram leaves things out, and only the agent can decide what. grafical helps in three ways:
- **Counts.** grafical reports how many nodes a diagram has and warns on what draws poorly, and it never asks for a merge.
- **Coaching.** The help tells agents to merge what a reader does not need apart, such as several topics into one node.
  - It also tells them to keep a diagram to one story.
  - The help is `grafical --help` ("The help as the reference"), and at first it was `grafical guide`.
  - It says to merge only nodes with the same edges, because a merged node claims every edge of every member.
  - It says never to wrap one node in a group of its own name.
  - Both were added on 2026-10-11, after the phase 1b judges found merged nodes that drew calls the brief does not have.
- **Honesty.** A diagram may carry a subtitle of one sentence under the title.
  - It may carry a footnote naming what it leaves out ("Not shown: …").
  - Both are facts in the file, set by operations.

The order of the layers and how to split a wide layer are the agent's as well: the engine never reorders layers, and `layer.split` moves the second half of a layer into a new layer below it, when the agent asks (settled by the owner on 2026-10-11).

## Not chosen

- Refusing diagrams over a node count.
  - Some diagrams need more, and a hard limit would push agents into merging things a reader needs apart.
- Letting the engine drop nodes.
  - That would change facts nobody named.

## Consequences

A diagram stays as cluttered as the agent made it. grafical reports counts and never cuts, merges or reorders.
