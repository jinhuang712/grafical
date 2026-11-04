# F8: Files

```
F8: Files
├── F8.1: The diagram file — one YAML file of facts
└── F8.2: The stylesheet file — colors, widths and type sizes
```

A diagram is one YAML file of facts, and a look many diagrams share is one stylesheet file. Both live in git beside the code.

## F8.1: The diagram file

One YAML file, `<name>.grafical.yaml`, holds the whole diagram as facts: rows · boxes in order · groups · lanes · columns · walls · notes · lines. The picture on the front page of the README is drawn from [docs/images/pipeline.grafical.yaml](../docs/images/pipeline.grafical.yaml).

- grafical writes it in a fixed key order, so the same facts give the same bytes and a change reads as a small diff in git.
- It holds no coordinate.
  - A field that holds its default is left out.
- A file of a newer format or with a field grafical does not know is refused, never half read.

- **Design:**
  - [10. What grafical cannot fully read, it refuses](../DESIGNS.md#10-what-grafical-cannot-fully-read-it-refuses)
  - [9. The same file gives the same picture on any machine](../DESIGNS.md#9-the-same-file-gives-the-same-picture-on-any-machine)
- **How it works:**
  - [The model](../specs/model.md)
  - [The file formats](../specs/file-formats.md#the-diagram-file)
- **Why:**
  - [001. Operations over whole-file rewrites](../specs/decisions/001-operations-over-whole-file-rewrites.md)
  - [009. Git as the history](../specs/decisions/009-git-as-the-history.md)
  - [024. Same file exact, same facts mostly](../specs/decisions/024-same-file-exact-same-facts-mostly.md)

**Stories:**

- An engineer keeps one YAML file in git, to review and reproduce the picture.

## F8.2: The stylesheet file

A stylesheet, `<name>.grafical-style.yaml`, starts from a built-in theme and overrides any of its colors, line widths, corner radii and type sizes.

- Every value not given comes from the theme it starts from.
- Larger type changes the layout, and text that no longer fits is refused as `overflow`.
- An unknown key, a malformed colour or a weight the fonts lack is refused with the path of the value.
- A missing stylesheet fails every command that reads the diagram with `style-not-found`, and a wrong one with `bad-stylesheet`.

- **Design:**
  - [11. Looks are free, while shape and dash follow the kind](../DESIGNS.md#11-looks-are-free-while-shape-and-dash-follow-the-kind)
  - [10. What grafical cannot fully read, it refuses](../DESIGNS.md#10-what-grafical-cannot-fully-read-it-refuses)
- **How it works:**
  - [The theme: themes and stylesheets](../specs/theme.md#themes-and-stylesheets)
  - [The file formats](../specs/file-formats.md#the-stylesheet)
- **Why:** [016. Themes and stylesheets](../specs/decisions/016-themes-and-stylesheets.md)

**Stories:**

- An engineer writes a stylesheet, to set the look of many diagrams at once.
