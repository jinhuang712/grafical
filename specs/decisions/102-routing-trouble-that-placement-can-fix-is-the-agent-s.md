# 102. Routing trouble that placement can fix is the agent's

Decided: 2026-11-08

## The problem

The router was judged not smart. A search router, a rip-up pass and more rules were weighed, at up to 3000 lines of rewrite. On the case `same-layer-pair` one move of C beside A took crossings from 3 to 0 and bends from 4 to 0 with no change to the router. `ladder` came clean the same way. On 2026-10-16 a recomposed dispatch draft went from 21 crossings to 1, where a day of router fixes moved the saved drafts by 3.

## The choice

- The agent fixes a route by placing nodes: order · layer · column · alignment · gap.
- The engine draws clean edges for the places it is given.
  - That covers end runs · sides · arrowheads · labels.
  - Where no clean route exists, one edge goes round the outside.
- The engine names the edges that cross and never the node to move.
- A move costs one command, and its effect shows before the write.
- One form for edges of one sort is the agent's, by `--side` or by placement.

## Not chosen

- A router that searches the open space.
  - A trial on 2026-11-07 cut crossings, and its pictures read worse.
  - It risks speed and stability.
- A pass that rips up the worst edges and routes them again.
  - Each fix moved the trouble elsewhere.
- One form across a picture chosen by the router.
  - It weighs every edge together, which is the smart routing this leaves.
- The engine moving nodes to tidy its routes.
  - It would move what nobody named, against "033. The agent states every order".

## Consequences

- The routing cases split into those placement fixes and those the router must draw.
- Rearranging becomes the main line of work.
  - An example is stating a layer's whole order in one command.
- The space the router works in waits until rearranging is built.
