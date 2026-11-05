# 059. Lines may be drawn square, round or smooth

Decided: 2026-11-06

## The problem

The owner holds that a very good picture needs curves. Curves were a value in the stylesheet that agents did not know, and they only rounded the corners of straight runs. A picture the owner drew on 2026-11-06 goes further: its sideways runs slope, and each line reads as one S.

## The choice

A diagram's lines are drawn square, round or smooth, chosen by a command. Round is the old curved corner. Smooth keeps the route and draws the sideways run as a slope. The shape moves from the stylesheet into the diagram file, since no agent found it there.

## Not chosen

- Round corners alone.
  - The long straight runs stay, and the owner's picture cannot be drawn.
- Free arcs between two ends, outside the routed channels.
  - They could cross boxes and text, and the router could no longer keep lines apart.
  - The owner's picture needs none, since each of its lines goes down, across and down.
- A shape per line for now.
  - No picture needs one yet.

## Consequences

A smooth line cuts corners, so the checks must follow the curve and not the route. A small jog of a route can draw as a kink. Whether smooth lines keep clear of every box and text is not measured.
