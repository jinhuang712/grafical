# 084. A region's label sits at a fraction of a side

Decided: 2026-11-06

## The problem

The diagram's title sat at the top left with no choice, and a picture the owner drew on 2026-11-06 centres it. A group's label had 13 named places, and other regions had none. The owner holds that a diagram, a group, a layer, a lane and a column are all regions.

## The choice

A region's label is placed by three things: a fraction from 0 to 1 along a side, the side, and inside or outside the region. At 0.7 the label's own 70% point meets the side's 70% point, so a label never runs past its side.

## Not chosen

- Left, centre and right as words.
  - A number holds all three, and a second form would be a second way.
- The 13 named places of a group.
  - Each is a fraction, a side and inside or outside.
- A separate rule for the title.
  - It is one more region.

## Consequences

A fraction is a position, which is an exception to places as facts. It holds only for a text along its own region, and it moves no node and no edge. A label that would overlap anything is refused. A label inside a region can make the region taller.

Built on 2026-11-06:

- The 12 named places went on the owner's word, since each repeats a fraction, a side and a place.
- The flags are `--side` and `--place`, as on the `<label>` block.
- A title takes a fraction and `top` or `bottom`, and stops short of the legend.
- A layer's and a lane's label take a fraction along their head and no side, since the head stays where it is.
- A column has no label yet, so it waits for "Column headings" on the owner's word.
