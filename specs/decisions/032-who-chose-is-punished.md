# 032. Who chose is punished

Decided: 2026-10-14

## The problem

Asked for by the owner on 2026-10-14, on the public brief's draft with steps: "we should punish things like this". The owner named a node placed far from the two nodes it connects to, "making so unncessarily long edges"; two edges between a node and the node right under it "bent for no reason"; and the staircase of a busy node's edges. A rule against layers that hold stores and services together was rejected: "thats a taste problem". Who punishes follows who chose ("Defects owned by who can fix them", "Steps from another node"): what the engine chose, it must avoid; what the agent stated, refuses the write.

## The choice

- **An edge bent for no reason** is an engine defect, `needless-bend`.
  - It is an edge from the bottom of a node into the top of a node in the next layer down.
  - It bends although each of its ports lies within the other node's side.
  - The router places bottom sides before top sides, and a busy node's ports can be pushed off the middle by their neighbours; an edge that can run straight down now meets the port its upper node took.
  - On the public brief's draft, catalog-sync's two edges to and from the retry topic right under it ran straight.
  - The draft lost 4 of its 27 bends.
  - 3,000 fuzz seeds show none.
- **A node beside every node it connects to** lies wholly left or right of them, with edges to two or more nodes whose centres lie at least its own width apart.
  - It costs longer edges, and every write warns of it as `node-aside` ("A node beside its neighbours is a warning").
- **The staircase** of a busy node's edges is not punished yet.
  - On the public brief's draft it comes from the nodes that sit under the busy node's own column in a layer its edges must pass, so that its edges step around them; the owner proposed spreading the nodes apart so that the edges have room.
  - Not yet decided.

## Not chosen

- Layers that mix stores with services or outside services.
  - Which nodes share a layer is the agent's choice and a matter of taste ("Steps from another node"; the owner on 2026-10-14).
- Drawing with no grafical at all.
  - Given the same brief and prompt with any tool, Opus 5.5 drew it with Graphviz in 65 seconds for $0.39.
  - It put every node type in a band of its own.
  - It drew curved edges that cross many times, small text and details the brief did not ask for.
  - The owner: "wayyyyyyyy worse".

## Consequences

An agent hears of such a node on every write and decides.
