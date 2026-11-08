# 035. Columns hold across layers

Decided: 2026-10-15

## The problem

Decided by the owner on 2026-10-15, after the same field study. A lane process with lanes across and a column for each phase drew "Receive goods", in the fifth column, right above "Ship", in the fourth. Each layer kept its nodes in column order, but nodes of different layers in neighbouring columns could share a place in the grid. The smallest case: two layers, `a` in the first column and `b` in the second, both drawn at the same x.

## The choice

- **The rule.** Every node of a column lies left of every node of the next column in all layers.
  - So the phases of a process line up across lanes.
  - "Columns beside layers" said this in words that allowed both readings.
- **Cost.** A picture that uses columns only to order its layers may grow wider.
- **Built on 2026-10-15.** Placement keeps a layer's gap between every node of a column and every node of the next, in any layer.
  - The grid already kept their order, but two nodes in different layers could share an x.
  - The field study's lane process grew from 944 px to 1448 px wide and from 4 bends to 8, because edges between nodes in different columns can no longer run straight.

## Not chosen

- Columns that order nodes only within a layer, with the promise reworded.
  - Lanes across with phases could not be drawn, and lanes that run down would stay the only lane process.

## Consequences

A picture that uses columns may grow wider.
