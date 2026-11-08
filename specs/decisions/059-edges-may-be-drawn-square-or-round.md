# 059. Edges may be drawn square or round

Decided: 2026-11-06

## The problem

The owner holds that a very good picture needs curves. Curves were a value in the stylesheet that agents did not know, and they only rounded the corners of straight runs. A picture the owner drew on 2026-11-06 goes further: its sideways runs slope, and each edge reads as one S.

## The choice

A diagram's edges are drawn square or round, chosen by a command. Round is the old curved corner. The shape moves from the stylesheet into the diagram file, since no agent found it there.

## Not chosen

- Round corners alone.
  - The long straight runs stay, and the owner's picture cannot be drawn.
- Free arcs between two ends, outside the routed channels.
  - They could cross nodes and text, and the router could no longer keep edges apart.
  - The owner's picture needs none, since each of its edges goes down, across and down.
- A shape per edge for now.
  - No picture needs one yet.

## Consequences

A slope over the same route reached 2 of 30 edges on the dispatch fixture, so a smooth shape went. An edge that is a curve end to end waits for its own design.
