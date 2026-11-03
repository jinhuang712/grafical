# 035. Columns hold across rows

Decided: 2026-10-15

## The problem

Decided by the owner on 2026-10-15, after the same field study. A swimlane with lanes across and a column for each phase drew "Receive goods", in the fifth column, right above "Ship", in the fourth. Each row kept its boxes in column order, but boxes of different rows in neighbouring columns could share a place in the grid. The smallest case: two rows, `a` in the first column and `b` in the second, both drawn at the same x.

## The choice

- **The rule.** Every box of a column lies left of every box of the next column, across all rows, so that the phases of a process line up across lanes. "Columns beside rows" said this in words that allowed both readings.
- **Cost.** A picture that uses columns only to order its rows may grow wider.
- **Built on 2026-10-15.** Placement keeps a row's gap between every box of a column and every box of the next, in any row. The grid already kept their order, but two boxes in different rows could share an x. The field study's swimlane grew from 944 px to 1448 px wide and from 4 bends to 8, because lines between boxes in different columns can no longer run straight.

## Not chosen

- Columns that order boxes only within a row, with FEATURES.md reworded. Lanes across with phases could not be drawn, and lanes that run down would stay the only swimlane.

## Consequences

A picture that uses columns may grow wider.
