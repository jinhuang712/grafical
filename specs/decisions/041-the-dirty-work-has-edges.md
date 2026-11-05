# 041. The dirty work has edges

Decided: 2026-10-16

- Replaced in part by specs/decisions, "Refusals say what happened and which commands can change it": no refusal writes a command.
- Replaced in part by specs/decisions, "Every write prints every warning": a bent line is a warning block.

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
- **Measured before building** over the 306 saved agent drafts:
  - 81 drafts (26%) have a line with more than two bends.
  - That is 242 lines in all, 192 of them with four.
  - Every one of the 242 joins two boxes that are not in neighbouring rows.

What it changes, each built in its own step:
- **Lines with more than two bends** are reported on every write and by `check` and `render`.
  - Single commands report them too.
  - Each gets a `bent line= bends= skip=` record, and the counts get `bent=`.
  - Not refused.
  - Rule 2 of "A target picture with measured rules" said it already, but only `check --all` reported it.
  - The agent never heard.
  - Built on 2026-10-16.
  - To make room in the help read before a draft, `apply --help` lost two passages:
    - The line "Where lines go is grafical's job, never yours", which the rows an agent chooses now contradict.
    - A clause about the engine placing boxes, gone since "The agent states every order".
- **A crowded default title** no longer widens its box or moves two boxes apart ("Rows unseen, groups as systems").
  - Where no seat in the head keeps clear of the lines into the first row, the write is refused as `title-blocked`.
  - The agent then states a place.
  - Built on 2026-10-17.
  - The router no longer keeps lines off a label the engine seats either: it had pushed a line off its box's centre wherever the seat left the line no other room, which the owner did not choose when it was offered.
  - The engine now seats the label once the lines are drawn, at the leftmost seat none comes near.
  - The owner confirmed this on 2026-10-17 when shown its cost.
    - The two-zones fixture's private subnets had lines moved 16 px off their boxes' centres.
    - They now state their labels beside their rows, 176 px wider.
  - Over the 306 saved drafts, 58 of 396 group labels are now refused with at least one place clear for each.
    - They sit in 40 of the 183 drafts with groups.
    - For 13 the engine had moved boxes apart or grown a box.
    - For 45 it had pushed a line off its box's centre.
  - 72 drafts changed, with bends from 3,178 to 3,165 and crossings from 654 to 658.
  - Over 2,000 fuzz seeds, 338 changed.
    - One label has no place clear: a group around a single dot that lines enter from every side.
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
- **A wall's label with no room** along its wall no longer moves left of everything in a second layout ("Walls as space").
  - The write is refused.
  - Built on 2026-10-17 as `label-blocked` with `is=wall`.
  - It names the wall, then the lines and boxes within the label's clearance.
  - The places past the wall's ends went too.
    - For a wall across they were across the picture, and for a wall up and down above or below it.
    - There the label no longer sat on its own line, which grew to reach it.
  - The owner confirmed that on 2026-10-17.
  - No saved draft and no fixture has a labelled wall.
  - Over 2,000 fuzz seeds, 32 labels in 31 diagrams had no place along their wall and are now refused.
  - Bends, crossings and engine-owned defects are unchanged.
  - The pictures are 424 px narrower in all.
- **A note** is a card or a footnote as the agent states, no longer a card the engine turns into a footnote ("Notes as callouts or footnotes").
  - A card with no room is refused.
  - Built on 2026-10-17: `note add --footnote`.
    - The file holds `footnote: true` on the note, and a batch takes `footnote`.
    - `show` prints `footnote`.
    - A note without it is a card.
  - A card with no clear place beside its target takes its first place anyway.
  - The write is refused as `label-blocked` with `is=note`.
  - The refusal names the target, then the lines and boxes in the card's way.
  - The second layout pass is gone, and so with the walls' every second pass: a diagram is laid out once.
  - No saved draft and no fixture has a note.
  - Over 2,000 fuzz seeds the engine had made 1,201 of 1,967 notes footnotes by itself: 61%.
  - Laid out by both engines, 637 diagrams changed and 1,204 cards are now refused.
  - Bends, crossings and engine-owned defects are unchanged.
  - Dense pictures seldom have room for a card, since nothing moves for one.
  - So an agent should expect to state footnotes there.

## Not chosen

- Refusing a line with more than two bends unless the agent allows it, as a wall lets a line through.
  - Proposed on 2026-10-16; the owner chose reporting, which never blocks.
- Refusing every line with more than two bends.
  - Some structures need a line to skip rows, and a dense diagram might not be drawable at all.
- Reporting everything, even a label with no room drawn over lines.
  - A picture that hides text is not correct, and a report beside it looks like success ("Defects owned by who can fix them").
- The engine growing a box with no stated size to the size its lines' labels need, as it sizes one to its text.
  - Offered on 2026-10-17 for a line's label with no room; the owner chose that the agent widens it, from the size the refusal names.
- Keeping each fallback and reporting that it ran.
  - The crooked form would still be drawn for the agent, and the empty space or the detour would stay in the picture.

## Consequences

Changed on 2026-10-18 by "Refusals say what happened and which commands can change it" and "Every write prints every warning": a line with more than two bends is a `warning: bent-line` block, no longer a `bent line=` record.
