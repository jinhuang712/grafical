# The model

The model holds the facts of a diagram and is the only part that changes them. An agent never edits the file: it sends operations, and the model turns them into a new diagram, or refuses them and changes nothing. It also checks that every diagram it makes can be laid out, and it can say how two diagrams differ as operations. It never computes a position, which is the layout's work. It lives in `src/model/`.

## A write, from operations to file

Every write takes the same path, and a single command is a batch of one operation:

```text
command or batch file
  │  parse: each item becomes an operation, or is refused with its line
  ▼
load the file ── refused if its form, schema, marks, stylesheet or weights fail
  ▼
apply the operations, in order, to a copy ── the first error stops the batch
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

The operations work on a copy of the loaded diagram, so a refused write leaves nothing changed. Each operation runs against the diagram the operations before it made, and either returns errors or changes the copy. After each one, walls forget the nodes, groups and edges it removed, a wall left with an empty side goes, and notes go with their targets. When every operation has run, each layer is put in lane order and then in column order. That waits until the end because lanes and columns are facts that several operations of one batch may change.

## Checks of the whole diagram

An operation can only check what it touches. Some problems can only be seen in the diagram a whole batch makes, such as a group that a later operation split. Four checks look for them in turn, and the first that finds one stops the rest:

1. Integrity: the rules a schema cannot state.
   - Every id is unique and every edge's ends exist.
   - An alignment points to a node in another layer, and at most two nodes are emphasized.
   - An edge between a wall's two sides is refused as `wall-crossed` unless the wall allows it.
   - A wall allows an edge it names, an edge with an end it names and an edge with an end in a group it names.
2. Alignments: every alignment can hold with the order of the layers.
3. Groups: every group can be boxed without a node inside it that is not a member.
4. Steps: no node placed by steps lands on a cell that another fact keeps.

On the write path a fifth check follows them: every weight an edge names is a level the stylesheet knows. Each error from these checks carries the number of the check that found it. A diagram refused by a later check has passed the earlier ones, and the search for the operation that caused a problem relies on that.

The new diagram then goes to the layout and the checker. A defect the agent owns refuses the write. Otherwise the file is written to a temporary file beside it and renamed over it, so that a reader never sees half a file. `grafical try` takes the same path without the last step.

## The order of a layer

Every order in the file is one the agent stated, so the model never has to guess where a node goes. A node added to a layer, or moved into another layer, needs a place: `first`, `last`, `before` a node or `after` a node. The first node of an empty layer needs none, since it has only one place.

- A node with no place in a layer that has nodes is refused as `missing-field`, with the layer and its nodes.
- Two places at once are refused as `conflicting-position`.
- A node placed beside itself is refused as `bad-reference`.
- A node placed beside one in another layer is refused as `not-in-layer`, with the layer and its nodes.

Nothing in the model reorders a layer on its own. Only lanes and columns move nodes in a layer, and only because the agent put the nodes in them.

## Copying a group

`group --copy` builds a second zone, region or shard from the original in one operation. The copy holds the group's inner groups at every level, its nodes, and the edges whose two ends are both inside. With `--outside` it also holds every edge with one end inside, and that end moves to the copy.

Every id in the copy follows one rule. The copy is the id the agent names. Every inner group and node gets its original's id with the suffix. An edge whose id is the default `<from>-><to>` gets the default id of its copied ends, so that `diff` shows a plain `edge.add`. Any other edge id gets the suffix. A number that tells two edges between one pair apart, such as `#2`, stays at the end.

The copied group keeps the original's sublabel, its title's place and the group it sits in. Each copied node keeps everything its original has, and its group, alignment and steps point to the copies where they pointed inside. Each copied node joins its original's layer, before the first or after the last node of the group named as the place. Nodes placed by steps are copied too, while notes and walls are not.

The copy is refused rather than changed, so that what it makes is always what the agent asked for:

- Without a place, as `missing-field` with the groups it may sit beside.
- When a copied id is taken, as `duplicate-id`.
- When a node inside aligns to or steps from a node outside, as `copy-conflict`.
- When the group named as the place has no node in one of the copy's layers, as `no-shared-layer`.
- When a lane or a column would move a copied node away from the stated place, as `copy-conflict`.

## The difference between two diagrams

`grafical diff` turns the difference between a git revision of the file and the file on disk into operations, so that a reviewer reads a diagram change in the same words the agent wrote it. It reads the revision with `git show`, and a revision that has no such file counts as an empty one, so the batch starts with `diagram.new`. The result is a batch, one operation per line, that `apply` replays on the revision's file to give the file on disk.

The operations come in an order in which each one is valid when it runs:

```text
diagram settings
→ edges that go, then nodes, groups and lanes that go
→ layers, then nodes, in their new places
→ layers that go, now empty
→ the nodes' own facts
→ groups and lanes, and who is in them
→ edges that come
```

An alignment that a move would break is cleared before the move and set again after it. The order of layers, and of the nodes in a layer, is compared as the longest sequence the two share, so that only the nodes that truly moved get a move. Groups, lanes and edges keep the order they were made in, and an operation can only add one at the end. So the ones a new order puts out of step are removed and added again, and only the longest start that keeps its order stays.

## Decisions

- [001. Operations over whole-file rewrites](decisions/001-operations-over-whole-file-rewrites.md)
- [009. Git as the history](decisions/009-git-as-the-history.md)
- [033. The agent states every order](decisions/033-the-agent-states-every-order.md)
- [037. A group copy holds its inside](decisions/037-a-group-copy-holds-its-inside.md)
