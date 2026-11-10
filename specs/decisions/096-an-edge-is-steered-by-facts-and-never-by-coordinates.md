# 096. An edge is steered by facts and never by coordinates

Decided: 2026-11-07

## The problem

An agent that sees a bad edge can only change its ends, its sides and what lies around it. The philosophy owes a stronger model the means to tune, and a guideline held that no operation may touch a bend. The owner asked what else the command line should do to an edge, and whether a bend or a run needs a coordinate at all.

## The choice

An agent may say where an edge passes, what it goes with, where along its way it turns and how far it reaches. It never gives a coordinate.

- `edge --set --via` says what an edge passes and on which side.
- `edge --set --straight on` asks for a straight edge and refuses the write when there is none.
- `edge --set --with` runs an edge with another along one trunk.
- `edge --set --bend-at` turns an edge at 0.25, 0.5 or 0.75 of its way.
- `edge --set --stretch` widens a detour by a multiple.

A step that overlaps anything refuses the write, as an offset does.

## Not chosen

- A bend point or a run's length in pixels.
  - Coordinates are the work models fail at, and they go stale when the layout moves.
- Nothing past sides.
  - A strong model could then not tune an edge.
- `edge --spread`.
  - Even spacing is the engine's work.

## Consequences

The engine still routes every edge, and these facts bind it. Each is a constraint on the router, so they weigh toward a router that searches. Built on 2026-11-07 on the router as it is: `--bend` takes the longest inner run.
