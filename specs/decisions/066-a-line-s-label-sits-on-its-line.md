# 066. A line's label sits on its line

Decided: 2026-11-06

## The problem

A line was routed first and its label then looked for room, so a crowded gutter ended in `label-blocked`. A picture the owner drew on 2026-11-06 shows the other way: labels cannot sit on each other, so they spread out, and the lines follow them. The owner holds that a label is a plain label and that a line carries it.

## The choice

A line's label sits on its line by default, and the line passes through it, whether the line runs straight or turns. A label wraps first where it lacks room, and then the lines move apart for it. An agent may take one line's label off the line, and it then sits beside the line as before.

## Not chosen

- A label on the line only where an agent asks.
  - The owner holds that on the line is the right form, so it is the default.
- One switch for a whole diagram.
  - A label belongs to its line, so the choice is the line's.
- Keeping the refusal for a line's label with no room.
  - Where a line can move, nothing is hidden and the cost is only room and bends, which are reported.

## Consequences

Every existing picture may change, and how much wider or more crossed they get is not measured. A line moves for text again, as a detour once did at a cost, so this is measured before it lands. A label takes more of a gutter, so pictures grow.
