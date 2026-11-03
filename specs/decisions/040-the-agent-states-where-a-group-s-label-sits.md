# 040. The agent states where a group's label sits

Decided: 2026-10-16

## The problem

Decided by the owner on 2026-10-16 (behavior: FEATURES.md, "Groups"). In a booking C4 diagram the label "Booking app software system" sat in the head between the lines into the web app and the mobile app, where placement had made room for it ("Rows unseen, groups as systems"), and the owner found it in a weird spot. Asked where a group's label should go, the owner chose to let the agent say it through the command line: eight places inside the box, its four corners and the middle of each side, and four outside it, above, below, left and right.

## The choice

- **Unstated, seated where no line comes.** Without a place the engine seats the label at the leftmost seat of the head that no line comes near once the lines are drawn.
  - Until 2026-10-17 it seated the label where the lines into the first row kept their boxes' centres.
    - When no seat did, it moved two of those boxes apart.
    - The owner first chose to keep that.
  - Under "The dirty work has edges" nothing moves for it.
  - A label with no clear seat refuses the write as `title-blocked` as a stated one does, with no `place` among its facts.
- **Stated, exactly there, and nothing moves for it.** `group title <group> <place>` (alias `group label`) sets the group's `titleAt`, and the label sits exactly at that place.
  - The engine adds only the label's own room:
    - A head above the first row or a foot below the last.
    - A strip beside the rows or room past a side.
  - It moves no box and no line for it, and the router does not see the label.
  - A line that comes nearer the label or its sublabel than the clearance the engine keeps from a label it seats itself refuses the write as `title-blocked`, an agent defect ("Defects owned by who can fix them").
  - Its elements name the group and the lines.
  - Its facts name the place and `clear`, every other place where no line would come near.
    - grafical finds those places by laying the diagram out again with each.
  - The agent takes one of those, or drops the place for the engine's seat.
  - The owner chose this on 2026-10-16 as one rule for all twelve places, after seeing them drawn as first built.
    - The engine had moved boxes apart and sides out so that no line ran across a stated label.
    - That left empty space in the box: about 168 px for the centred label of the booking diagram and 88 px for a corner.
    - The owner marked it.
- **The foot.** A label at `bottom-left`, `bottom` or `bottom-right` sits in a foot below the group's last row as tall as a head.
  - The box's top then keeps only a padding above its first row.
  - Feet nest as heads do.
- **Outside, above or below.** `outside-top` and `outside-bottom` put the label centred in a head's height just outside the box's top or bottom side.
  - The box keeps a padding inside.
  - The owner chose centred on 2026-10-16, as `top` is inside.
- **Beside the rows.** `left` and `right` put the label in a strip inside the box beside its rows, at the middle height of the side.
  - Every member and inner box keeps clear of it at any height.
  - `outside-left` and `outside-right` put it just outside that side.
  - The box's neighbours keep away from it as from the box.
  - The label never wraps, so a long one makes a wide strip.
  - A label outside one side reaches out on that side only.
  - So the picture centres on what it holds rather than on the centre line, as with row lanes.
  - The label's width is not mirrored as empty space past the other side.
  - The fuzz test found one fault while this was built, since fixed.
    - The room a label outside took was counted past a group's members but not past its inner boxes.
    - So a group around one with such a label let a box in.
- **Built** on 2026-10-16 in four steps:
  - The head.
  - The foot.
  - Outside above and below.
  - Beside the rows.
  - The same day the widening gave way to the refusal.

## Not chosen

- The engine moving the label to the bottom left when the head is crowded, the C4 habit.
  - The engine would choose a look for the agent (PHILOSOPHY.md, "Who owns what?").
- Every label at the bottom left.
  - The owner chose a place per group, stated by the agent.
- Four corners only, or four corners inside and outside.
  - Shown to the owner on 2026-10-16; the owner chose the eight places inside and the four outside.
- Moving boxes apart and sides out so that no line runs across a stated label, built first.
  - Every line kept its box's centre, but the box took empty space the agent never asked for.
- Sliding a stated label along its side to the nearest stretch no line crosses.
  - The label would no longer be where the agent said.
- Moving the lines off their boxes' centres around a stated label, or bending them around it.
  - The label would move the agent's lines; offered on 2026-10-16 and not chosen.

## Consequences

The label never wraps, so a long one makes a wide strip, and a line that comes near it refuses the write as `title-blocked`.
