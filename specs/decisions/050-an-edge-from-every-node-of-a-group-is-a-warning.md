# 050. An edge from every node of a group is a warning

Decided: 2026-10-19

## The problem

Decided by the owner on 2026-10-19, looking at a picture an agent drew of a coding agent's loop: the four nodes of its task context each sent an edge to the session node, four edges bundled into one side where one edge from the group would do ("Edges that end at containers"). `edge add --help` already says that one edge to a group replaces an edge to each of its parts, but nothing told the agent that it had drawn the parts.

## The choice

- **`warning: edge-per-member`** is printed after `lonely-node` and names a group each of whose nodes has an edge alike to one end outside it, or from it.
- **A fact, not a change.** Whether the parts' edges say something that one edge to the group would not is the agent's to judge ("Curation stays with the agent").
  - Edges that differ in label are not counted, so that the warning names only edges that one edge could replace with nothing lost.
- **Measured** on the 329 saved drafts: 8 drafts get one block each.
  - 4 are for a group of two nodes.
  - 4 are for a group of three, such as three publishers each sending events to one topic.

## Not chosen

- Drawing such edges as one edge from the group.
  - The file would no longer say what the picture shows, and the engine would choose for the agent ("Facts over coordinates").
- Counting edges that differ in label, or in type.
  - One edge to the group would drop what tells them apart.

## Consequences

8 of the 329 saved drafts get one. The agent may draw one edge to the group instead.
