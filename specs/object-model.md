# The object model

**Status:** a draft that guides the code, and none of it is built.

A diagram is a set of objects with attributes and relations. This spec holds the model the diagram file will state and the file's form, which are designed together because each shapes the other. grafical is the file's only writer, and a model reads it through `show`, so the file is shaped for people in a diff and for git.

```text
the root      global looks, styles, checks
  type        what a sort of thing looks like
  object      which one it is and where it sits
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
| `<type>` | a sort of node or edge |
| `<style>` | a named look that objects mark |
| `<check>` | a rule a diagram sets itself, which comes later |
| `<layer>` | a layer |
| `<group>` | a group, which may follow another |
| `<lane>` | a lane |
| `<column>` | a column |
| `<wall>` | a wall |
| `<node>` | a node |
| `<edge>` | an edge |
| `<order>` | the order inside one region |
| `<label>` | a text on an edge or a region |
| `<mark>` | a small image on a node |
| `<note>` | a note |
| `<legend>` | the legend, whose design is open |

## Types and objects

A type says what a sort of thing looks like, and an object says which one it is and where it sits.

| Held by | Node | Edge |
|---|---|---|
| A type | shape, colors, size multiples, marks, a default sublabel | line style, weight, color, arrowheads |
| An object | ID, name, layer, order, column, group, emphasis, note | ends, label, number, sides |

- A type may inherit from another with `base`.
- A built-in kind is a type.
  - A rule on a kind is a change to that type.
- A type may choose its `shape`, and an object cannot change it.
- An object may override the rest of what its type holds.

## Groups that follow groups

Structure is not a type's work. A group may follow another group with `like`, and it then holds what that group holds and changes with it.

```text
<group> zone-b {
  like: @zone-a
}
```

- A node inside a follower is reached by a path, such as `@zone-b.web`.
- A path can override one attribute of that node.

## The root

The root holds what applies to the whole diagram.

- **Global looks:** the theme, the density, the shape of lines and type sizes.
- **Styles:** every look grafical can draw, under a name, and an object that wants one names it with `style`.
  - An object may name several, and a later one overrides an earlier one.
- **Checks:** rules an agent states for its own diagram, marked by what follows them. They come later.

Defaults are the model's edge and stay out of the file.

## Where a look comes from

```text
an object  >  a style  >  a type  >  the theme
```

The most specific wins, so a reader can find a value's source by looking down this list.

`show` gives each value's source.

## Position as a relation

A place is a relation between objects. A layer, an order, a column, an alignment and a number of steps from a node are one idea and take one form.

## The file's form

The form is a draft and sits between pseudocode, a structural language, a script, CSS, YAML, JSON and LaTeX. It takes no control flow, variables or macros.

```text
grafical 1
title: "Checkout"
use: team-style
density: normal

<type> db {
  base: @store
  fill: #eef
}

<layer> app {
}

<label> app-name {
  on: @app
  text: "Application"
}

<order> app-row {
  of: @app
  items:
    @users
    @orders
}

<group> pay {
}

<label> pay-name {
  on: @pay
  text: "Payments"
}

<node> orders {
  type: @service
  text: "Orders"
  layer: @app
  group: @pay
}

<node> orders-db {
  type: @db
  text: "Orders DB"
  below: @orders
}

<edge> orders-to-db {
  from: @orders
  to: @orders-db
  type: @call
  weight: thick
}

<label> read {
  on: @orders-to-db
  text: "read"
}
```

- An object is a block in braces, with one attribute on each line in a fixed order.
- A block opens with its sort in angle brackets, so a sort reads as a word and cannot meet an ID.
- A value is `@` and an ID, text in quotes, a color, a number or a word of a fixed list.
- `@` marks a reference, so no word is reserved and an ID may be any word, even `node`.
- An `@` that names no object is refused.
- A node states its own memberships.
- A node's name is its `text`, since a node has no meaning without it.
- A type is an attribute, `type`, and it names a sort of node or edge such as `@service`.
- A type names what it inherits with `base`.
- An `<order>` states only the order inside the region named by `of`, one item on each line.
- An `<order>` names every member of its region and nothing else, or the file is refused.
- Length is no concern.

Nobody searches the file as text. `grafical show <id>` gives an object's definition and what refers to it.

Once it is built, real changes are measured in both forms. If this form proves no better, the file goes back to YAML with one element on each line.

## Decisions

- [085. A diagram is objects with attributes and relations](decisions/085-a-diagram-is-objects-with-attributes-and-relations.md)
- [086. The file is blocks of attributes, and a reference carries @](decisions/086-the-file-is-blocks-of-attributes-and-a-reference-carries.md)
- [087. A type holds attributes, and a group may follow a group](decisions/087-a-type-holds-attributes-and-a-group-may-follow-a-group.md)
- [088. A type may choose its shape](decisions/088-a-type-may-choose-its-shape.md)
- [089. A style may be as rich as it likes](decisions/089-a-style-may-be-as-rich-as-it-likes.md)
