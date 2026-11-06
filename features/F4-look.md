# F4: Look

```
F4: Look
├── F4.1: Title, subtitle and footnote — the words around the picture
├── F4.2: Legend — a key for styles, widths and marks
│   └── F4.2.1: A legend as a small diagram — entries, their layout and their samples
├── F4.3: Themes and stylesheets — the whole look from one name
├── F4.4: The stylesheet file — colors, widths and type sizes
├── F4.5: Brand fonts — a team's own typeface
├── F4.6: Label text — breaks and alignment
├── F4.7: Region labels — where any region's label sits
└── F4.8: Label looks — a label's background, border and color
```

The words and the look of the picture as a whole: its title, its legend, and its theme or stylesheet.

## F4.1: Title, subtitle and footnote

The title names the picture, and two more texts tell a reader what they see.

**Commands:**

- `grafical -f <file> diagram --label-at --text <text>`
- `grafical -f <file> diagram --subtitle [--text <text>]`
- `grafical -f <file> diagram --note [--text <text>]`

- The subtitle is one sentence under the title.
- The footnote says what the diagram leaves out, such as "Not shown: Redis name cache".
- Without `--text` the subtitle or the footnote is cleared.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **How it works:** [Placement: rows down the page](../specs/placement.md#rows-down-the-page)

**Stories:**

- An agent sets the title and says what the picture leaves out, to tell a reader what they see.

## F4.2: Legend

A key in the top right that says, in the agent's words, what the picture's styles, widths and marks mean.

```sh
grafical -f <file> diagram --legend solid|dashed|dotted|plain|--weight <weight>|--mark <mark> [--text <text>]
```

- An edge style or an edge width other than `thin` or a mark has an entry only when the diagram names it.
  - A diagram that names nothing draws no legend.
- Without `--text`, the words are taken away with their entry.
- `show --drawn` prints a `legend` record for each edge style and width the picture draws, and for each named mark.
  - `weight` is what `--weight` takes, and `text=-` marks a style or width with no entry.
- Marks with the same name share one entry.
- When the legend is wider than its room, it wraps onto more lines.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **How it works:** [Text placement: the legend](../specs/labels.md#the-legend)
- **Why:**
  - [028. A legend for widths and marks](../specs/decisions/028-a-legend-for-widths-and-marks.md)
  - [034. The legend says only what the agent named](../specs/decisions/034-the-legend-says-only-what-the-agent-named.md)

**Stories:**

- An agent explains a style or a mark in its own words, to let a reader decode the picture.

### F4.2.1: A legend as a small diagram

A legend is a small diagram of its own, and a picture may have one or none. Its design is open: how its entries run, across or down or in a grid, what goes in it and how each sample is drawn.

**Stories:**

- An agent lays out a key to the colors of its nodes, to let a reader decode them.

## F4.3: Themes and stylesheets

A diagram takes its whole look from a built-in theme or from a stylesheet file it names.

```sh
grafical -f <file> diagram --style [<style>]
```

- The built-in themes are `default`, `dark` (light lines on a dark ground) and `print` (greys with stronger lines).
- A stylesheet `<name>.grafical-style.yaml` starts from a theme and overrides any of its values.
  - Changing it changes every diagram that names it.
- Without a style, the default theme applies.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
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
  - [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **How it works:**
  - [The theme: themes and stylesheets](../specs/theme.md#themes-and-stylesheets)
  - [The .grafical file](../specs/grafical-file.md)
- **Why:** [016. Themes and stylesheets](../specs/decisions/016-themes-and-stylesheets.md)

**Stories:**

- An engineer writes a stylesheet, to set the look of many diagrams at once.

## F4.5: Brand fonts

A team's own typeface in the picture.

- **Design:**
  - [9. The same file gives the same picture on any machine](../DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
  - [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)

**Stories:**

- A team draws in its own typeface, to put its brand on the pictures.

## F4.6: Label text

An agent may set where a text breaks and how its lines line up. A text the agent leaves alone wraps where grafical wraps it and keeps the alignment of its kind.

```sh
grafical -f <file> label --align <id> left|center|right
grafical -f <file> note --align <on> left|center|right
```

- The label of a node, an edge or a lane may hold a line break, and so may a sublabel, a note and a subtitle.
- A break is a real line break or `\n`, and grafical keeps it.
- A diagram's title and the label of a group, a row or a wall are one line, and a break in one is refused as `missing-glyph`.
- `label --align` takes the ID of a node, an edge, a wall or a lane.
- In a node, left and right mean the sides of the room for its text, and its sublabel follows its label.
- On an edge, it lines up the lines of a label of two or more lines.
- `note --align` names a note by what it is about, since a note has no ID of its own.
- A note starts left aligned, and a footnote cannot be aligned.
- A label that no longer fits is refused as before.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **Why:** [067. An agent sets a label's breaks and its alignment](../specs/decisions/067-an-agent-sets-a-label-s-breaks-and-its-alignment.md)

**Stories:**

- An agent breaks a label by its sense, to keep two words together.
- An agent aligns the text of a note left, to make a list read well.

## F4.7: Region labels

A diagram, a group, a layer, a lane and a column are all regions, and each places its label the same way.

```sh
grafical -f <file> group --label-at <id> <fraction> [--side top|bottom|left|right] [--place inside|outside]
```

- A fraction runs from 0 to 1 along the side: 0 at its start, 0.5 at its middle and 1 at its end.
- The label's own point at that fraction meets the side's, so it never runs past the side.
- A subtitle or a sublabel follows its label.
- A label that would overlap anything is refused.
- A region that states nothing keeps the place it has today.
- The side is `top` and the place `inside` unless the agent states them.
- A group's label takes these today, and the title and the labels of a layer, a lane and a column are not built.

- **Why:** [084. A region's label sits at a fraction of a side](../specs/decisions/084-a-region-s-label-sits-at-a-fraction-of-a-side.md)

**Stories:**

- An agent centres a title, to match the look of the page it sits on.
- An agent moves a group's label along its side, to clear an edge.

## F4.8: Label looks

A label may mark styles, as any object does.

```sh
grafical -f <file> label --style <id> [--style <name>]...
```

- `--style` takes the ID of any element with a label, and names styles as other objects do.
- The label's patch takes the style's `fill` and `border`.
- The label's text takes the style's `color`.
- Without `--style`, the label marks no style and its patch takes the color behind it.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **Why:** [091. A label may mark a style](../specs/decisions/091-a-label-may-mark-a-style.md)

**Stories:**

- An agent gives a label a background, to make one line's meaning stand out.
