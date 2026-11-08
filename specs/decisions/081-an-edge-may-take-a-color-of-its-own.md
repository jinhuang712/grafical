# 081. An edge may take a color of its own

Decided: 2026-11-06

## The problem

An edge's color came from the theme, so a failure path could only be drawn thicker. A node had just gained colors of its own ("A node may take a look of its own").

## The choice

An edge takes its color from the styles it marks, as a node does. A dash still follows the type, since it says what the edge means.

## Not chosen

- Keeping one color for all edges.
  - The old reason was that a reader would have to decode each color. A legend can say what a color means, and looks may take any value.
- A dash per edge.
  - A dash says what an edge means, and a reader trusts it.

## Consequences

A color that the legend does not explain leaves the reader to guess. A light color on a light picture can fade, and grafical does not judge that.
