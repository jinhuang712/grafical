# 015. Lines that end at containers

Decided: 2026-10-11

## The problem

An arrow to each part of a system adds lines that say no more than one arrow to the system.

## The choice

A line may end at a group, a row or a lane, not only at a box. One arrow to "catalog-api" says that callers call that system, without saying which part, and it replaces an arrow to each member. The owner asked for this on 2026-10-11: an arrow may point to a set, a layer or a swimlane.

A container end is met at its top or bottom when the other end lies above or below all its rows, and at its side when the two share a row.

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

A line to a band runs straight on into it from its earliest stretch that heads there, where that stretch is clear of every box, text, label and other line.
