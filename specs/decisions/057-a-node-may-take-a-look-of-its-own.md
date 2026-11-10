# 057. A node may take a look of its own

Decided: 2026-11-06

## The problem

A node's colors came with its type, and the type also sets its shape. On 2026-10-30 a "fixed" node had to be a cylinder and a "bug" node a dashed node only for their colors.

## The choice

A node takes its colors from itself or from the styles it marks ("Every attribute of a style may be set on the object itself"). The shape stays the type's.

## Not chosen

- More types.
  - A type says what a node is and not how it looks.

## Consequences

A color written as a hex value stays when the stylesheet changes, so `dark` may leave it wrong, while a built-in style of a hue follows the stylesheet ("Built-in styles name colors by hue, and each stylesheet draws them its own way"). A dark fill can hide the theme's dark text, and grafical does not judge that. A third value for the text may follow if pictures show the need.
