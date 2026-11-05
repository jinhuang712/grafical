# The .grafical file

**Status:** a draft that guides the code, and none of it is built.

A `.grafical` file holds one diagram as objects with attributes and relations. grafical is its only writer, and a model reads it through `show`, so the file is shaped for people in a diff and for git. It sits between pseudocode, a structural language, a script, CSS, YAML, JSON and LaTeX, and it takes no control flow, variables or macros.

```text
<diagram>                      the root: title, theme, global looks
  <type> <style> <check>       what things may look like and follow
  <layer> <group> <lane>
  <column> <wall>              the regions
  <order>                      the order inside a region
  <node> <edge>                the parts and what connects them
  <label> <mark> <note>        what sits on them
  <legend>                     the key
```

## What the file must do

| Property | What it asks |
|---|---|
| Easy to search | `show` with an ID gives an object and what refers to it |
| Easy to parse | a line at a time |
| Local changes | one change touches few lines |
| A good diff | a reader sees what changed |
| Rich facts | it holds attributes, looks and relations |
| One spelling | one set of facts gives one set of bytes |
| Stable order | a new object leaves the others alone |
| Any text | Chinese, emoji, colons and line breaks need no care |
| Strict | an unknown field is refused |
| Only grows | after the first release, a field is added and never changed |
| Merges | two branches that change different objects merge in git |

## The form

```text
<node> orders {
  type: @service
  text: "Orders"
  layer: @app
  style: @danger @highlighted
}
```

- An object is a block in braces, and it opens with its sort in angle brackets.
- A block has one attribute on each line, in a fixed order for its sort.
- A list that matters line by line, such as an order's items, takes one item on each line.
- An attribute that holds its default is left out, since defaults are the model's edge.
- Length is no concern.

| Value | Written | Example |
|---|---|---|
| A reference | `@` and an ID | `@orders` |
| A path into a follower | `@` and two IDs | `@zone-b.web` |
| Text | in double quotes | `"Orders DB"` |
| A color | `#` and hex digits | `#c00` |
| A number | plain | `1.5` |
| A word of a fixed list | plain | `thick` |

`@` marks a reference and angle brackets mark a sort, so neither can meet an ID and no word is reserved. An ID may be any word, even `node`. An `@` that names no object is refused.

## The order of the file

Blocks run in this order, and blocks of one sort run in the order they were made:

```text
diagram  type  style  check  layer  group  lane  column  wall
order  node  edge  label  mark  note  legend
```

## Types and objects

A type says what a sort of thing looks like, and an object says which one it is and where it sits.

- A type may inherit from another with `base`.
- A built-in kind is a type, such as `@service` or `@call`.
- A change to a type changes every object of that type.
- An object may override what its type holds, except its shape.

The built-in node types are `service`, `store`, `queue`, `external`, `actor`, `state`, `terminal`, `decision`, `initial`, `final` and `choice`. The built-in edge types are `call`, `data`, `async`, `optional` and `link`. The shapes are `box`, `round`, `pill`, `cylinder`, `diamond`, `small-diamond`, `dot` and `ring`.

## Where a look comes from

```text
an object  >  a style  >  a type  >  the theme
```

The most specific wins, and `show` gives each value's source.

## Position as a relation

A place is a relation between objects, so every place is a reference. A node names its layer or the node it steps from, and an `<order>` says the order inside a region. An `<order>` names every member of its region and nothing else, or the file is refused.

## The sorts

Each table lists a sort's attributes in the order they are written.

### `<diagram>`

The root has no ID, and a file has exactly one.

| Attribute | Value |
|---|---|
| `format` | a number, always first |
| `title` | text |
| `subtitle` | text |
| `caption` | text |
| `theme` | `default`, `dark` or `print` |
| `library` | text, a `.grafical` file of types and styles |
| `density` | `compact`, `normal` or `airy` |
| `sizing` | `auto` or `fixed` |
| `lines` | `square`, `round` or `smooth` |

### `<type>`

| Attribute | Value |
|---|---|
| `base` | a type |
| `shape` | a shape, for a node type |
| `fill` | a color |
| `border` | a color |
| `color` | a color |
| `weight` | a level or a number |
| `both` | `true`, for arrowheads at both ends |
| `sublabel` | text |

### `<style>`

A style holds any look grafical can draw and says nothing of who uses it. An object names it with `style`, and a later name overrides an earlier one.

| Attribute | Value |
|---|---|
| `fill` | a color |
| `border` | a color |
| `border-width` | a number |
| `color` | a color |
| `weight` | a level or a number |

### `<check>`

A rule a diagram sets itself, marked by what follows it. It comes later, and its attributes are open.

### `<layer>`

