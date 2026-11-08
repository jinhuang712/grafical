# The theme

The theme holds every value of the look by role, and merges a stylesheet's changes into them. It also holds the fixed sizes the layout works with and the outline of each kind of node, so that the layout, the checker and the renderer ask one place and agree. It lives in `src/theme/`.

```text
built-in theme (default, dark or print)
        │
        ▼
  stylesheet ── checked, then deep-merged ──> the diagram's look
        │                                       ├── type sizes ──> layout
        │                                       └── paint ──────> renderer
fixed sizes and node outlines ──> layout, checker, renderer
```

## Themes and stylesheets

A theme holds the colors of each node type, of groups, bands, edges and text, the edge widths, the corner radii, and the type size and weight of each text role. The built-in themes are `default`, `dark` and `print`.

A stylesheet names a `base` theme, `default` when left out, and overrides any of its values. The override is a deep merge: maps merge key by key, and any other value replaces the theme's. The stylesheet is checked strictly before it merges, and an unknown key or a wrong value is refused as `bad-stylesheet`.

The layout reads its type sizes from the merged theme, so a stylesheet with larger type changes the layout as well as the colors.

## Fixed sizes and outlines

The sizes of nodes by size step, the spacing of each density and the distances the router keeps are constants of the theme, and no stylesheet changes them. The node sizes and the spacing are multiples of 4 px, and the widths of plain nodes, decision diamonds and dots multiples of 8, so that their centres and sides stay on the 4 px grid.

A node's type decides the outline drawn inside its node: how much room its text has, where the text sits, and where an edge that ends at its side meets the outline. A dot or a small diamond has one size, and its label is not drawn.

## Edge weights

An edge's weight is a level or a width from 0.5 to 8 px. `thin` is the theme's edge width, `thick` is its main-path width, and any other level is a key of `paint.edge.weights`, which a stylesheet may add to. A stylesheet cannot name a level `thin` or `thick`. A level the stylesheet lacks is refused as `unknown-weight`, once the stylesheet is loaded.

The arrowhead grows with the width, from the thin edge's size to the main path's. An edge thinner than thin keeps the thin arrowhead.

A saved run may still say `accent`, and the loader reads it as `emphasis`. No operation writes it.

## Decisions

- [016. Themes and stylesheets](decisions/016-themes-and-stylesheets.md)
- [026. Edge weights](decisions/026-edge-weights.md)
