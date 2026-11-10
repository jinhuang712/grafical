# 024. Same file exact, same facts mostly

Decided: 2026-10-13

## The problem

Decided on 2026-10-13 by the owner, asked whether two agents that state the same facts must get the same picture. The answer was "mostly", while the same file always gives the exact same diagram.

## The choice

- **The same file, the exact same picture.** This commitment stands as it is.
  - The same diagram file and stylesheet give the same SVG bytes and PNG pixels on any machine.
- **The same facts, mostly the same picture.** The file keeps the order of each layer's nodes as the agent stated it ("The agent states every order").
  - Two agents that add the same nodes at other places get another order in a layer. grafical does not reorder a diagram to one canonical form.

## Not chosen

- Canonical placement, the same facts always giving the same picture.
  - Every edit could then move nodes the agent did not touch, against the stability "Layout computed again on every change" promises.
- Canonical placement within one draft, with later edits kept stable.
  - It was the recommendation, but "mostly" asks for no new rule.

## Consequences

The same facts given in another order may give a slightly different picture. Only the file fixes the picture exactly.
