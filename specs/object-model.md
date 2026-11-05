# The object model

**Status:** a draft that guides the code, and none of it is built.

A diagram is a set of objects with attributes and relations. This spec holds the model the diagram file will state and the file's form, which are designed together because each shapes the other. grafical is the file's only writer, and a model reads it through `show`, so the file is shaped for people in a diff and for git.

```text
the root      global looks, rules
  class       what a sort of thing looks like and holds
  instance    which one it is and where it sits
  relation    layers, groups, columns, lanes, edges and relative places
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

## The sorts of object

A block opens with one of a fixed list of sorts.

| Sort | What it is |
|---|---|
| `<diagram>` | the root, with the title, the theme and global looks |
| `<class>` | a sort of node or edge |
| `<style>` | a style rule |
| `<check>` | a constraint |
| `<layer>` | a layer |
| `<group>` | a group, or an instance of a class of structure |
| `<lane>` | a lane |
| `<column>` | a column |
| `<wall>` | a wall |
| `<node>` | a node |
| `<edge>` | an edge |
| `<order>` | the order inside one region |
| `<label>` | a text on an object |
| `<mark>` | a small image on a node |
| `<note>` | a note |
| `<legend>` | the legend, whose design is open |

## Classes and instances

A class says what a sort of thing looks like, and an instance says which one it is and where it sits.

| Held by | Node | Edge |
|---|---|---|
| A class | kind, colors, size multiples, marks, a default sublabel | kind, weight, color, arrowheads |
| An instance | ID, label, layer, order, column, group, emphasis, note | ends, label, number, sides |

- A class may inherit from another.
- A built-in kind is a class.
  - A rule on a kind is a change to that class.
- A class may hold structure: nodes, edges and inner groups.
- A place inside a class is stated by steps from another node of the class.
- An instance has one anchor, and the rest of its structure follows it.
- An instance may override what its class holds.

## The root

The root holds what applies to the whole diagram.

- **Global looks:** the theme, the density, the shape of lines and type sizes.
- **Style rules:** a look for what a condition picks, such as the nodes of one group.
- **Constraints:** rules an agent states for its own diagram, each saying whether it warns or refuses.

Defaults are the model's edge and stay out of the file.

## Where a look comes from

```text
an instance  >  a class  >  a style rule  >  the theme
```

The most specific wins, so a reader can find a value's source by looking down this list.

## Position as a relation

A place is a relation between objects. A layer, an order, a column, an alignment and a number of steps from a node are one idea and take one form.

## The file's form

The form is a draft and sits between pseudocode, a structural language, a script, CSS, YAML, JSON and LaTeX. It takes no control flow, variables or macros.

```text
grafical 1
title: "Checkout"
use: team-style
density: normal

<class> db {
  base: @store
  fill: #eef
}

<layer> app {
  label: "Application"
}

<order> app-row {
  of: @app
  items:
    @users
    @orders
}

<group> pay {
  label: "Payments"
}

<node> orders {
  class: @service
  label: "Orders"
  layer: @app
  group: @pay
}

<node> orders-db {
  class: @db
  label: "Orders DB"
  below: @orders
}

<edge> orders -> orders-db {
  class: @call
  label: "read"
  weight: thick
}
```

- An object is a block in braces, with one attribute on each line in a fixed order.
- A block opens with its sort in angle brackets, so a sort reads as a word and cannot meet an ID.
- A value is `@` and an ID, text in quotes, a color, a number or a word of a fixed list.
- `@` marks a reference, so no word is reserved and an ID may be any word, even `node`.
- An `@` that names no object is refused.
- A node states its own memberships.
- A class is an attribute, `class`, and it names a sort of node or edge such as `@service`.
- A class names what it inherits with `base`.
- An `<order>` states only the order inside the region named by `of`, one item on each line.
- Length is no concern.

Nobody searches the file as text. `grafical show <id>` gives an object's definition and what refers to it.

If the design does not hold up, the fallback is YAML with one element on each line.

## Decisions

- [085. A diagram is objects with attributes and relations](decisions/085-a-diagram-is-objects-with-attributes-and-relations.md)
- [086. The file is blocks of attributes, and a reference carries @](decisions/086-the-file-is-blocks-of-attributes-and-a-reference-carries.md)
