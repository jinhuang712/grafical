# 016. Themes and stylesheets

Decided: 2026-10-11

- Replaced in part by specs/decisions, "Marks of any kind": a mark takes its own colors.
- Replaced in part by specs/decisions, "Edge weights": a line takes its own width.

## The problem

A look must be shared by many diagrams and changed in one place, without a diagram setting colors box by box.

## The choice

A theme sets every value of the look: the colors of each box kind, of groups, bands, lines and text, line widths, corner radii, and type sizes and weights. A stylesheet file starts from a built-in theme and overrides any of its values, and a diagram names its theme or stylesheet in its file. Changing a stylesheet changes every diagram that names it, which is how a team keeps one look. An operation sets it, so that an agent can apply the look a person asks for in plain words.

Layout reads the same values, so a theme with larger type changes the layout as well as the colors. "The same file is the same picture" still holds, read as: the same diagram file and the same stylesheet give the same picture. Both live in git. Whether a line is solid or dashed follows its kind, so a stylesheet can change the dash pattern of messages but cannot dash a call.

## Not chosen

- Colors or styles on one node or edge.
  - A model would have to choose them, and the look would drift.
  - Reversed in part: a mark takes its own colors ("Marks of any kind") and a line its own width ("Edge weights"), and on 2026-10-14 the owner settled that looks may take any value.
- A stylesheet found by folder, without the diagram naming it.
  - The diagram file would no longer say what decides its picture.
- CSS.
  - A stylesheet holds named values and no selectors, so that every value has one meaning and the engine can check it.

## Consequences

A theme with larger type changes the layout as well as the colors. A stylesheet may change the dash of messages but cannot dash a call.
