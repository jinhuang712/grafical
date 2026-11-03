# The theme

The theme holds every value of the look by role, and merges a stylesheet's changes into them. It also holds the fixed sizes the layout works with and the outline of each kind of box, so that the layout, the checker and the renderer ask one place and agree. It lives in `src/theme/`.

```text
built-in theme (default, dark or print)
        │
        ▼
  stylesheet ── checked, then deep-merged ──> the diagram's look
        │                                       ├── type sizes ──> layout
        │                                       └── paint ──────> renderer
fixed sizes and box outlines ──> layout, checker, renderer
```

## Themes and stylesheets

A theme holds the colors of each box kind, of groups, bands, lines and text, the line widths, the corner radii, and the type size and weight of each text role. The built-in themes are `default`, `dark` and `print`.

A stylesheet names a `base` theme, `default` when left out, and overrides any of its values. The override is a deep merge: maps merge key by key, and any other value replaces the theme's. The stylesheet is checked strictly before it merges, and an unknown key or a wrong value is refused as `bad-stylesheet`.

The layout reads its type sizes from the merged theme, so a stylesheet with larger type changes the layout as well as the colors.

## Fixed sizes and outlines

The sizes of boxes by size step, the spacing of each density and the distances the router keeps are constants of the theme, and no stylesheet changes them. The box sizes and the spacing are multiples of 4 px, and the widths of plain boxes, decision diamonds and dots multiples of 8, so that their centres and sides stay on the 4 px grid.

A box's kind decides the outline drawn inside its box: how much room its text has, where the text sits, and where a line that ends at its side meets the outline. A dot or a small diamond has one size, and its label is not drawn.

## Line weights

A line's weight is a level or a width from 0.5 to 8 px. `thin` is the theme's line width, `thick` is its main-path width, and any other level is a key of `paint.edge.weights`, which a stylesheet may add to. A stylesheet cannot name a level `thin` or `thick`. A level the stylesheet lacks is refused as `unknown-weight`, once the stylesheet is loaded.

The arrowhead grows with the width, from the thin line's size to the main path's. A line thinner than thin keeps the thin arrowhead.

`accent: true` on a line means `weight: thick`. When a line has both, `weight` wins. The operations keep only one: setting the accent clears the weight, and setting a weight clears the accent.
