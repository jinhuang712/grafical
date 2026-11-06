# 056. A column may carry a heading

Decided: 2026-11-05

## The problem

A roadmap by quarter drawn on 2026-10-19 had lanes for its teams and columns for its quarters. A column draws nothing, so the quarters became boxes in a row of their own, and each was warned of as a `lonely-node`. Lanes that run as columns have a heading, but they cannot share a diagram with lanes that run as rows.

## The choice

A column may carry a heading above its first row. It is text and draws no band, and the column stays a guide.

## Not chosen

- Boxes standing in for headings.
  - They are boxes in the file, and every write warns of them.
- Waiting for lanes that run both ways.
  - It is the larger feature, and it would give the agent a second way to say one thing.

## Consequences

One more text needs a clear place. A line that comes near a heading refuses the write, as one near a group's label does, and its code is chosen when it is built.
