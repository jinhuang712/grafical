# 080. A node's width and height may be magnified

Decided: 2026-11-06

## The problem

A node came in three sizes, and a strong model tuning a picture could not widen one node a little. A node has a shape, so one multiple does not mean the same for every type.

## The choice

A node may take a multiple of its width, of its height, or of both at once. The multiple applies to the size the node would otherwise have. A type with a fixed size refuses it.

## Not chosen

- Keeping three sizes alone.
  - The owner wants the means to tune one node.
- A size in pixels.
  - A multiple keeps to the sizes the theme sets ("Facts over coordinates").
- Width only.
  - The owner wants all three, and a layer's height already follows its tallest node.

## Consequences

Every node of a layer is as tall as the tallest, so a taller node makes its whole layer taller. Each shape needs a rule for what a multiple does to it, such as how a cylinder's top or a diamond's corners follow, and those are chosen when it is built. Sizes round to the 4 px grid.
