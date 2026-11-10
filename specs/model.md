# The model

The model holds the facts of a diagram and is the only part that changes them. An agent never edits the file: it sends an operation, and the model turns it into a new diagram, or refuses it and changes nothing. It also checks that every diagram it makes can be laid out, and it can say how two diagrams differ as operations. It never computes a position, which is the layout's work. It lives in `src/model/`.

## A write, from operation to file

Every write takes the same path:

```text
command line
  │  parse: the flags become one operation, or are refused
  ▼
load the file ── refused if its form, schema, marks, stylesheet or weights fail
  ▼
apply the operation to a copy
  ▼
put each layer in lane order, then in column order
  ▼
check the whole diagram, in turn: integrity → alignments → groups → steps
  ▼
lay out and check the picture ── a defect the agent owns refuses the write
  ▼
write the file: a temporary file, then a rename
```

Loading reads a `.grafical` file in its own form, and nothing else, and validates it against the schema. It then reads the files of the marks, the stylesheet the diagram names and the weight levels that stylesheet knows. A file that fails any of these is refused as a whole, with `already in the file` as its source, so that grafical never draws from a file it read only in part. A file that cannot be found or read is refused with the command as its source.

The operation works on a copy of the loaded diagram, so a refused write leaves nothing changed. It either returns errors or changes the copy. After it, walls forget the nodes, groups and edges it removed, a wall left with an empty side goes, and notes go with their targets. Then each layer is put in lane order and then in column order.

## Checks of the whole diagram

An operation can only check what it touches. Some problems can only be seen in the whole diagram, such as a node that a move puts inside a group it is not in. Four checks look for them in turn, and the first that finds one stops the rest:

1. Integrity: the rules a schema cannot state.
   - Every id is unique and every edge's ends exist.
   - An alignment points to a node in another layer, and at most two nodes are emphasized.
   - An edge between a wall's two sides is refused as `wall-crossed` unless the wall allows it.
   - A wall allows an edge it names, an edge with an end it names and an edge with an end in a group it names.
2. Alignments: every alignment can hold with the order of the layers.
3. Groups: every group can be boxed without a node inside it that is not a member.
4. Steps: no node placed by steps lands on a cell that another fact keeps.

On the write path a fifth check follows them: every weight an edge names is a level the stylesheet knows. Each error from these checks carries the number of the check that found it. A diagram refused by a later check has passed the earlier ones, and telling whether the file already had a problem relies on that.

The new diagram then goes to the layout and the checker. A defect the agent owns refuses the write. Otherwise the file is written to a temporary file beside it and renamed over it, so that a reader never sees half a file. `--try` takes the same path without the last step.

## The order of a layer

Every order in the file is one the agent stated, so the model never has to guess where a node goes. A node added to a layer, or moved into another layer, needs a place: `first`, `last`, `before` a node or `after` a node. The first node of an empty layer needs none, since it has only one place.

- A node with no place in a layer that has nodes is refused as `missing-field`, with the layer and its nodes.
- Two places at once are refused as `conflicting-position`.
- A node placed beside itself is refused as `bad-reference`.
- A node placed beside one in another layer is refused as `not-in-layer`, with the layer and its nodes.

Nothing in the model reorders a layer on its own. Only lanes and columns move nodes in a layer, and only because the agent put the nodes in them.

## Copying a group

`group --copy` builds a second zone, region or shard from the original in one operation. The copy holds the group's inner groups at every level, its nodes, and the edges whose two ends are both inside. With `--outside` it also holds every edge with one end inside, and that end moves to the copy.

Every id in the copy follows one rule. The copy is the id the agent names. Every inner group, node and edge gets its original's id with the suffix.

The copied group keeps the original's sublabel, its title's place and the group it sits in. Each copied node keeps everything its original has, and its group, alignment and steps point to the copies where they pointed inside. Each copied node joins its original's layer, before the first or after the last node of the group named as the place. Nodes placed by steps are copied too, while notes and walls are not.

The copy is refused rather than changed, so that what it makes is always what the agent asked for:

- Without a place, as `missing-field` with the groups it may sit beside.
- When a copied id is taken, as `duplicate-id`.
- When a node inside aligns to or steps from a node outside, as `copy-conflict`.
- When the group named as the place has no node in one of the copy's layers, as `no-shared-layer`.
- When a lane or a column would move a copied node away from the stated place, as `copy-conflict`.

## The difference between two diagrams

`grafical diff` turns the difference between a git revision of the file and the file on disk into operations, so that a reviewer reads a diagram change in the same words the agent wrote it. It reads the revision with `git show`, and a revision that has no such file counts as an empty one, so the lines start with `diagram --set`. It prints one command line per operation. A shell that runs them in order on the revision's file gives the file on disk, unless a picture in between would draw wrong: that line is refused as any write is, and the owner holds that as expected.

The operations come in an order chosen so that each one leaves a diagram the model accepts, as far as an order can:

```text
the diagram's settings, types and styles, and the styles of what stays
→ edges that go
→ alignments of nodes that wait, then nodes, groups and lanes that go
→ members leave lanes, columns and groups where staying would block a move
→ layers, then nodes, in their new places
→ layers that go, now empty
→ the nodes' own facts
→ groups, lanes and columns, and who joins them
→ alignments
→ edges that come, each made as it ends up
→ their labels and numbers, once every edge is drawn
→ walls and notes
→ who follows whose look, and the types and styles that went
```

An alignment that a move would break is cleared before the move and set again after it. The order of layers, and of the nodes in a layer, is compared as the longest sequence the two share, so that only the nodes that truly moved get a move. Groups, lanes and edges keep the order they were made in, and an operation can only add one at the end. So the ones a new order puts out of step are removed and added again, and only the longest start that keeps its order stays.

## Decisions

- [001. Operations over whole-file rewrites](decisions/001-operations-over-whole-file-rewrites.md)
- [009. Git as the history](decisions/009-git-as-the-history.md)
- [033. The agent states every order](decisions/033-the-agent-states-every-order.md)
- [037. A group copy holds its inside](decisions/037-a-group-copy-holds-its-inside.md)
- [105. One command is one write, and running it twice changes nothing](decisions/105-one-command-is-one-write-and-running-it-twice-changes-nothing.md)
- [107. Every noun is changed by `--set`, `--move` and `--remove`](decisions/107-every-noun-is-changed-by-set-move-and-remove.md)
