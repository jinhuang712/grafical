# F2: Boxes

```
F2: Boxes
├── F2.1: Kinds and shapes — a box's kind sets its shape
├── F2.2: Labels and sublabels — a label and a quieter sublabel
├── F2.3: Sizes — sized to the text, or by a step
├── F2.4: Marks — up to five small marks on a box
├── F2.5: Marks by name — a mark from one bundled icon set
├── F2.6: Emphasis — at most two boxes stand out
└── F2.7: Merging and swapping — merge, swap and remove boxes
```

A box is a part of the system: a service, a store, a queue, a person or a step. The agent says what kind it is and what it is called, and grafical gives it its shape and its size. The agent can mark a box, make it stand out, merge boxes, swap two or remove one.

## F2.1: Kinds and shapes

A box's kind says what it is and decides how it is drawn.

| Kind | Drawn as |
|---|---|
| `service` | a box |
| `store` | a cylinder |
| `queue` | a box in its own tint |
| `external` | a box with a dashed border |
| `actor` | a pill |
| `state` | a box with rounder corners |
| `terminal` | a tinted pill, a flowchart's start or end |
| `decision` | a diamond, its text in the middle |
| `initial` · `final` | a filled dot · a ringed dot |
| `choice` | a small diamond with no text |

- `initial` and `final` are a state machine's start and end.
- `choice` is where a line splits into several, and the question goes on the line into it.
- The labels of `initial` · `final` · `choice` stay in the file and are not drawn.

```sh
grafical node kind <file> <id> <kind>
```

