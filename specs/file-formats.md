# The file formats

grafical reads and writes two kinds of file: a diagram file, which holds the facts of one diagram, and a stylesheet, which holds a look that many diagrams can share. Both are YAML, both start with their format version, and both are written in a fixed key order, so that the same facts always give the same bytes and a change reads as a small diff. The model reads and writes them, and the theme owns the stylesheet's values.

## The diagram file

A diagram file is `<name>.grafical.yaml`. The diagram on the README's front page is one: `docs/images/pipeline.grafical.yaml`. Its top-level keys come in this order:

```text
grafical  title  subtitle  note  density  sizing  style  legend
layers  nodes  groups  lanes  columns  walls  notes  edges
```

- `subtitle` and `note` and `sizing` and `style` and `legend` appear only when set.
  - So do the lists after `layers`, except `edges`.
  - `legend` holds the words for each line style, then `weights` and `marks`.
  - Each is sorted by name, so the same words give the same file whatever order they were set in.
- A row under `layers` has `id` and `label` and `lane` and `look` and `nodes`.
  - A box has `id` and `label` and `kind` and `sublabel` and `size` and `accent` and `align` and `group` and `lane` and `column`.
- The top-level `nodes` list holds the boxes in no row, each with `from` and its steps.
- A group has `id` and `label` and `sublabel` and `in` and `titleAt`.
  - A lane has `id` and `label`, and a column `id`.
  - A wall has `id` and `between` and `and` and `allow` and `label`.
  - A note has `on`, `text` and `footnote`.
- A line has `id` and `from` and `to` and `kind` and `label` and `both` and `pass` and `accent` and `weight` and `step`.
  - `both`, `pass` and `accent` appear only when true.
  - `weight` appears only when it is not thin, and `step` only when the line is numbered.
- A field that holds its default is left out.

Rows, the boxes in a row and lines are ordered lists. The order of rows and boxes is their place in the picture. The order of lines is the order they were made in, and changes nothing a reader sees. No list carries a numeric index, so inserting a box changes one line of the file.

## The stylesheet

A stylesheet is `<name>.grafical-style.yaml`, and it must sit inside the diagram's folder. It starts from a built-in theme and overrides any of its values:

```text
grafical-style: 1
base: default | dark | print
paint: background, group, node (kinds, accent), edge (kinds, weights), nesting
type: one entry per text role, each with size and weight
```

- `paint` holds every color, line width and corner radius by role.
  - Any box kind may take a dashed border.
  - Only `async` and `optional` lines have a dash pattern, because a line's kind decides its style.
  - `edge.weights` may retune the levels and add new ones, such as `critical`.
- `type` holds a size from 6 to 48 and a weight of 400 or 600 for each text role, such as `title` or `node-label`.
- Every value not given comes from `base`.

## Decisions

- [001. Operations over whole-file rewrites](decisions/001-operations-over-whole-file-rewrites.md)
- [024. Same file exact, same facts mostly](decisions/024-same-file-exact-same-facts-mostly.md)
