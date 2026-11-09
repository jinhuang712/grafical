# 066. An edge's label sits on its edge

Decided: 2026-11-06

## The problem

An edge was routed first and its label then looked for room, so a crowded gutter ended in `label-blocked`. A picture the owner drew on 2026-11-06 shows the other way: labels cannot sit on each other, so they spread out, and the edges follow them. The owner holds that a label is a plain label and that an edge carries it.

## The choice

An edge's label sits on its edge by default, and the edge passes through it, whether the edge runs straight or turns. A label wraps first where it lacks room, and then the edges move apart for it. An agent may take one edge's label off the edge, and it then sits beside the edge as before.

## Not chosen

- A label on the edge only where an agent asks.
  - The owner holds that on the edge is the right form, so it is the default.
- One switch for a whole diagram.
  - A label belongs to its edge, so the choice is the edge's.
- Keeping the refusal for an edge's label with no room.
  - Where an edge can move, nothing is hidden and the cost is only room and bends, which are reported.

## Consequences

Built on 2026-11-06, and measured with `pnpm bench diff` against the edge of labels beside edges:

| Corpus | Changed | Bends | Crossings | Width | Height |
|---|---|---|---|---|---|
| 329 saved drafts | 300 | 3,888 to 3,888 | 1,199 to 1,200 | +0.6% | −0.9% |
| 18 fixtures | 18 | 506 to 506 | 281 to 281 | +1.0% | −1.6% |
| 2,000 fuzz seeds | 1,785 | 146,618 to 146,639 | 166,076 to 166,236 | +0.4% | −4.0% |

Over the fuzz seeds `label-blocked` fell from 50 to 0 and `title-blocked` from 15 to 1. `needless-bend` went from 343 to 345.

Later the same day a label the gutter seated off its edge went onto its edge where room shows once the edges are drawn. Over 2,000 fuzz seeds 596 changed, with bends, crossings and sizes the same and `label-blocked` from 3 to 0. Over the fixtures, labels off their edges fell from 11 of 54 to 7.
