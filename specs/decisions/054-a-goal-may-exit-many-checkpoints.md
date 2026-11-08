# 054. A goal may exit many checkpoints

Decided: 2026-11-05

## The problem

The skill's roadmap guide says "[NO] one goal in two checkpoints, since a parent's exit criteria say only that its sub-checkpoints are met". Its reason covers only a parent and its sub-checkpoints. Read as a ban on every repeat, it left 19 goals for 25 sub-checkpoints. The owner rejected the rule: a goal is there to be used again.

## The choice

A goal may be an exit criterion of any number of checkpoints. A parent still lists no goal of its sub-checkpoints, and says only that they are met.

## Not chosen

- Keeping each goal in one checkpoint.
  - A goal that keeps holding would be checked at one checkpoint only, and the later work it guards would have no exit of its own.
- A new goal for every checkpoint with no exit.
  - It would grow the goals only to satisfy the rule.

## Consequences

This is an exception to the skill's roadmap guide. A goal's first checkpoint is still the one where its check starts, and a checkpoint can now end on a goal that an earlier one already met. The sub-checkpoints built before the goals and CP5.1: The npm package keep no exit criteria.
