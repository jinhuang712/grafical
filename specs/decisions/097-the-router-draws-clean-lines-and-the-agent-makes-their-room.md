# 097. The router draws clean lines and the agent makes their room

Decided: 2026-11-07

## The problem

A trial of a search router on the routing cases cut crossings, and its pictures read worse. On `two-layers-skip` two arrowheads met head-on in a gap, on `ladder` lines knotted in one, and each fix of a number moved the trouble elsewhere. The owner stopped the runs and judged the routes by eye, one picture at a time. Nothing said how short a run may be, who widens a gap, or what the router does when no clean route exists.

## The choice

- A line may leave one side and enter another across layers, such as out of the right of A and into the left of D.
- The run at each end of a line is at least 16 px, and 24 px is the comfortable length.
  - The rule is the same at both ends, with an arrowhead or without one.
- Two lines that swap sides in one gap leave level, enter level and take no jog.
- Lines of one sort take one form in a picture, such as out of the bottom and into the top.
- A clean shape comes before few crossings, and few crossings come before no detour.
- The router never widens a column gap for a line.
  - The agent does it with `gap`, so that room stays the agent's habit.
- Where places leave a pair no clean route, one line goes round the outside.
  - The write goes through and reports that the agent may move a node.

## Not chosen

- The engine widens a gap by the lines it holds.
  - The owner wants the model to learn to adjust spacing.
- Each line of a pair enters by a top, with four bends or three.
  - The owner found the bends ugly.
- Level ends with a jog in the middle, on one line or on both.
  - The owner rejects jogs.
- Two lines 12 px apart at one end.
  - The owner wants both ends level.
- A shorter least run of 8 px at an end with no arrowhead.
  - The owner saw it and found it too narrow beside the 16 px of the other end.
- No detour stays second among the standards.
  - On `two-layers-skip` the owner took a long way round over jogs and uneven ends.
- Refusing the write when only a detour is clean.
  - The picture still reads, and "Unreadable is refused and costly is reported" reports a cost.

## Consequences

Two lines that swap sides in one gap cannot have level ends with no jog, since their runs would overlap at one end. Such a pair has to go round or be placed apart. Moving nodes was the cleanest answer drawn for `two-layers-skip`, so the case tests placement as much as routing.

A gap of 32 px holds one line and no more, 44 px holds two, and the compact gap of 24 px holds none. The router's 8 px from a node to a track falls short of this, so lines in gaps will move in existing pictures.

The outside route takes three bends, one past the plain forms of "Unreadable is refused and costly is reported".

One form across a picture asks the router to weigh lines together, where it now routes each on its own. On `pyramid` the owner found a real render with no crossings ugly, because its lines mixed sides, and took a hand drawing with one form, a fork from each bottom and nodes half a cell apart. That drawing waits for offsets, as "A node may sit off its cell by a fraction" says.

These rules come from hand drawings of `pair-both-ways`, `two-layers-skip`, `ladder` and `pyramid`. None is built, and `gap` has not been tried on these gaps.
