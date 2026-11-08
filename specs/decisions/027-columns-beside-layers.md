# 027. Columns beside layers

Decided: 2026-10-13

## The problem

Asked for by the owner on 2026-10-13 ("not just layers, we shall involve another thing called columns") and approved the same day in the phase 1e list: "Columns, optional … build it after bundled fan-outs", "as long as they help and have gains". A prototype that day, in a scratch copy of the engine, gave photo sharing 5 bends instead of 6 and a picture 744 px wide instead of 840, and the private reference draft 0 crossings instead of 1 and 23 bends instead of 27. The public brief, already in column order, did not change. The step was then left out of a question about what to build next, by mistake, and the owner asked for it again on 2026-10-14.

## The choice

A column is a guide, and nothing is drawn. Every node of a column lies left of every node of the next, in every layer: each layer is kept in column order on every write, as layers are for column lanes ("Lanes run one way"), and the column grid takes the same order. A node in no column keeps its place beside the node left of it, and so does a new one, at the place the agent stated ("The agent states every order"). Columns and lanes that run as columns are two ways to say one thing, so a diagram has one or the other.

## Not chosen

- Drawing columns as bands.
  - Lanes that run as columns are already that, and a column is a guide.
- A node in no column that drifts to the mean column of what it connects to on every write, as the prototype did.
  - An edge added elsewhere would move it, against "Layout computed again on every change".
  - A node that belongs to no layer and no column is a separate step ("Steps from another node").

## Consequences

The order holds across all layers ("Columns hold across layers").
