# F4: Look

```
F4: Look
├── F4.1: Title, subtitle and caption — the words around the picture
├── F4.2: Legend — a key for styles, widths and marks
│   └── F4.2.1: A legend as a small diagram — entries, their layout and their samples
├── F4.3: Built-in stylesheets — the whole look from one name
├── F4.4: A stylesheet of your own — colors, widths and type sizes
├── F4.5: Brand fonts — a team's own typeface
├── F4.6: Label text — breaks and alignment
├── F4.7: Region labels — where any region's label sits
└── F4.8: Label looks — a label's background, border and color
```

The words and the look of the picture as a whole: its title, its legend and its stylesheet.

## F4.1: Title, subtitle and caption

The title names the picture, and two more texts tell a reader what they see.

- **Commands:** [`diagram`](../CLI.md#diagram)

- The subtitle is one sentence under the title.
- The caption says what the diagram leaves out, such as "Not shown: Redis name cache".
- `--subtitle -` or `--caption -` clears it.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **How it works:** [Placement: layers down the page](../specs/placement.md#layers-down-the-page)

**Stories:**

- An agent sets the title and says what the picture leaves out, to tell a reader what they see.

## F4.2: Legend

A key in the top right that says, in the agent's words, what the picture's line styles, widths and marks mean.

- **Commands:** [`legend`](../CLI.md#legend)

- A line style or an edge width other than `thin` or a mark has an entry only when the diagram names it.
  - An entry is named `style:<line>` · `weight:<level>` · `mark:<text>`.
  - A diagram that names nothing draws no legend.
- `legend --remove` takes an entry away.
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

## F4.3: Built-in stylesheets

A diagram takes its whole look from a stylesheet. grafical ships three, and a diagram that names none takes `default`.

- **Commands:**
  - [`diagram`](../CLI.md#diagram)
  - [`library`](../CLI.md#library)

- `default` draws grey lines and quiet fills on white.
- `dark` draws light lines on a dark ground.
- `print` draws greys with stronger edges, for paper.
- `diagram --set --stylesheet <name>` names one.
- `grafical library` lists them, and `grafical library <word>` finds those whose name or look holds the word.
- They come with grafical wherever it is installed.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **How it works:** [The theme: stylesheets](../specs/theme.md#stylesheets)
- **Why:**
  - [016. Themes and stylesheets](../specs/decisions/016-themes-and-stylesheets.md)
  - [104. A stylesheet is a .grafical file, and the built-in ones form a library](../specs/decisions/104-a-stylesheet-is-a-grafical-file-and-the-built-in-ones-form-a-library.md)

**Stories:**

- An agent picks a built-in stylesheet, to give a diagram the look the user asks for in one word.

## F4.4: A stylesheet of your own

A stylesheet of one's own is a `.grafical` file that starts from a built-in one and says only what it changes: the colors of any type of node or edge, the frames, the texts, the type sizes and the edge widths. A diagram names it by its path, which may lie anywhere.

- **Commands:**
  - [`diagram`](../CLI.md#diagram)
  - [`library`](../CLI.md#library)

- It opens with a `<stylesheet>` block, and `base` names the built-in one it starts from, `default` when left out.
- `<type>` blocks set the look of the diagram, its texts, groups, bands, lanes, nodes and edges, and of each type of node and edge.
  - `<type> diagram` also holds the diagram's margins · `row-gap` · `column-gap`.
- `<style> emphasis` sets how the nodes that stand out look.
- A `<style>` of its own is a look a diagram may mark, and it comes before the diagram's own styles.
- `<weight>` blocks set `thin` and `thick` and add levels such as `critical`.
- Larger type changes the layout, and text that no longer fits is refused as `overflow`.
- An unknown block, an unknown attribute or a wrong value is refused as `bad-stylesheet` with its line.
- Only a dashed type of edge takes a dash.
- A stylesheet that is missing fails every command that reads the diagram with `style-not-found`.
- `library --help` lists every block and attribute with an example.

- **Design:**
  - [10. What grafical cannot fully read, it refuses](../DESIGNS.md#10-what-grafical-cannot-fully-read-it-refuses)
  - [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **How it works:**
  - [The theme: stylesheets](../specs/theme.md#stylesheets)
  - [The .grafical file](../specs/grafical-file.md)
- **Why:** [104. A stylesheet is a .grafical file, and the built-in ones form a library](../specs/decisions/104-a-stylesheet-is-a-grafical-file-and-the-built-in-ones-form-a-library.md)

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

- **Commands:**
  - [`label`](../CLI.md#label)
  - [`note`](../CLI.md#note)

- These may hold a line break: the label of a node · an edge · a lane · a sublabel · a note · a subtitle.
- A break is a real line break or `\n`, and grafical keeps it.
- These are one line: a diagram's title · the label of a group · a layer · a wall.
  - A break in one is refused as `missing-glyph`.
- `label --set --align` takes the ID of one of these: a node · an edge · a wall · a lane.
- In a node left and right mean the sides of the room for its text, and its sublabel follows its label.
- On an edge, it lines up the lines of a label of two or more lines.
- `note --set --align` names a note by what it is about, since a note has no ID of its own.
- A note starts left aligned, and a footnote cannot be aligned.
- A label that no longer fits is refused as before.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **Why:** [067. An agent sets a label's breaks and its alignment](../specs/decisions/067-an-agent-sets-a-label-s-breaks-and-its-alignment.md)

**Stories:**

- An agent breaks a label by its sense, to keep two words together.
- An agent aligns the text of a note left, to make a list read well.

## F4.7: Region labels

A diagram, a group, a layer, a lane and a column are all regions, and each places its label the same way.

- **Commands:**
  - [`label`](../CLI.md#label)
  - [`diagram`](../CLI.md#diagram)

- `label --set` places the label of a group · a layer · a lane, and `diagram --set --title-at` places the title.
- A fraction runs from 0 to 1 along the side: 0 at its start, 0.5 at its middle and 1 at its end.
- The label's own point at that fraction meets the side's, so it never runs past the side.
- A subtitle or a sublabel follows its label.
- A label that would overlap anything is refused.
- A region that states nothing keeps the place it has today.
- The side is `top` and the place `inside` unless the agent states them.
- A title stops short of the legend, and at `bottom` it sits below the footnote.
- A layer's and a lane's label run along their head, so they take a fraction and no side.
- A bar's label with an edge through its place is refused as `label-blocked`.
- A column has no label until [F2.4.1: Column headings](F2-layout.md#f241-column-headings).
- Without a fraction, the engine seats a label as it did.

- **Why:** [084. A region's label sits at a fraction of a side](../specs/decisions/084-a-region-s-label-sits-at-a-fraction-of-a-side.md)

**Stories:**

- An agent centres a title, to match the look of the page it sits on.
- An agent moves a group's label along its side, to clear an edge.

## F4.8: Label looks

A label may mark styles, as any object does.

- **Commands:** [`label`](../CLI.md#label)

- `label --set --style` takes the ID of an edge with a label, and names styles as other objects do.
- Only an edge's label has a patch of its own, and any other label takes the style of its object.
- The label's patch takes the style's `fill` and `border`.
- The label's text takes the style's `color`.
- Without `--style`, the label marks no style and its patch takes the color behind it.

- **Design:** [11. Looks are free, while shape and dash follow the type](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-type)
- **Why:** [091. A label may mark a style](../specs/decisions/091-a-label-may-mark-a-style.md)

**Stories:**

- An agent gives a label a background, to make one edge's meaning stand out.
