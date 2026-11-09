# The theme

The theme holds every value of the look by role, read from a stylesheet. It also holds the fixed sizes the layout works with and the outline of each kind of node, so that the layout, the checker and the renderer ask one place and agree. It lives in `src/theme/`.

```text
presets/default.grafical ──> dark.grafical, print.grafical (each a base and what it changes)
        │
        ▼
  a stylesheet of the agent's ── checked, then laid over its base ──> the diagram's look
                                                                       ├── type sizes ──> layout
                                                                       └── paint ──────> renderer
fixed sizes and node outlines ──> layout, checker, renderer
```

## Stylesheets

A stylesheet is a `.grafical` file. It opens with one `<stylesheet>` block that holds `format`, an optional `base` and, for a built-in one, `about`. Each block after it sets values of the look: `<type>` blocks for the diagram, the title and other texts, groups, bands, lanes, nodes and each type of node, edges and each type of edge, `<style> emphasis`, and `<weight>` blocks for `thin`, `thick` and any other level. A table in `src/theme/stylesheet.ts` maps each attribute to the value it sets, and nothing else is accepted: an unknown block, an unknown attribute or a wrong value is refused as `bad-stylesheet`.

The built-in stylesheets live in `src/theme/presets/` and ship with the package. `default` says every value and no value of a look is written in the code. `dark` and `print` name `default` as their base and say what differs. A stylesheet of the agent's starts from `default`, or from the built-in one it names, and says only what it changes.

The layout reads its type sizes from the result, so a stylesheet with larger type changes the layout as well as the colors.

## Fixed sizes and outlines

The sizes of nodes by size step, the spacing of each density and the distances the router keeps are constants of the theme, and no stylesheet changes them. The node sizes and the spacing are multiples of 4 px, and the widths of plain nodes, decision diamonds and dots multiples of 8, so that their centres and sides stay on the 4 px grid.

A node's type decides the outline drawn inside its node: how much room its text has, where the text sits, and where an edge that ends at its side meets the outline. A dot or a small diamond has one size, and its label is not drawn.

## Edge weights

An edge's weight is a level or a width from 0.5 to 8 px. `thin` and `thick` are the stylesheet's `<weight> thin` and `<weight> thick`, each with its arrowhead, and any other level is a `<weight>` block a stylesheet may add. A level the stylesheet lacks is refused as `unknown-weight`, once the stylesheet is loaded.

The arrowhead grows with the width, from the thin edge's size to the main path's. An edge thinner than thin keeps the thin arrowhead.

## Decisions

- [016. Themes and stylesheets](decisions/016-themes-and-stylesheets.md)
- [104. A stylesheet is a .grafical file, and the built-in ones form a library](decisions/104-a-stylesheet-is-a-grafical-file-and-the-built-in-ones-form-a-library.md)
- [026. Edge weights](decisions/026-edge-weights.md)
