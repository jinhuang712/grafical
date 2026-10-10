# Philosophy

> Written 2026-10-11.

These are the beliefs behind grafical. Commands, formats and code will change. These statements will not.

Every decision in [DESIGN.md](DESIGN.md) traces back to one of them. If a decision contradicts one, the decision is wrong, or this file needs a deliberate, recorded change.

## A diagram is built in steps

Nobody draws a good diagram in one stroke. People place a box, add another, connect them, rename one, move one. grafical works the same way. Every change is a small operation with a name. Operations are the only way a diagram changes, and the file holds the result. Nothing is ever regenerated to change one thing.

## Only what you name changes

An operation changes what it names, and moves only what has to make room for it. Everything else stays where it was. A person who has learned where things are in a diagram should never have to learn it again because of a change somewhere else.

## The engine owns every pixel

Callers state facts: what exists, which layer it is in, what comes before what, what aligns with what, what connects to what. The engine turns facts into positions, sizes and routes. No caller ever handles a coordinate. Allowed values are few and named, which is why the result looks consistent.

## The tool carries the taste

A good diagram must not depend on a strong model. The tool decides everything a model is likely to get wrong: spacing, alignment, type sizes, routing, colors. A model only chooses from short lists. The smaller the gap between a weak and a strong model, the better the tool is working.

## Mistakes are caught at the step that made them

Every operation is checked when it arrives. A wrong ID, a missing layer or an overflowing label is reported at once, with what was expected and how to fix it. A diagram with a defect is never handed to a person as finished.

## The same file is the same picture

A diagram is kept, reviewed and rendered again much later. The same file renders the same picture on any machine. A newer grafical that would draw a file differently says so, and a file grafical cannot fully read is refused, never guessed at. The file lives in git, and changes to it read as operations.

## People and agents take the same steps

A person's drag and an agent's command become the same kind of operation on the same file. Neither overwrites the other's work, and each picks up where the other stopped. Stage 1 serves agents only, but nothing in it may close this door.
