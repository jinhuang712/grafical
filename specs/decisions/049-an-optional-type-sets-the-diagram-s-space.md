# 049. An optional type sets the diagram's space

Decided: 2026-10-19

## The problem

Decided by the owner on 2026-10-19. A diagram has no type by default and is drawn as it is today. An agent may give it a type, and the type sets the space the diagram is drawn in, and with it which operations apply and which are refused. Two spaces never share one picture: nobody draws a fishbone and an entity-relationship diagram together. This reverses in part "Every layered diagram type", which rejected a setting for the diagram's type because the kinds already say what is drawn. A kind says what a box is; a space says what a place and a line mean.

## The choice

- **What a space is.** A layout gives four things a meaning: a place across, a place down, a line and a box around boxes.
  - Two layouts share a space only when all four agree.
  - When one differs, a reader cannot tell which rule a line or a place follows.
  - A swimlane and a sequence diagram both give each actor a column and run time down the page.
  - In a sequence every message has a height of its own and is the event.
  - In a swimlane a box is the event, and a line only says what comes next.
- **The spaces found so far.**
  - No type: rows from top to bottom with an order in each row.
    - Lines are routed between them.
    - Groups are boxes and lanes are bands.
    - Everything grafical draws today.
  - Sequence: participants across in a stated order, and messages down in a strict order.
    - Each message is a straight line at its own height.
    - A distributed system's space-time diagram is one too.
  - A time scale: one axis in units of time and tracks on the other axis.
    - Each item is placed and sized by its dates.
    - Gantt charts, trace waterfalls and UML timing diagrams.
  - A radial tree: a centre, and depth as the distance from it.
    - Mind maps and radial trees; a fishbone is a tree along a spine.
  - A shape that is the content: pyramids, funnels and cycles.
  - Overlapping sets: Venn and Euler diagrams, where an overlap is an intersection.
    - A box is in one group at most, so the space with no type cannot say it.
- **Diagrams that need no space of their own.** Drawn on 2026-10-19 with today's commands, each in the end with no crossing:
  - Time in order only, with columns for the periods and lanes for the tracks.
    - A roadmap by quarter: 13 boxes and 3 lines, after one `layer move`.
    - A git history by branch: 8 commits and 9 lines.
    - Two things were missing.
    - A column has no heading, so the quarters were boxes in a row of their own.
    - Each was warned as a `lonely-box`.
    - No box spans two periods.
    - The entry page says grafical draws no timelines, which holds only for a time scale.
  - Concentric layers, as nested groups.
    - An onion architecture of three layers reads as three nested boxes: 10 boxes and 8 lines.
    - Groups nest three deep at most.
  - Boxes with fields may be a kind of box in the space with no type, as in entity-relationship and class diagrams.
    - Lines would then end at a field.
    - Not drawn: a line's end at a field and a mark at a line's end are among the ports, end labels and tags that were turned down.
- **What a type changes.** The operations that apply.
  - An operation of another space is refused, and so is a type that does not fit what the file already holds.
- **What a type does not do.** It does not check a diagram against the conventions of its kind, and it adds no default words ("The legend says only what the agent named").
- **Not built.** Each space needs a layout, checks and help of its own.
- **Open.**
  - How a type is given: when the file is made, or later while it is still empty.
  - Whether diagrams that share the space with no type get a type, such as a flowchart or a C4 diagram.
    - A type would only narrow their operations.
  - Whether boxes with fields are a type or a kind of box.
  - Several spaces side by side in one picture with no line between them, as views of one file would be.

## Not chosen

- One space for every diagram, as since "Every layered diagram type".
  - It cannot draw a sequence or a mind map.
- Spaces mixed in one picture.
  - A line or a place would mean two things.
- No type, with the operations used deciding the space.
  - Then the first sequence operation makes the file a sequence diagram.
  - Proposed the same day.
  - The agent would change what the diagram is without saying so.

## Consequences

A type sets only the diagram's space. A type that checks its conventions stays out, since grafical would be judging content.
