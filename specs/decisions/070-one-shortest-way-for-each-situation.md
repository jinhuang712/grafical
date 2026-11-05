# 070. One shortest way for each situation

Decided: 2026-11-06

## The problem

An edge could be drawn thick with `edge emphasize` or with `edge weight`, and an agent had to choose between two commands that do one thing. A choice with no difference costs a thought and gives the agent one more thing to get wrong.

## The choice

In one situation there is one shortest way. Stating a fact when an element is made and changing it later are two situations, so `edge add --both` and `edge both` both stay. `edge emphasize` goes, and an edge takes `edge weight`. Emphasis is for nodes only.

## Not chosen

- Dropping every option of `add`.
  - Each element would take two steps to make, which is no longer the shortest way.
- Keeping a short form beside the long one.
  - The agent would still have to choose.
- Dropping `edge reverse` for `edge ends`.
  - Reversing is shorter with its own command, so it is the shortest way for that situation.

## Consequences

A new command must show the situation it is the shortest way for. A command or an option that only repeats another is removed.