| Attribute | Value |
|---|---|
| `lane` | a lane |
| `look` | `box` or `band` |
| `style` | styles |

### `<group>`

| Attribute | Value |
|---|---|
| `in` | a group |
| `like` | a group |
| `style` | styles |

A group with `like` holds what that group holds and changes with it. A node inside it is reached by a path, and a path may override one attribute of that node.

### `<lane>` and `<column>`

| Attribute | Value |
|---|---|
| `style` | styles |

### `<wall>`

| Attribute | Value |
|---|---|
| `between` | references, one on each line |
| `and` | references, one on each line |
| `allow` | references, one on each line |

### `<order>`

| Attribute | Value |
|---|---|
| `of` | a region, or `@diagram` for its layers |
| `axis` | `across` or `down` |
| `items` | references, one on each line |

A `gap` line between two items gives the multiple of the gap between them.

### `<node>`

| Attribute | Value |
|---|---|
| `type` | a type |
| `text` | text |
| `sublabel` | text |
| `layer` | a layer |
| `group` | a group |
| `lane` | a lane |
| `column` | a column |
| `align` | a node |
| `from` | a node |
| `up` `down` `left` `right` | a whole number of steps |
| `size` | `s`, `m` or `l` |
| `width` `height` `times` | a multiple |
| `emphasis` | `true` |
| `style` | styles |

### `<edge>`

| Attribute | Value |
|---|---|
| `from` | a node, group, layer or lane |
| `to` | a node, group, layer or lane |
| `type` | a type |
| `out` | `top`, `bottom`, `left` or `right` |
| `in` | `top`, `bottom`, `left` or `right` |
| `weight` | a level or a number |
| `color` | a color |
| `both` | `true` |
| `pass` | `true` |
| `number` | a whole number |
| `style` | styles |

### `<label>`

A label is a text on an edge or a region. A node's name is its `text`, since a node has no meaning without it.

| Attribute | Value |
|---|---|
| `on` | an edge or a region |
| `text` | text |
| `sublabel` | text |
| `at` | a fraction from 0 to 1 |
| `side` | `top`, `bottom`, `left` or `right` |
| `place` | `inside` or `outside` |
| `seat` | `on` or `beside`, for an edge |
| `align` | `left`, `center` or `right` |

### `<mark>`

| Attribute | Value |
|---|---|
| `on` | a node |
| `slot` | a corner or `left` |
| `emoji` | text |
| `text` | text |
| `file` | text |
| `hash` | text |
| `color` | a color |

### `<note>`

| Attribute | Value |
|---|---|
| `on` | a node, an edge or a group |
| `text` | text |
| `footnote` | `true` |

### `<legend>`

The legend is a small diagram, and its attributes are open.

## A whole file

```text
<diagram> {
  format: 1
  title: "Checkout"
  density: normal
}

<type> db {
  base: @store
  fill: #eef
}

<style> danger {
  border: #c00
  border-width: 2
}

<layer> app {
}

<layer> data {
}

<group> pay {
}

<order> layers {
  of: @diagram
  axis: down
  items:
    @app
    gap: 1.5
    @data
}

<order> app-row {
  of: @app
  axis: across
  items:
    @web
    @orders
}

<node> web {
  type: @actor
  text: "Web"
  layer: @app
}

<node> orders {
  type: @service
  text: "Orders"
  layer: @app
  group: @pay
  style: @danger
}

<node> orders-db {
  type: @db
  text: "Orders DB"
  group: @pay
  from: @orders
  down: 1
}

<edge> orders-to-db {
  from: @orders
  to: @orders-db
  type: @call
  weight: thick
}

<label> pay-name {
  on: @pay
  text: "Payments"
  at: 0
  side: top
  place: inside
}

<label> read {
  on: @orders-to-db
  text: "read"
}
```

## Shared looks

A `.grafical` file with `<type>` and `<style>` blocks and no others is a library, and a diagram names it with `library`. It must sit inside the diagram's folder. It takes the place of the stylesheet.

## Once it is built

Real changes are measured in both forms. If this form proves no better, the file goes back to YAML with one element on each line.

## Decisions

- [085. A diagram is objects with attributes and relations](decisions/085-a-diagram-is-objects-with-attributes-and-relations.md)
- [086. The file is blocks of attributes, and a reference carries @](decisions/086-the-file-is-blocks-of-attributes-and-a-reference-carries.md)
- [087. A type holds attributes, and a group may follow a group](decisions/087-a-type-holds-attributes-and-a-group-may-follow-a-group.md)
- [088. A type may choose its shape](decisions/088-a-type-may-choose-its-shape.md)
- [089. A style may be as rich as it likes](decisions/089-a-style-may-be-as-rich-as-it-likes.md)
