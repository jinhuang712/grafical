# 040. The agent states where a group's label sits

Decided: 2026-10-16

## The problem

Decided by the owner on 2026-10-16 (behavior: FEATURES.md, "Groups"). In a booking C4 diagram the label "Booking app software system" sat in the head between the lines into the web app and the mobile app, where placement had made room for it ("Rows unseen, groups as systems"), and the owner found it in a weird spot. Asked where a group's label should go, the owner chose to let the agent say it through the command line: eight places inside the box, its four corners and the middle of each side, and four outside it, above, below, left and right.

## The choice

- **Unstated, seated where no line comes.** Without a place the engine seats the label in the head, where no line comes near, once the lines are drawn.
  - Until 2026-10-17 it seated the label where the lines into the first row kept their boxes' centres, and moved two of those boxes apart when no seat did; the owner first chose to keep that.
  - Under "The dirty work has edges" nothing moves for it, and a label with no clear seat refuses the write as `title-blocked`, as a stated one does.
- **Stated, exactly there, and nothing moves for it.** `group title <group> <place>` (alias `group label`) sets the group's `titleAt`, and the label sits exactly at that place.
  - The engine adds only the label's own room, and moves no box and no line for it.
  - A line that comes near it refuses the write as `title-blocked`, an agent defect ("Defects owned by who can fix them").
  - The owner chose this on 2026-10-16 as one rule for all twelve places, after seeing them drawn as first built.
    - The engine had moved boxes apart and sides out so that no line ran across a stated label.
    - That left empty space in the box: about 168 px for the centred label of the booking diagram and 88 px for a corner.
- **Twelve places:** three in the head, three in a foot, two centred just outside the top or bottom, two in a strip beside the rows, and two just outside the sides.
  - The owner chose `outside-top` and `outside-bottom` centred on 2026-10-16, as `top` is inside.
  - A label outside one side reaches out on that side only, so the picture centres on what it holds, as with row lanes.
- **Built** on 2026-10-16 in four steps: the head, the foot, outside above and below, and beside the rows.
  - The same day the widening gave way to the refusal.
  - The fuzz test found one fault while this was built, since fixed: a group around one with a label outside let a box in.

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
