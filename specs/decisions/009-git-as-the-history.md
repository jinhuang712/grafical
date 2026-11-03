# 009. Git as the history

Decided: 2026-10-11

## The problem

A diagram's changes must be reviewable and undoable, without grafical keeping a history of its own.

## The choice

The file holds the current state only, and git keeps the history. `grafical diff` compares the file with a git revision and reports the difference as operations, which `apply` replays on the revision's file (behavior: FEATURES.md, "Diff"). Undo is git too: every change is a commit that can be reverted.

## Not chosen

- An operation log inside the file, which could replay any past version. The file grows without limit, git merges get harder, and git already keeps the history.
- A `grafical undo` command. It would duplicate git with less safety.

## Consequences

As built, 2026-10-12: the operations come in an order in which each one is valid when it runs, and a small edit comes back as exactly the operation that made it. Groups, lanes and lines keep creation order in the file, and an operation can only append one, so any whose order changed are removed and added again. A test replays the differences between 120 pairs of random diagrams, both ways, file for file.
