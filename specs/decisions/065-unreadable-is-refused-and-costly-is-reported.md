# 065. Unreadable is refused and costly is reported

Decided: 2026-10-16

Split on 2026-11-06 from specs/decisions, "The dirty work has edges".

## The problem

Decided by the owner on 2026-10-16. The engine had been widening a group's box so that no line ran under a stated title ("The agent states where a group's label sits"), and the owner found the empty space it left. Looking for the cause, the owner named the rule behind it: the engine must not do needless work beyond its edges just to get a picture drawn. Until then an engine-owned defect was the engine's to avoid whatever the agent stated ("Defects owned by who can fix them"), and that duty had no edge: every hard case grew a fallback that drew a crooked form and told the agent nothing.

## The choice

- **Plain forms.** The engine draws each thing in a few plain forms:
  - A line straight or with one or two bends.
  - A label on or beside a run of its own line, wrapped onto more lines if it must.
  - A title at its place.
  - A note as the agent said.
  - Measuring text and spacing and aligning to the grid and choosing ports and tracks stay the engine's dirty work.
- **Unreadable is refused.** Drawing the facts in a plain form may hide what a reader needs, such as text under a line.
  - There the write is refused as an agent-owned defect that names the fact in the way.
  - The cause is a fact the agent stated: a row or an order or a place or a text.
- **Costly is reported.** Where it only costs, the picture is drawn and every write reports it.
  - The picture stays correct; whether the cost is worth it is the agent's to judge.
- **Engine-owned defects are what is left:** a plain form was there and the engine drew it wrong, such as a line through a box.
  - Those stay engine bugs.

## Not chosen

- Reporting everything, even a label with no room drawn over lines.
  - A picture that hides text is not correct, and a report beside it looks like success ("Defects owned by who can fix them").
- Keeping each fallback and reporting that it ran.
  - The crooked form would still be drawn for the agent, and the empty space or the detour would stay in the picture.

## Consequences

Every hard case either draws in a plain form or goes back to the agent. An agent meets more refusals, and the engine keeps fewer fallbacks.
