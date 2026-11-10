# 009. Git as the history

Decided: 2026-10-11

## The problem

A diagram's changes must be reviewable and undoable, without grafical keeping a history of its own.

## The choice

The file holds the current state only, and git keeps the history. `grafical diff` compares the file with a git revision and reports the difference as command lines, which a shell replays on the revision's file. Undo is git too: every change is a commit that can be reverted.

## Not chosen

- An operation log inside the file, which could replay any past version.
  - The file grows without limit and git merges get harder.
  - Git already keeps the history.
- A `grafical undo` command.
  - It would duplicate git with less safety.

## Consequences

As built, 2026-10-12: a small edit comes back as exactly the operation that made it. A group, lane or edge whose order changed comes back removed and added again, since an operation can only add one at the end. A test replays the differences between 40 pairs of random diagrams both ways and 40 from nothing, file for file.
