# 026. Edge weights

Decided: 2026-10-13

## The problem

Decided by the owner on 2026-10-13, built the same day. "Lines meet any side" gave a line one emphasis, the thick main path. The owner wants some lines thicker than others, in more than one step (behavior: FEATURES.md, "Weight").

## The choice

A weight is a named level or a width. The levels are the agent's usual choice, and a stylesheet may retune and add them: `thin` is `paint.edge.strokeWidth`, `thick` is `paint.edge.main.strokeWidth`, and every other level lives in `paint.edge.weights`. The file is read before its stylesheet, so the levels are checked once the stylesheet is loaded. A width in pixels reverses part of "Lines meet any side", which rejected free styles per line. It reverses the width only: colour and dash stay with the kind ("Looks").

In the file, `accent: true` on a line stays valid and means `weight: thick` ("File format": the format only grows). grafical never writes both, and when a hand-written file has both, `weight` wins. Two lines of the same width look the same, whatever their level names.

How a weight becomes a width and an arrowhead is in [the theme](../theme.md#line-weights).

## Not chosen

- Three fixed levels with fixed widths.
  - The owner wants to retune them.
- A numeric width only, with no names.
  - The agent would pick a different number for every line, and the reader would have to decode each one.
  - The levels give the agent the choice "Lines meet any side" wanted, and the number is there for the person who needs an exact width.
- Raising the weight limit with the number of levels.
  - Emphasis works because few lines have it.

## Consequences

An old file's `accent: true` keeps meaning `weight: thick` for good, and two lines of the same width look the same whatever their level.
