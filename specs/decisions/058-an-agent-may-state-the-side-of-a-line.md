# 058. An agent may state the side of a line

Decided: 2026-11-06

## The problem

The router chose every line's sides, and agents reported lines they could not steer. One line between neighbours of a row went round a group above them, and the agent could not ask for the way below. A strong model that tunes a picture had only the row order to change, which also changes what the order says.

## The choice

An agent may state the side a line leaves by, the side it enters by, or both. A side left unstated stays the router's. Where the line cannot go by the stated side, the write is refused with the facts in the way, and the router never takes another side in its place.

## Not chosen

- The router choosing every side.
  - The old reason was that a weak model chooses sides badly.
  - A weak model need not state one, so that reason no longer holds.
- A port or a bend point.
  - A side is a fact, and a port or a bend is a position.
- A hint that the router may ignore.
  - The agent could not tell whether the fact it stated held.

## Consequences

Built on 2026-11-06 as `edge --side`, refused as `side-blocked`. A line that leaves away from the other end, such as out of the top of a line going down, has no route yet and is refused. No saved draft or fixture changed, since none states a side.


A stated side can force more bends or crossings, and those are reported as usual. The router gains lines it may not turn to another side, and how much that costs is not measured.
