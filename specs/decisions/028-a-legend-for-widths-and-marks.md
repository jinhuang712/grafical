# 028. A legend for widths and marks

Decided: 2026-10-14

## The problem

Decided by the owner on 2026-10-14. When the reference picture was redrawn with grafical alone, thick lines were used to mean "writes to a store". The legend could only call them "main path", so the emphasis was dropped. Asked whether an agent should name it, the owner answered "yes, the legend needs more flexibility", and chose, of three options, a legend that names everything in the picture that carries meaning. Built the same day (behavior: FEATURES.md, "Legend").

## The choice

The caller gives words only. Which entries exist follows what is drawn, and where the legend sits and how it wraps are the engine's ("Facts over coordinates"). A name for something the diagram does not draw is kept, and its entry shows once it is drawn. A mark has an entry only when it is named, because a mark with no words tells the reader nothing. Marks with the same name share one entry, and every sample is drawn at one height.

How the legend is laid out is in [text placement](../labels.md#the-legend).

## Not chosen

- Free entries, which the agent writes in its own order.
  - It is the most flexible, but the legend could then list what is not drawn and leave out what is.
- Lines and widths only.
  - Marks would stay unexplained, and a mark's meaning is what a reader cannot guess.
- A legend the caller places, at the bottom or the left.
  - Placement is the engine's.
- Default words for each level, such as "heavy".
  - A level's name is the stylesheet's word and not the reader's.
  - So widths with no name share one "main path" entry.

## Consequences

Changed on 2026-10-15 by the owner: line styles and widths lose their default words too, and "main path" goes with them ("The legend says only what the agent named").
