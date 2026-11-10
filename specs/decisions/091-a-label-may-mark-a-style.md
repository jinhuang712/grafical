# 091. A label may mark a style

Decided: 2026-11-06

## The problem

A label on an edge breaks the edge with a patch, and the patch always takes the color behind it, so an agent cannot make a label stand out. The owner holds that a label may have a background color.

## The choice

A `<label>` may mark styles as any object does. Its patch takes the style's `fill` and `border`, and its text takes the style's `color`. A label that marks no style looks as it does today.

## Not chosen

- A color set on the label itself.
  - Colors go through a style or a type, and objects take no direct color yet.
- A background on every label, set by the theme.
  - A patch that shows on every label is a look only some pictures want.

## Consequences

Built on 2026-11-06 for an edge's label, the one label with a patch of its own, and stated today as `label --set --style`.

A label with a fill reads as a small tag, which may also suit a short run where an edge shows little past its label. That is not tried yet. A label beside its edge gains a patch that shows, so its clearance may need a look when it is built.
