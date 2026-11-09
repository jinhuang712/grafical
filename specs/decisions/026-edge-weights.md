# 026. Edge weights

Decided: 2026-10-13

## The problem

Decided by the owner on 2026-10-13, built the same day. "Edges meet any side" gave an edge one emphasis, the thick main path. The owner wants some edges thicker than others, in more than one step.

## The choice

A weight is a named level or a width. The levels are the agent's usual choice, and a stylesheet may retune and add them. The file is read before its stylesheet, so the levels are checked once the stylesheet is loaded. A width in pixels reverses part of "Edges meet any side", which rejected free styles per edge. It reverses the width only: colour and dash stay with the type.

Two edges of the same width look the same, whatever their level names.

## Not chosen

- Three fixed levels with fixed widths.
  - The owner wants to retune them.
- A numeric width only, with no names.
  - The agent would pick a different number for every edge, and the reader would have to decode each one.
  - The levels give the agent the choice "Edges meet any side" wanted, and the number is there for the person who needs an exact width.
- Raising the weight limit with the number of levels.
  - Emphasis works because few edges have it.

## Consequences

Two edges of the same width look the same whatever their level.
