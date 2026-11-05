# F4: Look

```
F4: Look
├── F4.1: Title, subtitle and footnote — the words around the picture
├── F4.2: Legend — a key for styles, widths and marks
├── F4.3: Themes and stylesheets — the whole look from one name
├── F4.4: The stylesheet file — colors, widths and type sizes
└── F4.5: Brand fonts — a team's own typeface
```

The words and the look of the picture as a whole: its title, its legend, and its theme or stylesheet.

## F4.1: Title, subtitle and footnote

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

## F4.2: Legend

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

## F4.3: Themes and stylesheets

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

## F4.4: The stylesheet file

A stylesheet, `<name>.grafical-style.yaml`, starts from a built-in theme and overrides any of its colors, line widths, corner radii and type sizes.

- Every value not given comes from the theme it starts from.
- Larger type changes the layout, and text that no longer fits is refused as `overflow`.
- An unknown key, a malformed colour or a weight the fonts lack is refused with the path of the value.
- A missing stylesheet fails every command that reads the diagram with `style-not-found`, and a wrong one with `bad-stylesheet`.

- **Design:**
  - [10. What grafical cannot fully read, it refuses](../DESIGNS.md#10-what-grafical-cannot-fully-read-it-refuses)
  - [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:**
  - [The theme: themes and stylesheets](../specs/theme.md#themes-and-stylesheets)
  - [The file formats](../specs/file-formats.md#the-stylesheet)
- **Why:** [016. Themes and stylesheets](../specs/decisions/016-themes-and-stylesheets.md)

**Stories:**

- An engineer writes a stylesheet, to set the look of many diagrams at once.

## F4.5: Brand fonts

A team's own typeface in the picture.

**Stories:**

- A team draws in its own typeface, to put its brand on the pictures.
