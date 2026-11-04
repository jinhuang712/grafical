# 025. Marks of any kind

Decided: 2026-10-13

## The problem

Decided on 2026-10-13 by the owner, who wanted a very important box flagged with `⚠️` at its top-left, and asked that a mark not be limited to a fixed list: "anything. dont constrain it. at the end its a svg/png/textBox or smth". On 2026-10-14, after a plain text over a corner looked ugly, the owner let a text mark's badge be styled, and asked for it to be "sorta adjustable" (behavior: FEATURES.md, "Marks").

## The choice

What keeps marks within the principles:
- A mark has a slot and a size step and never a position or a size in pixels.
  - So where it goes stays the engine's ("Facts over coordinates").
  - A corner mark is centred on its corner and takes no room.
  - So it moves no other box, text or line.
  - The `left` mark takes a column inside the box, and the box keeps its size.
- The same file gives the same picture ("Output and determinism").
  - Emoji are drawn from the bundled Twemoji images, not from a font.
  - The SVG embeds each picture as a data URI, and the file stores a picture file's SHA-256.
  - So a changed file fails the load instead of drawing differently.
  - A named color is stored as its hex, so a change to the names never changes an existing file.
- A picture runs nothing ("Security").
  - An SVG with a script, a `foreignObject`, an event handler or an outside reference is refused.
  - So is a path outside the diagram's folder.

The emoji images come from `@twemoji/svg`: MIT for the package, and CC-BY 4.0 for the graphics, which asks for attribution.

## Not chosen

- A fixed list of icon names.
  - It gives the safest output, but the owner wants any picture.
  - A list can never hold what people flag boxes with.
- Drawing an emoji with a color emoji font.
  - It would depend on the font on each machine.
- A mark with a size or an offset in pixels.
  - Each mark would sit differently.
- Several marks in one slot.
  - The slot would have to grow or its marks shrink, and a corner would then cover more of the box.

## Consequences

A mark file that changes fails the load instead of drawing differently, and a named color is stored as its hex, so renaming a color never changes a file.
