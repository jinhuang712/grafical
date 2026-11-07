# 096. An edge is steered by facts and never by coordinates

Decided: 2026-11-07

## The problem

An agent that sees a bad line can only change its ends, its sides and what lies around it. The philosophy owes a stronger model the means to tune, and a guideline held that no operation may touch a bend. The owner asked what else the command line should do to an edge, and whether a bend or a stretch needs a coordinate at all.

## The choice

An agent may say where a line passes, what it goes with, what comes first, where along its way it turns and how far it reaches. It never gives a coordinate.

- `edge --via` says what a line passes and on which side.
- `edge --straight` asks for a straight line and refuses the write when there is none.
- `edge --main` marks the main flow, and other lines give way.
- `edge --with` runs a line with another along one trunk.
- `edge --bend --at` turns a line at 0.25, 0.5 or 0.75 of its way.
- `edge --stretch --magnified` widens a detour by a multiple.

A step that overlaps anything refuses the write, as an offset does.

## Not chosen

- A bend point or a run's length in pixels.
  - Coordinates are the work models fail at, and they go stale when the layout moves.
- Nothing past sides.
  - A strong model could then not tune a line.
- `edge --spread`.
  - Even spacing is the engine's work.

## Consequences

The engine still routes every line, and these facts bind it. Each is a constraint on the router, so they weigh toward a router that searches. None is built, and which run a `--bend` names on a line of several runs is open.
