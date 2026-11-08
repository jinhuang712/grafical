# 067. An agent sets a label's breaks and its alignment

Decided: 2026-11-06

## The problem

The engine wrapped a label where it chose, and a line break in a label was refused as `missing-glyph`. Every wrapped text was centred, and an agent could not change that.

## The choice

A label may hold a line break, which the engine keeps. Any label may be aligned left, centre or right with one command that takes any element's ID. Centre stays the default.

## Not chosen

- A command for each kind of element.
  - IDs are unique in a diagram, so one command reaches them all.
- A place in pixels inside a node.
  - An alignment is a look, and a position is not ("Facts over coordinates").

## Consequences

A stated break can make a label taller than the engine would, and a label that no longer fits is refused as before.

Built on 2026-11-06, with less than the choice says:

- A title and the label of a group, a layer or a wall stay one line, since their room is made for one line.
- `label --align` reaches a node, an edge, a wall and a lane, and a region's label waits for "A region's label sits at a fraction of a side".
- A note has no ID, so the owner chose a second command, `note --align`, which names a note by what it is about.
- A lane keeps a stated `center`, since its default depends on how it runs.
