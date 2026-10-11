# Philosophy

> Written 2026-10-11.

These are the beliefs behind grafical. Commands, formats and code will change. These statements will not.

Every decision in [DESIGN.md](DESIGN.md) traces back to one of them. If a decision contradicts one, the decision is wrong, or this file needs a deliberate, recorded change.

## A diagram is built in steps

Nobody draws a good diagram in one stroke. People place a box, add another, connect them, rename one, move one. grafical works the same way. Every change is a small operation with a name. Operations are the only way a diagram changes, and the file holds the result. Nothing is ever regenerated to change one thing.

## Only the facts you name change

An operation changes the facts it names, and no other fact. Which layer a node is in, its order, its group and its alignment stay as they are until an operation names them. Positions may shift so that the picture stays tidy, but the structure does not. A person who has learned the structure of a diagram never has to learn it again because of a change somewhere else.

## The engine owns every pixel

Callers state facts: what exists, which layer it is in, what comes before what, what aligns with what, what connects to what. The engine turns facts into positions, sizes and routes. No caller ever handles a coordinate. Allowed values are few and named, which is why the result looks consistent.

Like a typesetter, the engine lays out the whole picture again from the facts after every change, fast enough to feel instant, and re-spaces whatever the change affects so the diagram always looks tidy. Positions are computed, never stored.

## The tool carries the taste

A good-looking diagram must not depend on a strong model. The tool decides everything about the look that a model is likely to get wrong: spacing, alignment, type sizes, routing, colors. A model only chooses from short lists. The smaller the gap between a weak and a strong model in how the picture looks, the better the tool is working.

## The engine arranges; the agent decides what the diagram says

The engine is responsible for the picture: where boxes and lines go, how they are spaced and routed, and how they are drawn and styled. The agent is responsible for the content: what to include and how much, what to merge, what each box and line is called, whether the facts are correct, and whether the story reads well. The engine may tell the agent a fact that helps, such as "this row is wider than the page", but it never decides content for the agent.

Added by the owner on 2026-10-11, after three judged rounds showed that the engine's work had reached the picture's layout while the remaining points were lost on what the agent chose to draw.

## Mistakes are caught at the step that made them

Every operation is checked when it arrives. A wrong ID, a missing layer or an overflowing label is reported at once, with what was expected and how to fix it. A diagram with a defect is never handed to a person as finished.

## The same file is the same picture

A diagram is kept, reviewed and rendered again much later. The same file renders the same picture on any machine. A newer grafical that would draw a file differently says so, and a file grafical cannot fully read is refused, never guessed at. The file lives in git, and changes to it read as operations.

## People and agents take the same steps

A person's drag and an agent's command become the same kind of operation on the same file. Neither overwrites the other's work, and each picks up where the other stopped. Stage 1 serves agents only, but nothing in it may close this door.
