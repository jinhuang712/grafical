# 027. Columns beside rows

Decided: 2026-10-13

Replaced in part by specs/decisions, "Columns hold across rows": the order holds across all rows.

## The problem

Asked for by the owner on 2026-10-13 ("not just layers, we shall involve another thing called columns") and approved the same day in the phase 1e list: "Columns, optional … build it after bundled fan-outs", "as long as they help and have gains". A prototype that day, in a scratch copy of the engine, gave photo sharing 5 bends instead of 6 and a picture 744 px wide instead of 840, and the private reference draft 0 crossings instead of 1 and 23 bends instead of 27. The public brief, already in column order, did not change. The step was then left out of a question about what to build next, by mistake, and the owner asked for it again on 2026-10-14 (behavior: FEATURES.md, "Columns").

## The choice

A column is a guide, and nothing is drawn. Every box of a column lies left of every box of the next, in every row: each row is kept in column order on every write, as rows are for column lanes ("Swimlanes run one way"), and the column grid takes the same order. A box in no column keeps its place beside the box left of it, and so does a new one, at the place the agent stated ("The agent states every order"). Columns and lanes that run as columns are two ways to say one thing, so a diagram has one or the other.

## Not chosen

- Drawing columns as bands.
  - Lanes that run as columns are already that, and a column is a guide.
- A box in no column that drifts to the mean column of what it connects to on every write, as the prototype did.
  - A line added elsewhere would move it, against "Layout computed again on every change".
  - A box that belongs to no row and no column is a separate step ("Steps from another box").

## Consequences

Made exact on 2026-10-15 by the owner: the order holds across all rows, not only within each one ("Columns hold across rows").
