# 110. Built-in styles name colors by hue, and each stylesheet draws them its own way

Decided: 2026-11-10

## The problem

A simple diagram should need no setting, and its common changes should come ready-made. Spacing, sizes, weights and shapes had presets, and color had only `emphasis`. An agent that marked a status made up a hex value, and that value stayed when the stylesheet changed, so `dark` could leave it wrong.

## The choice

- Every built-in stylesheet holds six styles named by hue: `red` · `amber` · `green` · `blue` · `purple` · `gray`.
  - They are the names a mark's colors take.
  - Each stylesheet draws them in colors that read on its own ground.
- A node, a group, a lane, an edge and a label may mark them as any other style.
- Their values are chosen when they are built and shown to the owner in a picture.

## Not chosen

- Names by meaning, such as `good` · `warn` · `bad`.
  - grafical would decide what a color means, and that is the agent's to say in the legend.
- No color presets.
  - An agent would make up a hex value for every status.
- `dark` as a seventh style.
  - It is the name of a stylesheet, so `--style dark` and `--stylesheet dark` would read alike.

## Consequences

A color named by hue follows the stylesheet, and a hex value stays as written. Until the legend can name a color, a reader may have to guess what a hue means.
