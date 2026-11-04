# The model

The model holds the facts of a diagram and is the only part that changes them. An agent never edits the file: it sends operations, and the model turns them into a new diagram, or refuses them and changes nothing. It also checks that every diagram it makes can be laid out, and it can say how two diagrams differ as operations. It never computes a position, which is the layout's work. It lives in `src/model/`.

## A write, from operations to file

Every write takes the same path, and a single command is a batch of one operation:

```text
command or batch file
  │  parse: each item becomes an operation, or is refused with its line
  ▼
load the file ── refused if YAML, schema, marks, stylesheet or weights fail
  ▼
apply the operations, in order, to a copy ── the first error stops the batch
  ▼
put each row in lane order, then in column order
  ▼
check the whole diagram, in turn: integrity → alignments → groups → steps
  ▼
lay out and check the picture ── a defect the agent owns refuses the write
  ▼
write the file: a temporary file, then a rename
```

Loading reads the YAML with unique keys and validates it against the schema. It then reads the files of the marks, the stylesheet the diagram names and the weight levels that stylesheet knows. A file that fails any of these is refused as a whole, with `already in the file` as its source, so that grafical never draws from a file it read only in part. A file that cannot be found or read is refused with the command as its source.

The operations work on a copy of the loaded diagram, so a refused write leaves nothing changed. Each operation runs against the diagram the operations before it made, and either returns errors or changes the copy. After each one, walls forget the boxes, groups and lines it removed, a wall left with an empty side goes, and notes go with their targets. When every operation has run, each row is put in lane order and then in column order. That waits until the end because lanes and columns are facts that several operations of one batch may change.

## Checks of the whole diagram

An operation can only check what it touches. Some problems can only be seen in the diagram a whole batch makes, such as a group that a later operation split. Four checks look for them in turn, and the first that finds one stops the rest:

1. Integrity: the rules a schema cannot state.
   - Every id is unique and every line's ends exist.
   - An alignment points to a box in another row, and at most two boxes are emphasized.
   - A line between a wall's two sides is refused as `wall-crossed` unless the wall allows it.
   - A wall allows a line it names, a line with an end it names and a line with an end in a group it names.
2. Alignments: every alignment can hold with the order of the rows.
3. Groups: every group can be boxed without a box inside it that is not a member.
4. Steps: no box placed by steps lands on a cell that another fact keeps.

On the write path a fifth check follows them: every weight a line names is a level the stylesheet knows. Each error from these checks carries the number of the check that found it. A diagram refused by a later check has passed the earlier ones, and the search for the operation that caused a problem relies on that.

The new diagram then goes to the layout and the checker. A defect the agent owns refuses the write. Otherwise the file is written to a temporary file beside it and renamed over it, so that a reader never sees half a file. `grafical try` takes the same path without the last step.

## The order of a row

Every order in the file is one the agent stated, so the model never has to guess where a box goes. A box added to a row, or moved into another row, needs a place: `first`, `last`, `before` a box or `after` a box. The first box of an empty row needs none, since it has only one place.

- A box with no place in a row that has boxes is refused as `missing-field`, with the row and its boxes.
- Two places at once are refused as `conflicting-position`.
- A box placed beside itself is refused as `bad-reference`.
- A box placed beside one in another row is refused as `not-in-layer`, with the row and its boxes.

Nothing in the model reorders a row on its own. Only lanes and columns move boxes in a row, and only because the agent put the boxes in them.

## Copying a group

`group copy` builds a second zone, region or shard from the original in one operation. The copy holds the group's inner groups at every level, its boxes, and the lines whose two ends are both inside. With `--outside` it also holds every line with one end inside, and that end moves to the copy.

Every id in the copy follows one rule. The copy is the id the agent names. Every inner group and box gets its original's id with the suffix. A line whose id is the default `<from>-><to>` gets the default id of its copied ends, so that `diff` shows a plain `edge.add`. Any other line id gets the suffix. A number that tells two lines between one pair apart, such as `#2`, stays at the end.

The copied group keeps the original's sublabel, its title's place and the group it sits in. Each copied box keeps everything its original has, and its group, alignment and steps point to the copies where they pointed inside. Each copied box joins its original's row, before the first or after the last box of the group named as the place. Boxes placed by steps are copied too, while notes and walls are not.

The copy is refused rather than changed, so that what it makes is always what the agent asked for:

- Without a place, as `missing-field` with the groups it may sit beside.
- When a copied id is taken, as `duplicate-id`.
- When a box inside aligns to or steps from a box outside, as `copy-conflict`.
- When the group named as the place has no box in one of the copy's rows, as `no-shared-layer`.
- When a lane or a column would move a copied box away from the stated place, as `copy-conflict`.

## The difference between two diagrams

`grafical diff` turns the difference between a git revision of the file and the file on disk into operations, so that a reviewer reads a diagram change in the same words the agent wrote it. It reads the revision with `git show`, and a revision that has no such file counts as an empty one, so the batch starts with `diagram.new`. The result is a batch, one operation per line, that `apply` replays on the revision's file to give the file on disk.

The operations come in an order in which each one is valid when it runs:

```text
diagram settings
→ lines that go, then boxes, groups and lanes that go
→ rows, then boxes, in their new places
→ rows that go, now empty
→ the boxes' own facts
→ groups and lanes, and who is in them
→ lines that come
```

An alignment that a move would break is cleared before the move and set again after it. The order of rows, and of the boxes in a row, is compared as the longest sequence the two share, so that only the boxes that truly moved get a move. Groups, lanes and lines keep the order they were made in, and an operation can only add one at the end. So the ones a new order puts out of step are removed and added again, and only the longest start that keeps its order stays.
