# F6: The whole picture

```
F6: The whole picture
├── F6.1: Title, subtitle and footnote — the words around the picture
├── F6.2: Legend — a key for styles, widths and marks
├── F6.3: Spacing — compact, normal or airy
└── F6.4: Themes and stylesheets — the whole look from one name
```

The words and the look of the picture as a whole: its title, its legend, how much air it has and its theme or stylesheet.

## F6.1: Title, subtitle and footnote

**Commands:**

- `grafical diagram title <file> --text <text>`
- `grafical diagram subtitle <file> [--text <text>]`
- `grafical diagram note <file> [--text <text>]`

The title names the picture, and two more texts tell a reader what they see.

- The subtitle is one sentence under the title.
- The footnote says what the diagram leaves out, such as "Not shown: Redis name cache".
- Without `--text` the subtitle or the footnote is cleared.

- **Design:** [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Placement: rows down the page](../specs/placement.md#rows-down-the-page)

**Stories:**

- An agent sets the title and says what the picture leaves out, to tell a reader what they see.

## F6.2: Legend

A key in the top right that says, in the agent's words, what the picture's styles, widths and marks mean.

```sh
grafical diagram legend <file> solid|dashed|dotted|plain|--weight <weight>|--mark <mark> [--text <text>]
```

- A line style or a line width other than `thin` or a mark has an entry only when the diagram names it.
  - A diagram that names nothing draws no legend.
- Without `--text`, the words are taken away with their entry.
- `show --drawn` prints a `legend` record for each line style and width the picture draws, and for each named mark.
  - `weight` is what `--weight` takes, and `text=-` marks a style or width with no entry.
- Marks with the same name share one entry.
- When the legend is wider than its room, it wraps onto more lines.

- **Design:** [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [Text placement: the legend](../specs/labels.md#the-legend)
- **Why:**
  - [028. A legend for widths and marks](../specs/decisions/028-a-legend-for-widths-and-marks.md)
  - [034. The legend says only what the agent named](../specs/decisions/034-the-legend-says-only-what-the-agent-named.md)

**Stories:**

- An agent explains a style or a mark in its own words, to let a reader decode the picture.

## F6.3: Spacing

```sh
grafical diagram density <file> compact|normal|airy
```

- **Design:** [4. A change moves only what it names](../DESIGNS.md#4-a-change-moves-only-what-it-names)
- **How it works:** [Placement: rows down the page](../specs/placement.md#rows-down-the-page)
- **Why:** [004. Layout computed again on every change](../specs/decisions/004-layout-computed-again-on-every-change.md)

**Stories:**

- An agent picks a density, to trade size for air.

## F6.4: Themes and stylesheets

A diagram takes its whole look from a built-in theme or from a stylesheet file it names.

```sh
grafical diagram style <file> [<style>]
```

- The built-in themes are `default`, `dark` (light lines on a dark ground) and `print` (greys with stronger lines).
- A stylesheet `<name>.grafical-style.yaml` starts from a theme and overrides any of its values.
  - Changing it changes every diagram that names it.
- Without a style, the default theme applies.

- **Design:** [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [The theme: themes and stylesheets](../specs/theme.md#themes-and-stylesheets)
- **Why:** [016. Themes and stylesheets](../specs/decisions/016-themes-and-stylesheets.md)

**Stories:**

- An agent picks a theme or a stylesheet, to restyle every diagram that names it.