- **Design:** [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:**
  - [The theme: fixed sizes and outlines](../specs/theme.md#fixed-sizes-and-outlines)
  - [Placement: sizes](../specs/placement.md#sizes)
- **Why:**
  - [020. Every layered diagram type](../specs/decisions/020-every-layered-diagram-type.md)
  - [052. A choice is a small diamond](../specs/decisions/052-a-choice-is-a-small-diamond.md)

**Stories:**

- An agent says what a box is, to get the shape a reader expects.

## F2.2: Labels and sublabels

A box has a label, and optionally a quieter sublabel, such as a port or a topic.

```sh
grafical node rename <file> <id> --label <text>
grafical node describe <file> <id> [--text <text>]
```

- Labels wrap at spaces · hyphens · underscores · slashes.
  - Chinese text also wraps between characters.
- A label that still does not fit its box is refused as `overflow`, with the lines it takes and the most it may.
- A character the bundled fonts cannot draw is refused as `missing-glyph`.
- `describe` without `--text` clears the sublabel.

- **Design:** [9. The same file gives the same picture on any machine](../DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
- **How it works:** [The text measurer](../specs/text.md)
- **Why:**
  - [006. Bundled fonts](../specs/decisions/006-bundled-fonts.md)
  - [014. Boxes sized to their text](../specs/decisions/014-boxes-sized-to-their-text.md)

**Stories:**

- An agent names a box and adds a port or a topic, to say more without another box.

## F2.3: Sizes

A box is sized to its text, unless the agent gives it a size step.

```sh
grafical node resize <file> <id> [--size s|m|l]
grafical diagram sizing <file> auto|fixed
```

- A box without a size is medium, or large when its text does not fit the medium box.
  - A rename that shortens the label shrinks it again.
- `resize` without `--size` returns the box to that.
- Every box in a row is drawn as tall as the row's tallest, so their tops line up.
  - Dots and diamonds keep their shapes.
- `sizing: fixed` turns this off: a box without a size is always medium, and text that does not fit is refused.

- **Design:** [2. Places are facts, never coordinates](../DESIGNS.md#2-places-are-facts-never-coordinates)
- **How it works:** [Placement: sizes](../specs/placement.md#sizes)
- **Why:** [014. Boxes sized to their text](../specs/decisions/014-boxes-sized-to-their-text.md)

**Stories:**

- An agent leaves sizes to grafical or picks a step, to keep text inside its box.

## F2.4: Marks

A box can carry up to five marks, such as `⚠️` on a box that matters, or `P0` on a badge.

```sh
grafical node icon <file> <id> --slot <slot> [--icon <mark>] [--bg <color>] [--fg <color>] [--border <color>] [--shape <shape>] [--size s|m|l]
```

- A box has five slots of one mark each: `top-left` · `top-right` · `bottom-left` · `bottom-right` · `left`.
  - A diamond and a dot have corner slots only.
  - Without `--icon`, the slot is cleared.
- A mark is an emoji or a text of up to 6 characters or an SVG or PNG file inside the diagram's folder.
- A text mark sits on a badge.
  - `--bg` and `--fg` and `--border` take a color as `#rrggbb` or by name: `red` · `amber` · `green` · `blue` · `purple` · `gray` · `dark`.
  - `--shape` is `square`, `rounded` (the default) or `pill`.
  - Without `--fg`, grafical picks the light or dark text that reads better.
- `--size` is `s` or `m` or `l` for any mark: 16 · 20 · 28 px high.
  - `m` is the default.
- A corner mark sits centred on its corner and moves nothing else.
  - The `left` mark takes a column inside the box, and the text gives up that width.
- A mark file that changes or goes missing fails the load (`mark-file-changed`, `mark-file-not-found`).
  - Setting the slot again accepts the file as it is.
  - An SVG with a script or an event handler or an outside reference is refused as `mark-file-unsafe`.
  - A path outside the diagram's folder is refused as `mark-file-outside`.
- An emoji with no image is refused as `mark-not-drawn`.
  - A mark that covers text or another box is a defect, `mark-covers`.

A corner mark is not yet checked against the lines that leave the box near its corner.

- **Design:**
  - [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
  - [14. A diagram reads no file outside its folder, and its pictures run nothing](../DESIGNS.md#14-a-diagram-reads-no-file-outside-its-folder-and-its-pictures-run-nothing)
- **How it works:** [The renderer: marks](../specs/rendering.md#marks)
- **Why:** [025. Marks of any kind](../specs/decisions/025-marks-of-any-kind.md)

**Stories:**

- An agent marks a box that matters, to draw the reader's eye to it.

## F2.5: Marks by name

A mark taken by name from one icon set that grafical bundles, so that an agent need not find a file for every box.

```sh
grafical node icon <file> <id> --slot <slot> --icon <set>:<name>
```

- The set is a permissively licensed one, such as Lucide (ISC) or Tabler (MIT).
  - A cloud vendor's own icons stay files the agent brings.
- An unknown name is refused, with `near` and `likely`.

- **Design:**
  - [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
  - [15. Every dependency allows use in an MIT project](../DESIGNS.md#15-every-dependency-allows-use-in-an-mit-project)
- **How it works:** [The renderer: marks](../specs/rendering.md#marks)
- **Why:** [025. Marks of any kind](../specs/decisions/025-marks-of-any-kind.md)

**Stories:**

- An agent names an icon, to avoid finding a file for every box.

## F2.6: Emphasis

At most two boxes stand out, as what a reader should see first.

```sh
grafical node emphasize <file> <id> [--off]
```

- **Design:** [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
- **How it works:** [The theme](../specs/theme.md)

**Stories:**

- An agent picks the one or two boxes to read first, to give the picture a start.

## F2.7: Merging and swapping

**Commands:**

- `grafical node merge <file> <new-id> --nodes a,b,c --label <text> [--sublabel <text>] [--kind <kind>]`
- `grafical node swap <file> <a> <b>`
- `grafical node remove <file> <id>`

- `merge` replaces boxes with one new box where the first one was.
  - It keeps each of their lines once and drops the lines between them.
  - It may reuse a merged box's ID.
  - Boxes aligned to a merged box lose the alignment.
- `swap` trades the places of two boxes: their row and slot.
- `remove` takes the box's lines with it and reports their IDs.
  - A box that others are placed by steps from stays while they are (`step-anchor`).

- **Design:**
  - [1. Operations are the only way a diagram changes](../DESIGNS.md#1-operations-are-the-only-way-a-diagram-changes)
  - [3. The engine never chooses for the agent](../DESIGNS.md#3-the-engine-never-chooses-for-the-agent)
- **How it works:** [The model](../specs/model.md)
- **Why:** [013. Curation stays with the agent](../specs/decisions/013-curation-stays-with-the-agent.md)

**Stories:**

- An agent merges boxes or swaps two, to change the picture without redrawing it.
