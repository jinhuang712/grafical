# 078. A bar may cross a group

Decided: 2026-11-06

## The problem

A bar between the first and last layers of a group was refused as `bar-in-group`, since the group's frame would cover it. An agent that wanted one message bus across several teams drew a queue node instead.

## The choice

A bar may cross a group's frame. It may not overlap a node or a label, and a write that would is refused.

## Not chosen

- Keeping the refusal.
  - The owner holds that the only real limit is an overlap.
- Moving the bar out of the group for the agent.
  - The engine would be choosing a layer.

## Consequences

A group is no longer one unbroken frame where a bar crosses it, and how the two are drawn together is chosen when it is built. Where a bar's own label sits among a group's nodes needs a look at real pictures.
