# 070. One shortest way for each situation

Decided: 2026-11-06

## The problem

An edge could be drawn thick with `edge emphasize` or with `edge weight`, and an agent had to choose between two commands that do one thing. A choice with no difference costs a thought and gives the agent one more thing to get wrong.

## The choice

In one situation there is one shortest way. Making an element and changing it later share `--set`, which takes the same flags either way ("Every noun is changed by `--set`, `--move` and `--remove`"). An edge is drawn thick with `edge --set --weight`. Emphasis is for nodes only.

## Not chosen

- Making an element bare and setting its attributes after.
  - Each element would take two steps to make, which is no longer the shortest way.
- Keeping a short form beside the long one.
  - The agent would still have to choose.

## Consequences

A new command must show the situation it is the shortest way for. A command or an option that only repeats another is removed.
