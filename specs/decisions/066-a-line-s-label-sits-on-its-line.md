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

Built on 2026-11-06, and measured with `pnpm bench diff` against the line of labels beside lines:

| Corpus | Changed | Bends | Crossings | Width | Height |
|---|---|---|---|---|---|
| 329 saved drafts | 300 | 3,888 to 3,888 | 1,199 to 1,200 | +0.6% | −0.9% |
| 18 fixtures | 18 | 506 to 506 | 281 to 281 | +1.0% | −1.6% |
| 2,000 fuzz seeds | 1,785 | 146,618 to 146,639 | 166,076 to 166,236 | +0.4% | −4.0% |

Over the fuzz seeds `label-blocked` fell from 50 to 0 and `title-blocked` from 15 to 1. `needless-bend` went from 343 to 345. Lines do not yet move apart for a label, so a label with no place on its line still sits beside it.

Later the same day a label the gutter seated off its line went onto its line where room shows once the lines are drawn. Over 2,000 fuzz seeds 596 changed, with bends, crossings and sizes the same and `label-blocked` from 3 to 0. Over the fixtures, labels off their lines fell from 11 of 54 to 7.

The rest was written before the build.

Every existing picture may change, and how much wider or more crossed they get is not measured. A line moves for text again, as a detour once did at a cost, so this is measured before it lands. A label takes more of a gutter, so pictures grow.
