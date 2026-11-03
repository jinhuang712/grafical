# 050. A line from every box of a group is a warning

Decided: 2026-10-19

## The problem

Decided by the owner on 2026-10-19, looking at a picture an agent drew of a coding agent's loop: the four boxes of its task context each sent a line to the session box, four lines bundled into one side where one line from the group would do ("Lines that end at containers"). `edge add --help` already says that one line to a group replaces a line to each of its parts, but nothing told the agent that it had drawn the parts.

## The choice

- **`warning: line-per-member`**, printed after `lonely-box`.
  - It names a group of two or more boxes each of which has a line to one end outside the group or from it.
  - The boxes of its inner groups count.
  - The lines are alike in kind, label, weight and arrowheads.
  - Detail: `group`, and as `edges` one line per box in the group's order.
  - `next`: `edge add`, `edge remove`.
  - A group inside another that has the same lines is not named, only the outer one.
- **A fact, not a change.** Whether the parts' lines say something that one line to the group would not is the agent's to judge ("Curation stays with the agent").
  - Lines that differ in label are not counted, so that the warning names only lines that one line could replace with nothing lost.
- **Measured** on the 329 saved drafts: 8 drafts get one block each.
  - 4 are for a group of two boxes.
  - 4 are for a group of three, such as three publishers each sending events to one topic.

## Not chosen

- Drawing such lines as one line from the group.
  - The file would no longer say what the picture shows, and the engine would choose for the agent ("Facts over coordinates").
- Counting lines that differ in label, or in kind.
  - One line to the group would drop what tells them apart.

## Consequences

8 of the 329 saved drafts get one. The agent may draw one line to the group instead.
