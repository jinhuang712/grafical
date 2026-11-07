# 094. `move` and `plug` stand above the nouns

Decided: 2026-11-07

## The problem

A node, a layer and a group each had a way of their own to change place: `node --move`, `layer --move` and `group --order`. A group had no way to move as a whole. The owner holds that moving stands above a node, and that an edge is not moved but plugged in elsewhere.

## The choice

Two verbs stand at the top of the command line and take IDs: `move <id>` changes where a thing sits, and `plug <id>` changes what an edge connects. An ID names one object in a diagram, so neither verb needs a noun.

`move` takes a node, a layer or a group, and later a lane or a column. An option that does not fit the object is refused. One `move` may name several objects, which keep their order among themselves, and one that cannot move refuses them all. `plug` takes an edge for now and replaces `edge --ends`, and other objects may take it later.

## Not chosen

- Each noun with a move of its own.
  - One act takes three names, and a group still has no whole move.
- `move` on an edge.
  - An edge has no place of its own, and changing its ends is a change of connection.
- A batch for several moves.
  - It takes a line for each object, and the agent works out their order itself.
- `edge --plug` under its noun.
  - The owner wants the two verbs side by side, and an edge may not stay the only thing that plugs.

## Consequences

Past these two verbs a command stays a noun and flags. The offset of a node off its cell becomes a form of `move`. `group --order` and the two `--move` flags go. What `move` does to a whole group is settled when it is built.
