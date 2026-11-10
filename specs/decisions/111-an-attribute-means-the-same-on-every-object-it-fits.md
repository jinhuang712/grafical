# 111. An attribute means the same on every object it fits

Decided: 2026-11-10

## The problem

Once every attribute of a style could be set on the object itself, each object had to say which ones it takes. A style drew only some of them on some objects: a node's `color` was not drawn, a lane drew no border of its own, and a lane's or a column's margins went to their layers or nodes while a group's gave room outside its frame. An agent would have had to learn each object's exceptions.

## The choice

- `fill` · `border` · `border-width` are the inside and the outline of a node, a group, a lane and an edge's label.
- `color` is the object's ink: the text of a node, of a group's title, of a lane's label and of an edge's label, and an edge's line.
  - A node's sublabel and a group's sublabel follow it, so light text reads on a dark fill.
- A margin is room outside the object's own box on that side, added to what separates it from its neighbour there.
  - Every node and region takes all four sides.
  - The side of the canvas is a neighbour, and so is the header of lanes that run as layers.
  - No margin reaches what lies inside its object.
- `row-gap` and `column-gap` belong to the diagram.
- A value set on the object and the same value from a style draw the same picture.

## Not chosen

- Only what a style happened to draw.
  - Each object would carry exceptions an agent has to learn.
- A region's margins that reach its members, as a lane's and a column's did.
  - One attribute would mean two things.
- Only the sides where a region has an edge of its own, without a layer's left and right or a column's top and bottom.
  - Those sides would be exceptions of their own.
- A sublabel that keeps its type's grey.
  - It cannot be read on a dark fill.

## Consequences

The columns are shared by every layer, so a layer's left margin moves its first column in every layer, as a node's margin widens its column, and one layer cannot be indented alone until a node may sit off its cell. At the canvas side a margin is room beyond the diagram's own, and content already further in has that room already.
