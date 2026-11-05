# 089. A style may be as rich as it likes

Decided: 2026-11-06

## The problem

A `<style>` picks objects by a condition and gives them a look, and a narrow condition would leave an agent short of what it wants to say.

## The choice

A style's condition may name regions and attributes and combine them with and, or and not. It may set every look that grafical can draw. `show` gives each value's source, so that a look can always be traced.

## Not chosen

- One region in each condition.
  - The owner wants style as rich as it can be.

## Consequences

One object's look can come from many places, which the fixed order of sources and `show` must keep readable. Conflicts between two styles need a rule when it is built, and the last one in the file is the plain choice.
