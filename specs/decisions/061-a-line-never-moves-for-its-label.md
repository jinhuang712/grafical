# 061. A line never moves for its label

Decided: 2026-10-17

Split on 2026-11-06 from specs/decisions, "The dirty work has edges".
Replaced in part by specs/decisions, "Refusals say what happened and which commands can change it": no refusal writes a command.

## The problem

A line's label with no room made its line step out of the crowd, a detour nobody asked for.

## The choice

- **A line's label with no room** along its path no longer makes its line step out of the crowd ("Our own gap router", detours).
  - The write is refused and names the line.
  - The agent shortens the label, drops it or changes rows.
  - Built on 2026-10-17 as `label-blocked`, for a step's badge too.
    - The label takes the slot that costs least on its longest run.
    - The refusal names the line, then the lines and borders across the label.
    - It names the gutters it tried as `gutters`, each `<row above>/<row below>`.
  - A label across a line is then the agent's, and no longer an engine-owned `text-crossing` or `label-collision`.
  - Shown three labelled lines between two medium boxes on 2026-10-17, the owner found them crowded.
    - The owner asked whether the box should grow.
    - At the large size of the box they leave, all three labels fit.
  - The owner chose that the agent widens it and never the engine.
    - The refusal carries as `fix` the command that gives a box at either end of the line the first larger size at which the label fits.
    - grafical finds that size by laying the diagram out with it, and gives none where no size fits.
    - Removed on 2026-10-18 by "Refusals say what happened and which commands can change it": no refusal writes a command any more, and `next` names `node resize`.
  - None of the 306 saved drafts and none of the fixtures had such a label, so none changed.
  - Over 2,000 fuzz seeds generated as before, 455 diagrams had one with 1,198 lines in all and are now refused.
  - Laid out by both engines:
    - Bends went from 149,848 to 146,678 and crossings from 185,131 to 170,143.
    - Height went down 4.1%.
    - The engine-owned `needless-bend` went from 845 to 514.
  - The fuzz generator now shortens or drops such a label, as an agent does.
  - Since 2026-10-18 the same holds for a label moved off a line cut at a container ("Lines that end at containers") that finds no place beside what is left of the line clear of the other lines and the sides of lanes.
  - It had been drawn across a lane's border, where a line from a row lane to the next row keeps only a 16 px stub.
  - The fuzz test found it in 3 of 5,000 seeds.

## Not chosen

- The engine growing a box with no stated size to the size its lines' labels need, as it sizes one to its text.
  - Offered on 2026-10-17 for a line's label with no room; the owner chose that the agent widens it, from the size the refusal names.

## Consequences

An agent meets `label-blocked` and shortens the label, drops it, widens a box or changes rows.
