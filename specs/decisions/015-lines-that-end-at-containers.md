# 015. Lines that end at containers

Decided: 2026-10-11

## The problem

An arrow to each part of a system adds lines that say no more than one arrow to the system.

## The choice

A line may end at a group, a row or a lane, not only at a box (behavior: FEATURES.md, "Ends at a group, a row or a lane"). One arrow to "catalog-api" says that callers call that system, without saying which part, and it replaces an arrow to each member. The owner asked for this on 2026-10-11: an arrow may point to a set, a layer or a swimlane.

A container end is met at its top or bottom when the other end lies above or below all its rows, and at its side when the two share a row. The router knows only boxes, so a container end is routed to the box of the container that faces the other end, the nearest one, and the route is cut where it meets the container's box. Such a line never shares a port or a trunk with the stand-in's own lines. A row a line ends at is drawn as a band across the content, with its label in a head above the row, over the first stretch of the row with no box below it.

## Not chosen

- Routing a container end to the box's border directly.
  - The router places ports and tracks around boxes.
  - A stand-in reuses all of that, including the label slots and the side exits.
- A label column for every band.
  - "Rows unseen, groups as systems" rejected one for every row.
  - A band's label sits in its own head instead.
- Two lanes as the two ends of one line.
  - Neighbouring lanes share a border, so the line between them would have no length.

## Consequences

Changed on 2026-10-16, drawing the owner's dispatch diagram with the gateway as a band: a line turned toward the band's box before it met the band, although the band spans the content. Now a band end met across rows takes its corridor through the rows between as if it lay straight past the other end, and once routed, the line runs straight on into the band from its earliest stretch that heads there, where that stretch is clear of every box, text, label slot and other line. Over 2,000 fuzz seeds, 829 diagrams end a line at a row and 246 of them changed: bends fell from 16,719 to 16,509, crossings from 18,171 to 18,125, and checker defects of any owner from 145 to 123. None of the 306 saved drafts ends a line at a row, and no fixture picture changed.
