# 090. A bundle splits at one knot

Decided: 2026-11-06

## The problem

A trunk that ran straight on with branches to both sides split into two runs at two heights, with a knot on each. The rule kept a four-way join from reading as a crossing. The owner asked for one knot, since the second one says nothing.

## The choice

A trunk with branches to both sides splits at one knot, on one run. The knot's dot marks the join, so a reader does not take it for a crossing.

## Not chosen

- Two knots, each at its own height.
  - It takes a second track and draws a mark with no meaning of its own.

## Consequences

Measured with `pnpm bench diff` on 2026-11-06: 38 of 329 saved drafts changed, with bends the same and crossings from 1,200 to 1,204. 19 of 2,000 fuzz seeds changed, with crossings from 166,236 to 166,242. Defects are unchanged.
